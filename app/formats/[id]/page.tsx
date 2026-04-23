"use client";

import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { FormatEditor } from "@/components/FormatEditor";

export default function FormatDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id as Id<"formats">;
  const format = useQuery(api.formats.get, { id });

  if (format === undefined) {
    return <p className="text-sm text-neutral-500">Chargement…</p>;
  }
  if (format === null) {
    return <p className="text-sm text-red-400">Format introuvable</p>;
  }
  return <FormatEditor initial={format} />;
}
