import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

/**
 * One-shot P2 migration: attach every pre-existing (unowned) doc across the 5
 * scoped tables to a single owner, identified by email. Idempotent — only docs
 * with an undefined `ownerId` are touched, so re-running is safe.
 *
 * Run from the Convex dashboard / CLI, e.g.:
 *   convex run migrations:backfillOwnership '{"ownerEmail":"me@example.com"}'
 *
 * The owner must already exist in the `users` table (i.e. they've signed in at
 * least once so `ensureUser` created their row).
 */
export const backfillOwnership = internalMutation({
  args: { ownerEmail: v.string() },
  handler: async (ctx, { ownerEmail }) => {
    const target = ownerEmail.trim().toLowerCase();
    if (!target) throw new Error("ownerEmail is required");

    const users = await ctx.db.query("users").collect();
    const owner = users.find((u) => u.email.toLowerCase() === target);
    if (!owner) {
      throw new Error(
        `user introuvable pour l'email "${ownerEmail}" — assure-toi que ce compte s'est connecté au moins une fois`,
      );
    }

    const tables = [
      "personas",
      "scenes",
      "images",
      "carousels",
      "folders",
    ] as const;

    const recap: Record<(typeof tables)[number], number> = {
      personas: 0,
      scenes: 0,
      images: 0,
      carousels: 0,
      folders: 0,
    };

    for (const table of tables) {
      const docs = await ctx.db.query(table).collect();
      for (const doc of docs) {
        if (doc.ownerId === undefined) {
          await ctx.db.patch(doc._id, { ownerId: owner._id });
          recap[table]++;
        }
      }
    }

    return recap;
  },
});
