import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { password?: string };
  const password = body?.password;

  const expectedPassword = process.env.AUTH_PASSWORD;
  const tokenValue = process.env.AUTH_TOKEN_VALUE;
  if (!expectedPassword || !tokenValue) {
    return NextResponse.json(
      { error: "Auth not configured server-side" },
      { status: 500 },
    );
  }
  if (!password || password !== expectedPassword) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set("carousel_auth", tokenValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
  return response;
}
