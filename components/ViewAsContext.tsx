"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Id } from "@/convex/_generated/dataModel";

type ViewAsValue = {
  // null = "all creators" (admin default). For a creator this is always null
  // and irrelevant — the backend ignores it and forces their own id.
  ownerId: Id<"users"> | null;
  setOwnerId: (id: Id<"users"> | null) => void;
};

const ViewAsCtx = createContext<ViewAsValue | null>(null);
const STORAGE_KEY = "carousel.viewAsOwnerId";

/**
 * Holds the admin "view as creator" selection, shared across the dashboard and
 * /scenes (both live under the (site) layout, so this provider persists across
 * client navigations). Also persisted to localStorage so it survives reloads.
 */
export function ViewAsProvider({ children }: { children: ReactNode }) {
  const [ownerId, setOwnerIdState] = useState<Id<"users"> | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) setOwnerIdState(stored as Id<"users">);
  }, []);

  const setOwnerId = useCallback((id: Id<"users"> | null) => {
    setOwnerIdState(id);
    if (id) localStorage.setItem(STORAGE_KEY, id);
    else localStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <ViewAsCtx.Provider value={{ ownerId, setOwnerId }}>
      {children}
    </ViewAsCtx.Provider>
  );
}

export function useViewAs() {
  const ctx = useContext(ViewAsCtx);
  if (!ctx) throw new Error("useViewAs must be used within ViewAsProvider");
  return ctx;
}
