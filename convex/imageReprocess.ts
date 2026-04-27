"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";

type Failure = { imageId: string; error: string };

type ReprocessChunkResult = {
  processed: number;
  success: number;
  failed: number;
  failures: Failure[];
  offset: number;
  limit: number;
  totalImages: number;
  hasMore: boolean;
  nextOffset: number | null;
};

/**
 * Paginated batch: re-runs `/api/postprocess` against a slice of every existing
 * image that has an `imageStorageId` and is not deleted/failed/generating.
 * The full listing is computed server-side, then sliced [offset, offset+limit).
 *
 * Pagination shifted to the client because a single Convex action has a hard
 * runtime cap (~10 min). At ~2-3s per image, 354 images took longer than the
 * cap and timed out. Frontend now loops until `hasMore: false`.
 *
 * `siteUrl` arg is preferred (the client passes `window.location.origin`) so
 * the action is self-contained. Falls back to `process.env.SITE_URL` for CLI.
 *
 * Per-image failures don't abort — collected and the first 5 of the chunk are
 * returned for visibility.
 */
export const reprocessAllExisting = action({
  args: {
    siteUrl: v.optional(v.string()),
    offset: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (
    ctx,
    { siteUrl, offset = 0, limit = 50 },
  ): Promise<ReprocessChunkResult> => {
    const SITE_URL = (siteUrl ?? process.env.SITE_URL ?? "").trim();
    console.log(
      `[reprocessAllExisting] resolved SITE_URL="${SITE_URL}" (from ${siteUrl ? "arg" : "env"}) offset=${offset} limit=${limit}`,
    );
    if (!SITE_URL) {
      throw new Error(
        "siteUrl arg or SITE_URL env var must be provided to run this batch",
      );
    }

    const allImages = await ctx.runQuery(internal.images.listForReprocess, {});
    const totalImages = allImages.length;
    const chunk = allImages.slice(offset, offset + limit);

    let success = 0;
    let failed = 0;
    const failures: Failure[] = [];

    for (const image of chunk) {
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

    const nextOffset = offset + limit < totalImages ? offset + limit : null;
    return {
      processed: chunk.length,
      success,
      failed,
      failures: failures.slice(0, 5),
      offset,
      limit,
      totalImages,
      hasMore: nextOffset !== null,
      nextOffset,
    };
  },
});
