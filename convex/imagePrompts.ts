// Mode A combinatoire — 5 dicts orthogonaux + tirage filtré par tags.
// Texts copied verbatim from CAROUSEL-STUDIO-PIPE-V2-DICTS.md.

import { query } from "./_generated/server";

export type Lighting =
  | "daylight-natural"
  | "daylight-harsh"
  | "golden-hour"
  | "dim-warm"
  | "dim-cool"
  | "fluorescent"
  | "screen-only"
  | "flexible";

export type Energy = "high" | "medium" | "low" | "flexible";

export type Social = "alone" | "with-others" | "intimate-pair" | "flexible";

export type Space =
  | "indoor-private"
  | "indoor-public"
  | "outdoor-urban"
  | "outdoor-nature"
  | "transit"
  | "medical"
  | "flexible";

export type Gender = "feminine" | "masculine" | "neutral";

export type Tags = {
  lighting: Lighting;
  energy: Energy;
  social: Social;
  space: Space;
  // 5th dimension. Orthogonal to the 4 above. Filtering rule is strict
  // match against the persona's gender, with `neutral` always allowed.
  // No `flexible` value here — entries are explicitly feminine, masculine,
  // or neutral.
  gender: Gender;
};

export type DictEntry = {
  id: string;
  text: string;
  displayName: string; // human-readable French label, UI only
  tags: Tags;
  deprecated?: boolean;
};

// IDs of EMOTIONAL_STATES kept in the array for legacy lookup of historical
// images, but excluded from the draw pool. Their generated content was
// "stock-photo apex" and produced too-posed results.
const DEPRECATED_EMOTION_IDS: ReadonlySet<string> = new Set([
  "soft-natural-smile",
  "genuinely-laughing",
  "crying-stopped-crying",
  "pure-joy-mid-shout",
  "annoyed-jaw-set",
  "surprised-caught-off-guard",
  "grateful-genuine",
  "doubtful-skeptical",
  "confident-direct-gaze",
  "playful-tongue-out",
]);

// Per-persona weighting + mood injection. Optional everywhere; missing fields
// fall back to uniform draw / no injection. Multipliers are applied to the
// uniform draw weight (1.0 = unchanged, 2.0 = twice as likely, 0.5 = half).
export type EmotionMoodCategory =
  | "melancholic"
  | "energetic"
  | "confident"
  | "serene"
  | "tired";

export type SpaceWeightKey =
  | "indoor-private"
  | "indoor-public"
  | "outdoor-urban"
  | "outdoor-nature"
  | "transit"
  | "medical";

export type RegisterWeightKey =
  | "iphone-natural-daylight-soft"
  | "iphone-bright-sunlight-harsh"
  | "iphone-golden-hour-warm"
  | "iphone-low-light-warm-bulbs"
  | "iphone-low-light-cool-streetlight"
  | "iphone-fluorescent-medical"
  | "iphone-screen-glow-dark"
  | "iphone-hdr-backlight-window"
  | "iphone-vintage-grainy-soft";

export type PersonaStylePreferences = {
  moodDescriptor?: string;
  emotionWeights?: Record<EmotionMoodCategory, number>;
  spaceWeights?: Record<SpaceWeightKey, number>;
  registerWeights?: Record<RegisterWeightKey, number>;
};

// Filters narrow the pool of SITUATIONS before drawing. Empty / undefined
// arrays mean "no filter on this dimension".
export type CombinationFilters = {
  lighting?: Lighting[];
  energy?: Energy[];
  social?: Social[];
  space?: Space[];
};

// === IDENTITY_ANCHOR =====================================================

const IDENTITY_ANCHOR_OPENING = `The person in the attached reference image. Match her face exactly: bone structure, eye shape and color, nose, lips, jawline, hair texture and color. She must be instantly recognizable as the same person across every photo.`;

function buildIdentityBlock(
  identityDescription: string,
  signatureFeatures?: string,
): string {
  const sig = signatureFeatures?.trim();
  if (sig) {
    return `${IDENTITY_ANCHOR_OPENING}

CRITICAL — PERMANENT IDENTITY MARKERS:
${sig}

These markers are part of her permanent identity. They must be clearly visible in every photo where the relevant body part is in frame. Do not omit them, do not soften them, do not move them — they are as fixed as her eye color or her facial bone structure.

${identityDescription}`;
  }
  return `${IDENTITY_ANCHOR_OPENING}

${identityDescription}`;
}

// === SITUATIONS (224) ====================================================

