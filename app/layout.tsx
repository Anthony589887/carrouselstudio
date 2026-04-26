import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { ConvexProvider } from "@/components/ConvexProvider";
import { ToastProvider } from "@/components/Toast";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Carousel Studio v2",
  description: "Persona-driven carousel generator",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-neutral-950 text-neutral-100">
        <ConvexProvider>
          <ToastProvider>
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
          </ToastProvider>
        </ConvexProvider>
      </body>
    </html>
  );
}
