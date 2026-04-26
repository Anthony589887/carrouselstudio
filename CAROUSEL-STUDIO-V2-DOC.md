# Carousel Studio v2 — Documentation

Refonte complète. Architecture plate : **3 entités, 3 écrans, 1 pipeline**.

---

## Stack

- Next.js 15 (App Router, server actions, edge middleware)
- Convex (DB + storage + actions)
- Gemini `gemini-3.1-flash-image-preview` pour la génération d'images
- Sharp q92 mozjpeg pour le post-process anti-watermark
- TailwindCSS, fond `neutral-950`, accent `orange-500`

---

## Les 3 entités

### `personas`
| Champ | Type | Notes |
|---|---|---|
| `name` | string | Ex : "Clara" |
| `identityDescription` | string | Description physique injectée dans chaque prompt Gemini |
| `referenceImageStorageId` | `Id<"_storage">` | Photo de référence pour le character lock |
| `tiktokAccount` | string? | Handle |
| `instagramAccount` | string? | Handle |
| `createdAt` | number | |

Pas de code. Pas de `faceBlock`. Pas de gender / age / ethnicity séparés — tout est encapsulé dans `identityDescription`.

### `images`
| Champ | Type | Notes |
|---|---|---|
| `personaId` | `Id<"personas">` | |
| `type` | string | Catégorie (selfie-frontcam, photo-fatiguee, etc.) |
| `status` | `"available" \| "used" \| "deleted"` | Soft delete |
| `imageStorageId` | `Id<"_storage">` | Image post-processée |
| `promptUsed` | string | Prompt exact envoyé à Gemini |
| `createdAt` | number | |

Index : `by_persona`, `by_persona_and_status`, `by_type`.

Soft delete : suppression = `status = "deleted"`. Disparaît de la banque mais reste référencée si déjà utilisée dans un carrousel (affichée comme "supprimée" dans le carrousel).

### `carousels`
| Champ | Type | Notes |
|---|---|---|
| `personaId` | `Id<"personas">` | |
| `images` | `{imageId, order}[]` | 5 à 10 images, ordonnées |
| `status` | `"draft" \| "posted"` | |
| `tiktokLink` | string? | Renseigné au passage en `posted` |
| `instagramLink` | string? | Idem |
| `postedAt` | number? | Idem |
| `createdAt` | number | |

Index : `by_persona`, `by_status`.

Quand un carrousel est créé, les images passent automatiquement de `available` à `used`. Quand un carrousel est supprimé, les images repassent à `available`.

---

## Les 3 écrans

### Écran 1 — Dashboard `/`
- Grille de cards (1/2/3 colonnes responsive).
- Chaque card : photo de référence, nom, compteurs (`available`, `total non-deleted`, `posted`).
- Bouton **+ Ajouter un persona** ouvre `PersonaCreateModal` (nom, description identité, photo, TikTok, Insta).
- Clic sur card → écran 2.

### Écran 2 — Persona Detail `/persona/[id]`

**Header** : photo, nom, handles, description d'identité éditable inline (clic pour éditer, sauvegarde immédiate).

**Section Banque d'images** :
- Toggle "inclure les images utilisées" (par défaut : seulement `available`).
- Filtre multi-select sur les 20 types.
- Grille 2/3/4/5 colonnes. Chaque image : type en mono, badge status, bouton suppression (hover).
- Bouton **+ Générer** ouvre `ImageGenerationPanel` (liste des types, − / + par type, total, lancer).

**Section Carrousels** :
- Liste des carrousels (date desc).
- Status badge, date, liens TikTok/Insta.
- Bande horizontale des miniatures dans l'ordre du carrousel.
- Bouton **Marquer posté** (si `draft`) ouvre `PostCarouselModal`.
- Bouton **+ Créer un carrousel** → écran 3.

### Écran 3 — Création de carrousel `/persona/[id]/new-carousel`

