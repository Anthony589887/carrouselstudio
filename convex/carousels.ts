import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

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
        const images = await Promise.all(
          orderedImages.map(async (item) => {
            const img = await ctx.db.get(item.imageId);
            if (!img) return null;
            const url = img.imageStorageId
              ? await ctx.storage.getUrl(img.imageStorageId)
              : null;
            return {
              imageId: item.imageId,
              order: item.order,
              label: img.situationId ?? img.legacyType ?? null,
              imageUrl: url,
              deleted: img.status === "deleted",
            };
          }),
        );
        return {
          ...c,
          images: images.filter((i) => i !== null),
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
    const images = await Promise.all(
      orderedImages.map(async (item) => {
        const img = await ctx.db.get(item.imageId);
        if (!img) return null;
        const url = img.imageStorageId
          ? await ctx.storage.getUrl(img.imageStorageId)
          : null;
        return {
          imageId: item.imageId,
          order: item.order,
          label: img.situationId ?? img.legacyType ?? null,
          imageUrl: url,
          deleted: img.status === "deleted",
        };
      }),
    );
    return {
      ...c,
      images: images.filter((i) => i !== null),
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

    const images = imageIds.map((imageId, idx) => ({
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
    // Free the images back to available (only if still "used")
    for (const item of c.images) {
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
