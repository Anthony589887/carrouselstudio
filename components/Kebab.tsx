"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * A small kebab (3-dots) button that opens a popover with arbitrary children.
 * Clicking the trigger toggles open. Clicking outside or pressing Escape closes.
 * Children receive a `close()` callback so menu items can dismiss it after action.
 */
export function Kebab({
  children,
  align = "end",
  className = "",
  ariaLabel = "Plus d'options",
}: {
  children: (close: () => void) => ReactNode;
  align?: "start" | "end";
  className?: string;
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={wrapperRef} className={`relative inline-block ${className}`}>
      <button
        type="button"
        aria-label={ariaLabel}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setOpen((v) => !v);
        }}
        className="flex h-7 w-7 items-center justify-center rounded text-neutral-300 hover:bg-neutral-700 hover:text-white"
      >
        ⋯
      </button>
      {open && (
        <div
          className={`absolute z-30 mt-1 min-w-[180px] overflow-hidden rounded-md border border-neutral-700 bg-neutral-900 py-1 text-sm shadow-2xl ${
            align === "end" ? "right-0" : "left-0"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

export function KebabItem({
  onClick,
  children,
  danger = false,
  disabled = false,
}: {
  onClick: () => void;
  children: ReactNode;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`block w-full px-3 py-1.5 text-left text-xs transition disabled:opacity-40 ${
        danger
          ? "text-red-300 hover:bg-red-500/15"
          : "text-neutral-200 hover:bg-neutral-800"
      }`}
    >
      {children}
    </button>
  );
}

export function KebabSubmenuLabel({ children }: { children: ReactNode }) {
  return (
    <div className="border-b border-neutral-800 px-3 py-1 text-[10px] uppercase tracking-wide text-neutral-500">
      {children}
    </div>
  );
}
