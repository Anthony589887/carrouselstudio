"use node";

import { v } from "convex/values";
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
 *
 * `siteUrl` arg is preferred (passed from the client as `window.location.origin`)
 * so the action is self-contained and doesn't rely on a Convex env var being
 * present. Falls back to `process.env.SITE_URL` for CLI invocations.
 */
export const reprocessAllExisting = action({
  args: {
    siteUrl: v.optional(v.string()),
  },
  handler: async (ctx, { siteUrl }): Promise<ReprocessResult> => {
    const SITE_URL = (siteUrl ?? process.env.SITE_URL ?? "").trim();
    console.log(
      `[reprocessAllExisting] resolved SITE_URL="${SITE_URL}" (from ${siteUrl ? "arg" : "env"})`,
    );
    if (!SITE_URL) {
      throw new Error(
        "siteUrl arg or SITE_URL env var must be provided to run this batch",
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
