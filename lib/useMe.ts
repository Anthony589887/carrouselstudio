"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

/**
 * Current authenticated user (with `role`) from Convex `users.current`.
 * Returns `undefined` while loading, `null` when not signed in / no row yet,
 * or the user doc. Use `me?.role === "admin"` to gate admin-only UI — but
 * remember the UI gate is cosmetic; the real authorization lives in Convex
 * (requireAdmin/requireOwnerOrAdmin) and the /admin server guard.
 */
export function useMe() {
  return useQuery(api.users.current);
}
