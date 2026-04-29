import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const imageStatus = v.union(
  v.literal("generating"),
  v.literal("available"),
  v.literal("used"),
  v.literal("deleted"),
  v.literal("failed"),
);

const aspectRatio = v.union(v.literal("4:5"), v.literal("9:16"));

const carouselStatus = v.union(v.literal("draft"), v.literal("posted"));

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
      images: v.array(
        v.object({
          imageId: v.id("images"),
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
});
