import { NextRequest, NextResponse } from "next/server";
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

export async function POST(request: NextRequest) {
  let body: { imageId?: string };
  try {
    body = (await request.json()) as { imageId?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const imageId = body.imageId as Id<"images"> | undefined;
  if (!imageId) {
    return NextResponse.json({ error: "Missing imageId" }, { status: 400 });
  }

  try {
    const image = await convex.query(api.images.getById, { id: imageId });
    if (!image || !image.imageUrl) {
      return NextResponse.json({ error: "Image not ready" }, { status: 404 });
    }

    const imageRes = await fetch(image.imageUrl);
    if (!imageRes.ok) {
      return NextResponse.json(
        { error: `Failed to fetch raw (${imageRes.status})` },
        { status: 502 },
      );
    }
    const rawBuffer = Buffer.from(await imageRes.arrayBuffer());

    const { w, h } = targetDims(image.aspectRatio);

    // Pipeline:
    //   1. Tiny rotation + saturation/brightness wiggle (defeats hash-based watermark detection)
    //   2. cover-resize to target dims (crops the smaller dimension to avoid distortion;
    //      Gemini gives us 3:4 when we asked for 4:5, so this center-crops slightly)
    //   3. micro-resize wiggle (down 4/8 px then up) — extra anti-watermark perturbation
    //   4. JPEG mozjpeg q92
    const processedBuffer = await sharp(rawBuffer, { failOn: "none" })
      .rotate(0.3, { background: { r: 128, g: 128, b: 128 } })
      .modulate({ saturation: 1.015, brightness: 1.005 })
      .resize(w, h, { kernel: "lanczos3", fit: "cover", position: "centre" })
      .resize(Math.max(8, w - 4), Math.max(8, h - 8), {
        kernel: "lanczos2",
        fit: "fill",
      })
      .resize(w, h, { kernel: "lanczos2", fit: "fill" })
      .jpeg({ quality: 92, mozjpeg: true })
      .withMetadata({})
      .toBuffer();

    const uploadUrl = await convex.mutation(api.images.generateUploadUrl, {});
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

    await convex.mutation(api.images.replaceStorage, {
      id: imageId,
      newStorageId,
    });

    return NextResponse.json({ ok: true, storageId: newStorageId, w, h });
  } catch (err) {
    console.error("[postprocess] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
