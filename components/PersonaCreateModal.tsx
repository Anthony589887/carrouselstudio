"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useToast } from "./Toast";

export function PersonaCreateModal({ onClose }: { onClose: () => void }) {
  const toast = useToast();
  const [name, setName] = useState("");
  const [identityDescription, setIdentityDescription] = useState("");
  const [signatureFeatures, setSignatureFeatures] = useState("");
  const [tiktokAccount, setTiktokAccount] = useState("");
  const [instagramAccount, setInstagramAccount] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateUploadUrl = useMutation(api.personas.generateUploadUrl);
  const createPersona = useMutation(api.personas.create);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
  };

  const handleSave = async () => {
    if (!name.trim()) return setError("Nom requis");
    if (!identityDescription.trim())
      return setError("Description d'identité requise");
    if (!file) return setError("Photo de référence requise");
    setError(null);
    setSaving(true);
    try {
      const url = await generateUploadUrl({});
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": file.type || "image/jpeg" },
        body: file,
      });
      if (!res.ok) throw new Error(`Upload échoué (${res.status})`);
      const { storageId } = (await res.json()) as {
        storageId: Id<"_storage">;
      };
      await createPersona({
        name: name.trim(),
        identityDescription: identityDescription.trim(),
        signatureFeatures: signatureFeatures.trim() || undefined,
        referenceImageStorageId: storageId,
        tiktokAccount: tiktokAccount.trim() || undefined,
        instagramAccount: instagramAccount.trim() || undefined,
      });
      toast.push("success", `Persona ${name} créé`);
      onClose();
    } catch (e) {
      const msg = (e as Error).message;
      setError(msg);
      toast.push("error", msg);
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-black/70 p-3 sm:p-6"
      onClick={() => !saving && onClose()}
    >
      <div
        className="w-full max-w-2xl rounded-lg border border-neutral-800 bg-neutral-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-neutral-800 px-6 py-4">
          <h2 className="text-lg font-semibold">Nouveau persona</h2>
          <button
            onClick={onClose}
            disabled={saving}
            className="rounded p-1 text-neutral-500 hover:bg-neutral-800"
          >
            ×
          </button>
        </header>

        <div className="space-y-5 px-6 py-5">
          <div>
            <label className="mb-2 block text-xs uppercase tracking-wide text-neutral-500">
              Photo de référence
            </label>
            <div className="flex items-start gap-4">
              <div className="relative h-40 w-32 overflow-hidden rounded border border-neutral-800 bg-neutral-800">
                {previewUrl ? (
                  <Image
                    src={previewUrl}
                    alt="Aperçu"
                    fill
                    sizes="128px"
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-3xl text-orange-400">
                    ?
                  </div>
                )}
              </div>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFile}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded border border-neutral-700 px-3 py-1.5 text-xs hover:border-orange-500/60"
                >
                  {previewUrl ? "Changer" : "Choisir"}
                </button>
                <p className="mt-2 text-xs text-neutral-500">
                  Cette image sert d&apos;ancrage visuel pour Gemini.
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs uppercase tracking-wide text-neutral-500">
              Nom
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Clara"
              className="w-full rounded border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm focus:border-orange-500/60 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs uppercase tracking-wide text-neutral-500">
              Description d&apos;identité
            </label>
            <textarea
              value={identityDescription}
              onChange={(e) => setIdentityDescription(e.target.value)}
              rows={6}
              placeholder="A 24-year-old woman with..."
              className="w-full rounded border border-neutral-800 bg-neutral-950 px-3 py-2 font-mono text-xs leading-relaxed focus:border-orange-500/60 focus:outline-none"
            />
            <p className="mt-1 text-xs text-neutral-500">
              Traits du visage, peau, cheveux, morphologie, âge — injectés dans
              chaque génération.
            </p>
          </div>

          <div>
            <label className="mb-2 block text-xs uppercase tracking-wide text-neutral-500">
              Traits distinctifs (optionnel)
            </label>
            <textarea
              value={signatureFeatures}
              onChange={(e) => setSignatureFeatures(e.target.value)}
              rows={3}
              maxLength={2000}
              placeholder="Pour les traits physiques rares à maintenir à travers les générations (vitiligo, taches de naissance distinctives, cicatrices marquées, etc.). Décris précisément la localisation, la forme et la couleur. Laisse vide si le persona n'a pas de trait distinctif rare."
              className="w-full rounded border border-neutral-800 bg-neutral-950 px-3 py-2 font-mono text-xs leading-relaxed focus:border-orange-500/60 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-2 block text-xs uppercase tracking-wide text-neutral-500">
                TikTok
              </label>
              <input
                value={tiktokAccount}
                onChange={(e) => setTiktokAccount(e.target.value)}
                placeholder="@clara"
                className="w-full rounded border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm focus:border-orange-500/60 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs uppercase tracking-wide text-neutral-500">
                Instagram
              </label>
              <input
                value={instagramAccount}
                onChange={(e) => setInstagramAccount(e.target.value)}
                placeholder="@clara"
                className="w-full rounded border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm focus:border-orange-500/60 focus:outline-none"
              />
            </div>
          </div>

          {error && (
            <div className="rounded border border-red-500/40 bg-red-500/5 px-3 py-2 text-sm text-red-300">
              {error}
            </div>
          )}
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
            {saving ? "Création…" : "Créer"}
          </button>
        </footer>
      </div>
    </div>
  );
}
