"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const NAV_ITEMS = [
  { label: "Personas", href: "/personas" },
  { label: "Formats", href: "/formats" },
  { label: "Scripts", href: "/scripts" },
  { label: "Générer", href: "/generer" },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close drawer on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Lock body scroll when drawer open
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open navigation menu"
        className="fixed top-4 left-4 z-40 flex h-11 w-11 items-center justify-center rounded-md border border-neutral-800 bg-neutral-900/80 text-white backdrop-blur lg:hidden"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {open && (
        <div
          aria-hidden
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
        />
      )}

      <nav
        className={`fixed top-0 left-0 z-50 h-full w-64 transform border-r border-neutral-800 bg-neutral-900 p-6 text-white transition-transform duration-200 lg:hidden ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-hidden={!open}
      >
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close navigation menu"
          className="absolute top-4 right-4 flex h-9 w-9 items-center justify-center rounded text-neutral-400 hover:text-white"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className="mb-8">
          <h1 className="text-lg font-semibold">
            <span className="text-white">Carousel</span>
            <span className="text-orange-500">Studio</span>
          </h1>
          <p className="mt-1 text-xs text-neutral-500">RepackIt — interne</p>
        </div>

        <ul className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex min-h-[44px] items-center rounded px-4 py-3 text-sm transition ${
                    isActive
                      ? "bg-orange-500/10 text-orange-400"
                      : "text-neutral-300 hover:bg-neutral-800 hover:text-neutral-100"
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
