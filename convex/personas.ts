import { v } from "convex/values";
import { internalQuery, mutation, query } from "./_generated/server";

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
    signatureFeatures: v.optional(v.string()),
    referenceImageStorageId: v.optional(v.id("_storage")),
    tiktokAccount: v.optional(v.string()),
    instagramAccount: v.optional(v.string()),
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
