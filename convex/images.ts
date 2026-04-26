import { v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";

export const list = query({
  args: {
    personaId: v.id("personas"),
    types: v.optional(v.array(v.string())),
    includeUsed: v.optional(v.boolean()),
  },
  handler: async (ctx, { personaId, types, includeUsed }) => {
    const all = await ctx.db
      .query("images")
      .withIndex("by_persona", (q) => q.eq("personaId", personaId))
      .collect();
    const filtered = all.filter((img) => {
      if (img.status === "deleted") return false;
      if (img.status === "used" && !includeUsed) return false;
      if (types && types.length > 0 && !types.includes(img.type)) return false;
      return true;
    });
    const sorted = filtered.sort((a, b) => b.createdAt - a.createdAt);
    return await Promise.all(
      sorted.map(async (img) => ({
        ...img,
        imageUrl: await ctx.storage.getUrl(img.imageStorageId),
      })),
    );
  },
});

export const listByIds = query({
  args: { ids: v.array(v.id("images")) },
  handler: async (ctx, { ids }) => {
    return await Promise.all(
      ids.map(async (id) => {
        const img = await ctx.db.get(id);
        if (!img) return null;
        return {
          ...img,
          imageUrl: await ctx.storage.getUrl(img.imageStorageId),
        };
      }),
    );
  },
});

export const getInternal = internalQuery({
  args: { id: v.id("images") },
  handler: async (ctx, { id }) => ctx.db.get(id),
});

export const insertGenerated = internalMutation({
  args: {
    personaId: v.id("personas"),
    type: v.string(),
    imageStorageId: v.id("_storage"),
    promptUsed: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("images", {
      ...args,
      status: "available",
      createdAt: Date.now(),
    });
  },
});

export const replaceStorage = mutation({
  args: {
    id: v.id("images"),
    newStorageId: v.id("_storage"),
  },
  handler: async (ctx, { id, newStorageId }) => {
    const img = await ctx.db.get(id);
    if (!img) return;
    const oldId = img.imageStorageId;
    await ctx.db.patch(id, { imageStorageId: newStorageId });
    if (oldId !== newStorageId) {
      try {
        await ctx.storage.delete(oldId);
      } catch {}
    }
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => await ctx.storage.generateUploadUrl(),
});

export const getById = query({
  args: { id: v.id("images") },
  handler: async (ctx, { id }) => {
    const img = await ctx.db.get(id);
    if (!img) return null;
    return { ...img, imageUrl: await ctx.storage.getUrl(img.imageStorageId) };
  },
});

export const remove = mutation({
  args: { id: v.id("images") },
  handler: async (ctx, { id }) => {
    await ctx.db.patch(id, { status: "deleted" });
  },
});
