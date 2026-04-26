"use client";

import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { IMAGE_TYPES } from "@/lib/imageTypes";
import { useToast } from "./Toast";

export function ImageGenerationPanel({
  personaId,
  onClose,
}: {
  personaId: Id<"personas">;
  onClose: () => void;
}) {
  const toast = useToast();
  const generateBatch = useAction(api.imageGeneration.generateBatch);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [running, setRunning] = useState(false);

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
    setRunning(true);
    const requests = Object.entries(counts).map(([type, count]) => ({
      type,
      count,
    }));
    try {
      const result = await generateBatch({ personaId, requests });
      toast.push(
        result.failed === 0 ? "success" : "info",
        `${result.succeeded}/${result.started} images générées${result.failed ? ` (${result.failed} échecs)` : ""}`,
      );
      if (result.errors.length > 0) {
        console.warn("Generation errors:", result.errors);
      }
      onClose();
    } catch (e) {
      toast.push("error", (e as Error).message);
      setRunning(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-black/70 p-3 sm:p-6"
      onClick={() => !running && onClose()}
    >
      <div
        className="w-full max-w-2xl rounded-lg border border-neutral-800 bg-neutral-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-neutral-800 px-6 py-4">
          <h2 className="text-lg font-semibold">Générer des images</h2>
          <button
            onClick={onClose}
            disabled={running}
            className="rounded p-1 text-neutral-500 hover:bg-neutral-800"
          >
            ×
          </button>
        </header>

        <div className="max-h-[60vh] space-y-2 overflow-y-auto px-6 py-5">
          {IMAGE_TYPES.map((type) => {
            const count = counts[type] ?? 0;
            return (
              <div
                key={type}
                className="flex items-center justify-between rounded border border-neutral-800 bg-neutral-950 px-3 py-2"
              >
                <span className="font-mono text-xs text-neutral-300">
                  {type}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCount(type, count - 1)}
                    className="h-7 w-7 rounded border border-neutral-700 text-sm hover:bg-neutral-800"
                  >
                    −
                  </button>
                  <span className="w-8 text-center font-mono text-sm">
                    {count}
                  </span>
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
            <span className="text-orange-400">{totalRequested}</span> images à
            générer
          </p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={running}
              className="rounded border border-neutral-700 px-4 py-1.5 text-sm hover:bg-neutral-800"
            >
              Annuler
            </button>
            <button
              onClick={handleStart}
              disabled={running || totalRequested === 0}
              className="rounded bg-orange-500 px-4 py-1.5 text-sm font-medium text-neutral-950 hover:bg-orange-400 disabled:opacity-50"
            >
              {running ? "Génération…" : "Lancer"}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
