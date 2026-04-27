"use client";

import Image from "next/image";
import Link from "next/link";
import { use, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { ImageGenerationPanel } from "@/components/ImageGenerationPanel";
import { PostCarouselModal } from "@/components/PostCarouselModal";
import { FolderModal } from "@/components/FolderModal";
import { Kebab, KebabItem, KebabSubmenuLabel } from "@/components/Kebab";
import { useToast } from "@/components/Toast";
import { useDictsMetadata } from "@/lib/useDictsMetadata";

type DimValues = {
  lighting: string[];
  energy: string[];
  social: string[];
  space: string[];
};

const DIM_ORDER: (keyof DimValues)[] = ["space", "energy", "social", "lighting"];

type FolderSummary = {
  _id: Id<"folders">;
  name: string;
  imageCount: number;
  carouselCount: number;
};

export default function PersonaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const personaId = id as Id<"personas">;
  const router = useRouter();
  const searchParams = useSearchParams();
  const folderParam = searchParams.get("folder");
  const isInFolder = folderParam !== null && folderParam !== "root";
  const folderFilter: "root" | Id<"folders"> = isInFolder
    ? (folderParam as Id<"folders">)
    : "root";

  const toast = useToast();

  const persona = useQuery(api.personas.get, { id: personaId });
  const folders = useQuery(api.folders.list, { personaId });
  const currentFolder = useQuery(
    api.folders.get,
    isInFolder ? { folderId: folderParam as Id<"folders"> } : "skip",
  );

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
    folderFilter,
    includeUsed,
    lighting: filters.lighting.length > 0 ? filters.lighting : undefined,
    energy: filters.energy.length > 0 ? filters.energy : undefined,
    social: filters.social.length > 0 ? filters.social : undefined,
    space: filters.space.length > 0 ? filters.space : undefined,
    legacyTypes: legacyFilter.length > 0 ? legacyFilter : undefined,
  });
  const carousels = useQuery(api.carousels.listByPersona, {
    personaId,
    folderFilter,
  });
  const legacyTypeOptions = useQuery(api.images.distinctLegacyTypes, {
    personaId,
  });

  const updatePersona = useMutation(api.personas.update);
  const removeImage = useMutation(api.images.remove);
  const retryImage = useMutation(api.imageBatch.retryImage);
  const regenerateWithNewCombination = useMutation(
    api.imageBatch.regenerateWithNewCombination,
  );
  const moveImage = useMutation(api.images.moveToFolder);
  const bulkMoveImages = useMutation(api.images.bulkMoveToFolder);
  const moveCarousel = useMutation(api.carousels.moveToFolder);
  const removeFolder = useMutation(api.folders.remove);

  const {
    dicts,
    situationLabel,
    emotionLabel,
    framingLabel,
    registerLabel,
    tagLabel,
    dimensionLabel,
  } = useDictsMetadata();

  const [editingDescription, setEditingDescription] = useState(false);
  const [descriptionDraft, setDescriptionDraft] = useState("");
  const [editingSignature, setEditingSignature] = useState(false);
  const [signatureDraft, setSignatureDraft] = useState("");
  const [showGenPanel, setShowGenPanel] = useState(false);
  const [postingId, setPostingId] = useState<Id<"carousels"> | null>(null);
  const [folderModal, setFolderModal] = useState<
    | { mode: "create" }
    | { mode: "rename"; folderId: Id<"folders">; currentName: string }
    | null
  >(null);

  // Multi-select state for bulk move
  const [selectionMode, setSelectionMode] = useState(false);
  const [selected, setSelected] = useState<Set<Id<"images">>>(new Set());

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

  const startEditSignature = () => {
    setSignatureDraft(persona?.signatureFeatures ?? "");
    setEditingSignature(true);
  };

  const saveSignature = async () => {
    await updatePersona({
      id: personaId,
      signatureFeatures: signatureDraft.trim() || undefined,
    });
    toast.push("success", "Traits distinctifs mis à jour");
    setEditingSignature(false);
  };

  const handleDeleteImage = async (imageId: Id<"images">) => {
    if (!confirm("Supprimer cette image ?")) return;
    await removeImage({ id: imageId });
    toast.push("success", "Image supprimée");
  };

  const handleRetry = async (imageId: Id<"images">) => {
    try {
      await retryImage({ id: imageId });
      toast.push("info", "Génération relancée (même combinaison)");
    } catch (e) {
      toast.push("error", (e as Error).message);
    }
  };

  const handleRegenerate = async (imageId: Id<"images">) => {
    try {
      await regenerateWithNewCombination({ id: imageId });
      toast.push("info", "Nouvelle combinaison tirée");
    } catch (e) {
      toast.push("error", (e as Error).message);
    }
  };

  const handleMoveImage = async (
    imageId: Id<"images">,
    target: Id<"folders"> | null,
  ) => {
    try {
      await moveImage({ imageId, folderId: target });
      toast.push("success", target ? "Image déplacée" : "Image revenue à la racine");
    } catch (e) {
      toast.push("error", (e as Error).message);
    }
  };

  const handleMoveCarousel = async (
    carouselId: Id<"carousels">,
    target: Id<"folders"> | null,
  ) => {
    try {
      await moveCarousel({ carouselId, folderId: target });
      toast.push("success", target ? "Carrousel déplacé" : "Carrousel revenu à la racine");
    } catch (e) {
      toast.push("error", (e as Error).message);
    }
  };

  const handleBulkMove = async (target: Id<"folders"> | null) => {
    if (selected.size === 0) return;
    try {
      const result = await bulkMoveImages({
        imageIds: [...selected],
        folderId: target,
      });
      toast.push(
        "success",
        `${result.moved} image${result.moved > 1 ? "s" : ""} déplacée${result.moved > 1 ? "s" : ""}`,
      );
      setSelected(new Set());
      setSelectionMode(false);
    } catch (e) {
      toast.push("error", (e as Error).message);
    }
  };

  const handleDeleteFolder = async (folder: FolderSummary) => {
    const ok = window.confirm(
      `Le dossier "${folder.name}" contient ${folder.imageCount} image${folder.imageCount > 1 ? "s" : ""} et ${folder.carouselCount} carrousel${folder.carouselCount > 1 ? "s" : ""}. Si tu le supprimes, ils reviendront à la racine. Aucune image ni carrousel ne sera supprimé. Continuer ?`,
    );
    if (!ok) return;
    try {
      const result = await removeFolder({ folderId: folder._id });
      toast.push(
        "success",
        `Dossier "${folder.name}" supprimé. ${result.imagesMoved} image${result.imagesMoved > 1 ? "s" : ""} et ${result.carouselsMoved} carrousel${result.carouselsMoved > 1 ? "s" : ""} sont revenus à la racine.`,
      );
      // If we were inside this folder, redirect back to root
      if (isInFolder && folderParam === folder._id) {
        router.push(`/persona/${personaId}`);
      }
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

  const toggleSelectImage = (imageId: Id<"images">) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(imageId)) next.delete(imageId);
      else next.add(imageId);
      return next;
    });
  };

  const exitSelection = () => {
    setSelectionMode(false);
    setSelected(new Set());
  };

  const newCarouselHref = isInFolder
    ? `/persona/${personaId}/new-carousel?from=${folderParam}`
    : `/persona/${personaId}/new-carousel`;

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
          <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-400">
            {persona.tiktokAccount && (
              <span>TikTok: {persona.tiktokAccount}</span>
            )}
            {persona.instagramAccount && (
              <span>Instagram: {persona.instagramAccount}</span>
            )}
            <GenderInlineSelect
              value={persona.gender}
              onChange={async (g) => {
                await updatePersona({ id: personaId, gender: g });
                toast.push("success", "Genre mis à jour");
              }}
            />
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

          {editingSignature ? (
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wide text-neutral-500">
                Traits distinctifs
              </label>
              <div className="space-y-2">
                <textarea
                  value={signatureDraft}
                  onChange={(e) => setSignatureDraft(e.target.value)}
                  rows={3}
                  maxLength={2000}
                  placeholder="Vitiligo, taches de naissance distinctives, cicatrices marquées… Localisation, forme, couleur."
                  className="w-full rounded border border-neutral-800 bg-neutral-950 px-3 py-2 font-mono text-xs focus:border-orange-500/60 focus:outline-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={saveSignature}
                    className="rounded bg-orange-500 px-3 py-1 text-xs font-medium text-neutral-950"
                  >
                    Sauver
                  </button>
                  <button
                    onClick={() => setEditingSignature(false)}
                    className="rounded border border-neutral-700 px-3 py-1 text-xs"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            </div>
          ) : persona.signatureFeatures && persona.signatureFeatures.trim() ? (
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wide text-neutral-500">
                Traits distinctifs
              </label>
              <div
                className="cursor-pointer rounded border border-orange-500/30 bg-orange-500/5 px-3 py-2 font-mono text-xs text-orange-200 hover:border-orange-500/60"
                onClick={startEditSignature}
              >
                {persona.signatureFeatures}
              </div>
            </div>
          ) : (
            <button
              onClick={startEditSignature}
              className="text-xs text-neutral-500 hover:text-orange-300"
            >
              + Ajouter des traits distinctifs
            </button>
          )}
        </div>
      </header>

      {/* === Folder breadcrumb (when in a folder) === */}
      {isInFolder && (
        <div className="flex items-center justify-between rounded border border-orange-500/30 bg-orange-500/5 px-4 py-3">
          <div className="flex items-center gap-3">
            <Link
              href={`/persona/${personaId}`}
              className="text-xs text-neutral-400 hover:text-orange-300"
            >
              ← {persona.name}
            </Link>
            <span className="text-neutral-600">/</span>
            <span className="text-sm font-medium text-orange-200">
              📁 {currentFolder?.name ?? "…"}
            </span>
          </div>
          {currentFolder && folders && (
            <Kebab>
              {(close) => (
                <>
                  <KebabItem
                    onClick={() => {
                      setFolderModal({
                        mode: "rename",
                        folderId: currentFolder._id,
                        currentName: currentFolder.name,
                      });
                      close();
                    }}
                  >
                    Renommer
                  </KebabItem>
                  <KebabItem
                    danger
                    onClick={() => {
                      const summary = folders.find(
                        (f) => f._id === currentFolder._id,
                      );
                      if (summary) handleDeleteFolder(summary);
                      close();
                    }}
                  >
                    Supprimer
                  </KebabItem>
                </>
              )}
            </Kebab>
          )}
        </div>
      )}

      {/* === Folders block (only at root, only if folders exist) === */}
      {!isInFolder && folders !== undefined && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm uppercase tracking-wide text-neutral-500">
              Dossiers
            </h2>
            <button
              onClick={() => setFolderModal({ mode: "create" })}
              className="rounded border border-neutral-700 px-3 py-1.5 text-xs hover:border-orange-500/60 hover:text-orange-300"
            >
              + Nouveau dossier
            </button>
          </div>
          {folders.length === 0 ? (
            <p className="text-xs text-neutral-500">
              Aucun dossier. Crée-en un pour organiser tes images et carrousels.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {folders.map((f) => (
                <FolderCard
                  key={f._id}
                  folder={f}
                  onOpen={() =>
                    router.push(`/persona/${personaId}?folder=${f._id}`)
                  }
                  onRename={() =>
                    setFolderModal({
                      mode: "rename",
                      folderId: f._id,
                      currentName: f.name,
                    })
                  }
                  onDelete={() => handleDeleteFolder(f)}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* === Image bank === */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">
            {isInFolder
              ? "Images du dossier"
              : folders && folders.length > 0
                ? "Images sans dossier"
                : "Banque d'images"}
          </h2>
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
            {!dicts ? (
              <p className="text-xs text-neutral-500">Chargement des filtres…</p>
            ) : (
              <>
                {DIM_ORDER.map((dim) => (
                  <FilterRow
                    key={dim}
                    label={dimensionLabel(dim)}
                    values={dicts.tagValues[dim]}
                    labelFor={(v) => tagLabel(dim, v)}
                    selected={filters[dim]}
                    onToggle={(v) => toggleFilter(dim, v)}
                  />
                ))}
                {legacyTypeOptions && legacyTypeOptions.length > 0 && (
                  <FilterRow
                    label="Type (ancien)"
                    values={legacyTypeOptions}
                    selected={legacyFilter}
                    onToggle={toggleLegacy}
                  />
                )}
              </>
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
            {isInFolder
              ? "Aucune image dans ce dossier."
              : "Aucune image. Génère ta première batch."}
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
              const label = img.situationId
                ? situationLabel(img.situationId)
                : (img.legacyType ?? "—");
              const subLabel = img.technicalRegisterId
                ? registerLabel(img.technicalRegisterId)
                : null;
              const tooltip = [
                img.situationId && `Situation : ${situationLabel(img.situationId)}`,
                img.technicalRegisterId &&
                  `Registre : ${registerLabel(img.technicalRegisterId)}`,
                img.framingId && `Cadrage : ${framingLabel(img.framingId)}`,
                img.emotionalStateId &&
                  `Émotion : ${emotionLabel(img.emotionalStateId)}`,
                img.legacyType && `Legacy : ${img.legacyType}`,
              ]
                .filter(Boolean)
                .join("\n");
              const isPickable = isAvailable || isUsed;
              const isChecked = selected.has(img._id);
              return (
                <div
                  key={img._id}
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
                      selectionMode && isPickable ? "cursor-pointer" : ""
                    }`}
                    onClick={() => {
                      if (selectionMode && isPickable) toggleSelectImage(img._id);
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
                        title={img.errorMessage ?? "Échec"}
                      >
                        <span className="text-[10px] text-red-300">échec</span>
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => handleRetry(img._id)}
                            title="Réessayer avec la même combinaison (transient)"
                            className="rounded border border-red-500/40 bg-red-950/60 px-2 py-1 text-[10px] text-red-200 hover:border-red-400 hover:bg-red-900/60"
                          >
                            ⟳ réessayer
                          </button>
                          <button
                            onClick={() => handleRegenerate(img._id)}
                            title="Tirer une nouvelle combinaison"
                            className="rounded border border-orange-500/40 bg-red-950/60 px-2 py-1 text-[10px] text-orange-200 hover:border-orange-400 hover:bg-red-900/60"
                          >
                            ⤬ nouvelle combo
                          </button>
                        </div>
                      </div>
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
                    {selectionMode && isPickable && (
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
                  </div>
                  <div
                    className="flex items-center justify-between gap-1 p-1.5 text-[11px]"
                    title={tooltip}
                  >
                    <span className="truncate text-neutral-300">{label}</span>
                    <span
                      className={`shrink-0 rounded px-1 py-0.5 text-[10px] ${
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
                  {subLabel && (
                    <div className="px-1.5 pb-1.5 text-[10px] text-neutral-500 truncate">
                      {subLabel}
                    </div>
                  )}
                  {isUsed && (
                    <UsedInBadge
                      imageId={img._id}
                      currentFolderId={
                        isInFolder ? (folderParam as Id<"folders">) : null
                      }
                      personaId={personaId}
                    />
                  )}
                  {!isGenerating && !selectionMode && (
                    <div className="absolute right-1 top-1 hidden group-hover:block">
                      <Kebab align="end">
                        {(close) => (
                          <>
                            {(folders ?? []).length > 0 || img.folderId ? (
                              <KebabSubmenuLabel>Déplacer vers</KebabSubmenuLabel>
                            ) : null}
                            {img.folderId && (
                              <KebabItem
                                onClick={() => {
                                  handleMoveImage(img._id, null);
                                  close();
                                }}
                              >
                                Racine
                              </KebabItem>
                            )}
                            {(folders ?? [])
                              .filter((f) => f._id !== img.folderId)
                              .map((f) => (
                                <KebabItem
                                  key={f._id}
                                  onClick={() => {
                                    handleMoveImage(img._id, f._id);
                                    close();
                                  }}
                                >
                                  📁 {f.name}
                                </KebabItem>
                              ))}
                            <div className="my-1 border-t border-neutral-800" />
                            <KebabItem
                              danger
                              onClick={() => {
                                handleDeleteImage(img._id);
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
      </section>

      {/* === Carousels === */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {isInFolder
              ? "Carrousels du dossier"
              : folders && folders.length > 0
                ? "Carrousels sans dossier"
                : "Carrousels"}
          </h2>
          <Link
            href={newCarouselHref}
            className="rounded bg-orange-500 px-3 py-1.5 text-sm font-medium text-neutral-950 hover:bg-orange-400"
          >
            + Créer un carrousel
          </Link>
        </div>

        {carousels === undefined ? (
          <p className="text-sm text-neutral-500">Chargement…</p>
        ) : carousels.length === 0 ? (
          <div className="rounded border border-dashed border-neutral-800 p-8 text-center text-sm text-neutral-500">
            {isInFolder
              ? "Aucun carrousel dans ce dossier."
              : "Aucun carrousel."}
          </div>
        ) : (
          <div className="space-y-3">
            {carousels.map((c) => (
              <div
                key={c._id}
                className="rounded-lg border border-neutral-800 bg-neutral-900 p-3"
              >
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span
                      className={`rounded px-2 py-0.5 ${
                        c.status === "posted"
                          ? "bg-green-500/15 text-green-300"
                          : "bg-neutral-700 text-neutral-300"
                      }`}
                    >
                      {c.status}
                    </span>
                    <span className="text-neutral-300">{c.displayLabel}</span>
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
                  <div className="flex items-center gap-2">
                    <a
                      href={`/api/carousel/${c._id}/zip`}
                      className="rounded border border-neutral-700 px-2 py-1 text-xs hover:border-orange-500/60 hover:text-orange-300"
                      title="Télécharger en ZIP"
                    >
                      ⬇ ZIP
                    </a>
                    {c.status === "draft" && (
                      <button
                        onClick={() => setPostingId(c._id)}
                        className="rounded border border-neutral-700 px-2 py-1 text-xs hover:border-orange-500/60"
                      >
                        Marquer posté
                      </button>
                    )}
                    <Kebab>
                      {(close) => (
                        <>
                          {((folders ?? []).length > 0 || c.folderId) && (
                            <KebabSubmenuLabel>Déplacer vers</KebabSubmenuLabel>
                          )}
                          {c.folderId && (
                            <KebabItem
                              onClick={() => {
                                handleMoveCarousel(c._id, null);
                                close();
                              }}
                            >
                              Racine
                            </KebabItem>
                          )}
                          {(folders ?? [])
                            .filter((f) => f._id !== c.folderId)
                            .map((f) => (
                              <KebabItem
                                key={f._id}
                                onClick={() => {
                                  handleMoveCarousel(c._id, f._id);
                                  close();
                                }}
                              >
                                📁 {f.name}
                              </KebabItem>
                            ))}
                        </>
                      )}
                    </Kebab>
                  </div>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {c.images.map((img) => (
                    <div
                      key={img.imageId}
                      className="relative aspect-[4/5] h-[150px] shrink-0 overflow-hidden rounded border border-neutral-800 bg-neutral-800"
                    >
                      {img.imageUrl && !img.deleted ? (
                        <Image
                          src={img.imageUrl}
                          alt={img.label ?? "image"}
                          fill
                          sizes="120px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-red-400">
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

      {/* === Sticky bulk-action bar === */}
      {selectionMode && selected.size > 0 && (
        <div className="fixed bottom-4 left-1/2 z-30 -translate-x-1/2 rounded-full border border-neutral-700 bg-neutral-900 px-4 py-2 shadow-2xl">
          <div className="flex items-center gap-3 text-xs">
            <span className="text-neutral-300">
              {selected.size} sélectionnée{selected.size > 1 ? "s" : ""}
            </span>
            <Kebab align="end" ariaLabel="Déplacer la sélection">
              {(close) => (
                <>
                  <KebabSubmenuLabel>Déplacer vers</KebabSubmenuLabel>
                  <KebabItem
                    onClick={() => {
                      handleBulkMove(null);
                      close();
                    }}
                  >
                    Racine
                  </KebabItem>
                  {(folders ?? []).map((f) => (
                    <KebabItem
                      key={f._id}
                      onClick={() => {
                        handleBulkMove(f._id);
                        close();
                      }}
                    >
                      📁 {f.name}
                    </KebabItem>
                  ))}
                </>
              )}
            </Kebab>
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
      {folderModal && (
        folderModal.mode === "create" ? (
          <FolderModal
            mode="create"
            personaId={personaId}
            onClose={() => setFolderModal(null)}
          />
        ) : (
          <FolderModal
            mode="rename"
            folderId={folderModal.folderId}
            currentName={folderModal.currentName}
            onClose={() => setFolderModal(null)}
          />
        )
      )}
    </div>
  );
}

function FolderCard({
  folder,
  onOpen,
  onRename,
  onDelete,
}: {
  folder: FolderSummary;
  onOpen: () => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      onClick={onOpen}
      className="group relative cursor-pointer rounded-lg border border-neutral-800 bg-neutral-900 p-3 transition hover:border-orange-500/40"
    >
      <div className="mb-2 text-2xl">📁</div>
      <div className="mb-1 truncate font-medium text-neutral-100" title={folder.name}>
        {folder.name}
      </div>
      <div className="flex flex-wrap gap-2 text-[10px] text-neutral-500">
        <span>{folder.imageCount} image{folder.imageCount > 1 ? "s" : ""}</span>
        <span>·</span>
        <span>
          {folder.carouselCount} carrousel{folder.carouselCount > 1 ? "s" : ""}
        </span>
      </div>
      <div className="absolute right-1 top-1 opacity-0 transition group-hover:opacity-100">
        <Kebab align="end">
          {(close) => (
            <>
              <KebabItem
                onClick={() => {
                  onRename();
                  close();
                }}
              >
                Renommer
              </KebabItem>
              <KebabItem
                danger
                onClick={() => {
                  onDelete();
                  close();
                }}
              >
                Supprimer
              </KebabItem>
            </>
          )}
        </Kebab>
      </div>
    </div>
  );
}

function UsedInBadge({
  imageId,
  currentFolderId,
  personaId,
}: {
  imageId: Id<"images">;
  currentFolderId: Id<"folders"> | null;
  personaId: Id<"personas">;
}) {
  const [open, setOpen] = useState(false);
  const usages = useQuery(
    api.images.getCarouselUsages,
    open ? { imageId } : "skip",
  );

  return (
    <div className="relative px-1.5 pb-1.5">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="rounded border border-orange-500/30 bg-orange-500/10 px-2 py-0.5 text-[10px] text-orange-300 hover:border-orange-500/60"
      >
        {open ? "▾" : "▸"} Dans un carrousel
      </button>
      {open && (
        <div
          className="absolute z-20 mt-1 min-w-[220px] overflow-hidden rounded border border-neutral-700 bg-neutral-900 py-1 text-xs shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {usages === undefined ? (
            <div className="px-3 py-1.5 text-neutral-500">Chargement…</div>
          ) : usages.length === 0 ? (
            <div className="px-3 py-1.5 text-neutral-500">
              Aucune utilisation trouvée.
            </div>
          ) : (
            usages.map((u) => {
              const sameFolder =
                (u.folderId ?? null) === (currentFolderId ?? null);
              const href = u.folderId
                ? `/persona/${personaId}?folder=${u.folderId}`
                : `/persona/${personaId}`;
              return (
                <Link
                  key={u.carouselId}
                  href={href}
                  className="block px-3 py-1.5 text-neutral-200 hover:bg-neutral-800"
                  onClick={() => setOpen(false)}
                >
                  {u.label}
                  {!sameFolder && u.folderId && (
                    <span className="ml-1 text-neutral-500">(dossier)</span>
                  )}
                </Link>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

function GenderInlineSelect({
  value,
  onChange,
}: {
  value: "feminine" | "masculine" | "neutral" | undefined;
  onChange: (g: "feminine" | "masculine" | "neutral") => void | Promise<void>;
}) {
  const labels: Record<"feminine" | "masculine" | "neutral", string> = {
    feminine: "♀ Féminin",
    masculine: "♂ Masculin",
    neutral: "⚧ Neutre",
  };
  return (
    <select
      value={value ?? ""}
      onChange={(e) => {
        const v = e.target.value as "feminine" | "masculine" | "neutral";
        if (v) onChange(v);
      }}
      title="Genre du persona"
      className="rounded border border-neutral-800 bg-neutral-950 px-2 py-1 text-[11px] text-neutral-300 focus:border-orange-500/60 focus:outline-none"
    >
      {!value && (
        <option value="" disabled>
          — Genre —
        </option>
      )}
      <option value="feminine">{labels.feminine}</option>
      <option value="masculine">{labels.masculine}</option>
      <option value="neutral">{labels.neutral}</option>
    </select>
  );
}

function FilterRow({
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
