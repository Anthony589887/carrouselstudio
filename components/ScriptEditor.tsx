"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { ToastProvider, useToast } from "./Toast";

type Slide = {
  slot: number;
  role: string;
  visualPrompt: string;
  overlayText: string;
};

type Status = "draft" | "ready" | "generated" | "posted";
const STATUSES: Status[] = ["draft", "ready", "generated", "posted"];

type CreateProps = {
  mode: "create";
  initialFormatId: Id<"formats">;
  initialSlides: Slide[];
};

type EditProps = {
  mode: "edit";
  script: Doc<"scripts">;
};

type Props = CreateProps | EditProps;

export function ScriptEditor(props: Props) {
  return (
    <ToastProvider>
      <Inner {...props} />
    </ToastProvider>
  );
}

function Inner(props: Props) {
  const router = useRouter();
  const toast = useToast();
  const isEdit = props.mode === "edit";

  const initialName = isEdit ? props.script.name : "";
  const initialFormatId = isEdit ? props.script.formatId : props.initialFormatId;
  const initialPersonaId = isEdit ? props.script.preferredPersonaId : undefined;
  const initialStatus: Status = isEdit ? props.script.status : "draft";
  const initialNotes = isEdit ? (props.script.notes ?? "") : "";
  const initialOutfit = isEdit ? (props.script.outfitBrief ?? "") : "";
  const initialLocation = isEdit ? (props.script.locationBrief ?? "") : "";
  const initialSlides = isEdit ? props.script.slides : props.initialSlides;

  const [name, setName] = useState(initialName);
  const [formatId, setFormatId] = useState<Id<"formats">>(initialFormatId);
  const [personaId, setPersonaId] = useState<Id<"personas"> | "">(
    initialPersonaId ?? "",
  );
  const [status, setStatus] = useState<Status>(initialStatus);
  const [notes, setNotes] = useState(initialNotes);
  const [outfitBrief, setOutfitBrief] = useState(initialOutfit);
  const [locationBrief, setLocationBrief] = useState(initialLocation);
  const [slides, setSlides] = useState<Slide[]>(initialSlides);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formats = useQuery(api.formats.list);
  const personas = useQuery(api.personas.list);

  const createScript = useMutation(api.scripts.create);
  const updateScript = useMutation(api.scripts.update);
  const removeScript = useMutation(api.scripts.remove);

  const updateSlot = (slot: number, patch: Partial<Slide>) => {
    setSlides((prev) =>
      prev.map((s) => (s.slot === slot ? { ...s, ...patch } : s)),
    );
  };

  const handleFormatChange = (newId: Id<"formats">) => {
    if (newId === formatId) return;
    const newFormat = formats?.find((f) => f._id === newId);
    if (!newFormat) return;
    const ok = window.confirm(
      "Changer le format ré-initialisera les visual prompts des 6 slides depuis les nouveaux templates. Continuer ?",
    );
    if (!ok) return;
    setFormatId(newId);
    setSlides((prev) =>
      newFormat.slideTemplates.map((t) => ({
        slot: t.slot,
        role: t.role,
        visualPrompt: t.promptTemplate,
        overlayText: prev.find((s) => s.slot === t.slot)?.overlayText ?? "",
      })),
    );
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Nom requis");
      return;
    }
    if (!outfitBrief.trim()) {
      setError("Outfit brief requis");
      return;
    }
    if (!locationBrief.trim()) {
      setError("Location brief requis");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        formatId,
        preferredPersonaId: personaId || undefined,
        outfitBrief: outfitBrief.trim(),
        locationBrief: locationBrief.trim(),
        status,
        notes: notes.trim() || undefined,
        slides,
      };
      if (isEdit) {
        await updateScript({ id: props.script._id, ...payload });
        toast.push("success", `Script ${props.script.code} sauvegardé`);
      } else {
        await createScript(payload);
        toast.push("success", "Script créé");
      }
      router.push("/scripts");
    } catch (e) {
      const msg = (e as Error).message;
      setError(msg);
      toast.push("error", msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!isEdit) return;
    const ok = window.confirm(
      `Supprimer le script ${props.script.code} ?\nCette action est irréversible.`,
    );
    if (!ok) return;
    setSaving(true);
    try {
      await removeScript({ id: props.script._id });
      toast.push("success", `Script ${props.script.code} supprimé`);
      router.push("/scripts");
    } catch (e) {
      toast.push("error", (e as Error).message);
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href="/scripts"
        className="mb-6 inline-block text-sm text-neutral-500 hover:text-orange-400"
      >
        ← Scripts
      </Link>

      <h1 className="mb-8 text-2xl font-semibold">
        {isEdit
          ? `${props.script.code} — ${props.script.name || "(sans nom)"}`
          : "Nouveau script"}
      </h1>

      {/* Métadonnées */}
      <Section title="Métadonnées">
        {isEdit && (
          <Field label="Code">
            <input
              value={props.script.code}
              readOnly
              className="w-full rounded border border-neutral-800 bg-neutral-950 px-3 py-2 font-mono text-sm opacity-60"
            />
          </Field>
        )}
        <Field label="Nom">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="5 choses que personne ne te dit sur YouTube"
            className="w-full rounded border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm focus:border-orange-500/60 focus:outline-none"
          />
        </Field>
        <Field label="Format">
          <select
            value={formatId}
            onChange={(e) =>
              handleFormatChange(e.target.value as Id<"formats">)
            }
            className="w-full rounded border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm focus:border-orange-500/60 focus:outline-none"
          >
            {formats?.map((f) => (
              <option key={f._id} value={f._id}>
                {f.code} — {f.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Persona préféré (optionnel)">
          <select
            value={personaId}
            onChange={(e) =>
              setPersonaId(e.target.value as Id<"personas"> | "")
            }
            className="w-full rounded border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm focus:border-orange-500/60 focus:outline-none"
          >
            <option value="">— Aucun —</option>
            {personas?.map((p) => (
              <option key={p._id} value={p._id}>
                {p.code} — {p.ethnicity}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Status">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as Status)}
            className="w-full rounded border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm focus:border-orange-500/60 focus:outline-none"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
      </Section>

      <Section
        title={
          <>
            Outfit brief <span className="text-red-400">*</span>
          </>
        }
      >
        <textarea
          value={outfitBrief}
          onChange={(e) => setOutfitBrief(e.target.value)}
          rows={3}
          required
          placeholder='Exemple : "oversized brown faux fur coat, vintage yellow &quot;NEW YORK&quot; graphic t-shirt, baggy light-wash jeans, burgundy Adidas Samba sneakers, tortoise rectangular glasses, hair in a low bun"'
          className="w-full rounded border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm focus:border-orange-500/60 focus:outline-none"
        />
        <p className="text-xs text-neutral-500">
          Describe the complete outfit including accessories (earrings, hat,
          bag, etc.). This outfit is preserved exactly across all 6 slides of
          the carrousel.
        </p>
      </Section>

      <Section
        title={
          <>
            Location brief <span className="text-red-400">*</span>
          </>
        }
      >
        <textarea
          value={locationBrief}
          onChange={(e) => setLocationBrief(e.target.value)}
          rows={4}
          required
          placeholder='Exemple : "Paris, Rue de Rivoli café terrace, sunny late morning in May, wicker chairs and small round marble tables with espresso cups, warm direct sunlight with dappled shadows from the awning, Parisians walking by in spring coats."'
          className="w-full rounded border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm focus:border-orange-500/60 focus:outline-none"
        />
        <p className="text-xs text-neutral-500">
          Describe the location, atmosphere, and ambient light in rich prose.
          Mention the city/place, time of day, weather, light quality,
          surroundings, and any signature environmental details. This location
          is preserved exactly across all 6 slides of the carrousel.
        </p>
      </Section>

      <Section title="Les 6 slides du carrousel">
        <div className="flex flex-col gap-4">
          {slides.map((s) => (
            <div
              key={s.slot}
              className="rounded-lg border border-neutral-800 bg-neutral-950 p-4"
            >
              <div className="mb-3 flex items-center gap-3">
                <span className="font-mono text-sm text-orange-400">
                  Slide {s.slot}
                </span>
                <span className="text-neutral-600">·</span>
                <span className="text-sm text-neutral-400">{s.role}</span>
              </div>
              <label className="mb-1 block text-xs text-neutral-500">
                Visual prompt (envoyé à Gemini)
              </label>
              <textarea
                value={s.visualPrompt}
                onChange={(e) =>
                  updateSlot(s.slot, { visualPrompt: e.target.value })
                }
                rows={8}
                className="mb-3 w-full rounded border border-neutral-800 bg-neutral-900 px-3 py-2 font-mono text-xs leading-relaxed focus:border-orange-500/60 focus:outline-none"
              />
              <label className="mb-1 block text-xs text-neutral-500">
                Overlay text (ajouté manuellement au montage)
              </label>
              <textarea
                value={s.overlayText}
                onChange={(e) =>
                  updateSlot(s.slot, { overlayText: e.target.value })
                }
                rows={3}
                className="w-full rounded border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm focus:border-orange-500/60 focus:outline-none"
              />
            </div>
          ))}
        </div>
      </Section>

      <Section title="Notes (optionnel)">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full rounded border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm focus:border-orange-500/60 focus:outline-none"
        />
      </Section>

      {error && (
        <div className="mb-4 rounded border border-red-500/40 bg-red-500/5 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      <footer className="flex items-center justify-between border-t border-neutral-800 pt-6">
        <div>
          {isEdit && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={saving}
              className="rounded px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 disabled:opacity-50"
            >
              Supprimer
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <Link
            href="/scripts"
            className="rounded border border-neutral-700 px-4 py-2 text-sm hover:bg-neutral-800"
          >
            Annuler
          </Link>
          <button
            type="button"
            onClick={handleSave}
            disabled={
              saving ||
              !outfitBrief.trim() ||
              !locationBrief.trim() ||
              !name.trim()
            }
            className="rounded bg-orange-500 px-4 py-2 text-sm font-medium text-neutral-950 hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Enregistrement…" : isEdit ? "Sauvegarder" : "Créer"}
          </button>
        </div>
      </footer>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-6 rounded-lg border border-neutral-800 bg-neutral-900 p-5">
      <h2 className="mb-4 text-xs font-medium uppercase tracking-wide text-neutral-500">
        {title}
      </h2>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-neutral-500">{label}</span>
      {children}
    </label>
  );
}
