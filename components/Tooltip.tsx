"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { ReactNode } from "react";

type TooltipProps = {
  content: string;
  children: ReactNode; // the trigger element (typically a span "ⓘ")
  // Side on which the popover opens relative to the trigger. Default "top".
  // Use "bottom" when the trigger is near the top of the viewport (e.g. the
  // panel header) where opening upward would overflow off-screen.
  position?: "top" | "bottom";
};

// Short delay before hide to let the cursor traverse the gap between the
// trigger and the popover (8px due to mb-2). Without this, leaving the
// trigger fires mouseLeave instantly and the popover unmounts before the
// cursor can reach it.
const HIDE_DELAY_MS = 120;

/**
 * Custom popover-style tooltip. Replaces the native `title=` attribute which
 * has poor UX (1s delay on desktop, no support on mobile, no styling).
 *
 * Behavior:
 * - Hover: opens instantly. Stays open while cursor is on trigger OR popover.
 *   A brief 120ms grace period bridges the visual gap between them.
 * - Click: toggles visibility (works on touch devices too).
 * - Click outside the trigger or popover: closes.
 * - Escape: closes.
 */
export function Tooltip({
  content,
  children,
  position = "top",
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const hideTimerRef = useRef<number | null>(null);

  const cancelHide = useCallback(() => {
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const showNow = useCallback(() => {
    cancelHide();
    setIsVisible(true);
  }, [cancelHide]);

  const hideAfterDelay = useCallback(() => {
    cancelHide();
    hideTimerRef.current = window.setTimeout(() => {
      setIsVisible(false);
      hideTimerRef.current = null;
    }, HIDE_DELAY_MS);
  }, [cancelHide]);

  const hideNow = useCallback(() => {
    cancelHide();
    setIsVisible(false);
  }, [cancelHide]);

  // Cancel any pending hide on unmount.
  useEffect(() => () => cancelHide(), [cancelHide]);

  // Close on outside click. Uses `mousedown` so it fires before any other
  // click handlers on the page (which would otherwise trigger first and
  // potentially re-open the same tooltip).
  useEffect(() => {
    if (!isVisible) return;
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (popoverRef.current?.contains(target)) return;
      setIsVisible(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isVisible]);

  // Close on Escape key.
  useEffect(() => {
    if (!isVisible) return;
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") hideNow();
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isVisible, hideNow]);

  const popoverPositionClasses =
    position === "bottom"
      ? "top-full mt-2"
      : "bottom-full mb-2";

  // Arrow points from the popover toward the trigger. When popover is above
  // (position=top), arrow is at popover bottom edge pointing down. When
  // popover is below (position=bottom), arrow is at popover top edge pointing
  // up.
  const arrowEdgeClasses =
    position === "bottom"
      ? "bottom-full left-1/2 -translate-x-1/2 -mb-px"
      : "top-full left-1/2 -translate-x-1/2 -mt-px";

  const arrowDirectionClasses =
    position === "bottom"
      ? "border-x-4 border-x-transparent border-b-4 border-b-neutral-900"
      : "border-x-4 border-x-transparent border-t-4 border-t-neutral-900";

  return (
    <span className="relative inline-block">
      <span
        ref={triggerRef}
        onClick={(e) => {
          e.stopPropagation();
          setIsVisible((v) => !v);
        }}
        onMouseEnter={showNow}
        onMouseLeave={hideAfterDelay}
        className="inline-flex cursor-help items-center justify-center"
      >
        {children}
      </span>
      {isVisible && (
        <div
          ref={popoverRef}
          role="tooltip"
          onMouseEnter={showNow}
          onMouseLeave={hideAfterDelay}
          className={`pointer-events-auto absolute left-1/2 z-50 w-64 max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-md border border-neutral-700 bg-neutral-900 p-3 text-xs leading-snug text-white shadow-lg ${popoverPositionClasses}`}
        >
          {content}
          <div className={`absolute ${arrowEdgeClasses}`}>
            <div className={arrowDirectionClasses} />
          </div>
        </div>
      )}
    </span>
  );
}
