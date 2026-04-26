"use client";

import Image from "next/image";
import Link from "next/link";
import { use, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useToast } from "@/components/Toast";
import { SPACE_VALUES, type DimValues } from "@/lib/imageDicts";

export default function NewCarouselPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const personaId = id as Id<"personas">;
  const router = useRouter();
  const toast = useToast();

  const [filters, setFilters] = useState<DimValues>({
    lighting: [],
    energy: [],
    social: [],
    space: [],
  });
  const allImages = useQuery(api.images.list, {
    personaId,
    space: filters.space.length > 0 ? filters.space : undefined,
    includeUsed: false,
  });
  const images = allImages?.filter((i) => i.status === "available");

  const createCarousel = useMutation(api.carousels.create);
  const [selected, setSelected] = useState<Id<"images">[]>([]);
  const [creating, setCreating] = useState(false);

  const toggleSpace = (t: string) => {
    setFilters((prev) => ({
      ...prev,
      space: prev.space.includes(t)
        ? prev.space.filter((x) => x !== t)
        : [...prev.space, t],
    }));
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
    try {
      await createCarousel({ personaId, imageIds: selected });
      toast.push("success", "Carrousel créé");
      router.push(`/persona/${personaId}`);
    } catch (e) {
      toast.push("error", (e as Error).message);
      setCreating(false);
    }
  };

  const imageById = new Map(
    (images ?? []).map((img) => [img._id, img]),
  );
  const selectedImages = selected
    .map((id) => imageById.get(id))
    .filter((x) => x !== undefined);

  return (
    <div className="space-y-6">
      <Link
        href={`/persona/${personaId}`}
        className="text-xs text-neutral-500 hover:text-neutral-300"
      >
        ← Retour
      </Link>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Nouveau carrousel</h1>
        <button
          onClick={handleCreate}
          disabled={selected.length < 5 || creating}
          className="rounded bg-orange-500 px-4 py-2 text-sm font-medium text-neutral-950 hover:bg-orange-400 disabled:opacity-40"
        >
          {creating
            ? "Création…"
            : `Créer (${selected.length}/${selected.length < 5 ? "min 5" : 10})`}
        </button>
      </div>

      {/* Order strip */}
      <section className="space-y-2">
        <h2 className="text-sm uppercase tracking-wide text-neutral-500">
          Ordre du carrousel ({selected.length})
        </h2>
        {selected.length === 0 ? (
          <div className="rounded border border-dashed border-neutral-800 p-6 text-center text-sm text-neutral-500">
            Sélectionne entre 5 et 10 images ci-dessous.
          </div>
        ) : (
          <div className="flex gap-2 overflow-x-auto rounded border border-neutral-800 bg-neutral-900 p-3">
            {selectedImages.map((img, idx) => (
              <div
                key={img._id}
                className="relative aspect-[4/5] w-24 shrink-0 overflow-hidden rounded border border-orange-500/40 bg-neutral-800"
              >
                {img.imageUrl && (
                  <Image
                    src={img.imageUrl}
                    alt={img.situationId ?? img.legacyType ?? "image"}
                    fill
                    sizes="96px"
                    className="object-cover"
                  />
                )}
                <div className="absolute inset-x-0 top-0 flex justify-between bg-black/60 px-1 text-[10px]">
                  <span className="text-orange-300">{idx + 1}</span>
                  <button
                    onClick={() => toggleSelect(img._id)}
                    className="text-red-300"
                  >
                    ×
                  </button>
                </div>
                <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/60 px-1 text-[10px]">
                  <button
                    onClick={() => move(idx, -1)}
                    disabled={idx === 0}
                    className="text-neutral-300 disabled:opacity-30"
                  >
                    ←
                  </button>
                  <button
                    onClick={() => move(idx, 1)}
                    disabled={idx === selected.length - 1}
                    className="text-neutral-300 disabled:opacity-30"
                  >
                    →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Selection grid */}
      <section className="space-y-2">
        <h2 className="text-sm uppercase tracking-wide text-neutral-500">
          Images disponibles
        </h2>
        <div className="flex flex-wrap gap-1.5">
          {SPACE_VALUES.map((t) => {
            const active = filters.space.includes(t);
            return (
              <button
                key={t}
                onClick={() => toggleSpace(t)}
                className={`rounded border px-2 py-1 font-mono text-[10px] transition ${
                  active
                    ? "border-orange-500/60 bg-orange-500/10 text-orange-300"
                    : "border-neutral-800 text-neutral-500 hover:border-neutral-700"
                }`}
              >
                {t}
              </button>
            );
          })}
        </div>

        {images === undefined ? (
          <p className="text-sm text-neutral-500">Chargement…</p>
        ) : images.length === 0 ? (
          <p className="text-sm text-neutral-500">Aucune image disponible.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {images.map((img) => {
              const isSelected = selected.includes(img._id);
              return (
                <button
                  key={img._id}
                  onClick={() => toggleSelect(img._id)}
                  className={`group relative overflow-hidden rounded border-2 ${
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
                        sizes="(max-width: 640px) 50vw, 20vw"
                        className="object-cover"
                      />
                    )}
                  </div>
                  <div className="bg-neutral-900/90 px-1.5 py-1 text-left font-mono text-[10px] text-neutral-400 truncate">
                    {img.situationId ?? img.legacyType ?? "—"}
                  </div>
                  {isSelected && (
                    <div className="absolute right-1 top-1 rounded-full bg-orange-500 px-1.5 text-[10px] font-bold text-neutral-950">
                      {selected.indexOf(img._id) + 1}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
