import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

export const runtime = "nodejs";
export const maxDuration = 60;

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
if (!convexUrl) {
  throw new Error("NEXT_PUBLIC_CONVEX_URL not set");
}
const convex = new ConvexHttpClient(convexUrl);

function sanitizeForFilename(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const carouselId = id as Id<"carousels">;

  try {
    const carousel = await convex.query(api.carousels.get, { id: carouselId });
    if (!carousel) {
      return NextResponse.json({ error: "Carrousel introuvable" }, { status: 404 });
    }

    const persona = await convex.query(api.personas.get, {
      id: carousel.personaId,
    });
    const personaName = persona?.name ?? "carousel";

    const zip = new JSZip();
    let included = 0;
    const failures: string[] = [];

    for (const item of carousel.images) {
      const filename = `${String(item.order + 1).padStart(2, "0")}.jpg`;
      if (!item.imageUrl || item.deleted) {
        failures.push(`${filename} (image supprimée ou inaccessible)`);
        continue;
      }
      try {
        const res = await fetch(item.imageUrl);
        if (!res.ok) {
          failures.push(`${filename} (HTTP ${res.status})`);
          continue;
        }
        const buf = Buffer.from(await res.arrayBuffer());
        zip.file(filename, buf);
        included++;
      } catch (e) {
        failures.push(`${filename} (${(e as Error).message})`);
      }
    }

    if (included === 0) {
      return NextResponse.json(
        { error: "Aucune image récupérable", failures },
        { status: 502 },
      );
    }

    const zipBuffer = await zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    });

    const dateStr = new Date(carousel.createdAt).toISOString().slice(0, 10);
    const safeName = sanitizeForFilename(personaName);
    const filename = `carousel-${safeName}-${dateStr}.zip`;

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
    console.error("[/api/carousel/zip] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur inconnue" },
      { status: 500 },
    );
  }
}
