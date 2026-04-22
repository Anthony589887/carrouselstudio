import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const uiAssetType = v.union(
  v.literal("ui_screen"),
  v.literal("thumbnail"),
  v.literal("logo"),
);

export const list = query({
  args: { type: v.optional(uiAssetType) },
  handler: async (ctx, { type }) => {
    if (type) {
      return await ctx.db
        .query("ui_assets")
        .withIndex("by_type", (q) => q.eq("type", type))
        .collect();
    }
    return await ctx.db.query("ui_assets").collect();
  },
});

export const getByCode = query({
  args: { code: v.string() },
  handler: async (ctx, { code }) =>
    ctx.db
      .query("ui_assets")
      .withIndex("by_code", (q) => q.eq("code", code))
      .unique(),
});

export const create = mutation({
  args: {
    code: v.string(),
    name: v.string(),
    type: uiAssetType,
    storageId: v.id("_storage"),
    description: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("ui_assets", {
      ...args,
      isActive: args.isActive ?? true,
      createdAt: Date.now(),
    });
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => await ctx.storage.generateUploadUrl(),
});

export const getAssetUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, { storageId }) => await ctx.storage.getUrl(storageId),
});
