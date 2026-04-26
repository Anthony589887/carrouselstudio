"use client";

import Image from "next/image";
import Link from "next/link";
import { use, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { ImageGenerationPanel } from "@/components/ImageGenerationPanel";
import { PostCarouselModal } from "@/components/PostCarouselModal";
import { useToast } from "@/components/Toast";
import {
  LIGHTING_VALUES,
  ENERGY_VALUES,
  SOCIAL_VALUES,
  SPACE_VALUES,
  type DimValues,
} from "@/lib/imageDicts";

export default function PersonaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const personaId = id as Id<"personas">;
  const toast = useToast();

  const persona = useQuery(api.personas.get, { id: personaId });
  const [includeUsed, setIncludeUsed] = useState(false);
  const [filters, setFilters] = useState<DimValues>({
    lighting: [],
    energy: [],
    social: [],
    space: [],
  });
  const [legacyFilter, setLegacyFilter] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const images = useQuery(api.images.list, {
    personaId,
    includeUsed,
    lighting: filters.lighting.length > 0 ? filters.lighting : undefined,
    energy: filters.energy.length > 0 ? filters.energy : undefined,
    social: filters.social.length > 0 ? filters.social : undefined,
    space: filters.space.length > 0 ? filters.space : undefined,
    legacyTypes: legacyFilter.length > 0 ? legacyFilter : undefined,
  });
  const carousels = useQuery(api.carousels.listByPersona, { personaId });
  const legacyTypeOptions = useQuery(api.images.distinctLegacyTypes, {
    personaId,
  });

  const updatePersona = useMutation(api.personas.update);
  const removeImage = useMutation(api.images.remove);
  const retryImage = useMutation(api.imageBatch.retryImage);

  const [editingDescription, setEditingDescription] = useState(false);
  const [descriptionDraft, setDescriptionDraft] = useState("");
  const [showGenPanel, setShowGenPanel] = useState(false);
  const [postingId, setPostingId] = useState<Id<"carousels"> | null>(null);

  if (persona === undefined)
    return <p className="text-neutral-500">Chargement…</p>;
  if (persona === null)
    return <p className="text-red-400">Persona introuvable.</p>;

  const startEditDescription = () => {
    setDescriptionDraft(persona.identityDescription);
    setEditingDescription(true);
  };

  const saveDescription = async () => {
    await updatePersona({
      id: personaId,
      identityDescription: descriptionDraft,
    });
    toast.push("success", "Description mise à jour");
    setEditingDescription(false);
  };

  const handleDeleteImage = async (imageId: Id<"images">) => {
    if (!confirm("Supprimer cette image ?")) return;
    await removeImage({ id: imageId });
    toast.push("success", "Image supprimée");
  };

  const handleRetry = async (imageId: Id<"images">) => {
    try {
      await retryImage({ id: imageId });
      toast.push("info", "Génération relancée");
    } catch (e) {
      toast.push("error", (e as Error).message);
    }
  };

  const generatingCount = (images ?? []).filter(
    (i) => i.status === "generating",
  ).length;
  const failedCount = (images ?? []).filter((i) => i.status === "failed").length;

  const toggleFilter = (dim: keyof DimValues, value: string) => {
    setFilters((prev) => {
      const arr = prev[dim];
      const next = arr.includes(value)
        ? arr.filter((v) => v !== value)
        : [...arr, value];
      return { ...prev, [dim]: next };
    });
  };

  const toggleLegacy = (t: string) => {
    setLegacyFilter((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t],
    );
  };

  const activeFilterCount =
    filters.lighting.length +
    filters.energy.length +
    filters.social.length +
    filters.space.length +
    legacyFilter.length;

  const clearFilters = () => {
    setFilters({ lighting: [], energy: [], social: [], space: [] });
    setLegacyFilter([]);
  };

  return (
    <div className="space-y-8">
      <Link
        href="/"
        className="text-xs text-neutral-500 hover:text-neutral-300"
      >
        ← Retour
      </Link>

      {/* Header */}
      <header className="flex flex-col gap-6 sm:flex-row">
        <div className="relative h-40 w-32 shrink-0 overflow-hidden rounded border border-neutral-800 bg-neutral-800">
          {persona.referenceUrl && (
            <Image
              src={persona.referenceUrl}
              alt={persona.name}
              fill
              sizes="128px"
              className="object-cover"
            />
          )}
        </div>
        <div className="flex-1 space-y-3">
          <h1 className="text-2xl font-semibold">{persona.name}</h1>
          <div className="flex flex-wrap gap-3 text-xs text-neutral-400">
            {persona.tiktokAccount && (
              <span>TikTok: {persona.tiktokAccount}</span>
            )}
            {persona.instagramAccount && (
              <span>Instagram: {persona.instagramAccount}</span>
            )}
          </div>
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wide text-neutral-500">
              Description d&apos;identité
            </label>
            {editingDescription ? (
              <div className="space-y-2">
                <textarea
                  value={descriptionDraft}
                  onChange={(e) => setDescriptionDraft(e.target.value)}
                  rows={5}
                  className="w-full rounded border border-neutral-800 bg-neutral-950 px-3 py-2 font-mono text-xs focus:border-orange-500/60 focus:outline-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={saveDescription}
                    className="rounded bg-orange-500 px-3 py-1 text-xs font-medium text-neutral-950"
                  >
                    Sauver
                  </button>
                  <button
                    onClick={() => setEditingDescription(false)}
                    className="rounded border border-neutral-700 px-3 py-1 text-xs"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            ) : (
              <div
                className="cursor-pointer rounded border border-neutral-800 bg-neutral-950 px-3 py-2 font-mono text-xs text-neutral-300 hover:border-orange-500/40"
                onClick={startEditDescription}
              >
                {persona.identityDescription}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Image bank */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Banque d&apos;images</h2>
          <button
            onClick={() => setShowGenPanel(true)}
            className="rounded bg-orange-500 px-3 py-1.5 text-sm font-medium text-neutral-950 hover:bg-orange-400"
          >
            + Générer
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-neutral-400">
            <input
              type="checkbox"
              checked={includeUsed}
              onChange={(e) => setIncludeUsed(e.target.checked)}
            />
            Inclure les images utilisées
          </label>
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
            <FilterRow
              label="Espace"
              values={SPACE_VALUES}
              selected={filters.space}
              onToggle={(v) => toggleFilter("space", v)}
            />
            <FilterRow
              label="Énergie"
              values={ENERGY_VALUES}
              selected={filters.energy}
              onToggle={(v) => toggleFilter("energy", v)}
            />
            <FilterRow
              label="Social"
              values={SOCIAL_VALUES}
              selected={filters.social}
              onToggle={(v) => toggleFilter("social", v)}
            />
            <FilterRow
              label="Éclairage"
              values={LIGHTING_VALUES}
              selected={filters.lighting}
              onToggle={(v) => toggleFilter("lighting", v)}
            />
            {legacyTypeOptions && legacyTypeOptions.length > 0 && (
              <FilterRow
                label="Type (ancien)"
                values={legacyTypeOptions}
                selected={legacyFilter}
                onToggle={toggleLegacy}
              />
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
                {failedCount} échec{failedCount > 1 ? "s" : ""} — clique sur
                l&apos;image pour réessayer
              </span>
            )}
          </div>
        )}

        {images === undefined ? (
          <p className="text-sm text-neutral-500">Chargement…</p>
        ) : images.length === 0 ? (
          <div className="rounded border border-dashed border-neutral-800 p-12 text-center text-sm text-neutral-500">
            Aucune image. Génère ta première batch.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {images.map((img) => {
              const isGenerating = img.status === "generating";
              const isFailed = img.status === "failed";
              const isAvailable = img.status === "available";
              const isUsed = img.status === "used";
              const aspectClass =
                img.aspectRatio === "9:16" ? "aspect-[9/16]" : "aspect-[4/5]";
              const label =
                img.situationId ?? img.legacyType ?? "—";
              const tooltip = [
                img.situationId && `situation: ${img.situationId}`,
                img.technicalRegisterId &&
                  `register: ${img.technicalRegisterId}`,
                img.framingId && `framing: ${img.framingId}`,
                img.emotionalStateId && `emotion: ${img.emotionalStateId}`,
                img.legacyType && `legacy: ${img.legacyType}`,
              ]
                .filter(Boolean)
                .join("\n");
              return (
                <div
                  key={img._id}
                  className={`group relative overflow-hidden rounded border bg-neutral-900 ${
                    isFailed
                      ? "border-red-500/40"
                      : isGenerating
                        ? "border-orange-500/30"
                        : "border-neutral-800"
                  }`}
                >
                  <div
                    className={`relative w-full bg-neutral-800 ${aspectClass}`}
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
                      <button
                        onClick={() => handleRetry(img._id)}
                        title={img.errorMessage ?? "Échec"}
                        className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-red-950/40 text-center transition hover:bg-red-950/60"
                      >
                        <span className="text-2xl text-red-400">⟳</span>
                        <span className="text-[10px] text-red-300">
                          échec — relancer
                        </span>
                      </button>
                    )}
                    {(isAvailable || isUsed) && img.imageUrl && (
                      <Image
                        src={img.imageUrl}
                        alt={label}
                        fill
                        sizes="(max-width: 640px) 50vw, 20vw"
                        className="object-cover"
                      />
                    )}
                  </div>
                  <div
                    className="flex items-center justify-between gap-1 p-1.5 text-[10px]"
                    title={tooltip}
                  >
                    <span className="truncate font-mono text-neutral-400">
                      {label}
                    </span>
                    <span
                      className={`shrink-0 rounded px-1 py-0.5 ${
                        isAvailable
                          ? "bg-green-500/15 text-green-300"
                          : isUsed
                            ? "bg-orange-500/15 text-orange-300"
                            : isGenerating
                              ? "bg-orange-500/15 text-orange-300"
                              : "bg-red-500/15 text-red-300"
                      }`}
                    >
                      {img.status}
                    </span>
                  </div>
                  {img.technicalRegisterId && (
                    <div className="px-1.5 pb-1.5 text-[9px] text-neutral-500 truncate font-mono">
                      {img.technicalRegisterId}
                    </div>
                  )}
                  {!isGenerating && (
                    <button
                      onClick={() => handleDeleteImage(img._id)}
                      className="absolute right-1 top-1 hidden rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-red-300 hover:bg-red-500/30 group-hover:block"
                    >
                      ×
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Carousels */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Carrousels</h2>
          <Link
            href={`/persona/${personaId}/new-carousel`}
            className="rounded bg-orange-500 px-3 py-1.5 text-sm font-medium text-neutral-950 hover:bg-orange-400"
          >
            + Créer un carrousel
          </Link>
        </div>

        {carousels === undefined ? (
          <p className="text-sm text-neutral-500">Chargement…</p>
        ) : carousels.length === 0 ? (
          <div className="rounded border border-dashed border-neutral-800 p-8 text-center text-sm text-neutral-500">
            Aucun carrousel.
          </div>
        ) : (
          <div className="space-y-3">
            {carousels.map((c) => (
              <div
                key={c._id}
                className="rounded-lg border border-neutral-800 bg-neutral-900 p-3"
              >
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs">
                    <span
                      className={`rounded px-2 py-0.5 ${
                        c.status === "posted"
                          ? "bg-green-500/15 text-green-300"
                          : "bg-neutral-700 text-neutral-300"
                      }`}
                    >
                      {c.status}
                    </span>
                    <span className="text-neutral-500">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </span>
                    {c.tiktokLink && (
                      <a
                        href={c.tiktokLink}
                        target="_blank"
                        rel="noreferrer"
                        className="text-orange-400 hover:underline"
                      >
                        TikTok ↗
                      </a>
                    )}
                    {c.instagramLink && (
                      <a
                        href={c.instagramLink}
                        target="_blank"
                        rel="noreferrer"
                        className="text-orange-400 hover:underline"
                      >
                        Instagram ↗
                      </a>
                    )}
                  </div>
                  {c.status === "draft" && (
                    <button
                      onClick={() => setPostingId(c._id)}
                      className="rounded border border-neutral-700 px-2 py-1 text-xs hover:border-orange-500/60"
                    >
                      Marquer posté
                    </button>
                  )}
                </div>
                <div className="flex gap-2 overflow-x-auto">
                  {c.images.map((img) => (
                    <div
                      key={img.imageId}
                      className="relative aspect-[4/5] w-20 shrink-0 overflow-hidden rounded border border-neutral-800 bg-neutral-800"
                    >
                      {img.imageUrl && !img.deleted ? (
                        <Image
                          src={img.imageUrl}
                          alt={img.label ?? "image"}
                          fill
                          sizes="80px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-[10px] text-red-400">
                          supprimée
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {showGenPanel && (
        <ImageGenerationPanel
          personaId={personaId}
          onClose={() => setShowGenPanel(false)}
        />
      )}
      {postingId && (
        <PostCarouselModal
          carouselId={postingId}
          onClose={() => setPostingId(null)}
        />
      )}
    </div>
  );
}

function FilterRow({
  label,
  values,
  selected,
  onToggle,
}: {
  label: string;
  values: readonly string[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div>
      <p className="mb-1.5 text-[10px] uppercase tracking-wide text-neutral-500">
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {values.map((v) => {
          const active = selected.includes(v);
          return (
            <button
              key={v}
              onClick={() => onToggle(v)}
              className={`rounded border px-2 py-1 font-mono text-[10px] transition ${
                active
                  ? "border-orange-500/60 bg-orange-500/10 text-orange-300"
                  : "border-neutral-800 text-neutral-400 hover:border-neutral-700"
              }`}
            >
              {v}
            </button>
          );
        })}
      </div>
    </div>
  );
}
