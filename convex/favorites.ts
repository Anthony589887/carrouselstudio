import { v } from "convex/values";
import { query } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { getCurrentUser } from "./users";

// Resolves a user's favorites (images + scenes) that have a real, ready blob.
// Scoped strictly to `userId` via the by_owner indexes.
async function collectFavorites(ctx: QueryCtx, userId: Id<"users">) {
  const images = await ctx.db
    .query("images")
    .withIndex("by_owner", (q) => q.eq("ownerId", userId))
    .collect();
  const favImages = images.filter(
    (i) =>
      i.favorite &&
      i.imageStorageId &&
      i.status !== "failed" &&
      i.status !== "generating",
  );
  const scenes = await ctx.db
    .query("scenes")
    .withIndex("by_owner", (q) => q.eq("ownerId", userId))
    .collect();
  const favScenes = scenes.filter(
    (s) => s.favorite && s.imageStorageId && s.status === "available",
  );
  return { favImages, favScenes };
}

/** Current user's favorite count (images + scenes). Powers the dashboard. */
export const summary = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return { count: 0 };
    const { favImages, favScenes } = await collectFavorites(ctx, user._id);
    return { count: favImages.length + favScenes.length };
  },
});

/**
 * Favorites (with resolved storage URLs) for the favorites-pack download route.
 * Takes a server-verified `clerkUserId` (the route holds an `auth().userId` but
 * no Convex session). Scoped to that user's own favorites — an admin gets their
 * own. clerkUserId must come from a VERIFIED Clerk session, never a body.
 */
export const listForClerkUser = query({
  args: { clerkUserId: v.string() },
  handler: async (ctx, { clerkUserId }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkUserId", clerkUserId))
      .unique();
    if (!user) return { images: [], scenes: [] };
    const { favImages, favScenes } = await collectFavorites(ctx, user._id);
    const images = await Promise.all(
      favImages.map(async (i) => ({
        id: i._id,
        url: await ctx.storage.getUrl(i.imageStorageId!),
      })),
    );
    const scenes = await Promise.all(
      favScenes.map(async (s) => ({
        id: s._id,
        url: await ctx.storage.getUrl(s.imageStorageId!),
      })),
    );
    return { images, scenes };
  },
});
