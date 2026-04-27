import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
  args: { personaId: v.id("personas") },
  handler: async (ctx, { personaId }) => {
    const folders = await ctx.db
      .query("folders")
      .withIndex("by_persona", (q) => q.eq("personaId", personaId))
      .collect();
    const sorted = folders.sort((a, b) => a.name.localeCompare(b.name));
    return await Promise.all(
      sorted.map(async (f) => {
        const images = await ctx.db
          .query("images")
          .withIndex("by_folder", (q) => q.eq("folderId", f._id))
          .collect();
        const carousels = await ctx.db
          .query("carousels")
          .withIndex("by_folder", (q) => q.eq("folderId", f._id))
          .collect();
        const imageCount = images.filter((i) => i.status !== "deleted").length;
        return {
          _id: f._id,
          name: f.name,
          createdAt: f.createdAt,
          imageCount,
          carouselCount: carousels.length,
        };
      }),
    );
  },
});

export const get = query({
  args: { folderId: v.id("folders") },
  handler: async (ctx, { folderId }) => {
    const folder = await ctx.db.get(folderId);
    if (!folder) return null;
    return {
      _id: folder._id,
      name: folder.name,
      personaId: folder.personaId,
      createdAt: folder.createdAt,
    };
  },
});

export const create = mutation({
  args: {
    personaId: v.id("personas"),
    name: v.string(),
  },
  handler: async (ctx, { personaId, name }) => {
    const trimmed = name.trim();
    if (!trimmed) throw new Error("Le nom du dossier est requis");
    if (trimmed.length > 80)
      throw new Error("Le nom du dossier est trop long (max 80)");
    const persona = await ctx.db.get(personaId);
    if (!persona) throw new Error("Persona introuvable");
    return await ctx.db.insert("folders", {
      personaId,
      name: trimmed,
      createdAt: Date.now(),
    });
  },
});

export const rename = mutation({
  args: { folderId: v.id("folders"), name: v.string() },
  handler: async (ctx, { folderId, name }) => {
    const trimmed = name.trim();
    if (!trimmed) throw new Error("Le nom du dossier est requis");
    if (trimmed.length > 80)
      throw new Error("Le nom du dossier est trop long (max 80)");
    const folder = await ctx.db.get(folderId);
    if (!folder) throw new Error("Dossier introuvable");
    await ctx.db.patch(folderId, { name: trimmed });
  },
});

/**
 * Removes a folder. All images and carousels currently in this folder are
 * moved back to the root (folderId = undefined). Nothing is deleted besides
 * the folder itself. Returns counts for UI feedback.
 */
export const remove = mutation({
  args: { folderId: v.id("folders") },
  handler: async (ctx, { folderId }) => {
    const folder = await ctx.db.get(folderId);
    if (!folder) return { imagesMoved: 0, carouselsMoved: 0 };

    const images = await ctx.db
      .query("images")
      .withIndex("by_folder", (q) => q.eq("folderId", folderId))
      .collect();
    for (const img of images) {
      await ctx.db.patch(img._id, { folderId: undefined });
    }

    const carousels = await ctx.db
      .query("carousels")
      .withIndex("by_folder", (q) => q.eq("folderId", folderId))
      .collect();
    for (const c of carousels) {
      await ctx.db.patch(c._id, { folderId: undefined });
    }

    await ctx.db.delete(folderId);
    return {
      imagesMoved: images.length,
      carouselsMoved: carousels.length,
    };
  },
});
