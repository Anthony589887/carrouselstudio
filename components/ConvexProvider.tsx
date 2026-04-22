"use client";

import {
  ConvexProvider as ConvexReactProvider,
  ConvexReactClient,
} from "convex/react";
import { ReactNode } from "react";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

if (!convexUrl) {
  throw new Error("NEXT_PUBLIC_CONVEX_URL is not set");
}

const convex = new ConvexReactClient(convexUrl);

export function ConvexProvider({ children }: { children: ReactNode }) {
  return <ConvexReactProvider client={convex}>{children}</ConvexReactProvider>;
}
