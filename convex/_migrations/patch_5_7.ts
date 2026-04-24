import { internalMutation } from "../_generated/server";

// Patch 5.7 — replace F01 slideTemplates with AI-Studio-validated prompts.
// Also refreshes F01-S002.slides[].visualPrompt from the new templates,
// preserving outfitBrief / overlayText / role / name / status / notes.
//
// Run with: pnpm dlx convex run _migrations/patch_5_7:run
// NOT idempotent on script timestamps. Safe to re-run on F01 (overwrites identical content).

const SLOT_1_PROMPT = `Extreme close-up of her face. The frame begins at her mid-forehead and ends at the top of her collarbone, her face filling most of the frame but slightly offset to the right of center. She looks to her left, eyes aimed past the camera, not engaging with it. Lips relaxed and closed, chin neutral — the face of someone mid-thought, caught between two moments. One gold hoop earring visible on her left ear, catching a small point of light.

Shot on an iPhone 15 Pro held by someone standing close to her, less than 40 centimeters away. Ambient daylight from an overcast sky — soft and diffuse, no strong directional shadows. Background completely out of focus, showing only a vague suggestion of a busy street with blurred pedestrians and warm storefront glow, unreadable.

Photorealistic skin texture with visible pores, faint freckling across the cheeks, individual eyebrow hairs distinct, subtle redness around the nostrils and inner eye corners, the fine hair at the hairline slightly visible. Natural film-like grain across the whole image, slightly more pronounced in the shadows. Color grading slightly cool overall with warm highlights on the skin — the color signature of iPhone HDR in overcast ambient light. Raw editorial candid street style, the quality of a photo taken quickly between moments.`;

const SLOT_2_PROMPT = `First-person point-of-view shot looking straight down at her own feet on a New York City sidewalk. The bottom hem of the brown faux fur coat is visible at the very top of the frame, framing the shot like a curtain. Below it, her dark indigo jeans run down into the black leather ankle boots, planted on the concrete. The sidewalk fills the rest of the frame — cracked concrete with dark stains, a few cigarette butts, a storm drain or sidewalk tile seam partially visible. Ambient overcast daylight, no strong shadows. Her face is not visible in this shot.

Shot on an iPhone 15 Pro held at chest level by her, pointing straight down. Slight natural tilt of the frame, not perfectly aligned with the sidewalk grid. Photorealistic texture on the fabric of the coat, the denim, the leather of the boots. Fine sidewalk grain and debris visible. Color grading slightly cool overall — the color signature of iPhone HDR in overcast ambient light. Raw editorial candid street style, the quality of a photo taken quickly between moments.`;

const SLOT_3_PROMPT = `Wide full-body shot on a New York City sidewalk during daytime. She occupies roughly the lower-right third of the frame, walking toward the camera but with her body angled slightly — her left foot is mid-stride, clearly in front of her right foot, her right arm is slightly bent and lifted while her left arm hangs naturally, not symmetrical. She looks down at the ground a few meters ahead of her, not at the camera. The rest of the frame is dominated by the urban environment — a tall brick facade on the left with fire escapes running up vertically, a lamppost rising from the lower-left, and a receding perspective of the sidewalk with blurred pedestrians in the distance.

Shot on an iPhone 15 Pro from across the sidewalk, at hip height, slightly wide angle. Ambient overcast daylight, soft and diffuse. Photorealistic textures on the coat fabric, denim, and boots. Fine film-like grain across the image. Color grading slightly cool with warm highlights on the skin — the color signature of iPhone HDR in overcast ambient light. Raw editorial candid street style, the quality of a photo taken quickly between moments while walking behind her.`;

const SLOT_4_PROMPT = `Extreme close-up macro shot on the left side of her face — the frame is filled almost entirely by her ear, the gold hoop earring described in the outfit brief above, a section of her cheek down to the corner of her jaw, and strands of her dark chestnut brown hair falling past her temple and behind her ear. Her face is turned three-quarters away from the camera, showing the profile curve of her cheekbone and jawline. The gold hoop catches a small point of ambient light, highlighting its curved surface. Individual strands of hair are distinct, some catching the light, some in shadow.

Shot on an iPhone 15 Pro held very close to her head, less than 25 centimeters away. Ambient overcast daylight softly illuminating her ear and the side of her face. Background completely out of focus, showing only a vague suggestion of a busy street with blurred warm tones, unreadable.

Photorealistic skin texture with visible pores on the cheek, fine hair at the temple, subtle veining in the ear cartilage, tiny imperfections in the metal of the gold hoop. Natural film-like grain across the whole image. Color grading slightly cool with warm highlights on the skin — the color signature of iPhone HDR in overcast ambient light. Raw editorial candid street style, the quality of an accidentally intimate shot.`;

