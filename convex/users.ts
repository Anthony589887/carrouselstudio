import { v } from "convex/values";
import {
  mutation,
  query,
  type QueryCtx,
  type MutationCtx,
} from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";

// === Shared helpers (exported for P2/P3) ===================================
// These are NOT yet wired into the existing personas/images/carousels/scenes
// functions — that's P2 (per-creator data scoping). They exist now so the
// authorization seam is ready.

/**
 * Resolves the currently-authenticated Convex user, or null if there's no
 * valid identity or no matching `users` row yet. Read-only — safe in queries.
 */
export async function getCurrentUser(
  ctx: QueryCtx | MutationCtx,
): Promise<Doc<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  return await ctx.db
    .query("users")
    .withIndex("by_token", (q) =>
      q.eq("tokenIdentifier", identity.tokenIdentifier),
    )
    .unique();
}

/** Throws if there's no authenticated user row. Returns it otherwise. */
export async function requireUser(
  ctx: QueryCtx | MutationCtx,
): Promise<Doc<"users">> {
  const user = await getCurrentUser(ctx);
  if (!user) throw new Error("Not authenticated");
  return user;
}

/** Throws unless the authenticated user has the "admin" role. */
export async function requireAdmin(
  ctx: QueryCtx | MutationCtx,
): Promise<Doc<"users">> {
  const user = await requireUser(ctx);
  if (user.role !== "admin") throw new Error("Admin access required");
  return user;
}

/**
 * Authorizes a write/read against a single owned doc. Returns the current
 * user if they are an admin OR the doc's owner; throws otherwise. Note that
 * a doc with an undefined `ownerId` (not-yet-migrated legacy row) is only
 * accessible to admins — creators cannot touch unowned data.
 *
 * This is the workhorse for P2 authorization (mutations + single-doc reads).
 */
export async function requireOwnerOrAdmin(
  ctx: QueryCtx | MutationCtx,
  doc: { ownerId?: Id<"users"> },
): Promise<Doc<"users">> {
  const user = await requireUser(ctx);
  if (user.role !== "admin" && doc.ownerId !== user._id) {
    throw new Error("Forbidden: not the owner");
  }
  return user;
}

/**
 * Read-side scoping decision for list queries. Returns the current user and
 * whether they're an admin, or null when there's no authenticated user yet
 * (e.g. the race between first login and `ensureUser`). Callers should return
 * an empty list when this is null — never throw.
 */
export async function getViewer(
  ctx: QueryCtx | MutationCtx,
): Promise<{ user: Doc<"users">; isAdmin: boolean } | null> {
  const user = await getCurrentUser(ctx);
  if (!user) return null;
  return { user, isAdmin: user.role === "admin" };
}

// === Public functions =====================================================

/**
 * Idempotent upsert of the current Clerk identity into the `users` table,
 * keyed by `tokenIdentifier`. Called from the client (<EnsureUser/>) on every
 * sign-in.
 *
 * Role bootstrap happens ONLY at creation: if the email is in ADMIN_EMAILS
 * (comma-separated Convex env var), the new user is "admin", otherwise
 * "creator". An existing admin is never demoted on re-login — only the
 * email/name are refreshed.
 */
export const ensureUser = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const email = identity.email ?? "";
    const name = identity.name ?? undefined;

    const existing = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();

    if (existing) {
      // Refresh mutable profile fields, but never touch the role here.
      const patch: Partial<Doc<"users">> = {};
      if (email && email !== existing.email) patch.email = email;
      if (name !== existing.name) patch.name = name;
      if (Object.keys(patch).length > 0) {
        await ctx.db.patch(existing._id, patch);
      }
      return existing._id;
    }

    const adminEmails = (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.length > 0);
    const role: "admin" | "creator" =
      email && adminEmails.includes(email.toLowerCase()) ? "admin" : "creator";

    return await ctx.db.insert("users", {
      tokenIdentifier: identity.tokenIdentifier,
      clerkUserId: identity.subject,
      email,
      name,
      role,
      createdAt: Date.now(),
    });
  },
});

/** Returns the current authenticated user row, or null. */
export const current = query({
  args: {},
  handler: async (ctx) => getCurrentUser(ctx),
});

/**
 * Admin-only: list every "creator" user with lightweight counts (personas +
 * carousels they own, via the by_owner index). Powers the admin console and
 * the "view as creator" selector. Sorted newest-first.
 */
export const listCreators = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const all = await ctx.db.query("users").collect();
    const creators = all
      .filter((u) => u.role === "creator")
      .sort((a, b) => b.createdAt - a.createdAt);
    return await Promise.all(
      creators.map(async (c) => {
        const personas = await ctx.db
          .query("personas")
          .withIndex("by_owner", (q) => q.eq("ownerId", c._id))
          .collect();
        const carousels = await ctx.db
          .query("carousels")
          .withIndex("by_owner", (q) => q.eq("ownerId", c._id))
          .collect();
        return {
          _id: c._id,
          email: c.email,
          name: c.name,
          createdAt: c.createdAt,
          personaCount: personas.length,
          carouselCount: carousels.length,
        };
      }),
    );
  },
});

/**
 * Maps a (server-verified) Clerk user id to the admin flag. Used by Next
 * server routes / the /admin page guard which hold a verified `auth().userId`
 * but no Convex session. The clerkUserId must come from a VERIFIED Clerk
 * session, never from a request body.
 */
export const isClerkUserAdmin = query({
  args: { clerkUserId: v.string() },
  handler: async (ctx, { clerkUserId }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkUserId", clerkUserId))
      .unique();
    return !!user && user.role === "admin";
  },
});
