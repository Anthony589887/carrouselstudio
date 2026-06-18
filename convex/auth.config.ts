// Convex ↔ Clerk integration. The `domain` is the Clerk JWT issuer
// (set via `convex env set CLERK_JWT_ISSUER_DOMAIN`), and `applicationID`
// must match the Clerk JWT template name — here "convex".
export default {
  providers: [
    {
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN,
      applicationID: "convex",
    },
  ],
};
