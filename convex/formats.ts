import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const slideTemplate = v.object({
  slot: v.number(),
  role: v.string(),
  promptTemplate: v.string(),
  notes: v.optional(v.string()),
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("formats").collect();
    return rows.sort((a, b) => a.code.localeCompare(b.code));
  },
});

export const listActive = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db
      .query("formats")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();
    return rows.sort((a, b) => a.code.localeCompare(b.code));
  },
});

export const get = query({
  args: { id: v.id("formats") },
  handler: async (ctx, { id }) => ctx.db.get(id),
});

export const getByCode = query({
  args: { code: v.string() },
  handler: async (ctx, { code }) =>
    ctx.db
      .query("formats")
      .withIndex("by_code", (q) => q.eq("code", code))
      .unique(),
});

export const create = mutation({
  args: {
    code: v.string(),
    name: v.string(),
    archetype: v.string(),
    defaultDA: v.string(),
    slideTemplates: v.array(slideTemplate),
    description: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("formats", {
      ...args,
      isActive: args.isActive ?? true,
      createdAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("formats"),
    name: v.optional(v.string()),
    archetype: v.optional(v.string()),
    defaultDA: v.optional(v.string()),
    slideTemplates: v.optional(v.array(slideTemplate)),
    description: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, { id, ...patch }) => {
    await ctx.db.patch(id, patch);
  },
});

export const remove = mutation({
  args: { id: v.id("formats") },
  handler: async (ctx, { id }) => {
    const linked = await ctx.db
      .query("scripts")
      .withIndex("by_format", (q) => q.eq("formatId", id))
      .first();
    if (linked) {
      throw new Error(
        "Des scripts utilisent ce format. Supprime-les d'abord.",
      );
    }
    await ctx.db.delete(id);
  },
});

export const toggleActive = mutation({
  args: { id: v.id("formats") },
  handler: async (ctx, { id }) => {
    const format = await ctx.db.get(id);
    if (!format) throw new Error("Format not found");
    await ctx.db.patch(id, { isActive: !format.isActive });
  },
});
