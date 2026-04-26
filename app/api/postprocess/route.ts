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
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    const imageRes = await fetch(image.imageUrl);
    if (!imageRes.ok) {
      return NextResponse.json(
        { error: `Failed to fetch raw (${imageRes.status})` },
        { status: 502 },
      );
    }
    const rawBuffer = Buffer.from(await imageRes.arrayBuffer());

    const meta = await sharp(rawBuffer).metadata();
    const w = meta.width ?? 1080;
    const h = meta.height ?? 1350;

    const processedBuffer = await sharp(rawBuffer, { failOn: "none" })
      .rotate(0.3, { background: { r: 128, g: 128, b: 128 } })
      .modulate({ saturation: 1.015, brightness: 1.005 })
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

    return NextResponse.json({ ok: true, storageId: newStorageId });
  } catch (err) {
    console.error("[postprocess] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
