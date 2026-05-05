import { internalMutation } from "./_generated/server";

/**
 * One-shot migration: add explicit `kind: "image"` to every entry in every
 * carousel row that predates the scenes feature. Idempotent — entries that
 * already have `kind` are skipped.
 *
 * Run via:
 *   pnpm exec convex run migrationsCarousels:backfillCarouselsKindImage
 *   pnpm exec convex run --prod migrationsCarousels:backfillCarouselsKindImage
 *
 * After this runs on every deployment, a future schema PR may make `kind`
 * required (currently optional for backwards compat).
 */
export const backfillCarouselsKindImage = internalMutation({
  args: {},
  handler: async (ctx) => {
    const allCarousels = await ctx.db.query("carousels").collect();
    let totalCarousels = allCarousels.length;
    let patched = 0;
    let alreadyMigrated = 0;
    let entriesPatched = 0;
    let entriesPreserved = 0;

    for (const carousel of allCarousels) {
      let touched = false;
      const newImages = carousel.images.map((item) => {
        if (item.kind) {
          entriesPreserved++;
          return item;
        }
        touched = true;
        entriesPatched++;
        return { ...item, kind: "image" as const };
      });

      if (!touched) {
        alreadyMigrated++;
        continue;
      }

      await ctx.db.patch(carousel._id, { images: newImages });
      patched++;
    }

    return {
      totalCarousels,
      patched,
      alreadyMigrated,
      entriesPatched,
      entriesPreserved,
    };
  },
});
