import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";

const URL = process.env.NEXT_PUBLIC_CONVEX_URL;
if (!URL) throw new Error("NEXT_PUBLIC_CONVEX_URL missing");

const c = new ConvexHttpClient(URL);

const NEW_SLOT_1_PROMPT =
  "Generate the same person standing on a New York City sidewalk at night, around 10pm. Pose: standing relaxed, weight on one leg, hands loosely at the sides or lightly touching the outerwear, head tilted slightly down, gaze soft and unfocused, candid not posed.\n\nBackground: typical Manhattan street at night. A yellow taxi partially visible, parked cars line the curb, warm yellow sodium lamppost light mixes with neon-lit storefronts. Blurry pedestrians walk by.\n\nCaptured on an iPhone 15 in low-light night mode, no flash, handheld. Slight motion blur in the periphery. The image reads as a candid photo taken by a friend on the street, not a photoshoot.\n\nAspect ratio 9:16.";

async function main() {
  const f01 = await c.query(api.formats.getByCode, { code: "F01" });
  if (!f01) throw new Error("F01 not found in DB");

  const updated = f01.slideTemplates.map((t) =>
    t.slot === 1 ? { ...t, promptTemplate: NEW_SLOT_1_PROMPT } : t,
  );

  await c.mutation(api.formats.update, {
    id: f01._id,
    slideTemplates: updated,
  });

  const after = await c.query(api.formats.getByCode, { code: "F01" });
  const slot1 = after?.slideTemplates.find((t) => t.slot === 1);
  console.log("✓ F01 slot 1 updated");
  console.log("New promptTemplate (first 200 chars):");
  console.log(slot1?.promptTemplate.slice(0, 200) + "...");
  console.log(
    "\nContains 'signature outfit':",
    slot1?.promptTemplate.includes("signature outfit"),
  );
  console.log(
    "Contains 'micro-asymmetries':",
    slot1?.promptTemplate.includes("micro-asymmetries"),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
