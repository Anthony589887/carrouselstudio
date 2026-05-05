import { v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
  type MutationCtx,
} from "./_generated/server";
import type { Id } from "./_generated/dataModel";

const aspectRatioValidator = v.union(v.literal("4:5"), v.literal("9:16"));

// Mirror of the SceneFilters type in imagePrompts.ts but expressed as Convex
// validators so it can flow through queries / mutations without leaking the
// "use node" directive of the dict file.
const sceneFiltersValidator = v.optional(
  v.object({
    lighting: v.optional(v.string()),
    energy: v.optional(v.string()),
    space: v.optional(v.string()),
  }),
);

// Scene row type for the frontend — adds the resolved `imageUrl` and the
// `displayName` from the dict (or a custom-prompt fallback).
export const list = query({
  args: {
    filters: sceneFiltersValidator,
  },
  handler: async (ctx, { filters }) => {
    const all = await ctx.db.query("scenes").collect();

    const filtered = all.filter((scene) => {
      if (!filters) return true;
      if (!scene.tags) {
        // From-prompt scenes without tags pass when no filters are active,
        // and are excluded as soon as any filter is set (we can't know if
        // they match).
        const anyActive =
          filters.lighting || filters.energy || filters.space;
        return !anyActive;
      }
      if (filters.lighting && scene.tags.lighting !== filters.lighting)
        return false;
      if (filters.energy && scene.tags.energy !== filters.energy) return false;
      if (filters.space && scene.tags.space !== filters.space) return false;
      return true;
    });

    const sorted = filtered.sort((a, b) => b.createdAt - a.createdAt);
    return await Promise.all(
      sorted.map(async (scene) => ({
        ...scene,
        imageUrl: scene.imageStorageId
          ? await ctx.storage.getUrl(scene.imageStorageId)
          : null,
      })),
    );
  },
});

export const getById = query({
  args: { id: v.id("scenes") },
  handler: async (ctx, { id }) => {
    const scene = await ctx.db.get(id);
    if (!scene) return null;
    return {
      ...scene,
      imageUrl: scene.imageStorageId
        ? await ctx.storage.getUrl(scene.imageStorageId)
        : null,
    };
  },
});

export const getInternal = internalQuery({
  args: { id: v.id("scenes") },
  handler: async (ctx, { id }) => ctx.db.get(id),
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => await ctx.storage.generateUploadUrl(),
});

// === Lifecycle ============================================================
// Mirror of `images.markCompleted` / `markFailed`: invoked by sceneGeneration
// at the end of a Gemini run.

export const markCompleted = internalMutation({
  args: {
    id: v.id("scenes"),
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
    id: v.id("scenes"),
    errorMessage: v.string(),
  },
  handler: async (ctx, { id, errorMessage }) => {
    await ctx.db.patch(id, {
      status: "failed",
      errorMessage: errorMessage.slice(0, 500),
    });
  },
});

// Public — used by /api/postprocess to swap in the Sharp-processed image.
export const replaceStorage = mutation({
  args: {
    id: v.id("scenes"),
    newStorageId: v.id("_storage"),
  },
  handler: async (ctx, { id, newStorageId }) => {
    const scene = await ctx.db.get(id);
    if (!scene) return;
    const oldId = scene.imageStorageId;
    await ctx.db.patch(id, { imageStorageId: newStorageId });
    if (oldId && oldId !== newStorageId) {
      try {
        await ctx.storage.delete(oldId);
      } catch {}
    }
  },
});

// === Hard-delete + carousel cascade =======================================

/**
 * Hard delete: removes the scene row + its storage blob, and detaches the
 * scene from every carousel that referenced it. Mirror of `images.remove`
 * but matches against `(kind === "scene" && sceneId === id)` since scenes
 * are persona-less and live in their own table.
 */
export const remove = mutation({
  args: { id: v.id("scenes") },
  handler: async (ctx, { id }) => {
    const scene = await ctx.db.get(id);
    if (!scene) return { deleted: false };

    const allCarousels = await ctx.db.query("carousels").collect();
    let carouselsCleaned = 0;
    for (const c of allCarousels) {
      const next = c.images.filter(
        (i) => !(i.kind === "scene" && i.sceneId === id),
      );
      if (next.length !== c.images.length) {
        await ctx.db.patch(c._id, { images: next });
        carouselsCleaned++;
      }
    }

    if (scene.imageStorageId) {
      try {
        await ctx.storage.delete(scene.imageStorageId);
      } catch (e) {
        console.warn(`[scenes.remove] storage delete failed for ${id}:`, e);
      }
    }
    await ctx.db.delete(id);
    return { deleted: true, carouselsCleaned };
  },
});