export const SITUATIONS: DictEntry[] = [
  // === INDOOR PRIVATE — bedroom / morning / rest ===
  {
    id: "bed-morning-just-woke-up",
    text: "She's lying in bed in the morning, hair messy across the pillow, bare shoulders or oversized t-shirt visible. White rumpled bedding around her face. The room is filled with soft morning daylight from a nearby window.",
    displayName: "Réveil au lit",
    tags: { lighting: "daylight-natural", energy: "low", social: "alone", space: "indoor-private", gender: "neutral" },
  },
  {
    id: "bed-night-scrolling",
    text: "She's lying in bed in a dark room at night, holding her phone above her face out of frame, only the light from the phone screen illuminating her face from above. The phone itself is not visible — only its blue-white light cast on her skin. Bedding visible around her in deep shadow. T-shirt, hair loose on the pillow.",
    displayName: "Lit nuit / téléphone",
    tags: { lighting: "screen-only", energy: "low", social: "alone", space: "indoor-private", gender: "neutral" },
  },
  {
    id: "bed-afternoon-nap",
    text: "She's curled up on top of her made bed in the afternoon, wearing leggings and an oversized t-shirt, blanket half-covering her. Soft daylight through partially closed blinds, the room warm and lazy.",
    displayName: "Sieste après-midi",
    tags: { lighting: "daylight-natural", energy: "low", social: "alone", space: "indoor-private", gender: "neutral" },
  },
  {
    id: "bedroom-getting-dressed",
    text: "She's in her bedroom in the morning, fully dressed in casual clothes, holding up a top or sweater to decide if she wants to wear it instead. Closet open behind her with clothes on hangers, bed unmade with rumpled sheets, daylight from a window. The vibe is 'choosing what to wear today', everyday domestic moment.",
    displayName: "Choix d'outfit chambre",
    tags: { lighting: "daylight-natural", energy: "medium", social: "alone", space: "indoor-private", gender: "feminine" },
  },
  {
    id: "bathroom-mirror-skincare",
    text: "She's in front of the bathroom mirror doing her skincare routine. Bottles and tubes on the counter, hair pulled back, face slightly shiny from product. Bathroom light from above.",
    displayName: "Skincare miroir",
    tags: { lighting: "daylight-natural", energy: "low", social: "alone", space: "indoor-private", gender: "feminine" },
  },
  {
    id: "bathroom-after-shower",
    text: "She's in the bathroom just out of the shower, hair wet and dripping, towel wrapped around her body. Foggy mirror partially clearing, condensation on the bathroom tiles.",
    displayName: "Sortie de douche",
    tags: { lighting: "daylight-natural", energy: "low", social: "alone", space: "indoor-private", gender: "neutral" },
  },
  {
    id: "bathroom-floor-crying",
    text: "She's sitting on the bathroom floor against the bathtub, knees up, phone face-down beside her. Tear streaks visible on her cheeks. The bathroom light is dim, only one lamp or the overhead light on.",
    displayName: "Sol salle de bain en pleurs",
    tags: { lighting: "dim-warm", energy: "low", social: "alone", space: "indoor-private", gender: "neutral" },
  },

  // === INDOOR PRIVATE — kitchen / living room / domestic ===
  {
    id: "kitchen-morning-coffee",
    text: "She's standing at her kitchen counter in the morning, mug of coffee in hand, wearing pajamas or an oversized t-shirt. Coffee maker, half-eaten toast, scattered objects on the counter. Soft morning light from the window.",
    displayName: "Café cuisine matin",
    tags: { lighting: "daylight-natural", energy: "low", social: "alone", space: "indoor-private", gender: "neutral" },
  },
  {
    id: "kitchen-doing-dishes",
    text: "She's standing at her kitchen sink doing the dishes, in a worn oversized t-shirt and sweatpants. Dirty dishes still visible, dish towel in hand, kitchen counter messy with daily clutter. Window above the sink.",
    displayName: "Vaisselle cuisine",
    tags: { lighting: "daylight-natural", energy: "medium", social: "alone", space: "indoor-private", gender: "neutral" },
  },
  {
    id: "kitchen-cooking-dinner",
    text: "She's cooking in her home kitchen, mid-action stirring or chopping. Pans on the stove, ingredients on the counter, slight steam, casual evening outfit. Warm kitchen lights on overhead.",
    displayName: "Cuisine en train de cuisiner",
    tags: { lighting: "dim-warm", energy: "medium", social: "alone", space: "indoor-private", gender: "neutral" },
  },
  {
    id: "couch-evening-blanket",
    text: "She's curled up on the couch in the evening under a blanket, mug forgotten on the coffee table beside her. The TV is glowing off-screen, casting soft moving light on her face. Hoodie or oversized cardigan.",
    displayName: "Canapé soir plaid",
    tags: { lighting: "dim-warm", energy: "low", social: "alone", space: "indoor-private", gender: "neutral" },
  },
  {
    id: "couch-afternoon-laptop",
    text: "She's sitting on the couch in the afternoon with her laptop on her thighs, working or watching something. Cup of tea or coffee beside her, headphones on, casual at-home outfit. Daylight from a window.",
    displayName: "Canapé après-midi laptop",
    tags: { lighting: "daylight-natural", energy: "medium", social: "alone", space: "indoor-private", gender: "neutral" },
  },
  {
    id: "couch-with-pet",
    text: "She's lying on the couch scrolling her phone, with a cat or small dog curled up against her side. Cozy indoor evening setting, soft warm lamp light, blanket partially over her.",
    displayName: "Canapé avec animal",
    tags: { lighting: "dim-warm", energy: "low", social: "alone", space: "indoor-private", gender: "neutral" },
  },
  {
    id: "windowsill-watering-plants",
    text: "She's at the windowsill watering her plants in the morning, bare feet, casual at-home clothes, watering can in hand. Soft morning light hitting the plants and her face.",
    displayName: "Arrosage plantes fenêtre",
    tags: { lighting: "daylight-natural", energy: "low", social: "alone", space: "indoor-private", gender: "neutral" },
  },
  {
    id: "tidying-bedroom",
    text: "She's tidying her bedroom — making the bed or folding clothes. Casual at-home clothes, hair pulled up loosely, focused on the task. Both her hands are busy with what she's tidying. Daylight from the window.",
    displayName: "Rangement chambre",
    tags: { lighting: "daylight-natural", energy: "medium", social: "alone", space: "indoor-private", gender: "neutral" },
  },
  {
    id: "edge-of-bed-after-shower",
    text: "She's sitting on the edge of her bed wrapped in a towel, hair still wet, scrolling on her phone or zoning out. The bedroom is lit by soft late-afternoon light through the blinds.",
    displayName: "Bord du lit post-douche",
    tags: { lighting: "daylight-natural", energy: "low", social: "alone", space: "indoor-private", gender: "neutral" },
  },
  {
    id: "floor-against-bed-thinking",
    text: "She's sitting on the bedroom floor with her back against the bed, knees up, phone in hand or staring off. No makeup, hair untidy, oversized t-shirt or hoodie.",
    displayName: "Sol contre lit pensive",
    tags: { lighting: "dim-warm", energy: "low", social: "alone", space: "indoor-private", gender: "neutral" },
  },
  {
    id: "edge-of-bed-sad",
    text: "She's sitting on the edge of the bed in the late afternoon, head down, hands clasped in her lap. Soft window light from the side. Quiet sadness, not dramatic.",
    displayName: "Bord du lit triste",
    tags: { lighting: "daylight-natural", energy: "low", social: "alone", space: "indoor-private", gender: "feminine" },
  },

  // === INDOOR PRIVATE — getting ready / before going out ===
  {
    id: "vanity-doing-makeup",
    text: "She's at her vanity or bathroom mirror doing her makeup before going out. Bottles, brushes, palette spread out. Mirror light or window light on her face. Half-done look.",
    displayName: "Maquillage vanity",
    tags: { lighting: "daylight-natural", energy: "medium", social: "alone", space: "indoor-private", gender: "feminine" },
  },
  {
    id: "trying-on-outfits",
    text: "She's in her bedroom trying on outfits, multiple options thrown on the bed behind her, half-dressed in something she's evaluating. Mirror partially visible. Daylight from the window.",
    displayName: "Essayage tenues",
    tags: { lighting: "daylight-natural", energy: "medium", social: "alone", space: "indoor-private", gender: "feminine" },
  },

  // === INDOOR PUBLIC — café / bar / restaurant ===
  {
    id: "cafe-table-alone-laptop",
    text: "She's sitting alone at a cafe corner table, laptop open in front of her, mug in hand, focused or thinking expression. Soft afternoon light through the cafe window.",
    displayName: "Café seule laptop",
    tags: { lighting: "daylight-natural", energy: "medium", social: "alone", space: "indoor-public", gender: "neutral" },
  },
  {
    id: "cafe-table-alone-book",
    text: "She's sitting alone at a small cafe table, book open or coffee in hand. Window light from the side. Pastry or croissant on a plate beside her.",
    displayName: "Café seule lecture",
    tags: { lighting: "daylight-natural", energy: "low", social: "alone", space: "indoor-public", gender: "feminine" },
  },
  {
    id: "cafe-with-friend",
    text: "She's at a cafe table with a friend, mid-conversation, coffee cups between them. Friend's hand or arm partially visible at the edge of the frame. Daylight from the cafe window.",
    displayName: "Café avec un·e ami·e",
    tags: { lighting: "daylight-natural", energy: "medium", social: "with-others", space: "indoor-public", gender: "neutral" },
  },
  {
    id: "cafe-takeaway-leaving",
    text: "She's about to leave the cafe, takeaway cup in one hand, bag on her shoulder, looking at her phone for the next thing. Cafe interior slightly visible behind her.",
    displayName: "Café à emporter sortie",
    tags: { lighting: "daylight-natural", energy: "medium", social: "alone", space: "indoor-public", gender: "neutral" },
  },
  {
    id: "wine-bar-mid-conversation",
    text: "She's at a small wine bar in the evening, sitting at a wooden table. A half-full glass of red wine in front of her, a candle in a small glass holder casting warm light on her face from below. Other tables and people slightly visible and out of focus in the background. Wearing a casual going-out top.",
    displayName: "Bar à vin conversation",
    tags: { lighting: "dim-warm", energy: "medium", social: "with-others", space: "indoor-public", gender: "neutral" },
  },
  {
    id: "restaurant-dinner-friends",
    text: "She's at a restaurant table with friends, mid-meal. Plates and glasses on the table, friends partially visible across from her, warm restaurant lighting, candle or pendant lamp.",
    displayName: "Dîner restaurant entre ami·es",
    tags: { lighting: "dim-warm", energy: "medium", social: "with-others", space: "indoor-public", gender: "neutral" },
  },
  {
    id: "bar-night-laughing",
    text: "She's at a dim bar at night, drink in hand, mid-laugh at something a friend just said. Warm pendant light or candle on her face, blurred crowd and bar shelves behind her.",
    displayName: "Bar nuit éclats de rire",
    tags: { lighting: "dim-warm", energy: "high", social: "with-others", space: "indoor-public", gender: "neutral" },
  },

  // === INDOOR PUBLIC — gym / fitting room / store ===
  {
    id: "gym-mirror-after-workout",
    text: "She's just finished a workout and is taking a quick mirror selfie in the gym locker area or by a wall mirror. Sports bra and leggings, slightly sweaty, hair pulled up in a messy bun. Equipment or lockers visible behind.",
    displayName: "Miroir gym post-séance",
    tags: { lighting: "fluorescent", energy: "medium", social: "alone", space: "indoor-public", gender: "neutral" },
  },
  {
    id: "gym-mid-workout",
    text: "He's mid-workout at the gym, slightly out of breath, sweat on his forehead. Sportswear, equipment in the background. Bright gym lighting.",
    displayName: "Gym en pleine séance",
    tags: { lighting: "fluorescent", energy: "high", social: "alone", space: "indoor-public", gender: "masculine" },
  },
  {
    id: "fitting-room-trying-dress",
    text: "She's in a clothing store fitting room trying on a new outfit. Both her hands are busy with the clothing — adjusting the fabric of the top she's wearing, holding up another garment to compare, or pulling at a sleeve to check the fit. Curtain or wall behind her, slight shadow from the fitting room overhead light. Looking at herself with a doubtful or pleased expression.",
    displayName: "Cabine d'essayage robe",
    tags: { lighting: "fluorescent", energy: "low", social: "alone", space: "indoor-public", gender: "feminine" },
  },
  {
    id: "elevator-tight-frame",
    text: "She's in an apartment building elevator, tight frame, mirrored back wall. Outfit-of-the-day vibe, bag in hand, phone in the other.",
    displayName: "Ascenseur cadré serré",
    tags: { lighting: "fluorescent", energy: "low", social: "alone", space: "indoor-public", gender: "neutral" },
  },
  {
    id: "convenience-store-aisle",
    text: "She's in a convenience store at night, standing in an aisle deciding what to buy. Bright fluorescent overhead light, snacks and drinks on the shelves, basket in hand.",
    displayName: "Supérette rayon",
    tags: { lighting: "fluorescent", energy: "medium", social: "alone", space: "indoor-public", gender: "neutral" },
  },

  // === OUTDOOR URBAN — street / sidewalk / city ===
  {
    id: "city-street-walking-day",
    text: "She's walking down a city street alone in the daytime, urban architecture behind her, real pedestrians slightly visible at the edges. Casual outfit, bag on her shoulder.",
    displayName: "Rue ville jour marche",
    tags: { lighting: "daylight-harsh", energy: "medium", social: "alone", space: "outdoor-urban", gender: "neutral" },
  },
  {
    id: "city-street-night-walking",
    text: "She's walking on a city street at night, streetlight glow above her, slight motion blur in the background, going-out outfit or casual depending on the vibe.",
    displayName: "Rue ville nuit marche",
    tags: { lighting: "dim-cool", energy: "medium", social: "alone", space: "outdoor-urban", gender: "neutral" },
  },
  {
    id: "apartment-steps-waiting-uber",
    text: "She's sitting on the front steps of a typical apartment building or row house in the late afternoon, waiting for her Uber. Wearing a faded gray hoodie unzipped over a black tank top, baggy jeans, beat-up white sneakers. A small handbag beside her on the step. Phone in one hand checking the app.",
    displayName: "Marches immeuble attente Uber",
    tags: { lighting: "golden-hour", energy: "low", social: "alone", space: "outdoor-urban", gender: "neutral" },
  },
  {
    id: "city-plaza-bench-sunny",
    text: "She's sitting on a concrete bench in a city plaza on a sunny afternoon. A small leather bag beside her. A glass of iced drink in her hand, condensation visible. Trees and concrete buildings behind her. Black sunglasses pushed up on her head.",
    displayName: "Banc place ensoleillée",
    tags: { lighting: "daylight-harsh", energy: "medium", social: "alone", space: "outdoor-urban", gender: "neutral" },
  },
  {
    id: "leaving-corner-store-night",
    text: "She's walking out of a corner store at night with a plastic bag in her hand, ice cream or snacks visible. Streetlight overhead, dim residential street, casual at-home outfit.",
    displayName: "Sortie épicerie nuit",
    tags: { lighting: "dim-cool", energy: "low", social: "alone", space: "outdoor-urban", gender: "neutral" },
  },
  {
    id: "crosswalk-mid-step",
    text: "She's crossing the street, caught mid-step, slight motion. Cars and street life in the background, casual urban outfit, daylight.",
    displayName: "Passage piéton en marche",
    tags: { lighting: "daylight-harsh", energy: "medium", social: "alone", space: "outdoor-urban", gender: "neutral" },
  },
  {
    id: "rooftop-night-string-lights",
    text: "She's on a rooftop at night with city lights behind her. Soft warm light from a string of bulbs or a heater. Drink in hand, going-out outfit, slight evening chill.",
    displayName: "Rooftop nuit guirlandes",
    tags: { lighting: "dim-warm", energy: "medium", social: "with-others", space: "outdoor-urban", gender: "neutral" },
  },
  {
    id: "park-bench-friend",
    text: "She's at a park sitting on the grass or a bench, caught mid-laugh. A friend's hand or shoulder visible at the edge of the frame. Real depth in the background — trees, distant people.",
    displayName: "Parc ami·e banc",
    tags: { lighting: "daylight-natural", energy: "high", social: "with-others", space: "outdoor-nature", gender: "neutral" },
  },
  {
    id: "restaurant-terrace-day",
    text: "She's at a restaurant terrace in the daytime, glass of wine or coffee on the table, looking at the camera with a relaxed smile. Sunlight through awnings or trees, other diners blurred in the background.",
    displayName: "Terrasse restaurant jour",
    tags: { lighting: "daylight-natural", energy: "medium", social: "with-others", space: "outdoor-urban", gender: "neutral" },
  },
  {
    id: "outdoor-cafe-terrace-iced",
    text: "She's at an outdoor cafe terrace on a sunny day. Sunglasses on the table, half-finished iced drink in front of her, casual outfit. Other terrace tables visible at the edges.",
    displayName: "Terrasse café boisson glacée",
    tags: { lighting: "daylight-harsh", energy: "low", social: "alone", space: "outdoor-urban", gender: "neutral" },
  },

  // === OUTDOOR NATURE / VACATION ===
  {
    id: "hiking-trail-resting",
    text: "She's on a hiking trail, backpack on, slightly out of breath, sitting on a rock or log resting. Mountains, forest, or rocky landscape behind her. Bright outdoor light.",
    displayName: "Pause sentier de randonnée",
    tags: { lighting: "daylight-harsh", energy: "medium", social: "alone", space: "outdoor-nature", gender: "neutral" },
  },
  {
    id: "beach-walking-casual",
    text: "She's walking along a beach in casual clothes, bare feet on the wet sand, hair slightly windswept. Ocean to one side, footprints behind her.",
    displayName: "Marche plage casual",
    tags: { lighting: "daylight-natural", energy: "low", social: "alone", space: "outdoor-nature", gender: "neutral" },
  },
  {
    id: "hotel-pool-lounger",
    text: "She's by a hotel pool on a lounger, swimsuit, sunglasses on. Drink on the side table, towel beside her. Tropical or summer atmosphere, bright sun.",
    displayName: "Transat piscine hôtel",
    tags: { lighting: "daylight-harsh", energy: "low", social: "alone", space: "outdoor-nature", gender: "neutral" },
  },
  {
    id: "balcony-morning-coffee-vacation",
    text: "She's on a hotel or apartment balcony with a sea or city view, morning coffee in hand, robe or summer outfit. Soft early light on her face.",
    displayName: "Balcon café vacances",
    tags: { lighting: "daylight-natural", energy: "low", social: "alone", space: "outdoor-urban", gender: "feminine" },
  },
  {
    id: "foreign-market-exploring",
    text: "She's exploring a foreign market or narrow street. Colorful stalls or local architecture, casual travel outfit, daylight. Tourists and locals slightly visible.",
    displayName: "Marché étranger exploration",
    tags: { lighting: "daylight-natural", energy: "medium", social: "alone", space: "outdoor-urban", gender: "neutral" },
  },

  // === TRANSIT ===
  {
    id: "uber-back-seat-night",
    text: "She's sitting in the back of an Uber at night, head resting against the window, city lights passing as colored bokeh outside. Going-out outfit or casual evening.",
    displayName: "Banquette arrière Uber nuit",
    tags: { lighting: "dim-cool", energy: "low", social: "alone", space: "transit", gender: "neutral" },
  },
  {
    id: "passenger-seat-car-day",
    text: "She's in the passenger seat of a car during the day. Seatbelt visible across her chest, daylight through the window, sunglasses pushed up on her head. Casual outfit.",
    displayName: "Passagère voiture jour",
    tags: { lighting: "daylight-natural", energy: "medium", social: "alone", space: "transit", gender: "neutral" },
  },
  {
    id: "driving-night-red-light",
    text: "She's driving home alone at night at a red light, hands on the wheel, hair slightly messy. The dashboard glow is the main light on her face. Empty street outside, occasional headlights of other cars.",
    displayName: "Conduite nuit feu rouge",
    tags: { lighting: "dim-cool", energy: "low", social: "alone", space: "transit", gender: "neutral" },
  },

  // === MEDICAL ===
  {
    id: "hospital-bed-iv-alone",
    text: "She's lying propped up in a hospital bed, white blanket pulled up to her waist. Wearing a faded blue patterned hospital gown. Hospital wristband on her wrist. An IV line taped to the back of her hand running off-frame to a stand. Hair greasy and unbrushed, no makeup, the slight pallor of someone who's been there for hours. Hospital monitor and equipment visible on the wall behind.",
    displayName: "Lit hôpital seule perfusion",
    tags: { lighting: "fluorescent", energy: "low", social: "alone", space: "medical", gender: "feminine" },
  },
  {
    id: "hospital-bed-visitor-chair-pov",
    text: "She's in a hospital bed seen from the visitor chair beside her. The bed rail is in the foreground, part of the IV stand visible at the edge of the frame, hospital monitor and equipment behind her. She's looking down or zoning out, not at the camera.",
    displayName: "Hôpital POV chaise visiteur",
    tags: { lighting: "fluorescent", energy: "low", social: "alone", space: "medical", gender: "neutral" },
  },

  // === WITH PARTNER (intimate-pair) ===
  {
    id: "couple-couch-cuddling",
    text: "She's on the couch with her partner in a single moment captured from one angle. Her head resting on his chest, his arm wrapped around her shoulders. A blanket partially over them. Both wearing casual at-home clothes. The living room is warm and low-lit by a single lamp.",
    displayName: "Couple câlin canapé",
    tags: { lighting: "dim-warm", energy: "low", social: "intimate-pair", space: "indoor-private", gender: "feminine" },
  },
  {
    id: "couple-restaurant-eyes-locked",
    text: "She's at a restaurant table across from her partner, leaning toward each other, eyes locked, mid-conversation. Glasses of wine between them, candle flickering, warm restaurant lighting.",
    displayName: "Couple restaurant regards",
    tags: { lighting: "dim-warm", energy: "medium", social: "intimate-pair", space: "indoor-public", gender: "neutral" },
  },
  {
    id: "couple-walking-hand-in-hand",
    text: "She's walking hand in hand with her partner down a city street, both seen from behind in a single wide shot. Their joined hands are visible at the center of the frame. Both wearing casual outfits, daylight, real city sidewalk with parked cars and buildings on one side.",
    displayName: "Couple marche main dans la main",
    tags: { lighting: "daylight-natural", energy: "medium", social: "intimate-pair", space: "outdoor-urban", gender: "neutral" },
  },
  {
    id: "couple-bed-morning",
    text: "She's in bed in the morning with her partner asleep behind her, his arm draped over her waist or his head resting against her shoulder. Both visible in the frame, their two faces or two bodies clearly part of the composition. Tangled white sheets, soft morning light from a window, intimate domestic moment, both still half-asleep.",
    displayName: "Couple lit matin",
    tags: { lighting: "daylight-natural", energy: "low", social: "intimate-pair", space: "indoor-private", gender: "feminine" },
  },

  // === MISC HIGH-INTERIORITY ===
  {
    id: "window-rain-melancholic",
    text: "She's standing or sitting by a single rain-streaked window, looking out. A faint reflection of her face is visible on the wet glass. The outdoor scene through the window is grey and wet, the indoor light is soft and dim. The frame is a single tight shot of her against the window.",
    displayName: "Fenêtre pluie mélancolie",
    tags: { lighting: "dim-cool", energy: "low", social: "alone", space: "indoor-private", gender: "feminine" },
  },
  {
    id: "kitchen-arms-crossed-disappointed",
    text: "She's standing alone in the kitchen with her arms crossed, looking down. Disappointed body language, casual at-home outfit. Soft indoor light, slightly cluttered kitchen counter behind her.",
    displayName: "Cuisine bras croisés déçue",
    tags: { lighting: "daylight-natural", energy: "low", social: "alone", space: "indoor-private", gender: "feminine" },
  },
  {
    id: "phone-frown-disappointed-couch",
    text: "She's on the couch reading something on her phone with a disappointed expression. Slight frown, lips pressed. Casual indoor neutral light, blanket or pillow visible.",
    displayName: "Canapé téléphone déçue",
    tags: { lighting: "daylight-natural", energy: "low", social: "alone", space: "indoor-private", gender: "feminine" },
  },

  // === CONCERT / LIVE MUSIC ===
  {
    id: "concert-crowd-singing",
    text: "She's in the middle of a concert crowd, stage lights in the background lighting up purple and red, hands raised, mid-singing along with the crowd. Other concertgoers around her partially visible, slightly out of focus. The atmosphere is dense, energetic, sweaty.",
    displayName: "Concert foule chant",
    tags: { lighting: "dim-warm", energy: "high", social: "with-others", space: "indoor-public", gender: "neutral" },
  },
  {
    id: "concert-front-row-phone-up",
    text: "She's at the front row of a concert, leaning against the barrier, the stage right behind/above her with stage lights spilling over — purple, red, or pink light hitting her face from above. The performer is partially out of focus behind. Her phone is held up casually, not filming, just in her hand. She's looking up toward the stage.",
    displayName: "Concert premier rang",
    tags: { lighting: "dim-warm", energy: "high", social: "with-others", space: "indoor-public", gender: "neutral" },
  },
  {
    id: "festival-day",
    text: "She's at a music festival during the day. Festival wristband on her wrist, casual summer outfit (tank top, shorts or denim, sunglasses pushed up). Stage or crowd partially visible behind her, festival flags or stage rigging in the background, sunny daylight. Loose, relaxed, festival energy.",
    displayName: "Festival jour",
    tags: { lighting: "daylight-harsh", energy: "medium", social: "with-others", space: "outdoor-nature", gender: "neutral" },
  },

  // === PARTY / NIGHT OUT ===
  {
    id: "party-kitchen-mid-laugh",
    text: "She's in someone's apartment kitchen during a house party, drink in hand (red solo cup, beer, or wine glass), mid-laugh at something a friend just said. Other people partially visible around her in the kitchen, slightly out of focus, drinks and snacks on the counter behind her. Warm overhead kitchen light, casual going-out outfit.",
    displayName: "Soirée cuisine éclat de rire",
    tags: { lighting: "dim-warm", energy: "high", social: "with-others", space: "indoor-private", gender: "feminine" },
  },
  {
    id: "party-dancing-crowd",
    text: "She's on a dance floor at a party or club, mid-movement, colored lights (red, blue, purple) sweeping across the scene. Other dancers around her partially blurred from motion. Her hair is moving, her face caught mid-action. The vibe is dense and immersive.",
    displayName: "Soirée danse foule",
    tags: { lighting: "dim-warm", energy: "high", social: "with-others", space: "indoor-public", gender: "neutral" },
  },
  {
    id: "night-out-bathroom-mirror-friends",
    text: "She's in the bathroom of a bar or club with a female friend, both standing in front of the mirror, fixing makeup or just hanging out. Harsh fluorescent overhead light, slightly dirty mirror, the typical worn club bathroom aesthetic. Going-out outfits, both relaxed and chatting.",
    displayName: "Toilettes club entre ami·es",
    tags: { lighting: "fluorescent", energy: "medium", social: "with-others", space: "indoor-public", gender: "feminine" },
  },
  {
    id: "backstage-bathroom-getting-ready",
    text: "She's in the bathroom of a bar or apartment getting ready before going out, doing a final makeup check or fixing her hair. Bathroom mirror in the foreground, bottles and makeup items on the counter, going-out outfit visible. Bathroom light is bright but slightly unflattering, the kind of pre-party energy where she's almost ready.",
    displayName: "Préparation salle de bain avant sortie",
    tags: { lighting: "fluorescent", energy: "medium", social: "alone", space: "indoor-private", gender: "neutral" },
  },

  // === ROAD TRIP / CAR ===
  {
    id: "roadtrip-passenger-window",
    text: "She's in the passenger seat of a car on a road trip, looking out the window. Landscape outside is moving fast — fields, mountains, or highway with slight motion blur. Sunlight hitting one side of her face, hair slightly tousled. Casual outfit, seatbelt visible. The vibe is contemplative, traveling.",
    displayName: "Road trip passagère fenêtre",
    tags: { lighting: "daylight-natural", energy: "low", social: "alone", space: "transit", gender: "feminine" },
  },
  {
    id: "roadtrip-gas-station-night",
    text: "She's standing outside a gas station at night, the harsh fluorescent canopy lights from above casting cool light on her. Snacks or a drink in her hand, casual road-trip outfit. The car is partially visible behind her, the gas pumps and the dark highway in the background. The vibe is the middle-of-nowhere late-night pause on a long drive.",
    displayName: "Station-service nuit road trip",
    tags: { lighting: "fluorescent", energy: "low", social: "alone", space: "outdoor-urban", gender: "neutral" },
  },

  // === VACATION — MEDITERRANEAN / EUROPE ===
  {
    id: "mediterranean-terrace-sunset",
    text: "She's at a small cafe or restaurant terrace overlooking the Mediterranean Sea or a coastal European town in the late afternoon. Glass of white wine or aperitivo on the table, golden warm light from the setting sun, sea or terracotta rooftops in the background. Relaxed summer outfit, slight sun on the skin. Vibe of Italy or Greece in summer.",
    displayName: "Terrasse Méditerranée coucher de soleil",
    tags: { lighting: "golden-hour", energy: "low", social: "alone", space: "outdoor-urban", gender: "neutral" },
  },
  {
    id: "cobblestone-street-walking-summer",
    text: "She's walking down a narrow cobblestone street in a European old town in summer. Old colorful buildings with shutters on either side, occasional flowers or laundry visible at windows, warm midday or late afternoon light. Light summer outfit (sundress, tank top with shorts, or linen). Casual unposed walking pace.",
    displayName: "Rue pavée Europe été",
    tags: { lighting: "daylight-natural", energy: "medium", social: "alone", space: "outdoor-urban", gender: "neutral" },
  },
  {
    id: "boat-day-water",
    text: "She's on a boat in the middle of the day, blue Mediterranean or tropical water visible behind her, wind in her hair, casual swimsuit or summer outfit. The boat's railing or deck partially visible. Bright sunlight, sun on her skin, slight squint from the brightness. Vibe of a vacation day on the water.",
    displayName: "Bateau jour mer",
    tags: { lighting: "daylight-harsh", energy: "low", social: "alone", space: "outdoor-nature", gender: "neutral" },
  },

  // === VACATION — ASIA / RUSSIA ===
  {
    id: "asia-street-market-evening",
    text: "She's exploring a busy street market in an Asian city in the evening — narrow alleys with hanging lanterns, food stalls with steam rising, neon signs in Chinese or Japanese characters glowing pink and blue. Crowded but immersive. She's looking around, casual travel outfit, possibly holding a takeaway food item. Vibe of Tokyo, Bangkok, or Hong Kong nightlife exploration.",
    displayName: "Marché de rue Asie soir",
    tags: { lighting: "dim-warm", energy: "medium", social: "alone", space: "outdoor-urban", gender: "neutral" },
  },
  {
    id: "russia-snowy-square-winter",
    text: "She's standing in a large snowy public square in a Russian or Eastern European winter city, ornate historical buildings or onion-domed architecture visible in the background, falling snow or fresh snow on the ground. Heavy winter coat, scarf, possibly fur hat, breath visible in the cold air. Cold gray-blue daylight. Vibe of Moscow or Saint Petersburg in winter.",
    displayName: "Place enneigée Russie hiver",
    tags: { lighting: "daylight-natural", energy: "low", social: "alone", space: "outdoor-urban", gender: "neutral" },
  },

  // === LOOKSMAXXING / FLEX / FIT-CHECK ===
  {
    id: "mirror-selfie-shirt-lifted-flex",
    text: "Mirror selfie in a bedroom or bathroom. He's standing facing the mirror, holding the phone at chest level with one hand. The other hand is lifting the bottom of his t-shirt halfway up to reveal his abs and lower stomach in a casual fit-check moment. Slight tilt of the head looking down at the phone screen, jaw relaxed. Tattoos, chains or jewelry partially visible. The room behind has typical bedroom or bathroom clutter, lived-in.",
    displayName: "Selfie miroir t-shirt soulevé flex",
    tags: { lighting: "flexible", energy: "low", social: "alone", space: "indoor-private", gender: "masculine" },
  },
  {
    id: "mirror-gym-tank-top-flex",
    text: "Mirror selfie in the gym, post-workout. He's wearing a black or grey tank top, slight sheen of sweat on the shoulders and chest. Standing at a slight side angle to the mirror, holding the phone at chest level, looking down at the screen. Gym equipment partially visible behind him in the changing room or main floor. Fluorescent overhead lighting.",
    displayName: "Miroir gym tank top flex",
    tags: { lighting: "fluorescent", energy: "low", social: "alone", space: "indoor-public", gender: "masculine" },
  },
  {
    id: "bathroom-mirror-sheetmask",
    text: "Mirror selfie in a tiled bathroom, late evening. He's shirtless, wearing only a towel or sweatpants. A white sheet face mask is on his face, eyes closed or barely open behind the holes. He's holding the phone with one hand, the other hand near his face adjusting the mask. Slight wet hair from a recent shower. The bathroom has typical clutter — products on the counter, towel hung up.",
    displayName: "Selfie miroir masque tissu",
    tags: { lighting: "dim-warm", energy: "low", social: "alone", space: "indoor-private", gender: "masculine" },
  },
  {
    id: "post-shower-wet-hair-mirror",
    text: "Mirror selfie just out of the shower in his bathroom. Hair is fully wet and slicked back or messy, water droplets visible on his shoulders and chest. He's shirtless or has a towel around his waist. Holding the phone at chest level facing the mirror. Bathroom mirror partially fogged at the edges, condensation visible. Soft warm bathroom light.",
    displayName: "Selfie miroir post-douche cheveux mouillés",
    tags: { lighting: "dim-warm", energy: "low", social: "alone", space: "indoor-private", gender: "masculine" },
  },
  {
    id: "pool-deck-shirtless-relaxed",
    text: "He's lying or sitting on a pool deck or by the side of a pool. Shirtless, wearing swim shorts, hair wet from a recent dip, water droplets on his skin. Slight tan, relaxed posture, sunglasses on his face or pushed up on his head. Pool water visible behind him, blue tile or concrete deck around. Bright sunny day, warm summer light.",
    displayName: "Bord de piscine torse nu relax",
    tags: { lighting: "daylight-harsh", energy: "low", social: "alone", space: "outdoor-nature", gender: "masculine" },
  },
  {
    id: "vacation-couch-flowery-relaxed",
    text: "He's lying on a vintage flower-patterned couch in a southern European vacation rental — terracotta tile floor visible, an old wooden door frame, sunlight filtering through shutters. Casual black or grey t-shirt, hair slightly tousled, no expression, just present. Phone held above his face for the selfie. Vibe of an unhurried Italian or Greek summer afternoon.",
    displayName: "Canapé fleuri vacances Méditerranée",
    tags: { lighting: "daylight-natural", energy: "low", social: "alone", space: "indoor-private", gender: "masculine" },
  },

  // === STREET / LIFESTYLE MASCULIN ===
  {
    id: "gas-station-night-flash-cap",
    text: "He's standing outside a gas station at night, wearing a backwards cap or beanie, casual hoodie or oversized t-shirt. Hard flash from the phone catches him directly, slight overexposure on the face and clothing closest to camera. Gas pumps and the convenience store partially visible behind him in the dark. The car is barely visible at the edge. Hard fluorescent canopy light mixed with the flash creates a layered look.",
    displayName: "Station-service nuit flash casquette",
    tags: { lighting: "fluorescent", energy: "low", social: "alone", space: "outdoor-urban", gender: "masculine" },
  },
  {
    id: "elevator-tight-frame-fit-check",
    text: "Mirror selfie in an apartment building elevator. He's wearing a head-to-toe coordinated outfit — going-out fit or streetwear. Hat, jacket, sneakers visible. Standing slightly off-center, phone at chest level, looking down at the screen. Mirrored back wall of the elevator showing his full body. Slight motion if the elevator is moving.",
    displayName: "Ascenseur cadré serré fit-check",
    tags: { lighting: "fluorescent", energy: "low", social: "alone", space: "indoor-public", gender: "masculine" },
  },
  {
    id: "car-driver-seat-day-aviators",
    text: "He's in the driver's seat of a car during the day, aviators or sunglasses on. Hand on the steering wheel, the other hand visible. Daylight pouring through the windshield, slight squint. Casual t-shirt or button-up, music in the background implied. The dashboard partially visible. The view through the windshield shows highway or city street.",
    displayName: "Conduite jour aviateurs",
    tags: { lighting: "daylight-natural", energy: "medium", social: "alone", space: "transit", gender: "masculine" },
  },

  // === GAMING / HOBBY / DOMESTIC MASCULINE ===
  {
    id: "gaming-setup-night-rgb",
    text: "He's at his gaming setup at night, RGB lighting from his keyboard, mouse, or PC casting purple, blue, or red light on his face. Headset on or around his neck, casual t-shirt or hoodie. Multi-monitor setup partially visible behind, posters or decoration on the wall in soft glow. Mid-action or pause, looking off-screen.",
    displayName: "Setup gaming nuit RGB",
    tags: { lighting: "screen-only", energy: "low", social: "alone", space: "indoor-private", gender: "masculine" },
  },
  {
    id: "vinyl-record-listening-home",
    text: "He's at home in his apartment, vinyl record playing on a turntable visible at the edge of the frame. Sitting on a couch or floor, headphones on or off, eyes closed or looking off-camera. Soft warm lamp light, books or records visible behind him on a shelf. Vibe of a private moment of music listening, contemplative.",
    displayName: "Écoute vinyle chez soi",
    tags: { lighting: "dim-warm", energy: "low", social: "alone", space: "indoor-private", gender: "masculine" },
  },
  {
    id: "rooftop-day-skyline-view",
    text: "He's on a rooftop or balcony during the day, city skyline visible behind him. Casual outfit — t-shirt, jeans or shorts, maybe a chain. Standing at the railing or sitting on the edge, looking out or at the camera. Bright daylight, blue sky or slight overcast. The vibe is contemplative urban.",
    displayName: "Rooftop jour vue skyline",
    tags: { lighting: "daylight-natural", energy: "low", social: "alone", space: "outdoor-urban", gender: "masculine" },
  },

  // === SPORT / PHYSICAL ACTIVITY MASCULINE ===
  {
    id: "boxing-gym-mid-training",
    text: "He's at a boxing gym, mid-training session. Wrapped hands, sweat on his forehead, slight panting. A heavy bag, ring ropes, or other equipment visible behind him, slightly out of focus. Tank top or shirtless, gym bright with mixed fluorescent and warm lights. The vibe is intense but candid — caught between two rounds, not posing.",
    displayName: "Boxe gym entraînement",
    tags: { lighting: "fluorescent", energy: "high", social: "alone", space: "indoor-public", gender: "masculine" },
  },
  {
    id: "basketball-court-pause",
    text: "He's at an outdoor basketball court, taking a pause between plays. Holding a basketball under one arm, sweaty t-shirt, slight breathing heavy. The court fence, hoop, or another player visible behind, slightly out of focus. Bright daylight, sun overhead, slight squint. The vibe is competitive but relaxed.",
    displayName: "Pause terrain de basket",
    tags: { lighting: "daylight-harsh", energy: "medium", social: "alone", space: "outdoor-urban", gender: "masculine" },
  },
  {
    id: "skate-park-bench",
    text: "He's at a skate park, sitting on the edge of a ramp or a bench. Skateboard beside him or under his foot. Casual t-shirt or hoodie, beanie or cap, sneakers visible. Mid-pause or post-skate, slight sweat. The park's concrete and other skaters partially visible in the background.",
    displayName: "Pause skate park",
    tags: { lighting: "daylight-natural", energy: "medium", social: "alone", space: "outdoor-urban", gender: "masculine" },
  },
  {
    id: "morning-run-park",
    text: "He's mid-run on a park path or city street in the early morning. Running shorts, technical t-shirt, slight sweat on the forehead. Soft early morning light, slight haze, trees or path visible behind. Caught mid-stride, slight motion blur. Headphones on, focused expression.",
    displayName: "Course matinale parc",
    tags: { lighting: "daylight-natural", energy: "high", social: "alone", space: "outdoor-nature", gender: "masculine" },
  },

  // === BARBERSHOP / GROOMING ===
  {
    id: "barbershop-mid-cut-mirror",
    text: "He's in a barber's chair mid-cut, cape draped over him. The barber visible in the background working on his hair or beard, slightly out of focus. Bright shop lighting, mirror behind him in the reflection. Casual face, looking forward or down. The barbershop has typical signage, products on shelves, posters.",
    displayName: "Barbershop coupe en cours",
    tags: { lighting: "fluorescent", energy: "low", social: "with-others", space: "indoor-public", gender: "masculine" },
  },

  // === MASCULINE VARIANTS OF FEMININE SITUATIONS ===
  {
    id: "couple-couch-cuddling-masculine",
    text: "He's on the couch with his partner in a single moment captured from one angle. His arm is wrapped around her shoulders, her head resting on his chest. A blanket partially over them. Both wearing casual at-home clothes. The living room is warm and low-lit by a single lamp.",
    displayName: "Couple câlin canapé (perspective masculine)",
    tags: { lighting: "dim-warm", energy: "low", social: "intimate-pair", space: "indoor-private", gender: "masculine" },
  },
  {
    id: "couple-bed-morning-masculine",
    text: "He's in bed in the morning with his partner asleep beside him, his arm draped over her waist or her head resting against his shoulder. Both visible in the frame, their two faces or two bodies clearly part of the composition. Tangled white sheets, soft morning light from a window, intimate domestic moment, both still half-asleep.",
    displayName: "Couple lit matin (perspective masculine)",
    tags: { lighting: "daylight-natural", energy: "low", social: "intimate-pair", space: "indoor-private", gender: "masculine" },
  },
  {
    id: "night-out-bathroom-mirror-bro",
    text: "He's in the bathroom of a bar or club with a male friend, both standing in front of the mirror, fixing hair or just hanging out. Harsh fluorescent overhead light, slightly dirty mirror, the typical worn club bathroom aesthetic. Going-out outfits, both relaxed and chatting.",
    displayName: "Toilettes club entre potes",
    tags: { lighting: "fluorescent", energy: "medium", social: "with-others", space: "indoor-public", gender: "masculine" },
  },
  {
    id: "bedroom-getting-dressed-masculine",
    text: "He's in his bedroom in the morning, fully dressed in casual clothes, holding up a t-shirt or hoodie to decide if he wants to wear it instead. Closet open behind him with clothes on hangers, bed unmade with rumpled sheets, daylight from a window. The vibe is 'choosing what to wear today', everyday domestic moment.",
    displayName: "Choix d'outfit chambre (homme)",
    tags: { lighting: "daylight-natural", energy: "medium", social: "alone", space: "indoor-private", gender: "masculine" },
  },
  {
    id: "bathroom-mirror-grooming",
    text: "He's in front of the bathroom mirror doing his morning grooming routine. Fixing his hair with one hand, beard trimmer or razor on the counter, water droplets on the sink. Toothbrush or face wash visible. Bathroom light from above. Topless or t-shirt, hair slightly damp.",
    displayName: "Routine matin salle de bain (homme)",
    tags: { lighting: "daylight-natural", energy: "low", social: "alone", space: "indoor-private", gender: "masculine" },
  },
  {
    id: "fitting-room-trying-jacket",
    text: "He's in a clothing store fitting room trying on a new jacket or hoodie. Both his hands are busy with the clothing — adjusting the fit at the shoulders, pulling at a sleeve, or zipping up. Curtain or wall behind him, slight shadow from the fitting room overhead light. Looking at himself with a doubtful or pleased expression.",
    displayName: "Cabine d'essayage veste",
    tags: { lighting: "fluorescent", energy: "low", social: "alone", space: "indoor-public", gender: "masculine" },
  },
  {
    id: "trying-on-outfits-masculine",
    text: "He's in his bedroom trying on outfits, multiple options thrown on the bed behind him, half-dressed in something he's evaluating. Mirror partially visible. Daylight from the window.",
    displayName: "Essayage tenues (homme)",
    tags: { lighting: "daylight-natural", energy: "medium", social: "alone", space: "indoor-private", gender: "masculine" },
  },

  // === CAT 1 — Front-cam selfies in varied contexts (30) ===
  { id: "selfie-supermarket-aisle-bored", text: "Front-cam selfie in a supermarket aisle, bored expression. Fluorescent overhead lighting, shelves of products partially visible behind. Casual outfit, phone held at arm's length. The kind of selfie you'd take to send to a friend showing you're in a boring errand.", displayName: "Selfie supermarché ennuyé", tags: { lighting: "fluorescent", energy: "low", social: "alone", space: "indoor-public", gender: "neutral" } },
  { id: "selfie-pharmacy-waiting-line", text: "Front-cam selfie standing in line at a pharmacy, fluorescent lighting overhead. Counter and shelves visible behind in soft focus. Neutral or slightly tired expression.", displayName: "Selfie file pharmacie", tags: { lighting: "fluorescent", energy: "low", social: "alone", space: "indoor-public", gender: "neutral" } },
  { id: "selfie-laundromat-waiting", text: "Front-cam selfie at a laundromat, washing machines and dryers visible in the background. Cool fluorescent light, slightly tired expression. Holding a basket or detergent implied.", displayName: "Selfie laverie", tags: { lighting: "fluorescent", energy: "low", social: "alone", space: "indoor-public", gender: "neutral" } },
  { id: "selfie-coffee-shop-window-rain", text: "Front-cam selfie in a coffee shop with a rainy window directly behind. Slightly melancholic expression, soft daylight from the window. Coffee cup on the table partially visible.", displayName: "Selfie café fenêtre pluvieuse", tags: { lighting: "daylight-natural", energy: "low", social: "alone", space: "indoor-public", gender: "feminine" } },
  { id: "selfie-airport-gate-waiting", text: "Front-cam selfie at an airport boarding gate. Seating area and large windows showing planes visible behind. Slightly bored or tired expression. Travel outfit.", displayName: "Selfie aéroport porte", tags: { lighting: "fluorescent", energy: "low", social: "alone", space: "indoor-public", gender: "neutral" } },
  { id: "selfie-train-station-platform", text: "Front-cam selfie on a train station platform, info board or train slightly blurred behind. Mix of artificial light and daylight. Bag on shoulder, casual outfit.", displayName: "Selfie quai gare", tags: { lighting: "fluorescent", energy: "low", social: "alone", space: "indoor-public", gender: "neutral" } },
  { id: "selfie-bus-window-side", text: "Front-cam selfie in a bus window seat, city scrolling blurred outside the window. Soft daylight on the face. Casual outfit, slight tiredness.", displayName: "Selfie bus fenêtre", tags: { lighting: "daylight-natural", energy: "low", social: "alone", space: "transit", gender: "neutral" } },
  { id: "selfie-doctor-waiting-room", text: "Front-cam selfie in a doctor's waiting room, magazines and other patients implied at the edges. Fluorescent overhead, neutral or slightly anxious face.", displayName: "Selfie salle d'attente médecin", tags: { lighting: "fluorescent", energy: "low", social: "alone", space: "medical", gender: "neutral" } },
  { id: "selfie-empty-classroom", text: "Front-cam selfie in an empty classroom, blackboard or rows of desks behind. Daylight from the windows, the quiet of an after-hours room.", displayName: "Selfie classe vide", tags: { lighting: "daylight-natural", energy: "low", social: "alone", space: "indoor-public", gender: "neutral" } },
  { id: "selfie-library-study-area", text: "Front-cam selfie at a library study desk, books, notebook, and a small lamp on the table. Soft warm light, focused or tired expression.", displayName: "Selfie bibliothèque", tags: { lighting: "dim-warm", energy: "low", social: "alone", space: "indoor-public", gender: "neutral" } },
  { id: "selfie-empty-office-after-hours", text: "Front-cam selfie in an empty open office after hours. Screens and desks behind, only a few overhead lights still on. The vibe of staying late alone.", displayName: "Selfie bureau heures sup'", tags: { lighting: "fluorescent", energy: "low", social: "alone", space: "indoor-public", gender: "neutral" } },
  { id: "selfie-rooftop-pool-edge", text: "Front-cam selfie at a rooftop pool, city skyline visible behind. Swimwear, slightly tanned skin, sun on the face. Vibe of vacation or weekend luxury.", displayName: "Selfie rooftop piscine", tags: { lighting: "daylight-harsh", energy: "low", social: "alone", space: "outdoor-urban", gender: "masculine" } },
  { id: "selfie-on-balcony-night-city-lights", text: "Front-cam selfie on a balcony at night, city lights blurred behind. Slight contemplative expression, warm string light or window glow on the face.", displayName: "Selfie balcon nuit ville", tags: { lighting: "dim-warm", energy: "low", social: "alone", space: "outdoor-urban", gender: "neutral" } },
  { id: "selfie-from-passenger-side-driver", text: "Front-cam selfie from the passenger seat of a car, the driver partially visible at the edge of the frame. Daylight through the windshield, casual outfit.", displayName: "Selfie passagère côté conducteur", tags: { lighting: "daylight-natural", energy: "low", social: "with-others", space: "transit", gender: "feminine" } },
  { id: "selfie-pulled-over-side-of-road", text: "Front-cam selfie in a parked car pulled over on the roadside, landscape outside the window. Daylight, slightly tired or contemplative.", displayName: "Selfie voiture arrêtée", tags: { lighting: "daylight-natural", energy: "low", social: "alone", space: "transit", gender: "neutral" } },
  { id: "selfie-in-tent-camping", text: "Front-cam selfie inside a camping tent, headlamp casting warm light on the face. Slight darkness around, sleeping bag visible. Casual outdoor outfit.", displayName: "Selfie tente camping", tags: { lighting: "dim-warm", energy: "low", social: "alone", space: "outdoor-nature", gender: "neutral" } },
  { id: "selfie-wrapped-in-blanket-couch", text: "Front-cam selfie wrapped fully in a blanket on the couch, only the face visible. Soft warm indoor light, cozy at-home moment.", displayName: "Selfie plaid canapé", tags: { lighting: "dim-warm", energy: "low", social: "alone", space: "indoor-private", gender: "feminine" } },
  { id: "selfie-staring-at-phone-screen-glow", text: "Front-cam selfie in a dark room, only the face lit by the phone screen from below. No other lights, deep shadows everywhere else.", displayName: "Selfie écran téléphone obscur", tags: { lighting: "screen-only", energy: "low", social: "alone", space: "indoor-private", gender: "neutral" } },
  { id: "selfie-changing-room-mall", text: "Front-cam selfie in a mall fitting room, partial mirror visible at the edge. Fluorescent overhead light, casual outfit being tried on.", displayName: "Selfie cabine mall", tags: { lighting: "fluorescent", energy: "low", social: "alone", space: "indoor-public", gender: "neutral" } },
  { id: "selfie-public-bathroom-stall", text: "Front-cam selfie in a public bathroom stall, fluorescent overhead light flat on the face. Tile or door visible behind. Slightly cramped framing.", displayName: "Selfie toilettes publiques", tags: { lighting: "fluorescent", energy: "low", social: "alone", space: "indoor-public", gender: "neutral" } },
  { id: "selfie-elevator-going-up-glass-walls", text: "Front-cam selfie inside a glass elevator going up, city or building interior visible through the walls behind. Daylight, casual outfit.", displayName: "Selfie ascenseur vitré", tags: { lighting: "daylight-natural", energy: "low", social: "alone", space: "indoor-public", gender: "neutral" } },
  { id: "selfie-stuck-in-traffic", text: "Front-cam selfie in a car stuck in traffic, dashboard and steering wheel partially visible. Slight irritation or boredom, daylight through windshield.", displayName: "Selfie embouteillage", tags: { lighting: "daylight-natural", energy: "low", social: "alone", space: "transit", gender: "neutral" } },
  { id: "selfie-back-row-of-class", text: "Front-cam selfie at the back row of a classroom, professor or board blurred far ahead. Mix of fluorescent and daylight, casual student outfit.", displayName: "Selfie fond de classe", tags: { lighting: "fluorescent", energy: "low", social: "alone", space: "indoor-public", gender: "neutral" } },
  { id: "selfie-corner-of-restaurant-friends", text: "Front-cam selfie from a corner of a restaurant table, friends blurred behind in conversation. Warm restaurant lighting, casual going-out outfit.", displayName: "Selfie coin restaurant amis", tags: { lighting: "dim-warm", energy: "medium", social: "with-others", space: "indoor-public", gender: "neutral" } },
  { id: "selfie-in-fitting-room-trying-pants", text: "Front-cam selfie in a fitting room evaluating pants, partial mirror visible behind. Fluorescent overhead light, focused or doubtful expression.", displayName: "Selfie cabine pantalon", tags: { lighting: "fluorescent", energy: "low", social: "alone", space: "indoor-public", gender: "masculine" } },
  { id: "selfie-trying-on-sunglasses-store", text: "Front-cam selfie in a store mirror with sunglasses just put on, evaluating expression. Fluorescent or mixed light, store shelves blurred behind.", displayName: "Selfie essayage lunettes", tags: { lighting: "fluorescent", energy: "low", social: "alone", space: "indoor-public", gender: "neutral" } },
  { id: "selfie-taking-out-trash", text: "Front-cam selfie in an apartment building hallway, trash bag in hand. Casual at-home outfit, fluorescent corridor light.", displayName: "Selfie sortir poubelles", tags: { lighting: "fluorescent", energy: "low", social: "alone", space: "indoor-public", gender: "neutral" } },
  { id: "selfie-inside-car-wash", text: "Front-cam selfie inside a car going through a car wash, water and foam visible on the windows around. Diffused green-blue light, slightly amused expression.", displayName: "Selfie car wash", tags: { lighting: "dim-cool", energy: "low", social: "alone", space: "transit", gender: "neutral" } },
  { id: "selfie-in-photo-booth", text: "Front-cam selfie inside a photobooth, fabric curtain behind. Bright photobooth light flat on the face, slightly playful framing.", displayName: "Selfie photobooth", tags: { lighting: "fluorescent", energy: "low", social: "alone", space: "indoor-public", gender: "neutral" } },
  { id: "selfie-mid-haircut-cape", text: "Front-cam selfie mid-haircut at the salon, cape draped over shoulders, mirror blurred behind. Bright salon light, neutral expression.", displayName: "Selfie mi-coupe coiffeur", tags: { lighting: "fluorescent", energy: "low", social: "with-others", space: "indoor-public", gender: "neutral" } },

  // === CAT 2 — Mundane domestic moments (25) ===
  { id: "unpacking-grocery-bag-kitchen", text: "She's unpacking groceries on the kitchen counter, a paper or fabric bag visible beside her, items half pulled out. Casual at-home outfit, daylight from a window.", displayName: "Range courses cuisine", tags: { lighting: "daylight-natural", energy: "medium", social: "alone", space: "indoor-private", gender: "neutral" } },
  { id: "emptying-dishwasher-bent", text: "She's bent over the open dishwasher, clean dishes in hand, mid-motion of unloading. Casual at-home outfit, kitchen lights overhead.", displayName: "Vide lave-vaisselle", tags: { lighting: "dim-warm", energy: "medium", social: "alone", space: "indoor-private", gender: "neutral" } },
  { id: "taking-bath-bubbles-shoulder-up", text: "She's in a bubble bath, only her shoulders and face visible above the foam. Soft warm bathroom light, towel folded nearby. Eyes closed or relaxed.", displayName: "Bain mousseux épaules", tags: { lighting: "dim-warm", energy: "low", social: "alone", space: "indoor-private", gender: "feminine" } },
  { id: "blow-drying-hair-mirror", text: "She's blow-drying her hair in front of the bathroom mirror, hair in motion from the airflow. Bright mirror light, focused expression.", displayName: "Sèche cheveux miroir", tags: { lighting: "daylight-natural", energy: "medium", social: "alone", space: "indoor-private", gender: "feminine" } },
  { id: "flossing-bathroom-mirror", text: "Flossing teeth in front of the bathroom mirror, careful focused gesture. Tile and counter products visible.", displayName: "Fil dentaire", tags: { lighting: "daylight-natural", energy: "low", social: "alone", space: "indoor-private", gender: "neutral" } },
  { id: "putting-contacts-in-mirror", text: "Putting contact lenses in, finger near the eye in the mirror reflection. Concentrated face, bright bathroom light.", displayName: "Met lentilles", tags: { lighting: "daylight-natural", energy: "low", social: "alone", space: "indoor-private", gender: "neutral" } },
  { id: "cooking-eggs-watching-pan", text: "Standing at the stove watching eggs cooking in a pan, focused expression. Casual at-home outfit, slight steam rising.", displayName: "Cuisine œufs poêle", tags: { lighting: "dim-warm", energy: "low", social: "alone", space: "indoor-private", gender: "neutral" } },
  { id: "tearing-open-snack-bag", text: "Caught mid-action tearing open a snack bag, hands at the bag's seal. Couch or kitchen visible behind, casual at-home outfit.", displayName: "Ouvre sachet snack", tags: { lighting: "dim-warm", energy: "low", social: "alone", space: "indoor-private", gender: "neutral" } },
  { id: "waiting-for-microwave", text: "Standing in front of the microwave watching the digits count down. Casual at-home outfit, kitchen light overhead.", displayName: "Attend micro-ondes", tags: { lighting: "dim-warm", energy: "low", social: "alone", space: "indoor-private", gender: "neutral" } },
  { id: "checking-laundry-still-wet", text: "Reaching into the washing machine to check if clothes are dry, slight frown. Laundry room or bathroom visible.", displayName: "Vérifie linge", tags: { lighting: "fluorescent", energy: "low", social: "alone", space: "indoor-private", gender: "neutral" } },
  { id: "plugging-phone-into-charger", text: "Caught mid-gesture plugging the phone into a charger, hand near the outlet. Casual at-home setting, soft warm lamp light.", displayName: "Branche téléphone", tags: { lighting: "dim-warm", energy: "low", social: "alone", space: "indoor-private", gender: "neutral" } },
  { id: "standing-in-front-of-open-closet", text: "Standing facing an open closet, deciding what to wear. Hangers and clothes visible, casual at-home moment, daylight from a window.", displayName: "Devant placard ouvert", tags: { lighting: "daylight-natural", energy: "low", social: "alone", space: "indoor-private", gender: "neutral" } },
  { id: "picking-up-something-off-floor", text: "Bent over picking an object off the floor, mid-gesture. Casual at-home outfit, soft indoor light.", displayName: "Ramasse au sol", tags: { lighting: "daylight-natural", energy: "low", social: "alone", space: "indoor-private", gender: "neutral" } },
  { id: "lying-on-floor-ceiling-view", text: "Lying flat on the floor looking up at the ceiling, contemplative or zoning out. Soft indoor light, casual at-home outfit.", displayName: "Allongé sol regard plafond", tags: { lighting: "daylight-natural", energy: "low", social: "alone", space: "indoor-private", gender: "neutral" } },
  { id: "sitting-on-toilet-seat-down-thinking", text: "Sitting on a closed toilet seat lid, hands clasped, thinking quietly. Bathroom light, intimate domestic moment.", displayName: "Toilettes lid pensif", tags: { lighting: "daylight-natural", energy: "low", social: "alone", space: "indoor-private", gender: "neutral" } },
  { id: "brushing-hair-in-front-of-mirror", text: "Brushing hair in front of the bathroom or bedroom mirror, repetitive arm motion. Soft daylight, casual at-home moment.", displayName: "Brosse cheveux", tags: { lighting: "daylight-natural", energy: "low", social: "alone", space: "indoor-private", gender: "feminine" } },
  { id: "shaving-legs-in-shower-implied", text: "In the shower with steam, gesture of shaving the legs implied off-frame. Glass or curtain visible, water droplets on the body.", displayName: "Rase jambes douche", tags: { lighting: "dim-warm", energy: "low", social: "alone", space: "indoor-private", gender: "feminine" } },
  { id: "taking-out-earrings-mirror", text: "Removing earrings in front of the bathroom mirror, careful gesture near the ear. Soft bathroom light, end-of-day vibe.", displayName: "Retire boucles oreilles", tags: { lighting: "dim-warm", energy: "low", social: "alone", space: "indoor-private", gender: "feminine" } },
  { id: "spraying-cleaning-product", text: "Spraying cleaning product on a counter or surface, hand on the trigger. Casual at-home cleaning outfit, focused expression.", displayName: "Vaporise produit ménager", tags: { lighting: "daylight-natural", energy: "medium", social: "alone", space: "indoor-private", gender: "neutral" } },
  { id: "wiping-counter-with-sponge", text: "Wiping the kitchen counter with a sponge, repetitive motion. Casual at-home outfit, daylight or kitchen lamp.", displayName: "Essuie comptoir éponge", tags: { lighting: "dim-warm", energy: "low", social: "alone", space: "indoor-private", gender: "neutral" } },
  { id: "checking-mail-foyer", text: "Standing in the entryway checking mail, envelopes in hand, slight curiosity. Soft entry hallway light.", displayName: "Vérifie courrier", tags: { lighting: "dim-warm", energy: "low", social: "alone", space: "indoor-private", gender: "neutral" } },
  { id: "tying-bathrobe-mid-knot", text: "Mid-gesture tying the bathrobe sash, hands at the knot. Just out of shower or bath, soft warm bathroom light.", displayName: "Noue peignoir", tags: { lighting: "dim-warm", energy: "low", social: "alone", space: "indoor-private", gender: "neutral" } },
  { id: "putting-on-socks-edge-of-bed", text: "Sitting on the edge of the bed putting on socks, bent forward, sock half on. Casual morning at-home moment.", displayName: "Met chaussettes lit", tags: { lighting: "daylight-natural", energy: "low", social: "alone", space: "indoor-private", gender: "neutral" } },
  { id: "measuring-coffee-grounds-scoop", text: "Measuring coffee grounds with a scoop above the coffee maker, focused expression. Morning kitchen light.", displayName: "Dose café", tags: { lighting: "daylight-natural", energy: "low", social: "alone", space: "indoor-private", gender: "neutral" } },
  { id: "holding-pet-cat-implied", text: "Holding a pet (cat or small dog) in arms, the animal partially visible. Soft warm indoor light, casual at-home outfit.", displayName: "Porte animal", tags: { lighting: "dim-warm", energy: "low", social: "alone", space: "indoor-private", gender: "neutral" } },

  // === CAT 3 — Public everyday moments (20) ===
  { id: "waiting-at-bus-stop", text: "Waiting at a bus stop, looking off to the side. Shelter visible behind, daylight or evening, casual outfit.", displayName: "Attente arrêt bus", tags: { lighting: "daylight-natural", energy: "low", social: "alone", space: "outdoor-urban", gender: "neutral" } },
  { id: "crossing-pedestrian-street", text: "Mid-crossing a pedestrian crosswalk, slight motion. Cars stopped at the line in soft focus, daylight overhead.", displayName: "Traverse passage piétons", tags: { lighting: "daylight-harsh", energy: "medium", social: "alone", space: "outdoor-urban", gender: "neutral" } },
  { id: "atm-withdrawing-cash", text: "At an ATM machine, focused on the screen, hand near the keypad. Concentrated expression, fluorescent lighting from the machine.", displayName: "DAB retrait", tags: { lighting: "fluorescent", energy: "low", social: "alone", space: "outdoor-urban", gender: "neutral" } },
  { id: "self-checkout-supermarket", text: "At a self-checkout register scanning items, basket beside her. Fluorescent overhead lighting, focused expression.", displayName: "Caisse auto supermarché", tags: { lighting: "fluorescent", energy: "low", social: "alone", space: "indoor-public", gender: "neutral" } },
  { id: "metro-subway-platform-waiting", text: "Standing on the subway platform waiting, info board behind in soft focus. Casual urban outfit, mix of fluorescent and ambient light.", displayName: "Quai métro", tags: { lighting: "fluorescent", energy: "low", social: "alone", space: "indoor-public", gender: "neutral" } },
  { id: "subway-train-inside-handle", text: "Standing inside a moving subway car, hand on a grab bar, vacant gaze ahead. Other passengers blurred behind, fluorescent ceiling light.", displayName: "Métro debout barre", tags: { lighting: "fluorescent", energy: "low", social: "with-others", space: "transit", gender: "neutral" } },
  { id: "parking-garage-lot", text: "In an underground parking lot, blurred cars behind. Yellow fluorescent overhead lighting, casual outfit, slight unease.", displayName: "Parking souterrain", tags: { lighting: "fluorescent", energy: "low", social: "alone", space: "outdoor-urban", gender: "neutral" } },
  { id: "food-truck-ordering", text: "At a food truck window ordering, the truck partially visible at the side. Daylight or evening string lights, casual outfit.", displayName: "Commande food truck", tags: { lighting: "daylight-natural", energy: "medium", social: "with-others", space: "outdoor-urban", gender: "neutral" } },
  { id: "gas-pump-filling-tank", text: "At a gas pump, hand on the nozzle, the car blurred behind. Daylight, casual outfit, neutral expression.", displayName: "Pompe à essence", tags: { lighting: "daylight-natural", energy: "low", social: "alone", space: "outdoor-urban", gender: "neutral" } },
  { id: "mall-escalator-going-up", text: "Standing on a mall escalator going up, mall stores partially visible behind. Bright fluorescent lighting, casual outfit.", displayName: "Escalator centre commercial", tags: { lighting: "fluorescent", energy: "low", social: "alone", space: "indoor-public", gender: "neutral" } },
  { id: "waiting-for-coffee-counter", text: "Standing at the coffee counter waiting for an order, menu screen visible above. Warm cafe lighting, casual outfit.", displayName: "Attend café comptoir", tags: { lighting: "dim-warm", energy: "low", social: "alone", space: "indoor-public", gender: "neutral" } },
  { id: "paying-at-register", text: "At a register paying with card or phone, hand extended. Cashier blurred behind. Fluorescent or warm lighting depending on setting.", displayName: "Paye en caisse", tags: { lighting: "fluorescent", energy: "low", social: "with-others", space: "indoor-public", gender: "neutral" } },
  { id: "standing-in-line-fast-food", text: "In line at a fast food restaurant, menu screens visible above. Bright fluorescent overhead, slight boredom.", displayName: "File fast-food", tags: { lighting: "fluorescent", energy: "low", social: "alone", space: "indoor-public", gender: "neutral" } },
  { id: "street-corner-checking-phone-map", text: "At a street corner checking the maps app on phone, slight confusion. Daylight, urban architecture in soft focus behind.", displayName: "Coin de rue carte", tags: { lighting: "daylight-natural", energy: "low", social: "alone", space: "outdoor-urban", gender: "neutral" } },
  { id: "inside-empty-cinema-seat", text: "Sitting in a cinema seat in a half-empty theater, dark screen ahead about to start. Dim ambient light, casual outfit.", displayName: "Salle cinéma vide", tags: { lighting: "dim-warm", energy: "low", social: "alone", space: "indoor-public", gender: "neutral" } },
  { id: "visiting-museum-staring-at-painting", text: "Standing in front of a painting at a museum, contemplating. Soft museum lighting, other visitors blurred at the edges.", displayName: "Musée devant tableau", tags: { lighting: "dim-warm", energy: "low", social: "alone", space: "indoor-public", gender: "neutral" } },
  { id: "doctor-office-exam-room", text: "Sitting on a doctor's exam table, paper crinkling under the legs. Clinical white walls, fluorescent overhead, slight nervousness.", displayName: "Salle examen médical", tags: { lighting: "fluorescent", energy: "low", social: "alone", space: "medical", gender: "neutral" } },
  { id: "dentist-chair-waiting", text: "In a dentist's chair waiting for the dentist to come in, slightly nervous expression. Bright clinical lighting, equipment partially visible.", displayName: "Fauteuil dentiste", tags: { lighting: "fluorescent", energy: "low", social: "alone", space: "medical", gender: "neutral" } },
  { id: "bank-teller-waiting", text: "Standing at a bank teller window, neutral expression, paperwork in hand. Bright bank interior, fluorescent overhead.", displayName: "Guichet banque", tags: { lighting: "fluorescent", energy: "low", social: "with-others", space: "indoor-public", gender: "neutral" } },
  { id: "police-station-lobby-implied", text: "In a police station lobby, contained expression, plastic chairs visible at the edges. Fluorescent overhead lighting, official poster on the wall.", displayName: "Hall commissariat", tags: { lighting: "fluorescent", energy: "low", social: "with-others", space: "indoor-public", gender: "neutral" } },

  // === CAT 4 — Work / study / screen (15) ===
  { id: "video-call-laptop-headset", text: "On a video call wearing a headset, focused on the laptop screen. Office or home setup behind, mixed daylight and screen glow on the face.", displayName: "Appel vidéo casque", tags: { lighting: "daylight-natural", energy: "medium", social: "with-others", space: "indoor-private", gender: "neutral" } },
  { id: "typing-on-laptop-focused", text: "Typing on a laptop, eyes locked on screen, focused expression. Desk in soft focus around, mix of natural and screen light.", displayName: "Tape laptop concentré", tags: { lighting: "daylight-natural", energy: "medium", social: "alone", space: "indoor-private", gender: "neutral" } },
  { id: "taking-notes-notebook-pen", text: "Taking notes in a notebook with a pen, hand mid-write. Slight focus, soft daylight or warm desk lamp.", displayName: "Prend notes papier", tags: { lighting: "daylight-natural", energy: "medium", social: "alone", space: "indoor-private", gender: "neutral" } },
  { id: "reviewing-document-printed", text: "Reading a printed document with brows furrowed in concentration. Stack of papers nearby, desk light overhead.", displayName: "Lit document papier", tags: { lighting: "dim-warm", energy: "low", social: "alone", space: "indoor-private", gender: "neutral" } },
  { id: "staring-at-spreadsheet-tired", text: "In front of an Excel spreadsheet on screen, exhausted, the cool screen light reflecting on the face. End-of-day work moment.", displayName: "Écran tableur épuisé", tags: { lighting: "screen-only", energy: "low", social: "alone", space: "indoor-private", gender: "neutral" } },
  { id: "mid-meeting-zoom-listening", text: "Mid-Zoom meeting, listening with eyes on screen. Attentive but slightly tired, headset on or off.", displayName: "Mi-Zoom écoute", tags: { lighting: "daylight-natural", energy: "low", social: "with-others", space: "indoor-private", gender: "neutral" } },
  { id: "office-watercooler-talking", text: "Standing at the office water cooler talking, cup in hand. Other colleagues partially visible, mix of fluorescent and daylight.", displayName: "Fontaine bureau bavardage", tags: { lighting: "fluorescent", energy: "medium", social: "with-others", space: "indoor-public", gender: "neutral" } },
  { id: "mid-presentation-pointing-screen", text: "Mid-presentation, finger pointing at a screen or board off to the side. Focused expression, mixed lighting.", displayName: "Mi-présentation pointe", tags: { lighting: "fluorescent", energy: "medium", social: "with-others", space: "indoor-public", gender: "neutral" } },
  { id: "between-classes-school-hallway", text: "In a school hallway between classes, backpack on the shoulder, students blurred passing by. Bright corridor lighting.", displayName: "Couloir école entre cours", tags: { lighting: "fluorescent", energy: "low", social: "with-others", space: "indoor-public", gender: "neutral" } },
  { id: "studying-on-floor-books-around", text: "Studying on the floor surrounded by open books and notes, leaning back against a couch or bed. Warm lamp light, focused or tired.", displayName: "Révise au sol livres", tags: { lighting: "dim-warm", energy: "low", social: "alone", space: "indoor-private", gender: "feminine" } },
  { id: "group-study-session-table-friends", text: "Group study session at a table with friends, books and laptops spread out. Mid-conversation, warm or fluorescent light.", displayName: "Étude groupe amis", tags: { lighting: "dim-warm", energy: "medium", social: "with-others", space: "indoor-public", gender: "neutral" } },
  { id: "classroom-raised-hand", text: "In a classroom with hand slightly raised to ask a question. Other students visible at the edges, mix of fluorescent and daylight.", displayName: "Cours main levée", tags: { lighting: "fluorescent", energy: "low", social: "with-others", space: "indoor-public", gender: "neutral" } },
  { id: "computer-lab-headphones-on", text: "In a computer lab with headphones on, focused on the screen. Other students at adjacent stations blurred behind.", displayName: "Salle info casque", tags: { lighting: "fluorescent", energy: "low", social: "with-others", space: "indoor-public", gender: "neutral" } },
  { id: "presentation-stage-podium", text: "On stage at a podium presenting, microphone visible, audience implied off-camera. Stage lighting on the face.", displayName: "Estrade présentation", tags: { lighting: "dim-warm", energy: "medium", social: "with-others", space: "indoor-public", gender: "neutral" } },
  { id: "exam-hall-writing", text: "In an exam hall mid-writing, focused posture, head down to the paper. Other students visible behind, daylight or fluorescent overhead.", displayName: "Salle examen écrit", tags: { lighting: "fluorescent", energy: "medium", social: "with-others", space: "indoor-public", gender: "neutral" } },

  // === CAT 5 — Vacation / travel variants (15) ===
  { id: "airplane-window-seat-staring-out", text: "Window seat on an airplane staring out at sky or clouds. Soft daylight on one side of the face, slight tiredness from the flight.", displayName: "Hublot avion", tags: { lighting: "daylight-natural", energy: "low", social: "alone", space: "transit", gender: "neutral" } },
  { id: "hotel-room-bed-morning", text: "On a hotel bed in the morning, white sheets crisp around. Soft window light, robe or pajamas, vacation morning vibe.", displayName: "Lit hôtel matin", tags: { lighting: "daylight-natural", energy: "low", social: "alone", space: "indoor-private", gender: "neutral" } },
  { id: "backpacking-trail-rest", text: "Resting on a backpacking trail, large pack on the ground beside. Mountain or forest landscape behind, bright outdoor light.", displayName: "Pause sentier sac à dos", tags: { lighting: "daylight-harsh", energy: "low", social: "alone", space: "outdoor-nature", gender: "neutral" } },
  { id: "beach-towel-laying-down", text: "Lying on a beach towel, sand and ocean visible at the edges. Bright sunlight, swimsuit, relaxed posture.", displayName: "Serviette plage allongé", tags: { lighting: "daylight-harsh", energy: "low", social: "alone", space: "outdoor-nature", gender: "neutral" } },
  { id: "street-cafe-foreign-city-coffee", text: "At a foreign city street cafe, coffee in hand, cobblestone street and old buildings behind. Warm afternoon light.", displayName: "Café rue ville étrangère", tags: { lighting: "daylight-natural", energy: "low", social: "alone", space: "outdoor-urban", gender: "neutral" } },
  { id: "taxi-tuktuk-motion", text: "Inside a tuktuk in motion in an Asian city, blurred street and shops outside. Slight wind in hair, casual travel outfit.", displayName: "Tuktuk en mouvement", tags: { lighting: "daylight-natural", energy: "medium", social: "alone", space: "transit", gender: "neutral" } },
  { id: "hostel-dorm-room-bunk", text: "On a hostel dorm bunk bed, backpack visible at the foot. Other bunks partially visible, soft warm dim light.", displayName: "Couchette hostel", tags: { lighting: "dim-warm", energy: "low", social: "alone", space: "indoor-public", gender: "neutral" } },
  { id: "art-gallery-foreign-staring", text: "In a foreign art gallery contemplating an artwork off-camera. Soft museum lighting, casual travel outfit.", displayName: "Galerie art étrangère", tags: { lighting: "dim-warm", energy: "low", social: "alone", space: "indoor-public", gender: "neutral" } },
  { id: "ferry-deck-wind-in-hair", text: "On a ferry deck with wind in hair, sea visible behind. Bright outdoor light, casual outfit, contemplative or smiling.", displayName: "Pont ferry vent", tags: { lighting: "daylight-natural", energy: "low", social: "alone", space: "outdoor-nature", gender: "neutral" } },
  { id: "mountain-summit-view", text: "At a mountain summit, panoramic landscape behind. Wind in hair, hiking gear, slight breathlessness from the climb.", displayName: "Sommet montagne", tags: { lighting: "daylight-natural", energy: "low", social: "alone", space: "outdoor-nature", gender: "neutral" } },
  { id: "ski-lift-chair-snow", text: "On a ski lift chair, snow-covered slopes visible below and around. Ski equipment visible on the lap, cold daylight.", displayName: "Télésiège enneigé", tags: { lighting: "daylight-natural", energy: "low", social: "alone", space: "outdoor-nature", gender: "neutral" } },
  { id: "desert-sand-dune-evening", text: "On a sand dune at sunset, desert landscape stretching behind. Warm golden light, casual desert outfit.", displayName: "Dune désert coucher", tags: { lighting: "golden-hour", energy: "low", social: "alone", space: "outdoor-nature", gender: "neutral" } },
  { id: "city-overlook-tourist-spot", text: "At a touristic overlook viewing a city panorama. Other tourists partially visible, daylight, casual travel outfit.", displayName: "Belvédère touristique", tags: { lighting: "daylight-natural", energy: "low", social: "alone", space: "outdoor-urban", gender: "neutral" } },
  { id: "street-food-asian-night", text: "In front of an Asian street food stand at night, vapor rising from the cooking. Neon signs and lanterns behind, casual travel outfit.", displayName: "Street food Asie nuit", tags: { lighting: "dim-warm", energy: "medium", social: "alone", space: "outdoor-urban", gender: "neutral" } },
  { id: "island-beach-sunset-walk", text: "Walking on a tropical beach at sunset, footprints behind in the sand. Golden warm light, swimsuit or light outfit.", displayName: "Plage île coucher soleil", tags: { lighting: "golden-hour", energy: "low", social: "alone", space: "outdoor-nature", gender: "neutral" } },

  // === CAT 6 — Evening / night out variants (12) ===
  { id: "nightclub-dance-floor-edge", text: "At the edge of a nightclub dance floor, colored lights sweeping across the scene. Going-out outfit, drink in hand, slight motion.", displayName: "Bord piste nightclub", tags: { lighting: "dim-warm", energy: "high", social: "with-others", space: "indoor-public", gender: "neutral" } },
  { id: "house-party-balcony-cigarette-implied", text: "On a balcony at a house party, drink in hand, contemplative expression. City lights or apartment block behind, slight chill.", displayName: "Balcon soirée pause", tags: { lighting: "dim-warm", energy: "low", social: "alone", space: "outdoor-urban", gender: "neutral" } },
  { id: "uber-pool-back-seat-friends", text: "In an Uber Pool back seat with friends, soft night light from passing streetlights. Mid-conversation or laughing, casual going-out outfit.", displayName: "Uber Pool amis", tags: { lighting: "dim-cool", energy: "medium", social: "with-others", space: "transit", gender: "neutral" } },
  { id: "queue-outside-club", text: "In line outside a club, slight cold night, going-out outfit. Bouncer and other people in line partially visible.", displayName: "File devant club", tags: { lighting: "dim-cool", energy: "low", social: "with-others", space: "outdoor-urban", gender: "neutral" } },
  { id: "bar-bathroom-line-waiting", text: "In line in a bar bathroom waiting, fluorescent overhead light, mirror partially visible. Going-out outfit, slight tiredness.", displayName: "File toilettes bar", tags: { lighting: "fluorescent", energy: "low", social: "with-others", space: "indoor-public", gender: "feminine" } },
  { id: "karaoke-room-mid-song", text: "Mid-song in a private karaoke room, microphone in hand, lyrics screen visible behind. Colored ambient light, animated.", displayName: "Karaoké mi-chanson", tags: { lighting: "dim-warm", energy: "high", social: "with-others", space: "indoor-public", gender: "neutral" } },
  { id: "bowling-alley-mid-game", text: "At a bowling alley mid-game, ball in hand, lane visible ahead. Mix of fluorescent and disco-style lighting.", displayName: "Bowling mi-partie", tags: { lighting: "fluorescent", energy: "medium", social: "with-others", space: "indoor-public", gender: "neutral" } },
  { id: "arcade-claw-machine-focused", text: "At an arcade in front of a claw machine, focused on the controls. Colorful neon signage and game lights all around.", displayName: "Arcade pince machine", tags: { lighting: "dim-warm", energy: "medium", social: "alone", space: "indoor-public", gender: "neutral" } },
  { id: "friends-living-room-game-night", text: "Board game night at a friend's place, board and pieces spread on the table. Friends partially visible around, warm lamp lighting.", displayName: "Soirée jeux société", tags: { lighting: "dim-warm", energy: "medium", social: "with-others", space: "indoor-private", gender: "neutral" } },
  { id: "friends-watching-movie-couch", text: "On a couch with friends watching a movie, TV blurred ahead. Snacks on the coffee table, dim ambient light, casual at-home outfit.", displayName: "Film amis canapé", tags: { lighting: "dim-warm", energy: "low", social: "with-others", space: "indoor-private", gender: "neutral" } },
  { id: "drinking-game-kitchen", text: "Kitchen drinking game, cups arranged on the table, friends partially visible around. Warm overhead light, animated mood.", displayName: "Jeu boire cuisine", tags: { lighting: "dim-warm", energy: "high", social: "with-others", space: "indoor-private", gender: "neutral" } },
  { id: "early-morning-after-party-aftermath", text: "Morning after a party, cups and bottles still scattered, exhausted look, hair messy. Soft daylight from the window.", displayName: "Lendemain de soirée", tags: { lighting: "daylight-natural", energy: "low", social: "alone", space: "indoor-private", gender: "neutral" } },

  // === CAT 7 — Intimacy / alone at home (10) ===
  { id: "crying-alone-in-bed", text: "Crying alone in bed, curled up under the blanket. Tear streaks on the cheeks, no makeup, soft dim bedroom light.", displayName: "Pleure seul lit", tags: { lighting: "dim-warm", energy: "low", social: "alone", space: "indoor-private", gender: "neutral" } },
  { id: "journaling-on-bed", text: "Sitting cross-legged on the bed writing in a journal, pen in hand. Casual at-home outfit, soft daylight from a window.", displayName: "Journal au lit", tags: { lighting: "daylight-natural", energy: "low", social: "alone", space: "indoor-private", gender: "feminine" } },
  { id: "meditating-cross-legged-floor", text: "Meditating cross-legged on the floor, eyes closed, hands resting on knees. Soft warm light, calm relaxed posture.", displayName: "Méditation au sol", tags: { lighting: "daylight-natural", energy: "low", social: "alone", space: "indoor-private", gender: "neutral" } },
  { id: "dancing-alone-in-room", text: "Dancing alone in the bedroom, motion blur in the body, mirror or empty wall behind. Headphones implied or speaker visible.", displayName: "Danse seule chambre", tags: { lighting: "daylight-natural", energy: "high", social: "alone", space: "indoor-private", gender: "neutral" } },
  { id: "crying-in-shower-implied", text: "In the shower with sad expression, water running over the face. Steam rising, glass or curtain partially visible, vulnerable moment.", displayName: "Pleure douche", tags: { lighting: "dim-warm", energy: "low", social: "alone", space: "indoor-private", gender: "neutral" } },
  { id: "eating-cereal-out-of-box", text: "Eating cereal directly from the box, standing in the kitchen. Casual at-home outfit, soft daylight, slight self-amusement.", displayName: "Mange céréales boîte", tags: { lighting: "daylight-natural", energy: "low", social: "alone", space: "indoor-private", gender: "neutral" } },
  { id: "talking-to-self-mirror", text: "Talking to self in front of the bathroom mirror, lips moving mid-word. Internal expression, soft mirror light.", displayName: "Parle seul miroir", tags: { lighting: "daylight-natural", energy: "low", social: "alone", space: "indoor-private", gender: "neutral" } },
  { id: "lying-on-floor-ceiling", text: "Lying flat on the floor looking up at the ceiling, hands behind head, contemplating. Soft daylight or warm lamp.", displayName: "Au sol regard plafond", tags: { lighting: "daylight-natural", energy: "low", social: "alone", space: "indoor-private", gender: "neutral" } },
  { id: "crying-while-on-phone", text: "On a phone call crying, phone to the ear, tears on the cheeks. Vulnerable moment, dim bedroom or living room light.", displayName: "Pleure au téléphone", tags: { lighting: "dim-warm", energy: "low", social: "alone", space: "indoor-private", gender: "feminine" } },
  { id: "journaling-cafe-alone", text: "Writing in a journal alone at a cafe, pen in hand, coffee on the table. Soft window daylight, contemplative expression.", displayName: "Journal café seule", tags: { lighting: "daylight-natural", energy: "low", social: "alone", space: "indoor-public", gender: "feminine" } },
];

