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

// Single-scene download. Same as /api/image/[id] but for the persona-less
// scene bank. The stored blob is already post-processed at generation time.
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const sceneId = id as Id<"scenes">;

  // Authorize from the VERIFIED Clerk session (never trust the request body).
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const allowed = await convex.query(api.scenes.canClerkUserAccess, {
      sceneId,
      clerkUserId,
    });
    if (!allowed) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const scene = await convex.query(api.scenes.getById, { id: sceneId });
    if (!scene || !scene.imageUrl) {
      return NextResponse.json({ error: "Scène introuvable" }, { status: 404 });
    }

    const res = await fetch(scene.imageUrl);
    if (!res.ok) {
      return NextResponse.json(
        { error: `Récupération du fichier échouée (${res.status})` },
        { status: 502 },
      );
    }
    const buf = Buffer.from(await res.arrayBuffer());
    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    const ext = contentType.includes("png") ? "png" : "jpg";
    const filename = `carrousel-studio-scene-${sceneId}.${ext}`;

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
    console.error("[/api/scene] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur inconnue" },
      { status: 500 },
    );
  }
}
