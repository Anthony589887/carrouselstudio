import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import {
  composeScenePrompt,
  composeSceneFromCustomPrompt,
  pickCompatibleScene,
  type SceneFilters,
  type Lighting,
  type Energy,
  type Space,
} from "./imagePrompts";
import type { Id } from "./_generated/dataModel";

const aspectRatioValidator = v.union(v.literal("4:5"), v.literal("9:16"));

const sceneFiltersValidator = v.optional(
  v.object({
    lighting: v.optional(v.string()),
    energy: v.optional(v.string()),
    space: v.optional(v.string()),
  }),
);

const sceneTagsValidator = v.optional(
  v.object({
    lighting: v.string(),
    energy: v.string(),
    space: v.string(),
  }),
);

/**
 * Mode "from-dict": pick N scenes from the SCENES dict, optionally filtered
 * on the 3 dimensions (lighting/energy/space). Inserts N placeholder rows
 * (status="generating") and schedules N independent runSceneGeneration
 * actions in parallel. Returns within ~100ms.
 *
 * If the same filter combination matches a single scene in the dict, all
 * N rows will share that scene id (output diversity comes from Gemini's
 * stochasticity, not the dict). For broader filters the random draw varies.
 */
export const generateBatchFromDict = mutation({
  args: {
    count: v.number(),
    aspectRatio: aspectRatioValidator,
    filters: sceneFiltersValidator,
  },
  handler: async (ctx, { count, aspectRatio, filters }) => {
    if (count < 1 || count > 50) throw new Error("count must be 1..50");

    const cleanFilters: SceneFilters | undefined = filters
      ? {
          lighting: filters.lighting as Lighting | undefined,
          energy: filters.energy as Energy | undefined,
          space: filters.space as Space | undefined,
        }
      : undefined;

    const created: Id<"scenes">[] = [];
    let droppedNoScene = 0;

    for (let i = 0; i < count; i++) {
      let scene;
      try {
        scene = pickCompatibleScene({ filters: cleanFilters });
      } catch {
        droppedNoScene++;
        continue;
      }

      const prompt = composeScenePrompt({
        sceneText: scene.text,
        aspectRatio,
      });

      const id: Id<"scenes"> = await ctx.db.insert("scenes", {
        generationMode: "from-dict",
        sceneId: scene.id,
        tags: scene.tags,
        status: "generating",
        aspectRatio,
        promptUsed: prompt,
        createdAt: Date.now(),
      });
      created.push(id);
      await ctx.scheduler.runAfter(
        0,
        internal.sceneGeneration.runSceneGeneration,
        { sceneRowId: id },
      );
    }

    return {
      sceneIds: created,
      count: created.length,
      droppedNoScene,
    };
  },
});

/**
 * Mode "from-prompt": user provides a freeform scene description, which is
 * wrapped with the strict no-person preamble + rendering directives by
 * `composeSceneFromCustomPrompt`. Optional `tags` are stored on the row so
 * the UI filters can include the scene later.
 */
export const generateBatchFromPrompt = mutation({
  args: {
    customPrompt: v.string(),
    count: v.number(),
    aspectRatio: aspectRatioValidator,
    tags: sceneTagsValidator,
  },
  handler: async (ctx, { customPrompt, count, aspectRatio, tags }) => {
    if (count < 1 || count > 50) throw new Error("count must be 1..50");
    const trimmed = customPrompt.trim();
    if (!trimmed) throw new Error("customPrompt is required");
    if (trimmed.length > 2000)
      throw new Error("customPrompt too long (max 2000)");

    const prompt = composeSceneFromCustomPrompt({
      customPrompt: trimmed,
      aspectRatio,
    });

    const created: Id<"scenes">[] = [];
    for (let i = 0; i < count; i++) {
      const id: Id<"scenes"> = await ctx.db.insert("scenes", {
        generationMode: "from-prompt",
        customPrompt: trimmed,
        tags,
        status: "generating",
        aspectRatio,
        promptUsed: prompt,
        createdAt: Date.now(),
      });
      created.push(id);
      await ctx.scheduler.runAfter(
        0,
        internal.sceneGeneration.runSceneGeneration,
        { sceneRowId: id },
      );
    }

    return { sceneIds: created, count: created.length };
  },
});

/**
 * Retry a failed (or available) scene keeping the SAME promptUsed.
 * Resets row to "generating" and reschedules. For from-dict scenes the
 * dict id is preserved; for from-prompt, the customPrompt is preserved.
 */
export const retryScene = mutation({
  args: { id: v.id("scenes") },
  handler: async (ctx, { id }) => {
    const scene = await ctx.db.get(id);
    if (!scene) throw new Error("Scene not found");
    if (scene.imageStorageId) {
      try {
        await ctx.storage.delete(scene.imageStorageId);
      } catch {}
    }
    await ctx.db.patch(id, {
      status: "generating",
      imageStorageId: undefined,
      errorMessage: undefined,
    });
    await ctx.scheduler.runAfter(
      0,
      internal.sceneGeneration.runSceneGeneration,
      { sceneRowId: id },
    );
  },
});
