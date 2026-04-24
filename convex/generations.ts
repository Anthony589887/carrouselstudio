import { v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { api } from "./_generated/api";

export const getInternal = internalQuery({
  args: { id: v.id("generations") },
  handler: async (ctx, { id }) => ctx.db.get(id),
});

const slideStatusValidator = v.union(
  v.literal("pending"),
  v.literal("generating"),
  v.literal("completed"),
  v.literal("failed"),
  v.literal("skipped"),
);

type SlideForStatus = { status: string };
type GlobalStatus = "pending" | "in_progress" | "completed" | "partial" | "failed";

function computeGlobalStatus(slides: SlideForStatus[]): GlobalStatus {
  const anyPending = slides.some(
    (s) => s.status === "pending" || s.status === "generating",
  );
  const anyCompleted = slides.some((s) => s.status === "completed");
  const anyFailed = slides.some((s) => s.status === "failed");
  const allTerminalOk = slides.every(
    (s) => s.status === "completed" || s.status === "skipped",
  );
  if (anyPending) return "in_progress";
  if (allTerminalOk && anyCompleted) return "completed";
  if (anyFailed) return anyCompleted ? "partial" : "failed";
  return "in_progress";
}

export const updateSlideStatusInternal = internalMutation({
  args: {
    generationId: v.id("generations"),
    slot: v.number(),
    status: slideStatusValidator,
    imageStorageId: v.optional(v.id("_storage")),
    errorMessage: v.optional(v.string()),
    generatedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const gen = await ctx.db.get(args.generationId);
    if (!gen) throw new Error("Generation not found");

    const slides = gen.slides.map((s) => {
      if (s.slot !== args.slot) return s;
      const next = {
        ...s,
        status: args.status,
        ...(args.imageStorageId !== undefined && {
          imageStorageId: args.imageStorageId,
        }),
        ...(args.errorMessage !== undefined && {
          errorMessage: args.errorMessage,
        }),
        ...(args.generatedAt !== undefined && {
          generatedAt: args.generatedAt,
        }),
      };
      // Clear stale errorMessage when a slide succeeds on retry.
      if (
        args.status === "completed" &&
        args.errorMessage === undefined
      ) {
        delete next.errorMessage;
      }
      return next;
    });

    await ctx.db.patch(args.generationId, { slides });

    // Status calc — "skipped" counts as terminal-OK (does not block, does not fail)
    const anyPending = slides.some(
      (s) => s.status === "pending" || s.status === "generating",
    );
    const anyCompleted = slides.some((s) => s.status === "completed");
    const anyFailed = slides.some((s) => s.status === "failed");
    const allTerminalOk = slides.every(
      (s) => s.status === "completed" || s.status === "skipped",
    );

    if (anyPending) {
      await ctx.db.patch(args.generationId, { status: "in_progress" });
    } else if (allTerminalOk && anyCompleted) {
      await ctx.db.patch(args.generationId, {
        status: "completed",
        completedAt: Date.now(),
      });
    } else if (anyFailed) {
      await ctx.db.patch(args.generationId, {
        status: anyCompleted ? "partial" : "failed",
        completedAt: Date.now(),
      });
    }
  },
});

const generationStatus = v.union(
  v.literal("pending"),
  v.literal("in_progress"),
  v.literal("completed"),
  v.literal("partial"),
  v.literal("failed"),
);

const slideStatus = v.union(
  v.literal("pending"),
  v.literal("generating"),
  v.literal("completed"),
  v.literal("failed"),
  v.literal("skipped"),
);

export const list = query({
  args: {
    scriptId: v.optional(v.id("scripts")),
    personaId: v.optional(v.id("personas")),
    status: v.optional(generationStatus),
  },
  handler: async (ctx, { scriptId, personaId, status }) => {
    if (scriptId) {
      return await ctx.db
        .query("generations")
        .withIndex("by_script", (q) => q.eq("scriptId", scriptId))
        .collect();
    }
    if (personaId) {
      return await ctx.db
        .query("generations")
        .withIndex("by_persona", (q) => q.eq("personaId", personaId))
        .collect();
    }
    if (status) {
      return await ctx.db
        .query("generations")
        .withIndex("by_status", (q) => q.eq("status", status))
        .collect();
    }
    return await ctx.db.query("generations").collect();
  },
});

export const get = query({
  args: { id: v.id("generations") },
  handler: async (ctx, { id }) => ctx.db.get(id),
});

export const create = mutation({
  args: {
    scriptId: v.id("scripts"),
    personaId: v.id("personas"),
  },
  handler: async (ctx, { scriptId, personaId }) => {
    const slides = [1, 2, 3, 4, 5, 6].map((slot) => ({
      slot,
      status: "pending" as const,
    }));
    return await ctx.db.insert("generations", {
      scriptId,
      personaId,
      slides,
      status: "pending",
      startedAt: Date.now(),
    });
  },
});

export const updateSlideStatus = mutation({
  args: {
    generationId: v.id("generations"),
    slot: v.number(),
    status: slideStatus,
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, { generationId, slot, status, errorMessage }) => {
    const gen = await ctx.db.get(generationId);
    if (!gen) throw new Error("Generation not found");
    const slides = gen.slides.map((s) =>
      s.slot === slot
        ? {
            ...s,
            status,
            errorMessage: errorMessage ?? s.errorMessage,
            generatedAt: status === "completed" ? Date.now() : s.generatedAt,
          }
        : s,
    );
    await ctx.db.patch(generationId, { slides });
  },
});

export const attachSlideImage = mutation({
  args: {
    generationId: v.id("generations"),
    slot: v.number(),
    imageStorageId: v.id("_storage"),
  },
  handler: async (ctx, { generationId, slot, imageStorageId }) => {
    const gen = await ctx.db.get(generationId);
    if (!gen) throw new Error("Generation not found");
    const slides = gen.slides.map((s) =>
      s.slot === slot
        ? {
            ...s,
            status: "completed" as const,
            imageStorageId,
            generatedAt: Date.now(),
          }
        : s,
    );
    await ctx.db.patch(generationId, { slides });
  },
});

export const complete = mutation({
  args: { id: v.id("generations") },
  handler: async (ctx, { id }) => {
    const gen = await ctx.db.get(id);
    if (!gen) throw new Error("Generation not found");
    const hasFailed = gen.slides.some((s) => s.status === "failed");
    const allCompleted = gen.slides.every((s) => s.status === "completed");
    const status = allCompleted
      ? "completed"
      : hasFailed
        ? gen.slides.some((s) => s.status === "completed")
          ? "partial"
          : "failed"
        : "in_progress";
    await ctx.db.patch(id, { status, completedAt: Date.now() });
  },
});

function isPlaceholder(visualPrompt: string): boolean {
  return visualPrompt.startsWith("PLACEHOLDER");
}

export const startGeneration = mutation({
  args: {
    scriptId: v.id("scripts"),
    personaId: v.id("personas"),
  },
  handler: async (ctx, { scriptId, personaId }) => {
    const script = await ctx.db.get(scriptId);
    if (!script) throw new Error("Script not found");

    const slidesByslot = new Map(script.slides.map((s) => [s.slot, s]));
    const slotsToSchedule: number[] = [];
    const slides = [1, 2, 3, 4, 5, 6].map((slot) => {
      const scriptSlide = slidesByslot.get(slot);
      if (scriptSlide && isPlaceholder(scriptSlide.visualPrompt)) {
        return { slot, status: "skipped" as const };
      }
      slotsToSchedule.push(slot);
      return { slot, status: "pending" as const };
    });

    const generationId = await ctx.db.insert("generations", {
      scriptId,
      personaId,
      slides,
      status: "pending",
      startedAt: Date.now(),
    });
    for (const slot of slotsToSchedule) {
      await ctx.scheduler.runAfter(0, api.generation.generateSlide, {
        generationId,
        slot,
      });
    }
    return generationId;
  },
});

export const retrySlide = mutation({
  args: {
    generationId: v.id("generations"),
    slot: v.number(),
  },
  handler: async (ctx, { generationId, slot }) => {
    const gen = await ctx.db.get(generationId);
    if (!gen) throw new Error("Generation not found");
    const target = gen.slides.find((s) => s.slot === slot);
    if (!target) throw new Error(`Slot ${slot} not found`);
    if (target.status !== "failed") {
      throw new Error(`Slot ${slot} is not in 'failed' state (is ${target.status})`);
    }

    const slides = gen.slides.map((s) =>
      s.slot === slot
        ? {
            slot: s.slot,
            status: "pending" as const,
          }
        : s,
    );

    const anyPendingOrGenerating = slides.some(
      (s) => s.status === "pending" || s.status === "generating",
    );
    const anyCompleted = slides.some((s) => s.status === "completed");
    const anyFailed = slides.some((s) => s.status === "failed");
    const allTerminalOk = slides.every(
      (s) => s.status === "completed" || s.status === "skipped",
    );

    const nextStatus = anyPendingOrGenerating
      ? "in_progress"
      : allTerminalOk && anyCompleted
        ? "completed"
        : anyFailed
          ? anyCompleted
            ? "partial"
            : "failed"
          : "in_progress";

    await ctx.db.patch(generationId, {
      slides,
      status: nextStatus,
      completedAt: anyPendingOrGenerating ? undefined : gen.completedAt,
    });

    await ctx.scheduler.runAfter(0, api.generation.generateSlide, {
      generationId,
      slot,
    });
  },
});

export const getWithUrls = query({
  args: { generationId: v.id("generations") },
  handler: async (ctx, { generationId }) => {
    const gen = await ctx.db.get(generationId);
    if (!gen) return null;

    const script = await ctx.db.get(gen.scriptId);
    const persona = await ctx.db.get(gen.personaId);
    const format = script ? await ctx.db.get(script.formatId) : null;

    const slidesWithUrls = await Promise.all(
      gen.slides.map(async (s) => ({
        ...s,
        imageUrl: s.imageStorageId
          ? await ctx.storage.getUrl(s.imageStorageId)
          : null,
      })),
    );

    return {
      _id: gen._id,
      status: gen.status,
      startedAt: gen.startedAt,
      completedAt: gen.completedAt,
      slides: slidesWithUrls,
      script: script
        ? {
            _id: script._id,
            code: script.code,
            name: script.name,
            slides: script.slides.map((s) => ({
              slot: s.slot,
              role: s.role,
              overlayText: s.overlayText,
            })),
          }
        : null,
      persona: persona
        ? {
            _id: persona._id,
            code: persona.code,
            name: persona.name,
            tiktokAccount: persona.tiktokAccount,
          }
        : null,
      format: format
        ? {
            _id: format._id,
            code: format.code,
            name: format.name,
          }
        : null,
    };
  },
});

export const unstickStuckSlots = internalMutation({
  args: {},
  handler: async (ctx) => {
    const STUCK_THRESHOLD_MS = 15 * 60 * 1000;
    const cutoff = Date.now() - STUCK_THRESHOLD_MS;

    const inProgress = await ctx.db
      .query("generations")
      .withIndex("by_status", (q) => q.eq("status", "in_progress"))
      .collect();

    let unstuckCount = 0;
    for (const gen of inProgress) {
      if (gen.startedAt > cutoff) continue;

      let modified = false;
      const updatedSlides = gen.slides.map((s) => {
        if (s.status === "generating" || s.status === "pending") {
          modified = true;
          const ageMin = Math.round((Date.now() - gen.startedAt) / 60_000);
          console.log(
            `[watchdog] generation ${gen._id} slot ${s.slot} unstuck (was ${s.status} since generation start ${ageMin}min ago)`,
          );
          return {
            ...s,
            status: "failed" as const,
            errorMessage:
              "Slot timed out (action killed or stuck > 15min). Click retry to try again.",
          };
        }
        return s;
      });

      if (modified) {
        const newGlobalStatus = computeGlobalStatus(updatedSlides);
        await ctx.db.patch(gen._id, {
          slides: updatedSlides,
          status: newGlobalStatus,
          completedAt:
            newGlobalStatus !== "in_progress" ? Date.now() : gen.completedAt,
        });
        unstuckCount++;
      }
    }

    if (unstuckCount > 0) {
      console.log(`[watchdog] unstuck ${unstuckCount} generation(s)`);
    }
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => await ctx.storage.generateUploadUrl(),
});

export const markSlidePostProcessed = mutation({
  args: {
    generationId: v.id("generations"),
    slot: v.number(),
    newStorageId: v.id("_storage"),
  },
  handler: async (ctx, { generationId, slot, newStorageId }) => {
    const gen = await ctx.db.get(generationId);
    if (!gen) throw new Error("Generation not found");

    const idx = gen.slides.findIndex((s) => s.slot === slot);
    if (idx === -1) throw new Error("Slot not found");

    const oldStorageId = gen.slides[idx].imageStorageId;

    const updated = [...gen.slides];
    updated[idx] = {
      ...updated[idx],
      imageStorageId: newStorageId,
      postProcessed: true,
    };
    await ctx.db.patch(generationId, { slides: updated });

    // Drop the original raw Gemini image to avoid double storage cost.
    if (oldStorageId && oldStorageId !== newStorageId) {
      try {
        await ctx.storage.delete(oldStorageId);
      } catch (e) {
        console.log(
          `[markSlidePostProcessed] failed to delete old storage ${oldStorageId}: ${(e as Error).message}`,
        );
      }
    }
  },
});
