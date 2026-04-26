// Frontend mirror of tag values + a tiny pool-size estimator. Kept in sync
// with convex/imagePrompts.ts manually — these are stable enums.

export type Aspect = "4:5" | "9:16";

export const LIGHTING_VALUES = [
  "daylight-natural",
  "daylight-harsh",
  "golden-hour",
  "dim-warm",
  "dim-cool",
  "fluorescent",
  "screen-only",
] as const;

export const ENERGY_VALUES = ["high", "medium", "low"] as const;

export const SOCIAL_VALUES = ["alone", "with-others", "intimate-pair"] as const;

export const SPACE_VALUES = [
  "indoor-private",
  "indoor-public",
  "outdoor-urban",
  "outdoor-nature",
  "transit",
  "medical",
] as const;

export type DimValues = {
  lighting: string[];
  energy: string[];
  social: string[];
  space: string[];
};

// Small static list of (lighting, energy, social, space) for each of the 60
// situations. Used only by the panel to warn the user when their filter set
// matches zero situations. Kept here to avoid pulling Convex into the panel.
const SITUATION_TAGS: ReadonlyArray<{
  l: string;
  e: string;
  s: string;
  sp: string;
}> = [
  // bedroom / morning / rest
  { l: "daylight-natural", e: "low", s: "alone", sp: "indoor-private" },
  { l: "screen-only", e: "low", s: "alone", sp: "indoor-private" },
  { l: "daylight-natural", e: "low", s: "alone", sp: "indoor-private" },
  { l: "daylight-natural", e: "medium", s: "alone", sp: "indoor-private" },
  { l: "daylight-natural", e: "low", s: "alone", sp: "indoor-private" },
  { l: "daylight-natural", e: "low", s: "alone", sp: "indoor-private" },
  { l: "dim-warm", e: "low", s: "alone", sp: "indoor-private" },
  // kitchen / living / domestic
  { l: "daylight-natural", e: "low", s: "alone", sp: "indoor-private" },
  { l: "daylight-natural", e: "medium", s: "alone", sp: "indoor-private" },
  { l: "dim-warm", e: "medium", s: "alone", sp: "indoor-private" },
  { l: "dim-warm", e: "low", s: "alone", sp: "indoor-private" },
  { l: "daylight-natural", e: "medium", s: "alone", sp: "indoor-private" },
  { l: "dim-warm", e: "low", s: "alone", sp: "indoor-private" },
  { l: "daylight-natural", e: "low", s: "alone", sp: "indoor-private" },
  { l: "daylight-natural", e: "medium", s: "alone", sp: "indoor-private" },
  { l: "daylight-natural", e: "low", s: "alone", sp: "indoor-private" },
  { l: "dim-warm", e: "low", s: "alone", sp: "indoor-private" },
  { l: "daylight-natural", e: "low", s: "alone", sp: "indoor-private" },
  // getting ready
  { l: "daylight-natural", e: "medium", s: "alone", sp: "indoor-private" },
  { l: "daylight-natural", e: "medium", s: "alone", sp: "indoor-private" },
  // café / bar / restaurant
  { l: "daylight-natural", e: "medium", s: "alone", sp: "indoor-public" },
  { l: "daylight-natural", e: "low", s: "alone", sp: "indoor-public" },
  { l: "daylight-natural", e: "medium", s: "with-others", sp: "indoor-public" },
  { l: "daylight-natural", e: "medium", s: "alone", sp: "indoor-public" },
  { l: "dim-warm", e: "medium", s: "with-others", sp: "indoor-public" },
  { l: "dim-warm", e: "medium", s: "with-others", sp: "indoor-public" },
  { l: "dim-warm", e: "high", s: "with-others", sp: "indoor-public" },
  // gym / fitting / store
  { l: "fluorescent", e: "medium", s: "alone", sp: "indoor-public" },
  { l: "fluorescent", e: "high", s: "alone", sp: "indoor-public" },
  { l: "fluorescent", e: "low", s: "alone", sp: "indoor-public" },
  { l: "fluorescent", e: "low", s: "alone", sp: "indoor-public" },
  { l: "fluorescent", e: "medium", s: "alone", sp: "indoor-public" },
  // outdoor urban
  { l: "daylight-harsh", e: "medium", s: "alone", sp: "outdoor-urban" },
  { l: "dim-cool", e: "medium", s: "alone", sp: "outdoor-urban" },
  { l: "golden-hour", e: "low", s: "alone", sp: "outdoor-urban" },
  { l: "daylight-harsh", e: "medium", s: "alone", sp: "outdoor-urban" },
  { l: "dim-cool", e: "low", s: "alone", sp: "outdoor-urban" },
  { l: "daylight-harsh", e: "medium", s: "alone", sp: "outdoor-urban" },
  { l: "dim-warm", e: "medium", s: "with-others", sp: "outdoor-urban" },
  { l: "daylight-natural", e: "high", s: "with-others", sp: "outdoor-nature" },
  { l: "daylight-natural", e: "medium", s: "with-others", sp: "outdoor-urban" },
  { l: "daylight-harsh", e: "low", s: "alone", sp: "outdoor-urban" },
  // outdoor nature / vacation
  { l: "daylight-harsh", e: "medium", s: "alone", sp: "outdoor-nature" },
  { l: "daylight-natural", e: "low", s: "alone", sp: "outdoor-nature" },
  { l: "daylight-harsh", e: "low", s: "alone", sp: "outdoor-nature" },
  { l: "daylight-natural", e: "low", s: "alone", sp: "outdoor-urban" },
  { l: "daylight-natural", e: "medium", s: "alone", sp: "outdoor-urban" },
  // transit
  { l: "dim-cool", e: "low", s: "alone", sp: "transit" },
  { l: "daylight-natural", e: "medium", s: "alone", sp: "transit" },
  { l: "dim-cool", e: "low", s: "alone", sp: "transit" },
  // medical
  { l: "fluorescent", e: "low", s: "alone", sp: "medical" },
  { l: "fluorescent", e: "low", s: "alone", sp: "medical" },
  // partner
  { l: "dim-warm", e: "low", s: "intimate-pair", sp: "indoor-private" },
  { l: "dim-warm", e: "medium", s: "intimate-pair", sp: "indoor-public" },
  { l: "daylight-natural", e: "medium", s: "intimate-pair", sp: "outdoor-urban" },
  { l: "daylight-natural", e: "low", s: "intimate-pair", sp: "indoor-private" },
  // misc high-interiority
  { l: "dim-cool", e: "low", s: "alone", sp: "indoor-private" },
  { l: "daylight-natural", e: "low", s: "alone", sp: "indoor-private" },
  { l: "daylight-natural", e: "low", s: "alone", sp: "indoor-private" },
];

function dimMatches(value: string, selected: string[]): boolean {
  if (selected.length === 0) return true;
  return selected.includes(value);
}

export function estimateMatchingSituations(filters: DimValues): number {
  return SITUATION_TAGS.filter(
    (s) =>
      dimMatches(s.l, filters.lighting) &&
      dimMatches(s.e, filters.energy) &&
      dimMatches(s.s, filters.social) &&
      dimMatches(s.sp, filters.space),
  ).length;
}
