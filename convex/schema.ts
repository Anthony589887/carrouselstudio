import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const imageStatus = v.union(
  v.literal("generating"),
  v.literal("available"),
  v.literal("used"),
  v.literal("failed"),
);

// Scenes never reach `used` — they remain available indefinitely so they can
// be reused across multiple carousels (decision validated in diagnostic).
const sceneStatus = v.union(
  v.literal("generating"),
  v.literal("available"),
  v.literal("failed"),
);

const aspectRatio = v.union(v.literal("4:5"), v.literal("9:16"));

const carouselStatus = v.union(v.literal("draft"), v.literal("posted"));

// Polymorphic carousel item discriminator. `kind` is OPTIONAL during the
// 2-step migration: legacy rows lack it and are interpreted as "image".
// After backfill (`migrationsCarousels.backfillCarouselsKindImage`), every
// row has `kind`. A future schema PR may then make it required.
const carouselItemKind = v.union(v.literal("image"), v.literal("scene"));

export default defineSchema({
    personas: defineTable({
      name: v.string(),
      identityDescription: v.string(),
      // Optional in the schema for backwards compat — the migration
      // `personas.migrateGenders` backfills existing rows. Composer treats
      // undefined as "feminine" until the migration runs.
      gender: v.optional(
        v.union(
          v.literal("feminine"),
          v.literal("masculine"),
          v.literal("neutral"),
        ),
      ),
      signatureFeatures: v.optional(v.string()),
      referenceImageStorageId: v.id("_storage"),
      tiktokAccount: v.optional(v.string()),
      instagramAccount: v.optional(v.string()),
      // Optional weighted-draw + mood preferences. When undefined, composer
      // falls back to uniform draw (legacy behavior). The weight maps use
      // `v.record` (string → number) because Convex's validator rejects
      // hyphens in object keys; the runtime contract is that keys must
      // match the dict IDs they reference (see imagePrompts.ts types).
      stylePreferences: v.optional(
        v.object({
          moodDescriptor: v.optional(v.string()),
          emotionWeights: v.optional(v.record(v.string(), v.number())),
          spaceWeights: v.optional(v.record(v.string(), v.number())),
          registerWeights: v.optional(v.record(v.string(), v.number())),
        }),
      ),
      createdAt: v.number(),
    }),

    images: defineTable({
      personaId: v.id("personas"),
      folderId: v.optional(v.id("folders")),
      // Mode A combinatoire — populated for new images
      situationId: v.optional(v.string()),
      emotionalStateId: v.optional(v.string()),
      framingId: v.optional(v.string()),
      technicalRegisterId: v.optional(v.string()),
      // Legacy type from v2.0 — kept for old images so they remain filterable
      legacyType: v.optional(v.string()),
      status: imageStatus,
      imageStorageId: v.optional(v.id("_storage")),
      promptUsed: v.string(),
      aspectRatio: v.optional(aspectRatio),
      errorMessage: v.optional(v.string()),
      createdAt: v.number(),
    })
      .index("by_persona", ["personaId"])
      .index("by_persona_and_status", ["personaId", "status"])
      .index("by_situation", ["situationId"])
      .index("by_legacy_type", ["legacyType"])
      .index("by_folder", ["folderId"]),

    carousels: defineTable({
      personaId: v.id("personas"),
      folderId: v.optional(v.id("folders")),
      // Polymorphic items: an entry references either an image or a scene.
      // `kind` is optional ONLY for backwards compat with legacy rows that
      // predate the scenes feature; once `migrationsCarousels.backfillCarouselsKindImage`
      // has run on every deployment, all entries have `kind`. `imageId` and
      // `sceneId` are mutually exclusive — exactly one is set per entry.
      images: v.array(
        v.object({
          kind: v.optional(carouselItemKind),
          imageId: v.optional(v.id("images")),
          sceneId: v.optional(v.id("scenes")),
          order: v.number(),
        }),
      ),
      status: carouselStatus,
      tiktokLink: v.optional(v.string()),
      instagramLink: v.optional(v.string()),
      postedAt: v.optional(v.number()),
      createdAt: v.number(),
    })
      .index("by_persona", ["personaId"])
      .index("by_status", ["status"])
      .index("by_folder", ["folderId"]),

    folders: defineTable({
      personaId: v.id("personas"),
      name: v.string(),
      createdAt: v.number(),
    }).index("by_persona", ["personaId"]),

    // Persona-less image bank. Generated text-to-image (no reference photo),
    // never marked "used" so they can be reused across carousels. The 3 tag
    // dimensions (lighting/energy/space) drive both the random draw from
    // SCENES dict and the user-facing filter chips.
    scenes: defineTable({
      generationMode: v.union(
        v.literal("from-dict"),
        v.literal("from-prompt"),
      ),
      // from-dict only — reference to SCENES dict in imagePrompts.ts
      sceneId: v.optional(v.string()),
      // from-prompt only — verbatim user input
      customPrompt: v.optional(v.string()),
      // Tags: always present for from-dict (copied from dict entry); optional
      // for from-prompt (user can leave them blank).
      tags: v.optional(
        v.object({
          lighting: v.string(),
          energy: v.string(),
          space: v.string(),
        }),
      ),
      status: sceneStatus,
      imageStorageId: v.optional(v.id("_storage")),
      aspectRatio,
      promptUsed: v.string(),
      errorMessage: v.optional(v.string()),
      createdAt: v.number(),
    }).index("by_status", ["status"]),
});
