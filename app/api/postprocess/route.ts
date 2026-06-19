import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import sharp from "sharp";
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

function targetDims(aspect: string | undefined): { w: number; h: number } {
  return aspect === "9:16" ? { w: 1080, h: 1920 } : { w: 1080, h: 1350 };
}

// Shared-secret guard. The Convex actions send `x-postprocess-secret`. We only
// enforce it when POSTPROCESS_SECRET is configured here (Next/Vercel) —
// otherwise we fail OPEN (with a loud warning) so the anti-watermark step keeps
// working while the env var propagates everywhere. Constant-time comparison.
function isAuthorized(request: NextRequest): boolean {
  const expected = process.env.POSTPROCESS_SECRET;
  if (!expected) {
    console.warn(
      "[postprocess] POSTPROCESS_SECRET non configuré — endpoint non protégé",
    );
    return true;
  }
  const got = request.headers.get("x-postprocess-secret") ?? "";
  const a = Buffer.from(got);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Body shape:
  //   { imageId }                       — legacy shape, treated as kind="image"
  //   { kind: "image", imageId }        — explicit
  //   { kind: "scene", sceneId }        — scene dispatch
  let body: {
    kind?: "image" | "scene";
    imageId?: string;
    sceneId?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const kind: "image" | "scene" =
    body.kind ?? (body.sceneId ? "scene" : "image");

  // Identifier used in log lines / response payload — typed loosely so the
  // single handler body can serve both targets.
  const targetId =
    kind === "scene" ? body.sceneId : body.imageId;
  if (!targetId) {
    return NextResponse.json(
      { error: kind === "scene" ? "Missing sceneId" : "Missing imageId" },
      { status: 400 },
    );
  }

  try {
    // Fetch the source row (image or scene) — both expose `imageUrl` and
    // `aspectRatio` after the convex.query call.
    let imageUrl: string;
    let aspectRatio: string | undefined;
    if (kind === "scene") {
      const sceneId = targetId as Id<"scenes">;
      const scene = await convex.query(api.scenes.getById, { id: sceneId });
      if (!scene || !scene.imageUrl) {
        return NextResponse.json({ error: "Scene not ready" }, { status: 404 });
      }
      imageUrl = scene.imageUrl;
      aspectRatio = scene.aspectRatio;
    } else {
      const imageId = targetId as Id<"images">;
      const image = await convex.query(api.images.getById, { id: imageId });
      if (!image || !image.imageUrl) {
        return NextResponse.json({ error: "Image not ready" }, { status: 404 });
      }
      imageUrl = image.imageUrl;
      aspectRatio = image.aspectRatio;
    }

    const imageRes = await fetch(imageUrl);
    if (!imageRes.ok) {
      return NextResponse.json(
        { error: `Failed to fetch raw (${imageRes.status})` },
        { status: 502 },
      );
    }
    const rawBuffer = Buffer.from(await imageRes.arrayBuffer());

    const { w, h } = targetDims(aspectRatio);

    // Pipeline:
    //   Step A — pixel-level transforms + write PNG.
    //   The intermediate PNG is critical: PNG has no JUMB/JPEG-app-segment
    //   container, so any C2PA / `jumdc2pa` marker that Gemini buried in the
    //   source JPEG cannot survive the round-trip.
    //     1. Tiny rotation + sat/brightness wiggle (anti hash-based watermark)
    //     2. Cover-resize to target dims (Gemini sends 3:4 when we ask 4:5,
    //        center-crop slightly to land on the right aspect)
    //     3. Micro-resize wiggle (down 4/8px then up) — extra perturbation
    //   Step B — re-encode JPEG from scratch from the clean PNG. Strip EXIF.
    const pngBuffer = await sharp(rawBuffer, { failOn: "none" })
      .rotate(0.3, { background: { r: 128, g: 128, b: 128 } })
      .modulate({ saturation: 1.015, brightness: 1.005 })
      .resize(w, h, { kernel: "lanczos3", fit: "cover", position: "centre" })
      .resize(Math.max(8, w - 4), Math.max(8, h - 8), {
        kernel: "lanczos2",
        fit: "fill",
      })
      .resize(w, h, { kernel: "lanczos2", fit: "fill" })
      .png()
      .toBuffer();

    const processedBuffer = await sharp(pngBuffer)
      .jpeg({ quality: 92, mozjpeg: true })
      .withMetadata({ exif: {} })
      .toBuffer();

    // Belt-and-suspenders: scan the final buffer for residual C2PA markers.
    // If anything survived (would be a Sharp/libjpeg regression), block the
    // write and surface the failure loudly in logs.
    {
      const head = processedBuffer.toString(
        "latin1",
        0,
        Math.min(4096, processedBuffer.length),
      );
      const markers = ["jumb", "jumdc2pa", "c2pa"];
      const hit = markers.find((m) => head.includes(m));
      if (hit) {
        console.error(
          `[postprocess] C2PA marker "${hit}" survived in output for ${kind} ${targetId}`,
        );
        return NextResponse.json(
          { error: `C2PA marker survived post-process (${hit})`, targetId, kind },
          { status: 500 },
        );
      }
    }

    console.log(
      `[postprocess] ${kind} ${targetId} reprocessed, size=${processedBuffer.length} bytes`,
    );

    // Upload + replace through the right table's mutations.
    const uploadUrl =
      kind === "scene"
        ? await convex.mutation(api.scenes.generateUploadUrl, {})
        : await convex.mutation(api.images.generateUploadUrl, {});
    const uploadRes = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": "image/jpeg" },
      body: new Uint8Array(processedBuffer),
    });
    if (!uploadRes.ok) {
      return NextResponse.json(
        { error: `Convex upload failed (${uploadRes.status})` },
        { status: 502 },
      );
    }
    const { storageId: newStorageId } = (await uploadRes.json()) as {
      storageId: Id<"_storage">;
    };

    if (kind === "scene") {
      await convex.mutation(api.scenes.replaceStorage, {
        id: targetId as Id<"scenes">,
        newStorageId,
      });
    } else {
      await convex.mutation(api.images.replaceStorage, {
        id: targetId as Id<"images">,
        newStorageId,
      });
    }

    return NextResponse.json({ ok: true, kind, storageId: newStorageId, w, h });
  } catch (err) {
    console.error("[postprocess] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
