"use client";

import Image from "next/image";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { useToast } from "./Toast";

type Props = {
  persona: Doc<"personas">;
  onClick: () => void;
};

export function PersonaCard({ persona, onClick }: Props) {
  const photoUrl = useQuery(
    api.personas.getPhotoUrl,
    persona.photoStorageId ? { storageId: persona.photoStorageId } : "skip",
  );
  const toggleActive = useMutation(api.personas.toggleActive);
  const toast = useToast();

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await toggleActive({ id: persona._id });
    } catch (err) {
      toast.push("error", `Erreur toggle : ${(err as Error).message}`);
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex flex-col overflow-hidden rounded-lg border border-neutral-800 bg-neutral-900 text-left transition hover:-translate-y-0.5 hover:border-orange-500/60 ${
        persona.isActive ? "" : "opacity-50"
      }`}
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-neutral-800">
        {photoUrl ? (
          <Image
            src={photoUrl}
            alt={persona.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <span className="text-5xl font-semibold text-orange-400">
              {persona.code}
            </span>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-center gap-2 text-xs text-neutral-500">
          <span className="font-mono text-orange-400">{persona.code}</span>
          {persona.tiktokAccount && (
            <>
              <span>·</span>
              <span>@{persona.tiktokAccount}</span>
            </>
          )}
        </div>
        <div className="text-base font-medium text-neutral-100">
          {persona.ethnicity}
        </div>
        <div className="text-xs text-neutral-500">
          {persona.age} ans
          {persona.defaultDA && ` · ${persona.defaultDA}`}
        </div>
        <div className="mt-auto flex items-center justify-end pt-2">
          <span
            role="switch"
            aria-checked={persona.isActive}
            aria-label={persona.isActive ? "Désactiver" : "Activer"}
            onClick={handleToggle}
            className={`flex cursor-pointer items-center gap-2 rounded-full px-2.5 py-1 text-xs transition ${
              persona.isActive
                ? "bg-orange-500/10 text-orange-400 hover:bg-orange-500/20"
                : "bg-neutral-800 text-neutral-500 hover:bg-neutral-700"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                persona.isActive ? "bg-orange-400" : "bg-neutral-500"
              }`}
            />
            {persona.isActive ? "Actif" : "Inactif"}
          </span>
        </div>
      </div>
    </button>
  );
}
