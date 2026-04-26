"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useToast } from "./Toast";

export function PostCarouselModal({
  carouselId,
  onClose,
}: {
  carouselId: Id<"carousels">;
  onClose: () => void;
}) {
  const toast = useToast();
  const markAsPosted = useMutation(api.carousels.markAsPosted);
  const [tiktokLink, setTiktokLink] = useState("");
  const [instagramLink, setInstagramLink] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await markAsPosted({
        id: carouselId,
        tiktokLink: tiktokLink.trim() || undefined,
        instagramLink: instagramLink.trim() || undefined,
      });
      toast.push("success", "Carrousel marqué comme posté");
      onClose();
    } catch (e) {
      toast.push("error", (e as Error).message);
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-black/70 p-3 sm:p-6"
      onClick={() => !saving && onClose()}
    >
      <div
        className="w-full max-w-md rounded-lg border border-neutral-800 bg-neutral-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="border-b border-neutral-800 px-6 py-4">
          <h2 className="text-lg font-semibold">Marquer comme posté</h2>
        </header>
        <div className="space-y-4 px-6 py-5">
          <div>
            <label className="mb-2 block text-xs uppercase tracking-wide text-neutral-500">
              Lien TikTok
            </label>
            <input
              value={tiktokLink}
              onChange={(e) => setTiktokLink(e.target.value)}
              placeholder="https://tiktok.com/..."
              className="w-full rounded border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm focus:border-orange-500/60 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-2 block text-xs uppercase tracking-wide text-neutral-500">
              Lien Instagram
            </label>
            <input
              value={instagramLink}
              onChange={(e) => setInstagramLink(e.target.value)}
              placeholder="https://instagram.com/..."
              className="w-full rounded border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm focus:border-orange-500/60 focus:outline-none"
            />
          </div>
        </div>
        <footer className="flex justify-end gap-2 border-t border-neutral-800 px-6 py-4">
          <button
            onClick={onClose}
            disabled={saving}
            className="rounded border border-neutral-700 px-4 py-1.5 text-sm hover:bg-neutral-800"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded bg-orange-500 px-4 py-1.5 text-sm font-medium text-neutral-950 hover:bg-orange-400 disabled:opacity-50"
          >
            {saving ? "Enregistrement…" : "Valider"}
          </button>
        </footer>
      </div>
    </div>
  );
}
