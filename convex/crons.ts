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

export default crons;