// === EMOTIONAL_STATES (174 active + 10 deprecated kept for legacy lookup) ==

export const EMOTIONAL_STATES: DictEntry[] = [
  {
    id: "soft-natural-smile",
    text: "Soft natural smile, eyes slightly squinted, looking comfortable and unaware.",
    displayName: "Sourire naturel doux",
    tags: { lighting: "flexible", energy: "medium", social: "flexible", space: "flexible", gender: "neutral" },
  },
  {
    id: "genuinely-laughing",
    text: "Genuinely laughing, head tilted, eyes barely open, caught mid-sound.",
    displayName: "Rire sincère",
    tags: { lighting: "flexible", energy: "high", social: "flexible", space: "flexible", gender: "neutral" },
  },
  {
    id: "tired-empty-stare",
    text: "Tired empty stare, no expression, eyes slightly out of focus.",
    displayName: "Regard vide fatigué",
    tags: { lighting: "flexible", energy: "low", social: "flexible", space: "flexible", gender: "neutral" },
  },
  {
    id: "crying-stopped-crying",
    text: "Crying or just stopped crying, eyes red and slightly swollen, nose pink, no makeup left.",
    displayName: "Pleurs / fin de pleurs",
    tags: { lighting: "flexible", energy: "low", social: "alone", space: "flexible", gender: "neutral" },
  },
  {
    id: "concentrated-frown",
    text: "Concentrated on something off-frame, slight frown, lips parted in focus.",
    displayName: "Concentration léger froncement",
    tags: { lighting: "flexible", energy: "medium", social: "flexible", space: "flexible", gender: "neutral" },
  },
  {
    id: "duck-face-playful",
    text: "Pouty playful 'duck face' aware of the camera, slightly ironic, hint of smile in the eyes.",
    displayName: "Duck face joueur",
    tags: { lighting: "flexible", energy: "low", social: "alone", space: "flexible", gender: "feminine" },
  },
  {
    id: "pure-joy-mid-shout",
    text: "Pure joy, mouth wide open, eyes bright, mid-shout or mid-cheer.",
    displayName: "Joie pure cri / cheer",
    tags: { lighting: "flexible", energy: "high", social: "flexible", space: "flexible", gender: "neutral" },
  },
  {
    id: "annoyed-jaw-set",
    text: "Annoyed, jaw set, eyes flat, half-look at the camera or off to the side.",
    displayName: "Énervée mâchoire serrée",
    tags: { lighting: "flexible", energy: "low", social: "flexible", space: "flexible", gender: "neutral" },
  },
  {
    id: "lost-in-thought",
    text: "Lost in thought, looking at nothing in particular, melancholic neutral expression.",
    displayName: "Perdue dans ses pensées",
    tags: { lighting: "flexible", energy: "low", social: "flexible", space: "flexible", gender: "neutral" },
  },
  {
    id: "self-aware-half-smile",
    text: "Tired self-aware half-smile, eyebrows slightly raised in a 'well, here I am' expression.",
    displayName: "Demi-sourire conscient",
    tags: { lighting: "flexible", energy: "low", social: "flexible", space: "flexible", gender: "neutral" },
  },
  {
    id: "mid-conversation-listening",
    text: "Mid-conversation expression, looking slightly off-camera, listening with attention, slight smile or neutral.",
    displayName: "Conversation à l'écoute",
    tags: { lighting: "flexible", energy: "medium", social: "with-others", space: "flexible", gender: "neutral" },
  },
  {
    id: "mid-conversation-talking",
    text: "Mid-conversation expression, lips parted in the middle of saying something, hand gesture half-visible.",
    displayName: "Conversation en train de parler",
    tags: { lighting: "flexible", energy: "medium", social: "with-others", space: "flexible", gender: "neutral" },
  },
  {
    id: "sleepy-content",
    text: "Sleepy content expression, eyes heavy-lidded, soft natural relaxation, no posing.",
    displayName: "Endormie satisfaite",
    tags: { lighting: "flexible", energy: "low", social: "flexible", space: "flexible", gender: "neutral" },
  },
  {
    id: "surprised-caught-off-guard",
    text: "Surprised caught off guard expression, eyebrows raised, mouth slightly open, not posing.",
    displayName: "Surprise prise sur le fait",
    tags: { lighting: "flexible", energy: "medium", social: "flexible", space: "flexible", gender: "neutral" },
  },
  {
    id: "grateful-genuine",
    text: "Genuine quiet happiness, soft smile, eyes calm, the expression of feeling good in this moment without performing it.",
    displayName: "Gratitude sincère",
    tags: { lighting: "flexible", energy: "low", social: "flexible", space: "flexible", gender: "neutral" },
  },
  {
    id: "doubtful-skeptical",
    text: "Doubtful skeptical expression, one eyebrow slightly raised, mouth pressed, evaluating.",
    displayName: "Sceptique dubitative",
    tags: { lighting: "flexible", energy: "low", social: "flexible", space: "flexible", gender: "neutral" },
  },
  {
    id: "distracted-phone-focus",
    text: "Distracted half-frown looking down at the phone, the focused look of someone tracking something on a screen.",
    displayName: "Distraite focus téléphone",
    tags: { lighting: "flexible", energy: "low", social: "alone", space: "flexible", gender: "neutral" },
  },
  {
    id: "confident-direct-gaze",
    text: "Confident direct gaze at the camera, slight closed-mouth smile, no performative energy, just present.",
    displayName: "Regard direct confiant",
    tags: { lighting: "flexible", energy: "medium", social: "flexible", space: "flexible", gender: "neutral" },
  },
  {
    id: "vulnerable-soft",
    text: "Vulnerable soft expression, slight downturn of the mouth, eyes a bit glassy without crying, the look of someone holding something in.",
    displayName: "Vulnérable douce",
    tags: { lighting: "flexible", energy: "low", social: "alone", space: "flexible", gender: "feminine" },
  },
  {
    id: "playful-tongue-out",
    text: "Playful tongue out or silly face, clearly hamming for the camera in a friendly way, low-key.",
    displayName: "Joueuse langue tirée",
    tags: { lighting: "flexible", energy: "medium", social: "flexible", space: "flexible", gender: "neutral" },
  },
  {
    id: "serious-direct-stare",
    text: "Serious direct stare at the camera, no smile, jaw relaxed but set, the look of someone confident in their stillness. No performance, just presence.",
    displayName: "Regard direct sérieux",
    tags: { lighting: "flexible", energy: "low", social: "flexible", space: "flexible", gender: "masculine" },
  },
  {
    id: "mid-action-focused",
    text: "Concentrated on something he's doing — reading, lifting, fixing, gaming, working. Slight furrow of the brows, eyes focused on the task, lips slightly parted. Caught in the moment, not aware of the camera.",
    displayName: "Mid-action concentré",
    tags: { lighting: "flexible", energy: "medium", social: "flexible", space: "flexible", gender: "neutral" },
  },
  {
    id: "casual-confidence-half-smirk",
    text: "Casual confident half-smirk, one corner of the mouth slightly lifted, eyes neutral or slightly amused. Not posing for the camera, just present and aware. The expression you'd give a friend mid-conversation, not a model in a shoot.",
    displayName: "Demi-sourire confiant casual",
    tags: { lighting: "flexible", energy: "low", social: "flexible", space: "flexible", gender: "masculine" },
  },
  {
    id: "tired-detached",
    text: "Tired and detached expression, eyes slightly heavy-lidded, no emotional charge, just exhausted neutrality. Not vulnerable, not sad — just drained and unbothered.",
    displayName: "Fatigué détaché",
    tags: { lighting: "flexible", energy: "low", social: "flexible", space: "flexible", gender: "neutral" },
  },
  {
    id: "casual-cool-no-expression",
    text: "Completely neutral expression, eyes relaxed, mouth at rest, no posing, no smiling, no performing. Just casually present in the moment, the kind of face you have when you're not aware anyone is paying attention.",
    displayName: "Cool neutre sans expression",
    tags: { lighting: "flexible", energy: "low", social: "flexible", space: "flexible", gender: "neutral" },
  },
  {
    id: "looksmaxxing-serene",
    text: "Calm serene expression with a slight self-aware quality. Eyes either looking directly at the camera with a quiet steadiness, or looking slightly off to the side with a meditative quality. Lips relaxed, slight closed-mouth softness. The vibe is 'in the moment without posing for it', the modern looksmaxxing TikTok register.",
    displayName: "Looksmaxxing serein",
    tags: { lighting: "flexible", energy: "low", social: "flexible", space: "flexible", gender: "neutral" },
  },

  // === NEW FEMININE EMOTIONS (40) ===
  { id: "mid-sentence-talking-to-camera", text: "Mid-sentence, talking to the camera as if filming a story video. Mouth in motion forming a word, eyes looking directly at the lens. Slight expressiveness in the eyebrows.", displayName: "Mi-phrase parle caméra", tags: { lighting: "flexible", energy: "medium", social: "alone", space: "flexible", gender: "feminine" } },
  { id: "soft-asymmetric-smile", text: "Small closed-mouth asymmetric smile. One corner slightly higher than the other. No teeth showing. Soft and unposed.", displayName: "Demi-sourire doux", tags: { lighting: "flexible", energy: "low", social: "flexible", space: "flexible", gender: "feminine" } },
  { id: "lips-slightly-pressed-thoughtful", text: "Lips lightly pressed together, eyes slightly distant or looking off. Lost in a thought, not aware of being photographed.", displayName: "Lèvres pressées pensive", tags: { lighting: "flexible", energy: "low", social: "alone", space: "flexible", gender: "feminine" } },
  { id: "eyebrows-raised-questioning", text: "Eyebrows raised, micro-question on the face. Lips slightly parted as if about to ask something. Direct gaze at camera.", displayName: "Sourcils levés interrogative", tags: { lighting: "flexible", energy: "medium", social: "flexible", space: "flexible", gender: "feminine" } },
  { id: "caught-mid-laugh-hand-near-mouth", text: "Brief laugh caught mid-action, hand raised near the mouth as if to half-cover it. Eyes slightly squinted from genuine amusement. Not posed.", displayName: "Rire main bouche", tags: { lighting: "flexible", energy: "medium", social: "with-others", space: "flexible", gender: "feminine" } },
  { id: "side-glance-mid-thought", text: "Looking off to the side, eyes unfocused, mind elsewhere. Not aware of the camera. Lips relaxed.", displayName: "Regard de côté pensive", tags: { lighting: "flexible", energy: "low", social: "flexible", space: "flexible", gender: "feminine" } },
  { id: "slight-pout-checking-self", text: "Slight pout, checking her own appearance on the phone screen. Critical evaluative look at herself.", displayName: "Moue vérification", tags: { lighting: "flexible", energy: "low", social: "alone", space: "flexible", gender: "feminine" } },
  { id: "puppy-eyes-soft", text: "Big soft eyes looking directly at camera. Vulnerable open expression, lips slightly parted. Not seductive — just genuinely soft.", displayName: "Yeux doux vulnérable", tags: { lighting: "flexible", energy: "low", social: "flexible", space: "flexible", gender: "feminine" } },
  { id: "lips-bitten-shy", text: "Lower lip lightly bitten, slight shyness. Eyes looking down or off-camera. Subtle expression.", displayName: "Lèvre mordue timide", tags: { lighting: "flexible", energy: "low", social: "flexible", space: "flexible", gender: "feminine" } },
  { id: "faint-smile-eyes-down", text: "Tiny smile barely visible, eyes looking downward. A private quiet moment, not for the camera.", displayName: "Sourire infime yeux bas", tags: { lighting: "flexible", energy: "low", social: "alone", space: "flexible", gender: "feminine" } },
  { id: "disappointed-lips-flat", text: "Lips set in a flat line. Quiet disappointment, not dramatic. Eyes neutral or slightly downcast.", displayName: "Déception lèvres droites", tags: { lighting: "flexible", energy: "low", social: "flexible", space: "flexible", gender: "feminine" } },
  { id: "emotional-watery-eyes", text: "Eyes glistening with held-back emotion, no actual tears falling. Slight redness around the eyes. Lips slightly trembling or pressed.", displayName: "Yeux brillants émue", tags: { lighting: "flexible", energy: "low", social: "flexible", space: "flexible", gender: "feminine" } },
  { id: "self-conscious-half-turn", text: "Head half-turned away, glancing furtively at the camera as if just noticing it. Self-conscious not posed.", displayName: "Tête à demi tournée", tags: { lighting: "flexible", energy: "low", social: "flexible", space: "flexible", gender: "feminine" } },
  { id: "gentle-laugh-eyes-crinkled", text: "Soft genuine laugh. Crow's feet wrinkles around the eyes. Mouth barely open. Authentic moment.", displayName: "Rire doux yeux plissés", tags: { lighting: "flexible", energy: "medium", social: "with-others", space: "flexible", gender: "feminine" } },
  { id: "bored-staring-into-distance", text: "Vacant stare into the distance, gentle boredom. Eyes unfocused, lips relaxed but slightly turned down.", displayName: "Ennui regard absent", tags: { lighting: "flexible", energy: "low", social: "flexible", space: "flexible", gender: "feminine" } },
  { id: "overwhelmed-hand-to-forehead", text: "One hand raised to the forehead, eyes slightly closed or looking down. Quiet 'ugh' moment of being overwhelmed. Mid-gesture.", displayName: "Main au front overwhelmée", tags: { lighting: "flexible", energy: "medium", social: "flexible", space: "flexible", gender: "feminine" } },
  { id: "explaining-something-mid-gesture", text: "Mid-explanation, mouth slightly open forming a word. Hands implied off-camera or partially blurred from motion. Animated but not theatrical.", displayName: "Explique mi-geste", tags: { lighting: "flexible", energy: "medium", social: "with-others", space: "flexible", gender: "feminine" } },
  { id: "half-smile-while-listening", text: "Small smile while listening to someone, eyes focused on a side direction. Engaged in a conversation off-camera.", displayName: "Demi-sourire écoutant", tags: { lighting: "flexible", energy: "low", social: "with-others", space: "flexible", gender: "feminine" } },
  { id: "lips-slightly-parted-vacant", text: "Lips slightly parted, no expression in the mouth or eyes. Just present, not thinking, not feeling. Vacant.", displayName: "Lèvres entrouvertes vacante", tags: { lighting: "flexible", energy: "low", social: "alone", space: "flexible", gender: "feminine" } },
  { id: "trying-to-look-cute-knows-it", text: "Aware of trying to look cute for the camera, ironic micro-smirk acknowledging it. Self-aware playful but quiet.", displayName: "Cute consciente", tags: { lighting: "flexible", energy: "low", social: "alone", space: "flexible", gender: "feminine" } },
  { id: "about-to-say-something", text: "Mouth about to open to speak, eyebrows slightly raised in anticipation. Caught right before the word comes out.", displayName: "Sur le point de parler", tags: { lighting: "flexible", energy: "medium", social: "flexible", space: "flexible", gender: "feminine" } },
  { id: "nodding-slightly-agreeing", text: "Slight head tilt downward in agreement, soft expression. Acknowledging silently.", displayName: "Léger acquiescement", tags: { lighting: "flexible", energy: "low", social: "with-others", space: "flexible", gender: "feminine" } },
  { id: "distracted-twirling-hair-implied", text: "Distracted, eyes elsewhere, with one hand near hair as if twirling it absentmindedly. Subtle gesture implied.", displayName: "Distraite cheveux", tags: { lighting: "flexible", energy: "low", social: "flexible", space: "flexible", gender: "feminine" } },
  { id: "end-of-laugh-soft-comedown", text: "End of a laugh fading. Smile partially gone but eyes still slightly creased. Coming down from the moment.", displayName: "Fin de rire", tags: { lighting: "flexible", energy: "low", social: "flexible", space: "flexible", gender: "feminine" } },
  { id: "processing-bad-news-blank", text: "Just received bad news. Face is going blank as the brain processes. No reaction yet, just suspended in the moment.", displayName: "Encaisse mauvaise nouvelle", tags: { lighting: "flexible", energy: "low", social: "flexible", space: "flexible", gender: "feminine" } },
  { id: "quiet-pride-eyes-shine", text: "Contained pride. Slight glint in the eyes, closed-mouth subtle smile. A private moment of accomplishment.", displayName: "Fierté contenue", tags: { lighting: "flexible", energy: "low", social: "flexible", space: "flexible", gender: "feminine" } },
  { id: "low-key-sad-mouth-pulled-down", text: "Mouth corners pulled down slightly, gentle sadness without drama. Eyes focused or unfocused.", displayName: "Tristesse contenue", tags: { lighting: "flexible", energy: "low", social: "flexible", space: "flexible", gender: "feminine" } },
  { id: "quiet-disappointment-no-words", text: "Silent disappointed face, lips closed, eyes saying everything. Holding back what would be a comment.", displayName: "Déception silencieuse", tags: { lighting: "flexible", energy: "low", social: "flexible", space: "flexible", gender: "feminine" } },
  { id: "annoyed-but-polite-fake-smile", text: "Forced light smile, jaw slightly tense underneath. Polite irritation that the photo can almost pick up.", displayName: "Faux sourire poli", tags: { lighting: "flexible", energy: "low", social: "with-others", space: "flexible", gender: "feminine" } },
  { id: "holding-back-tears-eyes-glassy", text: "Eyes shining with held-back tears, jaw tight to keep them in. Visible struggle, no actual crying.", displayName: "Retient les larmes", tags: { lighting: "flexible", energy: "low", social: "flexible", space: "flexible", gender: "feminine" } },
  { id: "micro-eye-roll-restraint", text: "Tiny eye roll just barely visible, with restraint. Almost imperceptible irritation.", displayName: "Micro-roulement yeux", tags: { lighting: "flexible", energy: "low", social: "with-others", space: "flexible", gender: "feminine" } },
  { id: "about-to-cry-still-holding", text: "About to cry, lips trembling slightly, but still holding it together. Vulnerability rising.", displayName: "Sur le point de pleurer", tags: { lighting: "flexible", energy: "low", social: "flexible", space: "flexible", gender: "feminine" } },
  { id: "listening-bestie-tells-drama", text: "Engaged listening face, eyes wide with interest as a friend tells drama. Slight 'no way' expression starting.", displayName: "Écoute drama amie", tags: { lighting: "flexible", energy: "medium", social: "with-others", space: "flexible", gender: "feminine" } },
  { id: "rolling-eyes-at-friend-playful", text: "Playful eye roll directed at a friend off-camera. Affectionate exasperation.", displayName: "Roulement yeux taquin", tags: { lighting: "flexible", energy: "medium", social: "with-others", space: "flexible", gender: "feminine" } },
  { id: "genuine-empathy-soft-eyes", text: "Eyes soft with sincere empathy, listening to someone's struggle. Compassion without performance.", displayName: "Empathie sincère", tags: { lighting: "flexible", energy: "low", social: "with-others", space: "flexible", gender: "feminine" } },
  { id: "holding-perfume-mid-smell", text: "Wrist near nose, smelling perfume, eyes slightly closed. Quiet pleasure, mid-action.", displayName: "Sent parfum", tags: { lighting: "flexible", energy: "low", social: "alone", space: "indoor-private", gender: "feminine" } },
  { id: "fond-memory-soft-smile", text: "Small smile while remembering something good. Eyes drifted slightly, mouth gently curved.", displayName: "Souvenir doux", tags: { lighting: "flexible", energy: "low", social: "alone", space: "flexible", gender: "feminine" } },
  { id: "nostalgic-eyes-distant", text: "Looking off into nothing, slightly melancholic, lost in nostalgia. Lips relaxed, eyes far away.", displayName: "Nostalgie regard lointain", tags: { lighting: "flexible", energy: "low", social: "flexible", space: "flexible", gender: "feminine" } },
  { id: "pre-flirt-eye-contact", text: "Direct eye contact at camera with a soft barely-there smirk. Pre-flirty energy, controlled.", displayName: "Pré-flirt regard", tags: { lighting: "flexible", energy: "low", social: "flexible", space: "flexible", gender: "feminine" } },
  { id: "flirty-look-side-glance", text: "Side glance with subtle flirtatious smile. Eyes returning to camera in a half-second motion.", displayName: "Regard charmeur", tags: { lighting: "flexible", energy: "low", social: "flexible", space: "flexible", gender: "feminine" } },

  // === NEW MASCULINE EMOTIONS (30 — plus 2 retagged above = 32 total) ===
  { id: "mid-sentence-flat-jaw", text: "Talking to camera mid-sentence, jaw relaxed, low expressiveness. Just delivering a thought without animation.", displayName: "Mi-phrase mâchoire détendue", tags: { lighting: "flexible", energy: "medium", social: "alone", space: "flexible", gender: "masculine" } },
  { id: "direct-stare-no-emotion", text: "Direct stare at the camera, completely neutral expression. No smile, no emotion. Just looking.", displayName: "Regard direct neutre", tags: { lighting: "flexible", energy: "low", social: "flexible", space: "flexible", gender: "masculine" } },
  { id: "half-smirk-closed-mouth", text: "Half-smirk with closed mouth, confident but understated. One side of the mouth slightly up.", displayName: "Demi-smirk fermé", tags: { lighting: "flexible", energy: "low", social: "flexible", space: "flexible", gender: "masculine" } },
  { id: "jaw-set-looking-off-camera", text: "Jaw firmly set, eyes looking off-camera. Serious mood, not posed.", displayName: "Mâchoire serrée regard ailleurs", tags: { lighting: "flexible", energy: "low", social: "flexible", space: "flexible", gender: "masculine" } },
  { id: "slight-headtilt-down-eyes-up", text: "Head tilted slightly down, eyes coming up to meet the camera. Subtle confident pose without being a pose.", displayName: "Tête baissée yeux levés", tags: { lighting: "flexible", energy: "low", social: "flexible", space: "flexible", gender: "masculine" } },
  { id: "eyebrow-raised-skeptical", text: "One eyebrow slightly raised in skepticism. Subtle, not theatrical.", displayName: "Sourcil sceptique", tags: { lighting: "flexible", energy: "low", social: "flexible", space: "flexible", gender: "masculine" } },
  { id: "side-eye-suspicious", text: "Side-eye glance, lips closed, suspicious or wary. Eyes off to the side.", displayName: "Regard méfiant côté", tags: { lighting: "flexible", energy: "low", social: "flexible", space: "flexible", gender: "masculine" } },
  { id: "unbothered-neutral-relax", text: "Completely relaxed neutral face. No tension anywhere, just present. Confident in not posing.", displayName: "Relax inébranlable", tags: { lighting: "flexible", energy: "low", social: "flexible", space: "flexible", gender: "masculine" } },
  { id: "contemplating-staring-down", text: "Looking down, deep in thought. Eyes fixed on a non-specific point.", displayName: "Contemplation regard bas", tags: { lighting: "flexible", energy: "low", social: "alone", space: "flexible", gender: "masculine" } },
  { id: "amused-closed-mouth", text: "Quiet amusement contained behind a closed mouth. Slight crinkle around the eyes.", displayName: "Amusé fermé", tags: { lighting: "flexible", energy: "low", social: "flexible", space: "flexible", gender: "masculine" } },
  { id: "focused-jaw-tight", text: "Focused on a task, jaw slightly tightened from concentration. Brows just barely furrowed.", displayName: "Focus mâchoire tendue", tags: { lighting: "flexible", energy: "medium", social: "flexible", space: "flexible", gender: "masculine" } },
  { id: "post-workout-neutral-tired", text: "Just finished a workout, breathing slightly heavy. Tired neutral face, no performance.", displayName: "Post-séance fatigué", tags: { lighting: "flexible", energy: "low", social: "alone", space: "flexible", gender: "masculine" } },
  { id: "chin-up-confident-stare", text: "Chin lifted slightly, firm direct gaze. Confident grounded stance.", displayName: "Menton relevé confiant", tags: { lighting: "flexible", energy: "low", social: "flexible", space: "flexible", gender: "masculine" } },
  { id: "brow-furrowed-mid-action", text: "Brows furrowed in concentration during an action. Caught mid-doing-something.", displayName: "Sourcils froncés mi-action", tags: { lighting: "flexible", energy: "medium", social: "flexible", space: "flexible", gender: "masculine" } },
  { id: "casual-cool-side-profile", text: "Side profile, casual look, not aware of camera. Caught at a 3/4 angle without intention.", displayName: "Profil casual cool", tags: { lighting: "flexible", energy: "low", social: "flexible", space: "flexible", gender: "masculine" } },
  { id: "mid-explanation-flat-face", text: "Explaining something to the camera, flat face, low animation. Just delivering information.", displayName: "Explication visage neutre", tags: { lighting: "flexible", energy: "medium", social: "alone", space: "flexible", gender: "masculine" } },
  { id: "slow-nod-acknowledging", text: "Slow nod with eyes locked on camera. Acknowledging silently.", displayName: "Hochement lent", tags: { lighting: "flexible", energy: "low", social: "with-others", space: "flexible", gender: "masculine" } },
  { id: "checking-his-fit-mirror-neutral", text: "Looking at himself in a mirror, evaluating his outfit, neutral assessing face. No expression yet.", displayName: "Vérifie son look", tags: { lighting: "flexible", energy: "low", social: "alone", space: "indoor-private", gender: "masculine" } },
  { id: "unimpressed-slight-frown", text: "Slight frown, lips closed, not convinced. Cool unimpressed look.", displayName: "Pas convaincu", tags: { lighting: "flexible", energy: "low", social: "flexible", space: "flexible", gender: "masculine" } },
  { id: "listening-arms-crossed-implied", text: "Arms crossed implied off-camera, posture closed, listening intently. Reserved expression.", displayName: "Écoute bras croisés", tags: { lighting: "flexible", energy: "low", social: "with-others", space: "flexible", gender: "masculine" } },
  { id: "about-to-laugh-suppressed", text: "About to laugh but suppressing it. Lips pressed together, eyes squinting from the held back laugh.", displayName: "Sur le point de rire", tags: { lighting: "flexible", energy: "medium", social: "with-others", space: "flexible", gender: "masculine" } },
  { id: "post-shower-relaxed-blank", text: "Just out of shower, hair wet, completely relaxed neutral expression. Pure unaware moment.", displayName: "Post-douche neutre", tags: { lighting: "flexible", energy: "low", social: "alone", space: "indoor-private", gender: "masculine" } },
  { id: "mid-thought-staring-floor", text: "Looking down at the floor, lost in a thought. Brows slightly furrowed.", displayName: "Pensée regard sol", tags: { lighting: "flexible", energy: "low", social: "alone", space: "flexible", gender: "masculine" } },
  { id: "slight-shrug-with-face", text: "Slight shoulder shrug implied off-camera, face saying 'whatever'. Casual non-committal expression.", displayName: "Léger 'bof'", tags: { lighting: "flexible", energy: "low", social: "flexible", space: "flexible", gender: "masculine" } },
  { id: "defensive-chin-tucked-eyes-up", text: "Chin tucked slightly, eyes coming up at camera. Defensive ready posture.", displayName: "Menton rentré défensif", tags: { lighting: "flexible", energy: "low", social: "flexible", space: "flexible", gender: "masculine" } },
  { id: "stoic-not-showing-pain", text: "Closed face, refusing to show pain or emotion. Jaw tight, eyes steady.", displayName: "Stoïque cache douleur", tags: { lighting: "flexible", energy: "low", social: "flexible", space: "flexible", gender: "masculine" } },
  { id: "quiet-rage-controlled", text: "Controlled quiet anger, jaw tense, gaze cold. No outburst, just suppressed.", displayName: "Colère sourde", tags: { lighting: "flexible", energy: "low", social: "flexible", space: "flexible", gender: "masculine" } },
  { id: "holding-back-comment-pursed", text: "Lips pursed holding back a sharp comment. Dry restraint.", displayName: "Retient commentaire", tags: { lighting: "flexible", energy: "low", social: "with-others", space: "flexible", gender: "masculine" } },
  { id: "proud-of-self-quiet", text: "Quiet pride, looking slightly upward or away with a small closed-mouth smile.", displayName: "Fierté silencieuse", tags: { lighting: "flexible", energy: "low", social: "alone", space: "flexible", gender: "masculine" } },
  { id: "determined-jaw-locked", text: "Determined expression, jaw locked, eyes firm. Ready to do something.", displayName: "Détermination", tags: { lighting: "flexible", energy: "medium", social: "flexible", space: "flexible", gender: "masculine" } },

  // === NEW NEUTRAL — phantom IDs textified (20) ===
  { id: "caught-off-guard-blank", text: "Caught off guard, brief blank moment of being mid-thought when the camera fired. No reaction, no expression yet.", displayName: "Pris au dépourvu blanc", tags: { lighting: "flexible", energy: "low", social: "flexible", space: "flexible", gender: "neutral" } },
  { id: "mid-yawn-natural", text: "Mid-yawn caught naturally, mouth open, eyes squeezed slightly shut. Involuntary moment, not for the camera.", displayName: "Mi-bâillement naturel", tags: { lighting: "flexible", energy: "low", social: "flexible", space: "flexible", gender: "neutral" } },
  { id: "mid-blink-half-closed-eyes", text: "Caught mid-blink, eyes half-closed. Brief involuntary moment, face otherwise neutral.", displayName: "Mi-clignement yeux mi-clos", tags: { lighting: "flexible", energy: "low", social: "flexible", space: "flexible", gender: "neutral" } },
  { id: "distracted-looking-up", text: "Looking up at something off-frame, mouth slightly open, mind elsewhere. Distracted, unaware of the camera.", displayName: "Distrait regard en haut", tags: { lighting: "flexible", energy: "low", social: "flexible", space: "flexible", gender: "neutral" } },
  { id: "slight-frown-reading-screen", text: "Slight frown reading something on a screen, brows lightly drawn together in focus. Lips closed.", displayName: "Léger froncement écran", tags: { lighting: "flexible", energy: "low", social: "alone", space: "flexible", gender: "neutral" } },
  { id: "mouth-slightly-open-no-reason", text: "Mouth slightly open for no particular reason, just the mid-breath state. Eyes neutral, no thought, no expression.", displayName: "Bouche entrouverte sans raison", tags: { lighting: "flexible", energy: "low", social: "flexible", space: "flexible", gender: "neutral" } },
  { id: "unfocused-stare-window", text: "Unfocused stare toward a window, mind elsewhere. Eyes glassy, not seeing what's outside.", displayName: "Regard absent fenêtre", tags: { lighting: "flexible", energy: "low", social: "alone", space: "flexible", gender: "neutral" } },
  { id: "relaxed-eyes-soft", text: "Eyes relaxed, soft, no tension anywhere on the face. Just present in the moment without intent.", displayName: "Yeux relâchés doux", tags: { lighting: "flexible", energy: "low", social: "flexible", space: "flexible", gender: "neutral" } },
  { id: "small-smile-genuinely-content", text: "Small genuine closed-mouth smile, lips lightly curved, eyes slightly creased. Quiet contentment, not for show.", displayName: "Petit sourire content", tags: { lighting: "flexible", energy: "low", social: "flexible", space: "flexible", gender: "neutral" } },
  { id: "listening-with-slight-nod", text: "Listening to someone with a slight head nod of acknowledgement. Eyes engaged, lips relaxed.", displayName: "Écoute léger hochement", tags: { lighting: "flexible", energy: "low", social: "with-others", space: "flexible", gender: "neutral" } },
  { id: "selfie-front-cam-talking-real", text: "Filming a story on the front camera mid-sentence. Mouth in motion, eyes on the lens, low animation. Just talking, not performing.", displayName: "Selfie front-cam parle vrai", tags: { lighting: "flexible", energy: "medium", social: "alone", space: "flexible", gender: "neutral" } },
  { id: "selfie-front-cam-just-staring", text: "Front-cam selfie, just staring blankly into the camera lens. No expression, low energy. The vibe of a vlog mid-pause.", displayName: "Selfie front-cam regard fixe", tags: { lighting: "flexible", energy: "low", social: "alone", space: "flexible", gender: "neutral" } },
  { id: "selfie-mid-rant-animated", text: "Front-cam selfie mid-rant, mouth animated mid-sentence, eyebrows slightly raised. Engaged but not theatrical, real story-vlog energy.", displayName: "Selfie mi-rant animé", tags: { lighting: "flexible", energy: "medium", social: "alone", space: "flexible", gender: "neutral" } },
  { id: "selfie-checking-something-elsewhere", text: "Front-cam selfie but eyes are checking something else off-screen, mouth slightly open. Distracted from the camera mid-vlog.", displayName: "Selfie regard ailleurs", tags: { lighting: "flexible", energy: "low", social: "alone", space: "flexible", gender: "neutral" } },
  { id: "caught-mid-bite", text: "Caught mid-bite of food, cheek slightly puffed, mouth closed around the bite. Not posing, just eating.", displayName: "Pris en plein bouchée", tags: { lighting: "flexible", energy: "low", social: "flexible", space: "flexible", gender: "neutral" } },
  { id: "mid-sip-from-cup", text: "Mid-sip from a cup or glass, lips closed around the rim. Eyes slightly down focused on the drink.", displayName: "Mi-gorgée tasse", tags: { lighting: "flexible", energy: "low", social: "flexible", space: "flexible", gender: "neutral" } },
  { id: "about-to-sneeze", text: "About to sneeze, face crumpling slightly, eyes squeezing shut, nose scrunched. Caught a half-second before the sneeze.", displayName: "Sur le point d'éternuer", tags: { lighting: "flexible", energy: "low", social: "flexible", space: "flexible", gender: "neutral" } },
  { id: "just-after-yawn-watery-eyes", text: "Just finished yawning, eyes slightly watery from the yawn. Mouth closed, slight tiredness in the face.", displayName: "Post-bâillement yeux humides", tags: { lighting: "flexible", energy: "low", social: "flexible", space: "flexible", gender: "neutral" } },
  { id: "deep-exhale-frustrated", text: "Deep exhale through closed mouth or pursed lips, contained frustration. Shoulders implied dropping off-camera.", displayName: "Soupir contenu", tags: { lighting: "flexible", energy: "low", social: "flexible", space: "flexible", gender: "neutral" } },
  { id: "caught-zoning-out", text: "Caught zoning out, eyes glazed and unfocused, mouth slightly open. Mind nowhere in particular, just blank present.", displayName: "Pris en zone-out", tags: { lighting: "flexible", energy: "low", social: "flexible", space: "flexible", gender: "neutral" } },

  // === NEW NEUTRAL — Cat 1: Micro-expressions (15) ===
  { id: "one-eyebrow-arched-judging", text: "One eyebrow lifted in subtle judgment, the rest of the face neutral. Restrained reaction.", displayName: "Sourcil arqué jugement", tags: { lighting: "flexible", energy: "low", social: "flexible", space: "flexible", gender: "neutral" } },
  { id: "nostrils-slightly-flared-restraint", text: "Nostrils very slightly flared, holding back a reaction. Visible self-control.", displayName: "Narines dilatées", tags: { lighting: "flexible", energy: "low", social: "flexible", space: "flexible", gender: "neutral" } },
  { id: "upper-lip-twitch-disgust-light", text: "Tiny upper lip twitch, mild disgust or distaste. Not exaggerated.", displayName: "Lèvre sup léger dégoût", tags: { lighting: "flexible", energy: "low", social: "flexible", space: "flexible", gender: "neutral" } },
  { id: "jaw-clenching-suppressed-anger", text: "Jaw clenched, suppressed anger barely visible. Otherwise neutral face.", displayName: "Mâchoire colère contenue", tags: { lighting: "flexible", energy: "low", social: "flexible", space: "flexible", gender: "neutral" } },
  { id: "nose-scrunched-mild-disgust", text: "Nose lightly scrunched in mild distaste. Subtle reaction.", displayName: "Nez froncé léger dégoût", tags: { lighting: "flexible", energy: "low", social: "flexible", space: "flexible", gender: "neutral" } },
  { id: "squint-trying-to-see-something", text: "Eyes squinted trying to see something far or unclear. Focused effort.", displayName: "Plisse pour voir", tags: { lighting: "flexible", energy: "low", social: "flexible", space: "flexible", gender: "neutral" } },
  { id: "smirk-corner-mouth-only", text: "Just one corner of the mouth slightly raised, the rest of the face inert. Minimal smirk.", displayName: "Smirk coin bouche", tags: { lighting: "flexible", energy: "low", social: "flexible", space: "flexible", gender: "neutral" } },
  { id: "lower-lip-jutted-thinking", text: "Lower lip slightly pushed out in thought. Pondering expression.", displayName: "Lèvre poussée pensif", tags: { lighting: "flexible", energy: "low", social: "flexible", space: "flexible", gender: "neutral" } },
  { id: "eyes-widening-slow-realization", text: "Eyes slowly widening as a realization dawns. Caught mid-process.", displayName: "Yeux s'élargissent", tags: { lighting: "flexible", energy: "low", social: "flexible", space: "flexible", gender: "neutral" } },
  { id: "micro-frown-confusion", text: "Tiny frown between the eyebrows, mild confusion. Asking nothing yet.", displayName: "Micro-froncement confusion", tags: { lighting: "flexible", energy: "low", social: "flexible", space: "flexible", gender: "neutral" } },
  { id: "half-blink-camera-flash", text: "One eye half-closed as if just blinked through a camera flash. Caught mid-blink.", displayName: "Mi-clignement", tags: { lighting: "flexible", energy: "low", social: "flexible", space: "flexible", gender: "neutral" } },
  { id: "pursed-lips-restrained", text: "Lips pursed in restraint, holding back a comment. Composed expression.", displayName: "Lèvres pincées retenue", tags: { lighting: "flexible", energy: "low", social: "flexible", space: "flexible", gender: "neutral" } },
  { id: "tongue-pressing-cheek", text: "Tongue lightly pressed against the inside of the cheek, thinking. Subtle gesture visible from the outside.", displayName: "Langue contre joue", tags: { lighting: "flexible", energy: "low", social: "flexible", space: "flexible", gender: "neutral" } },
  { id: "raised-cheeks-no-mouth-smile", text: "Cheeks lifted as if smiling, but mouth completely neutral. Smile in the eyes only.", displayName: "Sourire des yeux", tags: { lighting: "flexible", energy: "low", social: "flexible", space: "flexible", gender: "neutral" } },
  { id: "slow-exhale-through-nose", text: "Slow exhalation through the nose. Calm, contained, slightly resigned.", displayName: "Expiration lente", tags: { lighting: "flexible", energy: "low", social: "flexible", space: "flexible", gender: "neutral" } },

  // === NEW NEUTRAL — Cat 2: Subtle negative emotions (7) ===
  { id: "quiet-irritation-jaw-tight", text: "Contained irritation, jaw firm, otherwise composed. Not letting it show fully.", displayName: "Irritation contenue", tags: { lighting: "flexible", energy: "low", social: "flexible", space: "flexible", gender: "neutral" } },
  { id: "mild-frustration-eyes-closed-brief", text: "Eyes briefly closed in frustration. A 2-second pause, not a tantrum.", displayName: "Frustration yeux fermés", tags: { lighting: "flexible", energy: "low", social: "flexible", space: "flexible", gender: "neutral" } },
  { id: "resigned-flat-face", text: "Completely flat face, accepting whatever is. No fight left.", displayName: "Résignation", tags: { lighting: "flexible", energy: "low", social: "flexible", space: "flexible", gender: "neutral" } },
  { id: "tired-of-this-conversation", text: "Visible exhaustion with the current conversation. Eyes shifting away.", displayName: "Fatigué de la conv", tags: { lighting: "flexible", energy: "low", social: "with-others", space: "flexible", gender: "neutral" } },
  { id: "emotionally-numb-blank", text: "Completely emotionally flat, anesthetized. Nothing in the eyes.", displayName: "Vide émotionnel", tags: { lighting: "flexible", energy: "low", social: "flexible", space: "flexible", gender: "neutral" } },
  { id: "defensive-arms-crossed-implied", text: "Defensive posture implied (shoulders forward, arms crossed off-camera). Closed expression.", displayName: "Posture défensive", tags: { lighting: "flexible", energy: "low", social: "flexible", space: "flexible", gender: "neutral" } },
  { id: "silent-treatment-look", text: "Silent treatment expression. Refusing to engage, eyes either fixed or pointedly avoiding camera.", displayName: "Refus de parler", tags: { lighting: "flexible", energy: "low", social: "with-others", space: "flexible", gender: "neutral" } },

  // === NEW NEUTRAL — Cat 3: Fatigue / physical vulnerability (15) ===
  { id: "just-woke-up-puffy-eyes", text: "Just woke up, eyelids puffy, hair messy, slightly dazed. Pre-coffee.", displayName: "Juste réveillé", tags: { lighting: "flexible", energy: "low", social: "alone", space: "indoor-private", gender: "neutral" } },
  { id: "hangover-mild-squinting", text: "Mild hangover, eyes squinted in the daylight, slight wince. Recovering.", displayName: "Gueule de bois légère", tags: { lighting: "daylight-natural", energy: "low", social: "flexible", space: "flexible", gender: "neutral" } },
  { id: "fever-flushed-cheeks", text: "Fever, cheeks flushed red, tired eyes. Slightly clammy look.", displayName: "Fièvre joues rouges", tags: { lighting: "flexible", energy: "low", social: "alone", space: "indoor-private", gender: "neutral" } },
  { id: "exhausted-end-of-day", text: "End of a long day, deep exhaustion. Heavy eyelids, slumped posture implied.", displayName: "Épuisé fin journée", tags: { lighting: "flexible", energy: "low", social: "flexible", space: "flexible", gender: "neutral" } },
  { id: "nauseous-pale-face", text: "Pale, slight nausea visible in the face. Not feeling well.", displayName: "Nausée pâleur", tags: { lighting: "flexible", energy: "low", social: "alone", space: "flexible", gender: "neutral" } },
  { id: "sleepy-fighting-it", text: "Fighting to stay awake, eyes drooping but trying to stay open.", displayName: "Lutte contre sommeil", tags: { lighting: "flexible", energy: "low", social: "flexible", space: "flexible", gender: "neutral" } },
  { id: "just-cried-puffy-red-eyes", text: "Eyes red and puffy from recent crying. No tears now, just aftermath.", displayName: "Vient de pleurer", tags: { lighting: "flexible", energy: "low", social: "alone", space: "indoor-private", gender: "neutral" } },
  { id: "heavy-eyelids-falling-asleep", text: "Eyelids heavy, on the verge of falling asleep. Slightly tipping.", displayName: "Paupières lourdes", tags: { lighting: "flexible", energy: "low", social: "alone", space: "flexible", gender: "neutral" } },
  { id: "sick-tissue-near-nose", text: "Sick, holding a tissue near the nose. Red nose tip.", displayName: "Malade mouchoir", tags: { lighting: "flexible", energy: "low", social: "alone", space: "indoor-private", gender: "neutral" } },
  { id: "allergies-watery-eyes-sneezing-coming", text: "Watery eyes from allergies, about to sneeze. Distinct visible discomfort.", displayName: "Allergies pré-éternuement", tags: { lighting: "flexible", energy: "low", social: "flexible", space: "flexible", gender: "neutral" } },
  { id: "headache-fingers-temple", text: "Fingers pressed to temple, headache, eyes slightly closed.", displayName: "Mal de tête", tags: { lighting: "flexible", energy: "low", social: "flexible", space: "flexible", gender: "neutral" } },
  { id: "drained-after-long-call", text: "Vacant exhausted look right after ending a long phone call. Phone still in hand or just put down.", displayName: "Vidé après appel", tags: { lighting: "flexible", energy: "low", social: "alone", space: "flexible", gender: "neutral" } },
  { id: "cold-shivering-slight", text: "Slight shiver from cold, cheeks slightly tense. Hugging arms or cup of something hot implied.", displayName: "Frisson froid", tags: { lighting: "flexible", energy: "low", social: "flexible", space: "flexible", gender: "neutral" } },
  { id: "dehydrated-dry-lips", text: "Dry lips, slight apathy. Looking like the day has been long.", displayName: "Déshydraté lèvres sèches", tags: { lighting: "flexible", energy: "low", social: "flexible", space: "flexible", gender: "neutral" } },
  { id: "just-pulled-all-nighter", text: "Post all-nighter, deep dark circles under eyes, glassy stare. Functioning but barely.", displayName: "Post-nuit blanche", tags: { lighting: "flexible", energy: "low", social: "flexible", space: "flexible", gender: "neutral" } },

  // === NEW NEUTRAL — Cat 4: Social / reactional (11) ===
  { id: "reacting-to-something-off-camera", text: "Reacting to something happening off-camera. Suspended expression mid-reaction.", displayName: "Réagit hors champ", tags: { lighting: "flexible", energy: "medium", social: "with-others", space: "flexible", gender: "neutral" } },
  { id: "trying-not-to-laugh-shoulders", text: "Trying not to laugh, shoulders slightly shaking off-camera, lips pressed.", displayName: "Retient un fou rire", tags: { lighting: "flexible", energy: "medium", social: "with-others", space: "flexible", gender: "neutral" } },
  { id: "cringing-internally-poker-face", text: "Internal cringe behind a poker face. Subtle tension despite neutral expression.", displayName: "Cringe poker face", tags: { lighting: "flexible", energy: "low", social: "with-others", space: "flexible", gender: "neutral" } },
  { id: "surprised-by-comment-blinking", text: "Just heard a surprising comment, eyes blinking quickly to process. Mild shock.", displayName: "Surpris par commentaire", tags: { lighting: "flexible", energy: "low", social: "with-others", space: "flexible", gender: "neutral" } },
  { id: "nodding-while-zoning-out", text: "Nodding politely but eyes tell us the mind is elsewhere.", displayName: "Hoche en zonant", tags: { lighting: "flexible", energy: "low", social: "with-others", space: "flexible", gender: "neutral" } },
  { id: "defensive-mid-argument", text: "Mid-argument defensive face, slightly recoiled, ready to respond.", displayName: "Mi-dispute défensif", tags: { lighting: "flexible", energy: "medium", social: "with-others", space: "flexible", gender: "neutral" } },
  { id: "agreeing-with-mild-laugh", text: "Slight nod with a small confirming laugh. Engaged in a positive conversation.", displayName: "D'accord petit rire", tags: { lighting: "flexible", energy: "medium", social: "with-others", space: "flexible", gender: "neutral" } },
  { id: "realization-moment-mouth-open", text: "Mouth slightly opening as a realization hits. Eyes widening fractionally.", displayName: "Moment réalisation", tags: { lighting: "flexible", energy: "medium", social: "flexible", space: "flexible", gender: "neutral" } },
  { id: "pretending-to-care", text: "Forced interest, eyes vacant despite a polite nod. Visible disconnect.", displayName: "Fait semblant écouter", tags: { lighting: "flexible", energy: "low", social: "with-others", space: "flexible", gender: "neutral" } },
  { id: "about-to-interrupt-mouth-half-open", text: "Mouth half-open, ready to interrupt. Caught right before speaking.", displayName: "Sur le point d'interrompre", tags: { lighting: "flexible", energy: "medium", social: "with-others", space: "flexible", gender: "neutral" } },
  { id: "mocking-incredulous", text: "Incredulous mocking expression, raised eyebrow plus half-smirk. Not buying it.", displayName: "Incrédule moqueur", tags: { lighting: "flexible", energy: "low", social: "with-others", space: "flexible", gender: "neutral" } },

  // === NEW NEUTRAL — Cat 5: Object / action (14) ===
  { id: "sniffing-coffee-eyes-closed", text: "Smelling coffee with eyes closed in simple pleasure. Cup near face.", displayName: "Sent café yeux fermés", tags: { lighting: "flexible", energy: "low", social: "alone", space: "flexible", gender: "neutral" } },
  { id: "tasting-something-evaluating", text: "Mid-taste, evaluating expression. Lips slightly closed, deciding if it's good.", displayName: "Goûte évalue", tags: { lighting: "flexible", energy: "low", social: "flexible", space: "flexible", gender: "neutral" } },
  { id: "checking-watch-quick", text: "Quick glance at the watch, neutral expression. Just a moment of time-checking.", displayName: "Vérifie l'heure", tags: { lighting: "flexible", energy: "low", social: "flexible", space: "flexible", gender: "neutral" } },
  { id: "reading-text-eyebrow-raised", text: "Reading a text on phone, one eyebrow slightly raised in reaction.", displayName: "Lit texto sourcil levé", tags: { lighting: "flexible", energy: "low", social: "alone", space: "flexible", gender: "neutral" } },
  { id: "opening-package-curious", text: "Opening a package, curious face, slight anticipation.", displayName: "Ouvre colis curieux", tags: { lighting: "flexible", energy: "medium", social: "alone", space: "indoor-private", gender: "neutral" } },
  { id: "trying-on-glasses-checking", text: "Trying on glasses, checking the fit and look. Self-evaluating.", displayName: "Essaie lunettes", tags: { lighting: "flexible", energy: "low", social: "flexible", space: "flexible", gender: "neutral" } },
  { id: "brushing-teeth-mid-action", text: "Mid-tooth-brushing, cheeks slightly puffed, brush in mouth.", displayName: "Brosse dents", tags: { lighting: "flexible", energy: "low", social: "alone", space: "indoor-private", gender: "neutral" } },
  { id: "drinking-from-bottle-head-back", text: "Drinking from a bottle, head tilted back. Action moment.", displayName: "Boit bouteille tête en arrière", tags: { lighting: "flexible", energy: "medium", social: "flexible", space: "flexible", gender: "neutral" } },
  { id: "eating-mid-chew", text: "Mid-chew, mouth closed, cheek slightly bulging. Ordinary moment of eating.", displayName: "Mâche", tags: { lighting: "flexible", energy: "low", social: "flexible", space: "flexible", gender: "neutral" } },
  { id: "sneezing-half-frame", text: "Mid-sneeze, face crumpled, expression caught. Real involuntary reaction.", displayName: "Éternue", tags: { lighting: "flexible", energy: "medium", social: "flexible", space: "flexible", gender: "neutral" } },
  { id: "coughing-into-hand", text: "Coughing into a closed fist, eyes lowered. Quick involuntary moment.", displayName: "Tousse dans la main", tags: { lighting: "flexible", energy: "low", social: "flexible", space: "flexible", gender: "neutral" } },
  { id: "taking-photo-of-something-focused", text: "Looking at the phone screen, framing a shot of something off-camera. Concentrated.", displayName: "Prend photo focus", tags: { lighting: "flexible", energy: "low", social: "alone", space: "flexible", gender: "neutral" } },
  { id: "listening-to-music-headphones-on", text: "Wearing headphones, lost in music. Inward expression, eyes closed or distant.", displayName: "Écoute musique casque", tags: { lighting: "flexible", energy: "low", social: "alone", space: "flexible", gender: "neutral" } },
  { id: "typing-on-phone-thumbs-focus", text: "Looking down at phone, thumbs typing fast, focused expression. Mid-message.", displayName: "Tape sur téléphone", tags: { lighting: "flexible", energy: "low", social: "flexible", space: "flexible", gender: "neutral" } },

  // === NEW NEUTRAL — Cat 6: Specific residual (6) ===
  { id: "realizing-late-for-something", text: "Sudden realization of being late, eyes widening, slight panic starting.", displayName: "Réalise être en retard", tags: { lighting: "flexible", energy: "medium", social: "flexible", space: "flexible", gender: "neutral" } },
  { id: "anticipating-something-good", text: "Subtle anticipation of something good. Tiny inner smile, eyes slightly bright.", displayName: "Anticipation positive", tags: { lighting: "flexible", energy: "low", social: "flexible", space: "flexible", gender: "neutral" } },
  { id: "nervous-anticipating-bad-news", text: "Anxious anticipation, brows slightly furrowed, eyes tight. Waiting for bad news.", displayName: "Anxiété mauvaise nouvelle", tags: { lighting: "flexible", energy: "low", social: "alone", space: "flexible", gender: "neutral" } },
  { id: "quiet-grief-no-tears", text: "Silent grief, no tears, just a heavy stillness. Eyes fixed on nothing.", displayName: "Deuil silencieux", tags: { lighting: "flexible", energy: "low", social: "alone", space: "flexible", gender: "neutral" } },
  { id: "accepting-bad-news-deep-breath", text: "Just accepted bad news, deep breath in, eyes closed briefly. Composing self.", displayName: "Accepte mauvaise nouvelle", tags: { lighting: "flexible", energy: "low", social: "flexible", space: "flexible", gender: "neutral" } },
  { id: "peace-after-conflict", text: "Calm settled face after a conflict has resolved. Quiet relief.", displayName: "Paix après conflit", tags: { lighting: "flexible", energy: "low", social: "flexible", space: "flexible", gender: "neutral" } },
];

