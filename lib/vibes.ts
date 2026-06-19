// Creator-facing "vibes": one-click presets that map onto the EXISTING
// generateBatch filter axes (lighting / energy / social / space) defined in
// convex/imagePrompts.ts. No new generation logic — a vibe is just a curated
// set of filter values handed to api.imageBatch.generateBatch.
//
// Edit freely; the structure is intentionally simple so these can become
// admin-configurable later. Filter VALUES must match the dict vocabulary:
//   space:   indoor-private | indoor-public | outdoor-urban | outdoor-nature | transit | medical
//   energy:  high | medium | low
//   social:  alone | with-others | intimate-pair
//   lighting: daylight-natural | daylight-harsh | golden-hour | dim-warm |
//             dim-cool | fluorescent | screen-only
//
// ─── Vibes requested but NOT shipped (no clean equivalent in the dict) ───
// The dict has no venue/activity dimension — only the abstract `space` bucket —
// so these can't be expressed without a misleading mapping (flagged per brief):
//   • "Sport/Gym": only ~2 gym situations, buried inside `indoor-public`;
//     the closest axis (energy:["high"]) is dominated by parties/concerts, so
//     the chip would mostly return nightlife, not workouts.
//   • "Bureau/Travail": there is no office/work `space` value at all.
// To support them later, add a dedicated tag (e.g. space "workplace"/"fitness")
// or situationId-based presets, then add entries below.

export type VibeFilters = {
  lighting?: string[];
  energy?: string[];
  social?: string[];
  space?: string[];
};

export type Vibe = {
  id: string;
  label: string;
  filters: VibeFilters;
};

export const VIBES: Vibe[] = [
  // Everyday life at home (bed, kitchen, couch, bathroom…). Rich, coherent.
  { id: "lifestyle", label: "Lifestyle", filters: { space: ["indoor-private"] } },
  // Cafés, restaurants, bars (also other indoor public venues — closest bucket).
  { id: "cafe-resto", label: "Café / Resto", filters: { space: ["indoor-public"] } },
  // Hikes, beach, pool, festivals, nature.
  {
    id: "exterieur-nature",
    label: "Extérieur / Nature",
    filters: { space: ["outdoor-nature"] },
  },
  // Parties, clubs, concerts, nights out — high energy with people.
  {
    id: "soiree-sortie",
    label: "Soirée / Sortie",
    filters: { energy: ["high"], social: ["with-others"] },
  },
];
