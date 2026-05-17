"use client";

import { useMemo, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useToast } from "./Toast";
import { BatchPromptFields } from "./BatchPromptFields";
import { useDictsMetadata } from "@/lib/useDictsMetadata";

type Aspect = "4:5" | "9:16";
type Tab = "dict" | "prompt";

// Scene tag dimensions (3 only — no social, no gender).
const SCENE_DIM_ORDER: ("space" | "energy" | "lighting")[] = [
  "space",
  "energy",
  "lighting",
];

export function SceneGenerationPanel({ onClose }: { onClose: () => void }) {
  const toast = useToast();
  const { dicts, tagLabel, dimensionLabel } = useDictsMetadata();
  const generateFromDict = useMutation(api.sceneBatch.generateBatchFromDict);
  const generateFromCustomPrompts = useMutation(
    api.sceneBatch.generateBatchFromCustomPrompts,
  );

  const [tab, setTab] = useState<Tab>("dict");
  const [count, setCount] = useState(3);
  const [aspectRatio, setAspectRatio] = useState<Aspect>("4:5");
  // Scene filters: single-select per dimension (vs. multi-select for image
  // bank generation). Simpler UX — the dict is small enough that picking ONE
  // value per axis is enough to narrow it.
  const [filters, setFilters] = useState<{
    lighting?: string;
    energy?: string;
    space?: string;
  }>({});
  const [firing, setFiring] = useState(false);

  const matchingScenes = useMemo(() => {
    if (!dicts) return null;
    return dicts.scenes.filter((s) => {
      if (filters.lighting && s.tags.lighting !== filters.lighting)
        return false;
      if (filters.energy && s.tags.energy !== filters.energy) return false;
      if (filters.space && s.tags.space !== filters.space) return false;
      return true;
    });
  }, [dicts, filters]);

  const noMatchDict =
    matchingScenes !== null &&
    matchingScenes.length === 0 &&
    (!!filters.lighting || !!filters.energy || !!filters.space);

  const toggleFilter = (
    dim: "lighting" | "energy" | "space",
    value: string,
  ) => {
    setFilters((prev) => ({
      ...prev,
      [dim]: prev[dim] === value ? undefined : value,
    }));
  };

  const handleStartDict = async () => {
    if (count < 1 || noMatchDict) return;
    setFiring(true);
    try {
      const result = await generateFromDict({
        count,
        aspectRatio,
        filters:
          filters.lighting || filters.energy || filters.space
            ? filters
            : undefined,
      });
      toast.push(
        "info",
        `${result.count} scène${result.count > 1 ? "s" : ""} en génération${
          result.droppedNoScene
            ? ` (${result.droppedNoScene} non assignée${result.droppedNoScene > 1 ? "s" : ""} — pas de scène compatible)`
            : ""
        }.`,
      );
      onClose();
    } catch (e) {
      toast.push("error", (e as Error).message);
      setFiring(false);
    }
  };

  const handleStartCustomBatch = async (
    prompts: string[],
    aspect: Aspect,
    imagesPerPrompt: number,
  ) => {
    setFiring(true);
    try {
      const result = await generateFromCustomPrompts({
        customPrompts: prompts,
        aspectRatio: aspect,
        imagesPerPrompt,
        // Tags optional in MVP — UI doesn't expose them yet, the row stores
        // them as undefined which is fine.
      });
      toast.push(
        "info",
        `${result.totalCreated} scène${result.totalCreated > 1 ? "s" : ""} en cours de génération. Tu peux fermer cette fenêtre.`,
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
          <h2 className="text-lg font-semibold">Générer des scènes</h2>
          <button
            onClick={onClose}
            disabled={firing}
            className="rounded p-1 text-neutral-500 hover:bg-neutral-800"
          >
            ×
          </button>
        </header>

        {/* === Tab switcher === */}
        <div className="flex border-b border-neutral-800">
          <button
            onClick={() => setTab("dict")}
            className={`flex-1 px-6 py-3 text-sm transition ${
              tab === "dict"
                ? "border-b-2 border-orange-500 text-orange-300"
                : "text-neutral-400 hover:text-neutral-200"
            }`}
          >
            Depuis le dict
          </button>
          <button
            onClick={() => setTab("prompt")}
            className={`flex-1 px-6 py-3 text-sm transition ${
              tab === "prompt"
                ? "border-b-2 border-orange-500 text-orange-300"
                : "text-neutral-400 hover:text-neutral-200"
            }`}
          >
            Prompt libre
          </button>
        </div>

        {tab === "dict" ? (
          <>
        {/* === Common params (dict only) === */}
        <div className="space-y-4 border-b border-neutral-800 px-6 py-5">
          <div>
            <label className="mb-2 block text-xs uppercase tracking-wide text-neutral-500">
              Nombre de scènes
            </label>
            <div className="flex gap-2">
              {[1, 3, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => setCount(n)}
                  className={`flex-1 rounded border px-3 py-2 text-sm transition ${
                    count === n
                      ? "border-orange-500/60 bg-orange-500/10 text-orange-300"
                      : "border-neutral-800 text-neutral-400 hover:border-neutral-700"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div>
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
                  {a === "4:5"
                    ? "4:5  ·  Instagram (1080×1350)"
                    : "9:16  ·  TikTok (1080×1920)"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* === Dict filters body === */}
          <div className="space-y-4 px-6 py-5">
            {!dicts ? (
              <p className="text-xs text-neutral-500">Chargement…</p>
            ) : (
              <>
                {SCENE_DIM_ORDER.map((dim) => (
                  <SingleSelectFilter
                    key={dim}
                    label={dimensionLabel(dim)}
                    values={dicts.sceneTagValues[dim]}
                    labelFor={(v) => tagLabel(dim, v)}
                    selected={filters[dim]}
                    onToggle={(v) => toggleFilter(dim, v)}
                  />
                ))}
                {noMatchDict ? (
                  <p className="rounded border border-red-500/40 bg-red-500/5 px-3 py-2 text-xs text-red-300">
                    Aucune scène ne correspond à ces filtres. Élargis ta sélection.
                  </p>
                ) : (
                  <p className="text-xs text-neutral-500">
                    {matchingScenes?.length ?? 0} scène
                    {(matchingScenes?.length ?? 0) > 1 ? "s" : ""} compatible
                    {(matchingScenes?.length ?? 0) > 1 ? "s" : ""}
                    {Object.values(filters).some(Boolean)
                      ? ""
                      : " (sans filtre)"}
                    .
                  </p>
                )}
              </>
            )}
          </div>

        <footer className="flex items-center justify-between border-t border-neutral-800 px-6 py-4">
          <p className="text-sm text-neutral-400">
            <span className="text-orange-400">{count}</span> scène
            {count > 1 ? "s" : ""} · {aspectRatio}
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
              onClick={handleStartDict}
              disabled={firing || noMatchDict || count < 1 || !dicts}
              className="rounded bg-orange-500 px-4 py-1.5 text-sm font-medium text-neutral-950 hover:bg-orange-400 disabled:opacity-50"
            >
              {firing ? "Lancement…" : "Lancer la génération"}
            </button>
          </div>
        </footer>
          </>
        ) : (
          <BatchPromptFields
            defaultAspect="9:16"
            unitLabel="scène"
            firing={firing}
            placeholder="Ex: a peaceful Tokyo street at night, neon lights on wet pavement, no people… (le bloc « no person » est ajouté automatiquement)"
            onGenerate={handleStartCustomBatch}
          />
        )}
      </div>
    </div>
  );
}

function SingleSelectFilter({
  label,
  values,
  labelFor,
  selected,
  onToggle,
}: {
  label: string;
  values: readonly string[];
  labelFor?: (value: string) => string;
  selected: string | undefined;
  onToggle: (value: string) => void;
}) {
  return (
    <div>
      <p className="mb-1.5 text-xs uppercase tracking-wide text-neutral-500">
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {values.map((v) => {
          const active = selected === v;
          return (
            <button
              key={v}
              onClick={() => onToggle(v)}
              title={v}
              className={`rounded border px-2 py-1 text-[11px] transition ${
                active
                  ? "border-orange-500/60 bg-orange-500/10 text-orange-300"
                  : "border-neutral-800 text-neutral-400 hover:border-neutral-700"
              }`}
            >
              {labelFor ? labelFor(v) : v}
            </button>
          );
        })}
      </div>
    </div>
  );
}
