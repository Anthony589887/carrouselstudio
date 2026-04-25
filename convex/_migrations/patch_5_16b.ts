/**
 * Patch 5.16b — Overwrite F02-SELFIE-001 visualPrompt (test fix double phone + AI quality)
 *
 * Empirical test patch following the first F02 generation. The initial
 * F02-SELFIE-001 image showed two issues:
 *   1. "Double phone" bug — Gemini interpreted "front camera capturing her"
 *      as a separate device from "the phone she holds", resulting in
 *      F1 holding one phone (selfie) plus a second phone-like object in
 *      her left hand.
 *   2. "Too AI" quality — image too clean, skin too smooth, no grain
 *      texture nor sensor noise characteristic of real iPhone photos.
 *
 * Reformulation strategy:
 *   - REMOVED "front camera capturing her" phrase (suspected cause of #1)
 *   - ADDED explicit "iPhone above her face with her right hand"
 *     (single device, single hand, action explicit)
 *   - ADDED "Her left arm rests casually on the duvet, hand visible, empty"
 *     (anchor for the other hand to prevent Gemini inventing objects)
 *   - ADDED "the phone is partially visible at the very top edge of the
 *     frame, only the bottom corner of the device showing" (precise position)
 *   - ADDED final sentence about iPhone front camera quality:
 *     overexposure, visible skin texture, sensor noise (target #2)
 *
 * If this reformulation works empirically (single phone visible, less AI
 * polish), we will apply the same phrasing pattern to the remaining 19 B1
 * prompts in a subsequent patch.
 *
 * Idempotence: option A — always overwrite. Each run writes the prompt
 * defined in this file. Re-running this migration is safe and idempotent
 * (same input → same DB state).
 *
 * Mechanism: ctx.db.patch on script's slides array (not full document
 * replace — preserves _id, code, name, formatId, etc.)
 *
 * Companion: no code fix, no UI change. Pure data overwrite.
 */

import { internalMutation } from "../_generated/server";
import { Id } from "../_generated/dataModel";

const F02_SELFIE_001_ID = "jh79e22emkhtxhnhsh94h342r985gpbs" as Id<"scripts">;

const NEW_VISUAL_PROMPT = `She is in her bed in the early morning, the duvet pulled up to her chest, her hair messy from sleep with a few strands falling across her forehead. She holds her iPhone above her face with her right hand, arm extended, taking a selfie of herself — the phone is partially visible at the very top edge of the frame, only the bottom corner of the device showing. Her left arm rests casually on the duvet beside her, hand visible and empty, fingers relaxed. She wears an old soft cotton t-shirt in a faded grey, the collar slightly stretched. Her face is bare, slightly puffy from sleep, with a small natural smile — the kind of smile of someone who just opened her eyes and decided to take a photo for no reason. Behind her head, a white pillow with a faint crease pattern, and behind that, a soft beige bedsheet. The morning light comes in from a window to the right, off-frame, casting a warm diffuse glow across her left cheek and forehead, with a softer cooler shadow on the right side of her face. The light is undeniably morning — that specific quality of low sun coming through curtains. The image has the natural slightly-overexposed quality of a phone front camera, with visible skin texture including subtle pores and small natural imperfections, and faint sensor noise in the shadow areas of the bedsheet — it looks like a real iPhone selfie taken first thing in the morning, not a professional photograph.`;

export const run = internalMutation({
  args: {},
  handler: async (ctx) => {
    const log: string[] = [];
    const push = (line: string) => {
      console.log(line);
      log.push(line);
    };

    push("=== patch 5.16b — Overwrite F02-SELFIE-001 visualPrompt ===");

    // --- Pre-flight audit ---
    push("--- Pre-flight audit ---");

    const script = await ctx.db.get(F02_SELFIE_001_ID);
    if (!script) {
      throw new Error(
        `Pre-flight failed: script F02-SELFIE-001 (id ${F02_SELFIE_001_ID}) not found in DB`,
      );
    }

    if (script.code !== "F02-SELFIE-001") {
      throw new Error(
        `Pre-flight failed: script at id ${F02_SELFIE_001_ID} has code "${script.code}", expected "F02-SELFIE-001"`,
      );
    }

    if (script.slides.length !== 1) {
      throw new Error(
        `Pre-flight failed: script F02-SELFIE-001 has ${script.slides.length} slides, expected 1 (mono-slide F02 format)`,
      );
    }

    if (script.slides[0].slot !== 1) {
      throw new Error(
        `Pre-flight failed: script F02-SELFIE-001 slide[0].slot is ${script.slides[0].slot}, expected 1`,
      );
    }

    push(
      `F02-SELFIE-001 OK: code="${script.code}", slides.length=${script.slides.length}, slot=${script.slides[0].slot}`,
    );

    // --- Capture old prompt for log diff ---
    const oldPrompt = script.slides[0].visualPrompt;
    push(`Old visualPrompt length: ${oldPrompt.length} chars`);
    push(`New visualPrompt length: ${NEW_VISUAL_PROMPT.length} chars`);

    // --- Patch slides[0].visualPrompt ---
    const updatedSlide = {
      ...script.slides[0],
      visualPrompt: NEW_VISUAL_PROMPT,
    };

    const now = Date.now();
    await ctx.db.patch(F02_SELFIE_001_ID, {
      slides: [updatedSlide],
      updatedAt: now,
    });

    push(`PATCH F02-SELFIE-001 visualPrompt updated`);

    // --- Verification ---
    const verified = await ctx.db.get(F02_SELFIE_001_ID);
    if (!verified || verified.slides[0].visualPrompt !== NEW_VISUAL_PROMPT) {
      throw new Error(
        `Verification failed: post-patch visualPrompt does not match expected`,
      );
    }
    push(`Verification OK: DB visualPrompt matches expected`);

    push("=== patch 5.16b done ===");

    return {
      log,
      scriptId: F02_SELFIE_001_ID,
      oldPromptLength: oldPrompt.length,
      newPromptLength: NEW_VISUAL_PROMPT.length,
      patched: true,
    };
  },
});
