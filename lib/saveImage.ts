// Minimal typing for the Web Share API file-sharing path (not always present
// in the TS DOM lib depending on target).
type ShareNavigator = Navigator & {
  canShare?: (data?: { files?: File[] }) => boolean;
  share?: (data?: { files?: File[]; title?: string }) => Promise<void>;
};

function classicDownload(apiPath: string) {
  const a = document.createElement("a");
  a.href = apiPath;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/**
 * Saves a single image on the best path for the device:
 *  - Mobile (iOS/Android) with Web Share + file support → fetch the blob from
 *    our SAME-ORIGIN endpoint (no CORS) and open the native share sheet, where
 *    the user can "Save to Photos" / share to apps.
 *  - Otherwise (desktop, unsupported) → classic attachment download.
 *
 * `apiPath` must be same-origin (e.g. /api/image/<id>). `filename` is the
 * suggested name for the shared/downloaded file.
 */
export async function shareOrDownloadImage(
  apiPath: string,
  filename: string,
): Promise<void> {
  const nav =
    typeof navigator !== "undefined" ? (navigator as ShareNavigator) : null;

  if (nav?.canShare && nav.share) {
    try {
      const res = await fetch(apiPath);
      if (res.ok) {
        const blob = await res.blob();
        const file = new File([blob], filename, {
          type: blob.type || "image/jpeg",
        });
        if (nav.canShare({ files: [file] })) {
          await nav.share({ files: [file] });
          return; // shared (or user dismissed) — don't also download
        }
      }
    } catch (err) {
      // User dismissed the share sheet → respect that, don't fall back.
      if ((err as Error)?.name === "AbortError") return;
      // Any other failure (fetch/share unsupported at runtime) → fall through.
    }
  }

  classicDownload(apiPath);
}
