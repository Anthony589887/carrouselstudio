import { v } from "convex/values";
import { mutation, query, type QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";

function carouselDisplayLabel(c: {
  status: "draft" | "posted";
  createdAt: number;
  postedAt?: number;
}): string {
  const date = new Date(
    c.status === "posted" && c.postedAt ? c.postedAt : c.createdAt,
  ).toLocaleDateString("fr-FR");
  return c.status === "posted"
    ? `Carrousel posté du ${date}`
    : `Carrousel du ${date}`;
}

// Carousel item entry (post-schema migration). `kind` may be undefined on
// pre-migration rows where it implicitly means "image".
type CarouselItem = Doc<"carousels">["images"][number];

// Resolves the `kind` of a carousel item, defaulting to "image" for legacy
// rows that haven't been backfilled yet.
function resolveKind(item: CarouselItem): "image" | "scene" {
  if (item.kind) return item.kind;
  return "image";
}

// Resolves a carousel item to a frontend-friendly shape with the image URL.
// Returns null when the underlying row has been hard-deleted.
async function resolveCarouselItem(
  ctx: QueryCtx,
  item: CarouselItem,
): Promise<{
  kind: "image" | "scene";
  imageId: Id<"images"> | null;
  sceneId: Id<"scenes"> | null;
  order: number;
  label: string | null;
  imageUrl: string | null;
  deleted: boolean;
} | null> {
  const kind = resolveKind(item);
  if (kind === "scene") {
    if (!item.sceneId) return null;
    const scene = await ctx.db.get(item.sceneId);
    if (!scene) {
      return {
        kind: "scene",
        imageId: null,
        sceneId: item.sceneId,
        order: item.order,
        label: null,
        imageUrl: null,
        deleted: true,
      };
    }
    const url = scene.imageStorageId
      ? await ctx.storage.getUrl(scene.imageStorageId)
      : null;
    return {
      kind: "scene",
      imageId: null,
      sceneId: scene._id,
      order: item.order,
      // For from-dict scenes use the dict id; for from-prompt fall back to
      // the (truncated) custom prompt for the UI label.
      label:
        scene.sceneId ??
        (scene.customPrompt
          ? scene.customPrompt.slice(0, 80)
          : null),
      imageUrl: url,
      deleted: false,
    };
  }
  // kind === "image"
  if (!item.imageId) return null;
  const img = await ctx.db.get(item.imageId);
  if (!img) {
    return {
      kind: "image",
      imageId: item.imageId,
      sceneId: null,
      order: item.order,
      label: null,
      imageUrl: null,
      deleted: true,
    };
  }
  const url = img.imageStorageId
    ? await ctx.storage.getUrl(img.imageStorageId)
    : null;
  return {
    kind: "image",
    imageId: img._id,
    sceneId: null,
    order: item.order,
    label: img.situationId ?? img.legacyType ?? null,
    imageUrl: url,
    deleted: false,
  };
}

export const listByPersona = query({
  args: {
    personaId: v.id("personas"),
    folderFilter: v.optional(v.union(v.literal("root"), v.id("folders"))),
  },
  handler: async (ctx, { personaId, folderFilter }) => {
    const carousels = await ctx.db
      .query("carousels")
      .withIndex("by_persona", (q) => q.eq("personaId", personaId))
      .collect();
    const filtered = carousels.filter((c) => {
      if (folderFilter === "root") return !c.folderId;
      if (folderFilter !== undefined) return c.folderId === folderFilter;
      return true;
    });
    const sorted = filtered.sort((a, b) => b.createdAt - a.createdAt);
    return await Promise.all(
      sorted.map(async (c) => {
        const orderedImages = [...c.images].sort((a, b) => a.order - b.order);
        const resolved = await Promise.all(
          orderedImages.map((item) => resolveCarouselItem(ctx, item)),
        );
        return {
          ...c,
          images: resolved.filter((i) => i !== null),
          displayLabel: carouselDisplayLabel(c),
        };
      }),
    );
  },
});

export const get = query({
  args: { id: v.id("carousels") },
  handler: async (ctx, { id }) => {
    const c = await ctx.db.get(id);
    if (!c) return null;
    const orderedImages = [...c.images].sort((a, b) => a.order - b.order);
    const resolved = await Promise.all(
      orderedImages.map((item) => resolveCarouselItem(ctx, item)),
    );
    return {
      ...c,
      images: resolved.filter((i) => i !== null),
      displayLabel: carouselDisplayLabel(c),
    };
  },
});

export const create = mutation({
  args: {
    personaId: v.id("personas"),
    imageIds: v.array(v.id("images")),
    folderId: v.optional(v.id("folders")),
  },
  handler: async (ctx, { personaId, imageIds, folderId }) => {
    if (imageIds.length < 5) throw new Error("Min 5 images");
    if (imageIds.length > 10) throw new Error("Max 10 images");

    // Verify all images belong to persona and are available
    for (const id of imageIds) {
      const img = await ctx.db.get(id);
      if (!img) throw new Error(`Image ${id} not found`);
      if (img.personaId !== personaId)
        throw new Error("Image does not belong to this persona");
      if (img.status !== "available")
        throw new Error(`Image ${id} not available`);
    }

    // Optional folder validation
    if (folderId) {
      const folder = await ctx.db.get(folderId);
      if (!folder) throw new Error("Dossier introuvable");
      if (folder.personaId !== personaId)
        throw new Error("Le dossier appartient à un autre persona");
    }

    // Mark images as used
    for (const id of imageIds) {
      await ctx.db.patch(id, { status: "used" });
    }

    // Always write the new polymorphic format with explicit kind. The legacy
    // "no kind" shape is only retained for not-yet-backfilled rows.
    const images = imageIds.map((imageId, idx) => ({
      kind: "image" as const,
      imageId,
      order: idx,
    }));

    return await ctx.db.insert("carousels", {
      personaId,
      folderId: folderId ?? undefined,
      images,
      status: "draft",
      createdAt: Date.now(),
    });
  },
});

// Polymorphic create: accepts a mix of image and scene references with
// explicit `kind` discriminators. Used by the new-carousel flow once the
// scenes feature ships (Phase 3). Existing `create` is kept for backward
// compatibility; both insert the same polymorphic shape under the hood.
export const createMixed = mutation({
  args: {
    personaId: v.id("personas"),
    items: v.array(
      v.object({
        kind: v.union(v.literal("image"), v.literal("scene")),
        imageId: v.optional(v.id("images")),
        sceneId: v.optional(v.id("scenes")),
      }),
    ),
    folderId: v.optional(v.id("folders")),
  },
  handler: async (ctx, { personaId, items, folderId }) => {
    if (items.length < 5) throw new Error("Min 5 items");
    if (items.length > 10) throw new Error("Max 10 items");

    // Validate every item references the right id for its kind, and check
    // ownership/availability for images. Scenes are persona-less so the
    // only check is existence + status `available`.
    const imageIds: Id<"images">[] = [];
    for (const item of items) {
      if (item.kind === "image") {
        if (!item.imageId)
          throw new Error("kind=image requires imageId");
        const img = await ctx.db.get(item.imageId);
        if (!img) throw new Error(`Image ${item.imageId} not found`);
        if (img.personaId !== personaId)
          throw new Error("Image does not belong to this persona");
        if (img.status !== "available")
          throw new Error(`Image ${item.imageId} not available`);
        imageIds.push(item.imageId);
      } else {
        if (!item.sceneId)
          throw new Error("kind=scene requires sceneId");
        const scene = await ctx.db.get(item.sceneId);
        if (!scene) throw new Error(`Scene ${item.sceneId} not found`);
        if (scene.status !== "available")
          throw new Error(`Scene ${item.sceneId} not available`);
      }
    }

    // Optional folder validation
    if (folderId) {
      const folder = await ctx.db.get(folderId);
      if (!folder) throw new Error("Dossier introuvable");
      if (folder.personaId !== personaId)
        throw new Error("Le dossier appartient à un autre persona");
    }

    // Mark image rows as `used` (scenes stay `available` per decision).
    for (const id of imageIds) {
      await ctx.db.patch(id, { status: "used" });
    }

    const images = items.map((item, idx) => ({
      kind: item.kind,
      imageId: item.kind === "image" ? item.imageId : undefined,
      sceneId: item.kind === "scene" ? item.sceneId : undefined,
      order: idx,
    }));

    return await ctx.db.insert("carousels", {
      personaId,
      folderId: folderId ?? undefined,
      images,
      status: "draft",
      createdAt: Date.now(),
    });
  },
});

export const markAsPosted = mutation({
  args: {
    id: v.id("carousels"),
    tiktokLink: v.optional(v.string()),
    instagramLink: v.optional(v.string()),
  },
  handler: async (ctx, { id, tiktokLink, instagramLink }) => {
    await ctx.db.patch(id, {
      status: "posted",
      tiktokLink: tiktokLink || undefined,
      instagramLink: instagramLink || undefined,
      postedAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { id: v.id("carousels") },
  handler: async (ctx, { id }) => {
    const c = await ctx.db.get(id);
    if (!c) return;
    // Free image rows back to "available". Scenes are skipped — they never
    // transition to "used", so there's nothing to free for them.
    for (const item of c.images) {
      const kind = item.kind ?? "image";
      if (kind !== "image") continue;
      if (!item.imageId) continue;
      const img = await ctx.db.get(item.imageId);
      if (img && img.status === "used") {
        await ctx.db.patch(item.imageId, { status: "available" });
      }
    }
    await ctx.db.delete(id);
  },
});

// === Folder operations ====================================================

export const moveToFolder = mutation({
  args: {
    carouselId: v.id("carousels"),
    folderId: v.union(v.id("folders"), v.null()),
  },
  handler: async (ctx, { carouselId, folderId }) => {
    const c = await ctx.db.get(carouselId);
    if (!c) throw new Error("Carrousel introuvable");
    if (folderId !== null) {
      const folder = await ctx.db.get(folderId);
      if (!folder) throw new Error("Dossier introuvable");
      if (folder.personaId !== c.personaId)
        throw new Error("Le dossier appartient à un autre persona");
    }
    await ctx.db.patch(carouselId, {
      folderId: folderId === null ? undefined : folderId,
    });
  },
});

export const bulkMoveToFolder = mutation({
  args: {
    carouselIds: v.array(v.id("carousels")),
    folderId: v.union(v.id("folders"), v.null()),
  },
  handler: async (ctx, { carouselIds, folderId }) => {
    if (carouselIds.length === 0) return { moved: 0 };
    let personaId: string | null = null;
    if (folderId !== null) {
      const folder = await ctx.db.get(folderId);
      if (!folder) throw new Error("Dossier introuvable");
      personaId = folder.personaId;
    }
    let moved = 0;
    for (const id of carouselIds) {
      const c = await ctx.db.get(id);
      if (!c) continue;
      if (personaId !== null && c.personaId !== personaId) {
        throw new Error("Tous les carrousels doivent appartenir au même persona que le dossier");
      }
      await ctx.db.patch(id, {
        folderId: folderId === null ? undefined : folderId,
      });
      moved++;
    }
    return { moved };
  },
});
