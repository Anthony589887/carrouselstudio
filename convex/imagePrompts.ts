// Pure helpers — no Convex imports — safe to import from anywhere.

export const IMAGE_TYPES = [
  "selfie-frontcam",
  "selfie-miroir",
  "photo-ami",
  "photo-couple",
  "photo-cafe",
  "photo-sport",
  "photo-rue",
  "photo-monument",
  "photo-vacances",
  "photo-nuit",
  "photo-fatiguee",
  "photo-grateful",
  "photo-blessee",
  "photo-coeur-brise",
  "photo-decue",
  "snapshot-mains",
  "snapshot-pieds",
  "snapshot-plat",
  "snapshot-livre",
  "photo-lifestyle",
] as const;

export type ImageType = (typeof IMAGE_TYPES)[number];

const TYPE_VARIATIONS: Record<string, string[]> = {
  "selfie-frontcam": [
    "Selfie taken with the front camera, phone held slightly above eye level. Bedroom morning light, hair still messy from sleep, bare shoulders or oversized t-shirt. Natural unposed expression. Slight lens distortion from proximity.",
    "Selfie front camera in the passenger seat of a car. Seatbelt visible, daylight through the window, sunglasses pushed up on the head. Casual smile or mid-talk expression.",
    "Front-cam selfie on the couch in the evening. Warm lamp light, hoodie or cozy sweater, TV glow on one side of the face. Slight beauty-mode glow.",
    "Front camera selfie just out of the shower. Damp hair, towel visible, bathroom light slightly harsh. No makeup, fresh skin.",
    "Walking outside selfie, front camera. Buildings and street blurred behind, slight motion blur, daylight. Looking off to the side or laughing.",
  ],
  "selfie-miroir": [
    "Mirror selfie in a bathroom. Phone at chest height, flash on. Half body visible. Phone clearly visible in the reflection — that is normal for a mirror selfie.",
    "Mirror selfie in a bedroom, full body visible. Bed and clothes in background, soft daylight from a window. No flash.",
    "Mirror selfie in a gym. Workout outfit, phone in hand, machines and weights behind. Slight sweat on the skin.",
    "Mirror selfie in an elevator. Tight framing, phone with flash on, mirrored back wall. Outfit of the day vibe.",
    "Mirror selfie in a clothing store fitting room. New outfit being tried on, curtain or wall visible behind. Phone clearly visible in reflection.",
  ],
  "photo-ami": [
    "Photo taken by a friend at a park. Caught mid-laugh, sitting on the grass or a bench. Slightly imperfect framing, real depth in the background.",
    "Photo taken by a friend at a restaurant terrace. Glass of wine or coffee on the table, looking at the camera with a relaxed smile.",
    "Photo by a friend at a bar at night. Warm orange and red light, blurred crowd behind. Not posing for a brand shoot, just present.",
    "Photo by a friend on a hiking trail. Backpack on, slightly out of breath, mountains or forest behind. Bright outdoor light.",
    "Candid photo by a friend on a city street. Walking and turning toward the camera, urban background, daylight.",
  ],
  "photo-couple": [
    "Couple photo. With her partner, his arm around her shoulders, both looking at the camera with relaxed smiles. Outdoor daylight setting.",
    "Couple photo, partner kissing her on the cheek while she laughs. Caught candidly, unposed.",
    "Couple selfie style, both faces close, phone held by one of them. Cozy indoor setting, warm light.",
    "Couple walking hand in hand, photographed from behind by a third person. City or park setting.",
    "Couple at a restaurant table, leaning toward each other across the table, eyes locked, phone candid shot.",
  ],
  "photo-cafe": [
    "Sitting alone at a cafe table. Latte with foam art, croissant or pastry in frame. Window light from the side. Phone or book on the table.",
    "Cafe interior shot, holding a takeaway cup near her face, slight smile. Background slightly blurred.",
    "Outdoor cafe terrace, sunny day, sunglasses on the table, half-finished iced drink. Casual outfit.",
    "Cafe corner seat, laptop open in front of her, mug in hand, focused or thinking expression. Soft afternoon light.",
  ],
  "photo-sport": [
    "Mid-workout at a gym. Slightly out of breath, sweat on the forehead, sportswear. Equipment in background.",
    "Going for a run outdoors, phone capturing her mid-stride or cooling down. Path or park setting, bright daylight.",
    "Yoga mat at home, mid-pose or stretching. Living room background, natural light.",
    "Post-workout in the gym locker room or by the entrance. Water bottle in hand, towel around neck.",
  ],
  "photo-rue": [
    "Walking down a city street alone, candid shot. Urban architecture behind, daylight, real pedestrians slightly visible.",
    "Crossing the street, caught mid-step, slight motion. Cars and street life in background.",
    "Standing on a sidewalk waiting for someone or looking at her phone. City environment, real depth.",
    "Walking past shop windows, slight reflection visible in the glass. Daytime urban setting.",
  ],
  "photo-monument": [
    "In front of a recognizable city landmark or famous monument. Tourist-style framing but candid, not posing rigidly.",
    "Side profile shot near a monument, looking up or pointing at it. Bright daylight.",
    "Sitting on steps near a famous building, reading or just resting. Tourists slightly visible.",
    "Walking past a monument, photographed from behind or three-quarter, the monument framed beside her.",
  ],
  "photo-vacances": [
    "On a beach, swimsuit or sundress, sunlight on the skin, ocean behind. Sand visible, slightly windswept hair.",
    "By a hotel pool, lounger visible, drink on the side table. Tropical or summer atmosphere.",
    "On a balcony with a sea or city view, morning coffee in hand, robe or summer outfit.",
    "Exploring a foreign market or narrow street. Colorful stalls or local architecture, casual travel outfit.",
  ],
  "photo-nuit": [
    "Out at night in the city. Neon signs reflecting on her skin, dark background with colored bokeh. Going-out outfit.",
    "Inside a dim bar, candle or warm pendant light on her face, drink in hand. Slight grain.",
    "Walking on a city street at night, streetlight glow above her, slight motion blur in background.",
    "On a rooftop at night, city lights behind her. Soft warm light from a string of bulbs or a heater.",
  ],
  "photo-fatiguee": [
    "Looks tired. Under-eye circles visible, messy hair, oversized hoodie. Lying on the couch, soft low light. End-of-a-long-day vibe, not editorial exhaustion.",
    "Sitting on the floor against the bed, knees up, phone in hand or staring off. No makeup, drained expression.",
    "In bed under the covers, only head and shoulders visible, soft morning or late-night lamp light. Heavy eyelids.",
    "At the kitchen counter holding a mug, leaning, hair tied up loosely, oversized t-shirt. Worn-out expression.",
  ],
  "photo-grateful": [
    "Candid moment of genuine happiness. Big natural smile, eyes slightly squinted from smiling. Outdoor golden hour light.",
    "Sitting in a cozy indoor setting, hands wrapped around a warm mug, soft smile, eyes calm. Feeling grateful, not performing it.",
    "Looking up at the sky or out a window, peaceful expression, soft natural light on the face.",
    "Hugging a friend or pet, eyes closed, real emotion. Caught candidly.",
  ],
  "photo-blessee": [
    "Looks emotionally hurt. Red eyes from crying, cheeks slightly damp, hair untidy. Sitting alone in a dim room. Soft window light from the side.",
    "On the bathroom floor against the bathtub, knees up, phone face-down beside her. Tear streaks visible.",
    "In bed curled up, only part of the face visible, eyes red and unfocused. Low ambient light.",
  ],
  "photo-coeur-brise": [
    "Sitting on the edge of the bed, head down, hands clasped. Soft late-afternoon light. Quiet sadness, not dramatic.",
    "Looking out a rain-streaked window. Reflection slightly visible. Melancholic expression.",
    "Wrapped in a blanket on the couch, mug forgotten on the coffee table, staring at nothing. Lamp light only.",
  ],
  "photo-decue": [
    "Reading something on her phone with a disappointed expression. Slight frown, lips pressed. Indoor neutral light.",
    "Standing alone in a kitchen, arms crossed, looking down. Disappointed body language.",
    "Sitting at a cafe table alone, half-empty cup, looking out the window with a deflated expression.",
  ],
  "snapshot-mains": [
    "Close-up of her hands holding a coffee cup on a wooden table. Soft natural light, manicured but not over-styled nails.",
    "Close-up of hands typing on a laptop or holding a phone. Realistic skin texture, slight veins visible.",
    "Hands holding an open book or journal in lap. Daylight from a window.",
    "Hands holding a small object — keys, a flower, jewelry. Macro feel, shallow depth of field.",
  ],
  "snapshot-pieds": [
    "Close-up of her feet in sneakers on a city sidewalk, photographed looking down. Real urban texture.",
    "Bare feet on a beach, sand and water visible. Natural daylight.",
    "Feet up on a coffee table or bed, cozy socks, blanket partially visible. Indoor evening light.",
    "Feet in sandals on a cafe terrace floor, drink and bag visible at the edge of the frame.",
  ],
  "snapshot-plat": [
    "Flat lay of a meal at a restaurant — plates, drinks, hands slightly visible at the edge. Top-down phone shot, natural light.",
    "Flat lay of breakfast at home — coffee, toast, fruit on a wooden table. Morning light.",
    "Flat lay of a desk setup — laptop, notebook, pen, mug. Daylight from above.",
  ],
  "snapshot-livre": [
    "Close-up of a book held open in her hands, blurred bedroom or living room behind. Soft daylight.",
    "Book on a table next to a coffee cup, page visible, slight blur, cozy reading nook.",
    "Hand holding a book against a window light, the title or page softly readable.",
  ],
  "photo-lifestyle": [
    "Cooking in a home kitchen, candid shot of stirring or chopping. Warm light, casual outfit.",
    "Tidying her bedroom, making the bed or folding clothes. Daylight, no makeup.",
    "Watering plants on a windowsill, soft morning light.",
    "Lying on the couch with a pet, scrolling phone. Cozy indoor setting.",
    "Doing skincare in the bathroom mirror — sheet mask or moisturizer. Bright vanity light.",
  ],
};

