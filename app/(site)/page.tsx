"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { PersonaCreateModal } from "@/components/PersonaCreateModal";
import { useToast } from "@/components/Toast";

type Failure = { imageId: string; error: string };

type ChunkResult = {
  processed: number;
  success: number;
  failed: number;
  failures: Failure[];
  offset: number;
  limit: number;
  totalImages: number;
  hasMore: boolean;
  nextOffset: number | null;
};

type AggregatedResult = {
  total: number;
  success: number;
  failed: number;
  failures: Failure[];
};

const CHUNK_SIZE = 50;

export default function Dashboard() {
  const personas = useQuery(api.personas.list);
  const reprocessAll = useAction(api.imageReprocess.reprocessAllExisting);
  const toast = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [reprocessing, setReprocessing] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<AggregatedResult | null>(null);

  const handleReprocess = async () => {
    const ok = window.confirm(
      "Cette opération va re-post-processer toutes les images existantes. Elle prendra plusieurs minutes (orchestrée en chunks de 50). Continuer ?",
    );
    if (!ok) return;
    setReprocessing(true);
    setLastResult(null);
    setProgress("Démarrage…");
    toast.push("info", "Reprocessing en cours…");

    let offset = 0;
    let totalSuccess = 0;
    let totalFailed = 0;
    let totalImages = 0;
    const allFailures: Failure[] = [];

    try {
      while (true) {
        setProgress(
          totalImages
            ? `Reprocessing… ${offset} / ${totalImages}`
            : `Reprocessing… offset ${offset}`,
        );
        const result = (await reprocessAll({
          siteUrl: window.location.origin,
          offset,
          limit: CHUNK_SIZE,
        })) as ChunkResult;

        totalSuccess += result.success;
        totalFailed += result.failed;
        totalImages = result.totalImages;
        if (result.failures.length > 0 && allFailures.length < 20) {
          allFailures.push(
            ...result.failures.slice(0, 20 - allFailures.length),
          );
        }

        if (!result.hasMore || result.nextOffset === null) {
          break;
        }
        offset = result.nextOffset;
      }

      setLastResult({
        total: totalImages,
        success: totalSuccess,
        failed: totalFailed,
        failures: allFailures,
      });
      toast.push(
        totalFailed === 0 ? "success" : "info",
        `Reprocessé : ${totalSuccess} / ${totalImages}. Échecs : ${totalFailed}.`,
      );
    } catch (e) {
      toast.push("error", (e as Error).message);
      // Persist what we have so the user sees partial progress
      setLastResult({
        total: totalImages || offset + CHUNK_SIZE,
        success: totalSuccess,
        failed: totalFailed,
        failures: allFailures,
      });
    } finally {
      setReprocessing(false);
      setProgress(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Personas</h1>
          <p className="mt-1 text-sm text-neutral-400">
            Choisis un persona pour gérer ses images et carrousels.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="rounded bg-orange-500 px-4 py-2 text-sm font-medium text-neutral-950 hover:bg-orange-400"
        >
          + Ajouter un persona
        </button>
      </div>

      {personas === undefined ? (
        <p className="text-sm text-neutral-500">Chargement…</p>
      ) : personas.length === 0 ? (
        <div className="rounded border border-dashed border-neutral-800 p-12 text-center">
          <p className="text-neutral-500">Aucun persona pour l&apos;instant.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {personas.map((p) => (
            <Link
              key={p._id}
              href={`/persona/${p._id}`}
              className="group overflow-hidden rounded-lg border border-neutral-800 bg-neutral-900 transition hover:border-orange-500/40"
            >
              <div className="relative aspect-[4/5] w-full bg-neutral-800">
                {p.referenceUrl && (
                  <Image
                    src={p.referenceUrl}
                    alt={p.name}
                    fill
                    sizes="(max-width: 640px) 100vw, 33vw"
                    className="object-cover"
                  />
                )}
              </div>
              <div className="space-y-2 p-4">
                <h3 className="text-base font-semibold">{p.name}</h3>
                <div className="flex flex-wrap gap-3 text-xs text-neutral-400">
                  <span>
                    <span className="text-orange-400">{p.availableCount}</span>{" "}
                    dispo
                  </span>
                  <span>
                    <span className="text-neutral-200">{p.totalImageCount}</span>{" "}
                    images
                  </span>
                  <span>
                    <span className="text-neutral-200">
                      {p.postedCarouselCount}
                    </span>{" "}
                    postés
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* === Admin footer === */}
      <footer className="mt-12 border-t border-neutral-900 pt-6 text-xs text-neutral-500">
        <p className="mb-2 uppercase tracking-wide">Admin</p>
        <button
          onClick={handleReprocess}
          disabled={reprocessing}
          className="rounded border border-neutral-800 px-3 py-1.5 text-xs text-neutral-400 hover:border-orange-500/40 hover:text-orange-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {reprocessing
            ? (progress ?? "Reprocessing en cours…")
            : "Reprocesser toutes les images (admin)"}
        </button>
        {lastResult && (
          <div className="mt-3 rounded border border-neutral-800 bg-neutral-950 p-3">
            <p className="text-xs text-neutral-300">
              Dernier batch : <span className="text-green-300">{lastResult.success}</span> /{" "}
              {lastResult.total} reprocessées.{" "}
              {lastResult.failed > 0 && (
                <span className="text-red-300">{lastResult.failed} échecs.</span>
              )}
            </p>
            {lastResult.failures.length > 0 && (
              <details className="mt-2">
                <summary className="cursor-pointer text-[11px] text-neutral-500 hover:text-neutral-300">
                  Voir les {lastResult.failures.length} premiers échecs
                </summary>
                <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto font-mono text-[10px] text-red-300">
                  {lastResult.failures.map((f) => (
                    <li key={f.imageId} className="truncate">
                      {f.imageId.slice(-6)} — {f.error}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}
      </footer>

      {showCreate && (
        <PersonaCreateModal onClose={() => setShowCreate(false)} />
      )}
    </div>
  );
}
