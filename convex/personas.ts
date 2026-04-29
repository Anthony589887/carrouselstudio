import { v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";

const genderValidator = v.union(
  v.literal("feminine"),
  v.literal("masculine"),
  v.literal("neutral"),
);

const stylePreferencesValidator = v.object({
  moodDescriptor: v.optional(v.string()),
  emotionWeights: v.optional(v.record(v.string(), v.number())),
  spaceWeights: v.optional(v.record(v.string(), v.number())),
  registerWeights: v.optional(v.record(v.string(), v.number())),
});

export const getInternal = internalQuery({
  args: { id: v.id("personas") },
  handler: async (ctx, { id }) => ctx.db.get(id),
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const personas = await ctx.db.query("personas").collect();
    const sorted = personas.sort((a, b) => b.createdAt - a.createdAt);
    return await Promise.all(
      sorted.map(async (p) => {
        const referenceUrl = await ctx.storage.getUrl(p.referenceImageStorageId);
        const allImages = await ctx.db
          .query("images")
          .withIndex("by_persona", (q) => q.eq("personaId", p._id))
          .collect();
        const available = allImages.filter((i) => i.status === "available").length;
        const totalNotDeleted = allImages.filter(
          (i) => i.status !== "deleted",
        ).length;
        const carousels = await ctx.db
          .query("carousels")
          .withIndex("by_persona", (q) => q.eq("personaId", p._id))
          .collect();
        const postedCount = carousels.filter((c) => c.status === "posted").length;
        return {
          ...p,
          referenceUrl,
          availableCount: available,
          totalImageCount: totalNotDeleted,
          postedCarouselCount: postedCount,
        };
      }),
    );
  },
});

export const get = query({
  args: { id: v.id("personas") },
  handler: async (ctx, { id }) => {
    const persona = await ctx.db.get(id);
    if (!persona) return null;
    const referenceUrl = await ctx.storage.getUrl(persona.referenceImageStorageId);
    return { ...persona, referenceUrl };
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => await ctx.storage.generateUploadUrl(),
});

export const create = mutation({
  args: {
    name: v.string(),
    identityDescription: v.string(),
    gender: genderValidator,
    signatureFeatures: v.optional(v.string()),
    referenceImageStorageId: v.id("_storage"),
    tiktokAccount: v.optional(v.string()),
    instagramAccount: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("personas", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("personas"),
    name: v.optional(v.string()),
    identityDescription: v.optional(v.string()),
    gender: v.optional(genderValidator),
    signatureFeatures: v.optional(v.string()),
    referenceImageStorageId: v.optional(v.id("_storage")),
    tiktokAccount: v.optional(v.string()),
    instagramAccount: v.optional(v.string()),
    stylePreferences: v.optional(stylePreferencesValidator),
  },
  handler: async (ctx, { id, ...patch }) => {
    await ctx.db.patch(id, patch);
  },
});

export const remove = mutation({
  args: { id: v.id("personas") },
  handler: async (ctx, { id }) => {
    const persona = await ctx.db.get(id);
    if (!persona) return;
    // Delete all images (and storage)
    const images = await ctx.db
      .query("images")
      .withIndex("by_persona", (q) => q.eq("personaId", id))
      .collect();
    for (const img of images) {
      if (img.imageStorageId) {
        try {
          await ctx.storage.delete(img.imageStorageId);
        } catch {}
      }
      await ctx.db.delete(img._id);
    }
    // Delete all carousels
    const carousels = await ctx.db
      .query("carousels")
      .withIndex("by_persona", (q) => q.eq("personaId", id))
      .collect();
    for (const c of carousels) await ctx.db.delete(c._id);
    // Delete reference image
    try {
      await ctx.storage.delete(persona.referenceImageStorageId);
    } catch {}
    await ctx.db.delete(id);
  },
});

export const getStorageUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, { storageId }) => await ctx.storage.getUrl(storageId),
});

/**
 * One-shot migration: backfill `gender` on personas that don't have it yet.
 * Convention: name starts with "F" → feminine, "H" → masculine.
 * Anything else stays untouched. Idempotent.
 * Run via: `pnpm exec convex run personas:migrateGenders`
 */
export const migrateGenders = internalMutation({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("personas").collect();
    let feminine = 0;
    let masculine = 0;
    let skipped = 0;
    for (const p of all) {
      if (p.gender) {
        skipped++;
        continue;
      }
      const trimmed = p.name.trim();
      if (/^F/i.test(trimmed)) {
        await ctx.db.patch(p._id, { gender: "feminine" });
        feminine++;
      } else if (/^H/i.test(trimmed)) {
        await ctx.db.patch(p._id, { gender: "masculine" });
        masculine++;
      } else {
        skipped++;
      }
    }
    return { feminine, masculine, skipped, total: all.length };
  },
});

