import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Public routes — everything else requires an authenticated Clerk session.
//   - /login(/...)      : the Clerk <SignIn/> page (catch-all sub-routes).
//   - /api/postprocess  : called server→server by Convex actions, never by a
//     browser session. It MUST stay reachable without a session. It will be
//     locked down with a shared secret in P2 — not now.
const isPublicRoute = createRouteMatcher([
  "/login(.*)",
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
