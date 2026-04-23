"use client";

import Image from "next/image";

type Status = "pending" | "generating" | "completed" | "failed";

type Props = {
  slot: number;
  role: string;
  status: Status;
  imageUrl: string | null;
  errorMessage?: string;
  overlayText?: string;
  onRetry?: () => void;
};

export function SlideCard({
  slot,
  role,
  status,
  imageUrl,
  errorMessage,
  overlayText,
  onRetry,
}: Props) {
  const truncatedOverlay =
    overlayText && overlayText.length > 80
      ? overlayText.slice(0, 80) + "…"
      : overlayText;

  const truncatedError =
    errorMessage && errorMessage.length > 100
      ? errorMessage.slice(0, 100) + "…"
      : errorMessage;

  return (
    <div className="overflow-hidden rounded-lg border border-neutral-800 bg-neutral-900">
      <header className="flex items-center justify-between border-b border-neutral-800 px-3 py-2 text-xs">
        <span>
          <span className="font-mono text-orange-400">Slide {slot}</span>
          <span className="text-neutral-500"> · {role}</span>
        </span>
        {status === "completed" && (
          <span className="text-emerald-400" aria-label="Terminé">✓</span>
        )}
      </header>

      <div className="relative aspect-[9/16] w-full bg-neutral-800">
        {status === "pending" && (
          <div className="flex h-full items-center justify-center text-xs text-neutral-500">
            En attente
          </div>
        )}
        {status === "generating" && (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-xs text-neutral-400">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
            <span>Génération…</span>
          </div>
        )}
        {status === "completed" && imageUrl && (
          <Image
            src={imageUrl}
            alt={`Slide ${slot}`}
            fill
            sizes="(max-width: 1024px) 50vw, 33vw"
            className="object-cover"
          />
        )}
        {status === "failed" && (
          <div className="flex h-full flex-col items-center justify-center gap-3 bg-red-500/10 p-3 text-center text-xs text-red-300">
            <span aria-hidden className="text-lg">⚠</span>
            <span className="line-clamp-3">{truncatedError ?? "Échec"}</span>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="rounded border border-red-500/50 bg-red-500/20 px-3 py-1 text-xs text-red-200 hover:bg-red-500/30"
              >
                Retry
              </button>
            )}
          </div>
        )}
      </div>

      {status === "completed" && truncatedOverlay && (
        <div className="border-t border-neutral-800 px-3 py-2 text-xs text-neutral-400">
          {truncatedOverlay}
        </div>
      )}
    </div>
  );
}