// === EMOTION_MOOD_CATEGORIES =============================================
// Maps each mood category to the emotion IDs that fit it. Used by the
// weighted draw in `pickCompatibleCombination` when a persona has
// `stylePreferences.emotionWeights` set. An emotion can appear in multiple
// categories (their multipliers compound). Note: `edge-of-bed-sad` from the
// original spec was a SITUATION id, not an emotion — removed.
export const EMOTION_MOOD_CATEGORIES: Record<EmotionMoodCategory, string[]> = {
  melancholic: [
    "lost-in-thought",
    "tired-empty-stare",
    "lips-slightly-pressed-thoughtful",
    "emotional-watery-eyes",
    "processing-bad-news-blank",
    "deep-exhale-frustrated",
    "unfocused-stare-window",
    "low-key-sad-mouth-pulled-down",
    "quiet-disappointment-no-words",
    "holding-back-tears-eyes-glassy",
    "about-to-cry-still-holding",
    "nostalgic-eyes-distant",
    "quiet-grief-no-tears",
    "drained-after-long-call",
    "just-cried-puffy-red-eyes",
    "exhausted-end-of-day",
    "resigned-flat-face",
    "emotionally-numb-blank",
  ],
  energetic: [
    "mid-sentence-talking-to-camera",
    "selfie-mid-rant-animated",
    "explaining-something-mid-gesture",
    "selfie-front-cam-talking-real",
    "about-to-say-something",
    "mid-conversation-talking",
    "mid-sentence-flat-jaw",
    "mid-explanation-flat-face",
    "agreeing-with-mild-laugh",
    "listening-bestie-tells-drama",
    "rolling-eyes-at-friend-playful",
  ],
  confident: [
    "direct-stare-no-emotion",
    "half-smirk-closed-mouth",
    "chin-up-confident-stare",
    "casual-confidence-half-smirk",
    "looksmaxxing-serene",
    "serious-direct-stare",
    "amused-closed-mouth",
    "smirk-corner-mouth-only",
    "quiet-pride-eyes-shine",
    "proud-of-self-quiet",
    "determined-jaw-locked",
    "self-aware-half-smile",
    "raised-cheeks-no-mouth-smile",
    "pre-flirt-eye-contact",
  ],
  serene: [
    "small-smile-genuinely-content",
    "relaxed-eyes-soft",
    "casual-cool-no-expression",
    "post-shower-relaxed-blank",
    "looksmaxxing-serene",
    "soft-asymmetric-smile",
    "faint-smile-eyes-down",
    "fond-memory-soft-smile",
    "anticipating-something-good",
    "peace-after-conflict",
    "gentle-laugh-eyes-crinkled",
    "end-of-laugh-soft-comedown",
    "nodding-slightly-agreeing",
    "half-smile-while-listening",
  ],
  tired: [
    "tired-empty-stare",
    "sleepy-content",
    "tired-detached",
    "post-workout-neutral-tired",
    "mid-yawn-natural",
    "just-after-yawn-watery-eyes",
    "just-woke-up-puffy-eyes",
    "exhausted-end-of-day",
    "heavy-eyelids-falling-asleep",
    "drained-after-long-call",
    "hangover-mild-squinting",
    "just-pulled-all-nighter",
    "sleepy-fighting-it",
    "dehydrated-dry-lips",
    "sick-tissue-near-nose",
    "fever-flushed-cheeks",
    "headache-fingers-temple",
  ],
};

