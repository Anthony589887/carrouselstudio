"use client";

import Image from "next/image";
import Link from "next/link";
import { use, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useToast } from "@/components/Toast";
import { useDictsMetadata } from "@/lib/useDictsMetadata";

export default function NewCarouselPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const personaId = id as Id<"personas">;
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromParam = searchParams.get("from");
  const toast = useToast();

  const persona = useQuery(api.personas.get, { id: personaId });
  const folderFromUrl = fromParam ? (fromParam as Id<"folders">) : null;
  const folderInfo = useQuery(
    api.folders.get,
    folderFromUrl ? { folderId: folderFromUrl } : "skip",
  );
  // The user can opt out of assigning to the folder before creating.
  const [assignToFolder, setAssignToFolder] = useState<boolean>(true);

  const [spaceFilter, setSpaceFilter] = useState<string[]>([]);
  const allImages = useQuery(api.images.list, {
    personaId,
    space: spaceFilter.length > 0 ? spaceFilter : undefined,
    includeUsed: false,
  });
  const images = allImages?.filter((i) => i.status === "available");
  const { dicts, situationLabel, tagLabel } = useDictsMetadata();

  const createCarousel = useMutation(api.carousels.create);
  const [selected, setSelected] = useState<Id<"images">[]>([]);
  const [creating, setCreating] = useState(false);

  const toggleSpace = (t: string) => {
    setSpaceFilter((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t],
    );
  };

  const toggleSelect = (imageId: Id<"images">) => {
    setSelected((prev) =>
      prev.includes(imageId)
        ? prev.filter((id) => id !== imageId)
        : prev.length >= 10
          ? prev
          : [...prev, imageId],
    );
  };

  const move = (idx: number, dir: -1 | 1) => {
    setSelected((prev) => {
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };

  const handleCreate = async () => {
    if (selected.length < 5) return;
    setCreating(true);
    const useFolder = folderFromUrl && assignToFolder ? folderFromUrl : undefined;
    try {
      await createCarousel({
        personaId,
        imageIds: selected,
        folderId: useFolder,
      });
      toast.push("success", "Carrousel créé");
      router.push(
        useFolder
          ? `/persona/${personaId}?folder=${useFolder}`
          : `/persona/${personaId}`,
      );
    } catch (e) {
      toast.push("error", (e as Error).message);
      setCreating(false);
    }
  };

  const imageById = new Map((images ?? []).map((img) => [img._id, img]));
  const selectedImages = selected
    .map((id) => imageById.get(id))
    .filter((x) => x !== undefined);

  const tooFew = selected.length < 5;
  const counterColor = tooFew ? "text-orange-400" : "text-green-400";

  return (
    <div className="flex h-screen flex-col bg-neutral-950">
      {/* === Sticky header === */}
      <header className="sticky top-0 z-30 flex shrink-0 items-center justify-between border-b border-neutral-800 bg-neutral-900 px-6 py-3">
        <Link
          href={
            folderFromUrl
              ? `/persona/${personaId}?folder=${folderFromUrl}`
              : `/persona/${personaId}`
          }
          className="rounded px-2 py-1 text-sm text-neutral-300 hover:bg-neutral-800 hover:text-white"
        >
          ← Retour
        </Link>
        <h1 className="truncate text-sm font-semibold sm:text-base">
          Créer un carrousel
          {persona ? (
            <span className="text-neutral-500"> — {persona.name}</span>
          ) : null}
        </h1>
        <div className={`text-xs font-medium sm:text-sm ${counterColor}`}>
          {selected.length} / 10
          {tooFew && <span className="ml-1 text-neutral-500">(min 5)</span>}
        </div>
      </header>

      {/* === Folder context indicator === */}
      {folderFromUrl && folderInfo && (
        <div className="flex shrink-0 items-center justify-between border-b border-orange-500/20 bg-orange-500/5 px-6 py-2">
          <span className="text-xs text-orange-200">
            {assignToFolder
              ? `Création dans le dossier 📁 ${folderInfo.name}`
              : "Création à la racine"}
          </span>
          <button
            onClick={() => setAssignToFolder((v) => !v)}
            className="text-[11px] text-neutral-400 hover:text-orange-300"
          >
            {assignToFolder ? "→ Créer à la racine" : `→ Assigner à ${folderInfo.name}`}
          </button>
        </div>
      )}

      {/* === Bank zone (scrollable) === */}
      <div className="flex-1 overflow-y-auto px-6 pb-6 pt-4">
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          <span className="mr-2 text-[10px] uppercase tracking-wide text-neutral-500">
            Espace :
          </span>
          {!dicts ? (
            <span className="text-xs text-neutral-500">…</span>
          ) : (
            dicts.tagValues.space.map((t) => {
              const active = spaceFilter.includes(t);
              return (
                <button
                  key={t}
                  onClick={() => toggleSpace(t)}
                  title={t}
                  className={`rounded border px-2 py-1 text-[11px] transition ${
                    active
                      ? "border-orange-500/60 bg-orange-500/10 text-orange-300"
                      : "border-neutral-800 text-neutral-500 hover:border-neutral-700"
                  }`}
                >
                  {tagLabel("space", t)}
                </button>
              );
            })
          )}
          {spaceFilter.length > 0 && (
            <button
              onClick={() => setSpaceFilter([])}
              className="text-[10px] text-neutral-500 hover:text-neutral-300"
            >
              clear
            </button>
          )}
        </div>

        {images === undefined ? (
          <p className="text-sm text-neutral-500">Chargement…</p>
        ) : images.length === 0 ? (
          <p className="text-sm text-neutral-500">Aucune image disponible.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {images.map((img) => {
              const isSelected = selected.includes(img._id);
              const idx = isSelected ? selected.indexOf(img._id) + 1 : null;
              return (
                <button
                  key={img._id}
                  onClick={() => toggleSelect(img._id)}
                  className={`group relative overflow-hidden rounded border-2 transition ${
                    isSelected
                      ? "border-orange-500"
                      : "border-neutral-800 hover:border-neutral-600"
                  }`}
                >
                  <div className="relative aspect-[4/5] w-full bg-neutral-800">
                    {img.imageUrl && (
                      <Image
                        src={img.imageUrl}
                        alt={img.situationId ?? img.legacyType ?? "image"}
                        fill
                        sizes="(max-width: 640px) 50vw, 16vw"
                        className="object-cover"
                      />
                    )}
                    {isSelected && (
                      <div className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-orange-500 text-xs font-bold text-neutral-950 shadow-md">
                        {idx}
                      </div>
                    )}
                  </div>
                  <div
                    className="bg-neutral-900/90 px-1.5 py-1 text-left text-[11px] text-neutral-300 truncate"
                    title={img.situationId ?? img.legacyType ?? ""}
                  >
                    {img.situationId
                      ? situationLabel(img.situationId)
                      : (img.legacyType ?? "—")}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* === Sticky bottom bar with large preview === */}
      <footer className="sticky bottom-0 z-30 shrink-0 border-t border-neutral-800 bg-neutral-900">
        <div className="flex items-end gap-3 px-6 py-4">
          <div className="flex-1 overflow-x-auto">
            {selectedImages.length === 0 ? (
              <div className="flex h-[210px] items-center justify-center rounded border border-dashed border-neutral-800 text-sm text-neutral-500">
                Sélectionne entre 5 et 10 images dans la banque ci-dessus.
              </div>
            ) : (
              <div className="flex gap-2 pr-3">
                {selectedImages.map((img, idx) => (
                  <div
                    key={img._id}
                    className="relative aspect-[4/5] h-[210px] shrink-0 overflow-hidden rounded border border-orange-500/40 bg-neutral-800"
                  >
                    {img.imageUrl && (
                      <Image
                        src={img.imageUrl}
                        alt={img.situationId ?? img.legacyType ?? "image"}
                        fill
                        sizes="170px"
                        className="object-cover"
                      />
                    )}
                    <div className="absolute left-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 text-[11px] font-bold text-neutral-950 shadow-md">
                      {idx + 1}
                    </div>
                    <button
                      onClick={() => toggleSelect(img._id)}
                      title="Retirer"
                      className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-xs text-red-300 hover:bg-red-500/40 hover:text-red-100"
                    >
                      ×
                    </button>
                    <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/70 px-1.5 py-1 text-[12px]">
                      <button
                        onClick={() => move(idx, -1)}
                        disabled={idx === 0}
                        className="text-neutral-200 hover:text-orange-300 disabled:opacity-30"
                        title="Reculer"
                      >
                        ←
                      </button>
                      <button
                        onClick={() => move(idx, 1)}
                        disabled={idx === selected.length - 1}
                        className="text-neutral-200 hover:text-orange-300 disabled:opacity-30"
                        title="Avancer"
                      >
                        →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={handleCreate}
            disabled={tooFew || creating}
            className="shrink-0 rounded bg-orange-500 px-5 py-3 text-sm font-medium text-neutral-950 hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {creating ? "Création…" : "Créer →"}
          </button>
        </div>
      </footer>
    </div>
  );
}
