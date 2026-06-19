import { ConvexError } from "convex/values";
import { query, internalMutation } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { requireUser, getCurrentUser } from "./users";

// Default rolling cap when a user has no explicit `quota` set.
export const DEFAULT_QUOTA = 300;
// Rolling window length: 30 days (sliding, no calendar reset).
const WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

// Sum of generations recorded for a user within the last 30 days. Reads only
// the window via the by_user_time index.
async function usageInWindow(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  now: number,
): Promise<number> {
  const since = now - WINDOW_MS;
  const rows = await ctx.db
    .query("quotaUsage")
    .withIndex("by_user_time", (q) =>
      q.eq("userId", userId).gte("createdAt", since),
    )
    .collect();
  let used = 0;
  for (const r of rows) used += r.count;
  return used;
}

/**
 * Enforces and records the rolling-window generation quota for the CURRENT
 * user. Admins are unlimited (no-op). Throws a ConvexError with a clear,
 * client-visible message when the batch would exceed the cap — in which case
 * nothing is recorded (the whole mutation rolls back atomically). On success,
 * appends one immutable `quotaUsage` row of `count`.
 *
 * Call this at the START of every generation entry point, with `count` = the
 * number of Gemini generations in the batch, BEFORE inserting any rows.
 */
export async function enforceAndRecordQuota(
  ctx: MutationCtx,
  { count }: { count: number },
): Promise<void> {
  const user = await requireUser(ctx);
  if (user.role === "admin") return; // unlimited

  const now = Date.now();
  const used = await usageInWindow(ctx, user._id, now);
  const quota = user.quota ?? DEFAULT_QUOTA;

  if (used + count > quota) {
    const remaining = Math.max(0, quota - used);
    throw new ConvexError(
      `Quota atteint : il te reste ${remaining} génération(s) sur les 30 derniers jours.`,
    );
  }

  await ctx.db.insert("quotaUsage", { userId: user._id, count, createdAt: now });
}

/**
 * Current user's rolling-window usage. Returns null if there's no user row yet
 * (first-login race). Admins are reported as unlimited.
 */
export const myUsage = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;
    if (user.role === "admin") {
      return { used: 0, quota: 0, remaining: 0, unlimited: true as const };
    }
    const used = await usageInWindow(ctx, user._id, Date.now());
    const quota = user.quota ?? DEFAULT_QUOTA;
    return {
      used,
      quota,
      remaining: Math.max(0, quota - used),
      unlimited: false as const,
    };
  },
});

// Hygiene: rows older than 35 days can never affect the 30-day calculation.
// Purged daily by a cron. Kept slightly longer than the window as a margin.
const PURGE_AFTER_MS = 35 * 24 * 60 * 60 * 1000;

export const purgeOldQuotaUsage = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - PURGE_AFTER_MS;
    const old = await ctx.db
      .query("quotaUsage")
      .filter((q) => q.lt(q.field("createdAt"), cutoff))
      .collect();
    for (const row of old) await ctx.db.delete(row._id);
    return { purged: old.length };
  },
});
