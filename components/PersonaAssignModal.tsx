"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useMe } from "@/lib/useMe";
import { useToast } from "./Toast";

/**
 * Admin-only persona dispatch modal. Transfers a persona + its full data bank
 * (images/folders/carousels) to a chosen creator, or reclaims it into the pool
 * (the current admin). Calls personas.assignOwner.
 */
export function PersonaAssignModal({
  personaId,
  personaName,
  imageCount,
  onClose,
}: {
  personaId: Id<"personas">;
  personaName: string;
  imageCount: number;
  onClose: () => void;
}) {
  const toast = useToast();
  const me = useMe();
  const creators = useQuery(api.users.listCreators, {});
  const assignOwner = useMutation(api.personas.assignOwner);

  // Selected target user id ("" = none yet).
  const [target, setTarget] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const POOL_VALUE = me ? `pool:${me._id}` : "";
  const resolvedTargetId: Id<"users"> | null = target
    ? (target.startsWith("pool:")
        ? (target.slice("pool:".length) as Id<"users">)
        : (target as Id<"users">))
    : null;

  const targetLabel = (() => {
    if (!target) return "";
    if (target.startsWith("pool:")) return "le pool (toi)";
    const c = (creators ?? []).find((x) => x._id === target);
    return c ? (c.name ?? c.email) : "ce créateur";
  })();

  const handleSave = async () => {
    if (!resolvedTargetId) return;
    setSaving(true);
    try {
      const res = await assignOwner({
        personaId,
        ownerUserId: resolvedTargetId,
      });
      toast.push(
        "success",
        `« ${personaName} » transféré à ${targetLabel} — ${res.images} image(s), ${res.folders} dossier(s), ${res.carousels} carrousel(s).`,
      );
      onClose();
    } catch (e) {
      toast.push("error", (e as Error).message);
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-black/70 p-3 sm:p-6"
      onClick={() => !saving && onClose()}
    >
      <div
        className="w-full max-w-md rounded-lg border border-neutral-800 bg-neutral-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-neutral-800 px-6 py-4">
          <h2 className="text-lg font-semibold">Assigner « {personaName} »</h2>
          <button
            onClick={onClose}
            disabled={saving}
            className="rounded p-1 text-neutral-500 hover:bg-neutral-800"
          >
            ×
          </button>
        </header>

        <div className="space-y-4 px-6 py-5">
          <div>
            <label className="mb-2 block text-xs uppercase tracking-wide text-neutral-500">
              Destinataire
            </label>
            <select
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="w-full rounded border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-200 focus:border-orange-500/60 focus:outline-none"
            >
              <option value="">— Choisir —</option>
              {me && <option value={POOL_VALUE}>Reprendre dans le pool (moi)</option>}
              {(creators ?? []).map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name ? `${c.name} (${c.email})` : c.email}
                </option>
              ))}
            </select>
          </div>

          {resolvedTargetId && (
            <div className="rounded border border-orange-500/30 bg-orange-500/5 px-3 py-2 text-xs text-neutral-300">
              Ses <span className="text-orange-300">{imageCount}</span> images,
              dossiers et carrousels seront transférés à{" "}
              <span className="text-orange-300">{targetLabel}</span>. Le transfert
              n&apos;entame pas son quota.
            </div>
          )}
        </div>

        <footer className="flex justify-end gap-2 border-t border-neutral-800 px-6 py-4">
          <button
            onClick={onClose}
            disabled={saving}
            className="rounded border border-neutral-700 px-4 py-1.5 text-sm hover:bg-neutral-800"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !resolvedTargetId}
            className="rounded bg-orange-500 px-4 py-1.5 text-sm font-medium text-neutral-950 hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Transfert…" : "Transférer"}
          </button>
        </footer>
      </div>
    </div>
  );
}
