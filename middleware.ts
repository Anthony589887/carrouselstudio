import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Public routes — everything else requires an authenticated Clerk session.
//   - /login(/...)             : the Clerk <SignIn/> page (catch-all sub-routes).
//   - /accept-invitation(/...) : consumes the invitation __clerk_ticket to
//     finalize the account. The invited user is NOT signed in yet, so this must
//     be reachable without a session (else they'd bounce to /login first).
//   - /api/postprocess         : called server→server by Convex actions, never
//     by a browser session. Stays reachable without a session (lockdown is P4).
const isPublicRoute = createRouteMatcher([
  "/login(.*)",
  "/accept-invitation(.*)",
  "/api/postprocess",
]);

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files, unless found in search params.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes.
    "/(api|trpc)(.*)",
  ],
};
