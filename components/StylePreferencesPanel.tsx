"use client";

import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useToast } from "@/components/Toast";

type EmotionWeights = {
  melancholic: number;
  energetic: number;
  confident: number;
  serene: number;
  tired: number;
};

type SpaceWeights = {
  "indoor-private": number;
  "indoor-public": number;
  "outdoor-urban": number;
  "outdoor-nature": number;
  transit: number;
  medical: number;
};

// The Convex schema declares these as `Record<string, number>` (because the
// validator rejects hyphens in object keys). We normalize at the boundary so
// the rest of the component can use the strongly-typed shapes above.
type StylePreferencesIn = {
  moodDescriptor?: string;
  emotionWeights?: Record<string, number>;
  spaceWeights?: Record<string, number>;
  registerWeights?: Record<string, number>;
};

type StylePreferencesOut = {
  moodDescriptor?: string;
  emotionWeights?: Record<string, number>;
  spaceWeights?: Record<string, number>;
};

const DEFAULT_EMOTION: EmotionWeights = {
  melancholic: 1.0,
  energetic: 1.0,
  confident: 1.0,
  serene: 1.0,
  tired: 1.0,
};

const DEFAULT_SPACE: SpaceWeights = {
  "indoor-private": 1.0,
  "indoor-public": 1.0,
  "outdoor-urban": 1.0,
  "outdoor-nature": 1.0,
  transit: 1.0,
  medical: 1.0,
};

const EMOTION_LABELS: Record<keyof EmotionWeights, string> = {
  melancholic: "Mélancolique",
  energetic: "Énergique",
  confident: "Confiant",
  serene: "Serein",
  tired: "Fatigué",
};

const SPACE_LABELS: Record<keyof SpaceWeights, string> = {
  "indoor-private": "Intérieur privé",
  "indoor-public": "Intérieur public",
  "outdoor-urban": "Extérieur urbain",
  "outdoor-nature": "Extérieur nature",
  transit: "Transit",
  medical: "Médical",
};

function normalizeEmo(input?: Record<string, number>): EmotionWeights {
  return {
    melancholic: input?.melancholic ?? 1.0,
    energetic: input?.energetic ?? 1.0,
    confident: input?.confident ?? 1.0,
    serene: input?.serene ?? 1.0,
    tired: input?.tired ?? 1.0,
  };
}

function normalizeSpa(input?: Record<string, number>): SpaceWeights {
  return {
    "indoor-private": input?.["indoor-private"] ?? 1.0,
    "indoor-public": input?.["indoor-public"] ?? 1.0,
    "outdoor-urban": input?.["outdoor-urban"] ?? 1.0,
    "outdoor-nature": input?.["outdoor-nature"] ?? 1.0,
    transit: input?.transit ?? 1.0,
    medical: input?.medical ?? 1.0,
  };
}

