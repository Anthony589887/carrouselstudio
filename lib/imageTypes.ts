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
