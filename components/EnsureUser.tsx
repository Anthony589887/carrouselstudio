"use client";

import { useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

/**
 * Upserts the Clerk identity into the Convex `users` table on sign-in.
 * Rendered high in the tree (root layout); it no-ops until Clerk is loaded
 * and the user is signed in, so it's harmless on the public sign-in page.
 */
export function EnsureUser() {
  const { isLoaded, isSignedIn } = useAuth();
  const ensureUser = useMutation(api.users.ensureUser);

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      void ensureUser({});
    }
  }, [isLoaded, isSignedIn, ensureUser]);

  return null;
}
