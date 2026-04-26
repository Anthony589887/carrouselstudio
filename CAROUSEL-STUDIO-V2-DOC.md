# Carousel Studio v2 — Documentation

Architecture plate : **3 entités, 3 écrans, 1 pipeline en Mode A combinatoire**.

---

## Stack

- Next.js 15 (App Router, server actions, edge middleware)
- Convex (DB + storage + actions Node)
- Gemini `gemini-3.1-flash-image-preview` pour la génération d'images
- Sharp q92 mozjpeg pour le post-process anti-watermark + crop final
- TailwindCSS, fond `neutral-950`, accent `orange-500`

---

## Les 3 entités

### `personas`
| Champ | Type | Notes |
|---|---|---|
| `name` | string | Ex : "F1 — Méditerranéenne" |
| `identityDescription` | string | Description physique injectée dans chaque prompt |
| `referenceImageStorageId` | `Id<"_storage">` | Photo de référence pour le character lock |
| `tiktokAccount` | string? | Handle |
| `instagramAccount` | string? | Handle |
| `createdAt` | number | |

### `images`
| Champ | Type | Notes |
|---|---|---|
| `personaId` | `Id<"personas">` | |
| `situationId` | string? | ID dans le dict SITUATIONS (Mode A) |
| `emotionalStateId` | string? | ID dans EMOTIONAL_STATES |
| `framingId` | string? | ID dans FRAMINGS |
| `technicalRegisterId` | string? | ID dans TECHNICAL_REGISTERS |
| `legacyType` | string? | Vieux type v2.0 — uniquement pour images pré-Mode-A |
| `status` | union | `"generating" \| "available" \| "used" \| "deleted" \| "failed"` |
| `imageStorageId` | `Id<"_storage">`? | Vide tant que `generating` |
| `promptUsed` | string | Prompt complet envoyé à Gemini |
| `aspectRatio` | `"4:5" \| "9:16"`? | Format demandé |
| `errorMessage` | string? | Si `failed` |
| `createdAt` | number | |

Index : `by_persona`, `by_persona_and_status`, `by_situation`, `by_legacy_type`.

Les nouvelles images ont les 4 IDs combinatoires + jamais `legacyType`. Les vieilles images (générées avant la refonte Mode A) ont `legacyType` + jamais les 4 IDs. Les deux coexistent dans la même table.

### `carousels`
| Champ | Type | Notes |
|---|---|---|
| `personaId` | `Id<"personas">` | |
| `images` | `{imageId, order}[]` | 5 à 10, ordonnées |
| `status` | `"draft" \| "posted"` | |
| `tiktokLink` / `instagramLink` | string? | Renseignés au passage en `posted` |
| `postedAt` / `createdAt` | number | |

Index : `by_persona`, `by_status`. Création d'un carrousel flippe les images de `available` → `used`.

---

## Les 3 écrans

### Écran 1 — Dashboard `/`
Grille de cards persona (photo, nom, compteurs `available` / `total non-deleted` / `posted`). Bouton **+ Ajouter un persona** ouvre `PersonaCreateModal`. Clic sur card → écran 2.

### Écran 2 — Persona Detail `/persona/[id]`
- **Header** : photo, nom, handles, description d'identité éditable inline.
- **Banque d'images** : grille avec status badge, nom (situationId ou legacyType), registre technique en sous-titre, tooltip avec les 4 IDs au hover. Toggle "inclure les utilisées". Filtres repliables sur 4 dimensions (Espace / Énergie / Social / Éclairage) + filtre "Type (ancien)" si des images legacy existent. Placeholders gris animés pour les `generating`. Tile rouge cliquable pour les `failed` (relance).
- **Carrousels** : liste, miniatures dans l'ordre, liens TikTok/Insta, bouton "Marquer posté". Bouton + Créer un carrousel.

### Écran 3 — Création de carrousel `/persona/[id]/new-carousel`
Sélection 5-10 images `available` avec filtre rapide par espace, ordre par drag (← →), création + flip status.

---

## Pipeline de génération — Mode A combinatoire

### Le composer

Chaque prompt envoyé à Gemini est la concaténation de **5 blocs** :

