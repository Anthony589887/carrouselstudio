import { internalMutation } from "../_generated/server";

// Patch 5.10 — locationBrief architecture + anti-cutout F01 templates.
//
// Run with: pnpm dlx convex run _migrations/patch_5_10:run
// Order: this migration runs BEFORE the schema is changed to require locationBrief.
// It adds the field to F01-S002 so the schema push afterwards does not reject the row.
// NOT idempotent on script timestamps. Safe to re-run on F01 templates (overwrites identical content).

const SLOT_1 = `Extreme close-up of her face, captured within the specific location described above. The frame begins at her mid-forehead and ends at the top of her collarbone, her face filling most of the frame but slightly offset to the right of center. She looks to her left, eyes aimed past the camera, not engaging with it. Lips relaxed and closed, chin neutral — the face of someone mid-thought, caught between two moments. One gold hoop earring visible on her left ear, catching a small point of the ambient light coming from the environment.

She is visually embedded in the scene — the light on her face reflects the color and quality of light described in the location brief, her skin picks up the warm or cool tones of the environment around her, and the background (completely out of focus) shows a clear impression of the place described above: suggestion of pedestrians, storefronts, vegetation, or architecture consistent with the location brief, blurred but recognizable in tone.

Shot on an iPhone 15 Pro held by someone standing close to her, less than 40 centimeters away. The lighting on her face matches the ambient lighting of the location described above — not studio light. Photorealistic skin texture with visible pores, faint freckling across the cheeks, individual eyebrow hairs distinct, subtle redness around the nostrils and inner eye corners, the fine hair at the hairline slightly visible. Natural film-like grain across the whole image, slightly more pronounced in the shadows. Color grading natural and consistent with the ambient light of the scene. Raw editorial candid style, the quality of a photo taken quickly between moments by a friend.`;

const SLOT_2 = `First-person point-of-view shot looking straight down at her own feet on the ground of the location described above. The bottom hem of her outerwear described in the outfit brief is visible at the very top of the frame, framing the shot like a curtain. Below it, her pants run down into her footwear, planted on the ground. The ground fills the rest of the frame — its specific texture, color, and debris match the location described above (cracked concrete sidewalk, cobblestones, tile, marble café floor, sand, whatever the location implies), with small environmental details visible (cigarette butts, leaves, crumbs, shadows) that are coherent with the ambient light of the scene. Her face is not visible in this shot.

Shot on an iPhone 15 Pro held at chest level by her, pointing straight down. Slight natural tilt of the frame, not perfectly aligned with the ground grid. Photorealistic texture on the fabric of the coat, the pants, the footwear, and the ground. Fine grain and environmental debris visible. Color grading natural and consistent with the ambient light described in the location brief. Raw editorial candid style, the quality of a photo taken quickly between moments.`;

const SLOT_3 = `Wide full-body shot in the location described above. She occupies roughly the lower-right third of the frame, walking toward or across the camera but with her body angled slightly — one foot is mid-stride, clearly in front of the other, one arm is slightly bent and lifted while the other hangs naturally, not symmetrical. She looks down at the ground a few meters ahead of her, not at the camera. The rest of the frame is dominated by the environment of the location brief — specific architecture, vegetation, perspective, and surfaces that unmistakably identify the place described above.

Critically, she is visually embedded in the scene: her feet cast a real shadow on the ground consistent with the direction and quality of the ambient light, her outerwear picks up reflections of the surrounding colors (warm tones from storefronts, green from vegetation, whatever is present), her skin tone is affected by the ambient light of the location (cooler in overcast, warmer in golden hour, etc.), and the depth of field places her within the scene, not detached from it. Other people visible in the background (blurred pedestrians, café patrons, whatever is coherent with the location) are at a natural distance and scale, occupying the space believably.

Shot on an iPhone 15 Pro from across the scene, at hip height, slightly wide angle. Photorealistic textures on the coat fabric, pants, and footwear. Fine film-like grain across the image, slightly more pronounced in the ambient shadows. Slight motion blur on her leading foot, as she is captured mid-step. Subtle chromatic aberration visible on the high-contrast edges of the frame. Color grading natural and consistent with the ambient light described in the location brief. Raw editorial candid style, the quality of an accidental snapshot taken while walking behind or beside her.`;

const SLOT_4 = `Extreme close-up macro shot on the left side of her face — the frame is filled almost entirely by her ear, the gold hoop earring described in the outfit brief above, a section of her cheek down to the corner of her jaw, and strands of her hair falling past her temple and behind her ear. Her face is turned three-quarters away from the camera, showing the profile curve of her cheekbone and jawline. The gold hoop catches a small point of the ambient light from the location described above, highlighting its curved surface. Individual strands of hair are distinct, some catching the light, some in shadow.

The color and direction of the light on her skin and hair reflect the ambient lighting of the location brief — cool overcast diffuse, warm golden hour side light, neon-tinted night ambience, whatever the scene implies. The background is completely out of focus, showing only a vague but recognizable impression of the place (warm tones, cool tones, blurred forms consistent with the location).

Shot on an iPhone 15 Pro held very close to her head, less than 25 centimeters away. Photorealistic skin texture with visible pores on the cheek, fine hair at the temple, subtle veining in the ear cartilage, tiny imperfections in the metal of the gold hoop. Natural film-like grain. Color grading natural and consistent with the ambient light of the scene. Raw editorial candid style, the quality of an accidentally intimate shot.`;

