"use client";

import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useToast } from "@/components/Toast";
import { Tooltip } from "@/components/Tooltip";

// === Types ================================================================

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

type WeightLevel = "rare" | "normal" | "frequent";

// === Constants ============================================================

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

// Mood suggestions: clicking pre-fills the textarea with the matching preset.
// "Custom..." sets it back to empty for free-form input.
const MOOD_SUGGESTIONS: Array<{ label: string; preset: string | null }> = [
  {
    label: "Sad-girl mélancolique",
    preset:
      "Sad-girl aesthetic. Often melancholic, contemplative, alone in private spaces. Soft moments more than party moments.",
  },
  {
    label: "Confiante body-positive",
    preset: "Confident, body-positive, often outdoors. Warm and grounded.",
  },
  {
    label: "Looksmaxxing serious",
    preset: "Looksmaxxing serious. Quiet confidence, often alone, contemplative.",
  },
  {
    label: "Social urbain casual",
    preset: "Casual social, often with friends, urban lifestyle.",
  },
  { label: "Custom...", preset: null },
];

const EMOTION_META: Record<
  keyof EmotionWeights,
  { label: string; tooltip: string }
> = {
  melancholic: {
    label: "Mélancolique",
    tooltip:
      "Émotions tristes, contemplatives, fatiguées. Ex: regard vide, larmes retenues, tristesse contenue.",
  },
  energetic: {
    label: "Énergique",
    tooltip:
      "Émotions actives, animées. Ex: parle à la caméra, mid-rant, explication animée.",
  },
  confident: {
    label: "Confiant",
    tooltip:
      "Émotions confiantes, posées. Ex: regard direct, demi-sourire, fierté contenue.",
  },
  serene: {
    label: "Serein",
    tooltip:
      "Émotions calmes, douces. Ex: sourire fermé, visage relax, contentement.",
  },
  tired: {
    label: "Fatigué",
    tooltip:
      "Émotions de fatigue physique. Ex: bâillement, gueule de bois, post-séance.",
  },
};

// Grouped UI for spaces. The 6 backend keys collapse to 4 user-facing groups:
// "outdoor" pilots both `outdoor-urban` and `outdoor-nature`. `medical` is not
// surfaced in the simplified UI — it stays at 1.0 by default and is editable
// via the advanced mode if needed.
type SpaceGroupId = "home" | "public" | "outdoor" | "transit";

const SPACE_GROUPS: Array<{
  id: SpaceGroupId;
  label: string;
  tooltip: string;
  keys: ReadonlyArray<keyof SpaceWeights>;
}> = [
  {
    id: "home",
    label: "Chez soi",
    tooltip:
      "Chambre, salon, salle de bain, cuisine, espaces privés.",
    keys: ["indoor-private"],
  },
  {
    id: "public",
    label: "Lieux publics",
    tooltip:
      "Cafés, restaurants, magasins, salles de sport, lieux fermés publics.",
    keys: ["indoor-public"],
  },
  {
    id: "outdoor",
    label: "Extérieur (rue, nature)",
    tooltip:
      "Rue, ville, parc, nature. Tout ce qui est à l'extérieur.",
    keys: ["outdoor-urban", "outdoor-nature"],
  },
  {
    id: "transit",
    label: "Transport",
    tooltip:
      "Voiture, métro, bus, Uber, train. Espaces de déplacement.",
    keys: ["transit"],
  },
];

const SPACE_NUMERIC_LABELS: Record<keyof SpaceWeights, string> = {
  "indoor-private": "Intérieur privé",
  "indoor-public": "Intérieur public",
  "outdoor-urban": "Extérieur urbain",
  "outdoor-nature": "Extérieur nature",
  transit: "Transit",
  medical: "Médical",
};

const LEVEL_OPTIONS: ReadonlyArray<{ value: WeightLevel; label: string }> = [
  { value: "rare", label: "Rare" },
  { value: "normal", label: "Normal" },
  { value: "frequent", label: "Fréquent" },
];

// === Conversion helpers ===================================================

function numericToLevel(value: number): WeightLevel {
  if (value <= 0.75) return "rare";
  if (value >= 1.5) return "frequent";
  return "normal";
}

function levelToNumeric(level: WeightLevel): number {
  switch (level) {
    case "rare":
      return 0.5;
    case "normal":
      return 1.0;
    case "frequent":
      return 2.0;
  }
}

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

