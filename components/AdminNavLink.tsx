"use client";

import Link from "next/link";
import { useMe } from "@/lib/useMe";

/**
 * Header link to the admin console. Visible only to admins. This is a cosmetic
 * gate — /admin also enforces the role server-side (redirects non-admins).
 */
export function AdminNavLink() {
  const me = useMe();
  if (me?.role !== "admin") return null;
  return (
    <Link
      href="/admin"
      className="text-xs text-neutral-400 hover:text-orange-300"
    >
      Créateurs
    </Link>
  );
}
