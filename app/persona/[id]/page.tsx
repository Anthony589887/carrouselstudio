"use client";

import Image from "next/image";
import Link from "next/link";
import { use, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { IMAGE_TYPES } from "@/lib/imageTypes";
import { ImageGenerationPanel } from "@/components/ImageGenerationPanel";
import { PostCarouselModal } from "@/components/PostCarouselModal";
import { useToast } from "@/components/Toast";

export default function PersonaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const personaId = id as Id<"personas">;
  const toast = useToast();

  const persona = useQuery(api.personas.get, { id: personaId });
  const [typeFilter, setTypeFilter] = useState<string[]>([]);
  const [includeUsed, setIncludeUsed] = useState(false);

  const images = useQuery(api.images.list, {
    personaId,
    types: typeFilter.length > 0 ? typeFilter : undefined,
    includeUsed,
  });
  const carousels = useQuery(api.carousels.listByPersona, { personaId });

  const updatePersona = useMutation(api.personas.update);
  const removeImage = useMutation(api.images.remove);

  const [editingDescription, setEditingDescription] = useState(false);
  const [descriptionDraft, setDescriptionDraft] = useState("");
  const [showGenPanel, setShowGenPanel] = useState(false);
  const [postingId, setPostingId] = useState<Id<"carousels"> | null>(null);

  if (persona === undefined) return <p className="text-neutral-500">Chargement…</p>;
  if (persona === null) return <p className="text-red-400">Persona introuvable.</p>;

  const startEditDescription = () => {
    setDescriptionDraft(persona.identityDescription);
    setEditingDescription(true);
  };

  const saveDescription = async () => {
    await updatePersona({ id: personaId, identityDescription: descriptionDraft });
    toast.push("success", "Description mise à jour");
    setEditingDescription(false);
  };

  const handleDeleteImage = async (imageId: Id<"images">) => {
    if (!confirm("Supprimer cette image ?")) return;
    await removeImage({ id: imageId });
    toast.push("success", "Image supprimée");
  };

  const toggleType = (t: string) => {
    setTypeFilter((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t],
    );
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
            {persona.tiktokAccount && <span>TikTok: {persona.tiktokAccount}</span>}
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

        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-xs text-neutral-400">
            <input
              type="checkbox"
              checked={includeUsed}
              onChange={(e) => setIncludeUsed(e.target.checked)}
            />
            Inclure les images utilisées
          </label>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {IMAGE_TYPES.map((t) => {
            const active = typeFilter.includes(t);
            return (
              <button
                key={t}
                onClick={() => toggleType(t)}
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
          {typeFilter.length > 0 && (
            <button
              onClick={() => setTypeFilter([])}
              className="rounded px-2 py-1 text-[10px] text-neutral-500 hover:text-neutral-300"
            >
              clear
            </button>
          )}
        </div>

        {images === undefined ? (
          <p className="text-sm text-neutral-500">Chargement…</p>
        ) : images.length === 0 ? (
          <div className="rounded border border-dashed border-neutral-800 p-12 text-center text-sm text-neutral-500">
            Aucune image. Génère ta première batch.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {images.map((img) => (
              <div
                key={img._id}
                className="group relative overflow-hidden rounded border border-neutral-800 bg-neutral-900"
              >
                <div className="relative aspect-[4/5] w-full bg-neutral-800">
                  {img.imageUrl && (
                    <Image
                      src={img.imageUrl}
                      alt={img.type}
                      fill
                      sizes="(max-width: 640px) 50vw, 20vw"
                      className="object-cover"
                    />
                  )}
                </div>
                <div className="flex items-center justify-between gap-1 p-1.5 text-[10px]">
                  <span className="truncate font-mono text-neutral-400">
                    {img.type}
                  </span>
                  <span
                    className={`rounded px-1 py-0.5 ${
                      img.status === "available"
                        ? "bg-green-500/15 text-green-300"
                        : "bg-orange-500/15 text-orange-300"
                    }`}
                  >
                    {img.status}
                  </span>
                </div>
                <button
                  onClick={() => handleDeleteImage(img._id)}
                  className="absolute right-1 top-1 hidden rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-red-300 hover:bg-red-500/30 group-hover:block"
                >
                  ×
                </button>
              </div>
            ))}
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
                          alt={img.type}
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
