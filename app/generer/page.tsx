"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { SlideCard } from "@/components/generer/SlideCard";

export default function GenererPage() {
  const [formatId, setFormatId] = useState<Id<"formats"> | "">("");
  const [scriptId, setScriptId] = useState<Id<"scripts"> | "">("");
  const [personaId, setPersonaId] = useState<Id<"personas"> | "">("");
  const [generationId, setGenerationId] =
    useState<Id<"generations"> | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [processProgress, setProcessProgress] = useState<{
    done: number;
    total: number;
  } | null>(null);

  const formats = useQuery(api.formats.listActive);
  const personas = useQuery(api.personas.listActive);
  const scripts = useQuery(
    api.scripts.listForGeneration,
    formatId ? { formatId } : { formatId: undefined },
  );

  const generation = useQuery(
    api.generations.getWithUrls,
    generationId ? { generationId } : "skip",
  );

  const startGeneration = useMutation(api.generations.startGeneration);
  const retrySlide = useMutation(api.generations.retrySlide);

  const isInProgress =
    generation?.status === "pending" || generation?.status === "in_progress";
  const canStart =
    !!formatId && !!scriptId && !!personaId && !isInProgress;
  const failedSlots = useMemo(
    () =>
      generation?.slides.filter((s) => s.status === "failed").map((s) => s.slot) ??
      [],
    [generation],
  );

  const handleFormatChange = (value: string) => {
    setFormatId(value as Id<"formats"> | "");
    setScriptId("");
  };

  const handleStart = async () => {
    if (!scriptId || !personaId) return;
    try {
      const id = await startGeneration({ scriptId, personaId });
      setGenerationId(id);
    } catch (err) {
      alert(`Erreur lancement génération : ${(err as Error).message}`);
    }
  };

  const handleRetry = async (slot: number) => {
    if (!generationId) return;
    try {
      await retrySlide({ generationId, slot });
    } catch (err) {
      alert(`Erreur retry slot ${slot} : ${(err as Error).message}`);
    }
  };

  const handleRetryAll = async () => {
    for (const slot of failedSlots) {
      await handleRetry(slot);
    }
  };

  const handleNew = () => {
    setGenerationId(null);
    setFormatId("");
    setScriptId("");
    setPersonaId("");
  };

  const handleDownload = async () => {
    if (!generation || !generation.script || !generation.persona || !generation.format) return;
    if (!generationId) return;
    setDownloading(true);
    try {
      const completedSlides = generation.slides
        .filter((s) => s.status === "completed" && s.imageUrl)
        .sort((a, b) => a.slot - b.slot);

      // Sequential post-process via API route (Vercel sharp). Each call
      // returns the canonical URL of the post-processed image, used directly
      // for the ZIP build (no need to wait for Convex reactive refresh).
      setProcessProgress({ done: 0, total: completedSlides.length });
      const urlBySlot = new Map<number, string>();
      for (let i = 0; i < completedSlides.length; i++) {
        const slide = completedSlides[i];
        const res = await fetch("/api/postprocess", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ generationId, slot: slide.slot }),
        });
        if (!res.ok) {
          const err = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(
            `Post-process slot ${slide.slot} failed: ${err.error ?? res.statusText}`,
          );
        }
        const json = (await res.json()) as { imageUrl?: string | null };
        if (!json.imageUrl) {
          throw new Error(`Post-process slot ${slide.slot}: no URL returned`);
        }
        urlBySlot.set(slide.slot, json.imageUrl);
        setProcessProgress({ done: i + 1, total: completedSlides.length });
      }
      setProcessProgress(null);

      const slideRoles = new Map(
        generation.script.slides.map((s) => [s.slot, s.role]),
      );

      const blobs = await Promise.all(
        completedSlides.map(async (s) => {
          const url = urlBySlot.get(s.slot);
          if (!url) throw new Error(`Missing URL for slot ${s.slot}`);
          const res = await fetch(url);
          return {
            slot: s.slot,
            role: slideRoles.get(s.slot) ?? "slide",
            blob: await res.blob(),
          };
        }),
      );

      const zip = new JSZip();
      const account =
        generation.persona.tiktokAccount ?? generation.persona.code;
      const date = formatYYMMDD(new Date(generation.startedAt));
      const folderName = `${account}_${generation.format.code}_${generation.persona.code}_${date}`;
      const folder = zip.folder(folderName);
      if (!folder) throw new Error("Impossible de créer le dossier ZIP");

      for (const { slot, role, blob } of blobs) {
        const safeRole = role.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
        folder.file(`slide_${slot}_${safeRole}.jpg`, blob);
      }

      folder.file("overlays.txt", buildOverlaysTxt(generation));

      const zipBlob = await zip.generateAsync({ type: "blob" });
      saveAs(zipBlob, `${folderName}.zip`);
    } catch (err) {
      alert(`Erreur ZIP : ${(err as Error).message}`);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Générer un carrousel</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Sélectionne format, script, persona, puis lance.
        </p>
      </header>

      {/* Sélecteurs */}
      <div className="mb-6 flex flex-col gap-3 rounded-lg border border-neutral-800 bg-neutral-900 p-4 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="w-full sm:flex-1 sm:min-w-[180px]">
          <label className="mb-1 block text-xs text-neutral-500">Format</label>
          <select
            value={formatId}
            onChange={(e) => handleFormatChange(e.target.value)}
            disabled={isInProgress}
            className="w-full min-h-[44px] rounded border border-neutral-800 bg-neutral-950 px-3 py-2 text-base sm:text-sm focus:border-orange-500/60 focus:outline-none disabled:opacity-50"
          >
            <option value="">Choisir un format</option>
            {formats?.map((f) => (
              <option key={f._id} value={f._id}>
                {f.code} — {f.name}
              </option>
            ))}
          </select>
        </div>
        <div className="w-full sm:flex-1 sm:min-w-[180px]">
          <label className="mb-1 block text-xs text-neutral-500">Script</label>
          <select
            value={scriptId}
            onChange={(e) => setScriptId(e.target.value as Id<"scripts"> | "")}
            disabled={!formatId || isInProgress}
            className="w-full min-h-[44px] rounded border border-neutral-800 bg-neutral-950 px-3 py-2 text-base sm:text-sm focus:border-orange-500/60 focus:outline-none disabled:opacity-50"
          >
            <option value="">Choisir un script</option>
            {scripts?.map((s) => (
              <option key={s._id} value={s._id}>
                {s.code} — {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="w-full sm:flex-1 sm:min-w-[180px]">
          <label className="mb-1 block text-xs text-neutral-500">Persona</label>
          <select
            value={personaId}
            onChange={(e) =>
              setPersonaId(e.target.value as Id<"personas"> | "")
            }
            disabled={isInProgress}
            className="w-full min-h-[44px] rounded border border-neutral-800 bg-neutral-950 px-3 py-2 text-base sm:text-sm focus:border-orange-500/60 focus:outline-none disabled:opacity-50"
          >
            <option value="">Choisir un persona</option>
            {personas?.map((p) => (
              <option key={p._id} value={p._id}>
                {p.code} — {p.name}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={handleStart}
          disabled={!canStart}
          className="w-full min-h-[44px] rounded bg-orange-500 px-5 py-2 text-sm font-medium text-neutral-950 transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
        >
          {isInProgress ? "Génération en cours…" : "Générer"}
        </button>
      </div>

      {/* Grille 2x3 — locked across breakpoints */}
      {generation ? (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
            {generation.slides.map((s) => {
              const role =
                generation.script?.slides.find((sl) => sl.slot === s.slot)
                  ?.role ?? "—";
              const overlay = generation.script?.slides.find(
                (sl) => sl.slot === s.slot,
              )?.overlayText;
              return (
                <SlideCard
                  key={s.slot}
                  slot={s.slot}
                  role={role}
                  status={s.status}
                  imageUrl={s.imageUrl}
                  errorMessage={s.errorMessage}
                  overlayText={overlay}
                  onRetry={
                    s.status === "failed"
                      ? () => handleRetry(s.slot)
                      : undefined
                  }
                />
              );
            })}
          </div>

          <div className="flex flex-col gap-3 border-t border-neutral-800 pt-4 sm:flex-row sm:flex-wrap sm:items-center">
            {failedSlots.length > 0 && (
              <button
                type="button"
                onClick={handleRetryAll}
                className="w-full min-h-[44px] rounded border border-red-500/50 bg-red-500/10 px-4 py-2 text-sm text-red-300 hover:bg-red-500/20 sm:w-auto"
              >
                Retry toutes les failed ({failedSlots.length})
              </button>
            )}
            {generation.status === "completed" && (
              <button
                type="button"
                onClick={handleDownload}
                disabled={downloading}
                className="w-full min-h-[44px] rounded bg-orange-500 px-4 py-2 text-sm font-medium text-neutral-950 hover:bg-orange-400 disabled:opacity-50 sm:w-auto"
              >
                {processProgress
                  ? `Processing ${processProgress.done}/${processProgress.total}…`
                  : downloading
                    ? "Préparation ZIP…"
                    : "Download ZIP"}
              </button>
            )}
            <button
              type="button"
              onClick={handleNew}
              className="w-full min-h-[44px] rounded border border-neutral-700 px-4 py-2 text-sm hover:bg-neutral-800 sm:w-auto"
            >
              Nouvelle génération
            </button>
            <span className="text-xs text-neutral-500 sm:ml-auto">
              Status :{" "}
              <span className="font-mono text-neutral-300">
                {generation.status}
              </span>
            </span>
          </div>
        </>
      ) : (
        <div className="rounded-lg border border-dashed border-neutral-800 py-16 text-center text-sm text-neutral-500">
          Lance une génération pour voir les 6 slides apparaître ici.
        </div>
      )}
    </div>
  );
}

function formatYYMMDD(d: Date) {
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yy}${mm}${dd}`;
}

function buildOverlaysTxt(g: {
  startedAt: number;
  slides: { slot: number; status: string }[];
  script: { code: string; name: string; slides: { slot: number; role: string; overlayText: string }[] } | null;
  persona: { code: string; name: string } | null;
  format: { code: string; name: string } | null;
}): string {
  const date = new Date(g.startedAt);
  const isoDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;

  const skippedSlots = new Set(
    g.slides.filter((s) => s.status === "skipped").map((s) => s.slot),
  );

  const lines: string[] = [];
  if (g.script) lines.push(`${g.script.code} — ${g.script.name}`);
  if (g.format) lines.push(`Format: ${g.format.code} — ${g.format.name}`);
  if (g.persona) lines.push(`Persona: ${g.persona.code} — ${g.persona.name}`);
  lines.push(`Generated: ${isoDate}`);
  lines.push("");

  if (g.script) {
    const sortedSlides = [...g.script.slides].sort((a, b) => a.slot - b.slot);
    for (const s of sortedSlides) {
      const overlay = skippedSlots.has(s.slot) ? "(skipped)" : s.overlayText;
      lines.push(`Slide ${s.slot} (${s.role}): ${overlay}`);
    }
  }
  return lines.join("\n");
}

