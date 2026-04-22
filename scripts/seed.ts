import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL;
if (!CONVEX_URL) {
  console.error(
    "NEXT_PUBLIC_CONVEX_URL is not set. Run with: pnpm seed (uses --env-file=.env.local)",
  );
  process.exit(1);
}

const client = new ConvexHttpClient(CONVEX_URL);

type PersonaSeed = {
  code: string;
  name: string;
  gender: "F" | "H";
  ethnicity: string;
  age: number;
  faceBlock: string;
  defaultDA: string;
  photoFilename: string;
  isActive: boolean;
};

const personas: PersonaSeed[] = [
  {
    code: "F1",
    name: "F1 — Méditerranéenne",
    gender: "F",
    ethnicity: "Méditerranéenne",
    age: 24,
    faceBlock:
      "a 24-year-old woman with golden-olive Mediterranean skin, almond-shaped dark hazel eyes, thick natural dark eyebrows with a strong arch, a straight nose with a subtle bump at the bridge, high defined cheekbones, full lips in a relaxed expression, a small beauty mark on her left cheek, and shoulder-length dark chestnut brown hair with loose natural waves.",
    defaultDA: "NYC night amateur",
    photoFilename: "f1-mediterraneenne.jpg",
    isActive: true,
  },
  {
    code: "F2",
    name: "F2 — East Asian",
    gender: "F",
    ethnicity: "East Asian",
    age: 25,
    faceBlock:
      "a 25-year-old East Asian woman with pale warm ivory skin, subtle natural freckles across the bridge of her nose, almond eyes with a slight upturn and monolid, dark brown irises, thin straight eyebrows, a small delicate nose, soft full lips in a relaxed neutral shape, a sharp defined jawline, and shoulder-length jet black straight hair typically worn in a sleek low ponytail with a few shorter strands escaping around her face.",
    defaultDA: "NYC night amateur",
    photoFilename: "f2-east-asian.jpg",
    isActive: true,
  },
  {
    code: "F3",
    name: "F3 — Métisse",
    gender: "F",
    ethnicity: "Métisse / Afro-caribéenne",
    age: 26,
    faceBlock:
      "a 26-year-old mixed-race woman with warm medium-brown skin, large expressive dark brown eyes, thick dark eyebrows with a natural arch, full lips in a relaxed expression, prominent cheekbones, a small nose with a slight width at the base, subtle natural freckles across the nose bridge, minor asymmetry with the left eye slightly lower than the right, and shoulder-length dark brown tight springy natural curls with voluminous texture framing her face.",
    defaultDA: "NYC night amateur",
    photoFilename: "f3-metisse.jpg",
    isActive: true,
  },
  {
    code: "H1",
    name: "H1 — Européen brun",
    gender: "H",
    ethnicity: "Européen",
    age: 27,
    faceBlock:
      "a 27-year-old man with fair skin and a light olive undertone, blue-grey eyes, thick dark natural eyebrows, a straight defined nose, prominent cheekbones, a strong jawline with several days of medium brown stubble, lips in a subtle neutral expression, and medium-length dark brown wavy hair slightly covering his ears with a natural center part and loose strands falling over his forehead.",
    defaultDA: "NYC night amateur",
    photoFilename: "h1-europeen-brun.jpg",
    isActive: true,
  },
  {
    code: "H2",
    name: "H2 — Afro-américain",
    gender: "H",
    ethnicity: "Afro-américain",
    age: 26,
    faceBlock:
      "a 26-year-old Black man with medium-dark brown skin, deep brown eyes, thick dark eyebrows with a natural shape, a strong defined jawline with a very light chinstrap beard, high cheekbones, full lips in a relaxed neutral expression, and a short low fade haircut with neat sharp edges and smooth faded sides.",
    defaultDA: "NYC night amateur",
    photoFilename: "h2-afro-americain.jpg",
    isActive: true,
  },
  {
    code: "H3",
    name: "H3 — Latino",
    gender: "H",
    ethnicity: "Latino",
    age: 25,
    faceBlock:
      "a 25-year-old Latino man with warm tan skin, dark brown eyes, thick natural dark eyebrows, a strong straight nose, defined cheekbones, a well-groomed short dark beard, lips in a subtle neutral expression, and short dark black hair styled upward with natural texture and slight curl, messy finish.",
    defaultDA: "NYC night amateur",
    photoFilename: "h3-latino.jpg",
    isActive: true,
  },
];

