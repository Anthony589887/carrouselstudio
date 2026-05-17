"use client";

import { useMemo, useState } from "react";

type Aspect = "4:5" | "9:16";

const MAX_FIELDS = 20;
const HARD_CAP = 50;
const PER_PROMPT_OPTIONS = [1, 2, 3, 5];

/**
 * Shared batch multi-prompt UI used by both the persona ImageGenerationPanel
 * and the SceneGenerationPanel "Prompt libre" tabs. Owns the field list,
 * aspect-ratio selector, advanced "images per prompt" toggle, the dynamic
 * counter and validation. The parent handles the actual mutation + toast +
 * close via `onGenerate`.
 */
export function BatchPromptFields({
  defaultAspect,
  unitLabel,
  firing,
  placeholder,
  onGenerate,
}: {
  defaultAspect: Aspect;
  // "image" | "scène" — used in the counter + button copy.
  unitLabel: string;
  firing: boolean;
  placeholder?: string;
  onGenerate: (
    prompts: string[],
    aspectRatio: Aspect,
    imagesPerPrompt: number,
  ) => void;
}) {
  const [prompts, setPrompts] = useState<string[]>([""]);
  const [aspectRatio, setAspectRatio] = useState<Aspect>(defaultAspect);
  const [advanced, setAdvanced] = useState(false);
  const [imagesPerPrompt, setImagesPerPrompt] = useState(1);

  const nonEmptyCount = useMemo(
    () => prompts.filter((p) => p.trim().length > 0).length,
    [prompts],
  );
  const perPrompt = advanced ? imagesPerPrompt : 1;
  const total = nonEmptyCount * perPrompt;
  const overCap = total > HARD_CAP;
  const noPrompt = nonEmptyCount === 0;

  const setPromptAt = (idx: number, value: string) => {
    setPrompts((prev) => prev.map((p, i) => (i === idx ? value : p)));
  };

  const addField = () => {
    setPrompts((prev) =>
      prev.length >= MAX_FIELDS ? prev : [...prev, ""],
    );
  };

  const removeField = (idx: number) => {
    setPrompts((prev) =>
      prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx),
    );
  };

  const handleGenerate = () => {
    if (noPrompt || overCap || firing) return;
    onGenerate(
      prompts.map((p) => p.trim()).filter((p) => p.length > 0),
      aspectRatio,
      perPrompt,
    );
  };

  const unitPlural = total > 1 ? `${unitLabel}s` : unitLabel;

  return (
    <div className="space-y-4 px-6 py-5">
      {/* === Prompt fields === */}
      <div className="space-y-3">
        {prompts.map((value, idx) => (
          <div key={idx}>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-xs uppercase tracking-wide text-neutral-500">
                Prompt {idx + 1}
              </label>
              <button
                type="button"
                onClick={() => removeField(idx)}
                disabled={prompts.length <= 1}
                title="Retirer ce prompt"
                className="rounded px-1.5 text-xs text-neutral-500 hover:text-red-300 disabled:opacity-30"
              >
                ✕
              </button>
            </div>
            <textarea
              value={value}
              onChange={(e) => setPromptAt(idx, e.target.value)}
              rows={3}
              maxLength={2000}
              placeholder={
                placeholder ??
                "Décris la situation / l'action…"
              }
              className="w-full rounded border border-neutral-800 bg-neutral-950 px-3 py-2 font-mono text-xs focus:border-orange-500/60 focus:outline-none"
            />
          </div>
        ))}
        {prompts.length < MAX_FIELDS && (
          <button
            type="button"
            onClick={addField}
            className="rounded border border-neutral-700 px-3 py-1.5 text-xs text-neutral-300 hover:border-orange-500/60 hover:text-orange-300"
          >
            + Ajouter un prompt
          </button>
        )}
        {prompts.length >= MAX_FIELDS && (
          <p className="text-[11px] text-neutral-500">
            Maximum {MAX_FIELDS} prompts par batch.
          </p>
        )}
      </div>

      {/* === Aspect ratio === */}
      <div>
        <label className="mb-2 block text-xs uppercase tracking-wide text-neutral-500">
          Format
        </label>
        <div className="flex gap-2">
          {(["4:5", "9:16"] as const).map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setAspectRatio(a)}
              className={`flex-1 rounded border px-3 py-2 text-sm transition ${
                aspectRatio === a
                  ? "border-orange-500/60 bg-orange-500/10 text-orange-300"
                  : "border-neutral-800 text-neutral-400 hover:border-neutral-700"
              }`}
            >
              {a === "4:5"
                ? "4:5  ·  Instagram (1080×1350)"
                : "9:16  ·  TikTok (1080×1920)"}
            </button>
          ))}
        </div>
      </div>

      {/* === Advanced: images per prompt === */}
      <div>
        <button
          type="button"
          onClick={() => setAdvanced((s) => !s)}
          className="text-sm text-neutral-300 hover:text-orange-300"
        >
          {advanced ? "▾" : "▸"} ⚙ Mode avancé (plusieurs images par prompt)
        </button>
        {advanced && (
          <div className="mt-3">
            <label className="mb-2 block text-xs uppercase tracking-wide text-neutral-500">
              Images par prompt
            </label>
            <div className="flex gap-2">
              {PER_PROMPT_OPTIONS.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setImagesPerPrompt(n)}
                  className={`flex-1 rounded border px-3 py-2 text-sm transition ${
                    imagesPerPrompt === n
                      ? "border-orange-500/60 bg-orange-500/10 text-orange-300"
                      : "border-neutral-800 text-neutral-400 hover:border-neutral-700"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* === Counter === */}
      <div
        className={`rounded border px-3 py-2 text-xs ${
          overCap
            ? "border-red-500/40 bg-red-500/5 text-red-300"
            : "border-neutral-800 bg-neutral-950 text-neutral-400"
        }`}
      >
        {noPrompt ? (
          <span>Saisis au moins un prompt.</span>
        ) : overCap ? (
          <span>
            Total : {total} {unitPlural} — au-delà de la limite de {HARD_CAP}.
            Réduis le nombre de prompts ou d&apos;images par prompt.
          </span>
        ) : (
          <span>
            Total à générer : <span className="text-orange-300">{total}</span>{" "}
            {unitPlural} ({nonEmptyCount} prompt
            {nonEmptyCount > 1 ? "s" : ""} × {perPrompt} image
            {perPrompt > 1 ? "s" : ""})
          </span>
        )}
      </div>

      {/* === Generate === */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={noPrompt || overCap || firing}
          title={noPrompt ? "Saisis au moins un prompt" : undefined}
          className="rounded bg-orange-500 px-4 py-1.5 text-sm font-medium text-neutral-950 hover:bg-orange-400 disabled:opacity-50"
        >
          {firing ? "Lancement…" : "Générer"}
        </button>
      </div>
    </div>
  );
}
