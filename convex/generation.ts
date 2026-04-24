"use node";

import { v } from "convex/values";
import { GoogleGenAI } from "@google/genai";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";

type SlideResult =
  | { success: true; imageStorageId: string }
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

function isTransientError(err: unknown): boolean {
  const message = formatError(err).toLowerCase();
  // Semantic / policy → never retry
  if (
    message.includes("safety") ||
    message.includes("blocked") ||
    message.includes("policy")
  ) {
    return false;
  }
  // Network / server overload → retry
  if (message.includes("fetch failed")) return true;
  if (message.includes("unavailable")) return true;
  if (message.includes("high demand")) return true;
  if (message.includes("resource_exhausted")) return true;
  if (message.includes("deadline_exceeded")) return true;
  if (message.includes("timeout")) return true;
  if (typeof err === "object" && err !== null && "status" in err) {
    const status = (err as { status: unknown }).status;
    if (status === 502 || status === 503 || status === 504) return true;
  }
  return false;
}

async function callWithRetry<T>(
  fn: () => Promise<T>,
  context: string,
  budgetMs?: number,
): Promise<T> {
  const MAX_ATTEMPTS = 3;
  const BACKOFF_MS = [0, 5_000, 30_000];
  const ESTIMATED_CALL_MS = 250_000;

  const startedAt = Date.now();
  const deadline =
    budgetMs !== undefined ? startedAt + budgetMs : undefined;

  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (deadline !== undefined && attempt > 0) {
      const projectedEnd =
        Date.now() + BACKOFF_MS[attempt] + ESTIMATED_CALL_MS;
      if (projectedEnd > deadline) {
        const remaining = deadline - Date.now();
        const needed = BACKOFF_MS[attempt] + ESTIMATED_CALL_MS;
        console.log(
          `[generateSlide] ${context}: skipping retry ${attempt}/${MAX_ATTEMPTS - 1}, would exceed budget (${remaining}ms remaining, need ${needed}ms)`,
        );
        throw lastError;
      }
    }
    if (BACKOFF_MS[attempt] > 0) {
      console.log(
        `[generateSlide] ${context}: retry ${attempt}/${MAX_ATTEMPTS - 1} after transient error, waiting ${BACKOFF_MS[attempt] / 1000}s`,
      );
      await new Promise((resolve) =>
        setTimeout(resolve, BACKOFF_MS[attempt]),
      );
    }
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (!isTransientError(err)) {
        throw err;
      }
      console.log(
        `[generateSlide] ${context}: attempt ${attempt + 1}/${MAX_ATTEMPTS} failed with transient error: ${formatError(err)}`,
      );
    }
  }
  throw lastError;
}

