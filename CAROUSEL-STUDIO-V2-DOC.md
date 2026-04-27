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
| `gender` | `"feminine" \| "masculine" \| "neutral"`? | Optionnel dans le schema (rétrocompat) mais obligatoire à la création via UI. Filtre le tirage : seules les entrées des dicts dont le tag `gender` matche, ou `neutral`, sont tirables. La migration `personas.migrateGenders` backfille les rows existantes. Le composer traite l'absence comme `feminine` (rétrocompat). |
| `signatureFeatures` | string? | Optionnel. Pour traits physiques rares à amplifier dans les prompts (vitiligo, taches de naissance distinctives, cicatrices marquées, etc.). Si non-vide, déclenche un bloc CRITICAL dans le wrapper d'identité. |
| `referenceImageStorageId` | `Id<"_storage">` | Photo de référence pour le character lock |
| `tiktokAccount` | string? | Handle |
| `instagramAccount` | string? | Handle |
| `createdAt` | number | |

### `images`
| Champ | Type | Notes |
|---|---|---|
| `personaId` | `Id<"personas">` | |
| `folderId` | `Id<"folders">?` | Dossier d'organisation, optionnel |
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

Index : `by_persona`, `by_persona_and_status`, `by_situation`, `by_legacy_type`, `by_folder`.

Les nouvelles images ont les 4 IDs combinatoires + jamais `legacyType`. Les vieilles images (générées avant la refonte Mode A) ont `legacyType` + jamais les 4 IDs. Les deux coexistent dans la même table.

### `carousels`
| Champ | Type | Notes |
|---|---|---|
| `personaId` | `Id<"personas">` | |
| `folderId` | `Id<"folders">?` | Dossier d'organisation, optionnel |
| `images` | `{imageId, order}[]` | 5 à 10, ordonnées |
| `status` | `"draft" \| "posted"` | |
| `tiktokLink` / `instagramLink` | string? | Renseignés au passage en `posted` |
| `postedAt` / `createdAt` | number | |

Index : `by_persona`, `by_status`, `by_folder`. Création d'un carrousel flippe les images de `available` → `used`.

### `folders`
| Champ | Type | Notes |
|---|---|---|
| `personaId` | `Id<"personas">` | Dossier rattaché à un persona |
| `name` | string | Libre, max 80 chars |
| `createdAt` | number | |

Index : `by_persona`. Voir section "Dossiers" plus bas.

---

## Les 3 écrans

### Écran 1 — Dashboard `/`
Grille de cards persona (photo, nom, compteurs `available` / `total non-deleted` / `posted`). Bouton **+ Ajouter un persona** ouvre `PersonaCreateModal`. Clic sur card → écran 2.

### Écran 2 — Persona Detail `/persona/[id]`

**Navigation 2 niveaux** via query param `?folder=<id>` (ou absent = vue racine).

