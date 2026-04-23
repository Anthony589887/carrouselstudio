"use client";

import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { ScriptEditor } from "@/components/ScriptEditor";

export default function ScriptDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id as Id<"scripts">;
  const script = useQuery(api.scripts.get, { id });

  if (script === undefined) {
    return <p className="text-sm text-neutral-500">Chargement…</p>;
  }
  if (script === null) {
    return <p className="text-sm text-red-400">Script introuvable</p>;
  }
  return <ScriptEditor mode="edit" script={script} />;
}
