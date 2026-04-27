"use client";

import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useToast } from "./Toast";

type Props =
  | {
      mode: "create";
      personaId: Id<"personas">;
      onClose: () => void;
    }
  | {
      mode: "rename";
      folderId: Id<"folders">;
      currentName: string;
      onClose: () => void;
    };

export function FolderModal(props: Props) {
  const toast = useToast();
  const [name, setName] = useState(
    props.mode === "rename" ? props.currentName : "",
  );
  const [saving, setSaving] = useState(false);

  const createFolder = useMutation(api.folders.create);
  const renameFolder = useMutation(api.folders.rename);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      if (props.mode === "create") {
        await createFolder({ personaId: props.personaId, name: trimmed });
        toast.push("success", `Dossier "${trimmed}" créé`);
      } else {
        await renameFolder({ folderId: props.folderId, name: trimmed });
        toast.push("success", "Dossier renommé");
      }
      props.onClose();
    } catch (e) {
      toast.push("error", (e as Error).message);
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-black/70 p-3 sm:p-6"
      onClick={() => !saving && props.onClose()}
    >
      <div
        className="mt-20 w-full max-w-md rounded-lg border border-neutral-800 bg-neutral-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="border-b border-neutral-800 px-5 py-3">
          <h2 className="text-base font-semibold">
            {props.mode === "create" ? "Nouveau dossier" : "Renommer le dossier"}
          </h2>
        </header>
        <div className="px-5 py-4">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
              if (e.key === "Escape") props.onClose();
            }}
            placeholder="Nom du dossier"
            maxLength={80}
            className="w-full rounded border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm focus:border-orange-500/60 focus:outline-none"
          />
        </div>
        <footer className="flex justify-end gap-2 border-t border-neutral-800 px-5 py-3">
          <button
            onClick={props.onClose}
            disabled={saving}
            className="rounded border border-neutral-700 px-3 py-1.5 text-xs hover:bg-neutral-800"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="rounded bg-orange-500 px-3 py-1.5 text-xs font-medium text-neutral-950 hover:bg-orange-400 disabled:opacity-50"
          >
            {saving
              ? "…"
              : props.mode === "create"
                ? "Créer"
                : "Renommer"}
          </button>
        </footer>
      </div>
    </div>
  );
}
