"use node";

import { v } from "convex/values";
import { GoogleGenAI } from "@google/genai";
import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { composePrompt } from "./imagePrompts";
import type { Id } from "./_generated/dataModel";

type GenerateResult =
  | { success: true; imageId: Id<"images"> }
  | { success: false; error: string };

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

export const generateOneInternal = internalAction({
  args: {
    personaId: v.id("personas"),
    type: v.string(),
    variationSeed: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<GenerateResult> => {
    try {
      const persona = await ctx.runQuery(internal.personas.getInternal, {
        id: args.personaId,
      });
      if (!persona) return { success: false, error: "Persona not found" };

      const photoBlob = await ctx.storage.get(persona.referenceImageStorageId);
      if (!photoBlob)
        return { success: false, error: "Reference image not in storage" };
      const photoBase64 = Buffer.from(await photoBlob.arrayBuffer()).toString(
        "base64",
      );

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) return { success: false, error: "GEMINI_API_KEY not set" };

      const prompt = composePrompt(
        persona.identityDescription,
        args.type,
        args.variationSeed,
      );

      const ai = new GoogleGenAI({ apiKey });
      const response = await callWithRetry(() =>
        ai.models.generateContent({
          model: "gemini-3.1-flash-image-preview",
          contents: [
            { inlineData: { mimeType: "image/jpeg", data: photoBase64 } },
            { text: prompt },
          ],
          config: { imageConfig: { aspectRatio: "4:5" } },
        }),
      );

      const parts = response.candidates?.[0]?.content?.parts;
      if (!parts || parts.length === 0)
        return { success: false, error: "Gemini returned no content parts" };
      const imagePart = parts.find((p) => p.inlineData);
      if (!imagePart?.inlineData?.data) {
        const refusal =
          parts.find((p) => p.text)?.text ?? "No image (safety filter?)";
        return { success: false, error: `No image returned: ${refusal}` };
      }

      const rawBuffer = Buffer.from(imagePart.inlineData.data, "base64");
      const mime = imagePart.inlineData.mimeType ?? "image/png";
      const blob = new Blob([new Uint8Array(rawBuffer)], { type: mime });
      const storageId = await ctx.storage.store(blob);

      const imageId: Id<"images"> = await ctx.runMutation(
        internal.images.insertGenerated,
        {
          personaId: args.personaId,
          type: args.type,
          imageStorageId: storageId,
          promptUsed: prompt,
        },
      );

      // Best-effort post-processing through the Next.js endpoint.
      const baseUrl = process.env.SITE_URL;
      if (baseUrl) {
        try {
          await fetch(`${baseUrl}/api/postprocess`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ imageId }),
          });
        } catch {
          // ignore
        }
      }

      return { success: true, imageId };
    } catch (e) {
      return { success: false, error: formatError(e) };
    }
  },
});

export const generateBatch = action({
  args: {
    personaId: v.id("personas"),
    requests: v.array(
      v.object({
        type: v.string(),
        count: v.number(),
      }),
    ),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{
    started: number;
    succeeded: number;
    failed: number;
    errors: string[];
  }> => {
    let started = 0;
    let succeeded = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const req of args.requests) {
      for (let i = 0; i < req.count; i++) {
        started++;
        const result: GenerateResult = await ctx.runAction(
          internal.imageGeneration.generateOneInternal,
          {
            personaId: args.personaId,
            type: req.type,
            variationSeed: Date.now() + i,
          },
        );
        if (result.success) succeeded++;
        else {
          failed++;
          errors.push(`${req.type}: ${result.error}`);
        }
      }
    }

    return { started, succeeded, failed, errors };
  },
});
