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

export type Tags = {
  lighting: Lighting;
  energy: Energy;
  social: Social;
  space: Space;
};

export type DictEntry = {
  id: string;
  text: string;
  displayName: string; // human-readable French label, UI only
  tags: Tags;
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

// === SITUATIONS (73) =====================================================

export const SITUATIONS: DictEntry[] = [
  // === INDOOR PRIVATE — bedroom / morning / rest ===
  {
    id: "bed-morning-just-woke-up",
    text: "She's lying in bed in the morning, hair messy across the pillow, bare shoulders or oversized t-shirt visible. White rumpled bedding around her face. The room is filled with soft morning daylight from a nearby window.",
    displayName: "Réveil au lit",
    tags: { lighting: "daylight-natural", energy: "low", social: "alone", space: "indoor-private" },
  },
  {
    id: "bed-night-scrolling",
    text: "She's lying in bed in a dark room at night, holding her phone above her face out of frame, only the light from the phone screen illuminating her face from above. The phone itself is not visible — only its blue-white light cast on her skin. Bedding visible around her in deep shadow. T-shirt, hair loose on the pillow.",
    displayName: "Lit nuit / téléphone",
    tags: { lighting: "screen-only", energy: "low", social: "alone", space: "indoor-private" },
  },
  {
    id: "bed-afternoon-nap",
    text: "She's curled up on top of her made bed in the afternoon, wearing leggings and an oversized t-shirt, blanket half-covering her. Soft daylight through partially closed blinds, the room warm and lazy.",
    displayName: "Sieste après-midi",
    tags: { lighting: "daylight-natural", energy: "low", social: "alone", space: "indoor-private" },
  },
  {
    id: "bedroom-getting-dressed",
    text: "She's in her bedroom in the morning, fully dressed in casual clothes, holding up a top or sweater to decide if she wants to wear it instead. Closet open behind her with clothes on hangers, bed unmade with rumpled sheets, daylight from a window. The vibe is 'choosing what to wear today', everyday domestic moment.",
    displayName: "Choix d'outfit chambre",
    tags: { lighting: "daylight-natural", energy: "medium", social: "alone", space: "indoor-private" },
  },
  {
    id: "bathroom-mirror-skincare",
    text: "She's in front of the bathroom mirror doing her skincare routine. Bottles and tubes on the counter, hair pulled back, face slightly shiny from product. Bathroom light from above.",
    displayName: "Skincare miroir",
    tags: { lighting: "daylight-natural", energy: "low", social: "alone", space: "indoor-private" },
  },
  {
    id: "bathroom-after-shower",
    text: "She's in the bathroom just out of the shower, hair wet and dripping, towel wrapped around her body. Foggy mirror partially clearing, condensation on the bathroom tiles.",
    displayName: "Sortie de douche",
    tags: { lighting: "daylight-natural", energy: "low", social: "alone", space: "indoor-private" },
  },
  {
    id: "bathroom-floor-crying",
    text: "She's sitting on the bathroom floor against the bathtub, knees up, phone face-down beside her. Tear streaks visible on her cheeks. The bathroom light is dim, only one lamp or the overhead light on.",
    displayName: "Sol salle de bain en pleurs",
    tags: { lighting: "dim-warm", energy: "low", social: "alone", space: "indoor-private" },
  },

  // === INDOOR PRIVATE — kitchen / living room / domestic ===
  {
    id: "kitchen-morning-coffee",
    text: "She's standing at her kitchen counter in the morning, mug of coffee in hand, wearing pajamas or an oversized t-shirt. Coffee maker, half-eaten toast, scattered objects on the counter. Soft morning light from the window.",
    displayName: "Café cuisine matin",
    tags: { lighting: "daylight-natural", energy: "low", social: "alone", space: "indoor-private" },
  },
  {
    id: "kitchen-doing-dishes",
    text: "She's standing at her kitchen sink doing the dishes, in a worn oversized t-shirt and sweatpants. Dirty dishes still visible, dish towel in hand, kitchen counter messy with daily clutter. Window above the sink.",
    displayName: "Vaisselle cuisine",
    tags: { lighting: "daylight-natural", energy: "medium", social: "alone", space: "indoor-private" },
  },
  {
    id: "kitchen-cooking-dinner",
    text: "She's cooking in her home kitchen, mid-action stirring or chopping. Pans on the stove, ingredients on the counter, slight steam, casual evening outfit. Warm kitchen lights on overhead.",
    displayName: "Cuisine en train de cuisiner",
    tags: { lighting: "dim-warm", energy: "medium", social: "alone", space: "indoor-private" },
  },
  {
    id: "couch-evening-blanket",
    text: "She's curled up on the couch in the evening under a blanket, mug forgotten on the coffee table beside her. The TV is glowing off-screen, casting soft moving light on her face. Hoodie or oversized cardigan.",
    displayName: "Canapé soir plaid",
    tags: { lighting: "dim-warm", energy: "low", social: "alone", space: "indoor-private" },
  },
  {
    id: "couch-afternoon-laptop",
    text: "She's sitting on the couch in the afternoon with her laptop on her thighs, working or watching something. Cup of tea or coffee beside her, headphones on, casual at-home outfit. Daylight from a window.",
    displayName: "Canapé après-midi laptop",
    tags: { lighting: "daylight-natural", energy: "medium", social: "alone", space: "indoor-private" },
  },
  {
    id: "couch-with-pet",
    text: "She's lying on the couch scrolling her phone, with a cat or small dog curled up against her side. Cozy indoor evening setting, soft warm lamp light, blanket partially over her.",
    displayName: "Canapé avec animal",
    tags: { lighting: "dim-warm", energy: "low", social: "alone", space: "indoor-private" },
  },
  {
    id: "windowsill-watering-plants",
    text: "She's at the windowsill watering her plants in the morning, bare feet, casual at-home clothes, watering can in hand. Soft morning light hitting the plants and her face.",
    displayName: "Arrosage plantes fenêtre",
    tags: { lighting: "daylight-natural", energy: "low", social: "alone", space: "indoor-private" },
  },
  {
    id: "tidying-bedroom",
    text: "She's tidying her bedroom — making the bed or folding clothes. Casual at-home clothes, hair pulled up loosely, focused on the task. Both her hands are busy with what she's tidying. Daylight from the window.",
    displayName: "Rangement chambre",
    tags: { lighting: "daylight-natural", energy: "medium", social: "alone", space: "indoor-private" },
  },
  {
    id: "edge-of-bed-after-shower",
    text: "She's sitting on the edge of her bed wrapped in a towel, hair still wet, scrolling on her phone or zoning out. The bedroom is lit by soft late-afternoon light through the blinds.",
    displayName: "Bord du lit post-douche",
    tags: { lighting: "daylight-natural", energy: "low", social: "alone", space: "indoor-private" },
  },
  {
    id: "floor-against-bed-thinking",
    text: "She's sitting on the bedroom floor with her back against the bed, knees up, phone in hand or staring off. No makeup, hair untidy, oversized t-shirt or hoodie.",
    displayName: "Sol contre lit pensive",
    tags: { lighting: "dim-warm", energy: "low", social: "alone", space: "indoor-private" },
  },
  {
    id: "edge-of-bed-sad",
    text: "She's sitting on the edge of the bed in the late afternoon, head down, hands clasped in her lap. Soft window light from the side. Quiet sadness, not dramatic.",
    displayName: "Bord du lit triste",
    tags: { lighting: "daylight-natural", energy: "low", social: "alone", space: "indoor-private" },
  },

  // === INDOOR PRIVATE — getting ready / before going out ===
  {
    id: "vanity-doing-makeup",
    text: "She's at her vanity or bathroom mirror doing her makeup before going out. Bottles, brushes, palette spread out. Mirror light or window light on her face. Half-done look.",
    displayName: "Maquillage vanity",
    tags: { lighting: "daylight-natural", energy: "medium", social: "alone", space: "indoor-private" },
  },
  {
    id: "trying-on-outfits",
    text: "She's in her bedroom trying on outfits, multiple options thrown on the bed behind her, half-dressed in something she's evaluating. Mirror partially visible. Daylight from the window.",
    displayName: "Essayage tenues",
    tags: { lighting: "daylight-natural", energy: "medium", social: "alone", space: "indoor-private" },
  },

  // === INDOOR PUBLIC — café / bar / restaurant ===
  {
    id: "cafe-table-alone-laptop",
    text: "She's sitting alone at a cafe corner table, laptop open in front of her, mug in hand, focused or thinking expression. Soft afternoon light through the cafe window.",
    displayName: "Café seule laptop",
    tags: { lighting: "daylight-natural", energy: "medium", social: "alone", space: "indoor-public" },
  },
  {
    id: "cafe-table-alone-book",
    text: "She's sitting alone at a small cafe table, book open or coffee in hand. Window light from the side. Pastry or croissant on a plate beside her.",
    displayName: "Café seule lecture",
    tags: { lighting: "daylight-natural", energy: "low", social: "alone", space: "indoor-public" },
  },
  {
    id: "cafe-with-friend",
    text: "She's at a cafe table with a friend, mid-conversation, coffee cups between them. Friend's hand or arm partially visible at the edge of the frame. Daylight from the cafe window.",
    displayName: "Café avec un·e ami·e",
    tags: { lighting: "daylight-natural", energy: "medium", social: "with-others", space: "indoor-public" },
  },
  {
    id: "cafe-takeaway-leaving",
    text: "She's about to leave the cafe, takeaway cup in one hand, bag on her shoulder, looking at her phone for the next thing. Cafe interior slightly visible behind her.",
    displayName: "Café à emporter sortie",
    tags: { lighting: "daylight-natural", energy: "medium", social: "alone", space: "indoor-public" },
  },
  {
    id: "wine-bar-mid-conversation",
    text: "She's at a small wine bar in the evening, sitting at a wooden table. A half-full glass of red wine in front of her, a candle in a small glass holder casting warm light on her face from below. Other tables and people slightly visible and out of focus in the background. Wearing a casual going-out top.",
    displayName: "Bar à vin conversation",
    tags: { lighting: "dim-warm", energy: "medium", social: "with-others", space: "indoor-public" },
  },
  {
    id: "restaurant-dinner-friends",
    text: "She's at a restaurant table with friends, mid-meal. Plates and glasses on the table, friends partially visible across from her, warm restaurant lighting, candle or pendant lamp.",
    displayName: "Dîner restaurant entre ami·es",
    tags: { lighting: "dim-warm", energy: "medium", social: "with-others", space: "indoor-public" },
  },
  {
    id: "bar-night-laughing",
    text: "She's at a dim bar at night, drink in hand, mid-laugh at something a friend just said. Warm pendant light or candle on her face, blurred crowd and bar shelves behind her.",
    displayName: "Bar nuit éclats de rire",
    tags: { lighting: "dim-warm", energy: "high", social: "with-others", space: "indoor-public" },
  },

  // === INDOOR PUBLIC — gym / fitting room / store ===
  {
    id: "gym-mirror-after-workout",
    text: "She's just finished a workout and is taking a quick mirror selfie in the gym locker area or by a wall mirror. Sports bra and leggings, slightly sweaty, hair pulled up in a messy bun. Equipment or lockers visible behind.",
    displayName: "Miroir gym post-séance",
    tags: { lighting: "fluorescent", energy: "medium", social: "alone", space: "indoor-public" },
  },
  {
    id: "gym-mid-workout",
    text: "She's mid-workout at the gym, slightly out of breath, sweat on her forehead. Sportswear, equipment in the background. Bright gym lighting.",
    displayName: "Gym en pleine séance",
    tags: { lighting: "fluorescent", energy: "high", social: "alone", space: "indoor-public" },
  },
  {
    id: "fitting-room-trying-dress",
    text: "She's in a clothing store fitting room trying on a new outfit. Both her hands are busy with the clothing — adjusting the fabric of the top she's wearing, holding up another garment to compare, or pulling at a sleeve to check the fit. Curtain or wall behind her, slight shadow from the fitting room overhead light. Looking at herself with a doubtful or pleased expression.",
    displayName: "Cabine d'essayage robe",
    tags: { lighting: "fluorescent", energy: "low", social: "alone", space: "indoor-public" },
  },
  {
    id: "elevator-tight-frame",
    text: "She's in an apartment building elevator, tight frame, mirrored back wall. Outfit-of-the-day vibe, bag in hand, phone in the other.",
    displayName: "Ascenseur cadré serré",
    tags: { lighting: "fluorescent", energy: "low", social: "alone", space: "indoor-public" },
  },
  {
    id: "convenience-store-aisle",
    text: "She's in a convenience store at night, standing in an aisle deciding what to buy. Bright fluorescent overhead light, snacks and drinks on the shelves, basket in hand.",
    displayName: "Supérette rayon",
    tags: { lighting: "fluorescent", energy: "medium", social: "alone", space: "indoor-public" },
  },

  // === OUTDOOR URBAN — street / sidewalk / city ===
  {
    id: "city-street-walking-day",
    text: "She's walking down a city street alone in the daytime, urban architecture behind her, real pedestrians slightly visible at the edges. Casual outfit, bag on her shoulder.",
    displayName: "Rue ville jour marche",
    tags: { lighting: "daylight-harsh", energy: "medium", social: "alone", space: "outdoor-urban" },
  },
  {
    id: "city-street-night-walking",
    text: "She's walking on a city street at night, streetlight glow above her, slight motion blur in the background, going-out outfit or casual depending on the vibe.",
    displayName: "Rue ville nuit marche",
    tags: { lighting: "dim-cool", energy: "medium", social: "alone", space: "outdoor-urban" },
  },
  {
    id: "apartment-steps-waiting-uber",
    text: "She's sitting on the front steps of a typical apartment building or row house in the late afternoon, waiting for her Uber. Wearing a faded gray hoodie unzipped over a black tank top, baggy jeans, beat-up white sneakers. A small handbag beside her on the step. Phone in one hand checking the app.",
    displayName: "Marches immeuble attente Uber",
    tags: { lighting: "golden-hour", energy: "low", social: "alone", space: "outdoor-urban" },
  },
  {
    id: "city-plaza-bench-sunny",
    text: "She's sitting on a concrete bench in a city plaza on a sunny afternoon. A small leather bag beside her. A glass of iced drink in her hand, condensation visible. Trees and concrete buildings behind her. Black sunglasses pushed up on her head.",
    displayName: "Banc place ensoleillée",
    tags: { lighting: "daylight-harsh", energy: "medium", social: "alone", space: "outdoor-urban" },
  },
  {
    id: "leaving-corner-store-night",
    text: "She's walking out of a corner store at night with a plastic bag in her hand, ice cream or snacks visible. Streetlight overhead, dim residential street, casual at-home outfit.",
    displayName: "Sortie épicerie nuit",
    tags: { lighting: "dim-cool", energy: "low", social: "alone", space: "outdoor-urban" },
  },
  {
    id: "crosswalk-mid-step",
    text: "She's crossing the street, caught mid-step, slight motion. Cars and street life in the background, casual urban outfit, daylight.",
    displayName: "Passage piéton en marche",
    tags: { lighting: "daylight-harsh", energy: "medium", social: "alone", space: "outdoor-urban" },
  },
  {
    id: "rooftop-night-string-lights",
    text: "She's on a rooftop at night with city lights behind her. Soft warm light from a string of bulbs or a heater. Drink in hand, going-out outfit, slight evening chill.",
    displayName: "Rooftop nuit guirlandes",
    tags: { lighting: "dim-warm", energy: "medium", social: "with-others", space: "outdoor-urban" },
  },
  {
    id: "park-bench-friend",
    text: "She's at a park sitting on the grass or a bench, caught mid-laugh. A friend's hand or shoulder visible at the edge of the frame. Real depth in the background — trees, distant people.",
    displayName: "Parc ami·e banc",
    tags: { lighting: "daylight-natural", energy: "high", social: "with-others", space: "outdoor-nature" },
  },
  {
    id: "restaurant-terrace-day",
    text: "She's at a restaurant terrace in the daytime, glass of wine or coffee on the table, looking at the camera with a relaxed smile. Sunlight through awnings or trees, other diners blurred in the background.",
    displayName: "Terrasse restaurant jour",
    tags: { lighting: "daylight-natural", energy: "medium", social: "with-others", space: "outdoor-urban" },
  },
  {
    id: "outdoor-cafe-terrace-iced",
    text: "She's at an outdoor cafe terrace on a sunny day. Sunglasses on the table, half-finished iced drink in front of her, casual outfit. Other terrace tables visible at the edges.",
    displayName: "Terrasse café boisson glacée",
    tags: { lighting: "daylight-harsh", energy: "low", social: "alone", space: "outdoor-urban" },
  },

  // === OUTDOOR NATURE / VACATION ===
  {
    id: "hiking-trail-resting",
    text: "She's on a hiking trail, backpack on, slightly out of breath, sitting on a rock or log resting. Mountains, forest, or rocky landscape behind her. Bright outdoor light.",
    displayName: "Pause sentier de randonnée",
    tags: { lighting: "daylight-harsh", energy: "medium", social: "alone", space: "outdoor-nature" },
  },
  {
    id: "beach-walking-casual",
    text: "She's walking along a beach in casual clothes, bare feet on the wet sand, hair slightly windswept. Ocean to one side, footprints behind her.",
    displayName: "Marche plage casual",
    tags: { lighting: "daylight-natural", energy: "low", social: "alone", space: "outdoor-nature" },
  },
  {
    id: "hotel-pool-lounger",
    text: "She's by a hotel pool on a lounger, swimsuit, sunglasses on. Drink on the side table, towel beside her. Tropical or summer atmosphere, bright sun.",
    displayName: "Transat piscine hôtel",
    tags: { lighting: "daylight-harsh", energy: "low", social: "alone", space: "outdoor-nature" },
  },
  {
    id: "balcony-morning-coffee-vacation",
    text: "She's on a hotel or apartment balcony with a sea or city view, morning coffee in hand, robe or summer outfit. Soft early light on her face.",
    displayName: "Balcon café vacances",
    tags: { lighting: "daylight-natural", energy: "low", social: "alone", space: "outdoor-urban" },
  },
  {
    id: "foreign-market-exploring",
    text: "She's exploring a foreign market or narrow street. Colorful stalls or local architecture, casual travel outfit, daylight. Tourists and locals slightly visible.",
    displayName: "Marché étranger exploration",
    tags: { lighting: "daylight-natural", energy: "medium", social: "alone", space: "outdoor-urban" },
  },

  // === TRANSIT ===
  {
    id: "uber-back-seat-night",
    text: "She's sitting in the back of an Uber at night, head resting against the window, city lights passing as colored bokeh outside. Going-out outfit or casual evening.",
    displayName: "Banquette arrière Uber nuit",
    tags: { lighting: "dim-cool", energy: "low", social: "alone", space: "transit" },
  },
  {
    id: "passenger-seat-car-day",
    text: "She's in the passenger seat of a car during the day. Seatbelt visible across her chest, daylight through the window, sunglasses pushed up on her head. Casual outfit.",
    displayName: "Passagère voiture jour",
    tags: { lighting: "daylight-natural", energy: "medium", social: "alone", space: "transit" },
  },
  {
    id: "driving-night-red-light",
    text: "She's driving home alone at night at a red light, hands on the wheel, hair slightly messy. The dashboard glow is the main light on her face. Empty street outside, occasional headlights of other cars.",
    displayName: "Conduite nuit feu rouge",
    tags: { lighting: "dim-cool", energy: "low", social: "alone", space: "transit" },
  },

  // === MEDICAL ===
  {
    id: "hospital-bed-iv-alone",
    text: "She's lying propped up in a hospital bed, white blanket pulled up to her waist. Wearing a faded blue patterned hospital gown. Hospital wristband on her wrist. An IV line taped to the back of her hand running off-frame to a stand. Hair greasy and unbrushed, no makeup, the slight pallor of someone who's been there for hours. Hospital monitor and equipment visible on the wall behind.",
    displayName: "Lit hôpital seule perfusion",
    tags: { lighting: "fluorescent", energy: "low", social: "alone", space: "medical" },
  },
  {
    id: "hospital-bed-visitor-chair-pov",
    text: "She's in a hospital bed seen from the visitor chair beside her. The bed rail is in the foreground, part of the IV stand visible at the edge of the frame, hospital monitor and equipment behind her. She's looking down or zoning out, not at the camera.",
    displayName: "Hôpital POV chaise visiteur",
    tags: { lighting: "fluorescent", energy: "low", social: "alone", space: "medical" },
  },

  // === WITH PARTNER (intimate-pair) ===
  {
    id: "couple-couch-cuddling",
    text: "She's on the couch with her partner in a single moment captured from one angle. Her head resting on his chest, his arm wrapped around her shoulders. A blanket partially over them. Both wearing casual at-home clothes. The living room is warm and low-lit by a single lamp.",
    displayName: "Couple câlin canapé",
    tags: { lighting: "dim-warm", energy: "low", social: "intimate-pair", space: "indoor-private" },
  },
  {
    id: "couple-restaurant-eyes-locked",
    text: "She's at a restaurant table across from her partner, leaning toward each other, eyes locked, mid-conversation. Glasses of wine between them, candle flickering, warm restaurant lighting.",
    displayName: "Couple restaurant regards",
    tags: { lighting: "dim-warm", energy: "medium", social: "intimate-pair", space: "indoor-public" },
  },
  {
    id: "couple-walking-hand-in-hand",
    text: "She's walking hand in hand with her partner down a city street, both seen from behind in a single wide shot. Their joined hands are visible at the center of the frame. Both wearing casual outfits, daylight, real city sidewalk with parked cars and buildings on one side.",
    displayName: "Couple marche main dans la main",
    tags: { lighting: "daylight-natural", energy: "medium", social: "intimate-pair", space: "outdoor-urban" },
  },
  {
    id: "couple-bed-morning",
    text: "She's in bed in the morning with her partner asleep behind her, his arm draped over her waist or his head resting against her shoulder. Both visible in the frame, their two faces or two bodies clearly part of the composition. Tangled white sheets, soft morning light from a window, intimate domestic moment, both still half-asleep.",
    displayName: "Couple lit matin",
    tags: { lighting: "daylight-natural", energy: "low", social: "intimate-pair", space: "indoor-private" },
  },

  // === MISC HIGH-INTERIORITY ===
  {
    id: "window-rain-melancholic",
    text: "She's standing or sitting by a single rain-streaked window, looking out. A faint reflection of her face is visible on the wet glass. The outdoor scene through the window is grey and wet, the indoor light is soft and dim. The frame is a single tight shot of her against the window.",
    displayName: "Fenêtre pluie mélancolie",
    tags: { lighting: "dim-cool", energy: "low", social: "alone", space: "indoor-private" },
  },
  {
    id: "kitchen-arms-crossed-disappointed",
    text: "She's standing alone in the kitchen with her arms crossed, looking down. Disappointed body language, casual at-home outfit. Soft indoor light, slightly cluttered kitchen counter behind her.",
    displayName: "Cuisine bras croisés déçue",
    tags: { lighting: "daylight-natural", energy: "low", social: "alone", space: "indoor-private" },
  },
  {
    id: "phone-frown-disappointed-couch",
    text: "She's on the couch reading something on her phone with a disappointed expression. Slight frown, lips pressed. Casual indoor neutral light, blanket or pillow visible.",
    displayName: "Canapé téléphone déçue",
    tags: { lighting: "daylight-natural", energy: "low", social: "alone", space: "indoor-private" },
  },

  // === CONCERT / LIVE MUSIC ===
  {
    id: "concert-crowd-singing",
    text: "She's in the middle of a concert crowd, stage lights in the background lighting up purple and red, hands raised, mid-singing along with the crowd. Other concertgoers around her partially visible, slightly out of focus. The atmosphere is dense, energetic, sweaty.",
    displayName: "Concert foule chant",
    tags: { lighting: "dim-warm", energy: "high", social: "with-others", space: "indoor-public" },
  },
  {
    id: "concert-front-row-phone-up",
    text: "She's at the front row of a concert, leaning against the barrier, the stage right behind/above her with stage lights spilling over — purple, red, or pink light hitting her face from above. The performer is partially out of focus behind. Her phone is held up casually, not filming, just in her hand. She's looking up toward the stage.",
    displayName: "Concert premier rang",
    tags: { lighting: "dim-warm", energy: "high", social: "with-others", space: "indoor-public" },
  },
  {
    id: "festival-day",
    text: "She's at a music festival during the day. Festival wristband on her wrist, casual summer outfit (tank top, shorts or denim, sunglasses pushed up). Stage or crowd partially visible behind her, festival flags or stage rigging in the background, sunny daylight. Loose, relaxed, festival energy.",
    displayName: "Festival jour",
    tags: { lighting: "daylight-harsh", energy: "medium", social: "with-others", space: "outdoor-nature" },
  },

  // === PARTY / NIGHT OUT ===
  {
    id: "party-kitchen-mid-laugh",
    text: "She's in someone's apartment kitchen during a house party, drink in hand (red solo cup, beer, or wine glass), mid-laugh at something a friend just said. Other people partially visible around her in the kitchen, slightly out of focus, drinks and snacks on the counter behind her. Warm overhead kitchen light, casual going-out outfit.",
    displayName: "Soirée cuisine éclat de rire",
    tags: { lighting: "dim-warm", energy: "high", social: "with-others", space: "indoor-private" },
  },
  {
    id: "party-dancing-crowd",
    text: "She's on a dance floor at a party or club, mid-movement, colored lights (red, blue, purple) sweeping across the scene. Other dancers around her partially blurred from motion. Her hair is moving, her face caught mid-action. The vibe is dense and immersive.",
    displayName: "Soirée danse foule",
    tags: { lighting: "dim-warm", energy: "high", social: "with-others", space: "indoor-public" },
  },
  {
    id: "night-out-bathroom-mirror-friends",
    text: "She's in the bathroom of a bar or club with a female friend, both standing in front of the mirror, fixing makeup or just hanging out. Harsh fluorescent overhead light, slightly dirty mirror, the typical worn club bathroom aesthetic. Going-out outfits, both relaxed and chatting.",
    displayName: "Toilettes club entre ami·es",
    tags: { lighting: "fluorescent", energy: "medium", social: "with-others", space: "indoor-public" },
  },
  {
    id: "backstage-bathroom-getting-ready",
    text: "She's in the bathroom of a bar or apartment getting ready before going out, doing a final makeup check or fixing her hair. Bathroom mirror in the foreground, bottles and makeup items on the counter, going-out outfit visible. Bathroom light is bright but slightly unflattering, the kind of pre-party energy where she's almost ready.",
    displayName: "Préparation salle de bain avant sortie",
    tags: { lighting: "fluorescent", energy: "medium", social: "alone", space: "indoor-private" },
  },

  // === ROAD TRIP / CAR ===
  {
    id: "roadtrip-passenger-window",
    text: "She's in the passenger seat of a car on a road trip, looking out the window. Landscape outside is moving fast — fields, mountains, or highway with slight motion blur. Sunlight hitting one side of her face, hair slightly tousled. Casual outfit, seatbelt visible. The vibe is contemplative, traveling.",
    displayName: "Road trip passagère fenêtre",
    tags: { lighting: "daylight-natural", energy: "low", social: "alone", space: "transit" },
  },
  {
    id: "roadtrip-gas-station-night",
    text: "She's standing outside a gas station at night, the harsh fluorescent canopy lights from above casting cool light on her. Snacks or a drink in her hand, casual road-trip outfit. The car is partially visible behind her, the gas pumps and the dark highway in the background. The vibe is the middle-of-nowhere late-night pause on a long drive.",
    displayName: "Station-service nuit road trip",
    tags: { lighting: "fluorescent", energy: "low", social: "alone", space: "outdoor-urban" },
  },

  // === VACATION — MEDITERRANEAN / EUROPE ===
  {
    id: "mediterranean-terrace-sunset",
    text: "She's at a small cafe or restaurant terrace overlooking the Mediterranean Sea or a coastal European town in the late afternoon. Glass of white wine or aperitivo on the table, golden warm light from the setting sun, sea or terracotta rooftops in the background. Relaxed summer outfit, slight sun on the skin. Vibe of Italy or Greece in summer.",
    displayName: "Terrasse Méditerranée coucher de soleil",
    tags: { lighting: "golden-hour", energy: "low", social: "alone", space: "outdoor-urban" },
  },
  {
    id: "cobblestone-street-walking-summer",
    text: "She's walking down a narrow cobblestone street in a European old town in summer. Old colorful buildings with shutters on either side, occasional flowers or laundry visible at windows, warm midday or late afternoon light. Light summer outfit (sundress, tank top with shorts, or linen). Casual unposed walking pace.",
    displayName: "Rue pavée Europe été",
    tags: { lighting: "daylight-natural", energy: "medium", social: "alone", space: "outdoor-urban" },
  },
  {
    id: "boat-day-water",
    text: "She's on a boat in the middle of the day, blue Mediterranean or tropical water visible behind her, wind in her hair, casual swimsuit or summer outfit. The boat's railing or deck partially visible. Bright sunlight, sun on her skin, slight squint from the brightness. Vibe of a vacation day on the water.",
    displayName: "Bateau jour mer",
    tags: { lighting: "daylight-harsh", energy: "low", social: "alone", space: "outdoor-nature" },
  },

  // === VACATION — ASIA / RUSSIA ===
  {
    id: "asia-street-market-evening",
    text: "She's exploring a busy street market in an Asian city in the evening — narrow alleys with hanging lanterns, food stalls with steam rising, neon signs in Chinese or Japanese characters glowing pink and blue. Crowded but immersive. She's looking around, casual travel outfit, possibly holding a takeaway food item. Vibe of Tokyo, Bangkok, or Hong Kong nightlife exploration.",
    displayName: "Marché de rue Asie soir",
    tags: { lighting: "dim-warm", energy: "medium", social: "alone", space: "outdoor-urban" },
  },
  {
    id: "russia-snowy-square-winter",
    text: "She's standing in a large snowy public square in a Russian or Eastern European winter city, ornate historical buildings or onion-domed architecture visible in the background, falling snow or fresh snow on the ground. Heavy winter coat, scarf, possibly fur hat, breath visible in the cold air. Cold gray-blue daylight. Vibe of Moscow or Saint Petersburg in winter.",
    displayName: "Place enneigée Russie hiver",
    tags: { lighting: "daylight-natural", energy: "low", social: "alone", space: "outdoor-urban" },
  },
];

// === EMOTIONAL_STATES (20) ===============================================

export const EMOTIONAL_STATES: DictEntry[] = [
  {
    id: "soft-natural-smile",
    text: "Soft natural smile, eyes slightly squinted, looking comfortable and unaware.",
    displayName: "Sourire naturel doux",
    tags: { lighting: "flexible", energy: "medium", social: "flexible", space: "flexible" },
  },
  {
    id: "genuinely-laughing",
    text: "Genuinely laughing, head tilted, eyes barely open, caught mid-sound.",
    displayName: "Rire sincère",
    tags: { lighting: "flexible", energy: "high", social: "flexible", space: "flexible" },
  },
  {
    id: "tired-empty-stare",
    text: "Tired empty stare, no expression, eyes slightly out of focus.",
    displayName: "Regard vide fatigué",
    tags: { lighting: "flexible", energy: "low", social: "flexible", space: "flexible" },
  },
  {
    id: "crying-stopped-crying",
    text: "Crying or just stopped crying, eyes red and slightly swollen, nose pink, no makeup left.",
    displayName: "Pleurs / fin de pleurs",
    tags: { lighting: "flexible", energy: "low", social: "alone", space: "flexible" },
  },
  {
    id: "concentrated-frown",
    text: "Concentrated on something off-frame, slight frown, lips parted in focus.",
    displayName: "Concentration léger froncement",
    tags: { lighting: "flexible", energy: "medium", social: "flexible", space: "flexible" },
  },
  {
    id: "duck-face-playful",
    text: "Pouty playful 'duck face' aware of the camera, slightly ironic, hint of smile in the eyes.",
    displayName: "Duck face joueur",
    tags: { lighting: "flexible", energy: "low", social: "alone", space: "flexible" },
  },
  {
    id: "pure-joy-mid-shout",
    text: "Pure joy, mouth wide open, eyes bright, mid-shout or mid-cheer.",
    displayName: "Joie pure cri / cheer",
    tags: { lighting: "flexible", energy: "high", social: "flexible", space: "flexible" },
  },
  {
    id: "annoyed-jaw-set",
    text: "Annoyed, jaw set, eyes flat, half-look at the camera or off to the side.",
    displayName: "Énervée mâchoire serrée",
    tags: { lighting: "flexible", energy: "low", social: "flexible", space: "flexible" },
  },
  {
    id: "lost-in-thought",
    text: "Lost in thought, looking at nothing in particular, melancholic neutral expression.",
    displayName: "Perdue dans ses pensées",
    tags: { lighting: "flexible", energy: "low", social: "flexible", space: "flexible" },
  },
  {
    id: "self-aware-half-smile",
    text: "Tired self-aware half-smile, eyebrows slightly raised in a 'well, here I am' expression.",
    displayName: "Demi-sourire conscient",
    tags: { lighting: "flexible", energy: "low", social: "flexible", space: "flexible" },
  },
  {
    id: "mid-conversation-listening",
    text: "Mid-conversation expression, looking slightly off-camera, listening with attention, slight smile or neutral.",
    displayName: "Conversation à l'écoute",
    tags: { lighting: "flexible", energy: "medium", social: "with-others", space: "flexible" },
  },
  {
    id: "mid-conversation-talking",
    text: "Mid-conversation expression, lips parted in the middle of saying something, hand gesture half-visible.",
    displayName: "Conversation en train de parler",
    tags: { lighting: "flexible", energy: "medium", social: "with-others", space: "flexible" },
  },
  {
    id: "sleepy-content",
    text: "Sleepy content expression, eyes heavy-lidded, soft natural relaxation, no posing.",
    displayName: "Endormie satisfaite",
    tags: { lighting: "flexible", energy: "low", social: "flexible", space: "flexible" },
  },
  {
    id: "surprised-caught-off-guard",
    text: "Surprised caught off guard expression, eyebrows raised, mouth slightly open, not posing.",
    displayName: "Surprise prise sur le fait",
    tags: { lighting: "flexible", energy: "medium", social: "flexible", space: "flexible" },
  },
  {
    id: "grateful-genuine",
    text: "Genuine quiet happiness, soft smile, eyes calm, the expression of feeling good in this moment without performing it.",
    displayName: "Gratitude sincère",
    tags: { lighting: "flexible", energy: "low", social: "flexible", space: "flexible" },
  },
  {
    id: "doubtful-skeptical",
    text: "Doubtful skeptical expression, one eyebrow slightly raised, mouth pressed, evaluating.",
    displayName: "Sceptique dubitative",
    tags: { lighting: "flexible", energy: "low", social: "flexible", space: "flexible" },
  },
  {
    id: "distracted-phone-focus",
    text: "Distracted half-frown looking down at the phone, the focused look of someone tracking something on a screen.",
    displayName: "Distraite focus téléphone",
    tags: { lighting: "flexible", energy: "low", social: "alone", space: "flexible" },
  },
  {
    id: "confident-direct-gaze",
    text: "Confident direct gaze at the camera, slight closed-mouth smile, no performative energy, just present.",
    displayName: "Regard direct confiant",
    tags: { lighting: "flexible", energy: "medium", social: "flexible", space: "flexible" },
  },
  {
    id: "vulnerable-soft",
    text: "Vulnerable soft expression, slight downturn of the mouth, eyes a bit glassy without crying, the look of someone holding something in.",
    displayName: "Vulnérable douce",
    tags: { lighting: "flexible", energy: "low", social: "alone", space: "flexible" },
  },
  {
    id: "playful-tongue-out",
    text: "Playful tongue out or silly face, clearly hamming for the camera in a friendly way, low-key.",
    displayName: "Joueuse langue tirée",
    tags: { lighting: "flexible", energy: "medium", social: "flexible", space: "flexible" },
  },
];

// === FRAMINGS (15) =======================================================

export const FRAMINGS: DictEntry[] = [
  {
    id: "front-cam-selfie-vertical",
    text: "This is a selfie taken with the front-facing camera of her phone. The camera's perspective IS the frame — what you see is what the front camera captured. Her face fills the lower two-thirds of the frame. Above her face, the upper third shows whatever is behind her head (ceiling, sky, wall, headboard) slightly out of focus. Her hand holding the phone is not in the frame. The phone is not in the frame. Slight wide-angle distortion typical of front camera held close to the face.",
    displayName: "Selfie front cam vertical",
    tags: { lighting: "flexible", energy: "flexible", social: "alone", space: "flexible" },
  },
  {
    id: "front-cam-selfie-from-above",
    text: "This is a selfie taken with the front-facing camera, phone held above her face pointing down. The camera's perspective IS the frame. Her face is centered, the surface behind her head (pillow, headrest, blanket) fills the rest. Her hand and the phone are not in the frame. Slight wide-angle distortion.",
    displayName: "Selfie front cam au-dessus",
    tags: { lighting: "flexible", energy: "low", social: "alone", space: "flexible" },
  },
  {
    id: "mirror-selfie-bathroom",
    text: "Mirror selfie. She's facing a mirror, holding the phone at chest level. The phone IS visible in the reflection — that's how mirror selfies work. Her body from waist or chest up is visible in the reflection, the room behind her partially visible.",
    displayName: "Selfie miroir salle de bain",
    tags: { lighting: "flexible", energy: "flexible", social: "alone", space: "indoor-private" },
  },
  {
    id: "mirror-selfie-fullbody",
    text: "Full body mirror selfie. She's standing in front of a full-length mirror, holding the phone at chest or waist height. The phone IS visible in the reflection. Outfit-of-the-day vibe.",
    displayName: "Selfie miroir plein corps",
    tags: { lighting: "flexible", energy: "low", social: "alone", space: "indoor-private" },
  },
  {
    id: "mirror-selfie-public",
    text: "Mirror selfie in a public space (gym, store fitting room, elevator). She's facing the mirror with the phone at chest height. The phone IS visible in the reflection.",
    displayName: "Selfie miroir public",
    tags: { lighting: "flexible", energy: "flexible", social: "alone", space: "indoor-public" },
  },
  {
    id: "photo-by-friend-arms-length",
    text: "Photo taken by a friend from arm's length away, slightly imperfect framing, she's reacting to the friend not posing for the camera. The friend's perspective is what we see.",
    displayName: "Photo par un·e ami·e proche",
    tags: { lighting: "flexible", energy: "flexible", social: "with-others", space: "flexible" },
  },
  {
    id: "photo-by-friend-from-distance",
    text: "Wide candid photo taken by a friend from a few steps away, real environment around her, slightly imperfect framing tilted a bit. She's not aware of the photo being taken or just barely.",
    displayName: "Photo par un·e ami·e à distance",
    tags: { lighting: "flexible", energy: "flexible", social: "flexible", space: "flexible" },
  },
  {
    id: "pov-looking-down-hands",
    text: "POV shot from her own perspective looking down at her own hands, lap, or what she's holding. No face visible. Phone or her gaze is what frames the shot.",
    displayName: "POV vers les mains",
    tags: { lighting: "flexible", energy: "low", social: "flexible", space: "flexible" },
  },
  {
    id: "pov-looking-down-feet",
    text: "POV shot from her own perspective looking down at her own feet or legs. No face visible. Sneakers, sand, blanket, or whatever is under her in frame.",
    displayName: "POV vers les pieds",
    tags: { lighting: "flexible", energy: "low", social: "flexible", space: "flexible" },
  },
  {
    id: "candid-wide-from-across-room",
    text: "Wide candid shot from across a room, she doesn't know she's being photographed, going about her business. Real environment with real depth around her.",
    displayName: "Candid large depuis l'autre bout de la pièce",
    tags: { lighting: "flexible", energy: "flexible", social: "flexible", space: "flexible" },
  },
  {
    id: "photo-side-by-side-walking",
    text: "Photo taken by someone walking next to her, captured mid-step, slight motion blur. The companion's perspective is what frames the shot.",
    displayName: "Photo côte à côte en marche",
    tags: { lighting: "flexible", energy: "medium", social: "with-others", space: "flexible" },
  },
  {
    id: "couple-selfie",
    text: "Couple selfie, both faces close in the frame, phone held by one of them. Cozy or affectionate, both visible.",
    displayName: "Selfie de couple",
    tags: { lighting: "flexible", energy: "flexible", social: "intimate-pair", space: "flexible" },
  },
  {
    id: "caught-by-friend-in-motion",
    text: "Photo taken by a friend who's a few steps behind or beside her, captured the moment she's turning around, walking, or moving through the scene. The framing is reactive — the friend is trying to catch the moment, not compose it. Slight motion in the subject, slight tilt in the horizon, the subject is not centered but caught dynamically. Hair or clothing in motion. The friend's perspective is what we see — sometimes too close, sometimes a bit far, never perfectly framed.",
    displayName: "Captée par un·e ami·e en mouvement",
    tags: { lighting: "flexible", energy: "medium", social: "with-others", space: "flexible" },
  },
  {
    id: "flash-disposable-camera",
    text: "Photo taken with a small disposable camera or a phone flash in compact mode. Hard direct flash hitting the subject from the camera position, creating a sharp shadow behind on whatever surface is behind her, slightly overexposed skin where the flash hits, slightly underexposed and grainy in the corners. The composition is approximate, not centered, sometimes a bit too tight or too wide. The kind of casual party or gathering snapshot from the late 90s or early 2000s. Slight color cast from the flash, slightly washed-out reds.",
    displayName: "Flash compact / jetable",
    tags: { lighting: "flexible", energy: "medium", social: "with-others", space: "flexible" },
  },
  {
    id: "friend-pov-across-table",
    text: "Photo taken by a friend sitting across the table from her at a cafe, restaurant, or bar. The friend's hand or arm is sometimes visible at the edge of the frame, plates or glasses partially visible in the foreground, slightly out of focus. She's reacting to the friend or to the moment — lifting her glass to her lips, mid-laugh at something, looking off to the side, talking with her hands. The composition is organic, captured in the rhythm of conversation. Mid-shot showing her from chest up, environment visible behind her but secondary.",
    displayName: "POV ami·e en face à table",
    tags: { lighting: "flexible", energy: "medium", social: "with-others", space: "flexible" },
  },
];

// === TECHNICAL_REGISTERS (9) =============================================

export const TECHNICAL_REGISTERS: DictEntry[] = [
  {
    id: "iphone-natural-daylight-soft",
    text: "iPhone front or rear camera, soft natural daylight from a window, even warm exposure, sharp focus, the typical 'good photo' look.",
    displayName: "iPhone lumière naturelle douce",
    tags: { lighting: "daylight-natural", energy: "flexible", social: "flexible", space: "flexible" },
  },
  {
    id: "iphone-bright-sunlight-harsh",
    text: "iPhone in bright outdoor sunlight, hard direct sun creating sharp shadows under the chin and nose, slight overexposure on the brightest skin areas, deep shadows in the background, high contrast.",
    displayName: "iPhone soleil dur",
    tags: { lighting: "daylight-harsh", energy: "flexible", social: "flexible", space: "flexible" },
  },
  {
    id: "iphone-golden-hour-warm",
    text: "iPhone in golden hour, warm orange-pink late afternoon light, soft long shadows, the magic hour glow, slight chromatic warmth across the whole scene.",
    displayName: "iPhone golden hour",
    tags: { lighting: "golden-hour", energy: "flexible", social: "flexible", space: "flexible" },
  },
  {
    id: "iphone-low-light-warm-bulbs",
    text: "iPhone in low ambient light, no flash, warm tungsten or candle light only, visible digital noise in the shadows, slight motion blur from low shutter speed, warm orange color cast across the entire scene.",
    displayName: "iPhone faible lumière chaude",
    tags: { lighting: "dim-warm", energy: "flexible", social: "flexible", space: "flexible" },
  },
  {
    id: "iphone-low-light-cool-streetlight",
    text: "iPhone in low cool ambient light, no flash, cool streetlight or dashboard light, visible digital noise, slight motion blur, cool blue-green color cast.",
    displayName: "iPhone faible lumière froide",
    tags: { lighting: "dim-cool", energy: "flexible", social: "flexible", space: "flexible" },
  },
  {
    id: "iphone-fluorescent-medical",
    text: "iPhone in harsh fluorescent lighting from above: hard cool overhead light flattening the face, slight green-cyan color cast on the skin, no flattering shadows, the unflattering institutional environment look.",
    displayName: "iPhone néon institutionnel",
    tags: { lighting: "fluorescent", energy: "flexible", social: "flexible", space: "flexible" },
  },
  {
    id: "iphone-screen-glow-dark",
    text: "iPhone front camera in near-darkness, the phone screen itself acts as the only light source, blue-white cast on the face from above, deep shadows everywhere else, visible digital noise in the dark areas, low shutter speed.",
    displayName: "iPhone glow d'écran nuit",
    tags: { lighting: "screen-only", energy: "low", social: "alone", space: "flexible" },
  },
  {
    id: "iphone-hdr-backlight-window",
    text: "iPhone HDR struggling against backlight from a window: her face is artificially lifted out of the shadow making the skin look slightly flat, soft halo of light around her hair and shoulders, the window or bright background partially blown out, the typical iPhone HDR auto look.",
    displayName: "iPhone HDR contre-jour fenêtre",
    tags: { lighting: "daylight-natural", energy: "flexible", social: "flexible", space: "indoor-private" },
  },
  {
    id: "iphone-vintage-grainy-soft",
    text: "iPhone with vintage filter or older iPhone capture quality: visible grain throughout, slightly soft focus, mildly desaturated colors with a warm or cool cast depending on the scene, slight chromatic aberration on high-contrast edges, the kind of slightly imperfect output that suggests an iPhone 6/7/8 era or an applied film emulation. Less sharp than modern flagship phones, more textured and emotional.",
    displayName: "iPhone vintage grain",
    tags: { lighting: "flexible", energy: "flexible", social: "flexible", space: "flexible" },
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
- Aspect ratio: ${aspectLabel}.`;
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
}): string {
  const identityBlock = buildIdentityBlock(
    args.identityDescription,
    args.signatureFeatures,
  );
  return `${identityBlock}

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

export type Combination = {
  situation: DictEntry;
  emotionalState: DictEntry;
  framing: DictEntry;
  technicalRegister: DictEntry;
};

export function pickCompatibleCombination(
  filters?: CombinationFilters,
): Combination | null {
  const situationPool = filterSituations(SITUATIONS, filters);
  if (situationPool.length === 0) return null;

  const MAX_TRIES = 10;
  for (let attempt = 0; attempt < MAX_TRIES; attempt++) {
    const situation = randomChoice(situationPool);
    const compatibleEmotions = EMOTIONAL_STATES.filter((e) =>
      isCompatible(situation.tags, e.tags),
    );
    const compatibleFramings = FRAMINGS.filter((f) =>
      isCompatible(situation.tags, f.tags),
    );
    const compatibleRegisters = TECHNICAL_REGISTERS.filter((r) =>
      isCompatible(situation.tags, r.tags),
    );
    if (
      compatibleEmotions.length === 0 ||
      compatibleFramings.length === 0 ||
      compatibleRegisters.length === 0
    ) {
      continue;
    }
    return {
      situation,
      emotionalState: randomChoice(compatibleEmotions),
      framing: randomChoice(compatibleFramings),
      technicalRegister: randomChoice(compatibleRegisters),
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
      emotionalStates: EMOTIONAL_STATES.map((s) => ({
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
