"use node";

import { action } from "./_generated/server";
import { internal } from "./_generated/api";

type Failure = { imageId: string; error: string };

type ReprocessResult = {
  total: number;
  success: number;
  failed: number;
  skipped: number;
  failures: Failure[];
};

/**
 * One-shot batch: re-runs `/api/postprocess` against every existing image
 * that has an `imageStorageId` and is not deleted/failed/generating. Used
 * to backfill images that were generated before the C2PA-stripping fix.
 *
 * Failures on individual images don't abort the batch — they're collected
 * and the first 20 returned for visibility.
 */
export const reprocessAllExisting = action({
  args: {},
  handler: async (ctx): Promise<ReprocessResult> => {
    const SITE_URL = process.env.SITE_URL;
    if (!SITE_URL) {
      throw new Error(
        "SITE_URL env var must be set on the Convex deployment to run this batch",
      );
    }

    const images = await ctx.runQuery(internal.images.listForReprocess, {});

    let success = 0;
    let failed = 0;
    const failures: Failure[] = [];

    for (const image of images) {
      try {
        const response = await fetch(`${SITE_URL}/api/postprocess`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageId: image._id }),
        });
        if (!response.ok) {
          const errorText = await response.text();
          failures.push({
            imageId: image._id,
            error: `HTTP ${response.status}: ${errorText.slice(0, 200)}`,
          });
          failed++;
          continue;
        }
        success++;
      } catch (err) {
        failures.push({
          imageId: image._id,
          error: String(err).slice(0, 200),
        });
        failed++;
      }
    }

    return {
      total: images.length,
      success,
      failed,
      skipped: 0,
      failures: failures.slice(0, 20),
    };
  },
});
