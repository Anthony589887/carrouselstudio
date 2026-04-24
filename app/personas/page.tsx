"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { PersonaCard } from "@/components/PersonaCard";
import { PersonaModal } from "@/components/PersonaModal";
import { ToastProvider } from "@/components/Toast";

type ModalState =
  | { kind: "closed" }
  | { kind: "create" }
  | { kind: "edit"; persona: Doc<"personas"> };

export default function PersonasPage() {
  const personas = useQuery(api.personas.list);
  const [modal, setModal] = useState<ModalState>({ kind: "closed" });

  return (
    <ToastProvider>
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Personas</h1>
            <p className="mt-1 text-sm text-neutral-500">
              {personas?.length ?? 0} identités visuelles pour tes comptes
              TikTok
            </p>
          </div>
          <button
            type="button"
            onClick={() => setModal({ kind: "create" })}
            className="min-h-[44px] rounded bg-orange-500 px-4 py-2 text-sm font-medium text-neutral-950 transition hover:bg-orange-400 sm:inline-flex sm:items-center sm:justify-center"
          >
            + Nouveau persona
          </button>
        </header>

        {personas === undefined ? (
          <p className="text-sm text-neutral-500">Chargement…</p>
        ) : personas.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-neutral-800 py-20">
            <p className="mb-4 text-neutral-500">Aucun persona pour l&apos;instant.</p>
            <button
              type="button"
              onClick={() => setModal({ kind: "create" })}
              className="rounded bg-orange-500 px-4 py-2 text-sm font-medium text-neutral-950 hover:bg-orange-400"
            >
              Créer ton premier persona
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {personas.map((p) => (
              <PersonaCard
                key={p._id}
                persona={p}
                onClick={() => setModal({ kind: "edit", persona: p })}
              />
            ))}
          </div>
        )}

        {modal.kind !== "closed" && (
          <PersonaModal
            mode={
              modal.kind === "create"
                ? { kind: "create" }
                : { kind: "edit", persona: modal.persona }
            }
            onClose={() => setModal({ kind: "closed" })}
          />
        )}
      </div>
    </ToastProvider>
  );
}