// === FRAMINGS (15) =======================================================

export const FRAMINGS: DictEntry[] = [
  {
    id: "front-cam-selfie-vertical",
    text: "This is a selfie taken with the front-facing camera of her phone. The camera's perspective IS the frame — what you see is what the front camera captured. Her face fills the lower two-thirds of the frame. Above her face, the upper third shows whatever is behind her head (ceiling, sky, wall, headboard) slightly out of focus. Her hand holding the phone is not in the frame. The phone is not in the frame. Slight wide-angle distortion typical of front camera held close to the face.",
    displayName: "Selfie front cam vertical",
    tags: { lighting: "flexible", energy: "flexible", social: "alone", space: "flexible", gender: "neutral" },
  },
  {
    id: "front-cam-selfie-from-above",
    text: "This is a selfie taken with the front-facing camera, phone held above her face pointing down. The camera's perspective IS the frame. Her face is centered, the surface behind her head (pillow, headrest, blanket) fills the rest. Her hand and the phone are not in the frame. Slight wide-angle distortion.",
    displayName: "Selfie front cam au-dessus",
    tags: { lighting: "flexible", energy: "low", social: "alone", space: "flexible", gender: "neutral" },
  },
  {
    id: "mirror-selfie-bathroom",
    text: "Mirror selfie. She's facing a mirror, holding the phone at chest level. The phone IS visible in the reflection — that's how mirror selfies work. Her body from waist or chest up is visible in the reflection, the room behind her partially visible.",
    displayName: "Selfie miroir salle de bain",
    tags: { lighting: "flexible", energy: "flexible", social: "alone", space: "indoor-private", gender: "neutral" },
  },
  {
    id: "mirror-selfie-fullbody",
    text: "Full body mirror selfie. She's standing in front of a full-length mirror, holding the phone at chest or waist height. The phone IS visible in the reflection. Outfit-of-the-day vibe.",
    displayName: "Selfie miroir plein corps",
    tags: { lighting: "flexible", energy: "low", social: "alone", space: "indoor-private", gender: "neutral" },
  },
  {
    id: "mirror-selfie-public",
    text: "Mirror selfie in a public space (gym, store fitting room, elevator). She's facing the mirror with the phone at chest height. The phone IS visible in the reflection.",
    displayName: "Selfie miroir public",
    tags: { lighting: "flexible", energy: "flexible", social: "alone", space: "indoor-public", gender: "neutral" },
  },
  {
    id: "photo-by-friend-arms-length",
    text: "Photo taken by a friend from arm's length away, slightly imperfect framing, she's reacting to the friend not posing for the camera. The friend's perspective is what we see.",
    displayName: "Photo par un·e ami·e proche",
    tags: { lighting: "flexible", energy: "flexible", social: "with-others", space: "flexible", gender: "neutral" },
  },
  {
    id: "photo-by-friend-from-distance",
    text: "Wide candid photo taken by a friend from a few steps away, real environment around her, slightly imperfect framing tilted a bit. She's not aware of the photo being taken or just barely.",
    displayName: "Photo par un·e ami·e à distance",
    tags: { lighting: "flexible", energy: "flexible", social: "flexible", space: "flexible", gender: "neutral" },
  },
  {
    id: "pov-looking-down-hands",
    text: "POV shot from her own perspective looking down at her own hands, lap, or what she's holding. No face visible. Phone or her gaze is what frames the shot.",
    displayName: "POV vers les mains",
    tags: { lighting: "flexible", energy: "low", social: "flexible", space: "flexible", gender: "neutral" },
  },
  {
    id: "pov-looking-down-feet",
    text: "POV shot from her own perspective looking down at her own feet or legs. No face visible. Sneakers, sand, blanket, or whatever is under her in frame.",
    displayName: "POV vers les pieds",
    tags: { lighting: "flexible", energy: "low", social: "flexible", space: "flexible", gender: "neutral" },
  },
  {
    id: "candid-wide-from-across-room",
    text: "Wide candid shot from across a room, she doesn't know she's being photographed, going about her business. Real environment with real depth around her.",
    displayName: "Candid large depuis l'autre bout de la pièce",
    tags: { lighting: "flexible", energy: "flexible", social: "flexible", space: "flexible", gender: "neutral" },
  },
  {
    id: "photo-side-by-side-walking",
    text: "Photo taken by someone walking next to her, captured mid-step, slight motion blur. The companion's perspective is what frames the shot.",
    displayName: "Photo côte à côte en marche",
    tags: { lighting: "flexible", energy: "medium", social: "with-others", space: "flexible", gender: "neutral" },
  },
  {
    id: "couple-selfie",
    text: "Couple selfie, both faces close in the frame, phone held by one of them. Cozy or affectionate, both visible.",
    displayName: "Selfie de couple",
    tags: { lighting: "flexible", energy: "flexible", social: "intimate-pair", space: "flexible", gender: "neutral" },
  },
  {
    id: "caught-by-friend-in-motion",
    text: "Photo taken by a friend who's a few steps behind or beside her, captured the moment she's turning around, walking, or moving through the scene. The framing is reactive — the friend is trying to catch the moment, not compose it. Slight motion in the subject, slight tilt in the horizon, the subject is not centered but caught dynamically. Hair or clothing in motion. The friend's perspective is what we see — sometimes too close, sometimes a bit far, never perfectly framed.",
    displayName: "Captée par un·e ami·e en mouvement",
    tags: { lighting: "flexible", energy: "medium", social: "with-others", space: "flexible", gender: "neutral" },
  },
  {
    id: "flash-disposable-camera",
    text: "Photo taken with a small disposable camera or a phone flash in compact mode. Hard direct flash hitting the subject from the camera position, creating a sharp shadow behind on whatever surface is behind her, slightly overexposed skin where the flash hits, slightly underexposed and grainy in the corners. The composition is approximate, not centered, sometimes a bit too tight or too wide. The kind of casual party or gathering snapshot from the late 90s or early 2000s. Slight color cast from the flash, slightly washed-out reds.",
    displayName: "Flash compact / jetable",
    tags: { lighting: "flexible", energy: "medium", social: "with-others", space: "flexible", gender: "neutral" },
  },
  {
    id: "friend-pov-across-table",
    text: "Photo taken by a friend sitting across the table from her at a cafe, restaurant, or bar. The friend's hand or arm is sometimes visible at the edge of the frame, plates or glasses partially visible in the foreground, slightly out of focus. She's reacting to the friend or to the moment — lifting her glass to her lips, mid-laugh at something, looking off to the side, talking with her hands. The composition is organic, captured in the rhythm of conversation. Mid-shot showing her from chest up, environment visible behind her but secondary.",
    displayName: "POV ami·e en face à table",
    tags: { lighting: "flexible", energy: "medium", social: "with-others", space: "flexible", gender: "neutral" },
  },
];

