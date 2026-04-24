import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "unstick generations",
  { minutes: 5 },
  internal.generations.unstickStuckSlots,
);

export default crons;
