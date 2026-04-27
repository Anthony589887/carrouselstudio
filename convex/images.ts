import { v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { situationIdsByTag } from "./imagePrompts";
import type { Tags } from "./imagePrompts";

const aspectRatioValidator = v.union(v.literal("4:5"), v.literal("9:16"));

export const list = query({
  args: {
    personaId: v.id("personas"),
    includeUsed: v.optional(v.boolean()),
    // Folder filter:
    //   undefined  → no folder filter (all images of the persona)
    //   "root"     → only images with no folderId
    //   <folderId> → only images in that folder
    folderFilter: v.optional(v.union(v.literal("root"), v.id("folders"))),
    // tag-level filters (resolved server-side via situationIds)
    lighting: v.optional(v.array(v.string())),
    energy: v.optional(v.array(v.string())),
    social: v.optional(v.array(v.string())),
    space: v.optional(v.array(v.string())),
    // direct ID filters (used by deeper debug / future UI)
    situationIds: v.optional(v.array(v.string())),
    legacyTypes: v.optional(v.array(v.string())),
  },
  handler: async (
    ctx,
    {
      personaId,
      includeUsed,
      folderFilter,
      lighting,
      energy,
      social,
      space,
      situationIds,
      legacyTypes,
    },
  ) => {
    const all = await ctx.db
      .query("images")
      .withIndex("by_persona", (q) => q.eq("personaId", personaId))
      .collect();

    // Resolve tag-level filters into a set of allowed situationIds.
    // If the caller passes both `lighting` AND `space` (etc.), we intersect:
    // an image must be in the situations matching ALL active dimensions.
    const dimsActive: Array<{ dim: keyof Tags; values: string[] }> = [];
    if (lighting && lighting.length > 0)
      dimsActive.push({ dim: "lighting", values: lighting });
    if (energy && energy.length > 0)
      dimsActive.push({ dim: "energy", values: energy });
    if (social && social.length > 0)
      dimsActive.push({ dim: "social", values: social });
    if (space && space.length > 0)
      dimsActive.push({ dim: "space", values: space });

    let allowedSituationIds: Set<string> | null = null;
    if (dimsActive.length > 0) {
      const sets = dimsActive.map(
        (d) => new Set(situationIdsByTag(d.dim, d.values)),
      );
      allowedSituationIds = sets.reduce((acc, s) => {
        return new Set([...acc].filter((id) => s.has(id)));
      });
    }
    if (situationIds && situationIds.length > 0) {
      const ids = new Set(situationIds);
      allowedSituationIds = allowedSituationIds
        ? new Set([...allowedSituationIds].filter((id) => ids.has(id)))
        : ids;
    }

    const legacySet =
      legacyTypes && legacyTypes.length > 0 ? new Set(legacyTypes) : null;

    const filtered = all.filter((img) => {
      if (img.status === "deleted") return false;
      if (img.status === "used" && !includeUsed) return false;

      // Folder filter — applied first.
      if (folderFilter === "root") {
        if (img.folderId) return false;
      } else if (folderFilter !== undefined) {
        if (img.folderId !== folderFilter) return false;
      }

      // If tag-based filters are active, an image must have a matching
      // situationId. Legacy images (no situationId) are excluded unless
      // the user is filtering by legacyType.
      if (allowedSituationIds !== null) {
        if (!img.situationId || !allowedSituationIds.has(img.situationId))
          return false;
      }

      if (legacySet !== null) {
        if (!img.legacyType || !legacySet.has(img.legacyType)) return false;
      }

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

// Distinct legacyType values present for a given persona — used by the
// "Type (ancien)" dropdown which only appears if there are legacy images.
export const distinctLegacyTypes = query({
  args: { personaId: v.id("personas") },
  handler: async (ctx, { personaId }) => {
    const all = await ctx.db
      .query("images")
      .withIndex("by_persona", (q) => q.eq("personaId", personaId))
      .collect();
    const set = new Set<string>();
    for (const img of all) {
      if (img.legacyType && img.status !== "deleted") set.add(img.legacyType);
    }
    return [...set].sort();
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

// === Folder operations ====================================================

export const moveToFolder = mutation({
  args: {
    imageId: v.id("images"),
    folderId: v.union(v.id("folders"), v.null()),
  },
  handler: async (ctx, { imageId, folderId }) => {
    const img = await ctx.db.get(imageId);
    if (!img) throw new Error("Image introuvable");
    if (folderId !== null) {
      const folder = await ctx.db.get(folderId);
      if (!folder) throw new Error("Dossier introuvable");
      if (folder.personaId !== img.personaId)
        throw new Error("Le dossier appartient à un autre persona");
    }
    await ctx.db.patch(imageId, {
      folderId: folderId === null ? undefined : folderId,
    });
  },
});

export const bulkMoveToFolder = mutation({
  args: {
    imageIds: v.array(v.id("images")),
    folderId: v.union(v.id("folders"), v.null()),
  },
  handler: async (ctx, { imageIds, folderId }) => {
    if (imageIds.length === 0) return { moved: 0 };
    let personaId: string | null = null;
    if (folderId !== null) {
      const folder = await ctx.db.get(folderId);
      if (!folder) throw new Error("Dossier introuvable");
      personaId = folder.personaId;
    }
    let moved = 0;
    for (const id of imageIds) {
      const img = await ctx.db.get(id);
      if (!img) continue;
      if (personaId !== null && img.personaId !== personaId) {
        throw new Error("Toutes les images doivent appartenir au même persona que le dossier");
      }
      await ctx.db.patch(id, {
        folderId: folderId === null ? undefined : folderId,
      });
      moved++;
    }
    return { moved };
  },
});

// Lazy lookup: which carousels reference this image. Returns a friendly label
// per carousel for display in the "Used in N carousels" popover.
export const getCarouselUsages = query({
  args: { imageId: v.id("images") },
  handler: async (ctx, { imageId }) => {
    const img = await ctx.db.get(imageId);
    if (!img) return [];
    const carousels = await ctx.db
      .query("carousels")
      .withIndex("by_persona", (q) => q.eq("personaId", img.personaId))
      .collect();
    const matches = carousels.filter((c) =>
      c.images.some((i) => i.imageId === imageId),
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
          folderId: c.folderId ?? null,
          label,
        };
      });
  },
});

// Re-export the validator just to keep the union centralized.
export { aspectRatioValidator };
