import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import {
  composePrompt,
  composeCustomPersonaPrompt,
  pickCompatibleCombination,
  type CombinationFilters,
  type Gender,
  type Lighting,
  type Energy,
  type Social,
  type Space,
} from "./imagePrompts";
import type { Id } from "./_generated/dataModel";
import { requireOwnerOrAdmin } from "./users";
import { enforceAndRecordQuota } from "./quota";

// Backwards-compat: rows that haven't been migrated yet keep the historical
// behavior (the old pipe was tuned for feminine personas).
const DEFAULT_GENDER: Gender = "feminine";

const aspectRatioValidator = v.union(v.literal("4:5"), v.literal("9:16"));

const filtersValidator = v.optional(
  v.object({
    lighting: v.optional(v.array(v.string())),
    energy: v.optional(v.array(v.string())),
    social: v.optional(v.array(v.string())),
    space: v.optional(v.array(v.string())),
  }),
);

/**
 * Mode A combinatoire entry point.
 * Inserts N placeholder rows immediately (status = "generating") with a fresh
 * combinatorial draw filtered by `filters`, then schedules N independent
 * runGeneration actions in parallel. Returns in <100ms.
 */
export const generateBatch = mutation({
  args: {
    personaId: v.id("personas"),
    count: v.number(),
    aspectRatio: aspectRatioValidator,
    filters: filtersValidator,
  },
  handler: async (ctx, { personaId, count, aspectRatio, filters }) => {
    if (count < 1 || count > 50) throw new Error("count must be 1..50");

    const persona = await ctx.db.get(personaId);
    if (!persona) throw new Error("Persona not found");
    // The caller must own the target persona (or be admin) before we generate.
    await requireOwnerOrAdmin(ctx, persona);
    // Enforce + record the rolling-window quota for the whole batch up-front.
    await enforceAndRecordQuota(ctx, { count });

    // Sanitize filter shape to satisfy strict typings.
    const cleanFilters: CombinationFilters | undefined = filters
      ? {
          lighting: filters.lighting as Lighting[] | undefined,
          energy: filters.energy as Energy[] | undefined,
          social: filters.social as Social[] | undefined,
          space: filters.space as Space[] | undefined,
        }
      : undefined;

    const created: Id<"images">[] = [];
    let droppedNoCombination = 0;

    const personaGender: Gender = persona.gender ?? DEFAULT_GENDER;
    const stylePreferences = persona.stylePreferences;

    for (let i = 0; i < count; i++) {
      const combination = pickCompatibleCombination({
        filters: cleanFilters,
        personaGender,
        stylePreferences,
      });
      if (!combination) {
        droppedNoCombination++;
        continue;
      }
      const prompt = composePrompt({
        identityDescription: persona.identityDescription,
        signatureFeatures: persona.signatureFeatures,
        situation: combination.situation,
        emotionalState: combination.emotionalState,
        framing: combination.framing,
        technicalRegister: combination.technicalRegister,
        aspectRatio,
        moodDescriptor: stylePreferences?.moodDescriptor,
      });
      const id: Id<"images"> = await ctx.db.insert("images", {
        personaId,
        ownerId: persona.ownerId,
        situationId: combination.situation.id,
        emotionalStateId: combination.emotionalState.id,
        framingId: combination.framing.id,
        technicalRegisterId: combination.technicalRegister.id,
        status: "generating",
        aspectRatio,
        promptUsed: prompt,
        createdAt: Date.now(),
      });
      created.push(id);
      await ctx.scheduler.runAfter(0, internal.imageGeneration.runGeneration, {
        imageId: id,
      });
    }

    return {
      imageIds: created,
      count: created.length,
      droppedNoCombination,
    };
  },
});

/**
 * Free-prompt batch entry point. Accepts an array of user-written prompts;
 * each is wrapped with the persona identity block + rendering directives by
 * `composeCustomPersonaPrompt`. `imagesPerPrompt` (default 1, max 5) fans
 * out each prompt into N images. Empty prompts are skipped silently. The
 * total is hard-capped at 50 to protect against typo-blasts.
 */
