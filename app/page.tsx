"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { PersonaCreateModal } from "@/components/PersonaCreateModal";

export default function Dashboard() {
  const personas = useQuery(api.personas.list);
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Personas</h1>
          <p className="mt-1 text-sm text-neutral-400">
            Choisis un persona pour gérer ses images et carrousels.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="rounded bg-orange-500 px-4 py-2 text-sm font-medium text-neutral-950 hover:bg-orange-400"
        >
          + Ajouter un persona
        </button>
      </div>

      {personas === undefined ? (
        <p className="text-sm text-neutral-500">Chargement…</p>
      ) : personas.length === 0 ? (
        <div className="rounded border border-dashed border-neutral-800 p-12 text-center">
          <p className="text-neutral-500">Aucun persona pour l&apos;instant.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {personas.map((p) => (
            <Link
              key={p._id}
              href={`/persona/${p._id}`}
              className="group overflow-hidden rounded-lg border border-neutral-800 bg-neutral-900 transition hover:border-orange-500/40"
            >
              <div className="relative aspect-[4/5] w-full bg-neutral-800">
                {p.referenceUrl && (
                  <Image
                    src={p.referenceUrl}
                    alt={p.name}
                    fill
                    sizes="(max-width: 640px) 100vw, 33vw"
                    className="object-cover"
                  />
                )}
              </div>
              <div className="space-y-2 p-4">
                <h3 className="text-base font-semibold">{p.name}</h3>
                <div className="flex flex-wrap gap-3 text-xs text-neutral-400">
                  <span>
                    <span className="text-orange-400">{p.availableCount}</span>{" "}
                    dispo
                  </span>
                  <span>
                    <span className="text-neutral-200">{p.totalImageCount}</span>{" "}
                    images
                  </span>
                  <span>
                    <span className="text-neutral-200">
                      {p.postedCarouselCount}
                    </span>{" "}
                    postés
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {showCreate && (
        <PersonaCreateModal onClose={() => setShowCreate(false)} />
      )}
    </div>
  );
}
