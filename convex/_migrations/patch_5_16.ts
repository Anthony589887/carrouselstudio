/**
 * Patch 5.16 — F02 mono-slide format + 3 selfie scripts seed
 *
 * Creates new format F02 (mono-slide, 1 slot) targeting selfie iPhone
 * front-cam style content, plus 3 seed scripts for empirical pipeline test.
 *
 * Strategy: validate empirically that the pipeline handles mono-slide format
 * correctly before committing to the full B1-B6 catalog (~125 photos).
 * Tests 3 radically different selfie contexts:
 *   - F02-SELFIE-001: Bedroom morning (just woke up, soft natural light)
 *   - F02-SELFIE-002: Gym sweaty (post-workout, harsh fluorescent light)
 *   - F02-SELFIE-003: Late night entryway (smudged makeup, warm artificial)
 *
 * Mechanism: direct ctx.db.insert (bypass scripts.create which auto-generates
 * codes). Slides hardcoded with the B1 visualPrompt directly (not snapshot
 * from format.slideTemplates which is just a generic placeholder).
 *
 * Idempotence: safe to re-run. Format and scripts checked by code, skipped
 * if exists. No overwrite.
 *
 * Companion code fixes in same patch:
 *   - convex/generations.ts: startGeneration now iterates script.slides
 *     instead of hardcoded [1..6] (BUG: F02 would have produced 1 success
 *     + 5 phantom fails before this fix)
 *   - convex/generation.ts: composer prompt "all 6 slides" → "all slides"
 *   - app/generer/page.tsx: empty-state "voir les 6 slides" → "voir les slides"
 *
 * Edge case to know: scripts.create autogen code is per-format counter.
 * F02 starts fresh at S001 (no collision risk with F01 codes).
 */

import { internalMutation } from "../_generated/server";
import { Id } from "../_generated/dataModel";

const F1_PERSONA_ID = "jd7dcx2f9q1q2wgr075vn1pexn85bwds" as Id<"personas">;

// --- Format F02 definition ---
const F02_DEFINITION = {
  code: "F02",
  name: "Selfie mono-slide",
  archetype: "Selfie real-life moment",
  defaultDA: "Selfie iPhone front-cam",
  description:
    "Single-slide format for selfie-style content captured front-camera. Used for life-moment photos that compose into Phase 1 carousel tests on TikTok burner. Pipeline mono-slide variant of F01 6-slide narrative format.",
  slideTemplates: [
    {
      slot: 1,
      role: "selfie",
      promptTemplate:
        "PLACEHOLDER — actual visualPrompt is set per-script in script.slides[0].visualPrompt for F02 (mono-slide format). Format slideTemplates serves as schema scaffold only.",
      notes: "Mono-slide placeholder. Real prompt comes from script.slides.",
    },
  ],
  isActive: true,
};

type SeedScript = {
  code: string;
  name: string;
  visualPrompt: string;
};

// --- Scripts F02 seed (3 prompts from Session B1 selfie-iphone) ---
const SEED_SCRIPTS: SeedScript[] = [
  {
    code: "F02-SELFIE-001",
    name: "Selfie iPhone bedroom morning — F1",
    visualPrompt: `She is in her bed in the early morning, the duvet pulled up to her chest, her hair messy from sleep with a few strands falling across her forehead. She holds her phone out at arm's length above her face, the front camera capturing her from a slight high angle. She wears an old soft cotton t-shirt in a faded grey, the collar slightly stretched. Her face is bare, slightly puffy from sleep, with a small natural smile — the kind of smile of someone who just opened her eyes and decided to take a photo for no reason. Behind her head, a white pillow with a faint crease pattern, and behind that, a soft beige bedsheet. The morning light comes in from a window to the right, off-frame, casting a warm diffuse glow across her left cheek and forehead, with a softer cooler shadow on the right side of her face. The light is undeniably morning — that specific quality of low sun coming through curtains. The phone is held casually, slightly tilted, not perfectly framed.`,
  },
  {
    code: "F02-SELFIE-002",
    name: "Selfie iPhone gym sweaty — F1",
    visualPrompt: `She holds her phone out at arm's length in front of a full-length gym mirror, but the camera is the front camera so the shot captures her face directly — not the mirror reflection. Her hair is pulled back into a tight high ponytail, with damp strands escaping at her temples. Her skin glistens slightly with sweat, her cheeks naturally flushed pink from exertion. She wears a black ribbed sports bra cropped at her sternum, no top layer. Behind her, the gym is visible in soft focus: black rubber flooring, a row of weight racks against a dark grey wall, the silhouettes of two other people working out further back. Bright overhead fluorescent gym lighting flattens her shadows but creates small specular highlights on her damp skin. Her expression is satisfied, slightly out of breath, a half-smile of post-workout endorphins. The phone is held confidently at face height, her arm extended.`,
  },
  {
    code: "F02-SELFIE-003",
    name: "Selfie iPhone late night smudged — F1",
    visualPrompt: `She holds her phone in her right hand close to her face, the front camera capturing her in a tight intimate frame. She is in a poorly lit hallway or entryway at night, the only light coming from a warm yellow overhead bulb above and slightly behind her, creating a soft halo around her hair and casting her face in shadow with golden rim light on the edges. Her makeup is smudged: her eyeliner has slightly smeared under her eyes, her lipstick is mostly worn off but a faint tint remains. Her hair is loose and slightly disheveled, like she's been out for hours. She wears a black satin slip dress with thin straps, the strap on her right shoulder slightly fallen. Her expression: a tired private smile, eyes half-lidded, content — the look of someone who just got home from a long good night out.`,
  },
];

