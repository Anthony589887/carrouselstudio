# RepackIt Carousel Studio

Outil interne pour générer des carrousels d'images TikTok/Instagram pour RepackIt.
Génère 6 slides par carrousel via l'API Gemini Nano Banana 2 Flash, avec character
lock multimodal pour maintenir un visage cohérent sur 6 slides.

## Stack

- Next.js 16 (App Router) + React 19
- TypeScript strict
- Tailwind CSS v4
- Convex (reactive backend)
- Gemini API (`gemini-3.1-flash-image-preview`)
- Déployé sur Vercel

## Dev local

```bash
pnpm install
pnpm dlx convex dev   # terminal 1
pnpm dev              # terminal 2
```

## Env vars

Copier `.env.example` vers `.env.local` et remplir.

## Phases de développement

- Phase 1 : Setup projet ✅
- Phase 2 : Schema Convex + seed 6 personas
- Phase 3 : Page Personas (CRUD)
- Phase 4 : Pages Formats + Scripts
- Phase 5 : API route Gemini + génération
- Phase 6 : Page Générer (workflow complet)
- Phase 7 : Polish + edge cases
