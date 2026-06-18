"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useToast } from "@/components/Toast";

type PendingInvitation = {
  id: string;
  emailAddress: string;
  createdAt: number;
  status: string;
};

export function AdminConsole() {
  const toast = useToast();
  const creators = useQuery(api.users.listCreators, {});

  const [invitations, setInvitations] = useState<PendingInvitation[] | null>(
    null,
  );
  const [invitesError, setInvitesError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const loadInvitations = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/invitations");
      const data = (await res.json()) as {
        invitations?: PendingInvitation[];
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? `Erreur ${res.status}`);
      setInvitations(data.invitations ?? []);
      setInvitesError(null);
    } catch (e) {
      setInvitesError((e as Error).message);
      setInvitations([]);
    }
  }, []);

  useEffect(() => {
    void loadInvitations();
  }, [loadInvitations]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;
    setInviting(true);
    try {
      const res = await fetch("/api/admin/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? `Erreur ${res.status}`);
      toast.push("success", `Invitation envoyée à ${trimmed}`);
      setEmail("");
      await loadInvitations();
    } catch (err) {
      toast.push("error", (err as Error).message);
    } finally {
      setInviting(false);
    }
  };

  const handleRevoke = async (id: string, emailAddr: string) => {
    if (!confirm(`Révoquer l'invitation de ${emailAddr} ?`)) return;
    setRevokingId(id);
    try {
      const res = await fetch(`/api/admin/invitations?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? `Erreur ${res.status}`);
      toast.push("success", "Invitation révoquée");
      await loadInvitations();
    } catch (err) {
      toast.push("error", (err as Error).message);
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <div className="space-y-8">
      <nav className="flex gap-3 text-sm">
        <Link href="/" className="text-neutral-400 hover:text-orange-300">
          Personas
        </Link>
        <span className="text-neutral-700">·</span>
        <span className="text-orange-300">Créateurs</span>
      </nav>

      <div>
        <h1 className="text-2xl font-semibold">Console créateurs</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Invite des créateurs et gère leur accès. Chaque créateur a son propre
          espace isolé.
        </p>
      </div>

      {/* === Invite form === */}
      <section className="rounded-lg border border-neutral-800 bg-neutral-900 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-300">
          Inviter un créateur
        </h2>
        <form onSubmit={handleInvite} className="mt-3 flex flex-wrap gap-2">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="creator@example.com"
            className="min-w-[260px] flex-1 rounded border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm focus:border-orange-500/60 focus:outline-none"
          />
          <button
            type="submit"
            disabled={inviting || !email.trim()}
            className="rounded bg-orange-500 px-4 py-2 text-sm font-medium text-neutral-950 hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {inviting ? "Envoi…" : "Envoyer l'invitation"}
          </button>
        </form>
        <p className="mt-2 text-xs text-neutral-500">
          L&apos;invité reçoit un email, crée son mot de passe, puis arrive sur
          un espace vide qui n&apos;est que le sien.
        </p>
      </section>

      {/* === Pending invitations === */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-300">
          Invitations en attente
        </h2>
        {invitesError ? (
          <p className="text-sm text-red-300">{invitesError}</p>
        ) : invitations === null ? (
          <p className="text-sm text-neutral-500">Chargement…</p>
        ) : invitations.length === 0 ? (
          <p className="rounded border border-dashed border-neutral-800 p-6 text-center text-sm text-neutral-500">
            Aucune invitation en attente.
          </p>
        ) : (
          <ul className="divide-y divide-neutral-800 overflow-hidden rounded-lg border border-neutral-800">
            {invitations.map((inv) => (
              <li
                key={inv.id}
                className="flex items-center justify-between gap-3 bg-neutral-900 px-4 py-3"
              >
                <div>
                  <p className="text-sm text-neutral-200">{inv.emailAddress}</p>
                  <p className="text-xs text-neutral-500">
                    invité le{" "}
                    {new Date(inv.createdAt).toLocaleDateString("fr-FR")}
                  </p>
                </div>
                <button
                  onClick={() => handleRevoke(inv.id, inv.emailAddress)}
                  disabled={revokingId === inv.id}
                  className="rounded border border-red-500/40 px-3 py-1.5 text-xs text-red-300 hover:border-red-400 hover:bg-red-500/10 disabled:opacity-50"
                >
                  {revokingId === inv.id ? "Révocation…" : "Révoquer"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* === Active creators === */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-300">
          Créateurs actifs
        </h2>
        {creators === undefined ? (
          <p className="text-sm text-neutral-500">Chargement…</p>
        ) : creators.length === 0 ? (
          <p className="rounded border border-dashed border-neutral-800 p-6 text-center text-sm text-neutral-500">
            Aucun créateur actif pour l&apos;instant.
          </p>
        ) : (
          <ul className="divide-y divide-neutral-800 overflow-hidden rounded-lg border border-neutral-800">
            {creators.map((c) => (
              <li
                key={c._id}
                className="flex items-center justify-between gap-3 bg-neutral-900 px-4 py-3"
              >
                <div>
                  <p className="text-sm text-neutral-200">
                    {c.name ?? c.email}
                  </p>
                  {c.name && (
                    <p className="text-xs text-neutral-500">{c.email}</p>
                  )}
                </div>
                <div className="flex gap-4 text-xs text-neutral-400">
                  <span>
                    <span className="text-orange-400">{c.personaCount}</span>{" "}
                    personas
                  </span>
                  <span>
                    <span className="text-neutral-200">{c.carouselCount}</span>{" "}
                    carrousels
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