/**
 * One-shot migration: seed `stylePreferences` for the original 7 personas based
 * on their name prefix (F1/F2/H1/H2/H3). Idempotent — only patches personas
 * that don't already have stylePreferences set, OR the `force` flag is true.
 * Run via: `pnpm exec convex run personas:seedStylePreferences`
 */
export const seedStylePreferences = internalMutation({
  args: { force: v.optional(v.boolean()) },
  handler: async (ctx, { force }) => {
    const PRESETS: Record<
      string,
      {
        moodDescriptor: string;
        emotionWeights: {
          melancholic: number;
          energetic: number;
          confident: number;
          serene: number;
          tired: number;
        };
        spaceWeights: {
          "indoor-private": number;
          "indoor-public": number;
          "outdoor-urban": number;
          "outdoor-nature": number;
          transit: number;
          medical: number;
        };
      }
    > = {
      F1: {
        moodDescriptor:
          "Sad-girl aesthetic. Often melancholic, contemplative, alone in private spaces. Soft moments more than party moments.",
        emotionWeights: { melancholic: 2.0, serene: 1.5, energetic: 0.5, confident: 0.5, tired: 1.5 },
        spaceWeights: { "indoor-private": 2.0, "indoor-public": 0.7, "outdoor-urban": 1.2, "outdoor-nature": 1.0, transit: 1.0, medical: 1.0 },
      },
      F2: {
        moodDescriptor:
          "Confident, body-positive, often outdoors. Warm and grounded.",
        emotionWeights: { melancholic: 0.5, energetic: 1.5, confident: 2.0, serene: 1.5, tired: 0.5 },
        spaceWeights: { "indoor-private": 0.7, "indoor-public": 1.2, "outdoor-urban": 1.5, "outdoor-nature": 1.5, transit: 1.0, medical: 1.0 },
      },
      H1: {
        moodDescriptor:
          "Looksmaxxing serious. Quiet confidence, often alone, contemplative.",
        emotionWeights: { melancholic: 1.0, energetic: 0.5, confident: 2.0, serene: 1.5, tired: 1.0 },
        spaceWeights: { "indoor-private": 1.5, "indoor-public": 1.0, "outdoor-urban": 1.2, "outdoor-nature": 1.0, transit: 1.0, medical: 1.0 },
      },
      H2: {
        moodDescriptor:
          "Casual social, often with friends, urban lifestyle.",
        emotionWeights: { melancholic: 0.5, energetic: 1.5, confident: 1.5, serene: 1.0, tired: 0.5 },
        spaceWeights: { "indoor-private": 0.7, "indoor-public": 1.5, "outdoor-urban": 1.8, "outdoor-nature": 1.0, transit: 1.0, medical: 1.0 },
      },
      H3: {
        moodDescriptor:
          "Warm, social, family-oriented, often in domestic moments.",
        emotionWeights: { melancholic: 0.7, energetic: 1.2, confident: 1.2, serene: 1.5, tired: 0.7 },
        spaceWeights: { "indoor-private": 1.5, "indoor-public": 1.3, "outdoor-urban": 1.0, "outdoor-nature": 1.0, transit: 1.0, medical: 1.0 },
      },
    };

    const all = await ctx.db.query("personas").collect();
    let seeded = 0;
    let skipped = 0;
    let unmatched = 0;
    const results: Array<{ name: string; preset: string | null; action: string }> = [];
    for (const p of all) {
      if (p.stylePreferences && !force) {
        skipped++;
        results.push({ name: p.name, preset: null, action: "skipped (already set)" });
        continue;
      }
      // Match by name prefix: "F1 - …" → F1, "H2 - …" → H2, etc.
      const trimmed = p.name.trim();
      const match = trimmed.match(/^([FH][0-9])/i);
      if (!match) {
        unmatched++;
        results.push({ name: p.name, preset: null, action: "no preset (name prefix not matched)" });
        continue;
      }
      const presetKey = match[1].toUpperCase();
      const preset = PRESETS[presetKey];
      if (!preset) {
        unmatched++;
        results.push({ name: p.name, preset: presetKey, action: "no preset for this prefix" });
        continue;
      }
      await ctx.db.patch(p._id, { stylePreferences: preset });
      seeded++;
      results.push({ name: p.name, preset: presetKey, action: "seeded" });
    }
    return { seeded, skipped, unmatched, total: all.length, results };
  },
});
