"use node";

import { v } from "convex/values";
import { GoogleGenAI } from "@google/genai";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { geminiAspectRatio } from "./imagePrompts";

// Helpers duplicated from imageGeneration.ts. Keeping them inlined avoids
// a cross-file import in a "use node" module — the duplication is small and
// scoped to error classification + retry logic.

function formatError(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

function isTransient(err: unknown): boolean {
  const m = formatError(err).toLowerCase();
  if (m.includes("safety") || m.includes("blocked") || m.includes("policy"))
    return false;
  return (
    m.includes("fetch failed") ||
    m.includes("unavailable") ||
    m.includes("high demand") ||
    m.includes("resource_exhausted") ||
    m.includes("deadline_exceeded") ||
    m.includes("timeout")
  );
}

async function callWithRetry<T>(fn: () => Promise<T>): Promise<T> {
  const BACKOFF = [0, 5_000, 30_000];
  let lastErr: unknown;
  for (let i = 0; i < BACKOFF.length; i++) {
    if (BACKOFF[i] > 0) await new Promise((r) => setTimeout(r, BACKOFF[i]));
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (!isTransient(e)) throw e;
    }
  }
  throw lastErr;
}

/**
 * Runs ONE scene generation against an existing placeholder scene row.
 * Mirror of `runGeneration` for images, but text-to-image only — there is
 * no reference photo since scenes have no persona. Updates the row to
 * `available` or `failed`.
 */
export const runSceneGeneration = internalAction({
  args: { sceneRowId: v.id("scenes") },
  handler: async (ctx, { sceneRowId }) => {
    const scene = await ctx.runQuery(internal.scenes.getInternal, {
      id: sceneRowId,
    });
    if (!scene) return;
    if (scene.status !== "generating") return;

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("GEMINI_API_KEY not set in Convex env");

      const aspect = scene.aspectRatio;
      const ai = new GoogleGenAI({ apiKey });
      const response = await callWithRetry(() =>
        ai.models.generateContent({
          model: "gemini-3.1-flash-image-preview",
          // Text-only — no inlineData. The strict no-person preamble is
          // already baked into `scene.promptUsed` by composeScenePrompt.
          contents: [{ text: scene.promptUsed }],
          config: { imageConfig: { aspectRatio: geminiAspectRatio(aspect) } },
        }),
      );

      const parts = response.candidates?.[0]?.content?.parts;
      if (!parts || parts.length === 0)
        throw new Error("Gemini returned no content parts");
      const imagePart = parts.find((p) => p.inlineData);
      if (!imagePart?.inlineData?.data) {
        const refusal =
          parts.find((p) => p.text)?.text ?? "No image (safety filter?)";
        throw new Error(`No image returned: ${refusal}`);
      }

      const rawBuffer = Buffer.from(imagePart.inlineData.data, "base64");
      const mime = imagePart.inlineData.mimeType ?? "image/png";
      const blob = new Blob([new Uint8Array(rawBuffer)], { type: mime });
      const storageId = await ctx.storage.store(blob);

      await ctx.runMutation(internal.scenes.markCompleted, {
        id: sceneRowId,
        imageStorageId: storageId,
      });

      // Best-effort post-process (Sharp anti-watermark) via Next API. Same
      // pipeline as images, dispatched on `kind: "scene"`.
      const baseUrl = process.env.SITE_URL;
      if (baseUrl) {
        try {
          await fetch(`${baseUrl}/api/postprocess`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-postprocess-secret": process.env.POSTPROCESS_SECRET ?? "",
            },
            body: JSON.stringify({ kind: "scene", sceneId: sceneRowId }),
          });
        } catch (e) {
          console.warn(
            `[runSceneGeneration] post-process call failed: ${formatError(e)}`,
          );
        }
      }
    } catch (e) {
      const msg = formatError(e);
      console.error(
        `[runSceneGeneration] scene ${sceneRowId} failed: ${msg}`,
      );
      await ctx.runMutation(internal.scenes.markFailed, {
        id: sceneRowId,
        errorMessage: msg,
      });
    }
  },
});
