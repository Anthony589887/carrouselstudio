"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { ScriptEditor } from "@/components/ScriptEditor";

export default function NewScriptPage() {
  const formats = useQuery(api.formats.list);
  const [chosenId, setChosenId] = useState<Id<"formats"> | null>(null);

  if (formats === undefined) {
    return <p className="text-sm text-neutral-500">Chargement…</p>;
  }

  if (chosenId) {
    const fmt = formats.find((f) => f._id === chosenId);
    if (!fmt) return <p className="text-sm text-red-400">Format introuvable</p>;
    const initialSlides = fmt.slideTemplates
      .slice()
      .sort((a, b) => a.slot - b.slot)
      .map((t) => ({
        slot: t.slot,
        role: t.role,
        visualPrompt: t.promptTemplate,
        overlayText: "",
      }));
    return (
      <ScriptEditor
        mode="create"
        initialFormatId={chosenId}
        initialSlides={initialSlides}
      />
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/scripts"
        className="mb-6 inline-block text-sm text-neutral-500 hover:text-orange-400"
      >
        ← Scripts
      </Link>

      <h1 className="mb-2 text-2xl font-semibold">Nouveau script</h1>
      <p className="mb-8 text-sm text-neutral-500">
        Choisis un format pour commencer. Les 6 slides seront pré-remplies
        depuis ses templates.
      </p>

      {formats.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-800 p-8 text-center">
          <p className="mb-4 text-sm text-neutral-500">
            Aucun format disponible. Crée d&apos;abord un format.
          </p>
          <Link
            href="/formats/new"
            className="rounded bg-orange-500 px-4 py-2 text-sm font-medium text-neutral-950 hover:bg-orange-400"
          >
            + Nouveau format
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {formats
            .filter((f) => f.isActive)
            .map((f) => (
              <button
                key={f._id}
                type="button"
                onClick={() => setChosenId(f._id)}
                className="flex items-start gap-4 rounded-lg border border-neutral-800 bg-neutral-900 p-5 text-left transition hover:-translate-y-0.5 hover:border-orange-500/60"
              >
                <div className="flex-1">
                  <div className="text-base">
                    <span className="font-mono font-semibold text-orange-400">
                      {f.code}
                    </span>
                    <span className="text-neutral-500"> · </span>
                    <span className="text-neutral-100">{f.name}</span>
                  </div>
                  <p className="mt-1 text-xs text-neutral-500">
                    {f.slideTemplates.length} templates · {f.defaultDA}
                  </p>
                </div>
                <span className="text-neutral-500">→</span>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
