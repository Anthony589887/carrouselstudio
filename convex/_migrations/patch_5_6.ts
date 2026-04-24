import { internalMutation } from "../_generated/server";

// Patch 5.6 — outfit cohérent end-to-end.
// Executes once. Cleans F01 slideTemplate "signature outfit" hooks,
// wipes legacy test scripts (F01-S001, old F01-S002) + their generations + storage,
// inserts a fresh F01-S002 with a real outfitBrief and slides composed from
// the post-cleanup templates.
//
// Run with: pnpm dlx convex run _migrations/patch_5_6:run
// Idempotency: NOT idempotent. Do not re-run after success.

const SLIDE_2_SUBS: Array<[string, string]> = [
  [
    "their signature outerwear",
    "the outerwear described in the outfit brief above",
  ],
  [
    "their signature pants",
    "the pants described in the outfit brief above",
  ],
  [
    "their signature sneakers",
    "the footwear described in the outfit brief above",
  ],
];

const SLIDE_4_SUBS: Array<[string, string]> = [
  [
    "their ear with any jewelry typical of their persona",
    "their ear with the earrings described in the outfit brief above (if any)",
  ],
];

const NEW_OUTFIT_BRIEF =
  "Brown faux fur coat (mid-thigh length, worn open) over a cream ribbed turtleneck, dark indigo straight-leg jeans, black leather ankle boots, small thin gold hoop earrings (12mm diameter), no other jewelry visible.";

const PLACEHOLDER_OVERLAY = (slot: number) => `Placeholder slide ${slot}`;

function applySubs(
  text: string,
  subs: Array<[string, string]>,
): { result: string; applied: Array<[string, string]> } {
  let result = text;
  const applied: Array<[string, string]> = [];
  for (const [from, to] of subs) {
    if (result.includes(from)) {
      result = result.split(from).join(to);
      applied.push([from, to]);
    }
  }
  return { result, applied };
}

export const run = internalMutation({
  args: {},
  handler: async (ctx) => {
    const log: string[] = [];
    const push = (line: string) => {
      console.log(line);
      log.push(line);
    };

    // ----- 1.1 Cleanup F01 slideTemplates -----
    push("=== 1.1 Cleanup F01 slideTemplates ===");
    const f01 = await ctx.db
      .query("formats")
      .withIndex("by_code", (q) => q.eq("code", "F01"))
      .unique();
    if (!f01) throw new Error("F01 format not found");

    const cleanedTemplates = f01.slideTemplates.map((t) => {
      const subs =
        t.slot === 2 ? SLIDE_2_SUBS : t.slot === 4 ? SLIDE_4_SUBS : [];
      const { result, applied } = applySubs(t.promptTemplate, subs);
      for (const [from, to] of applied) {
        push(`  slot ${t.slot}: "${from}" → "${to}"`);
      }
      // Sweep: detect leftover "signature" hooks in any other slot
      const leftover = result.match(/\bsignature\s+\w+/gi);
      if (leftover && t.slot !== 2 && t.slot !== 4) {
        push(`  ⚠ slot ${t.slot} leftover "signature" hook: ${leftover.join(", ")}`);
      }
      return { ...t, promptTemplate: result };
    });
    await ctx.db.patch(f01._id, { slideTemplates: cleanedTemplates });
    push(`  ✓ F01 slideTemplates updated`);

    // ----- 1.2 Wipe legacy scripts + their generations + storage -----
    push("\n=== 1.2 Wipe legacy scripts + dependencies ===");
    const legacyCodes = ["F01-S001", "F01-S002"];
    let totalGensDeleted = 0;
    let totalStorageDeleted = 0;
    let scriptsDeleted = 0;

    for (const code of legacyCodes) {
      const script = await ctx.db
        .query("scripts")
        .withIndex("by_code", (q) => q.eq("code", code))
        .unique();
      if (!script) {
        push(`  ${code}: not found, skipping`);
        continue;
      }
      const gens = await ctx.db
        .query("generations")
        .withIndex("by_script", (q) => q.eq("scriptId", script._id))
        .collect();
      let storageForThisScript = 0;
      for (const gen of gens) {
        for (const slide of gen.slides) {
          if (slide.imageStorageId) {
            try {
              await ctx.storage.delete(slide.imageStorageId);
              storageForThisScript++;
            } catch (e) {
              push(
                `    ⚠ storage.delete failed for ${slide.imageStorageId}: ${(e as Error).message}`,
              );
            }
          }
        }
        await ctx.db.delete(gen._id);
      }
      await ctx.db.delete(script._id);
      push(
        `  ${code}: script deleted, ${gens.length} generation(s) deleted, ${storageForThisScript} storage file(s) deleted`,
      );
      totalGensDeleted += gens.length;
      totalStorageDeleted += storageForThisScript;
      scriptsDeleted++;
    }

    push(
      `  TOTAL: ${scriptsDeleted} script(s), ${totalGensDeleted} generation(s), ${totalStorageDeleted} storage file(s) deleted`,
    );

    // ----- 1.3 Create new F01-S002 with composed slides from cleaned templates -----
    push("\n=== 1.3 Create new F01-S002 ===");
    const composedSlides = cleanedTemplates
      .slice()
      .sort((a, b) => a.slot - b.slot)
      .map((t) => ({
        slot: t.slot,
        role: t.role,
        visualPrompt: t.promptTemplate,
        overlayText: PLACEHOLDER_OVERLAY(t.slot),
      }));

    const now = Date.now();
    const newId = await ctx.db.insert("scripts", {
      code: "F01-S002",
      name: "Test 5.6 — outfit cohérent validation",
      formatId: f01._id,
      preferredPersonaId: undefined,
      outfitBrief: NEW_OUTFIT_BRIEF,
      // locationBrief was added by patch_5_10. Historical migration kept compilable.
      locationBrief: "",
      slides: composedSlides,
      status: "draft",
      notes: undefined,
      createdAt: now,
      updatedAt: now,
    });
    push(`  ✓ F01-S002 created with id: ${newId}`);

    return {
      log,
      scriptsDeleted,
      generationsDeleted: totalGensDeleted,
      storageFilesDeleted: totalStorageDeleted,
      newScriptId: newId,
    };
  },
});