const SLOT_5 = `PLACEHOLDER — slot 5 produit is handled manually in post-production. Do not generate via pipeline. This template is intentionally kept as a placeholder string to preserve the 6-slot structure of F01.`;

const SLOT_6 = `Medium shot in the location described above, framed from just below her chin down to her hips. Her head is entirely cropped out of the frame at the top — only the bottom of her jawline and potentially one earring are faintly visible in the top corner. The focus is the layered outfit described in the outfit brief above, and the environment of the location brief surrounding her.

Critically, she is visually embedded in the scene: her outerwear and clothing pick up ambient color reflections from the environment (warm storefront glow, cool overcast sky, golden hour side light, whatever is coherent with the location), her skin tone is affected by the ambient light, and the background (out of focus but recognizable) clearly shows details of the place described — architecture, vegetation, surfaces, other people blurred at a natural distance. Her hands are visible: one resting at her side or in a pocket, the other caught mid-gesture, asymmetrical and unposed.

She is standing in the location, facing the camera at a slight three-quarter angle — weight on one leg, hips subtly offset, not perfectly squared. Shot on an iPhone 15 Pro from about 1.5 meters away at chest height. Photorealistic textures on the fabric of the outerwear, knit, pants, and her hands. Fine film-like grain. Subtle chromatic aberration on the high-contrast edges. Color grading natural and consistent with the ambient light of the location brief. Raw editorial candid style, the quality of a photo taken quickly to document the outfit in context.`;

const NEW_PROMPTS: Record<number, string> = {
  1: SLOT_1,
  2: SLOT_2,
  3: SLOT_3,
  4: SLOT_4,
  5: SLOT_5,
  6: SLOT_6,
};

const F01_S002_DEFAULT_LOCATION = `New York City, SoHo neighborhood sidewalk in late afternoon, overcast grey sky with soft diffuse ambient light, red brick facades and fire escapes running up the buildings, some blurred pedestrians in dark winter coats walking at a natural distance, cold and slightly damp late autumn atmosphere, warm glow from distant storefronts barely visible in the background.`;

export const run = internalMutation({
  args: {},
  handler: async (ctx) => {
    const log: string[] = [];
    const push = (line: string) => {
      console.log(line);
      log.push(line);
    };

    // ----- Audit safety: list any script without locationBrief other than F01-S002 -----
    push("=== Pre-flight audit: scripts without locationBrief ===");
    const allScripts = await ctx.db.query("scripts").collect();
    const noLocation = allScripts.filter(
      (s) =>
        (s as unknown as { locationBrief?: string }).locationBrief ===
          undefined ||
        ((s as unknown as { locationBrief?: string }).locationBrief?.trim()
          .length ?? 0) === 0,
    );
    const offenders = noLocation.filter((s) => s.code !== "F01-S002");
    if (offenders.length > 0) {
      push(
        `  ⚠ STOP — ${offenders.length} script(s) other than F01-S002 lack locationBrief:`,
      );
      for (const s of offenders) push(`    ${s.code} (${s._id})`);
      throw new Error(
        `Found ${offenders.length} script(s) other than F01-S002 without locationBrief. Audit required before proceeding.`,
      );
    }
    push(
      `  ✓ Only F01-S002 lacks locationBrief (or none) — safe to proceed (${allScripts.length} total scripts)`,
    );

    // ----- 2.1 Update F01 slideTemplates -----
    push("\n=== 2.1 Update F01 slideTemplates ===");
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
          push(`  ⚠ slot ${t.slot}: no replacement defined, keeping`);
          return t;
        }
        push(
          `  slot ${t.slot} (${t.role}): ${t.promptTemplate.length} → ${next.length} chars`,
        );
        return { ...t, promptTemplate: next };
      });
    await ctx.db.patch(f01._id, { slideTemplates: newTemplates });
    push("  ✓ F01 slideTemplates patched");

    // ----- 2.2 + 2.3 Refresh F01-S002 slides + add locationBrief -----
    push("\n=== 2.2/2.3 Refresh F01-S002 slides + add locationBrief ===");
    const s002 = await ctx.db
      .query("scripts")
      .withIndex("by_code", (q) => q.eq("code", "F01-S002"))
      .unique();
    if (!s002) {
      push("  F01-S002 not found, skipping");
    } else {
      push(`  scriptId: ${s002._id}`);
      const refreshed = s002.slides
        .slice()
        .sort((a, b) => a.slot - b.slot)
        .map((s) => {
          const next = NEW_PROMPTS[s.slot];
          if (!next) return s;
          push(
            `  slot ${s.slot} (${s.role}): visualPrompt ${s.visualPrompt.length} → ${next.length} chars`,
          );
          return { ...s, visualPrompt: next };
        });
      await ctx.db.patch(s002._id, {
        slides: refreshed,
        locationBrief: F01_S002_DEFAULT_LOCATION,
        updatedAt: Date.now(),
      });
      push(
        `  ✓ F01-S002 slides refreshed + locationBrief added (${F01_S002_DEFAULT_LOCATION.length} chars)`,
      );
    }

    push(`\ndone @ ${new Date().toISOString()}`);

    return { log, formatId: f01._id, scriptId: s002?._id ?? null };
  },
});
