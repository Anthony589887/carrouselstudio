import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import {
  composePrompt,
  pickCompatibleCombination,
  type CombinationFilters,
  type Lighting,
  type Energy,
  type Social,
  type Space,
} from "./imagePrompts";
import type { Id } from "./_generated/dataModel";

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

    for (let i = 0; i < count; i++) {
      const combination = pickCompatibleCombination(cleanFilters);
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
      });
      const id: Id<"images"> = await ctx.db.insert("images", {
        personaId,
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
 * Retry a failed (or available) image keeping the SAME combination.
 * Reuses the existing promptUsed and 4 IDs — meant for transient errors
 * (network blip, occasional safety filter). Resets row to "generating"
 * and reschedules.
 */
export const retryImage = mutation({
  args: { id: v.id("images") },
  handler: async (ctx, { id }) => {
    const img = await ctx.db.get(id);
    if (!img) throw new Error("Image not found");
    if (img.status === "deleted") throw new Error("Image is deleted");
    if (img.status === "used")
      throw new Error("Image already used in a carousel");
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
    if (img.status === "deleted") throw new Error("Image is deleted");
    if (img.status === "used")
      throw new Error("Image already used in a carousel");

    const persona = await ctx.db.get(img.personaId);
    if (!persona) throw new Error("Persona not found");

    const combination = pickCompatibleCombination();
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
