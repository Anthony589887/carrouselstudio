import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import JSZip from "jszip";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

export const runtime = "nodejs";
export const maxDuration = 60;

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
if (!convexUrl) {
  throw new Error("NEXT_PUBLIC_CONVEX_URL not set");
}
const convex = new ConvexHttpClient(convexUrl);

// Downloads ALL of the current user's favorites (images + scenes) as one ZIP.
// Blobs are already post-processed (clean) — streamed as-is, no re-processing.
export async function GET() {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const fav = await convex.query(api.favorites.listForClerkUser, {
      clerkUserId,
    });
    const total = fav.images.length + fav.scenes.length;
    if (total === 0) {
      return NextResponse.json(
        { error: "Aucun favori à télécharger." },
        { status: 404 },
      );
    }

    const zip = new JSZip();
    let included = 0;
    const failures: string[] = [];

    const add = async (
      url: string | null,
      filename: string,
    ): Promise<void> => {
      if (!url) {
        failures.push(`${filename} (indisponible)`);
        return;
      }
      try {
        const res = await fetch(url);
        if (!res.ok) {
          failures.push(`${filename} (HTTP ${res.status})`);
          return;
        }
        zip.file(filename, Buffer.from(await res.arrayBuffer()));
        included++;
      } catch (e) {
        failures.push(`${filename} (${(e as Error).message})`);
      }
    };

    let n = 1;
    for (const img of fav.images) {
      await add(img.url, `image-${String(n++).padStart(2, "0")}.jpg`);
    }
    let m = 1;
    for (const scene of fav.scenes) {
      await add(scene.url, `scene-${String(m++).padStart(2, "0")}.jpg`);
    }

    if (included === 0) {
      return NextResponse.json(
        { error: "Aucun favori récupérable", failures },
        { status: 502 },
      );
    }

    const zipBuffer = await zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    });

    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `mes-favoris-${dateStr}.zip`;

    return new NextResponse(new Uint8Array(zipBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(zipBuffer.byteLength),
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[/api/favorites/zip] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur inconnue" },
      { status: 500 },
    );
  }
}