// === TECHNICAL_REGISTERS (9) =============================================

export const TECHNICAL_REGISTERS: DictEntry[] = [
  {
    id: "iphone-natural-daylight-soft",
    text: "iPhone front or rear camera, soft natural daylight from a window, even warm exposure, sharp focus, the typical 'good photo' look.",
    displayName: "iPhone lumière naturelle douce",
    tags: { lighting: "daylight-natural", energy: "flexible", social: "flexible", space: "flexible", gender: "neutral" },
  },
  {
    id: "iphone-bright-sunlight-harsh",
    text: "iPhone in bright outdoor sunlight, hard direct sun creating sharp shadows under the chin and nose, slight overexposure on the brightest skin areas, deep shadows in the background, high contrast.",
    displayName: "iPhone soleil dur",
    tags: { lighting: "daylight-harsh", energy: "flexible", social: "flexible", space: "flexible", gender: "neutral" },
  },
  {
    id: "iphone-golden-hour-warm",
    text: "iPhone in golden hour, warm orange-pink late afternoon light, soft long shadows, the magic hour glow, slight chromatic warmth across the whole scene.",
    displayName: "iPhone golden hour",
    tags: { lighting: "golden-hour", energy: "flexible", social: "flexible", space: "flexible", gender: "neutral" },
  },
  {
    id: "iphone-low-light-warm-bulbs",
    text: "iPhone in low ambient light, no flash, warm tungsten or candle light only, visible digital noise in the shadows, slight motion blur from low shutter speed, warm orange color cast across the entire scene.",
    displayName: "iPhone faible lumière chaude",
    tags: { lighting: "dim-warm", energy: "flexible", social: "flexible", space: "flexible", gender: "neutral" },
  },
  {
    id: "iphone-low-light-cool-streetlight",
    text: "iPhone in low cool ambient light, no flash, cool streetlight or dashboard light, visible digital noise, slight motion blur, cool blue-green color cast.",
    displayName: "iPhone faible lumière froide",
    tags: { lighting: "dim-cool", energy: "flexible", social: "flexible", space: "flexible", gender: "neutral" },
  },
  {
    id: "iphone-fluorescent-medical",
    text: "iPhone in harsh fluorescent lighting from above: hard cool overhead light flattening the face, slight green-cyan color cast on the skin, no flattering shadows, the unflattering institutional environment look.",
    displayName: "iPhone néon institutionnel",
    tags: { lighting: "fluorescent", energy: "flexible", social: "flexible", space: "flexible", gender: "neutral" },
  },
  {
    id: "iphone-screen-glow-dark",
    text: "iPhone front camera in near-darkness, the phone screen itself acts as the only light source, blue-white cast on the face from above, deep shadows everywhere else, visible digital noise in the dark areas, low shutter speed.",
    displayName: "iPhone glow d'écran nuit",
    tags: { lighting: "screen-only", energy: "low", social: "alone", space: "flexible", gender: "neutral" },
  },
  {
    id: "iphone-hdr-backlight-window",
    text: "iPhone HDR struggling against backlight from a window: her face is artificially lifted out of the shadow making the skin look slightly flat, soft halo of light around her hair and shoulders, the window or bright background partially blown out, the typical iPhone HDR auto look.",
    displayName: "iPhone HDR contre-jour fenêtre",
    tags: { lighting: "daylight-natural", energy: "flexible", social: "flexible", space: "indoor-private", gender: "neutral" },
  },
  {
    id: "iphone-vintage-grainy-soft",
    text: "iPhone with vintage filter or older iPhone capture quality: visible grain throughout, slightly soft focus, mildly desaturated colors with a warm or cool cast depending on the scene, slight chromatic aberration on high-contrast edges, the kind of slightly imperfect output that suggests an iPhone 6/7/8 era or an applied film emulation. Less sharp than modern flagship phones, more textured and emotional.",
    displayName: "iPhone vintage grain",
    tags: { lighting: "flexible", energy: "flexible", social: "flexible", space: "flexible", gender: "neutral" },
  },
];

