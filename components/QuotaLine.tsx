"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

/**
 * Compact rolling-window quota indicator shown near the generation panels.
 * "illimité" for admins; nothing while loading / no user row yet.
 */
export function QuotaLine() {
  const usage = useQuery(api.quota.myUsage);
  if (usage === undefined || usage === null) return null;

  if (usage.unlimited) {
    return (
      <p className="px-6 py-2 text-xs text-neutral-500">
        Quota : <span className="text-orange-300">illimité</span> (admin)
      </p>
    );
  }

  const low = usage.remaining <= 0;
  return (
    <p className="px-6 py-2 text-xs text-neutral-500">
      Quota : <span className="text-neutral-300">{usage.used}</span>/
      {usage.quota} sur 30 jours — il te reste{" "}
      <span className={low ? "text-red-300" : "text-orange-300"}>
        {usage.remaining}
      </span>{" "}
      génération{usage.remaining > 1 ? "s" : ""}
    </p>
  );
}
