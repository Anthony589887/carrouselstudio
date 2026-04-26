"use node";

import { v } from "convex/values";
import { GoogleGenAI } from "@google/genai";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { geminiAspectRatio } from "./imagePrompts";

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
 * Runs ONE generation against an existing placeholder image row.
 * Designed to be scheduled in parallel — N images = N independent action runs.
 * Updates the row to `available` (with storageId) or `failed` (with errorMessage).
 */
export const runGeneration = internalAction({
  args: { imageId: v.id("images") },
  handler: async (ctx, { imageId }) => {
    const img = await ctx.runQuery(internal.images.getInternal, { id: imageId });
    if (!img) return;
    if (img.status !== "generating") return;

    try {
      const persona = await ctx.runQuery(internal.personas.getInternal, {
        id: img.personaId,
      });
      if (!persona) throw new Error("Persona not found");

      const photoBlob = await ctx.storage.get(persona.referenceImageStorageId);
      if (!photoBlob) throw new Error("Reference image missing in storage");
      const photoBase64 = Buffer.from(await photoBlob.arrayBuffer()).toString(
        "base64",
      );

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("GEMINI_API_KEY not set in Convex env");

      const aspect = (img.aspectRatio ?? "4:5") as "4:5" | "9:16";
      const ai = new GoogleGenAI({ apiKey });
      const response = await callWithRetry(() =>
        ai.models.generateContent({
          model: "gemini-3.1-flash-image-preview",
          contents: [
            { inlineData: { mimeType: "image/jpeg", data: photoBase64 } },
            { text: img.promptUsed },
          ],
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

      await ctx.runMutation(internal.images.markCompleted, {
        id: imageId,
        imageStorageId: storageId,
      });

      // Best-effort post-process (Sharp crop + anti-watermark) via Next API.
      const baseUrl = process.env.SITE_URL;
      if (baseUrl) {
        try {
          await fetch(`${baseUrl}/api/postprocess`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ imageId }),
          });
        } catch (e) {
          console.warn(`[runGeneration] post-process call failed: ${formatError(e)}`);
        }
      }
    } catch (e) {
      const msg = formatError(e);
      console.error(`[runGeneration] image ${imageId} failed: ${msg}`);
      await ctx.runMutation(internal.images.markFailed, {
        id: imageId,
        errorMessage: msg,
      });
    }
  },
});
