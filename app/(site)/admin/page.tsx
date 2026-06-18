import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { AdminConsole } from "@/components/AdminConsole";

// Server-side role guard: real check, not just a hidden link. Non-admins (and
// unauthenticated users) are redirected away before any admin UI is sent.
export default async function AdminPage() {
  const { userId } = await auth();
  if (!userId) redirect("/login");

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) throw new Error("NEXT_PUBLIC_CONVEX_URL not set");
  const convex = new ConvexHttpClient(convexUrl);
  const isAdmin = await convex.query(api.users.isClerkUserAdmin, {
    clerkUserId: userId,
  });
  if (!isAdmin) redirect("/");

  return <AdminConsole />;
}
