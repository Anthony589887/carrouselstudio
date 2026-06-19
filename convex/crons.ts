import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Sweep stale `generating` rows every 10 minutes. Anything older than 5 min
// is presumed dead (Gemini call stuck, post-process callback crashed, etc.)
// and flipped to `failed` so the user sees a retryable tile in the bank.
crons.interval(
  "cleanup stuck generating images",
  { minutes: 10 },
  internal.images.cleanupStuckGenerating,
);

// Same sweep for scenes — scenes share the Gemini pipeline and can hang the
// same way. Run on the same 10-minute cadence with a 5-minute threshold
// (defined in convex/scenes.ts).
crons.interval(
  "cleanup stuck generating scenes",
  { minutes: 10 },
  internal.scenes.cleanupStuckGenerating,
);

// Daily hygiene: drop quotaUsage rows older than 35 days. Doesn't affect the
// 30-day rolling calculation (which only reads the last 30 days).
crons.daily(
  "purge old quota usage",
  { hourUTC: 4, minuteUTC: 0 },
  internal.quota.purgeOldQuotaUsage,
);

export default crons;
