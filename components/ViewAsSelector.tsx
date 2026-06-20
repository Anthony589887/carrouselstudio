"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useMe } from "@/lib/useMe";
import { useViewAs } from "./ViewAsContext";

/**
 * Admin-only dropdown to restrict the dashboard/scenes views to a single
 * creator. Renders nothing for creators. The selection is held in ViewAsContext
 * and consumed by personas.list / scenes.list via their `ownerId` arg.
 */
export function ViewAsSelector() {
  const me = useMe();
  const { ownerId, setOwnerId } = useViewAs();
  const creators = useQuery(
    api.users.listCreators,
    me?.role === "admin" ? {} : "skip",
  );

  if (me?.role !== "admin") return null;

  return (
    <label className="flex w-full min-w-0 items-center gap-2 text-xs text-neutral-400 sm:w-auto">
      <span className="hidden sm:inline">Voir en tant que</span>
      <select
        value={ownerId ?? ""}
        onChange={(e) =>
          setOwnerId(e.target.value ? (e.target.value as Id<"users">) : null)
        }
        className="w-full min-w-0 max-w-full rounded border border-neutral-800 bg-neutral-950 px-2 py-1.5 text-xs text-neutral-200 focus:border-orange-500/60 focus:outline-none sm:w-auto"
      >
        <option value="">Tous les créateurs</option>
        {(creators ?? []).map((c) => (
          <option key={c._id} value={c._id}>
            {c.name ? `${c.name} (${c.email})` : c.email}
          </option>
        ))}
      </select>
    </label>
  );
}