const FALLBACK_VARIATIONS = [
  "Candid lifestyle photo, real environment, natural light, unposed.",
];

const RENDERING_DIRECTIVES = `CRITICAL RENDERING DIRECTIVES:
- Phone photo quality, NOT studio quality
- Realistic skin texture: visible pores, natural slight unevenness, no airbrushed look
- Natural imperfections: slight under-eye shadows, minor skin irregularities, visible hair texture
- iPhone front-camera characteristics: slight lens distortion on close selfies, beauty mode soft glow
- Casual framing, not composed professionally
- Real environment, not a set
- No phone visible in the frame (except for mirror selfies where the phone in the reflection is OK)
- Aspect ratio 4:5`;

export function pickVariation(type: string, seed?: number): string {
  const variations = TYPE_VARIATIONS[type] ?? FALLBACK_VARIATIONS;
  const idx =
    seed !== undefined
      ? Math.abs(Math.floor(seed)) % variations.length
      : Math.floor(Math.random() * variations.length);
  return variations[idx];
}

export function composePrompt(
  identityDescription: string,
  type: string,
  variationSeed?: number,
): string {
  const sceneDirection = pickVariation(type, variationSeed);
  return `${identityDescription}

${sceneDirection}

${RENDERING_DIRECTIVES}`;
}

export function listAllPromptsForType(type: string): string[] {
  return TYPE_VARIATIONS[type] ?? FALLBACK_VARIATIONS;
}
