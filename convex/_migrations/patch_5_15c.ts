/**
 * Patch 5.15c — Seed scripts F01-S004 to F01-S008
 *
 * Inserts 5 new F01 scripts covering 5 radically distinct environments:
 *   - F01-S004: Tokyo Shibuya night (neon urban)
 *   - F01-S005: Lima Miraflores golden hour (warm pastel)
 *   - F01-S006: Stockholm winter morning (crisp cold)
 *   - F01-S007: Lisbon Alfama tile street afternoon (Mediterranean lazy)
 *   - F01-S008: Berlin Mitte early evening (underground)
 *
 * Strategy: stress-test F1 character lock across maximally diverse environments
 * before scaling to 15+ scripts (decision gate after empirical TikTok test).
 *
 * Mechanism: direct ctx.db.insert (bypass scripts.create which auto-generates
 * codes). Slides are snapshotted from format.slideTemplates at insert time
 * (post-patch 5.10 templates with locationBrief + outfitBrief integration).
 *
 * Idempotence: safe to re-run. Scripts with existing codes are skipped, not
 * overwritten. Pre-flight checks F1 persona + F01 format presence.
 *
 * Edge case to know: scripts.create generates next code via existing.length+1.
 * After this migration, the next UI-triggered script creation on F01 will
 * propose code "F01-S008" (existing=7, next=8), which will collide and throw
 * "code déjà utilisé". User just retries to get S009. Not blocking, just FYI.
 */

import { internalMutation } from "../_generated/server";
import { Id } from "../_generated/dataModel";

const F1_PERSONA_ID = "jd7dcx2f9q1q2wgr075vn1pexn85bwds" as Id<"personas">;
const F01_FORMAT_ID = "j5778xgdpn3z3tm28kp2cs604x85axdc" as Id<"formats">;

type SeedEntry = {
  code: string;
  name: string;
  outfitBrief: string;
  locationBrief: string;
};