export const run = internalMutation({
  args: {},
  handler: async (ctx) => {
    const log: string[] = [];
    const push = (line: string) => {
      console.log(line);
      log.push(line);
    };

    push("=== patch 5.16 — F02 mono-slide format + 3 selfie scripts seed ===");

    // --- Pre-flight audit ---
    push("--- Pre-flight audit ---");

    const f1 = await ctx.db.get(F1_PERSONA_ID);
    if (!f1) {
      throw new Error(
        `Pre-flight failed: F1 persona ${F1_PERSONA_ID} not found in DB`,
      );
    }
    push(`F1 persona OK: ${f1.code} (${f1.name})`);

    // --- Insert format F02 (idempotent) ---
    push("--- Format F02 ---");

    const existingF02 = await ctx.db
      .query("formats")
      .withIndex("by_code", (q) => q.eq("code", F02_DEFINITION.code))
      .unique();

    let f02Id: Id<"formats">;
    let formatCreated = false;

    if (existingF02) {
      f02Id = existingF02._id;
      push(`SKIP format F02 — already exists (id: ${f02Id})`);
    } else {
      const now = Date.now();
      f02Id = await ctx.db.insert("formats", {
        ...F02_DEFINITION,
        createdAt: now,
      });
      formatCreated = true;
      push(`INSERT format F02 — id: ${f02Id}`);
    }

    // --- Insert 3 seed scripts (idempotent) ---
    push("--- Scripts F02 seed ---");

    const scriptsCreated: Record<string, Id<"scripts">> = {};
    const scriptsSkipped: string[] = [];
    const now = Date.now();

    for (const seed of SEED_SCRIPTS) {
      const existing = await ctx.db
        .query("scripts")
        .withIndex("by_code", (q) => q.eq("code", seed.code))
        .unique();

      if (existing) {
        push(`SKIP ${seed.code} — already exists (id: ${existing._id})`);
        scriptsSkipped.push(seed.code);
        continue;
      }

      const insertedId = await ctx.db.insert("scripts", {
        code: seed.code,
        name: seed.name,
        formatId: f02Id,
        preferredPersonaId: F1_PERSONA_ID,
        outfitBrief:
          "Outfit details are integrated within the visualPrompt for F02 selfie format (each pose describes its own outfit contextually).",
        locationBrief:
          "Location details are integrated within the visualPrompt for F02 selfie format (each pose describes its own location contextually).",
        slides: [
          {
            slot: 1,
            role: "selfie",
            visualPrompt: seed.visualPrompt,
            overlayText: "Placeholder slide 1",
          },
        ],
        status: "draft" as const,
        notes: undefined,
        createdAt: now,
        updatedAt: now,
      });

      push(`INSERT ${seed.code} — id: ${insertedId}`);
      scriptsCreated[seed.code] = insertedId;
    }

    // --- Summary ---
    push("--- Summary ---");
    push(`Format F02: ${formatCreated ? "created" : "already existed"}`);
    push(`Scripts created: ${Object.keys(scriptsCreated).length}`);
    push(`Scripts skipped: ${scriptsSkipped.length}`);
    push("=== patch 5.16 done ===");

    return {
      log,
      f02Id,
      formatCreated,
      scriptsCreated,
      scriptsSkipped,
      f1PersonaId: F1_PERSONA_ID,
    };
  },
});
