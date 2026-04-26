"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { IMAGE_TYPES } from "@/lib/imageTypes";
import { useToast } from "./Toast";

type Aspect = "4:5" | "9:16";

export function ImageGenerationPanel({
  personaId,
  onClose,
}: {
  personaId: Id<"personas">;
  onClose: () => void;
}) {
  const toast = useToast();
  const startBatch = useMutation(api.imageBatch.startBatch);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [aspectRatio, setAspectRatio] = useState<Aspect>("4:5");
  const [firing, setFiring] = useState(false);

  const setCount = (type: string, count: number) => {
    setCounts((prev) => {
      const next = { ...prev };
      if (count <= 0) delete next[type];
      else next[type] = count;
      return next;
    });
  };

  const totalRequested = Object.values(counts).reduce((a, b) => a + b, 0);

  const handleStart = async () => {
    if (totalRequested === 0) return;
    setFiring(true);
    const requests = Object.entries(counts).map(([type, count]) => ({
      type,
      count,
    }));
    try {
      const result = await startBatch({ personaId, aspectRatio, requests });
      toast.push(
        "info",
        `${result.count} générations lancées en parallèle — elles apparaîtront au fil de l'eau.`,
      );
      onClose();
    } catch (e) {
      toast.push("error", (e as Error).message);
      setFiring(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-black/70 p-3 sm:p-6"
      onClick={() => !firing && onClose()}
    >
      <div
        className="w-full max-w-2xl rounded-lg border border-neutral-800 bg-neutral-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-neutral-800 px-6 py-4">
          <h2 className="text-lg font-semibold">Générer des images</h2>
          <button
            onClick={onClose}
            disabled={firing}
            className="rounded p-1 text-neutral-500 hover:bg-neutral-800"
          >
            ×
          </button>
        </header>

        {/* Aspect ratio */}
        <div className="border-b border-neutral-800 px-6 py-4">
          <label className="mb-2 block text-xs uppercase tracking-wide text-neutral-500">
            Format
          </label>
          <div className="flex gap-2">
            {(["4:5", "9:16"] as const).map((a) => (
              <button
                key={a}
                onClick={() => setAspectRatio(a)}
                className={`flex-1 rounded border px-3 py-2 text-sm transition ${
                  aspectRatio === a
                    ? "border-orange-500/60 bg-orange-500/10 text-orange-300"
                    : "border-neutral-800 text-neutral-400 hover:border-neutral-700"
                }`}
              >
                {a === "4:5" ? "4:5  ·  Instagram (1080×1350)" : "9:16  ·  TikTok (1080×1920)"}
              </button>
            ))}
          </div>
        </div>

        <div className="max-h-[50vh] space-y-2 overflow-y-auto px-6 py-5">
          {IMAGE_TYPES.map((type) => {
            const count = counts[type] ?? 0;
            return (
              <div
                key={type}
                className="flex items-center justify-between rounded border border-neutral-800 bg-neutral-950 px-3 py-2"
              >
                <span className="font-mono text-xs text-neutral-300">{type}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCount(type, count - 1)}
                    className="h-7 w-7 rounded border border-neutral-700 text-sm hover:bg-neutral-800"
                  >
                    −
                  </button>
                  <span className="w-8 text-center font-mono text-sm">{count}</span>
                  <button
                    onClick={() => setCount(type, count + 1)}
                    className="h-7 w-7 rounded border border-neutral-700 text-sm hover:bg-neutral-800"
                  >
                    +
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <footer className="flex items-center justify-between border-t border-neutral-800 px-6 py-4">
          <p className="text-sm text-neutral-400">
            <span className="text-orange-400">{totalRequested}</span> image
            {totalRequested > 1 ? "s" : ""} · {aspectRatio}
          </p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={firing}
              className="rounded border border-neutral-700 px-4 py-1.5 text-sm hover:bg-neutral-800"
            >
              Annuler
            </button>
            <button
              onClick={handleStart}
              disabled={firing || totalRequested === 0}
              className="rounded bg-orange-500 px-4 py-1.5 text-sm font-medium text-neutral-950 hover:bg-orange-400 disabled:opacity-50"
            >
              {firing ? "Lancement…" : "Lancer"}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
