import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
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

// Single-image download. The stored blob is ALREADY post-processed (cropped +
// anti-watermark) at generation time, so we just stream it back as a clean
// attachment — no re-processing here.
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const imageId = id as Id<"images">;

  // Authorize from the VERIFIED Clerk session (never trust the request body).
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const allowed = await convex.query(api.images.canClerkUserAccess, {
      imageId,
      clerkUserId,
    });
    if (!allowed) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const image = await convex.query(api.images.getById, { id: imageId });
    if (!image || !image.imageUrl) {
      return NextResponse.json({ error: "Image introuvable" }, { status: 404 });
    }

    const res = await fetch(image.imageUrl);
    if (!res.ok) {
      return NextResponse.json(
        { error: `Récupération du fichier échouée (${res.status})` },
        { status: 502 },
      );
    }
    const buf = Buffer.from(await res.arrayBuffer());
    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    const ext = contentType.includes("png") ? "png" : "jpg";
    const filename = `carrousel-studio-${imageId}.${ext}`;

    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(buf.byteLength),
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[/api/image] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur inconnue" },
      { status: 500 },
    );
  }
}
