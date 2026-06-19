"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "carousel.howToDismissed";

/**
 * Dismissible "how it works" card for creators (3 simple steps). The dismissed
 * state is persisted in localStorage (no schema change). Render only for
 * creators, and only when they have at least one persona.
 */
export function CreatorHowTo() {
  // Start hidden to avoid a flash before we've read localStorage.
  const [show, setShow] = useState(false);

  useEffect(() => {
    setShow(localStorage.getItem(STORAGE_KEY) !== "1");
  }, []);

  if (!show) return null;

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setShow(false);
  };

  return (
    <div className="relative rounded-lg border border-neutral-800 bg-neutral-900 p-5">
      <button
        onClick={dismiss}
        aria-label="Masquer"
        className="absolute right-3 top-3 rounded p-1 text-neutral-500 hover:bg-neutral-800 hover:text-neutral-300"
      >
        ×
      </button>
      <h2 className="text-sm font-semibold text-neutral-200">Comment ça marche</h2>
      <ol className="mt-3 space-y-2 text-sm text-neutral-400">
        <li className="flex gap-2">
          <span className="text-orange-400">1.</span>
          <span>Choisis un persona ci-dessous.</span>
        </li>
        <li className="flex gap-2">
          <span className="text-orange-400">2.</span>
          <span>
            Génère des images — ou des scènes (des décors sans personne).
          </span>
        </li>
        <li className="flex gap-2">
          <span className="text-orange-400">3.</span>
          <span>Sélectionne et télécharge ce que tu veux.</span>
        </li>
      </ol>
    </div>
  );
}
