import Link from "next/link";
import { AdminNavLink } from "@/components/AdminNavLink";
import { ViewAsProvider } from "@/components/ViewAsContext";

export default function SiteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ViewAsProvider>
      <header className="border-b border-neutral-800 bg-neutral-900">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-base font-semibold">
            <span className="text-white">Carousel</span>
            <span className="text-orange-500">Studio</span>
          </Link>
          <div className="flex items-center gap-4">
            <AdminNavLink />
            <span className="text-xs text-neutral-500">v2</span>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl overflow-x-hidden px-4 py-8 sm:px-6">
        {children}
      </main>
    </ViewAsProvider>
  );
}