export const generateBatchFromCustomPrompts = mutation({
  args: {
    personaId: v.id("personas"),
    customPrompts: v.array(v.string()),
    aspectRatio: aspectRatioValidator,
    imagesPerPrompt: v.optional(v.number()),
    folderId: v.optional(v.id("folders")),
  },
  handler: async (ctx, args) => {
    const persona = await ctx.db.get(args.personaId);
    if (!persona) throw new Error("Persona not found");
    await requireOwnerOrAdmin(ctx, persona);

    const imagesPerPrompt = Math.max(
      1,
      Math.min(args.imagesPerPrompt ?? 1, 5),
    );
    const nonEmpty = args.customPrompts
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    if (nonEmpty.length === 0)
      throw new Error("Saisis au moins un prompt non vide");

    const totalImages = nonEmpty.length * imagesPerPrompt;
    if (totalImages > 50) {
      throw new Error(
        `Limite de 50 images par batch. Tu as demandé ${totalImages}.`,
      );
    }

    // Optional folder validation (same contract as carousels.create).
    if (args.folderId) {
      const folder = await ctx.db.get(args.folderId);
      if (!folder) throw new Error("Dossier introuvable");
      if (folder.personaId !== args.personaId)
        throw new Error("Le dossier appartient à un autre persona");
    }

    // Enforce + record quota for the full fan-out before scheduling anything.
    await enforceAndRecordQuota(ctx, { count: totalImages });

    const createdIds: Id<"images">[] = [];
    for (const customPrompt of nonEmpty) {
      for (let i = 0; i < imagesPerPrompt; i++) {
        const prompt = composeCustomPersonaPrompt({
          identityDescription: persona.identityDescription,
          signatureFeatures: persona.signatureFeatures,
          moodDescriptor: persona.stylePreferences?.moodDescriptor,
          customPrompt,
          aspectRatio: args.aspectRatio,
        });
        const imageId: Id<"images"> = await ctx.db.insert("images", {
          personaId: args.personaId,
          ownerId: persona.ownerId,
          folderId: args.folderId,
          status: "generating",
          generationMode: "from-custom-prompt",
          customPromptText: customPrompt,
          aspectRatio: args.aspectRatio,
          promptUsed: prompt,
          createdAt: Date.now(),
        });
        createdIds.push(imageId);
        await ctx.scheduler.runAfter(
          0,
          internal.imageGeneration.runGeneration,
          { imageId },
        );
      }
    }

    return {
      createdIds,
      totalRequested: totalImages,
      totalCreated: createdIds.length,
    };
  },
});

/**
 * Retry a failed (or available) image keeping the SAME prompt. Reuses the
 * stored `promptUsed` verbatim — works for BOTH `from-dict` and
 * `from-custom-prompt` since the full prompt (incl. injected identity block)
 * is already baked into `promptUsed` at creation. Meant for transient
 * errors (network blip, occasional safety filter).
 */
export const retryImage = mutation({
  args: { id: v.id("images") },
  handler: async (ctx, { id }) => {
    const img = await ctx.db.get(id);
    if (!img) throw new Error("Image not found");
    await requireOwnerOrAdmin(ctx, img);
    if (img.status === "used")
      throw new Error("Image already used in a carousel");
    // A retry is a fresh Gemini call → it counts against the quota.
    await enforceAndRecordQuota(ctx, { count: 1 });
    if (img.imageStorageId) {
      try {
        await ctx.storage.delete(img.imageStorageId);
      } catch {}
    }
    await ctx.db.patch(id, {
      status: "generating",
      imageStorageId: undefined,
      errorMessage: undefined,
    });
    await ctx.scheduler.runAfter(0, internal.imageGeneration.runGeneration, {
      imageId: id,
    });
  },
});

/**
 * Regenerate the image with a fresh combination. Draws a new
 * (situation, emotion, framing, register) tuple WITHOUT filters, recomposes
 * the prompt, overwrites the 4 IDs and the promptUsed, then reschedules.
 * Meant for combinations that intrinsically produce bad images.
 */
export const regenerateWithNewCombination = mutation({
  args: { id: v.id("images") },
  handler: async (ctx, { id }) => {
    const img = await ctx.db.get(id);
    if (!img) throw new Error("Image not found");
    await requireOwnerOrAdmin(ctx, img);
    if (img.status === "used")
      throw new Error("Image already used in a carousel");
    // A fresh combinatorial draw makes no sense for a free-prompt image —
    // it would overwrite the user's custom prompt with a dict combo. Block
    // it; the user should use "Réessayer" (retryImage) instead.
    if (img.generationMode === "from-custom-prompt")
      throw new Error(
        "Nouvelle combinaison indisponible pour une image en prompt libre — utilise Réessayer.",
      );
    // Regeneration is a fresh Gemini call → it counts against the quota.
    await enforceAndRecordQuota(ctx, { count: 1 });

    const persona = await ctx.db.get(img.personaId);
    if (!persona) throw new Error("Persona not found");

    const personaGender: Gender = persona.gender ?? DEFAULT_GENDER;
    const stylePreferences = persona.stylePreferences;
    const combination = pickCompatibleCombination({
      personaGender,
      stylePreferences,
    });
    if (!combination)
      throw new Error("Could not pick a compatible combination");

    const aspect = (img.aspectRatio ?? "4:5") as "4:5" | "9:16";
    const prompt = composePrompt({
      identityDescription: persona.identityDescription,
      signatureFeatures: persona.signatureFeatures,
      situation: combination.situation,
      emotionalState: combination.emotionalState,
      framing: combination.framing,
      technicalRegister: combination.technicalRegister,
      aspectRatio: aspect,
      moodDescriptor: stylePreferences?.moodDescriptor,
    });

    if (img.imageStorageId) {
      try {
        await ctx.storage.delete(img.imageStorageId);
      } catch {}
    }

    await ctx.db.patch(id, {
      status: "generating",
      imageStorageId: undefined,
      errorMessage: undefined,
      promptUsed: prompt,
      situationId: combination.situation.id,
      emotionalStateId: combination.emotionalState.id,
      framingId: combination.framing.id,
      technicalRegisterId: combination.technicalRegister.id,
    });

    await ctx.scheduler.runAfter(0, internal.imageGeneration.runGeneration, {
      imageId: id,
    });
  },
});