```
{IDENTITY_ANCHOR}    ← wrapper character lock + identityDescription du persona

{SITUATION.text}     ← tiré du dict SITUATIONS

{EMOTIONAL_STATE.text}   ← tiré de EMOTIONAL_STATES (compatible)

{FRAMING.text}       ← tiré de FRAMINGS (compatible)

{TECHNICAL_REGISTER.text}    ← tiré de TECHNICAL_REGISTERS (compatible)

{RENDERING_DIRECTIVES}   ← constant (avec aspect ratio templated)
```

Plus en parallèle : la photo de référence du persona en `inlineData` jpeg base64 (character lock méthode A).

### Le tirage filtré

`pickCompatibleCombination(filters?)` dans [convex/imagePrompts.ts](convex/imagePrompts.ts) :

1. Filtre le pool `SITUATIONS` selon les `filters` optionnels (lighting / energy / social / space — union dans chaque dimension, intersection entre dimensions).
2. Tire une SITUATION au hasard dans le pool.
3. Tire dans EMOTIONAL_STATES, FRAMINGS, TECHNICAL_REGISTERS uniquement parmi les entrées compatibles avec les tags de la situation.
4. **Compatibilité** = pour chacune des 4 dimensions, mêmes valeurs OU au moins une `flexible`.
5. Si aucune option compatible sur un axe : retry avec une autre situation, max 10 tentatives.

### Système de tags (4 dimensions)

| Dimension | Valeurs |
|---|---|
| `lighting` | daylight-natural, daylight-harsh, golden-hour, dim-warm, dim-cool, fluorescent, screen-only, flexible |
| `energy` | high, medium, low, flexible |
| `social` | alone, with-others, intimate-pair, flexible |
| `space` | indoor-private, indoor-public, outdoor-urban, outdoor-nature, transit, medical, flexible |

### Tailles des dicts

| Dict | Entrées |
|---|---|
| `SITUATIONS` | 60 — chaque entrée = un freeze-frame d'un mini-film |
| `EMOTIONAL_STATES` | 20 — expression + posture, pas mood abstrait |
| `FRAMINGS` | 12 — POV et mécanique de prise de vue |
| `TECHNICAL_REGISTERS` | 8 — registres techniques validés empiriquement |

Combinatoire estimée : **~9 000 combinaisons valides par persona**.

Pour la liste exhaustive des entrées, voir [PROMPT-PIPE.md](PROMPT-PIPE.md) ou directement [convex/imagePrompts.ts](convex/imagePrompts.ts) — c'est la source de vérité.

### Aspect ratio

L'utilisateur choisit `4:5` (Insta 1080×1350) ou `9:16` (TikTok 1080×1920). Gemini reçoit `3:4` ou `9:16` (les ratios qu'il accepte) puis Sharp crop center vers la dim cible dans `/api/postprocess`.

### Pour ajouter une situation / émotion / cadrage / registre

Édite le dict correspondant dans `convex/imagePrompts.ts`, ajoute les 4 tags. C'est tout. Aucune migration de données. Le frontend récupère automatiquement les nouvelles entrées via les queries.

---

## Métadonnées des images générées

Chaque image générée stocke les 4 IDs de sa combinaison :

- `situationId` — ex `"bed-morning-just-woke-up"`
- `emotionalStateId` — ex `"duck-face-playful"`
- `framingId` — ex `"front-cam-selfie-from-above"`
- `technicalRegisterId` — ex `"iphone-natural-daylight-soft"`

Plus `promptUsed` qui contient le texte exact envoyé. Utile pour :
- Debug rapide ("cette image rate, quelle combinaison était-ce ?")
- Identifier empiriquement les combinaisons gagnantes
- Reproduire une combinaison à l'identique

---

## Filtres UI (Mode 3c)

### Panneau de génération

- Input "nombre d'images" (1-50, default 10)
- Toggle aspect ratio
- Lien repliable **Options avancées (filtres)** :
  - 4 multi-select sur Espace / Énergie / Social / Éclairage
  - Si combinaison trop restrictive (0 situation match) → warning "Élargis ta sélection"
- Bouton "Lancer la génération" : retourne en <100 ms, modale ferme, placeholders apparaissent dans la bank

### Banque d'images

- Toggle "inclure les utilisées"
- Lien repliable **Filtres** avec compteur :
  - Multi-select sur les 4 dimensions
  - Multi-select "Type (ancien)" qui n'apparaît que si des images legacy existent pour ce persona
