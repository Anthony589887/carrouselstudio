import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { composePrompt } from "./imagePrompts";
import type { Id } from "./_generated/dataModel";

const aspectRatioValidator = v.union(v.literal("4:5"), v.literal("9:16"));

/**
 * User-facing entry point for batch image generation.
 * Inserts N placeholder rows immediately (status = "generating") and schedules
 * N independent runGeneration actions in parallel. Returns in <100ms — frontend
 * closes the modal right away and shows live placeholders that fill in as each
 * Gemini call completes.
 */
export const startBatch = mutation({
  args: {
    personaId: v.id("personas"),
    aspectRatio: aspectRatioValidator,
    requests: v.array(
      v.object({ type: v.string(), count: v.number() }),
    ),
  },
  handler: async (ctx, { personaId, aspectRatio, requests }) => {
    const persona = await ctx.db.get(personaId);
    if (!persona) throw new Error("Persona not found");

    const created: Id<"images">[] = [];
    let seedBase = Date.now();
    for (const req of requests) {
      for (let i = 0; i < req.count; i++) {
        const prompt = composePrompt(
          persona.identityDescription,
          req.type,
          aspectRatio,
          seedBase++,
        );
        const id: Id<"images"> = await ctx.db.insert("images", {
          personaId,
          type: req.type,
          status: "generating",
          aspectRatio,
          promptUsed: prompt,
          createdAt: Date.now(),
        });
        created.push(id);
        await ctx.scheduler.runAfter(0, internal.imageGeneration.runGeneration, {
          imageId: id,
        });
      }
    }
    return { imageIds: created, count: created.length };
  },
});

/**
 * Retry a failed (or available) image generation. Resets the row to
 * "generating", deletes the previous blob if any, schedules a fresh action.
 */
export const retryImage = mutation({
  args: { id: v.id("images") },
  handler: async (ctx, { id }) => {
    const img = await ctx.db.get(id);
    if (!img) throw new Error("Image not found");
    if (img.status === "deleted") throw new Error("Image is deleted");
    if (img.status === "used")
      throw new Error("Image already used in a carousel");
    if (img.imageStorageId) {
      try {
        await ctx.storage.delete(img.imageStorageId);
      } catch {}
    }
    await ctx.db.patch(id, {
      status: "generating",
      imageStorageId: undefined,
      errorMessage: undefined,
    });
    await ctx.scheduler.runAfter(0, internal.imageGeneration.runGeneration, {
      imageId: id,
    });
  },
});
