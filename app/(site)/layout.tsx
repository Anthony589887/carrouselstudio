import Link from "next/link";

export default function SiteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <header className="border-b border-neutral-800 bg-neutral-900">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-base font-semibold">
            <span className="text-white">Carousel</span>
            <span className="text-orange-500">Studio</span>
          </Link>
          <span className="text-xs text-neutral-500">v2</span>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </>
  );
}
