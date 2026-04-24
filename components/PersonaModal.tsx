"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { useToast } from "./Toast";

type Mode =
  | { kind: "create" }
  | { kind: "edit"; persona: Doc<"personas"> };

type PhotoState =
  | { kind: "existing"; storageId: Id<"_storage"> }
  | { kind: "pending"; file: File; previewUrl: string }
  | { kind: "removed" }
  | { kind: "none" };

type Props = {
  mode: Mode;
  onClose: () => void;
};

const TIKTOK_RE = /^[a-zA-Z0-9._]*$/;

export function PersonaModal({ mode, onClose }: Props) {
  const isEdit = mode.kind === "edit";
  const initial = mode.kind === "edit" ? mode.persona : null;
  const toast = useToast();

  const [code, setCode] = useState(initial?.code ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [tiktokAccount, setTiktokAccount] = useState(
    initial?.tiktokAccount ?? "",
  );
  const [gender, setGender] = useState<"F" | "H">(initial?.gender ?? "F");
  const [age, setAge] = useState<number>(initial?.age ?? 25);
  const [ethnicity, setEthnicity] = useState(initial?.ethnicity ?? "");
  const [defaultDA, setDefaultDA] = useState(initial?.defaultDA ?? "");
  const [faceBlock, setFaceBlock] = useState(initial?.faceBlock ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");

  const [photoState, setPhotoState] = useState<PhotoState>(
    initial?.photoStorageId
      ? { kind: "existing", storageId: initial.photoStorageId }
      : { kind: "none" },
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  const existingPhotoUrl = useQuery(
    api.personas.getPhotoUrl,
    photoState.kind === "existing"
      ? { storageId: photoState.storageId }
      : "skip",
  );

  const previewUrl = useMemo(() => {
    if (photoState.kind === "pending") return photoState.previewUrl;
    if (photoState.kind === "existing") return existingPhotoUrl ?? null;
    return null;
  }, [photoState, existingPhotoUrl]);

  const createPersona = useMutation(api.personas.create);
  const updatePersona = useMutation(api.personas.update);
  const setPhoto = useMutation(api.personas.setPhoto);
  const clearPhoto = useMutation(api.personas.clearPhoto);
  const generateUploadUrl = useMutation(api.personas.generateUploadUrl);
  const removePersona = useMutation(api.personas.remove);

  // Focus + esc + scroll lock
  useEffect(() => {
    closeBtnRef.current?.focus();
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose, saving]);

  // Cleanup blob URLs
  useEffect(() => {
    return () => {
      if (photoState.kind === "pending") {
        URL.revokeObjectURL(photoState.previewUrl);
      }
    };
  }, [photoState]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (photoState.kind === "pending") {
      URL.revokeObjectURL(photoState.previewUrl);
    }
    setPhotoState({
      kind: "pending",
      file,
      previewUrl: URL.createObjectURL(file),
    });
  };

  const handleRemovePhoto = () => {
    if (photoState.kind === "pending") {
      URL.revokeObjectURL(photoState.previewUrl);
    }
    setPhotoState({ kind: "removed" });
  };

  const handleTiktokChange = (v: string) => {
    if (TIKTOK_RE.test(v) && v.length <= 24) setTiktokAccount(v);
  };

  const validate = (): string | null => {
    if (!code.trim()) return "Le code est requis";
    if (!name.trim()) return "Le nom est requis";
    if (!ethnicity.trim()) return "L'ethnicity est requise";
    if (!faceBlock.trim()) return "Le bloc descriptif est requis";
    if (age < 18 || age > 60) return "Age entre 18 et 60";
    return null;
  };

  const uploadPendingPhoto = async (
    file: File,
  ): Promise<Id<"_storage">> => {
    const url = await generateUploadUrl({});
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": file.type || "image/jpeg" },
      body: file,
    });
    if (!res.ok) throw new Error(`Upload échoué (${res.status})`);
    const { storageId } = (await res.json()) as { storageId: Id<"_storage"> };
    return storageId;
  };

  const handleSave = async () => {
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setSaving(true);

    try {
      if (mode.kind === "create") {
        const id = await createPersona({
          code: code.trim(),
          name: name.trim(),
          tiktokAccount: tiktokAccount.trim() || undefined,
          gender,
          ethnicity: ethnicity.trim(),
          age,
          faceBlock: faceBlock.trim(),
          defaultDA: defaultDA.trim() || undefined,
          notes: notes.trim() || undefined,
          isActive: true,
        });
        if (photoState.kind === "pending") {
          const storageId = await uploadPendingPhoto(photoState.file);
          await setPhoto({ id, storageId });
        }
        toast.push("success", `Persona ${code} créé`);
      } else {
        const id = mode.persona._id;
        await updatePersona({
          id,
          name: name.trim(),
          tiktokAccount: tiktokAccount.trim() || undefined,
          gender,
          ethnicity: ethnicity.trim(),
          age,
          faceBlock: faceBlock.trim(),
          defaultDA: defaultDA.trim() || undefined,
          notes: notes.trim() || undefined,
        });
        if (photoState.kind === "pending") {
          const storageId = await uploadPendingPhoto(photoState.file);
          await setPhoto({ id, storageId });
        } else if (photoState.kind === "removed") {
          await clearPhoto({ id });
        }
        toast.push("success", `Persona ${code} mis à jour`);
      }
      onClose();
    } catch (e) {
      const msg = (e as Error).message ?? "Erreur inconnue";
      setError(msg);
      toast.push("error", msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (mode.kind !== "edit") return;
    const ok = window.confirm(
      `Supprimer le persona ${mode.persona.code} — ${mode.persona.ethnicity} ?\n\nCette action est irréversible. Les scripts et générations liés à ce persona seront orphelins.`,
    );
    if (!ok) return;
    setSaving(true);
    try {
      await removePersona({ id: mode.persona._id });
      toast.push("success", `Persona ${mode.persona.code} supprimé`);
      onClose();
    } catch (e) {
      toast.push("error", (e as Error).message);
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-black/70 p-3 sm:p-6"
      onClick={() => {
        if (!saving) onClose();
      }}
    >
      <div
        className="relative w-full max-w-3xl rounded-lg border border-neutral-800 bg-neutral-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-neutral-800 px-6 py-4">
          <h2 className="text-lg font-semibold">
            {isEdit ? `Éditer ${initial?.code}` : "Nouveau persona"}
          </h2>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Fermer"
            className="rounded p-1 text-neutral-500 transition hover:bg-neutral-800 hover:text-neutral-100 disabled:opacity-50"
          >
            ×
          </button>
        </header>

        <div className="space-y-6 px-6 py-5">
          {/* Photo */}
          <section>
            <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-neutral-500">
              Photo de référence
            </label>
            <div className="flex items-start gap-4">
              <div className="relative h-40 w-28 overflow-hidden rounded border border-neutral-800 bg-neutral-800">
                {previewUrl ? (
                  <Image
                    src={previewUrl}
                    alt="Aperçu"
                    fill
                    sizes="112px"
                    className="object-cover"
                    unoptimized={photoState.kind === "pending"}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-2xl font-semibold text-orange-400">
                    {code || "?"}
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={saving}
                  className="rounded border border-neutral-700 px-3 py-1.5 text-xs hover:border-orange-500/60 hover:bg-neutral-800 disabled:opacity-50"
                >
                  {previewUrl ? "Changer" : "Choisir une photo"}
                </button>
                {previewUrl && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    disabled={saving}
                    className="rounded border border-neutral-700 px-3 py-1.5 text-xs text-red-400 hover:border-red-500/60 hover:bg-neutral-800 disabled:opacity-50"
                  >
                    Supprimer
                  </button>
                )}
                <p className="text-xs text-neutral-500">
                  Upload différé : envoyée à Convex au clic Sauvegarder.
                </p>
              </div>
            </div>
          </section>

          {/* Identification */}
          <section>
            <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-neutral-500">
              Identification
            </label>
            <div className="flex gap-3">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                readOnly={isEdit}
                placeholder="Code (F1, H2…)"
                className="w-24 rounded border border-neutral-800 bg-neutral-950 px-3 py-2 font-mono text-sm focus:border-orange-500/60 focus:outline-none read-only:opacity-60"
              />
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nom complet"
                className="flex-1 rounded border border-neutral-800 bg-neutral-950 px-3 py-2 text-base sm:text-sm focus:border-orange-500/60 focus:outline-none"
              />
            </div>
          </section>

          {/* TikTok */}
          <section>
            <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-neutral-500">
              Compte TikTok
            </label>
            <div className="flex overflow-hidden rounded border border-neutral-800 bg-neutral-950 focus-within:border-orange-500/60">
              <span className="border-r border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-500">
                @
              </span>
              <input
                value={tiktokAccount}
                onChange={(e) => handleTiktokChange(e.target.value)}
                placeholder="sara.virals"
                className="flex-1 bg-transparent px-3 py-2 text-sm focus:outline-none"
              />
            </div>
          </section>

          {/* Caractérisation */}
          <section>
            <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-neutral-500">
              Caractérisation
            </label>
            <div className="grid grid-cols-3 gap-3">
              <div className="flex overflow-hidden rounded border border-neutral-800">
                {(["F", "H"] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGender(g)}
                    className={`flex-1 px-3 py-2 text-sm transition ${
                      gender === g
                        ? "bg-orange-500/10 text-orange-400"
                        : "text-neutral-500 hover:bg-neutral-800"
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
              <input
                type="number"
                min={18}
                max={60}
                value={age}
                onChange={(e) => setAge(Number(e.target.value))}
                placeholder="Age"
                className="rounded border border-neutral-800 bg-neutral-950 px-3 py-2 text-base sm:text-sm focus:border-orange-500/60 focus:outline-none"
              />
              <input
                value={ethnicity}
                onChange={(e) => setEthnicity(e.target.value)}
                placeholder="Ethnicity"
                className="rounded border border-neutral-800 bg-neutral-950 px-3 py-2 text-base sm:text-sm focus:border-orange-500/60 focus:outline-none"
              />
            </div>
          </section>

          {/* DA */}
          <section>
            <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-neutral-500">
              DA par défaut
            </label>
            <input
              value={defaultDA}
              onChange={(e) => setDefaultDA(e.target.value)}
              placeholder="NYC night amateur"
              className="w-full rounded border border-neutral-800 bg-neutral-950 px-3 py-2 text-base sm:text-sm focus:border-orange-500/60 focus:outline-none"
            />
          </section>

          {/* Face block */}
          <section>
            <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-neutral-500">
              Bloc micro-descriptions faciales
            </label>
            <textarea
              value={faceBlock}
              onChange={(e) => setFaceBlock(e.target.value)}
              rows={6}
              placeholder="a 24-year-old woman with…"
              className="w-full rounded border border-neutral-800 bg-neutral-950 px-3 py-2 font-mono text-xs leading-relaxed focus:border-orange-500/60 focus:outline-none"
            />
            <p className="mt-1 text-xs text-neutral-500">
              ℹ️ Ce bloc est injecté dans chaque prompt de génération pour
              verrouiller le visage de ce persona.
            </p>
          </section>

          {/* Notes */}
          <section>
            <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-neutral-500">
              Notes (optionnel)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full rounded border border-neutral-800 bg-neutral-950 px-3 py-2 text-base sm:text-sm focus:border-orange-500/60 focus:outline-none"
            />
          </section>

          {error && (
            <div className="rounded border border-red-500/40 bg-red-500/5 px-3 py-2 text-sm text-red-300">
              {error}
            </div>
          )}
        </div>

        <footer className="flex items-center justify-between border-t border-neutral-800 px-6 py-4">
          <div>
            {isEdit && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={saving}
                className="rounded px-3 py-1.5 text-sm text-red-400 hover:bg-red-500/10 disabled:opacity-50"
              >
                Supprimer
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded border border-neutral-700 px-4 py-1.5 text-sm hover:bg-neutral-800 disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded bg-orange-500 px-4 py-1.5 text-sm font-medium text-neutral-950 hover:bg-orange-400 disabled:opacity-50"
            >
              {saving
                ? "Enregistrement…"
                : isEdit
                  ? "Sauvegarder"
                  : "Créer"}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
