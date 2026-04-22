import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db
      .query("personas")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();
    return rows.sort((a, b) => a.code.localeCompare(b.code));
  },
});

export const get = query({
  args: { id: v.id("personas") },
  handler: async (ctx, { id }) => ctx.db.get(id),
});

export const getByCode = query({
  args: { code: v.string() },
  handler: async (ctx, { code }) =>
    ctx.db
      .query("personas")
      .withIndex("by_code", (q) => q.eq("code", code))
      .unique(),
});

export const create = mutation({
  args: {
    code: v.string(),
    name: v.string(),
    tiktokAccount: v.optional(v.string()),
    gender: v.union(v.literal("F"), v.literal("H")),
    ethnicity: v.string(),
    age: v.number(),
    faceBlock: v.string(),
    defaultDA: v.optional(v.string()),
    notes: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("personas", {
      ...args,
      isActive: args.isActive ?? true,
      createdAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("personas"),
    name: v.optional(v.string()),
    tiktokAccount: v.optional(v.string()),
    ethnicity: v.optional(v.string()),
    age: v.optional(v.number()),
    faceBlock: v.optional(v.string()),
    defaultDA: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...patch }) => {
    await ctx.db.patch(id, patch);
  },
});

export const toggleActive = mutation({
  args: { id: v.id("personas") },
  handler: async (ctx, { id }) => {
    const persona = await ctx.db.get(id);
    if (!persona) throw new Error("Persona not found");
    await ctx.db.patch(id, { isActive: !persona.isActive });
  },
});

export const setPhoto = mutation({
  args: { id: v.id("personas"), storageId: v.id("_storage") },
  handler: async (ctx, { id, storageId }) => {
    await ctx.db.patch(id, { photoStorageId: storageId });
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => await ctx.storage.generateUploadUrl(),
});

export const getPhotoUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, { storageId }) => await ctx.storage.getUrl(storageId),
});
