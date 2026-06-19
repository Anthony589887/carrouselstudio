"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
// The default useSignUp/useSignIn in this Clerk version are the new "signals"
// API; the legacy subpath gives the classic resource API ({ isLoaded, signUp,
// setActive }, create() → resource with status/createdSessionId) that the
// official ticket custom-flow is written against.
import { useSignUp, useSignIn } from "@clerk/nextjs/legacy";

// Extracts a clean, user-facing message from a Clerk SDK error.
function clerkMsg(err: unknown, fallback: string): string {
  const e = err as {
    errors?: Array<{ longMessage?: string; message?: string }>;
  };
  const first = e?.errors?.[0];
  return first?.longMessage ?? first?.message ?? fallback;
}

/**
 * Dedicated invitation-acceptance page. Clerk redirects an invited user here
 * (the invitation `redirectUrl`) with `__clerk_ticket` (+ `__clerk_status`) in
 * the query. OUR code must consume that ticket to finalize the account — the
 * <SignIn/> page does not, which is why invites used to bounce back to the
 * Clerk dashboard.
 *
 * Flow:
 *   - no ticket            → clear message + link to /login
 *   - already signed in    → redirect "/"
 *   - status "sign_in"     → existing account: finalize via ticket (no password)
 *   - otherwise (sign_up)  → collect a password, create the account via ticket
 * The ticket auto-verifies the email, so no email code step is needed.
 */
export default function AcceptInvitationPage() {
  const router = useRouter();
  const { isLoaded: userLoaded, isSignedIn } = useUser();
  const {
    isLoaded: signUpLoaded,
    signUp,
    setActive: setActiveSignUp,
  } = useSignUp();
  const {
    isLoaded: signInLoaded,
    signIn,
    setActive: setActiveSignIn,
  } = useSignIn();

  const [ready, setReady] = useState(false);
  const [ticket, setTicket] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Parse ticket/status from the URL (client-only — avoids the Suspense
  // requirement of useSearchParams and matches Clerk's documented flow).
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    setTicket(q.get("__clerk_ticket"));
    setStatus(q.get("__clerk_status"));
    setReady(true);
  }, []);

  // Already signed in (or invite already consumed) → home.
  useEffect(() => {
    if (userLoaded && isSignedIn) router.replace("/");
  }, [userLoaded, isSignedIn, router]);

  // Existing account: status "sign_in" → finalize via ticket, no password.
  useEffect(() => {
    if (!ready || !ticket || status !== "sign_in") return;
    if (!signInLoaded || !signIn) return;
    let cancelled = false;
    (async () => {
      setWorking(true);
      setError(null);
      try {
        const res = await signIn.create({ strategy: "ticket", ticket });
        if (res.status === "complete" && res.createdSessionId) {
          await setActiveSignIn({ session: res.createdSessionId });
          if (!cancelled) router.replace("/");
        } else if (!cancelled) {
          setError("Connexion incomplète. Réessaie ou contacte l'admin.");
        }
      } catch (e) {
        if (!cancelled) setError(clerkMsg(e, "Lien invalide ou expiré."));
      } finally {
        if (!cancelled) setWorking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, ticket, status, signInLoaded, signIn, setActiveSignIn, router]);

  // New account: create via ticket + chosen password.
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signUpLoaded || !signUp || !ticket) return;
    if (password.length < 8) {
      setError("Le mot de passe doit faire au moins 8 caractères.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await signUp.create({ strategy: "ticket", ticket, password });
      if (res.status === "complete" && res.createdSessionId) {
        await setActiveSignUp({ session: res.createdSessionId });
        router.replace("/");
      } else {
        setError("Inscription incomplète. Vérifie ton mot de passe.");
      }
    } catch (err) {
      setError(clerkMsg(err, "Lien invalide ou expiré."));
    } finally {
      setSubmitting(false);
    }
  };

  // === Render ===
  const shell = (children: React.ReactNode) => (
    <div className="flex min-h-screen items-center justify-center bg-neutral-950 p-6 text-neutral-100">
      <div className="w-full max-w-sm rounded-lg border border-neutral-800 bg-neutral-900 p-6 shadow-xl">
        <div className="mb-6">
          <h1 className="text-lg font-semibold">
            <span className="text-white">Carousel</span>
            <span className="text-orange-500">Studio</span>
          </h1>
          <p className="mt-1 text-xs text-neutral-500">Accepter l&apos;invitation</p>
        </div>
        {children}
      </div>
    </div>
  );

  if (!ready || !userLoaded) {
    return shell(<p className="text-sm text-neutral-400">Chargement…</p>);
  }

  if (isSignedIn) {
    return shell(<p className="text-sm text-neutral-400">Redirection…</p>);
  }

  if (!ticket) {
    return shell(
      <div className="space-y-4">
        <p className="text-sm text-neutral-300">
          Lien d&apos;invitation invalide ou incomplet (jeton manquant).
        </p>
        <Link
          href="/login"
          className="inline-block rounded bg-orange-500 px-4 py-2 text-sm font-medium text-neutral-950 hover:bg-orange-400"
        >
          Aller à la connexion
        </Link>
      </div>,
    );
  }

  // Existing account being finalized via ticket.
  if (status === "sign_in") {
    return shell(
      <div className="space-y-3">
        <p className="text-sm text-neutral-300">
          {working ? "Finalisation de ta connexion…" : "Connexion…"}
        </p>
        {error && <p className="text-xs text-red-400">{error}</p>}
        {error && (
          <Link
            href="/login"
            className="inline-block text-xs text-orange-300 hover:text-orange-200"
          >
            Aller à la connexion
          </Link>
        )}
      </div>,
    );
  }

  // New account: choose a password.
  return shell(
    <form onSubmit={handleSignUp} className="space-y-4">
      <p className="text-sm text-neutral-300">
        Choisis un mot de passe pour finaliser ton compte.
      </p>
      <div>
        <label className="mb-1 block text-xs text-neutral-500">
          Mot de passe
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
          required
          minLength={8}
          placeholder="8 caractères minimum"
          className="w-full rounded border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm focus:border-orange-500/60 focus:outline-none"
        />
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={submitting || password.length < 8}
        className="w-full rounded bg-orange-500 px-4 py-2 text-sm font-medium text-neutral-950 hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? "Création…" : "Créer mon compte"}
      </button>
    </form>,
  );
}