const format1 = {
  code: "F01",
  name: "Format #1 — Récit personnel NYC night amateur",
  archetype: "I did X for Y time, here's what I learned",
  defaultDA: "NYC night amateur",
  description:
    "Carrousel narratif : la personne raconte une expérience vécue et en tire des enseignements numérotés. Cover qui pose le hook + 5 points. Ambiance NYC nuit, iPhone night mode, grain amateur, outfit streetwear varié par persona.",
  isActive: true,
  slideTemplates: [
    {
      slot: 1,
      role: "cover",
      promptTemplate:
        "Generate the same person standing on a New York City sidewalk at night, around 10pm. They wear the signature outfit of their persona. Pose: standing relaxed, weight on one leg, hands loosely at the sides or lightly touching the coat, head tilted slightly down, gaze soft and unfocused, candid not posed.\n\nBackground: typical Manhattan street at night. A yellow taxi partially visible, parked cars line the curb, warm yellow sodium lamppost light mixes with neon-lit storefronts. Blurry pedestrians walk by.\n\nCaptured on an iPhone 15 in low-light night mode, no flash, handheld. Slight motion blur in the periphery, mild digital grain, mixed warm light sources — yellow sodium lampposts, reddish storefront neons. The image reads as a candid photo taken by a friend on the street, not a photoshoot. Natural skin texture with preserved micro-asymmetries, no beauty retouching.\n\nAspect ratio 9:16.",
      notes:
        "Slide cover, hook visuel. La persona se tient debout dans la rue, look candide.",
    },
    {
      slot: 2,
      role: "rupture",
      promptTemplate:
        "Generate a first-person point-of-view shot looking down at the ground, as if the same person is looking at their own feet. Visible: the bottom of their signature outerwear visible at the top of the frame, their signature pants descending vertically, their signature sneakers clearly visible on a grey New York sidewalk at night.\n\nThe ground: grey concrete sidewalk with typical NYC texture — small cracks, dark spots, wet patches reflecting the warm yellow streetlight. A few details like cigarette butts or gum marks near the edge of frame. A manhole cover partially visible in the lower third.\n\nLighting: warm yellow sodium lamppost light casting a diagonal shadow across the sidewalk.\n\nCaptured on an iPhone 15 in low-light night mode, handheld, slight motion blur, mild digital grain. Candid, authentic aesthetic.\n\nAspect ratio 9:16.",
      notes:
        "Slide rupture de rythme. POV plongée sur les pieds de la persona. Pas de visage visible, on reconnaît la persona par son outfit.",
    },
    {
      slot: 3,
      role: "marche",
      promptTemplate:
        "Generate the same person walking on a New York City sidewalk at night, captured mid-stride from a slightly lowered angle three-quarters in front of them.\n\nPose: mid-stride, natural weight shift, head tilted slightly down, eyes focused somewhere ahead on the ground, not on the camera. Lips closed, relaxed.\n\nBackground: a Manhattan street at night. Storefronts with red and neon signage on the left, warm yellow sodium lampposts, parked cars along the curb, blurry pedestrians walking behind them. Slight motion blur in the background.\n\nCaptured on an iPhone 15 in low-light night mode, handheld, slight camera shake. Mild digital grain, not perfectly sharp. Candid walking photo aesthetic, like a friend following them and took a quick shot.\n\nAspect ratio 9:16.",
      notes:
        "Slide narration principale. Plan en marche, sujet en mouvement, énergie vivante.",
    },
    {
      slot: 4,
      role: "close-up",
      promptTemplate:
        "Generate an extreme close-up on the right side of the same person's face, captured from the side in profile. Visible in the frame: their ear with any jewelry typical of their persona, the temple, a strand of hair, the edge of their cheekbone, and any visible clothing collar detail in the lower portion of the frame.\n\nThe composition is tight — just the ear, jewelry, cheekbone, hair edge. Most of the frame is taken up by these details. Behind them, softly out of focus — the blurred warm yellow glow of a NYC street at night, possibly a taxi's red tail-light bokeh in the far background.\n\nCaptured on an iPhone 15 in low-light night mode, handheld, close-up distance. Slight grain, natural skin texture visible, no beauty retouching. Warm ambient light on the skin, cooler shadow on the other side.\n\nAspect ratio 9:16.",
      notes: "Slide close-up extrême. Détail texturé. Maximise dwell time.",
    },
    {
      slot: 5,
      role: "produit",
      promptTemplate:
        "Generate the same person holding a black iPhone vertically in the right half of the frame, screen facing the camera, tilted slightly 5° to the right. The phone screen displays the RepackIt mobile app interface (provided as reference image if available, otherwise: dark background with orange accent elements, a clean dark-mode app).\n\nBehind the phone, a softly blurred cozy indoor setting at night: warm lamp glow in the upper left, an open MacBook showing a blurred Pinterest mood board in the background, a ceramic mug on a wooden table, the edge of the person's outerwear visible at the bottom.\n\nCaptured on an iPhone 15 night mode, handheld, warm ambient light mixing with the phone screen glow. Slight digital grain. Subtle glass reflections on the screen but interface stays clearly readable. Candid, authentic, not a product shoot.\n\nAspect ratio 9:16.",
      notes:
        "Slide produit. Intègre RepackIt naturellement via iPhone + UI. À la phase 5/6, on injectera une reference image de l'UI RepackIt pour reproduction fidèle.",
    },
    {
      slot: 6,
      role: "clôture",
      promptTemplate:
        'Generate the same person sitting on the edge of a curb on a New York City sidewalk at night, captured from across the street at a slight distance.\n\nPose: sitting on the curb, knees bent, forearms resting on thighs, hands loosely hanging. Body slightly angled, head lowered, eyes on the ground or phone in hand. Contemplative, relaxed.\n\nBackground: Manhattan street at night. Warm yellow lampposts, a yellow taxi passing by with motion blur, neon signs in the distance, some pedestrians blurred on the other side of the street. Above, a fire escape and classic NYC brick facade.\n\nCaptured on an iPhone 15 in low-light night mode, handheld, shot from a distance of about 4-5 meters. Slight motion blur on the taxi, mild digital grain, not perfectly sharp. Wider framing — the subject occupies about 35-45% of the frame height, plenty of environment visible around them. Candid "friend took this from across the street" aesthetic.\n\nAspect ratio 9:16.',
      notes:
        "Slide clôture. Retour plan large, ferme la boucle visuelle. Contemplatif.",
    },
  ],
};

