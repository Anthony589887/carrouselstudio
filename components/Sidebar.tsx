"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
  { label: "Personas", href: "/personas" },
  { label: "Formats", href: "/formats" },
  { label: "Scripts", href: "/scripts" },
  { label: "Générer", href: "/generer" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 shrink-0 border-r border-neutral-800 bg-neutral-900 p-6">
      <div className="mb-8">
        <h1 className="text-lg font-semibold">
          <span className="text-white">Carousel</span>
          <span className="text-orange-500">Studio</span>
        </h1>
        <p className="mt-1 text-xs text-neutral-500">RepackIt — interne</p>
      </div>
      <nav className="flex flex-col gap-1">
        {nav.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded px-3 py-2 text-sm transition ${
                isActive
                  ? "bg-orange-500/10 text-orange-400"
                  : "text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