Deux zones :
- **Ordre du carrousel** (haut) : bande horizontale des images sélectionnées avec position numérotée, boutons ← → pour réordonner, × pour désélectionner.
- **Images disponibles** (bas) : filtre par type, grille des images `available`. Clic pour sélectionner (badge orange numéroté). Limite : max 10 sélections.

Bouton **Créer** : disabled si < 5. Crée le carrousel, marque les images comme `used`, redirige vers l'écran 2.

---

## Pipeline de génération

Action Convex : `imageGeneration.generateBatch({ personaId, requests: [{type, count}] })`.

Pour chaque image à générer (action interne `generateOneInternal`) :

1. Récupère persona + identité.
2. Lit l'image de référence depuis Convex storage, base64.
3. Compose le prompt :
   ```
   {identityDescription}

   {scene direction tirée des variations du type}

   CRITICAL RENDERING DIRECTIVES:
   - Phone photo quality, NOT studio quality
   - Realistic skin texture: visible pores...
   - iPhone front-camera characteristics...
   - No phone visible (except mirror selfies)
   - Aspect ratio 4:5
   ```
4. Appel Gemini `gemini-3.1-flash-image-preview` avec :
   - `inlineData` : photo de référence (character lock)
   - `text` : prompt composé
   - `imageConfig.aspectRatio: "4:5"` → 1080×1350 pour carrousels Instagram
   - Retry exponentiel sur erreurs transitoires (réseau, surcharge)
5. Résultat stocké dans Convex storage.
6. Insert dans `images` avec `status: "available"`.
7. Best-effort POST à `/api/postprocess` (si `SITE_URL` env défini) qui exécute Sharp :
   ```
   .rotate(0.3)
   .modulate({ saturation: 1.015, brightness: 1.005 })
   .resize(w-4, h-8) → .resize(w, h)   // anti-watermark
   .jpeg({ quality: 92, mozjpeg: true })
   ```
   et remplace le storage de l'image.

---

## Table complète des types d'images

20 types, 3 à 5 variations de scène par type. Variations dans `convex/imagePrompts.ts`. Une variation est tirée par seed (timestamp + index) à chaque génération pour éviter la répétition.

| Type | Description |
|---|---|
| `selfie-frontcam` | Selfie front cam : chambre matin / voiture passenger / canapé soir / sortie de douche / extérieur en marchant |
| `selfie-miroir` | Mirror selfie : salle de bain / chambre / gym / ascenseur / cabine d'essayage |
| `photo-ami` | Photo prise par un ami : parc / terrasse resto / bar nuit / hike / rue ville |
| `photo-couple` | Couple : épaule, bisou joue, selfie cosy, marche main dans la main, regard table resto |
| `photo-cafe` | Cafe : seule à table, takeaway en main, terrasse, working corner |
| `photo-sport` | Gym workout / running outdoor / yoga maison / locker post-workout |
| `photo-rue` | Marche en ville : trottoir / traversée / arrêt phone / vitrines |
| `photo-monument` | Monument : devant, profil, marches, en marchant à côté |
| `photo-vacances` | Plage / pool hôtel / balcon vue mer / marché étranger |
| `photo-nuit` | City night neon / bar dim / streetlight / rooftop string lights |
| `photo-fatiguee` | Look fatigué : canapé hoodie / sol contre lit / lit covers / kitchen counter |
| `photo-grateful` | Bonheur authentique : golden hour outdoor / mug indoor / regard ciel / hug ami |
| `photo-blessee` | Blessée émotionnellement : pleurs salle de bain / sol bathtub / lit recroquevillée |
| `photo-coeur-brise` | Cœur brisé : edge of bed / fenêtre pluie / blanket couch staring |
| `photo-decue` | Déçue : phone frown / kitchen arms crossed / café déflatée |
| `snapshot-mains` | Mains : tasse / typing / book / petit objet |
| `snapshot-pieds` | Pieds : sneakers trottoir / sable plage / cosy socks couch / sandales terrasse |
| `snapshot-plat` | Flat lay : meal resto / breakfast home / desk setup |
| `snapshot-livre` | Livre : tenu en main / sur table avec café / contre fenêtre |
| `photo-lifestyle` | Lifestyle : cooking / tidying / arrosage plantes / pet couch / skincare miroir |

