import { v } from "convex/values";
import { internalQuery, mutation, query } from "./_generated/server";

export const getInternal = internalQuery({
  args: { id: v.id("scripts") },
  handler: async (ctx, { id }) => ctx.db.get(id),
});

const scriptStatus = v.union(
  v.literal("draft"),
  v.literal("ready"),
  v.literal("generated"),
  v.literal("posted"),
);

const slide = v.object({
  slot: v.number(),
  role: v.string(),
  visualPrompt: v.string(),
  overlayText: v.string(),
});

export const list = query({
  args: {
    formatId: v.optional(v.id("formats")),
    status: v.optional(scriptStatus),
  },
  handler: async (ctx, { formatId, status }) => {
    if (formatId) {
      return await ctx.db
        .query("scripts")
        .withIndex("by_format", (q) => q.eq("formatId", formatId))
        .collect();
    }
    if (status) {
      return await ctx.db
        .query("scripts")
        .withIndex("by_status", (q) => q.eq("status", status))
        .collect();
    }
    return await ctx.db.query("scripts").collect();
  },
});

export const get = query({
  args: { id: v.id("scripts") },
  handler: async (ctx, { id }) => ctx.db.get(id),
});

export const create = mutation({
  args: {
    name: v.string(),
    formatId: v.id("formats"),
    preferredPersonaId: v.optional(v.id("personas")),
    outfitBrief: v.optional(v.string()),
    slides: v.optional(v.array(slide)),
    status: v.optional(scriptStatus),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const format = await ctx.db.get(args.formatId);
    if (!format) throw new Error("Format introuvable");

    const existing = await ctx.db
      .query("scripts")
      .withIndex("by_format", (q) => q.eq("formatId", args.formatId))
      .collect();
    const nextNumber = String(existing.length + 1).padStart(3, "0");
    const code = `${format.code}-S${nextNumber}`;

    const collision = await ctx.db
      .query("scripts")
      .withIndex("by_code", (q) => q.eq("code", code))
      .first();
    if (collision) {
      throw new Error(`Le code ${code} est déjà utilisé, réessaie.`);
    }

    const slides =
      args.slides ??
      format.slideTemplates.map((t) => ({
        slot: t.slot,
        role: t.role,
        visualPrompt: t.promptTemplate,
        overlayText: "",
      }));

    const now = Date.now();
    return await ctx.db.insert("scripts", {
      code,
      name: args.name,
      formatId: args.formatId,
      preferredPersonaId: args.preferredPersonaId,
      outfitBrief: args.outfitBrief,
      slides,
      status: args.status ?? "draft",
      notes: args.notes,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("scripts"),
    name: v.optional(v.string()),
    formatId: v.optional(v.id("formats")),
    preferredPersonaId: v.optional(v.id("personas")),
    outfitBrief: v.optional(v.string()),
    slides: v.optional(v.array(slide)),
    status: v.optional(scriptStatus),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...patch }) => {
    await ctx.db.patch(id, { ...patch, updatedAt: Date.now() });
  },
});

export const updateSlide = mutation({
  args: {
    scriptId: v.id("scripts"),
    slot: v.number(),
    visualPrompt: v.optional(v.string()),
    overlayText: v.optional(v.string()),
  },
  handler: async (ctx, { scriptId, slot, visualPrompt, overlayText }) => {
    const script = await ctx.db.get(scriptId);
    if (!script) throw new Error("Script not found");
    const slides = script.slides.map((s) =>
      s.slot === slot
        ? {
            ...s,
            visualPrompt: visualPrompt ?? s.visualPrompt,
            overlayText: overlayText ?? s.overlayText,
          }
        : s,
    );
    await ctx.db.patch(scriptId, { slides, updatedAt: Date.now() });
  },
});

export const setStatus = mutation({
  args: { id: v.id("scripts"), status: scriptStatus },
  handler: async (ctx, { id, status }) => {
    await ctx.db.patch(id, { status, updatedAt: Date.now() });
  },
});

export const remove = mutation({
  args: { id: v.id("scripts") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});
