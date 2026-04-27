// Fullscreen routes — no global header, no max-width container.
// Pages render at full viewport size and own their own chrome.
export default function FullscreenLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <div className="min-h-screen">{children}</div>;
}
