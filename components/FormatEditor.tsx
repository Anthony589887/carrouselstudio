"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { ToastProvider, useToast } from "./Toast";

type SlideTemplate = {
  slot: number;
  role: string;
  promptTemplate: string;
  notes?: string;
};

const DEFAULT_ROLES = [
  "cover",
  "rupture",
  "marche",
  "close-up",
  "produit",
  "clôture",
];

const blankTemplates = (): SlideTemplate[] =>
  DEFAULT_ROLES.map((role, i) => ({
    slot: i + 1,
    role,
    promptTemplate: "",
    notes: "",
  }));

const CODE_RE = /^F\d{2}$/;

type Props = { initial?: Doc<"formats"> };

export function FormatEditor({ initial }: Props) {
  return (
    <ToastProvider>
      <Inner initial={initial} />
    </ToastProvider>
  );
}

function Inner({ initial }: Props) {
  const router = useRouter();
  const toast = useToast();
  const isEdit = !!initial;

  const [code, setCode] = useState(initial?.code ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [archetype, setArchetype] = useState(initial?.archetype ?? "");
  const [defaultDA, setDefaultDA] = useState(initial?.defaultDA ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [slideTemplates, setSlideTemplates] = useState<SlideTemplate[]>(() => {
    const base = blankTemplates();
    if (!initial) return base;
    return base.map(
      (b) =>
        initial.slideTemplates.find((s) => s.slot === b.slot) ?? b,
    );
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createFormat = useMutation(api.formats.create);
  const updateFormat = useMutation(api.formats.update);
  const removeFormat = useMutation(api.formats.remove);

  const updateSlot = (slot: number, patch: Partial<SlideTemplate>) => {
    setSlideTemplates((prev) =>
      prev.map((s) => (s.slot === slot ? { ...s, ...patch } : s)),
    );
  };

  const validate = (): string | null => {
    if (!code.trim()) return "Code requis";
    if (!isEdit && !CODE_RE.test(code.trim()))
      return "Code doit matcher F01, F02, etc.";
    if (!name.trim()) return "Nom requis";
    if (!archetype.trim()) return "Archetype requis";
    if (!defaultDA.trim()) return "DA par défaut requise";
    return null;
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
      const payload = {
        name: name.trim(),
        archetype: archetype.trim(),
        defaultDA: defaultDA.trim(),
        description: description.trim() || undefined,
        slideTemplates: slideTemplates.map((s) => ({
          slot: s.slot,
          role: s.role.trim() || `slot-${s.slot}`,
          promptTemplate: s.promptTemplate,
          notes: s.notes?.trim() || undefined,
        })),
      };
      if (isEdit && initial) {
        await updateFormat({ id: initial._id, ...payload, isActive });
        toast.push("success", `Format ${initial.code} sauvegardé`);
      } else {
        await createFormat({
          code: code.trim(),
          ...payload,
          isActive,
        });
        toast.push("success", `Format ${code} créé`);
      }
      router.push("/formats");
    } catch (e) {
      const msg = (e as Error).message;
      setError(msg);
      toast.push("error", msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!initial) return;
    const ok = window.confirm(
      `Supprimer le format ${initial.code} ?\nLes scripts liés deviendront orphelins.`,
    );
    if (!ok) return;
    setSaving(true);
    try {
      await removeFormat({ id: initial._id });
      toast.push("success", `Format ${initial.code} supprimé`);
      router.push("/formats");
    } catch (e) {
      toast.push("error", (e as Error).message);
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href="/formats"
        className="mb-6 inline-block text-sm text-neutral-500 hover:text-orange-400"
      >
        ← Formats
      </Link>

      <h1 className="mb-8 text-2xl font-semibold">
        {isEdit ? `${initial.code} — ${initial.name}` : "Nouveau format"}
      </h1>

      {/* Métadonnées */}
      <Section title="Métadonnées">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[120px_1fr]">
          <Field label="Code">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              readOnly={isEdit}
              placeholder="F01"
              className="w-full rounded border border-neutral-800 bg-neutral-950 px-3 py-2 font-mono text-sm focus:border-orange-500/60 focus:outline-none read-only:opacity-60"
            />
          </Field>
          <Field label="Nom">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded border border-neutral-800 bg-neutral-950 px-3 py-2 text-base sm:text-sm focus:border-orange-500/60 focus:outline-none"
            />
          </Field>
        </div>
        <Field label="Archetype">
          <input
            value={archetype}
            onChange={(e) => setArchetype(e.target.value)}
            placeholder="I did X for Y time, here's what I learned"
            className="w-full rounded border border-neutral-800 bg-neutral-950 px-3 py-2 text-base sm:text-sm focus:border-orange-500/60 focus:outline-none"
          />
        </Field>
        <Field label="Default DA">
          <input
            value={defaultDA}
            onChange={(e) => setDefaultDA(e.target.value)}
            placeholder="NYC night amateur"
            className="w-full rounded border border-neutral-800 bg-neutral-950 px-3 py-2 text-base sm:text-sm focus:border-orange-500/60 focus:outline-none"
          />
        </Field>
        <Field label="Actif">
          <button
            type="button"
            onClick={() => setIsActive((v) => !v)}
            className={`flex w-fit items-center gap-2 rounded-full px-3 py-1 text-xs ${
              isActive
                ? "bg-orange-500/10 text-orange-400"
                : "bg-neutral-800 text-neutral-500"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-orange-400" : "bg-neutral-500"}`}
            />
            {isActive ? "Actif" : "Inactif"}
          </button>
        </Field>
      </Section>

      <Section title="Description">
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full rounded border border-neutral-800 bg-neutral-950 px-3 py-2 text-base sm:text-sm focus:border-orange-500/60 focus:outline-none"
        />
      </Section>

      <Section title={`Slide templates (${slideTemplates.length})`}>
        <div className="flex flex-col gap-4">
          {slideTemplates.map((s) => (
            <div
              key={s.slot}
              className="rounded-lg border border-neutral-800 bg-neutral-950 p-4"
            >
              <div className="mb-3 flex items-center gap-3">
                <span className="font-mono text-sm text-orange-400">
                  Slot {s.slot}
                </span>
                <span className="text-neutral-600">·</span>
                <input
                  value={s.role}
                  onChange={(e) =>
                    updateSlot(s.slot, { role: e.target.value })
                  }
                  className="flex-1 rounded border border-neutral-800 bg-neutral-900 px-2 py-1 text-sm focus:border-orange-500/60 focus:outline-none"
                />
              </div>
              <label className="mb-1 block text-xs text-neutral-500">
                Prompt template
              </label>
              <textarea
                value={s.promptTemplate}
                onChange={(e) =>
                  updateSlot(s.slot, { promptTemplate: e.target.value })
                }
                rows={8}
                className="mb-3 w-full rounded border border-neutral-800 bg-neutral-900 px-3 py-2 font-mono text-xs leading-relaxed focus:border-orange-500/60 focus:outline-none"
              />
              <label className="mb-1 block text-xs text-neutral-500">
                Notes
              </label>
              <textarea
                value={s.notes ?? ""}
                onChange={(e) => updateSlot(s.slot, { notes: e.target.value })}
                rows={2}
                className="w-full rounded border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs focus:border-orange-500/60 focus:outline-none"
              />
            </div>
          ))}
        </div>
      </Section>

      {error && (
        <div className="mb-4 rounded border border-red-500/40 bg-red-500/5 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      <footer className="flex flex-col gap-3 border-t border-neutral-800 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          {isEdit && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={saving}
              className="w-full min-h-[44px] rounded px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 disabled:opacity-50 sm:w-auto"
            >
              Supprimer
            </button>
          )}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link
            href="/formats"
            className="flex min-h-[44px] items-center justify-center rounded border border-neutral-700 px-4 py-2 text-sm hover:bg-neutral-800 sm:inline-flex"
          >
            Annuler
          </Link>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="min-h-[44px] rounded bg-orange-500 px-4 py-2 text-sm font-medium text-neutral-950 hover:bg-orange-400 disabled:opacity-50"
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
  title: string;
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
