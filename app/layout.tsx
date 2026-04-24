import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ConvexProvider } from "@/components/ConvexProvider";
import { Sidebar } from "@/components/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RepackIt Carousel Studio",
  description:
    "Internal tool for generating TikTok carrousel images with Gemini",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-neutral-950 text-neutral-100">
        <ConvexProvider>
          <MobileNav />
          <div className="flex min-h-screen">
            <div className="hidden lg:block">
              <Sidebar />
            </div>
            <main className="flex-1 px-4 pt-20 pb-8 sm:px-6 lg:px-8 lg:pt-8">
              {children}
            </main>
          </div>
        </ConvexProvider>
      </body>
    </html>
  );
}