export const generateSlide = action({
  args: {
    generationId: v.id("generations"),
    slot: v.number(),
  },
  handler: async (ctx, args): Promise<SlideResult> => {
    const markFailed = async (msg: string): Promise<SlideResult> => {
      try {
        await ctx.runMutation(internal.generations.updateSlideStatusInternal, {
          generationId: args.generationId,
          slot: args.slot,
          status: "failed",
          errorMessage: msg.substring(0, 200),
        });
      } catch {
        // swallow — mutation failed too, give up
      }
      return { success: false, error: msg };
    };

    try {
      const gen = await ctx.runQuery(internal.generations.getInternal, {
        id: args.generationId,
      });
      if (!gen) return { success: false, error: "Generation not found" };

      const script = await ctx.runQuery(internal.scripts.getInternal, {
        id: gen.scriptId,
      });
      if (!script) return await markFailed("Script not found");

      const slide = script.slides.find((s) => s.slot === args.slot);
      if (!slide)
        return await markFailed(`Slide slot ${args.slot} not found in script`);

      const persona = await ctx.runQuery(internal.personas.getInternal, {
        id: gen.personaId,
      });
      if (!persona) return await markFailed("Persona not found");
      if (!persona.photoStorageId)
        return await markFailed(
          "Persona has no photo — character lock impossible",
        );

      await ctx.runMutation(internal.generations.updateSlideStatusInternal, {
        generationId: args.generationId,
        slot: args.slot,
        status: "generating",
      });

      const outfitSection = `The subject wears the following outfit, preserved exactly across all 6 slides of this carrousel:\n${script.outfitBrief}\n\n`;

      const locationSection = `The scene of this carrousel takes place in the following location and atmosphere, consistent across all 6 slides:\n${script.locationBrief}\n\n`;

      const composedPrompt = `The attached image is the exact face and identity of the subject. Reproduce her/his face faithfully. Key identifying features to preserve exactly:
${persona.faceBlock}

${outfitSection}${locationSection}${slide.visualPrompt}

CRITICAL RENDERING DIRECTIVES — apply strongly and non-negotiably:
- Natural skin texture with clearly visible pores, fine skin imperfections, and subtle facial asymmetries
- The face must look like a real human photographed on an iPhone, NOT like an AI-generated face
- Visible digital grain throughout the image, iPhone night mode aesthetic
- Image is not perfectly sharp — slight softness consistent with handheld low-light capture
- No digital smoothing, no beauty retouching, no cinematic perfection
- Mixed warm light sources with realistic color temperature variation (sodium yellow, neon accents, indoor tungsten)
- Candid photo feel — as if a friend took this on their phone, not a professional shoot
- The subject is integrated into the environment, not pasted onto a background: her skin tone, the colors of her clothing, and her shadows all reflect the actual ambient light of the location described above. Her feet (or bottom of her outerwear) connect to the ground with coherent contact shadows and reflections.
- Lighting continuity is non-negotiable: the direction, color temperature, and intensity of the light on the subject match the ambient light of the scene. If the scene is overcast, the light on her face is soft and shadowless; if golden hour, warm side light is present on one side; if neon night, colored fills are visible on her skin and hair.
- The image has the subtle imperfections of a real iPhone photo: natural film-like grain (more pronounced in the shadows), mild chromatic aberration on high-contrast edges, very slight motion blur on moving subjects (feet mid-stride, hands mid-gesture), and a natural depth of field consistent with the iPhone's sensor, not a professional studio lens. The image must look like a candid snapshot, never like a product shoot or a rendered composite.
- Ban: "studio lighting", "professional photography", "clean cutout", "isolated subject", "perfectly even lighting on face", "ring light", "beauty dish", "uniform background".`;

      const photoBlob = await ctx.storage.get(persona.photoStorageId);
      if (!photoBlob)
        return await markFailed(
          "Could not fetch persona photo from storage",
        );

      const photoArrayBuffer = await photoBlob.arrayBuffer();
      const photoBase64 = Buffer.from(photoArrayBuffer).toString("base64");

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey)
        return await markFailed("GEMINI_API_KEY env var not set in Convex");

      const ai = new GoogleGenAI({ apiKey });

      const ACTION_BUDGET_MS = 540_000;
      const response = await callWithRetry(
        () =>
          ai.models.generateContent({
            model: "gemini-3.1-flash-image-preview",
            contents: [
              {
                inlineData: {
                  mimeType: "image/jpeg",
                  data: photoBase64,
                },
              },
              { text: composedPrompt },
            ],
            config: {
              imageConfig: { aspectRatio: "9:16" },
            },
          }),
        `slot ${args.slot}`,
        ACTION_BUDGET_MS,
      );

      const parts = response.candidates?.[0]?.content?.parts;
      if (!parts || parts.length === 0)
        return await markFailed("Gemini returned no content parts");

      const imagePart = parts.find((p) => p.inlineData);
      if (!imagePart?.inlineData) {
        const textPart = parts.find((p) => p.text);
        const refusal =
          textPart?.text ?? "No image in response (possibly safety filter)";
        return await markFailed(`Gemini did not return an image: ${refusal}`);
      }

      const generatedBase64 = imagePart.inlineData.data;
      const generatedMime = imagePart.inlineData.mimeType ?? "image/png";
      if (!generatedBase64)
        return await markFailed("Gemini returned empty image data");

      const imageBuffer = Buffer.from(generatedBase64, "base64");
      const imageBlob = new Blob([new Uint8Array(imageBuffer)], {
        type: generatedMime,
      });
      const imageStorageId = await ctx.storage.store(imageBlob);

      await ctx.runMutation(internal.generations.updateSlideStatusInternal, {
        generationId: args.generationId,
        slot: args.slot,
        status: "completed",
        imageStorageId,
        generatedAt: Date.now(),
      });

      return { success: true, imageStorageId };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return await markFailed(`Unexpected error: ${message}`);
    }
  },
});