async function uploadPhoto(filename: string): Promise<Id<"_storage">> {
  const path = resolve(process.cwd(), "public/personas", filename);
  const buffer = readFileSync(path);
  const uploadUrl = await client.mutation(api.personas.generateUploadUrl, {});
  const res = await fetch(uploadUrl, {
    method: "POST",
    headers: { "Content-Type": "image/jpeg" },
    body: buffer,
  });
  if (!res.ok) {
    throw new Error(`Upload failed: ${res.status} ${res.statusText}`);
  }
  const { storageId } = (await res.json()) as { storageId: Id<"_storage"> };
  return storageId;
}

async function seedPersonas() {
  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const p of personas) {
    try {
      const existing = await client.query(api.personas.getByCode, {
        code: p.code,
      });
      if (existing) {
        console.log(`  ↳ ${p.code} already exists, skipping`);
        skipped++;
        continue;
      }

      const id = await client.mutation(api.personas.create, {
        code: p.code,
        name: p.name,
        gender: p.gender,
        ethnicity: p.ethnicity,
        age: p.age,
        faceBlock: p.faceBlock,
        defaultDA: p.defaultDA,
        isActive: p.isActive,
      });
      console.log(`  ✓ created persona ${p.code} (${id})`);

      const storageId = await uploadPhoto(p.photoFilename);
      await client.mutation(api.personas.setPhoto, {
        id,
        storageId,
      });
      console.log(`  ✓ attached photo ${p.photoFilename} (${storageId})`);
      created++;
    } catch (err) {
      console.error(`  ✗ failed ${p.code}:`, err);
      failed++;
    }
  }

  return { created, skipped, failed };
}

async function seedFormat() {
  const existing = await client.query(api.formats.getByCode, {
    code: format1.code,
  });
  if (existing) {
    console.log(`  ↳ ${format1.code} already exists, skipping`);
    return { created: 0, skipped: 1 };
  }
  const id = await client.mutation(api.formats.create, format1);
  console.log(`  ✓ created format ${format1.code} (${id})`);
  return { created: 1, skipped: 0 };
}

async function main() {
  console.log(`Convex URL: ${CONVEX_URL}\n`);

  console.log("Seeding personas...");
  const pResult = await seedPersonas();

  console.log("\nSeeding formats...");
  const fResult = await seedFormat();

  console.log("\n=== Summary ===");
  console.log(
    `Personas: ${pResult.created} created, ${pResult.skipped} skipped, ${pResult.failed} failed`,
  );
  console.log(
    `Formats:  ${fResult.created} created, ${fResult.skipped} skipped`,
  );
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