// === RENDERING_DIRECTIVES ===============================================
// Aspect ratio is templated to support both 4:5 (Insta) and 9:16 (TikTok).
// The rest is verbatim from the spec.

function renderingDirectives(aspectLabel: "4:5" | "9:16"): string {
  return `RENDERING:
- A single photograph, captured in one moment from one camera angle. Not a collage, not a photo grid, not multiple images combined.
- Skin shows real texture: pores around the nose and cheeks, slight unevenness, possible redness, possible blemishes, possible dry patches, possible oil sheen.
- Hair has individual strands visible with realistic flyaways and imperfect parting.
- Eyes have realistic moisture, visible vessels in the whites, and slight asymmetry between left and right.
- The light on the subject matches the light of the environment in direction, color temperature, and intensity.
- Shot on a 2024-2025 smartphone front or rear camera. Looks like a photo someone actually took on their phone, not a model render.
- Aspect ratio: ${aspectLabel}.

CRITICAL RULES — must be followed in every generation:

- **No emotional apex.** Expressions are mid-state — mid-sentence, mid-thought, mid-action, mid-blink. Never at peak. No "publicity smile", no laughing-mouth-wide-open, no "model" gaze. Capture the kind of expression you'd accidentally catch in someone's casual story IG that wasn't meant to be a "good photo".

- **Smartphone depth of field.** All scenes have iPhone-level depth of field. The subject AND most of the background within 1-2 meters are reasonably in focus. No artificial portrait-mode bokeh blur. No DSLR-style background separation. Background details remain visible, identifiable, recognizable. The background may be slightly out of focus only if the subject is very close to the camera.

- **Imperfect framing.** The composition is approximate. The subject may be off-center, slightly tilted, partially cropped at the edges of the frame. Not a magazine shoot. The kind of framing you'd get holding a phone at arm's length without thinking about composition.

- **The subject is never aware they're being photographed for a photo.** Even when looking at the camera (selfie front-cam mode), they're talking on video, vlogging, or just casually filming themselves — not "posing for a portrait". Eyes can move, mouth can be open mid-word, hand can be mid-gesture. The default state is "in motion" or "in the middle of doing something", not "stationary and presented to the lens".

- **No commercial photography aesthetics.** No editorial lighting. No professional poses. No stock-photo facial expressions. No magazine-cover composition. The image must look like it was made by someone who isn't a photographer, with a smartphone, in a real moment.`;
}