Pour ajouter un type : ajouter l'entrée dans `IMAGE_TYPES` (à la fois `convex/imagePrompts.ts` ET `lib/imageTypes.ts`) et les variations dans `TYPE_VARIATIONS`.

---

## Routes

| Route | Type |
|---|---|
| `/` | Dashboard personas (client) |
| `/persona/[id]` | Persona detail (client) |
| `/persona/[id]/new-carousel` | Création carrousel (client) |
| `/login` | Auth gate (mot de passe) |
| `/api/login` | POST — set cookie |
| `/api/postprocess` | POST `{imageId}` — Sharp q92 anti-watermark, replace storage |

Auth via cookie `carousel_auth` validé en middleware contre `AUTH_TOKEN_VALUE`. Inchangé depuis la v1.

---

## Modules Convex

| Fichier | Contenu |
|---|---|
| `schema.ts` | 3 tables : personas, images, carousels |
| `personas.ts` | `list`, `get`, `create`, `update`, `remove`, `generateUploadUrl`, `getStorageUrl`, `getInternal` |
| `images.ts` | `list`, `listByIds`, `getById`, `remove` (soft), `replaceStorage`, `generateUploadUrl`, `insertGenerated` (internal) |
| `carousels.ts` | `listByPersona`, `get`, `create` (validation 5–10 + flip status), `markAsPosted`, `remove` |
| `imagePrompts.ts` | Pure helpers : `IMAGE_TYPES`, `composePrompt`, `pickVariation` |
| `imageGeneration.ts` | Action node : `generateBatch` (public) → loop `generateOneInternal` |

---

## Variables d'environnement

```bash
NEXT_PUBLIC_CONVEX_URL=...
CONVEX_DEPLOYMENT=...
CONVEX_DEPLOY_KEY=...           # Vercel only
GEMINI_API_KEY=...              # also: convex env set GEMINI_API_KEY <val>
AUTH_PASSWORD=...
AUTH_TOKEN_VALUE=...            # opaque UUID stored in cookie
SITE_URL=https://...            # optional — enables post-process callback
```

---

## Ce qui a été supprimé de la v1

**Tables Convex supprimées** : `formats`, `scripts`, `generations`, `ui_assets`.

**Champs personas supprimés** : `code`, `gender`, `ethnicity`, `age`, `faceBlock`, `defaultDA`, `notes`, `isActive`. Tout fusionné dans `identityDescription`.

**Modules Convex supprimés** : `formats.ts`, `scripts.ts`, `generations.ts`, `generation.ts` (ancien), `uiAssets.ts`, `crons.ts`, `_migrations/*`.

**Pages frontend supprimées** : `/generer`, `/personas`, `/scripts`, `/scripts/new`, `/scripts/[id]`, `/formats`, `/formats/new`, `/formats/[id]`.

**Composants supprimés** : `Sidebar`, `MobileNav`, `FormatEditor`, `ScriptEditor`, `PersonaCard`, `PersonaModal` (ancien), `StatusBadge`, `SlideCard`.

**Concepts éliminés** :
- Codes (F01, F02, F1, H1, etc.)
- Slide templates / slot system
- Formats / archetypes / DA par défaut
- Scripts (outfitBrief, locationBrief, slides codifiés)
- Generations en tant qu'entité (chaque image est désormais autonome)
- Cron unstickStuckSlots
- Migrations (table de migrations 5_x)
- Seeds scripts (`scripts/seed.ts`, `scripts/update-f01-slot1.ts`)

**Conservé** : auth middleware/cookie, route `/api/postprocess` (réécrite pour la nouvelle table `images`), pipeline Sharp q92, retry transient errors sur Gemini.
