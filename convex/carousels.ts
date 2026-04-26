import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const listByPersona = query({
  args: { personaId: v.id("personas") },
  handler: async (ctx, { personaId }) => {
    const carousels = await ctx.db
      .query("carousels")
      .withIndex("by_persona", (q) => q.eq("personaId", personaId))
      .collect();
    const sorted = carousels.sort((a, b) => b.createdAt - a.createdAt);
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
              type: img.type,
              imageUrl: url,
              deleted: img.status === "deleted",
            };
          }),
        );
        return { ...c, images: images.filter((i) => i !== null) };
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
          type: img.type,
          imageUrl: url,
          deleted: img.status === "deleted",
        };
      }),
    );
    return { ...c, images: images.filter((i) => i !== null) };
  },
});

export const create = mutation({
  args: {
    personaId: v.id("personas"),
    imageIds: v.array(v.id("images")),
  },
  handler: async (ctx, { personaId, imageIds }) => {
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