const SEEDS: SeedEntry[] = [
  {
    code: "F01-S004",
    name: "Tokyo Shibuya night — F1 streetstyle",
    outfitBrief: `She is wearing wide black technical cargo pants in a heavy ripstop nylon, the fabric falling in vertical breaks over her ankles where it pools slightly above a pair of low-profile black running sneakers with a thin white midsole. The cargos have two large bellow pockets on the thighs, slightly worn at the velcro flaps from real use. Over her torso she wears an oversized cotton hoodie in a faded charcoal grey, the drawstrings uneven, the hem hitting just below her hip bone, the cuffs pushed up once revealing the inside of her forearms. Underneath the hoodie, a thin black ribbed tank top is barely visible at the neckline. A small silver chain with a single flat pendant rests against her collarbone, half-hidden by the hood collar. No jewelry on her ears. Her hair is pulled into a low casual ponytail that falls between her shoulder blades, with a few loose strands falling near her temples. The overall silhouette is loose, lived-in, slightly androgynous — not styled, not fashion-week, just the way someone actually dresses to walk through a city at night.`,
    locationBrief: `The scene takes place on a side street one block off the main Shibuya scramble, around 9:40 PM on a humid weeknight in late September. The sky overhead is a deep sodium-tinted purple, polluted with the ambient light bleeding upward from the surrounding signage. Tall narrow buildings line both sides of the street, each floor stacked with vertical kanji signs in saturated red, electric blue, and vivid green neon, their glow reflecting in irregular patches on the wet asphalt below — it rained earlier in the evening and the ground is still slick in the gutters. Power lines crisscross overhead in the typical Tokyo tangle, their silhouettes barely visible against the sign-lit sky. A vending machine glows white-blue from the wall of a recessed entryway, casting a clinical rectangle of light onto the pavement. The street is narrow enough that the colored neons reflect onto her skin and her clothing from multiple angles at once — a wash of magenta on her left cheek from the closest sign, a colder cyan grazing the top of her shoulder from a sign higher up. A few pedestrians are visible in the deep background, blurred by the distance, their dark silhouettes dwarfed by the saturated chromatic chaos around them. The air feels thick, slightly damp, carrying the faint smell of grilled food from a yakitori counter further down the street. She is visually embedded in this environment — the neon does not float around her like a green-screen halo, it physically illuminates her, picks up the texture of her hoodie, throws her shadow softly onto the wet asphalt behind her, and reflects in the small puddles near her feet.`,
  },
  {
    code: "F01-S005",
    name: "Lima Miraflores golden hour — F1 streetstyle",
    outfitBrief: `She is wearing a beige cropped knit sweater in a chunky cotton-blend ribbing, the cuffs slightly stretched, the hem ending just at the line of her natural waist where a thin sliver of skin is visible above the waistband of her pants. The pants are wide-leg in a warm cream-tinted off-white linen, slightly wrinkled in the way linen always is by mid-afternoon, breaking softly over the top of her shoes. On her feet, a pair of low brown leather loafers with a small polished horsebit detail, the leather softened from wear, the soles thin enough to look unstyled. A delicate gold chain rests at the base of her throat, paired with two tiny gold studs in her earlobes — minimal, almost invisible from a distance. Her hair falls loose to her mid-back, parted slightly off-center, with a natural soft wave that catches the light. Her lips are a neutral matte rose, her skin bare of visible makeup beyond a touch of warmth on the cheekbones. The whole outfit reads warm-neutral monochrome — sand, cream, soft brown — designed to absorb and amplify the golden light of the scene rather than fight it.`,
    locationBrief: `The scene takes place on the Malecón cliffside walkway in Miraflores, Lima, around 5:50 PM in early November when the sun sits low over the Pacific Ocean to the west. The sky is a wash of warm peach gradient, deepening into a soft coral closer to the horizon, and the entire scene is bathed in a long, raking golden-hour light that hits everything from a low west angle. To her right, the cliff drops sharply toward the ocean below, and the railing of the walkway — black wrought iron, slightly weathered — runs in soft focus along the edge of the frame. The ocean visible past the railing is a deep slate blue, catching tiny pinpoints of sun glinting off the ripples far below, and a few paragliders drift in the distance, no larger than birds. The pathway itself is paved with warm terracotta-toned tiles, slightly dusty, with patches of green grass and bougainvillea bushes lining the inner edge — the bougainvillea in full magenta bloom, a few petals scattered on the path near her feet. The golden light catches the tips of her hair and turns them slightly amber, throws a long soft shadow of her body onto the tiled path stretching toward the ocean side, and illuminates the cream linen of her pants until it nearly glows. The ocean wind moves a few strands of her hair gently across her face. The air feels warm, salty, with the faint smell of dry grass and distant flowers. She is visually embedded in this environment — the golden light is on her, not behind her, picking up the chunky knit texture of her sweater and the soft wrinkles of her linen pants.`,
  },
  {
    code: "F01-S006",
    name: "Stockholm winter morning — F1 streetstyle",
    outfitBrief: `She is wearing a long camel-colored wool coat that falls just below her knees, double-breasted with large brown horn buttons running down the front, the lapels notched and slightly turned up at the collar. The wool is heavy, slightly textured, with the visible weave of a quality melton fabric — not flat, not synthetic-looking. Underneath the coat, the collar of a cream cable-knit sweater rises softly around her neck. A long thick-knit scarf in a heathered oatmeal cream is wrapped twice around her neck, with the ends falling loose down her chest, the wool fibers fluffy and slightly catching the morning light. Her pants are a dark charcoal wool trouser, straight-cut, breaking cleanly over a pair of dark brown leather Chelsea boots with a subtle patina on the toe caps from real walking. Her hands are bare, slightly pink from the cold, no gloves. Her hair is pulled half-up at the back of her head with a small clip, the rest falling loose over the camel coat — a few strands visibly catching tiny droplets of moisture from the cold air. Small gold hoops in her ears, partially hidden by her hair. Her lips are a warm muted rose, her cheekbones flushed naturally from the cold. The outfit reads quiet, expensive, Scandinavian — every layer functional, every color in the warm-neutral family — camel, oatmeal, charcoal — chosen to harmonize with the winter palette around her.`,
    locationBrief: `The scene takes place on a quiet cobblestone street in Gamla Stan, the old town of Stockholm, around 8:30 AM on a clear morning in mid-January. The sky overhead is a pale washed-out blue, the kind of high arctic blue that comes only after a cold night, with a single thin cloud streak high above. The sun has just risen above the rooftops to the southeast and casts long, low, slightly cool light across the entire scene from a sharp horizontal angle. The narrow street is lined with tall narrow facades painted in deep ochre, soft mustard, and burgundy red, their wooden window frames painted white, their roofs steeply pitched with traces of snow still clinging to the tiles. The cobblestones underfoot are dark grey, glistening in patches where the morning frost has partially melted, with thin white veins of remaining frost visible in the grout lines between stones. A single bicycle is leaned against the wall in the deep background, its frame frosted. A wrought-iron lantern hangs from a wall further down the street, unlit at this hour. Her breath is faintly visible — a soft white plume drifting slowly from her lips into the cold air. The low winter sun catches the camel wool of her coat and warms it to almost honey, throws a long sharp shadow of her body across the cobblestones at a shallow angle, and illuminates the moisture in her exhaled breath turning it briefly luminous. The air is dry, crisp, biting — the kind of cold that makes the inside of the nostrils sting slightly. The street is silent, almost no one else around at this hour. She is visually embedded in this environment — the cold light grazes the texture of her coat and her scarf, picks up the cold flush on her cheeks, and her shadow anchors her body firmly to the cobblestones beneath her feet.`,
  },
  {
    code: "F01-S007",
    name: "Lisbon Alfama afternoon — F1 streetstyle",
    outfitBrief: `She is wearing a pair of vintage straight-leg Levi's-style jeans in a medium-light wash, faded naturally at the thighs and the knees from real wear, slightly cropped at the ankle to reveal a sliver of skin above her shoes. The denim is rigid, broken-in, with the small white frayed threads visible at the hem where they have caught against pavement edges over time. The jeans sit at her natural waist, held by a thin worn brown leather belt with a small brass buckle. Tucked loosely into the waistband, a soft cotton white t-shirt — slightly oversized, the cotton thin enough to read as well-worn rather than new, the neckline a relaxed crew with a tiny pulled thread at the seam. On her feet, a pair of cream-and-red Nike Cortez sneakers, the white leather softened and slightly creased at the toe break, the red swoosh muted from sun. A small thin gold chain with a flat circular pendant rests at the hollow of her throat. Her hair is loose, parted in the middle, falling past her shoulders with a soft natural movement, slightly tousled by the warm afternoon air. Her lips bare, her skin lightly tanned, a few freckles visible across the bridge of her nose. The whole outfit reads Mediterranean lazy — unstudied, comfortable, the kind of outfit assembled in five minutes by someone who knows exactly what they're doing and pretends they didn't try.`,
    locationBrief: `The scene takes place on a steep narrow street in Alfama, Lisbon, around 3:20 PM on a warm afternoon in early June. The sun is high but slightly past zenith, casting strong directional light from the upper right of the frame at roughly a 60-degree angle, creating crisp shadows with hard edges. The street is narrow, climbing gently uphill, paved with the typical Portuguese calçada — small irregular black-and-cream limestone cubes laid in a wave pattern, polished smooth by centuries of foot traffic and slightly uneven underfoot. The buildings on both sides are low, two and three stories tall, their facades covered in azulejo tiles — patterns of cobalt blue on white, geometric on one wall, floral on another, the ceramic glaze catching the sun in small bright reflections. Some tiles are cracked, some are missing entirely, revealing patches of the warm pink-ochre plaster beneath. Wrought-iron balconies project from upper windows, draped with linen sheets and small pots of red geraniums. Laundry hangs on a line stretched between two buildings high above the street, the white sheets catching the breeze. A single old yellow tram is just barely visible in the deep background, paused at the bottom of the hill. A black cat sits motionless in a shaded doorway across the street, watching. The strong sun reflects off the white plaster sections of the facades and bounces a soft warm fill light back onto her, while her main shadow falls sharply across the cobblestones to her left. The air feels warm, dry, carrying the smell of salt from the river not far below and a faint trace of grilled sardines from a tasca somewhere nearby. The street is quiet, that particular quiet of a southern European afternoon when most of the city is napping. She is visually embedded in this environment — the high sun picks up the worn texture of her denim, the soft cotton of her t-shirt, throws her shadow firmly onto the calçada cobbles, and the reflected light from the tile walls touches her skin with a faint warm cast.`,
  },
  {
    code: "F01-S008",
    name: "Berlin Mitte early evening — F1 streetstyle",
    outfitBrief: `She is wearing a black wool turtleneck in a fine merino knit, the fabric snug against her body, the high collar folded once at the neck creating a soft double layer just below her jaw. The sleeves are long, ending past her wrists where she has pushed them up partially to her mid-forearm. Tucked into the waistband, the turtleneck is paired with high-rise straight-leg jeans in a deep saturated black — not faded, not stonewashed, the dye still rich and uniform across the thighs. The jeans break sharply at the ankle, falling just at the top of a pair of black leather Doc Martens 1460 boots with the signature yellow welt stitching, the leather scuffed at the toe caps from genuine use, the laces black, tied with a single loose knot. A wide black leather belt sits at her natural waist, the buckle a small matte silver rectangle. Her only jewelry: two small silver studs in her ears and a thin silver chain bracelet on her left wrist, barely visible under the pushed-up sleeve. Her hair is pulled back into a low bun at the nape of her neck, severe but not tight, with a few short strands falling loose around her face. Her lips are a deep matte burgundy, almost black-red in low light, her eyeliner a soft smudged dark grey along the upper lash line. The whole outfit reads underground — uniform, tonal, deliberate in its refusal of color, the kind of look that disappears into a dark club but reads sharp and intentional in the early evening light.`,
    locationBrief: `The scene takes place on a stretch of Auguststraße in Berlin Mitte, around 7:40 PM on an overcast Friday in late October. The sky overhead is a flat unbroken sheet of deep slate grey, the sun already below the rooftops and casting no direct light — only a soft diffuse ambient that flattens shadows and unifies the entire scene under a cool desaturated blue-grey cast. The street is wide, lined on both sides with tall five and six-story Wilhelmine-era apartment buildings, their facades a mix of cream stucco and exposed brick, many of them tagged with graffiti at street level — sprawling tags in black, silver, and the occasional electric magenta, layered over years. The pavement is a wide concrete sidewalk, slightly cracked, with patches of darker repair concrete visible. Cobblestones run down the center of the street where parked cars sit at angles. A row of bare-branched plane trees lines the curb, their trunks mottled grey and cream. Wide ground-floor windows belong to small art galleries, their interiors dimly lit with single hanging bulbs, the artworks barely visible inside. Tall doorways with old steel double doors painted dark green or oxblood red punctuate the facades every twenty meters, some of them covered in stickers and posters layered over each other in chaotic palimpsests. A single bicycle is locked to a streetlight, its frame matte black. A few people are visible in the deep background, walking individually, all of them in dark clothing, almost blending into the muted palette of the street. The diffuse evening light wraps softly around her body without creating any harsh shadows, picks up the matte surface of her wool turtleneck and the deep saturation of her black jeans, and her own muted shadow is barely perceptible on the concrete beneath her feet — just a soft anchor confirming she stands physically in the scene. The air feels cool, slightly damp, carrying the smell of cigarette smoke from somewhere down the block and the faint metallic note of cold concrete. The street is quiet but not empty — a low hum of distant traffic from Torstraße, the occasional sound of a tram bell several blocks away. She is visually embedded in this environment — the cool flat light unifies her tones with the surrounding palette, her shadow anchors her to the concrete, and her silhouette reads as a deliberate part of the street's visual rhythm rather than a subject pasted onto a backdrop.`,
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

    push("=== patch 5.15c — Seed F01-S004 to S008 ===");

    // --- Pre-flight audit ---
    push("--- Pre-flight audit ---");

    const f1 = await ctx.db.get(F1_PERSONA_ID);
    if (!f1) {
      throw new Error(
        `Pre-flight failed: F1 persona ${F1_PERSONA_ID} not found in DB`,
      );
    }
    push(`F1 persona OK: ${f1.code} (${f1.name})`);

    const f01 = await ctx.db.get(F01_FORMAT_ID);
    if (!f01) {
      throw new Error(
        `Pre-flight failed: F01 format ${F01_FORMAT_ID} not found in DB`,
      );
    }
    if (f01.slideTemplates.length !== 6) {
      throw new Error(
        `Pre-flight failed: F01 format has ${f01.slideTemplates.length} slideTemplates, expected 6`,
      );
    }
    push(`F01 format OK: ${f01.code}, ${f01.slideTemplates.length} slideTemplates`);

    // --- Snapshot slides from F01.slideTemplates (post-5.10 templates) ---
    const snapshotSlides = f01.slideTemplates.map((t) => ({
      slot: t.slot,
      role: t.role,
      visualPrompt: t.promptTemplate,
      overlayText: `Placeholder slide ${t.slot}`,
    }));
    push(`Snapshotted ${snapshotSlides.length} slides from F01.slideTemplates`);

    // --- Insert seeds (idempotent: skip if code already exists) ---
    push("--- Inserting seeds ---");

    const created: Record<string, Id<"scripts">> = {};
    const skipped: string[] = [];
    const now = Date.now();

    for (const entry of SEEDS) {
      const existing = await ctx.db
        .query("scripts")
        .withIndex("by_code", (q) => q.eq("code", entry.code))
        .unique();

      if (existing) {
        push(`SKIP ${entry.code} — already exists (id: ${existing._id})`);
        skipped.push(entry.code);
        continue;
      }

      const insertedId = await ctx.db.insert("scripts", {
        code: entry.code,
        name: entry.name,
        formatId: F01_FORMAT_ID,
        preferredPersonaId: F1_PERSONA_ID,
        outfitBrief: entry.outfitBrief,
        locationBrief: entry.locationBrief,
        slides: snapshotSlides,
        status: "draft",
        notes: undefined,
        createdAt: now,
        updatedAt: now,
      });

      push(`INSERT ${entry.code} — id: ${insertedId}`);
      created[entry.code] = insertedId;
    }

    // --- Summary ---
    push("--- Summary ---");
    push(`Created: ${Object.keys(created).length}`);
    push(`Skipped: ${skipped.length}`);
    push("=== patch 5.15c done ===");

    return {
      log,
      created,
      skipped,
      f1PersonaId: F1_PERSONA_ID,
      f01FormatId: F01_FORMAT_ID,
    };
  },
});
