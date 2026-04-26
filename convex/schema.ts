import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const imageStatus = v.union(
  v.literal("available"),
  v.literal("used"),
  v.literal("deleted"),
);

const carouselStatus = v.union(v.literal("draft"), v.literal("posted"));

export default defineSchema({
  personas: defineTable({
    name: v.string(),
    identityDescription: v.string(),
    referenceImageStorageId: v.id("_storage"),
    tiktokAccount: v.optional(v.string()),
    instagramAccount: v.optional(v.string()),
    createdAt: v.number(),
  }),

  images: defineTable({
    personaId: v.id("personas"),
    type: v.string(),
    status: imageStatus,
    imageStorageId: v.id("_storage"),
    promptUsed: v.string(),
    createdAt: v.number(),
  })
    .index("by_persona", ["personaId"])
    .index("by_persona_and_status", ["personaId", "status"])
    .index("by_type", ["type"]),

  carousels: defineTable({
    personaId: v.id("personas"),
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
    .index("by_status", ["status"]),
});