const SLOT_5_PROMPT = `PLACEHOLDER — slot 5 produit is handled manually in post-production. Do not generate via pipeline. This template is intentionally kept as a placeholder string to preserve the 6-slot structure of F01.`;

const SLOT_6_PROMPT = `Medium shot framed from just below her chin down to her hips. Her head is entirely cropped out of the frame at the top — only the bottom of her jawline and the left earring are faintly visible in the top-right corner. The focus is the layered outfit described in the outfit brief above: the textured cream ribbed turtleneck, the plush brown faux fur coat worn open with its collar slightly flipped up, the waistband of the dark indigo jeans at the bottom of the frame, and her hands — one resting at her side, the other slightly raised holding nothing in particular, caught mid-gesture.

She is standing on a New York City sidewalk, facing the camera at a slight three-quarter angle — weight on one leg, hips subtly offset, not perfectly squared. Background completely out of focus: suggestion of storefronts, warm glow, blurred pedestrians, unreadable.

Shot on an iPhone 15 Pro from about 1.5 meters away at chest height. Ambient overcast daylight, soft and diffuse. Photorealistic textures on the fur, the ribbed knit of the turtleneck, the denim, the skin of her hands. Fine film-like grain across the whole image. Color grading slightly cool with warm highlights on the skin — the color signature of iPhone HDR in overcast ambient light. Raw editorial candid street style, the quality of a photo taken quickly to document the outfit.`;

const NEW_PROMPTS: Record<number, string> = {
  1: SLOT_1_PROMPT,
  2: SLOT_2_PROMPT,
  3: SLOT_3_PROMPT,
  4: SLOT_4_PROMPT,
  5: SLOT_5_PROMPT,
  6: SLOT_6_PROMPT,
};

export const run = internalMutation({
  args: {},
  handler: async (ctx) => {
    const log: string[] = [];
    const push = (line: string) => {
      console.log(line);
      log.push(line);
    };

    // ----- 1. Update F01 slideTemplates -----
    push("=== 1. Update F01 slideTemplates ===");
    const f01 = await ctx.db
      .query("formats")
      .withIndex("by_code", (q) => q.eq("code", "F01"))
      .unique();
    if (!f01) throw new Error("F01 format not found");
    push(`  formatId: ${f01._id}`);

    const newTemplates = f01.slideTemplates
      .slice()
      .sort((a, b) => a.slot - b.slot)
      .map((t) => {
        const next = NEW_PROMPTS[t.slot];
        if (!next) {
          push(`  ⚠ slot ${t.slot}: no replacement defined, keeping existing`);
          return t;
        }
        push(
          `  slot ${t.slot} (${t.role}): ${t.promptTemplate.length} → ${next.length} chars`,
        );
        return { ...t, promptTemplate: next };
      });
    await ctx.db.patch(f01._id, { slideTemplates: newTemplates });
    push("  ✓ F01 slideTemplates patched");

    // ----- 1bis. Refresh F01-S002.slides visualPrompt from new templates -----
    push("\n=== 1bis. Refresh F01-S002 slides ===");
    const s002 = await ctx.db
      .query("scripts")
      .withIndex("by_code", (q) => q.eq("code", "F01-S002"))
      .unique();
    if (!s002) {
      push("  F01-S002 not found, skipping refresh");
    } else {
      push(`  scriptId: ${s002._id}`);
      const refreshed = s002.slides
        .slice()
        .sort((a, b) => a.slot - b.slot)
        .map((s) => {
          const next = NEW_PROMPTS[s.slot];
          if (!next) {
            push(`  ⚠ slot ${s.slot}: no replacement, keeping existing`);
            return s;
          }
          push(
            `  slot ${s.slot} (${s.role}): visualPrompt ${s.visualPrompt.length} → ${next.length} chars`,
          );
          return { ...s, visualPrompt: next };
        });
      await ctx.db.patch(s002._id, {
        slides: refreshed,
        updatedAt: Date.now(),
      });
      push("  ✓ F01-S002 slides refreshed from new F01 templates");
    }

    push(`\ndone @ ${new Date().toISOString()}`);

    return { log, formatId: f01._id, scriptId: s002?._id ?? null };
  },
});