**Vue racine (par défaut)** :
- **Header** : photo, nom, handles, description d'identité éditable inline.
- **Bloc Dossiers** (n'apparaît que si au moins 1 dossier existe) : grille de tiles 📁 avec compteurs `X images, Y carrousels`. Bouton "+ Nouveau dossier" toujours visible. Kebab sur chaque tile : Renommer / Supprimer.
- **Bloc Images** : titre devient "Images sans dossier" si dossiers existent, sinon "Banque d'images". Grille avec status badge, label situation (français), registre technique en sous-titre, tooltip avec les 4 IDs au hover. Toggle "inclure les utilisées" + filtres tag-level + filtre "Type (ancien)" si legacy. Mode "Sélection multiple" qui ajoute des cases à cocher + une barre flottante en bas pour déplacer en bulk. Kebab par tile : Déplacer vers > Racine / dossiers / Supprimer. Badge cliquable "Dans un carrousel" sur les images `used` qui ouvre un popover listant les carrousels (lazy via `images.getCarouselUsages`).
- **Bloc Carrousels** : titre devient "Carrousels sans dossier" si dossiers existent. Liste, miniatures grandes, kebab "Déplacer vers". Bouton "+ Créer un carrousel".

**Vue d'un dossier (`?folder=<id>`)** :
- Breadcrumb `← {persona} / 📁 {dossier} ⋯` avec kebab Renommer/Supprimer.
- "Images du dossier" + "Carrousels du dossier" — mêmes contrôles que la racine, filtrés au folder.
- Cliquer "+ Créer un carrousel" depuis ce contexte ajoute `?from=<folderId>` à l'URL — le carrousel créé est automatiquement assigné au dossier.

### Écran 3 — Création de carrousel `/persona/[id]/new-carousel`

Layout **fullscreen sans chrome global** (route group `(fullscreen)`). Trois zones :

- **Header sticky en haut** : ← Retour, titre `Créer un carrousel — {persona.name}`, compteur `X / 10` (orange si <5, vert sinon).
- **Banque scrollable** : grille responsive 2/3/4/5/6 colonnes, filtre par espace en haut. Clic = sélectionne, badge orange numéroté apparaît.
- **Sticky bottom bar** avec preview en grand format (210px de haut) — chaque tile montre l'image + numéro d'ordre + croix retirer + flèches ← → pour réordonner. Bouton **Créer →** à droite, disabled tant que <5 sélectionnées. Si plus que ce qui rentre en largeur → scroll horizontal.

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

Si `persona.signatureFeatures` est non-vide (après trim), un bloc CRITICAL est inséré entre la phrase d'ouverture du wrapper d'identité et `identityDescription` :

```
CRITICAL — PERMANENT IDENTITY MARKERS:
{persona.signatureFeatures}

These markers are part of her permanent identity. They must be clearly visible in every photo where the relevant body part is in frame. Do not omit them, do not soften them, do not move them — they are as fixed as her eye color or her facial bone structure.
```

Si `signatureFeatures` est `undefined`, `""` ou whitespace-only, le wrapper reste inchangé. Permet de renforcer la cohérence des traits rares (vitiligo, taches de naissance, cicatrices) sans polluer les personas standards.

### Le tirage filtré

`pickCompatibleCombination({ filters?, personaGender })` dans [convex/imagePrompts.ts](convex/imagePrompts.ts) :

0. **Pré-filtre gender (toujours actif)** : exclut des 4 dicts toutes les entrées dont `tags.gender` ne matche pas `personaGender` et n'est pas `neutral`. Étape orthogonale aux 4 dimensions classiques.
1. Filtre le pool `SITUATIONS` (déjà gender-filtré) selon les `filters` optionnels (lighting / energy / social / space — union dans chaque dimension, intersection entre dimensions).
2. Tire une SITUATION au hasard dans le pool.
3. Tire dans EMOTIONAL_STATES, FRAMINGS, TECHNICAL_REGISTERS (déjà gender-filtrés) uniquement parmi les entrées compatibles avec les tags de la situation.
4. **Compatibilité** = pour chacune des 4 dimensions classiques, mêmes valeurs OU au moins une `flexible`.
5. Si aucune option compatible sur un axe : retry avec une autre situation, max 10 tentatives.

`imageBatch.startBatch` et `imageBatch.regenerateWithNewCombination` lisent `persona.gender` (fallback `feminine` si absent — rétrocompat) et le passent au composer.

### Système de tags (5 dimensions)

| Dimension | Valeurs |
|---|---|
| `lighting` | daylight-natural, daylight-harsh, golden-hour, dim-warm, dim-cool, fluorescent, screen-only, flexible |
| `energy` | high, medium, low, flexible |
| `social` | alone, with-others, intimate-pair, flexible |
| `space` | indoor-private, indoor-public, outdoor-urban, outdoor-nature, transit, medical, flexible |
| `gender` | feminine, masculine, neutral *(orthogonale, sans `flexible`)* |

⚠️ La dimension `gender` est **orthogonale** aux 4 autres : elle ne suit **pas** la règle de compatibilité `flexible`. Une entrée passe le filtre gender ssi `entry.tags.gender === persona.gender` OU `entry.tags.gender === "neutral"`. Le pré-filtrage gender est appliqué sur les 4 dicts AVANT le filtrage tag-level classique et le tirage de la situation.

### Tailles des dicts

| Dict | Entrées |
|---|---|
| `SITUATIONS` | 73 — chaque entrée = un freeze-frame d'un mini-film |
| `EMOTIONAL_STATES` | 20 — expression + posture, pas mood abstrait |
| `FRAMINGS` | 15 — POV et mécanique de prise de vue |
| `TECHNICAL_REGISTERS` | 9 — registres techniques validés empiriquement |

Combinatoire estimée : **~12 000-15 000 combinaisons valides par persona**.

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

### Source de vérité unique pour l'UI

Tous les multi-select de tags (panel + filtres bank + filtre new-carousel) lisent leurs valeurs depuis la query Convex `imagePrompts.getDictsMetadata`. Cette query retourne :

- `tagValues.{lighting,energy,social,space}` — déduplication des valeurs réellement utilisées par les 73 situations (donc on n'affiche jamais une option morte)
- `dimensionNames` et `tagDisplayNames` — libellés français pour les dimensions et chaque valeur de tag
- `situations[].{id, displayName, tags}` — tags légers (sans le `text`) pour l'estimateur "0 match" du panel + libellé affichable
- `emotionalStates[]`, `framings[]`, `technicalRegisters[]` — chacun `{id, displayName}`

**Aucune duplication** : modifier un tag, un texte, ou un displayName dans `convex/imagePrompts.ts` se propage immédiatement à toute l'UI au prochain render.

### Affichage UI — bascule en français

Chaque entrée des 4 dicts (`SITUATIONS`, `EMOTIONAL_STATES`, `FRAMINGS`, `TECHNICAL_REGISTERS`) porte trois champs :

| Champ | Rôle |
|---|---|
| `id` | Clé technique en anglais. Stocké en DB (`situationId`, `emotionalStateId`, etc.). Jamais affiché à l'utilisateur. |
| `text` | Description anglaise envoyée à Gemini dans le prompt. |
| `displayName` | Libellé français affiché à l'utilisateur (panel, filtres, sous-titres de tiles, tooltips). |

Le hook frontend `useDictsMetadata()` (`lib/useDictsMetadata.ts`) wrappe la query et expose des helpers : `situationLabel(id)`, `emotionLabel(id)`, `framingLabel(id)`, `registerLabel(id)`, `tagLabel(dim, value)`, `dimensionLabel(dim)`. Tous tombent en fallback sur la valeur brute si le mapping n'existe pas — robuste pour les valeurs `legacyType` qui ne sont plus dans les dicts.

Les exports `DIMENSION_DISPLAY_NAMES` et `TAG_DISPLAY_NAMES` dans `convex/imagePrompts.ts` mappent respectivement `lighting/energy/social/space` → libellé dimension et `lighting.{daylight-natural,...}` → libellé tag, tous en français.

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

L'utilisateur voit les placeholders se remplir en temps réel via `useQuery` réactif.

### Deux paths de relance pour une image `failed`

Sur chaque tile rouge, deux boutons :

- **⟳ réessayer** → `imageBatch.retryImage(id)` — réutilise le même `promptUsed` et les mêmes 4 IDs combinatoires. Idéal pour les erreurs transient (réseau, surcharge Gemini, safety filter ponctuel).
- **⤬ nouvelle combo** → `imageBatch.regenerateWithNewCombination(id)` — fait un nouveau tirage `pickCompatibleCombination()` sans filtre, recompose un prompt complet, écrase les 4 IDs et le `promptUsed`, repasse en `generating`. Idéal pour une combinaison qui produit intrinsèquement des résultats moisis.

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
| `/api/carousel/[id]/zip` | GET — télécharge un ZIP des images du carrousel, fichiers `01.jpg` … `0N.jpg` dans l'ordre. Nom du zip : `carousel-{persona}-{YYYY-MM-DD}.zip`. Auth via cookie middleware. |

---

## Modules Convex

| Fichier | Rôle |
|---|---|
| `schema.ts` | 3 tables avec les nouveaux 4 IDs + legacyType |
| `personas.ts` | CRUD personas + counters |
| `images.ts` | `list` (avec filtres tag-level + legacyTypes), `getById`, `remove` (soft), `replaceStorage`, lifecycle internals (`markCompleted` / `markFailed`), `distinctLegacyTypes` |
| `carousels.ts` | `listByPersona`, `get`, `create` (5-10 + flip status), `markAsPosted`, `remove` |
| `imagePrompts.ts` | Mode A : 5 dicts, types Tags, `composePrompt`, `isCompatible`, `pickCompatibleCombination`, `geminiAspectRatio`, lookups, **query `getDictsMetadata`** (single source of truth pour l'UI) |
| `imageBatch.ts` | Mutations `generateBatch` (insert N + schedule N), `retryImage` (même combo) et `regenerateWithNewCombination` (nouvelle combo) |
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

## Dossiers

Système d'organisation **plat** par persona. Pas de hiérarchie / sous-dossiers. Une image ou un carrousel est dans **0 ou 1 dossier**.

**Modèle** :
- Table `folders` (`personaId`, `name`, `createdAt`).
- Champ `folderId: optional(Id<"folders">)` sur `images` et `carousels`. `undefined` = à la racine.

**Module Convex `folders.ts`** :
| Fonction | Rôle |
|---|---|
| `list(personaId)` | Retourne dossiers + compteurs `imageCount` / `carouselCount` |
| `get(folderId)` | Retourne `{_id, name, personaId, createdAt}` |
| `create({personaId, name})` | Valide trim non-vide, max 80 chars |
| `rename({folderId, name})` | Idem |
| `remove({folderId})` | Avant suppression, déplace toutes les images et carrousels du dossier vers la racine (`folderId: undefined`). Aucun contenu n'est supprimé. Retourne `{imagesMoved, carouselsMoved}` pour le toast. |

**Mutations de déplacement** :
- `images.moveToFolder({imageId, folderId})` et `images.bulkMoveToFolder({imageIds, folderId})`
- `carousels.moveToFolder({carouselId, folderId})` et `carousels.bulkMoveToFolder({carouselIds, folderId})`
- `folderId: null` = retour à la racine. Validation : le dossier cible doit appartenir au même persona.

**Filtre dossier sur les listes** :
`images.list` et `carousels.listByPersona` acceptent un argument optionnel `folderFilter`:
- `undefined` → toutes les images / carrousels du persona
- `"root"` → uniquement ceux sans `folderId`
- `<folderId>` → uniquement ceux dans ce dossier

Cohabite avec les filtres tag-level — le filtre dossier est appliqué en premier.

**Comportement de suppression** : un dossier supprimé renvoie son contenu à la racine. La confirmation explicite : *"Le dossier 'X' contient Y images et Z carrousels. Si tu le supprimes, ils reviendront à la racine."* Si l'utilisateur était sur la vue dédiée du dossier, redirection automatique vers la racine.

**`images.getCarouselUsages(imageId)`** : query légère, lazy au clic du badge "Dans un carrousel" sur une image `used`. Retourne `[{carouselId, status, folderId, label}]` avec un libellé du type `"Carrousel posté du 27/04/2026"`. Permet de naviguer vers le carrousel (et son dossier si applicable).

---

## Migration douce v2 → Mode A

Aucune perte. Les vieilles images générées sous v2 (champ `type` rigide) ont été migrées : `type` → `legacyType`. Elles restent affichées et filtrables par "Type (ancien)" mais ne participent pas aux filtres tag-level. Les nouvelles images sont en Mode A avec les 4 IDs.