- Tooltip détaillé au hover de chaque tile (4 IDs + erreur si failed)

### Tag filters côté serveur

Dans `images.list`, les filtres tag-level (lighting/energy/social/space) sont résolus en intersection sur les `situationId` correspondants, puis appliqués comme un `WHERE situationId IN (...)`. Implication : **les images legacy (sans situationId) sont exclues** quand un filtre tag-level est actif. Pour les voir, l'utilisateur passe par le filtre "Type (ancien)".

---

## Pipeline d'exécution (async parallèle)

Le clic "Lancer la génération" appelle `imageBatch.generateBatch({ personaId, count, aspectRatio, filters? })` — une **mutation** :

1. Pour chaque image (×N) :
   - Tire une combinaison via `pickCompatibleCombination(filters)`
   - Compose le prompt
   - **Insert immédiat** d'une row `images` avec status `generating`, prompt, 4 IDs
   - **Schedule** une action `runGeneration` via `ctx.scheduler.runAfter(0, ...)`
2. La mutation retourne en <100 ms avec la liste des `imageIds` créés.

Côté action `runGeneration` (parallèle, N indépendantes) :

1. Lit la photo de référence du persona depuis storage
2. Appelle Gemini avec `inlineData` + `img.promptUsed`, retry exponentiel sur erreurs transientes (réseau, surcharge)
3. Stocke l'image, marque la row `available`
4. Best-effort POST `/api/postprocess` (si `SITE_URL` set) → Sharp crop + anti-watermark + remplace storage
5. En cas d'échec : marque la row `failed` avec `errorMessage`

L'utilisateur voit les placeholders se remplir en temps réel via `useQuery` réactif. Une image failed est cliquable pour relancer (`imageBatch.retryImage` réutilise le même `promptUsed`).

---

## Routes

| Route | Type |
|---|---|
| `/` | Dashboard personas (client) |
| `/persona/[id]` | Persona detail (client) |
| `/persona/[id]/new-carousel` | Création carrousel (client) |
| `/login` | Auth gate (mot de passe) |
| `/api/login` | POST — set cookie |
| `/api/postprocess` | POST `{imageId}` — Sharp crop + q92 anti-watermark, replace storage |

---

## Modules Convex

| Fichier | Rôle |
|---|---|
| `schema.ts` | 3 tables avec les nouveaux 4 IDs + legacyType |
| `personas.ts` | CRUD personas + counters |
| `images.ts` | `list` (avec filtres tag-level + legacyTypes), `getById`, `remove` (soft), `replaceStorage`, lifecycle internals (`markCompleted` / `markFailed`), `distinctLegacyTypes` |
| `carousels.ts` | `listByPersona`, `get`, `create` (5-10 + flip status), `markAsPosted`, `remove` |
| `imagePrompts.ts` | Mode A : 5 dicts, types Tags, `composePrompt`, `isCompatible`, `pickCompatibleCombination`, `geminiAspectRatio`, lookups |
| `imageBatch.ts` | Mutations `generateBatch` (insert N + schedule N) et `retryImage` |
| `imageGeneration.ts` | Action node `runGeneration` (Gemini + retry transient + post-process callback) |

---

## Variables d'environnement

```bash
NEXT_PUBLIC_CONVEX_URL=...
CONVEX_DEPLOYMENT=...
CONVEX_DEPLOY_KEY=...           # Vercel only
GEMINI_API_KEY=...              # convex env set GEMINI_API_KEY <val>
SITE_URL=https://carrouselstudio.vercel.app   # convex env set --prod, active la post-prod Sharp
AUTH_PASSWORD=...
AUTH_TOKEN_VALUE=...            # opaque UUID stocké en cookie
```

Build script Vercel : `convex deploy --cmd 'next build' --cmd-url-env-var-name NEXT_PUBLIC_CONVEX_URL` — chaque push déploie back puis front avec la bonne URL injectée.

---

## Migration douce v2 → Mode A

Aucune perte. Les vieilles images générées sous v2 (champ `type` rigide) ont été migrées : `type` → `legacyType`. Elles restent affichées et filtrables par "Type (ancien)" mais ne participent pas aux filtres tag-level. Les nouvelles images sont en Mode A avec les 4 IDs.
