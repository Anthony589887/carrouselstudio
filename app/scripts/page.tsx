"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { StatusBadge } from "@/components/StatusBadge";

type Status = "draft" | "ready" | "generated" | "posted";
const STATUSES: Status[] = ["draft", "ready", "generated", "posted"];

export default function ScriptsPage() {
  const scripts = useQuery(api.scripts.list, {});
  const formats = useQuery(api.formats.list);

  const [formatFilter, setFormatFilter] = useState<"all" | Id<"formats">>(
    "all",
  );
  const [statusFilter, setStatusFilter] = useState<"all" | Status>("all");
  const [search, setSearch] = useState("");

  const formatByCode = useMemo(() => {
    const map = new Map<Id<"formats">, string>();
    formats?.forEach((f) => map.set(f._id, f.code));
    return map;
  }, [formats]);

  const filtered = useMemo(() => {
    if (!scripts) return [];
    const q = search.trim().toLowerCase();
    return scripts
      .filter((s) => formatFilter === "all" || s.formatId === formatFilter)
      .filter((s) => statusFilter === "all" || s.status === statusFilter)
      .filter((s) => !q || s.name.toLowerCase().includes(q))
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [scripts, formatFilter, statusFilter, search]);

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Scripts</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Carrousels prêts à générer
          </p>
        </div>
        <Link
          href="/scripts/new"
          className="flex min-h-[44px] items-center justify-center rounded bg-orange-500 px-4 py-2 text-sm font-medium text-neutral-950 transition hover:bg-orange-400 sm:inline-flex"
        >
          + Nouveau script
        </Link>
      </header>

      {/* Filtres */}
      <div className="mb-6 flex flex-col gap-3 rounded-lg border border-neutral-800 bg-neutral-900 p-4 sm:flex-row sm:flex-wrap sm:items-end sm:gap-4">
        <div className="w-full sm:w-auto">
          <label className="mb-1 block text-xs text-neutral-500">Format</label>
          <select
            value={formatFilter}
            onChange={(e) =>
              setFormatFilter(
                e.target.value === "all"
                  ? "all"
                  : (e.target.value as Id<"formats">),
              )
            }
            className="w-full min-h-[44px] rounded border border-neutral-800 bg-neutral-950 px-3 py-1.5 text-base sm:w-auto sm:text-sm focus:border-orange-500/60 focus:outline-none"
          >
            <option value="all">Tous</option>
            {formats?.map((f) => (
              <option key={f._id} value={f._id}>
                {f.code} — {f.name}
              </option>
            ))}
          </select>
        </div>
        <div className="w-full sm:w-auto">
          <label className="mb-1 block text-xs text-neutral-500">Status</label>
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as "all" | Status)
            }
            className="w-full min-h-[44px] rounded border border-neutral-800 bg-neutral-950 px-3 py-1.5 text-base sm:w-auto sm:text-sm focus:border-orange-500/60 focus:outline-none"
          >
            <option value="all">Tous</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="w-full sm:flex-1 sm:min-w-[200px]">
          <label className="mb-1 block text-xs text-neutral-500">
            Recherche
          </label>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nom du script…"
            className="w-full min-h-[44px] rounded border border-neutral-800 bg-neutral-950 px-3 py-1.5 text-base sm:text-sm focus:border-orange-500/60 focus:outline-none"
          />
        </div>
      </div>

      {scripts === undefined ? (
        <p className="text-sm text-neutral-500">Chargement…</p>
      ) : scripts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-neutral-800 py-20">
          <p className="mb-4 text-neutral-500">Aucun script pour l&apos;instant.</p>
          <Link
            href="/scripts/new"
            className="rounded bg-orange-500 px-4 py-2 text-sm font-medium text-neutral-950 hover:bg-orange-400"
          >
            + Créer ton premier script
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-neutral-500">
          Aucun script ne correspond à tes filtres.
        </p>
      ) : (
        <>
          {/* Mobile: cards stack */}
          <div className="flex flex-col gap-3 sm:hidden">
            {filtered.map((s) => (
              <Link
                key={s._id}
                href={`/scripts/${s._id}`}
                className="block rounded-lg border border-neutral-800 bg-neutral-900/50 p-4 transition hover:border-orange-500/60 hover:bg-neutral-900"
              >
                <div className="mb-1 font-mono text-sm text-orange-400">
                  {s.code}
                </div>
                <div className="mb-2 line-clamp-2 text-base font-medium text-neutral-100">
                  {s.name}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                  <span className="font-mono">
                    {formatByCode.get(s.formatId) ?? "—"}
                  </span>
                  <span>·</span>
                  <StatusBadge status={s.status} />
                  <span>·</span>
                  <span>{formatShortDate(s.updatedAt ?? s.createdAt)}</span>
                </div>
              </Link>
            ))}
          </div>

        {/* Desktop / tablet: table */}
        <div className="hidden overflow-x-auto rounded-lg border border-neutral-800 sm:block">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="bg-neutral-900 text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Code</th>
                <th className="px-4 py-3 text-left font-medium">Nom</th>
                <th className="px-4 py-3 text-left font-medium">Format</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr
                  key={s._id}
                  className="cursor-pointer border-t border-neutral-800 bg-neutral-950 transition hover:bg-neutral-900"
                  onClick={() => {
                    window.location.href = `/scripts/${s._id}`;
                  }}
                >
                  <td className="px-4 py-3 font-mono text-orange-400">
                    {s.code}
                  </td>
                  <td className="px-4 py-3 text-neutral-100">{s.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-neutral-500">
                    {formatByCode.get(s.formatId) ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={s.status} />
                  </td>
                  <td className="px-4 py-3 text-right text-neutral-500">→</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
      )}
    </div>
  );
}

function formatShortDate(ms: number): string {
  const d = new Date(ms);
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}
