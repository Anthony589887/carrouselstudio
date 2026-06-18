import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

export const runtime = "nodejs";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
if (!convexUrl) {
  throw new Error("NEXT_PUBLIC_CONVEX_URL not set");
}

// Server-side admin gate: resolve the VERIFIED Clerk session, then check the
// role in Convex (clerkUserId never comes from the request body). Returns an
// error NextResponse to short-circuit, or the userId on success.
async function adminGate(): Promise<
  { ok: true; userId: string } | { ok: false; res: NextResponse }
> {
  const { userId } = await auth();
  if (!userId) {
    return {
      ok: false,
      res: NextResponse.json({ error: "Non authentifié" }, { status: 401 }),
    };
  }
  const convex = new ConvexHttpClient(convexUrl as string);
  const isAdmin = await convex.query(api.users.isClerkUserAdmin, {
    clerkUserId: userId,
  });
  if (!isAdmin) {
    return {
      ok: false,
      res: NextResponse.json({ error: "Accès refusé" }, { status: 403 }),
    };
  }
  return { ok: true, userId };
}

// Turns a Clerk SDK error into a clean, user-facing message (e.g. duplicate
// invitation / already a member) instead of leaking a stack trace.
function clerkErrorMessage(err: unknown, fallback: string): string {
  const e = err as { errors?: Array<{ longMessage?: string; message?: string }> };
  const first = e?.errors?.[0];
  return first?.longMessage ?? first?.message ?? fallback;
}

/** List pending invitations. */
export async function GET() {
  const gate = await adminGate();
  if (!gate.ok) return gate.res;

  const client = await clerkClient();
  const list = await client.invitations.getInvitationList({
    status: "pending",
  });
  const invitations = list.data.map((i) => ({
    id: i.id,
    emailAddress: i.emailAddress,
    createdAt: i.createdAt,
    status: i.status,
  }));
  return NextResponse.json({ invitations });
}

/** Create an invitation for a new creator. */
export async function POST(request: NextRequest) {
  const gate = await adminGate();
  if (!gate.ok) return gate.res;

  let body: { email?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }
  const email = (body.email ?? "").trim();
  if (!email) {
    return NextResponse.json({ error: "Email requis" }, { status: 400 });
  }

  const client = await clerkClient();
  try {
    await client.invitations.createInvitation({
      emailAddress: email,
      redirectUrl: `${request.nextUrl.origin}/login`,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    // Most common: already invited / already a member → 422 with clear message.
    return NextResponse.json(
      {
        error: clerkErrorMessage(
          err,
          "Impossible d'envoyer l'invitation (déjà invité ou déjà membre ?)",
        ),
      },
      { status: 422 },
    );
  }
}

/** Revoke a pending invitation (id in the `id` query param). */
export async function DELETE(request: NextRequest) {
  const gate = await adminGate();
  if (!gate.ok) return gate.res;

  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id requis" }, { status: 400 });
  }
  const client = await clerkClient();
  try {
    await client.invitations.revokeInvitation(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: clerkErrorMessage(err, "Révocation impossible") },
      { status: 422 },
    );
  }
}
