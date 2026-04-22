import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const scriptStatus = v.union(
  v.literal("draft"),
  v.literal("ready"),
  v.literal("generated"),
  v.literal("posted"),
);

const generationStatus = v.union(
  v.literal("pending"),
  v.literal("in_progress"),
  v.literal("completed"),
  v.literal("partial"),
  v.literal("failed"),
);

const slideGenStatus = v.union(
  v.literal("pending"),
  v.literal("generating"),
  v.literal("completed"),
  v.literal("failed"),
);

const uiAssetType = v.union(
  v.literal("ui_screen"),
  v.literal("thumbnail"),
  v.literal("logo"),
);

export default defineSchema({
  personas: defineTable({
    code: v.string(),
    name: v.string(),
    tiktokAccount: v.optional(v.string()),
    gender: v.union(v.literal("F"), v.literal("H")),
    ethnicity: v.string(),
    age: v.number(),
    faceBlock: v.string(),
    photoStorageId: v.optional(v.id("_storage")),
    defaultDA: v.optional(v.string()),
    notes: v.optional(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_code", ["code"])
    .index("by_active", ["isActive"]),

  formats: defineTable({
    code: v.string(),
    name: v.string(),
    archetype: v.string(),
    defaultDA: v.string(),
    slideTemplates: v.array(
      v.object({
        slot: v.number(),
        role: v.string(),
        promptTemplate: v.string(),
        notes: v.optional(v.string()),
      }),
    ),
    description: v.optional(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_code", ["code"])
    .index("by_active", ["isActive"]),

  scripts: defineTable({
    code: v.string(),
    name: v.string(),
    formatId: v.id("formats"),
    preferredPersonaId: v.optional(v.id("personas")),
    slides: v.array(
      v.object({
        slot: v.number(),
        role: v.string(),
        visualPrompt: v.string(),
        overlayText: v.string(),
      }),
    ),
    status: scriptStatus,
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_code", ["code"])
    .index("by_format", ["formatId"])
    .index("by_status", ["status"]),

  generations: defineTable({
    scriptId: v.id("scripts"),
    personaId: v.id("personas"),
    slides: v.array(
      v.object({
        slot: v.number(),
        status: slideGenStatus,
        imageStorageId: v.optional(v.id("_storage")),
        errorMessage: v.optional(v.string()),
        generatedAt: v.optional(v.number()),
      }),
    ),
    status: generationStatus,
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_script", ["scriptId"])
    .index("by_persona", ["personaId"])
    .index("by_status", ["status"]),

  ui_assets: defineTable({
    code: v.string(),
    name: v.string(),
    type: uiAssetType,
    storageId: v.id("_storage"),
    description: v.optional(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_code", ["code"])
    .index("by_type", ["type"]),
});