export const bulkDelete = mutation({
  args: { ids: v.array(v.id("scenes")) },
  handler: async (ctx, { ids }) => {
    if (ids.length === 0) {
      return { deletedCount: 0, storageDeletedCount: 0, carouselsCleaned: 0 };
    }
    const idSet = new Set(ids);

    const allCarousels = await ctx.db.query("carousels").collect();
    let carouselsCleaned = 0;
    for (const c of allCarousels) {
      const next = c.images.filter(
        (i) => !(i.kind === "scene" && i.sceneId && idSet.has(i.sceneId)),
      );
      if (next.length !== c.images.length) {
        await ctx.db.patch(c._id, { images: next });
        carouselsCleaned++;
      }
    }

    let deletedCount = 0;
    let storageDeletedCount = 0;
    for (const id of ids) {
      const scene = await ctx.db.get(id);
      if (!scene) continue;
      if (scene.imageStorageId) {
        try {
          await ctx.storage.delete(scene.imageStorageId);
          storageDeletedCount++;
        } catch (e) {
          console.warn(
            `[scenes.bulkDelete] storage delete failed for ${id}:`,
            e,
          );
        }
      }
      await ctx.db.delete(id);
      deletedCount++;
    }
    return { deletedCount, storageDeletedCount, carouselsCleaned };
  },
});

// === Reverse-lookup: which carousels use this scene? ======================

export const getCarouselUsages = query({
  args: { id: v.id("scenes") },
  handler: async (ctx, { id }) => {
    const scene = await ctx.db.get(id);
    if (!scene) return [];
    const carousels = await ctx.db.query("carousels").collect();
    const matches = carousels.filter((c) =>
      c.images.some((i) => i.kind === "scene" && i.sceneId === id),
    );
    return matches
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((c) => {
        const date = new Date(c.createdAt).toLocaleDateString("fr-FR");
        const label =
          c.status === "posted"
            ? `Carrousel posté du ${date}`
            : `Carrousel du ${date}`;
        return {
          carouselId: c._id,
          status: c.status,
          personaId: c.personaId,
          label,
        };
      });
  },
});

export const getBulkCarouselUsages = query({
  args: { ids: v.array(v.id("scenes")) },
  handler: async (ctx, { ids }) => {
    if (ids.length === 0) return { scenesUsedCount: 0, totalUsages: 0 };
    const idSet = new Set(ids);
    const allCarousels = await ctx.db.query("carousels").collect();
    const usageMap = new Map<string, number>();
    for (const c of allCarousels) {
      for (const item of c.images) {
        if (item.kind !== "scene") continue;
        if (!item.sceneId) continue;
        if (idSet.has(item.sceneId)) {
          usageMap.set(
            item.sceneId,
            (usageMap.get(item.sceneId) ?? 0) + 1,
          );
        }
      }
    }
    let totalUsages = 0;
    for (const v of usageMap.values()) totalUsages += v;
    return { scenesUsedCount: usageMap.size, totalUsages };
  },
});

// === Stuck-generating cleanup =============================================
// Mirror of `images.cleanupStuckGenerating`. Anything stuck in `generating`
// for > 5 min is auto-flipped to `failed` so the bank shows a retryable
// tile instead of a frozen placeholder.

const STUCK_THRESHOLD_MS = 5 * 60 * 1000;

async function flipStuckScenesToFailed(
  ctx: MutationCtx,
): Promise<{ cleanedCount: number; total: number; cleanedIds: Id<"scenes">[] }> {
  const stuck = await ctx.db
    .query("scenes")
    .filter((q) => q.eq(q.field("status"), "generating"))
    .collect();

  const now = Date.now();
  const cleanedIds: Id<"scenes">[] = [];
  for (const scene of stuck) {
    if (now - scene._creationTime >= STUCK_THRESHOLD_MS) {
      await ctx.db.patch(scene._id, {
        status: "failed",
        errorMessage: "Auto-cleanup: stuck in generating > 5 min",
      });
      cleanedIds.push(scene._id);
    }
  }
  return { cleanedCount: cleanedIds.length, total: stuck.length, cleanedIds };
}

export const cleanupStuckGenerating = internalMutation({
  args: {},
  handler: async (ctx) => flipStuckScenesToFailed(ctx),
});

export const manualCleanupStuckGenerating = mutation({
  args: {},
  handler: async (ctx) => {
    const { cleanedCount, total } = await flipStuckScenesToFailed(ctx);
    return { cleanedCount, total };
  },
});
