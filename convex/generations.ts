import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const generationStatus = v.union(
  v.literal("pending"),
  v.literal("in_progress"),
  v.literal("completed"),
  v.literal("partial"),
  v.literal("failed"),
);

const slideStatus = v.union(
  v.literal("pending"),
  v.literal("generating"),
  v.literal("completed"),
  v.literal("failed"),
);

export const list = query({
  args: {
    scriptId: v.optional(v.id("scripts")),
    personaId: v.optional(v.id("personas")),
    status: v.optional(generationStatus),
  },
  handler: async (ctx, { scriptId, personaId, status }) => {
    if (scriptId) {
      return await ctx.db
        .query("generations")
        .withIndex("by_script", (q) => q.eq("scriptId", scriptId))
        .collect();
    }
    if (personaId) {
      return await ctx.db
        .query("generations")
        .withIndex("by_persona", (q) => q.eq("personaId", personaId))
        .collect();
    }
    if (status) {
      return await ctx.db
        .query("generations")
        .withIndex("by_status", (q) => q.eq("status", status))
        .collect();
    }
    return await ctx.db.query("generations").collect();
  },
});

export const get = query({
  args: { id: v.id("generations") },
  handler: async (ctx, { id }) => ctx.db.get(id),
});

export const create = mutation({
  args: {
    scriptId: v.id("scripts"),
    personaId: v.id("personas"),
  },
  handler: async (ctx, { scriptId, personaId }) => {
    const slides = [1, 2, 3, 4, 5, 6].map((slot) => ({
      slot,
      status: "pending" as const,
    }));
    return await ctx.db.insert("generations", {
      scriptId,
      personaId,
      slides,
      status: "pending",
      startedAt: Date.now(),
    });
  },
});

export const updateSlideStatus = mutation({
  args: {
    generationId: v.id("generations"),
    slot: v.number(),
    status: slideStatus,
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, { generationId, slot, status, errorMessage }) => {
    const gen = await ctx.db.get(generationId);
    if (!gen) throw new Error("Generation not found");
    const slides = gen.slides.map((s) =>
      s.slot === slot
        ? {
            ...s,
            status,
            errorMessage: errorMessage ?? s.errorMessage,
            generatedAt: status === "completed" ? Date.now() : s.generatedAt,
          }
        : s,
    );
    await ctx.db.patch(generationId, { slides });
  },
});

export const attachSlideImage = mutation({
  args: {
    generationId: v.id("generations"),
    slot: v.number(),
    imageStorageId: v.id("_storage"),
  },
  handler: async (ctx, { generationId, slot, imageStorageId }) => {
    const gen = await ctx.db.get(generationId);
    if (!gen) throw new Error("Generation not found");
    const slides = gen.slides.map((s) =>
      s.slot === slot
        ? {
            ...s,
            status: "completed" as const,
            imageStorageId,
            generatedAt: Date.now(),
          }
        : s,
    );
    await ctx.db.patch(generationId, { slides });
  },
});

export const complete = mutation({
  args: { id: v.id("generations") },
  handler: async (ctx, { id }) => {
    const gen = await ctx.db.get(id);
    if (!gen) throw new Error("Generation not found");
    const hasFailed = gen.slides.some((s) => s.status === "failed");
    const allCompleted = gen.slides.every((s) => s.status === "completed");
    const status = allCompleted
      ? "completed"
      : hasFailed
        ? gen.slides.some((s) => s.status === "completed")
          ? "partial"
          : "failed"
        : "in_progress";
    await ctx.db.patch(id, { status, completedAt: Date.now() });
  },
});
