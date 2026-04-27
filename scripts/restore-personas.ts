// One-shot: restore the 6 v1 personas into the v2 schema.
// Reference photos: public/personas/*.jpg (restored from git commit 3419474).
// Identity descriptions: faceBlock text from old seed at commit 46362a8.
// Run with: pnpm tsx --env-file=.env.local scripts/restore-personas.ts
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL;
if (!CONVEX_URL) {
  console.error("NEXT_PUBLIC_CONVEX_URL is not set.");
  process.exit(1);
}
const client = new ConvexHttpClient(CONVEX_URL);

type Seed = { name: string; identityDescription: string; photo: string };

const personas: Seed[] = [
  {
    name: "F1 — Méditerranéenne",
    identityDescription:
      "a 24-year-old woman with golden-olive Mediterranean skin, almond-shaped dark hazel eyes, thick natural dark eyebrows with a strong arch, a straight nose with a subtle bump at the bridge, high defined cheekbones, full lips in a relaxed expression, a small beauty mark on her left cheek, and shoulder-length dark chestnut brown hair with loose natural waves.",
    photo: "f1-mediterraneenne.jpg",
  },
  {
    name: "F2 — East Asian",
    identityDescription:
      "a 25-year-old East Asian woman with pale warm ivory skin, subtle natural freckles across the bridge of her nose, almond eyes with a slight upturn and monolid, dark brown irises, thin straight eyebrows, a small delicate nose, soft full lips in a relaxed neutral shape, a sharp defined jawline, and shoulder-length jet black straight hair typically worn in a sleek low ponytail with a few shorter strands escaping around her face.",
    photo: "f2-east-asian.jpg",
  },
  {
    name: "F3 — Métisse",
    identityDescription:
      "a 26-year-old mixed-race woman with warm medium-brown skin, large expressive dark brown eyes, thick dark eyebrows with a natural arch, full lips in a relaxed expression, prominent cheekbones, a small nose with a slight width at the base, subtle natural freckles across the nose bridge, minor asymmetry with the left eye slightly lower than the right, and shoulder-length dark brown tight springy natural curls with voluminous texture framing her face.",
    photo: "f3-metisse.jpg",
  },
  {
    name: "H1 — Européen brun",
    identityDescription:
      "a 27-year-old man with fair skin and a light olive undertone, blue-grey eyes, thick dark natural eyebrows, a straight defined nose, prominent cheekbones, a strong jawline with several days of medium brown stubble, lips in a subtle neutral expression, and medium-length dark brown wavy hair slightly covering his ears with a natural center part and loose strands falling over his forehead.",
    photo: "h1-europeen-brun.jpg",
  },
  {
    name: "H2 — Afro-américain",
    identityDescription:
      "a 26-year-old Black man with medium-dark brown skin, deep brown eyes, thick dark eyebrows with a natural shape, a strong defined jawline with a very light chinstrap beard, high cheekbones, full lips in a relaxed neutral expression, and a short low fade haircut with neat sharp edges and smooth faded sides.",
    photo: "h2-afro-americain.jpg",
  },
  {
    name: "H3 — Latino",
    identityDescription:
      "a 25-year-old Latino man with warm tan skin, dark brown eyes, thick natural dark eyebrows, a strong straight nose, defined cheekbones, a well-groomed short dark beard, lips in a subtle neutral expression, and short dark black hair styled upward with natural texture and slight curl, messy finish.",
    photo: "h3-latino.jpg",
  },
];

async function uploadPhoto(filename: string): Promise<Id<"_storage">> {
  const path = resolve(process.cwd(), "public/personas", filename);
  const buffer = readFileSync(path);
  const uploadUrl = await client.mutation(api.personas.generateUploadUrl, {});
  const res = await fetch(uploadUrl, {
    method: "POST",
    headers: { "Content-Type": "image/jpeg" },
    body: new Uint8Array(buffer),
  });
  if (!res.ok) throw new Error(`Upload failed (${res.status})`);
  const { storageId } = (await res.json()) as { storageId: Id<"_storage"> };
  return storageId;
}

async function run() {
  console.log(`Restoring ${personas.length} personas to ${CONVEX_URL}`);
  for (const p of personas) {
    process.stdout.write(`  ${p.name} … `);
    const storageId = await uploadPhoto(p.photo);
    const gender: "feminine" | "masculine" | "neutral" = /^F/i.test(p.name)
      ? "feminine"
      : /^H/i.test(p.name)
        ? "masculine"
        : "feminine";
    await client.mutation(api.personas.create, {
      name: p.name,
      identityDescription: p.identityDescription,
      gender,
      referenceImageStorageId: storageId,
    });
    console.log("✓");
  }
  console.log("done.");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