// A suggestion button is "active" only when the textarea text matches its
// preset exactly. Custom text (non-empty, no preset match) returns null —
// no button is highlighted (per spec test 6: "plus aucun bouton n'est actif
// en mode custom"). The "Custom..." button is a one-shot trigger that clears
// the textarea, never a state indicator.
function detectActiveSuggestion(currentMood: string): string | null {
  const trimmed = currentMood.trim();
  if (trimmed.length === 0) return null;
  for (const sug of MOOD_SUGGESTIONS) {
    if (sug.preset !== null && sug.preset === trimmed) return sug.label;
  }
  return null;
}

// === Sub-components =======================================================

// Wraps the new Tooltip popover. Replaces the previous native `title=` based
// implementation, which had a 1s desktop delay and didn't work on mobile.
// Hover, click, and Escape all work; the popover stays open while the cursor
// is on the trigger or the popover itself.
function InfoTooltip({
  text,
  position,
}: {
  text: string;
  position?: "top" | "bottom";
}) {
  return (
    <Tooltip content={text} position={position}>
      <span
        aria-label={text}
        className="ml-1 select-none text-[11px] leading-none text-neutral-500 hover:text-neutral-200"
      >
        ⓘ
      </span>
    </Tooltip>
  );
}

function RadioGroup<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: ReadonlyArray<{ value: T; label: string }>;
}) {
  return (
    <div className="flex shrink-0 gap-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`rounded border px-2 py-0.5 text-[10px] font-medium transition ${
            value === opt.value
              ? "border-orange-500 bg-orange-500/20 text-orange-200"
              : "border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-600 hover:text-neutral-200"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// === Main panel ===========================================================

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
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [editing, setEditing] = useState(false);
  const [mood, setMood] = useState(initial?.moodDescriptor ?? "");
  const [emo, setEmo] = useState<EmotionWeights>(
    normalizeEmo(initial?.emotionWeights),
  );
  const [spa, setSpa] = useState<SpaceWeights>(
    normalizeSpa(initial?.spaceWeights),
  );

  // Re-sync drafts when persona changes externally and we're not actively
  // editing (e.g. seed migration ran, persona reloaded after navigation).
  useEffect(() => {
    if (editing) return;
    setMood(initial?.moodDescriptor ?? "");
    setEmo(normalizeEmo(initial?.emotionWeights));
    setSpa(normalizeSpa(initial?.spaceWeights));
  }, [initial, editing]);

  const isDefaultEmo = (
    Object.keys(DEFAULT_EMOTION) as Array<keyof EmotionWeights>
  ).every((k) => emo[k] === 1.0);
  const isDefaultSpa = (
    Object.keys(DEFAULT_SPACE) as Array<keyof SpaceWeights>
  ).every((k) => spa[k] === 1.0);
  const isDefaultMood = !mood.trim();
  const allDefault = isDefaultEmo && isDefaultSpa && isDefaultMood;

  const summary = (() => {
    if (allDefault) return "Aucune préférence (tirage uniforme)";
    const parts: string[] = [];
    if (mood.trim()) {
      const short = mood.trim().slice(0, 60);
      parts.push(
        `mood: "${short}${mood.trim().length > 60 ? "…" : ""}"`,
      );
    }
    const dominantEmo = (
      Object.entries(emo) as Array<[keyof EmotionWeights, number]>
    )
      .filter(([, v]) => v > 1.0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([k]) => EMOTION_META[k].label);
    if (dominantEmo.length > 0) parts.push(`+ ${dominantEmo.join(", ")}`);
    return parts.length ? parts.join(" · ") : "Préférences personnalisées";
  })();

  const activeSuggestion = detectActiveSuggestion(mood);

  // === Setters that mark editing ===

  const setEmoLevel = (key: keyof EmotionWeights, level: WeightLevel) => {
    setEmo((prev) => ({ ...prev, [key]: levelToNumeric(level) }));
    setEditing(true);
  };

  const setSpaceGroupLevel = (groupId: SpaceGroupId, level: WeightLevel) => {
    const value = levelToNumeric(level);
    setSpa((prev) => {
      const group = SPACE_GROUPS.find((g) => g.id === groupId);
      if (!group) return prev;
      const next: SpaceWeights = { ...prev };
      for (const k of group.keys) next[k] = value;
      return next;
    });
    setEditing(true);
  };

  const getSpaceGroupLevel = (groupId: SpaceGroupId): WeightLevel => {
    const group = SPACE_GROUPS.find((g) => g.id === groupId);
    if (!group || group.keys.length === 0) return "normal";
    // Use the first key as canonical reference. When set via the grouped UI,
    // all keys in the group hold the same value. If they diverge (e.g. via
    // advanced mode editing only one of `outdoor-urban` / `outdoor-nature`),
    // we read the first one.
    return numericToLevel(spa[group.keys[0]]);
  };

  const applySuggestion = (label: string) => {
    const found = MOOD_SUGGESTIONS.find((s) => s.label === label);
    if (!found) return;
    if (found.preset === null) {
      // Custom: clear the textarea per spec ("ne pré-remplit rien").
      setMood("");
    } else {
      setMood(found.preset);
    }
    setEditing(true);
  };

  const setEmoNumeric = (key: keyof EmotionWeights, raw: number) => {
    setEmo((prev) => ({
      ...prev,
      [key]: Number.isFinite(raw) ? raw : 1.0,
    }));
    setEditing(true);
  };

  const setSpaNumeric = (key: keyof SpaceWeights, raw: number) => {
    setSpa((prev) => ({
      ...prev,
      [key]: Number.isFinite(raw) ? raw : 1.0,
    }));
    setEditing(true);
  };

  // === Save / cancel / reset ===

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

  const cancel = () => {
    setMood(initial?.moodDescriptor ?? "");
    setEmo(normalizeEmo(initial?.emotionWeights));
    setSpa(normalizeSpa(initial?.spaceWeights));
    setEditing(false);
  };

  const reset = () => {
    setMood("");
    setEmo(DEFAULT_EMOTION);
    setSpa(DEFAULT_SPACE);
    setEditing(true);
  };

  // === Render ===

  return (
    <div>
      {/* Collapsible header */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 rounded border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-neutral-400 hover:border-orange-500/40 hover:text-neutral-200"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          <span className="text-neutral-500">{open ? "▾" : "▸"}</span>
          <span className="uppercase tracking-wide">
            Préférences de style (avancé)
          </span>
          <InfoTooltip text="Donne une personnalité visuelle distincte à ce persona. Le pipe priorisera certains types d'images au moment de la génération random." />
        </span>
        <span className="truncate text-[10px] text-neutral-500">{summary}</span>
      </button>

      {open && (
        <div className="mt-2 space-y-4 rounded border border-neutral-800 bg-neutral-950/50 p-3">
          {/* Section 1 — Mood descriptor */}
          <div>
            <label className="mb-2 flex items-center text-[11px] uppercase tracking-wide text-neutral-400">
              Quel est le mood général de ce persona ?
              <InfoTooltip text="Cette phrase est injectée dans chaque prompt envoyé à l'IA pour orienter le rendu. Sois descriptif et concis." />
            </label>
            <div className="mb-2 flex flex-wrap gap-1.5">
              {MOOD_SUGGESTIONS.map((sug) => {
                const isActive = activeSuggestion === sug.label;
                return (
                  <button
                    key={sug.label}
                    type="button"
                    onClick={() => applySuggestion(sug.label)}
                    className={`rounded border px-2 py-1 text-[10px] transition ${
                      isActive
                        ? "border-orange-500 bg-orange-500/20 text-orange-200"
                        : "border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-600 hover:text-neutral-200"
                    }`}
                  >
                    {sug.label}
                  </button>
                );
              })}
            </div>
            <textarea
              value={mood}
              onChange={(e) => {
                setMood(e.target.value);
                setEditing(true);
              }}
              rows={3}
              placeholder="Décris en une phrase la personnalité visuelle de ce persona."
              className="w-full rounded border border-neutral-800 bg-neutral-950 px-3 py-2 font-mono text-xs focus:border-orange-500/60 focus:outline-none"
            />
          </div>

          <div className="border-t border-neutral-800/50" />

          {/* Section 2 — Emotion weights */}
          <div>
            <label className="mb-2 flex items-center text-[11px] uppercase tracking-wide text-neutral-400">
              Émotions à privilégier
              <InfoTooltip text="Détermine quelles émotions seront tirées plus ou moins souvent. 'Rare' = presque jamais, 'Fréquent' = beaucoup plus souvent que la moyenne." />
            </label>
            <div className="space-y-1.5">
              {(
                Object.keys(EMOTION_META) as Array<keyof EmotionWeights>
              ).map((k) => (
                <div
                  key={k}
                  className="flex items-center justify-between gap-2"
                >
                  <span className="flex items-center text-xs text-neutral-300">
                    {EMOTION_META[k].label}
                    <InfoTooltip text={EMOTION_META[k].tooltip} />
                  </span>
                  <RadioGroup
                    value={numericToLevel(emo[k])}
                    onChange={(v) => setEmoLevel(k, v)}
                    options={LEVEL_OPTIONS}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-neutral-800/50" />

          {/* Section 3 — Space weights */}
          <div>
            <label className="mb-2 flex items-center text-[11px] uppercase tracking-wide text-neutral-400">
              Où ce persona passe le plus de temps ?
              <InfoTooltip text="Détermine quels lieux apparaissent plus ou moins souvent dans les images générées." />
            </label>
            <div className="space-y-1.5">
              {SPACE_GROUPS.map((g) => (
                <div
                  key={g.id}
                  className="flex items-center justify-between gap-2"
                >
                  <span className="flex items-center text-xs text-neutral-300">
                    {g.label}
                    <InfoTooltip text={g.tooltip} />
                  </span>
                  <RadioGroup
                    value={getSpaceGroupLevel(g.id)}
                    onChange={(v) => setSpaceGroupLevel(g.id, v)}
                    options={LEVEL_OPTIONS}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-neutral-800/50" />

          {/* Section 4 — Advanced mode toggle */}
          <div>
            <button
              type="button"
              onClick={() => setShowAdvanced((v) => !v)}
              className="text-[11px] text-neutral-500 hover:text-orange-300"
            >
              {showAdvanced ? "▾" : "▸"} ⚙ Mode avancé (chiffres exacts)
            </button>
            {showAdvanced && (
              <div className="mt-3 space-y-3 rounded border border-neutral-800 bg-neutral-950/30 p-3">
                <div className="text-[10px] uppercase tracking-wide text-neutral-500">
                  Réglages avancés (1.0 = neutre, plage 0.0–5.0)
                </div>
                <div>
                  <div className="mb-1 text-[10px] text-neutral-500">
                    Émotions
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                    {(
                      Object.keys(emo) as Array<keyof EmotionWeights>
                    ).map((k) => (
                      <div key={k} className="space-y-1">
                        <label className="block text-[10px] text-neutral-400">
                          {EMOTION_META[k].label}
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="5"
                          value={emo[k]}
                          onChange={(e) =>
                            setEmoNumeric(k, parseFloat(e.target.value))
                          }
                          className="w-full rounded border border-neutral-800 bg-neutral-950 px-2 py-1 font-mono text-xs focus:border-orange-500/60 focus:outline-none"
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mb-1 text-[10px] text-neutral-500">
                    Espaces (les 6 clés backend, dont `medical` non exposé en
                    mode normal)
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {(Object.keys(spa) as Array<keyof SpaceWeights>).map(
                      (k) => (
                        <div key={k} className="space-y-1">
                          <label className="block text-[10px] text-neutral-400">
                            {SPACE_NUMERIC_LABELS[k]}
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="5"
                            value={spa[k]}
                            onChange={(e) =>
                              setSpaNumeric(k, parseFloat(e.target.value))
                            }
                            className="w-full rounded border border-neutral-800 bg-neutral-950 px-2 py-1 font-mono text-xs focus:border-orange-500/60 focus:outline-none"
                          />
                        </div>
                      ),
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section 5 — Footer */}
          <div className="flex flex-wrap gap-2 border-t border-neutral-800/50 pt-3">
            <button
              type="button"
              onClick={save}
              disabled={!editing}
              className="rounded bg-orange-500 px-3 py-1 text-xs font-medium text-neutral-950 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Enregistrer
            </button>
            <button
              type="button"
              onClick={cancel}
              disabled={!editing}
              className="rounded border border-neutral-700 px-3 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={reset}
              className="ml-auto rounded border border-neutral-800 px-3 py-1 text-xs text-neutral-500 hover:text-neutral-300"
              title="Remet tout à 1.0 et vide le mood descriptor"
            >
              Réinitialiser
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
