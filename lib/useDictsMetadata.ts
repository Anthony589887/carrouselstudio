"use client";

import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

type Dim = "lighting" | "energy" | "social" | "space";
// Scenes only carry 3 of the 4 dimensions (no `social`).
type SceneDim = "lighting" | "energy" | "space";

/**
 * Wraps the Convex `imagePrompts.getDictsMetadata` query and returns
 * lookup helpers for displaying French labels in the UI.
 *
 * - All `*Label(id)` helpers fall back to the raw id when no displayName
 *   is found (handles legacy values + race conditions before query loads).
 * - `dicts` is the raw query result (may be undefined while loading).
 * - `sceneLabel` resolves a scene dict id to its French display name.
 *   `tagLabel` is shared with images (the lighting/energy/space dimensions
 *   use the same TAG_DISPLAY_NAMES).
 */
export function useDictsMetadata() {
  const dicts = useQuery(api.imagePrompts.getDictsMetadata);

  const lookups = useMemo(() => {
    const sit = new Map<string, string>();
    const emo = new Map<string, string>();
    const frm = new Map<string, string>();
    const reg = new Map<string, string>();
    const scn = new Map<string, string>();
    if (dicts) {
      for (const s of dicts.situations) sit.set(s.id, s.displayName);
      for (const s of dicts.emotionalStates) emo.set(s.id, s.displayName);
      for (const s of dicts.framings) frm.set(s.id, s.displayName);
      for (const s of dicts.technicalRegisters) reg.set(s.id, s.displayName);
      for (const s of dicts.scenes) scn.set(s.id, s.displayName);
    }
    return { sit, emo, frm, reg, scn };
  }, [dicts]);

  const situationLabel = (id: string | undefined | null): string =>
    (id && lookups.sit.get(id)) || id || "";
  const emotionLabel = (id: string | undefined | null): string =>
    (id && lookups.emo.get(id)) || id || "";
  const framingLabel = (id: string | undefined | null): string =>
    (id && lookups.frm.get(id)) || id || "";
  const registerLabel = (id: string | undefined | null): string =>
    (id && lookups.reg.get(id)) || id || "";
  const sceneLabel = (id: string | undefined | null): string =>
    (id && lookups.scn.get(id)) || id || "";

  const tagLabel = (dim: Dim | SceneDim, value: string): string => {
    if (!dicts) return value;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dimMap = (dicts.tagDisplayNames as any)?.[dim];
    return dimMap?.[value] ?? value;
  };

  const dimensionLabel = (dim: Dim | SceneDim): string => {
    if (!dicts) return dim;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return ((dicts.dimensionNames as any)?.[dim] as string | undefined) ?? dim;
  };

  return {
    dicts,
    situationLabel,
    emotionLabel,
    framingLabel,
    registerLabel,
    sceneLabel,
    tagLabel,
    dimensionLabel,
  };
}
