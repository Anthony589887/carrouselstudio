import { SignIn } from "@clerk/nextjs";

// Invite-only: Clerk's <SignIn/> only. There is NO sign-up route — new
// creators are invited from the Clerk dashboard. The catch-all segment
// ([[...rest]]) lets Clerk handle its own sub-routes (factor-one,
// sso-callback, …) under /login.
export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-950 p-6">
      <SignIn />
    </div>
  );
}
