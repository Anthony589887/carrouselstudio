"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useConvex, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { SceneGenerationPanel } from "@/components/SceneGenerationPanel";
import { Kebab, KebabItem } from "@/components/Kebab";
import { useToast } from "@/components/Toast";
import { useDictsMetadata } from "@/lib/useDictsMetadata";

type SceneFilter = "lighting" | "energy" | "space";

export default function ScenesPage() {
  const toast = useToast();
  const convexClient = useConvex();
  const { dicts, tagLabel, dimensionLabel, sceneLabel } = useDictsMetadata();

  const [filters, setFilters] = useState<{
    lighting?: string;
    energy?: string;
    space?: string;
  }>({});
  const [showFilters, setShowFilters] = useState(false);
  const [showGenPanel, setShowGenPanel] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selected, setSelected] = useState<Set<Id<"scenes">>>(new Set());

  const scenes = useQuery(api.scenes.list, {
    filters:
      filters.lighting || filters.energy || filters.space ? filters : undefined,
  });

  const removeScene = useMutation(api.scenes.remove);
  const bulkDeleteScenes = useMutation(api.scenes.bulkDelete);
  const retryScene = useMutation(api.sceneBatch.retryScene);

  const setFilter = (dim: SceneFilter, value: string | undefined) => {
    setFilters((prev) => ({
      ...prev,
      [dim]: prev[dim] === value ? undefined : value,
    }));
  };

  const activeFilterCount =
    (filters.lighting ? 1 : 0) +
    (filters.energy ? 1 : 0) +
    (filters.space ? 1 : 0);

  const clearFilters = () => setFilters({});

  const generatingCount = (scenes ?? []).filter(
    (s) => s.status === "generating",
  ).length;
  const failedCount = (scenes ?? []).filter((s) => s.status === "failed").length;

  const toggleSelectScene = (id: Id<"scenes">) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const exitSelection = () => {
    setSelectionMode(false);
    setSelected(new Set());
  };

  const handleDeleteScene = async (id: Id<"scenes">) => {
    let usagesMsg = "";
    try {
      const usages = await convexClient.query(api.scenes.getCarouselUsages, {
        id,
      });
      if (usages && usages.length > 0) {
        const labels = usages
          .slice(0, 3)
          .map((u: { label: string }) => `• ${u.label}`)
          .join("\n");
        const more =
          usages.length > 3 ? `\n+ ${usages.length - 3} autre(s)` : "";
        usagesMsg = `\n\n⚠️ Cette scène est utilisée dans ${usages.length} carrousel(s) :\n${labels}${more}\n\nElle sera retirée de ces carrousels.`;
      }
    } catch {
      // best-effort
    }
    if (
      !confirm(`Supprimer cette scène ? Cette action est définitive.${usagesMsg}`)
    )
      return;
    try {
      const res = (await removeScene({ id })) as {
        deleted: boolean;
        carouselsCleaned?: number;
      };
      const extra =
        res?.carouselsCleaned && res.carouselsCleaned > 0
          ? ` ${res.carouselsCleaned} carrousel(s) mis à jour.`
          : "";
      toast.push("success", `Scène supprimée.${extra}`);
    } catch (e) {
      toast.push("error", (e as Error).message);
    }
  };

  const handleBulkDelete = async () => {
    if (selected.size === 0) return;
    const ids = [...selected];
    let usagesMsg = "";
    try {
      const usages = (await convexClient.query(
        api.scenes.getBulkCarouselUsages,
        { ids },
      )) as { scenesUsedCount: number; totalUsages: number };
      if (usages.scenesUsedCount > 0) {
        usagesMsg = `\n\n⚠️ ${usages.scenesUsedCount} scène(s) sont utilisée(s) dans des carrousels. Si tu les supprimes, elles seront retirées des carrousels.`;
      }
    } catch {
      // best-effort
    }
    if (
      !confirm(
        `Supprimer ${ids.length} scène(s) ? Cette action est définitive.${usagesMsg}`,
      )
    )
      return;
    try {
      const res = (await bulkDeleteScenes({ ids })) as {
        deletedCount: number;
        storageDeletedCount: number;
        carouselsCleaned: number;
      };
      const extra =
        res.carouselsCleaned > 0
          ? ` ${res.carouselsCleaned} carrousel(s) mis à jour.`
          : "";
      toast.push(
        "success",
        `${res.deletedCount} scène(s) supprimée(s).${extra}`,
      );
      exitSelection();
    } catch (e) {
      toast.push("error", (e as Error).message);
    }
  };

  const handleRetry = async (id: Id<"scenes">) => {
    try {
      await retryScene({ id });
      toast.push("info", "Génération relancée");
    } catch (e) {
      toast.push("error", (e as Error).message);
    }
  };

  return (
    <div className="space-y-6">
      {/* === Nav === */}
      <nav className="flex gap-3 text-sm">
        <Link
          href="/"
          className="text-neutral-400 hover:text-orange-300"
        >
          Personas
        </Link>
        <span className="text-neutral-700">·</span>
        <span className="text-orange-300">Scenes</span>
      </nav>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Banque scenes</h1>
          <p className="mt-1 text-sm text-neutral-400">
            Images sans persona, à mixer dans tes carrousels.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectionMode ? (
            <>
              <span className="text-xs text-neutral-400">
                {selected.size} sélectionnée{selected.size > 1 ? "s" : ""}
              </span>
              <button
                onClick={exitSelection}
                className="rounded border border-neutral-700 px-3 py-1.5 text-xs hover:bg-neutral-800"
              >
                Quitter
              </button>
            </>
          ) : (
            <button
              onClick={() => setSelectionMode(true)}
              className="rounded border border-neutral-700 px-3 py-1.5 text-xs hover:border-orange-500/60 hover:text-orange-300"
            >
              Sélection multiple
            </button>
          )}
          <button
            onClick={() => setShowGenPanel(true)}
            className="rounded bg-orange-500 px-3 py-1.5 text-sm font-medium text-neutral-950 hover:bg-orange-400"
          >
            + Générer
          </button>
        </div>
      </div>

      {/* === Filters === */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => setShowFilters((s) => !s)}
          className="text-xs text-neutral-300 hover:text-orange-300"
        >
          {showFilters ? "▾" : "▸"} Filtres
          {activeFilterCount > 0 && (
            <span className="ml-1 rounded-full bg-orange-500/20 px-1.5 text-[10px] text-orange-300">
              {activeFilterCount}
            </span>
          )}
        </button>
        {activeFilterCount > 0 && (
          <button
            onClick={clearFilters}
            className="text-xs text-neutral-500 hover:text-red-300"
          >
            clear
          </button>
        )}
      </div>

      {showFilters && (
        <div className="space-y-3 rounded border border-neutral-800 bg-neutral-950 p-4">
          {!dicts ? (
            <p className="text-xs text-neutral-500">Chargement des filtres…</p>
          ) : (
            (["space", "energy", "lighting"] as const).map((dim) => (
              <FilterRow
                key={dim}
                label={dimensionLabel(dim)}
                values={dicts.sceneTagValues[dim]}
                labelFor={(v) => tagLabel(dim, v)}
                selected={filters[dim]}
                onSelect={(v) => setFilter(dim, v)}
              />
            ))
          )}
        </div>
      )}

      {(generatingCount > 0 || failedCount > 0) && (
        <div className="flex flex-wrap gap-2 text-xs">
          {generatingCount > 0 && (
            <span className="inline-flex items-center gap-2 rounded bg-orange-500/10 px-3 py-1.5 text-orange-300">
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-orange-400" />
              {generatingCount} en cours de génération
            </span>
          )}
          {failedCount > 0 && (
            <span className="inline-flex items-center gap-2 rounded bg-red-500/10 px-3 py-1.5 text-red-300">
              {failedCount} échec{failedCount > 1 ? "s" : ""} — clique sur la
              scène pour réessayer
            </span>
          )}
        </div>
      )}

      {/* === Bank grid === */}
      {scenes === undefined ? (
        <p className="text-sm text-neutral-500">Chargement…</p>
      ) : scenes.length === 0 ? (
        <div className="rounded border border-dashed border-neutral-800 p-12 text-center text-sm text-neutral-500">
          {activeFilterCount > 0
            ? "Aucune scène ne correspond à ces filtres."
            : "Aucune scène. Génère ta première batch."}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {scenes.map((scene) => {
            const isGenerating = scene.status === "generating";
            const isFailed = scene.status === "failed";
            const isAvailable = scene.status === "available";
            const aspectClass =
              scene.aspectRatio === "9:16" ? "aspect-[9/16]" : "aspect-[4/5]";
            const label =
              scene.generationMode === "from-dict" && scene.sceneId
                ? sceneLabel(scene.sceneId)
                : scene.customPrompt
                  ? scene.customPrompt.slice(0, 60)
                  : "—";
            const isChecked = selected.has(scene._id);
            return (
              <div
                key={scene._id}
                className={`group relative overflow-hidden rounded border bg-neutral-900 ${
                  isChecked
                    ? "border-orange-500"
                    : isFailed
                      ? "border-red-500/40"
                      : isGenerating
                        ? "border-orange-500/30"
                        : "border-neutral-800"
                }`}
              >
                <div
                  className={`relative w-full bg-neutral-800 ${aspectClass} ${
                    selectionMode && isAvailable ? "cursor-pointer" : ""
                  }`}
                  onClick={() => {
                    if (selectionMode && isAvailable) toggleSelectScene(scene._id);
                  }}
                >
                  {isGenerating && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-neutral-900">
                      <div className="h-8 w-8 animate-spin rounded-full border-2 border-orange-500/30 border-t-orange-400" />
                      <span className="text-[10px] text-orange-300">
                        génération…
                      </span>
                    </div>
                  )}
                  {isFailed && (
                    <div
                      className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-red-950/40 text-center"
                      title={scene.errorMessage ?? "Échec"}
                    >
                      <span className="text-[10px] text-red-300">échec</span>
                      <button
                        onClick={() => handleRetry(scene._id)}
                        className="rounded border border-red-500/40 bg-red-950/60 px-2 py-1 text-[10px] text-red-200 hover:border-red-400 hover:bg-red-900/60"
                      >
                        ⟳ réessayer
                      </button>
                    </div>
                  )}
                  {isAvailable && scene.imageUrl && (
                    <Image
                      src={scene.imageUrl}
                      alt={label}
                      fill
                      sizes="(max-width: 640px) 50vw, 20vw"
                      className="object-cover"
                    />
                  )}
                  {selectionMode && isAvailable && (
                    <div
                      className={`absolute left-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded border-2 text-[12px] ${
                        isChecked
                          ? "border-orange-500 bg-orange-500 text-neutral-950"
                          : "border-white/70 bg-black/50 text-transparent"
                      }`}
                    >
                      {isChecked ? "✓" : ""}
                    </div>
                  )}
                  {scene.generationMode === "from-prompt" && isAvailable && (
                    <span className="absolute right-1.5 top-1.5 rounded bg-purple-500/30 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-purple-200">
                      libre
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between gap-1 p-1.5 text-[11px]">
                  <span
                    className="truncate text-neutral-300"
                    title={label}
                  >
                    {label}
                  </span>
                  <span
                    className={`shrink-0 rounded px-1 py-0.5 text-[10px] ${
                      isAvailable
                        ? "bg-green-500/15 text-green-300"
                        : isGenerating
                          ? "bg-orange-500/15 text-orange-300"
                          : "bg-red-500/15 text-red-300"
                    }`}
                  >
                    {scene.status}
                  </span>
                </div>
                {!isGenerating && !selectionMode && (
                  <div className="absolute right-1 top-1 hidden group-hover:block">
                    <Kebab align="end">
                      {(close) => (
                        <>
                          {isFailed && (
                            <KebabItem
                              onClick={() => {
                                handleRetry(scene._id);
                                close();
                              }}
                            >
                              ⟳ Réessayer
                            </KebabItem>
                          )}
                          <KebabItem
                            danger
                            onClick={() => {
                              handleDeleteScene(scene._id);
                              close();
                            }}
                          >
                            Supprimer
                          </KebabItem>
                        </>
                      )}
                    </Kebab>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* === Sticky bulk-action bar === */}
      {selectionMode && selected.size > 0 && (
        <div className="fixed bottom-4 left-1/2 z-30 -translate-x-1/2 rounded-full border border-neutral-700 bg-neutral-900 px-4 py-2 shadow-2xl">
          <div className="flex items-center gap-3 text-xs">
            <span className="text-neutral-300">
              {selected.size} sélectionnée{selected.size > 1 ? "s" : ""}
            </span>
            <button
              onClick={handleBulkDelete}
              className="rounded border border-red-500/40 px-2 py-1 text-red-300 hover:border-red-400 hover:bg-red-500/10"
              title="Supprimer la sélection"
            >
              🗑️ Supprimer
            </button>
            <button
              onClick={exitSelection}
              className="text-neutral-500 hover:text-neutral-200"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {showGenPanel && (
        <SceneGenerationPanel onClose={() => setShowGenPanel(false)} />
      )}
    </div>
  );
}

function FilterRow({
  label,
  values,
  labelFor,
  selected,
  onSelect,
}: {
  label: string;
  values: readonly string[];
  labelFor?: (value: string) => string;
  selected: string | undefined;
  onSelect: (v: string) => void;
}) {
  return (
    <div>
      <p className="mb-1.5 text-[10px] uppercase tracking-wide text-neutral-500">
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {values.map((v) => {
          const active = selected === v;
          return (
            <button
              key={v}
              onClick={() => onSelect(v)}
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
