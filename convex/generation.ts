"use node";

import { v } from "convex/values";
import { GoogleGenAI } from "@google/genai";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";

type SlideResult =
  | { success: true; imageStorageId: string }
  | { success: false; error: string };

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

      const composedPrompt = `The attached image is the exact face and identity of the subject. Reproduce her/his face faithfully. Key identifying features to preserve exactly: ${persona.faceBlock}

${slide.visualPrompt}`;

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

      const response = await ai.models.generateContent({
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
      });

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
