"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function FormatsPage() {
  const formats = useQuery(api.formats.list);

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Formats</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {formats?.length ?? 0} formats narratifs pour tes carrousels
          </p>
        </div>
        <Link
          href="/formats/new"
          className="flex min-h-[44px] items-center justify-center rounded bg-orange-500 px-4 py-2 text-sm font-medium text-neutral-950 transition hover:bg-orange-400 sm:inline-flex"
        >
          + Nouveau format
        </Link>
      </header>

      {formats === undefined ? (
        <p className="text-sm text-neutral-500">Chargement…</p>
      ) : formats.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-neutral-800 py-20">
          <p className="mb-4 text-neutral-500">Aucun format pour l&apos;instant.</p>
          <Link
            href="/formats/new"
            className="rounded bg-orange-500 px-4 py-2 text-sm font-medium text-neutral-950 hover:bg-orange-400"
          >
            Créer ton premier format
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {formats.map((f) => (
            <Link
              key={f._id}
              href={`/formats/${f._id}`}
              className={`group flex items-center gap-4 rounded-lg border border-neutral-800 bg-neutral-900 p-5 transition hover:-translate-y-0.5 hover:border-orange-500/60 ${
                f.isActive ? "" : "opacity-50"
              }`}
            >
              <div className="flex-1">
                <div className="text-base">
                  <span className="font-mono font-semibold text-orange-400">
                    {f.code}
                  </span>
                  <span className="text-neutral-500"> · </span>
                  <span className="text-neutral-100">{f.name}</span>
                </div>
                <p className="mt-1 truncate text-sm italic text-neutral-500">
                  &ldquo;{f.archetype}&rdquo;
                </p>
                <p className="mt-1.5 text-xs text-neutral-500">
                  {f.slideTemplates.length} slide templates · {f.defaultDA}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`flex h-2 w-2 rounded-full ${
                    f.isActive ? "bg-orange-400" : "bg-neutral-600"
                  }`}
                  aria-label={f.isActive ? "Actif" : "Inactif"}
                />
                <span className="text-neutral-500 transition group-hover:text-orange-400">
                  →
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