export function StylePreferencesPanel({
  personaId,
  initial,
}: {
  personaId: Id<"personas">;
  initial?: StylePreferencesIn;
}) {
  const updatePersona = useMutation(api.personas.update);
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [mood, setMood] = useState(initial?.moodDescriptor ?? "");
  const [emo, setEmo] = useState<EmotionWeights>(
    normalizeEmo(initial?.emotionWeights),
  );
  const [spa, setSpa] = useState<SpaceWeights>(
    normalizeSpa(initial?.spaceWeights),
  );

  // Re-sync drafts when the persona changes externally (e.g. seed migration ran).
  useEffect(() => {
    if (editing) return;
    setMood(initial?.moodDescriptor ?? "");
    setEmo(normalizeEmo(initial?.emotionWeights));
    setSpa(normalizeSpa(initial?.spaceWeights));
  }, [initial, editing]);

  const isDefaultEmo = (Object.keys(DEFAULT_EMOTION) as (keyof EmotionWeights)[])
    .every((k) => emo[k] === 1.0);
  const isDefaultSpa = (Object.keys(DEFAULT_SPACE) as (keyof SpaceWeights)[])
    .every((k) => spa[k] === 1.0);
  const isDefaultMood = !mood.trim();
  const allDefault = isDefaultEmo && isDefaultSpa && isDefaultMood;

  const summary = (() => {
    if (allDefault) return "Aucune préférence (tirage uniforme)";
    const parts: string[] = [];
    if (mood.trim()) {
      const short = mood.trim().slice(0, 60);
      parts.push(`mood: "${short}${mood.trim().length > 60 ? "…" : ""}"`);
    }
    const dominantEmo = (Object.entries(emo) as [keyof EmotionWeights, number][])
      .filter(([, v]) => v > 1.0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([k, v]) => `${EMOTION_LABELS[k]}×${v}`);
    if (dominantEmo.length > 0) parts.push(dominantEmo.join(", "));
    const dominantSpa = (Object.entries(spa) as [keyof SpaceWeights, number][])
      .filter(([, v]) => v > 1.0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([k, v]) => `${SPACE_LABELS[k]}×${v}`);
    if (dominantSpa.length > 0) parts.push(dominantSpa.join(", "));
    return parts.length ? parts.join(" · ") : "Préférences personnalisées";
  })();

  const save = async () => {
    try {
      const next: StylePreferencesOut = {};
      if (mood.trim()) next.moodDescriptor = mood.trim();
      if (!isDefaultEmo) next.emotionWeights = { ...emo };
      if (!isDefaultSpa) next.spaceWeights = { ...spa };
      await updatePersona({
        id: personaId,
        stylePreferences:
          Object.keys(next).length > 0 ? next : undefined,
      });
      toast.push("success", "Préférences de style sauvées");
      setEditing(false);
    } catch (e) {
      toast.push("error", (e as Error).message);
    }
  };

  const reset = () => {
    setMood("");
    setEmo(DEFAULT_EMOTION);
    setSpa(DEFAULT_SPACE);
  };

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-neutral-400 hover:border-orange-500/40 hover:text-neutral-200"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          <span className="text-neutral-500">{open ? "▾" : "▸"}</span>
          <span className="uppercase tracking-wide">
            Préférences de style (avancé)
          </span>
        </span>
        <span className="truncate text-[10px] text-neutral-500">{summary}</span>
      </button>

      {open && (
        <div className="mt-2 space-y-3 rounded border border-neutral-800 bg-neutral-950/50 p-3">
          {/* Mood descriptor */}
          <div>
            <label className="mb-1 block text-[10px] uppercase tracking-wide text-neutral-500">
              Mood descriptor (texte injecté dans le prompt)
            </label>
            {editing ? (
              <textarea
                value={mood}
                onChange={(e) => setMood(e.target.value)}
                rows={3}
                placeholder="Ex: Sad-girl aesthetic. Often melancholic, contemplative…"
                className="w-full rounded border border-neutral-800 bg-neutral-950 px-3 py-2 font-mono text-xs focus:border-orange-500/60 focus:outline-none"
              />
            ) : (
              <div
                onClick={() => setEditing(true)}
                className="cursor-pointer rounded border border-neutral-800 bg-neutral-950 px-3 py-2 font-mono text-xs text-neutral-300 hover:border-orange-500/40"
              >
                {mood ? (
                  mood
                ) : (
                  <span className="text-neutral-600">
                    (aucun — clique pour éditer)
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Emotion weights */}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-[10px] uppercase tracking-wide text-neutral-500">
                Pondérations émotions (1.0 = neutre)
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {(Object.keys(emo) as (keyof EmotionWeights)[]).map((k) => (
                <div key={k} className="space-y-1">
                  <label className="block text-[10px] text-neutral-400">
                    {EMOTION_LABELS[k]}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="5"
                    value={emo[k]}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      setEmo((prev) => ({
                        ...prev,
                        [k]: Number.isFinite(v) ? v : 1.0,
                      }));
                      setEditing(true);
                    }}
                    className="w-full rounded border border-neutral-800 bg-neutral-950 px-2 py-1 font-mono text-xs focus:border-orange-500/60 focus:outline-none"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Space weights */}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-[10px] uppercase tracking-wide text-neutral-500">
                Pondérations espaces (1.0 = neutre)
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {(Object.keys(spa) as (keyof SpaceWeights)[]).map((k) => (
                <div key={k} className="space-y-1">
                  <label className="block text-[10px] text-neutral-400">
                    {SPACE_LABELS[k]}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="5"
                    value={spa[k]}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      setSpa((prev) => ({
                        ...prev,
                        [k]: Number.isFinite(v) ? v : 1.0,
                      }));
                      setEditing(true);
                    }}
                    className="w-full rounded border border-neutral-800 bg-neutral-950 px-2 py-1 font-mono text-xs focus:border-orange-500/60 focus:outline-none"
                  />
                </div>
              ))}
            </div>
          </div>

          {editing && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={save}
                className="rounded bg-orange-500 px-3 py-1 text-xs font-medium text-neutral-950"
              >
                Sauver
              </button>
              <button
                onClick={() => {
                  setMood(initial?.moodDescriptor ?? "");
                  setEmo(normalizeEmo(initial?.emotionWeights));
                  setSpa(normalizeSpa(initial?.spaceWeights));
                  setEditing(false);
                }}
                className="rounded border border-neutral-700 px-3 py-1 text-xs"
              >
                Annuler
              </button>
              <button
                onClick={reset}
                className="ml-auto rounded border border-neutral-800 px-3 py-1 text-xs text-neutral-500 hover:text-neutral-300"
                title="Remet tout à 1.0 et vide le mood descriptor"
              >
                Reset
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
