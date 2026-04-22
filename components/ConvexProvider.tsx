"use client";

import {
  ConvexProvider as ConvexReactProvider,
  ConvexReactClient,
} from "convex/react";
import { ReactNode, useEffect, useState } from "react";

export function ConvexProvider({ children }: { children: ReactNode }) {
  const [convex, setConvex] = useState<ConvexReactClient | null>(null);

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!url) {
      throw new Error("NEXT_PUBLIC_CONVEX_URL is not set");
    }
    setConvex(new ConvexReactClient(url));
  }, []);

  if (!convex) return <>{children}</>;

  return <ConvexReactProvider client={convex}>{children}</ConvexReactProvider>;
}
