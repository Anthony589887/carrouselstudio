"use client";

import { useMemo, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useToast } from "./Toast";
import { useDictsMetadata } from "@/lib/useDictsMetadata";

type Aspect = "4:5" | "9:16";

type DimValues = {
  lighting: string[];
  energy: string[];
  social: string[];
  space: string[];
};

// Display order of dimensions in the panel.
const DIM_ORDER: (keyof DimValues)[] = ["space", "energy", "social", "lighting"];

function dimMatches(value: string, selected: string[]): boolean {
  if (selected.length === 0) return true;
  return selected.includes(value);
}

export function ImageGenerationPanel({
  personaId,
  onClose,
}: {
  personaId: Id<"personas">;
  onClose: () => void;
}) {
  const toast = useToast();
  const generateBatch = useMutation(api.imageBatch.generateBatch);
  const { dicts, tagLabel, dimensionLabel } = useDictsMetadata();

  const [count, setCount] = useState(10);
  const [aspectRatio, setAspectRatio] = useState<Aspect>("4:5");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [filters, setFilters] = useState<DimValues>({
    lighting: [],
    energy: [],
    social: [],
    space: [],
  });
  const [firing, setFiring] = useState(false);

  const matchingCount = useMemo(() => {
    if (!dicts) return null;
    return dicts.situations.filter(
      (s) =>
        dimMatches(s.tags.lighting, filters.lighting) &&
        dimMatches(s.tags.energy, filters.energy) &&
        dimMatches(s.tags.social, filters.social) &&
        dimMatches(s.tags.space, filters.space),
    ).length;
  }, [dicts, filters]);

  const hasAnyFilter =
    filters.lighting.length +
      filters.energy.length +
      filters.social.length +
      filters.space.length >
    0;
  const noMatch = matchingCount === 0 && hasAnyFilter;

  const toggle = (dim: keyof DimValues, value: string) => {
    setFilters((prev) => {
      const arr = prev[dim];
      const next = arr.includes(value)
        ? arr.filter((v) => v !== value)
        : [...arr, value];
      return { ...prev, [dim]: next };
    });
  };

  const handleStart = async () => {
    if (count < 1 || noMatch) return;
    setFiring(true);
    try {
      const result = await generateBatch({
        personaId,
        count,
        aspectRatio,
        filters: hasAnyFilter
          ? {
              lighting: filters.lighting,
              energy: filters.energy,
              social: filters.social,
              space: filters.space,
            }
          : undefined,
      });
      toast.push(
        "info",
        `${result.count} générations lancées${
          result.droppedNoCombination
            ? ` (${result.droppedNoCombination} non assignée${result.droppedNoCombination > 1 ? "s" : ""} faute de combinaison compatible)`
            : ""
        }.`,
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

        <div className="space-y-4 border-b border-neutral-800 px-6 py-5">
          <div>
            <label className="mb-2 block text-xs uppercase tracking-wide text-neutral-500">
              Nombre d&apos;images
            </label>
            <input
              type="number"
              min={1}
              max={50}
              value={count}
              onChange={(e) =>
                setCount(Math.max(1, Math.min(50, Number(e.target.value))))
              }
              className="w-32 rounded border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm focus:border-orange-500/60 focus:outline-none"
            />
            <span className="ml-3 text-xs text-neutral-500">1 à 50</span>
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

        <div className="border-b border-neutral-800 px-6 py-4">
          <button
            onClick={() => setShowAdvanced((s) => !s)}
            className="text-sm text-neutral-300 hover:text-orange-300"
          >
            {showAdvanced ? "▾" : "▸"} Options avancées (filtres)
          </button>
          {showAdvanced && (
            <div className="mt-4 space-y-4">
              {!dicts ? (
                <p className="text-xs text-neutral-500">Chargement des filtres…</p>
              ) : (
                <>
                  {DIM_ORDER.map((dim) => (
                    <FilterGroup
                      key={dim}
                      label={dimensionLabel(dim)}
                      values={dicts.tagValues[dim]}
                      labelFor={(v) => tagLabel(dim, v)}
                      selected={filters[dim]}
                      onToggle={(v) => toggle(dim, v)}
                    />
                  ))}
                  {noMatch && (
                    <p className="rounded border border-red-500/40 bg-red-500/5 px-3 py-2 text-xs text-red-300">
                      Aucune situation ne correspond à ces filtres. Élargis ta
                      sélection.
                    </p>
                  )}
                  {hasAnyFilter && matchingCount !== null && !noMatch && (
                    <p className="text-xs text-neutral-500">
                      {matchingCount} situation{matchingCount > 1 ? "s" : ""}{" "}
                      compatible{matchingCount > 1 ? "s" : ""}.
                    </p>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        <footer className="flex items-center justify-between px-6 py-4">
          <p className="text-sm text-neutral-400">
            <span className="text-orange-400">{count}</span> image
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
              onClick={handleStart}
              disabled={firing || noMatch || count < 1 || !dicts}
              className="rounded bg-orange-500 px-4 py-1.5 text-sm font-medium text-neutral-950 hover:bg-orange-400 disabled:opacity-50"
            >
              {firing ? "Lancement…" : "Lancer la génération"}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

function FilterGroup({
  label,
  values,
  labelFor,
  selected,
  onToggle,
}: {
  label: string;
  values: readonly string[];
  labelFor?: (value: string) => string;
  selected: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div>
      <p className="mb-1.5 text-xs uppercase tracking-wide text-neutral-500">
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {values.map((v) => {
          const active = selected.includes(v);
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
