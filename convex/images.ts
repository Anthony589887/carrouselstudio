import { v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";

const aspectRatioValidator = v.union(v.literal("4:5"), v.literal("9:16"));

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
        imageUrl: img.imageStorageId
          ? await ctx.storage.getUrl(img.imageStorageId)
          : null,
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
          imageUrl: img.imageStorageId
            ? await ctx.storage.getUrl(img.imageStorageId)
            : null,
        };
      }),
    );
  },
});

export const getById = query({
  args: { id: v.id("images") },
  handler: async (ctx, { id }) => {
    const img = await ctx.db.get(id);
    if (!img) return null;
    return {
      ...img,
      imageUrl: img.imageStorageId
        ? await ctx.storage.getUrl(img.imageStorageId)
        : null,
    };
  },
});

export const getInternal = internalQuery({
  args: { id: v.id("images") },
  handler: async (ctx, { id }) => ctx.db.get(id),
});

// === Lifecycle ===

export const insertPlaceholder = internalMutation({
  args: {
    personaId: v.id("personas"),
    type: v.string(),
    aspectRatio: aspectRatioValidator,
    promptUsed: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("images", {
      ...args,
      status: "generating",
      createdAt: Date.now(),
    });
  },
});

export const markCompleted = internalMutation({
  args: {
    id: v.id("images"),
    imageStorageId: v.id("_storage"),
  },
  handler: async (ctx, { id, imageStorageId }) => {
    await ctx.db.patch(id, {
      imageStorageId,
      status: "available",
      errorMessage: undefined,
    });
  },
});

export const markFailed = internalMutation({
  args: {
    id: v.id("images"),
    errorMessage: v.string(),
  },
  handler: async (ctx, { id, errorMessage }) => {
    await ctx.db.patch(id, {
      status: "failed",
      errorMessage: errorMessage.slice(0, 500),
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
    if (oldId && oldId !== newStorageId) {
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

export const remove = mutation({
  args: { id: v.id("images") },
  handler: async (ctx, { id }) => {
    await ctx.db.patch(id, { status: "deleted" });
  },
});