// === Composer ============================================================

export type AspectRatio = "4:5" | "9:16";

export function composePrompt(args: {
  identityDescription: string;
  signatureFeatures?: string;
  situation: DictEntry;
  emotionalState: DictEntry;
  framing: DictEntry;
  technicalRegister: DictEntry;
  aspectRatio: AspectRatio;
  // Optional persona mood prepended just after the identity block. When
  // present, biases Gemini toward the persona's overall vibe.
  moodDescriptor?: string;
}): string {
  const identityBlock = buildIdentityBlock(
    args.identityDescription,
    args.signatureFeatures,
  );
  const moodBlock = args.moodDescriptor?.trim()
    ? `\n\nPERSONA MOOD: ${args.moodDescriptor.trim()}`
    : "";
  return `${identityBlock}${moodBlock}

${args.situation.text}

${args.emotionalState.text}

${args.framing.text}

${args.technicalRegister.text}

${renderingDirectives(args.aspectRatio)}`;
}

// === Filtered draw =======================================================

export function isCompatible(a: Tags, b: Tags): boolean {
  const dims: (keyof Tags)[] = ["lighting", "energy", "social", "space"];
  return dims.every(
    (d) => a[d] === b[d] || a[d] === "flexible" || b[d] === "flexible",
  );
}

function tagPasses<T extends string>(
  tagValue: T,
  selected: readonly T[] | undefined,
): boolean {
  if (!selected || selected.length === 0) return true;
  return selected.includes(tagValue);
}

function filterSituations(
  pool: DictEntry[],
  filters: CombinationFilters | undefined,
): DictEntry[] {
  if (!filters) return pool;
  return pool.filter((s) => {
    return (
      tagPasses(s.tags.lighting as Lighting, filters.lighting) &&
      tagPasses(s.tags.energy as Energy, filters.energy) &&
      tagPasses(s.tags.social as Social, filters.social) &&
      tagPasses(s.tags.space as Space, filters.space)
    );
  });
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Cumulative weighted draw. Falls back to uniform random if weights all zero
// (defensive — should not happen given multipliers default to 1.0). Pass an
// array of items + same-length array of weights ≥ 0.
function weightedChoice<T>(arr: T[], weights: number[]): T {
  if (arr.length === 0) throw new Error("weightedChoice on empty array");
  let total = 0;
  for (const w of weights) total += w > 0 ? w : 0;
  if (total <= 0) return randomChoice(arr);
  let r = Math.random() * total;
  for (let i = 0; i < arr.length; i++) {
    const w = weights[i] > 0 ? weights[i] : 0;
    if (r < w) return arr[i];
    r -= w;
  }
  return arr[arr.length - 1];
}

export type Combination = {
  situation: DictEntry;
  emotionalState: DictEntry;
  framing: DictEntry;
  technicalRegister: DictEntry;
};

// Strict-match gender filter: an entry passes if its gender equals the
// persona's gender, OR if the entry is "neutral" (always allowed).
// Orthogonal to the 4 lighting/energy/social/space dimensions — does NOT
// use the `flexible` rule.
function genderPasses(entry: DictEntry, personaGender: Gender): boolean {
  return entry.tags.gender === personaGender || entry.tags.gender === "neutral";
}

// === Style-preference weight resolvers ===================================

// Compute the multiplier for a single emotion, given the persona's
// `emotionWeights`. An emotion in two categories has its multipliers
// multiplied (compound). Missing entries default to 1.0.
function emotionWeightFor(
  emotionId: string,
  prefs?: PersonaStylePreferences,
): number {
  const w = prefs?.emotionWeights;
  if (!w) return 1.0;
  let weight = 1.0;
  for (const [cat, multiplier] of Object.entries(w) as [
    EmotionMoodCategory,
    number,
  ][]) {
    if (EMOTION_MOOD_CATEGORIES[cat]?.includes(emotionId)) {
      weight *= multiplier;
    }
  }
  return weight;
}

function spaceWeightFor(
  entry: DictEntry,
  prefs?: PersonaStylePreferences,
): number {
  const w = prefs?.spaceWeights;
  if (!w) return 1.0;
  const space = entry.tags.space;
  if (space === "flexible") return 1.0;
  return w[space as SpaceWeightKey] ?? 1.0;
}

function registerWeightFor(
  registerId: string,
  prefs?: PersonaStylePreferences,
): number {
  const w = prefs?.registerWeights;
  if (!w) return 1.0;
  return w[registerId as RegisterWeightKey] ?? 1.0;
}

export function pickCompatibleCombination(args: {
  filters?: CombinationFilters;
  personaGender: Gender;
  stylePreferences?: PersonaStylePreferences;
}): Combination | null {
  const { filters, personaGender, stylePreferences } = args;

  // Pre-filter on gender BEFORE applying the user's tag filters.
  // Deprecated emotions are excluded from the draw pool but kept in the
  // EMOTIONAL_STATES array for legacy lookup of historical images.
  const genderSituations = SITUATIONS.filter((s) =>
    genderPasses(s, personaGender),
  );
  const genderEmotions = EMOTIONAL_STATES.filter(
    (e) => genderPasses(e, personaGender) && !DEPRECATED_EMOTION_IDS.has(e.id),
  );
  const genderFramings = FRAMINGS.filter((f) =>
    genderPasses(f, personaGender),
  );
  const genderRegisters = TECHNICAL_REGISTERS.filter((r) =>
    genderPasses(r, personaGender),
  );

  const situationPool = filterSituations(genderSituations, filters);
  if (situationPool.length === 0) return null;

  const MAX_TRIES = 10;
  for (let attempt = 0; attempt < MAX_TRIES; attempt++) {
    // Weighted draw on situation by space preference.
    const situationWeights = situationPool.map((s) =>
      spaceWeightFor(s, stylePreferences),
    );
    const situation = weightedChoice(situationPool, situationWeights);
    const compatibleEmotions = genderEmotions.filter((e) =>
      isCompatible(situation.tags, e.tags),
    );
    const compatibleFramings = genderFramings.filter((f) =>
      isCompatible(situation.tags, f.tags),
    );
    const compatibleRegisters = genderRegisters.filter((r) =>
      isCompatible(situation.tags, r.tags),
    );
    if (
      compatibleEmotions.length === 0 ||
      compatibleFramings.length === 0 ||
      compatibleRegisters.length === 0
    ) {
      continue;
    }
    const emotionWeights = compatibleEmotions.map((e) =>
      emotionWeightFor(e.id, stylePreferences),
    );
    const registerWeights = compatibleRegisters.map((r) =>
      registerWeightFor(r.id, stylePreferences),
    );
    return {
      situation,
      emotionalState: weightedChoice(compatibleEmotions, emotionWeights),
      framing: randomChoice(compatibleFramings),
      technicalRegister: weightedChoice(compatibleRegisters, registerWeights),
    };
  }
  console.warn(
    "[pickCompatibleCombination] gave up after 10 retries — pool may be too restricted",
  );
  return null;
}

// Map our target output ratio to what the Gemini API accepts. Gemini
// supports 1:1, 3:4, 4:3, 9:16, 16:9. For Instagram 4:5, we generate at 3:4
// (closest taller-than-wide) and crop in Sharp post-process.
export function geminiAspectRatio(target: AspectRatio): "3:4" | "9:16" {
  return target === "4:5" ? "3:4" : "9:16";
}

// === Lookup helpers ======================================================

export function getSituation(id: string): DictEntry | undefined {
  return SITUATIONS.find((s) => s.id === id);
}
export function getEmotionalState(id: string): DictEntry | undefined {
  return EMOTIONAL_STATES.find((s) => s.id === id);
}
export function getFraming(id: string): DictEntry | undefined {
  return FRAMINGS.find((s) => s.id === id);
}
export function getTechnicalRegister(id: string): DictEntry | undefined {
  return TECHNICAL_REGISTERS.find((s) => s.id === id);
}

// IDs of SITUATIONS that match a given tag value on a given dimension —
// used by the bank-level tag filters.
export function situationIdsByTag(
  dimension: keyof Tags,
  values: string[],
): string[] {
  if (values.length === 0) return [];
  return SITUATIONS.filter((s) => values.includes(s.tags[dimension])).map(
    (s) => s.id,
  );
}

// === Frontend metadata ===================================================
// Single source of truth for the UI: tag values actually present in the
// SITUATIONS dict + lightweight situation tag map (no `text` shipped).
// All UI multi-selects + the panel's "0 match" estimator read this query.

function uniqueTagValues(dim: keyof Tags): string[] {
  const set = new Set<string>();
  for (const s of SITUATIONS) {
    const v = s.tags[dim];
    if (v !== "flexible") set.add(v);
  }
  return [...set].sort();
}

export const DIMENSION_DISPLAY_NAMES = {
  lighting: "Éclairage",
  energy: "Énergie",
  social: "Contexte social",
  space: "Espace",
} as const;

export const TAG_DISPLAY_NAMES = {
  lighting: {
    "daylight-natural": "Lumière du jour douce",
    "daylight-harsh": "Soleil dur",
    "golden-hour": "Golden hour",
    "dim-warm": "Faible lumière chaude",
    "dim-cool": "Faible lumière froide",
    fluorescent: "Néon",
    "screen-only": "Écran seul",
    flexible: "Flexible",
  },
  energy: {
    high: "Forte",
    medium: "Moyenne",
    low: "Faible",
    flexible: "Flexible",
  },
  social: {
    alone: "Seule",
    "with-others": "Avec d'autres",
    "intimate-pair": "Couple intime",
    flexible: "Flexible",
  },
  space: {
    "indoor-private": "Intérieur privé",
    "indoor-public": "Intérieur public",
    "outdoor-urban": "Extérieur urbain",
    "outdoor-nature": "Extérieur nature",
    transit: "Transit",
    medical: "Médical",
    flexible: "Flexible",
  },
} as const;

export const getDictsMetadata = query({
  args: {},
  handler: async () => {
    return {
      tagValues: {
        lighting: uniqueTagValues("lighting"),
        energy: uniqueTagValues("energy"),
        social: uniqueTagValues("social"),
        space: uniqueTagValues("space"),
      },
      dimensionNames: DIMENSION_DISPLAY_NAMES,
      tagDisplayNames: TAG_DISPLAY_NAMES,
      situations: SITUATIONS.map((s) => ({
        id: s.id,
        displayName: s.displayName,
        tags: s.tags,
      })),
      emotionalStates: EMOTIONAL_STATES.filter(
        (s) => !DEPRECATED_EMOTION_IDS.has(s.id),
      ).map((s) => ({
        id: s.id,
        displayName: s.displayName,
      })),
      framings: FRAMINGS.map((s) => ({
        id: s.id,
        displayName: s.displayName,
      })),
      technicalRegisters: TECHNICAL_REGISTERS.map((s) => ({
        id: s.id,
        displayName: s.displayName,
      })),
    };
  },
});
