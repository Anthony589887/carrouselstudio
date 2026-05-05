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
| `stylePreferences` | object? | Optionnel. Permet de pondérer le tirage et d'injecter un mood descriptor dans le prompt. Voir section "stylePreferences par persona" plus bas. Si absent → tirage uniforme + pas d'injection (rétrocompat). |
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
| `status` | union | `"generating" \| "available" \| "used" \| "failed"` (la valeur `"deleted"` a été retirée — voir section Suppression) |
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
| `images` | `{kind?, imageId?, sceneId?, order}[]` | 5 à 10, ordonnées. Polymorphe : `kind: "image"` → `imageId` rempli, `kind: "scene"` → `sceneId` rempli. Voir section "Banque Scenes" pour le 2-step migration. |
| `status` | `"draft" \| "posted"` | |
| `tiktokLink` / `instagramLink` | string? | Renseignés au passage en `posted` |
| `postedAt` / `createdAt` | number | |

Index : `by_persona`, `by_status`, `by_folder`. Création d'un carrousel flippe les images persona de `available` → `used`. Les scenes ne changent pas de statut (réutilisables, voir "Banque Scenes").

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

Chaque prompt envoyé à Gemini est la concaténation de **5 blocs** (+ un bloc mood optionnel) :

```
{IDENTITY_ANCHOR}    ← wrapper character lock + identityDescription du persona

PERSONA MOOD: {moodDescriptor}    ← OPTIONNEL, injecté ssi persona.stylePreferences.moodDescriptor non-vide

{SITUATION.text}     ← tiré du dict SITUATIONS

{EMOTIONAL_STATE.text}   ← tiré de EMOTIONAL_STATES (compatible, non-déprécié)

{FRAMING.text}       ← tiré de FRAMINGS (compatible)

{TECHNICAL_REGISTER.text}    ← tiré de TECHNICAL_REGISTERS (compatible)

{RENDERING_DIRECTIVES}   ← constant (avec aspect ratio templated + 5 CRITICAL RULES)
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

`pickCompatibleCombination({ filters?, personaGender, stylePreferences? })` dans [convex/imagePrompts.ts](convex/imagePrompts.ts) :

0. **Pré-filtre gender (toujours actif)** : exclut des 4 dicts toutes les entrées dont `tags.gender` ne matche pas `personaGender` et n'est pas `neutral`. Étape orthogonale aux 4 dimensions classiques.
0bis. **Filtre `deprecated`** : les émotions marquées dépréciées (cf. section dédiée) sont exclues du pool de tirage mais restent dans `EMOTIONAL_STATES` pour le lookup d'images historiques.
1. Filtre le pool `SITUATIONS` (déjà gender-filtré) selon les `filters` optionnels (lighting / energy / social / space — union dans chaque dimension, intersection entre dimensions).
2. **Tirage pondéré de la SITUATION** : si `stylePreferences.spaceWeights` est défini, le tirage applique le multiplier de la dimension `space` correspondante (1.0 par défaut). Sinon tirage uniforme.
3. Tire dans EMOTIONAL_STATES, FRAMINGS, TECHNICAL_REGISTERS (déjà gender-filtrés) uniquement parmi les entrées compatibles avec les tags de la situation.
4. **Tirage pondéré de l'ÉMOTION** : si `stylePreferences.emotionWeights` est défini, on calcule le multiplier de chaque émotion via `EMOTION_MOOD_CATEGORIES` (multipliers compound si l'émotion appartient à plusieurs catégories). Sinon uniforme.
5. **Tirage pondéré du REGISTER** : si `stylePreferences.registerWeights` est défini, multiplier par registerId. Sinon uniforme.
6. Le FRAMING reste tiré uniformément (pas de pondération sur cette dimension dans la spec actuelle).
7. **Compatibilité** = pour chacune des 4 dimensions classiques, mêmes valeurs OU au moins une `flexible`.
8. Si aucune option compatible sur un axe : retry avec une autre situation, max 10 tentatives.

`imageBatch.generateBatch` et `imageBatch.regenerateWithNewCombination` lisent `persona.gender` (fallback `feminine` si absent — rétrocompat) et `persona.stylePreferences` (fallback uniforme si absent), et passent les deux au composer + au tirage. Le composer injecte automatiquement `stylePreferences.moodDescriptor` après l'identity block du prompt s'il est non-vide.

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
| `SITUATIONS` | **251** — freeze-frames variés (selfies front-cam, domestic, public, work, vacation, social, intimacy, **creative class lifestyle**) |
| `EMOTIONAL_STATES` | **174 actives + 10 dépréciées** = 184 — expression + posture, pas mood abstrait. Les dépréciées restent pour lookup mais sortent du tirage |
| `FRAMINGS` | 18 — POV et mécanique de prise de vue (avec 3 cadrages éditoriaux : aerial top-down, side profile cinématographique, **flatlay sans visage**) |
| `TECHNICAL_REGISTERS` | 9 — registres techniques validés empiriquement |

Le pipe couvre maintenant un registre **creative class lifestyle** (27 situations + 3 cadrages éditoriaux : workspace soigné, cocooning productif, atelier créatif, home office lumineux, vue plongeante éditoriale) en plus du registre selfie casual existant. Le cadrage `flatlay-objects-no-face` est un cas particulier : il produit des images **sans personne** (objets sur surface), utile pour des slides "objet/produit/setup" dans les carrousels — la photo de référence du persona reste envoyée à Gemini mais l'instruction explicite "NO PERSON visible" prend le pas.

Combinatoire estimée (tirage uniforme sans `stylePreferences`) :
- Persona féminin : **~80 000-100 000 combinaisons valides**
- Persona masculin : **~60 000-80 000 combinaisons valides**
- Persona neutre : intersection — uniquement les entrées `neutral`

Avec `stylePreferences` actif, la combinatoire effective est biaisée vers les zones dominantes du persona (ex : F1 sad-girl tire ~2× plus dans `melancholic` + `indoor-private`), tout en conservant l'intégralité du pool en cas de besoin.

Pour la liste exhaustive des entrées, voir directement [convex/imagePrompts.ts](convex/imagePrompts.ts) — c'est la source de vérité.

### Aspect ratio

L'utilisateur choisit `4:5` (Insta 1080×1350) ou `9:16` (TikTok 1080×1920). Gemini reçoit `3:4` ou `9:16` (les ratios qu'il accepte) puis Sharp crop center vers la dim cible dans `/api/postprocess`.

### Pour ajouter une situation / émotion / cadrage / registre

Édite le dict correspondant dans `convex/imagePrompts.ts`, ajoute les 4 tags. C'est tout. Aucune migration de données. Le frontend récupère automatiquement les nouvelles entrées via les queries.

### Pour déprécier une émotion

Si une émotion produit des résultats indésirables mais qu'elle est référencée par des images existantes :
1. Ajouter son ID dans le `Set` `DEPRECATED_EMOTION_IDS` en haut de `convex/imagePrompts.ts`.
2. **Ne pas la supprimer** de l'array `EMOTIONAL_STATES` — elle reste accessible via `getEmotionalState(id)` pour afficher le label des images historiques.
3. Effet : exclue du pool de tirage de `pickCompatibleCombination` et de la liste exposée par `getDictsMetadata`.

### CRITICAL RULES (RENDERING_DIRECTIVES)

Depuis le chantier "selfie front-cam refonte", `RENDERING_DIRECTIVES` injecte 5 règles critiques après les directives techniques de base :

1. **No emotional apex** — expressions mid-state, jamais au peak.
2. **Smartphone depth of field** — sujet + décor à 1-2m nets, pas de bokeh portrait-mode.
3. **Imperfect framing** — composition approximative, sujet possiblement off-center / cropped.
4. **Subject never aware of being photographed** — même en selfie front-cam, le sujet est "en train de filmer une story", pas "en train de poser".
5. **No commercial photography aesthetics** — pas de pose, pas d'éclairage editorial, pas de magazine-cover.

Ces règles s'appliquent à **toutes** les générations sans exception.

### Mood categories pour pondération

`EMOTION_MOOD_CATEGORIES` (export dans `convex/imagePrompts.ts`) mappe 5 catégories de mood vers des listes d'IDs d'émotions :

| Catégorie | Vibe | Exemples d'IDs |
|---|---|---|
| `melancholic` | tristesse contenue, contemplation | `lost-in-thought`, `quiet-grief-no-tears`, `low-key-sad-mouth-pulled-down` |
| `energetic` | parle, gesticule, anime mid-action | `mid-sentence-talking-to-camera`, `selfie-mid-rant-animated`, `explaining-something-mid-gesture` |
| `confident` | smirk, regard direct, contained pride | `direct-stare-no-emotion`, `chin-up-confident-stare`, `casual-confidence-half-smirk` |
| `serene` | sourires fermés, contentement quiet | `small-smile-genuinely-content`, `relaxed-eyes-soft`, `peace-after-conflict` |
| `tired` | fatigue, vulnérabilité physique | `just-woke-up-puffy-eyes`, `exhausted-end-of-day`, `hangover-mild-squinting` |

Une émotion peut appartenir à plusieurs catégories (ses multipliers se composent multiplicativement). Quand une persona a `stylePreferences.emotionWeights`, le tirage pondère les émotions compatibles avec la situation par le produit des multipliers de leurs catégories.

### stylePreferences par persona

Champ optionnel sur la table `personas`. Permet de biaiser le tirage et d'injecter un mood descriptor textuel dans le prompt.

```ts
stylePreferences?: {
  moodDescriptor?: string;  // Ex: "Sad-girl aesthetic. Often melancholic, contemplative, alone in private spaces."
  emotionWeights?: { melancholic: number; energetic: number; confident: number; serene: number; tired: number };
  spaceWeights?: { "indoor-private": number; "indoor-public": number; "outdoor-urban": number; "outdoor-nature": number; transit: number; medical: number };
  registerWeights?: { /* 9 ids de TECHNICAL_REGISTERS → multipliers */ };
}
```

**Sémantique des multipliers** : 1.0 = neutre, 2.0 = 2× plus probable, 0.5 = moitié moins. Plage UI : 0.0 à 5.0 par tranches de 0.1.

**Édition UI** : section "Préférences de style (avancé)" repliable sur la page persona detail (`components/StylePreferencesPanel.tsx`). L'interface par défaut propose une **vue simplifiée** avec :

- 5 boutons de **suggestions de mood** pré-remplissant la textarea (Sad-girl, Confiante body-positive, Looksmaxxing, Social urbain, Custom) — celui correspondant exactement au texte courant est surligné.
- Pour chaque dimension pondérée, des **radios verbaux** Rare / Normal / Fréquent qui mappent vers 0.5 / 1.0 / 2.0 :
  - 5 émotions (Mélancolique, Énergique, Confiant, Serein, Fatigué)
  - 4 groupes d'espaces (Chez soi, Lieux publics, Extérieur, Transport) — où "Extérieur" pilote `outdoor-urban` ET `outdoor-nature` simultanément avec le même multiplier. Le 6ème espace `medical` n'apparaît qu'en mode avancé.
- Toggle **"⚙ Mode avancé (chiffres exacts)"** qui expose les inputs numériques originaux (5 emotionWeights + 6 spaceWeights) avec plage 0.0–5.0 par tranches de 0.1. Synchronisation bidirectionnelle entre radios et numérique.
- Tooltips ⓘ sur chaque label (sémantique de la dimension, exemples concrets).
- Footer : Enregistrer / Annuler / Réinitialiser.

**Arrondi numérique → verbal** (helper `numericToLevel`) :
- `value ≤ 0.75` → Rare (couvre 0.5 et 0.7)
- `value ≥ 1.5` → Fréquent (couvre 1.5 et 2.0)
- sinon → Normal (couvre 0.8–1.4, dont 1.0 et 1.2)

Cette tolérance permet aux presets seed (qui contiennent des valeurs comme 0.7 ou 1.2) de s'afficher cohéremment dans les radios sans perte de précision côté backend. Saisir une valeur exacte en mode avancé la conserve telle quelle ; passer par les radios la fixe à 0.5 / 1.0 / 2.0.

**Seed** : `npx convex run personas:seedStylePreferences` applique les presets pour les personas dont le nom matche `^[FH][0-9]` (F1, F2, H1, H2, H3). Idempotent par défaut (skip si déjà set), `--force` pour écraser. Les autres personas restent à `undefined` → tirage uniforme.

**Effet pratique** : sur 10 générations d'une persona F1 (sad-girl, melancholic ×2, indoor-private ×2), on doit observer ~50-70% d'images en intérieur privé avec émotions melancholic, contre ~15-20% sans `stylePreferences`. Le système reste capable de tirer toute combinaison — c'est juste un biais, pas une exclusion.

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
4. Best-effort POST `/api/postprocess` (si `SITE_URL` set) → Sharp crop + anti-watermark + **strip C2PA** + remplace storage
5. En cas d'échec : marque la row `failed` avec `errorMessage`

L'utilisateur voit les placeholders se remplir en temps réel via `useQuery` réactif.

### Post-process : strip C2PA / JUMB

Gemini insère un marker C2PA (`jumb` + `jumdc2pa` + signature Google LLC) dans les segments JPEG de chaque image générée. Sharp préserve par défaut ces segments JUMB, donc le pipeline initial (rotation + modulate + resize + jpeg) ne suffisait pas — TikTok et Instagram détectaient l'image comme AI-generated à la milliseconde du post.

Le pipeline `app/api/postprocess/route.ts` force désormais un passage **JPEG → PNG → JPEG** :

1. Étape A : transformations pixel-level (rotation 0.3°, modulate sat/brightness, resize cover + wiggle ±4/8px) → écriture PNG en buffer intermédiaire. PNG n'a pas de format de segments JUMB, donc `jumb`/`jumdc2pa`/`c2pa` sont **physiquement détruits** à cette étape.
2. Étape B : ré-encodage JPEG from scratch depuis le PNG (`quality: 92`, `mozjpeg: true`, `withMetadata({ exif: {} })` pour stripper EXIF).
3. Étape C : scan ceinture-bretelles du buffer final — si l'un des markers `jumb`/`jumdc2pa`/`c2pa` survit (régression Sharp/libjpeg hypothétique), 500 et log explicite, pas d'écriture.

Vérifié en prod : raw Gemini ~725 KB avec 4+ occurrences `c2pa` dans le head → après pipeline 220-240 KB, header EXIF basique seulement, 0 marker.

### Reprocess batch (admin)

Action Convex `imageReprocess.reprocessAllExisting` (Node) listée par `images.listForReprocess` (toutes les images `imageStorageId` non-deleted/failed/generating). Itère et appelle `${SITE_URL}/api/postprocess` pour chaque. Failures individuels collectés, jamais bloquants. Retour `{ total, success, failed, skipped, failures[].slice(0,20) }`.

UI : bouton **"Reprocesser toutes les images (admin)"** en footer du dashboard `/`. Confirmation avant run, toast pendant, résumé + détail des échecs en `<details>`. À conserver permanent dans l'UI pour pouvoir relancer un reprocess en cas d'évolution future du pipeline anti-watermark.

### Auto-cleanup des images bloquées en `generating`

Une image en `generating` depuis plus de **5 minutes** est présumée morte (callback Gemini perdu, post-process crashé, etc.) et flippée en `failed` avec `errorMessage = "Auto-cleanup: stuck in generating > 5 min"`. Deux entrées :

- **Cron Convex** dans `convex/crons.ts`, intervalle **10 minutes**, appelle `internal.images.cleanupStuckGenerating`. Silencieux. Visible dans le dashboard Convex sous l'onglet Schedules.
- **Bouton admin** "Nettoyer les générations bloquées (admin)" en footer du dashboard `/` à côté du reprocess. Pas de confirmation (op sûre — ne touche que les rows `generating` ≥ 5 min). Toast :
  - 0 nettoyées → "Aucune image bloquée trouvée."
  - N nettoyées → "N image(s) bloquée(s) marquée(s) comme failed. Tu peux les réessayer ou les supprimer."

Les rows passées en `failed` apparaissent dans la banque avec leur badge rouge habituel + boutons "Réessayer" et "Nouvelle combo".

### Deux paths de relance pour une image `failed`

Sur chaque tile rouge, deux boutons :

- **⟳ réessayer** → `imageBatch.retryImage(id)` — réutilise le même `promptUsed` et les mêmes 4 IDs combinatoires. Idéal pour les erreurs transient (réseau, surcharge Gemini, safety filter ponctuel).
- **⤬ nouvelle combo** → `imageBatch.regenerateWithNewCombination(id)` — fait un nouveau tirage `pickCompatibleCombination()` sans filtre, recompose un prompt complet, écrase les 4 IDs et le `promptUsed`, repasse en `generating`. Idéal pour une combinaison qui produit intrinsèquement des résultats moisis.

### Suppression d'image (hard delete)

Le pipe ne fait **plus de soft delete**. Cliquer "Supprimer" sur une image (kebab tile ou barre flottante de multi-sélection) :
1. Lookup `images.getCarouselUsages(id)` (ou `getBulkCarouselUsages(ids)` en bulk) pour récupérer les carrousels qui la référencent.
2. Confirmation native augmentée :
   - sans usage : `"Supprimer cette image ? Cette action est définitive."`
   - avec usage(s) : ajoute `"⚠️ Cette image est utilisée dans X carrousel(s) : <noms>. Elle sera retirée de ces carrousels."`
3. Call `images.remove({id})` ou `images.bulkDeleteImages({imageIds})`. Côté serveur :
   - filtre `c.images` de chaque carrousel pour retirer les imageIds visés (le champ `order` n'est pas re-packé — les consommateurs trient par `order` qui peut avoir des trous, indolore)
   - `ctx.storage.delete(imageStorageId)` pour libérer le blob
   - `ctx.db.delete(imageId)` pour la row
4. Toast résultat avec "X image(s) supprimée(s). Y carrousel(s) mis à jour." si applicable.

**Bouton bulk** ajouté à la barre flottante de multi-sélection (à côté du "Déplacer vers…"), libellé `🗑️ Supprimer` en rouge.

**Migration historique** : la mutation `purgeDeletedImages` (internalMutation, à supprimer après migration) a hard-deleté toutes les rows en `status: "deleted"` — 4 sur dev, 79 sur prod (76 storage blobs libérés, 3 rows orphelines sans storage). Une fois cette purge effectuée, le literal `"deleted"` a été retiré du union `imageStatus` du schema.

---

## Routes

| Route | Type |
|---|---|
| `/` | Dashboard personas (client) — nav vers `/scenes` |
| `/persona/[id]` | Persona detail (client) |
| `/persona/[id]/new-carousel` | Création carrousel (client) — onglets "Images persona" / "Scenes" |
| `/scenes` | Banque scenes (client) — voir section "Banque Scenes" |
| `/login` | Auth gate (mot de passe) |
| `/api/login` | POST — set cookie |
| `/api/postprocess` | POST `{kind, imageId|sceneId}` — Sharp crop + q92 anti-watermark, replace storage. `kind: "image"` ou `"scene"` (legacy `{imageId}` toujours accepté, traité comme `kind: "image"`). |
| `/api/carousel/[id]/zip` | GET — télécharge un ZIP des images du carrousel (mix images persona + scenes), fichiers `01.jpg` … `0N.jpg` dans l'ordre. Nom du zip : `carousel-{persona}-{YYYY-MM-DD}.zip`. Auth via cookie middleware. |

---

## Modules Convex

| Fichier | Rôle |
|---|---|
| `schema.ts` | 5 tables : personas, images, carousels (polymorphe `kind`), folders, **scenes** |
| `personas.ts` | CRUD personas + counters |
| `images.ts` | `list` (avec filtres tag-level + legacyTypes), `getById`, `remove` (hard, cascade carrousels), `replaceStorage`, lifecycle internals (`markCompleted` / `markFailed`), `distinctLegacyTypes`, cron `cleanupStuckGenerating` |
| `carousels.ts` | `listByPersona` / `get` (résolution polymorphe images+scenes), `create` (legacy, images-only), **`createMixed`** (polymorphe), `markAsPosted`, `remove` (libère uniquement les `kind: "image"`) |
| `imagePrompts.ts` | Mode A : 5 dicts persona + **`SCENES` (35 entrées, 3 dimensions)**, types Tags / SceneTags, `composePrompt`, `composeScenePrompt`, `composeSceneFromCustomPrompt`, `isCompatible`, `pickCompatibleCombination`, `pickCompatibleScene`, `geminiAspectRatio`, lookups, **query `getDictsMetadata`** (single source of truth pour l'UI, expose aussi `scenes` + `sceneTagValues`) |
| `imageBatch.ts` | Mutations `generateBatch` (insert N + schedule N), `retryImage`, `regenerateWithNewCombination` |
| `imageGeneration.ts` | Action node `runGeneration` (Gemini + retry + post-process callback `kind: "image"`) |
| **`scenes.ts`** | CRUD scenes (sans `personaId`) : `list`, `getById`, `remove` / `bulkDelete` (cascade carrousels via `kind: "scene"`), `replaceStorage`, lifecycle internals, `getCarouselUsages`, cron `cleanupStuckGenerating` |
| **`sceneBatch.ts`** | Mutations `generateBatchFromDict` (tirage filtré), `generateBatchFromPrompt` (mode libre), `retryScene` |
| **`sceneGeneration.ts`** | Action node `runSceneGeneration` (Gemini text-only — pas d'inlineData — + retry + post-process `kind: "scene"`) |
| **`migrationsCarousels.ts`** | One-shot `backfillCarouselsKindImage` — ajoute `kind: "image"` aux entries pre-Phase-Scenes. Idempotent. |

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

---

## Banque Scenes

Banque d'images sans persona, mixables dans les carrousels avec les images persona. Les scenes sont générées **text-to-image** via Gemini (pas de photo de référence) avec un préambule strict "no person".

### Table `scenes`

| Champ | Type | Notes |
|---|---|---|
| `generationMode` | `"from-dict" \| "from-prompt"` | Source du prompt |
| `sceneId` | string? | from-dict uniquement — id dans `SCENES` |
| `customPrompt` | string? | from-prompt uniquement — texte saisi par l'utilisateur (max 2000 chars) |
| `tags` | `{lighting, energy, space}?` | 3 dimensions (pas de gender, pas de social, pas de framing). Toujours présent en from-dict (copié du dict), optionnel en from-prompt. |
| `status` | `"generating" \| "available" \| "failed"` | **Pas de `"used"`** — les scenes restent réutilisables indéfiniment |
| `imageStorageId` | `Id<"_storage">`? | Vide tant que `generating` |
| `aspectRatio` | `"4:5" \| "9:16"` | Forcé (cohérence carrousel) |
| `promptUsed` | string | Prompt complet envoyé à Gemini |
| `errorMessage` | string? | Si `failed` |
| `createdAt` | number | |

Index : `by_status`. Pas de `personaId` — les scenes sont globales.

### Composer scenes (`imagePrompts.ts`)

```ts
composeScenePrompt({ sceneText, aspectRatio })
// → "SCENE-ONLY IMAGE. NO PEOPLE...\n\n<sceneText>\n\n<sceneRenderingDirectives>"

composeSceneFromCustomPrompt({ customPrompt, aspectRatio })
// même chose mais avec le texte utilisateur en place de sceneText

pickCompatibleScene({ filters? })
// tirage uniforme dans SCENES filtré par lighting/energy/space
```

`sceneRenderingDirectives` est une variante de `renderingDirectives` qui omet les directives skin/hair/eyes (inadaptées aux scenes) et durcit la règle "no person" en CRITICAL RULE.

### Pipeline de génération

1. Frontend appelle `sceneBatch.generateBatchFromDict({count, aspectRatio, filters?})` ou `sceneBatch.generateBatchFromPrompt({customPrompt, count, aspectRatio, tags?})`.
2. Mutation insère N rows en `status: "generating"` + schedule N appels `internal.sceneGeneration.runSceneGeneration` en parallèle.
3. `runSceneGeneration` appelle Gemini (`gemini-3.1-flash-image-preview`, **text-only — pas d'inlineData**), récupère l'image base64, store le blob, marque `available` ou `failed`.
4. Best-effort post-process via `${SITE_URL}/api/postprocess` avec body `{kind: "scene", sceneId}` — Sharp crop + anti-watermark, replace storage in-place.
5. Cron `cleanup stuck generating scenes` (toutes les 10 min) flippe les rows en `generating` depuis > 5 min vers `failed`.

### Carrousels mixtes

`carousels.images` est polymorphe :

```ts
type CarouselItem = {
  kind?: "image" | "scene",   // optional (legacy rows pre-migration)
  imageId?: Id<"images">,     // set when kind="image"
  sceneId?: Id<"scenes">,     // set when kind="scene"
  order: number,
}
```

**2-step migration** :
1. **Step 1 (livré)** : `kind` rendu optionnel dans le schema + `migrationsCarousels.backfillCarouselsKindImage` lance un backfill idempotent qui ajoute `kind: "image"` à toutes les entries pre-existing. Lancée sur dev (2 carrousels) et prod (14 carrousels) au déploiement de la feature.
2. **Step 2 (futur)** : une PR ultérieure rendra `kind` obligatoire dans le schema, une fois confirmé qu'aucune row sans `kind` ne traîne.

**Mutations** :
- `carousels.create` (legacy) : prend `imageIds: Id<"images">[]`, écrit toujours le format polymorphe avec `kind: "image"` en interne.
- `carousels.createMixed` (nouvelle) : prend `items: {kind, imageId?, sceneId?}[]`, valide ownership/availability puis insère. **Seules les images passent en `used`, pas les scenes.**
- `carousels.remove` : libère uniquement les `kind: "image"` vers `available`. Les scenes ne nécessitent rien.
- `carousels.get` / `listByPersona` : résolvent polymorphiquement vers `{kind, imageId?, sceneId?, order, label, imageUrl, deleted}` — le frontend (zip route, persona detail page) consomme cette forme uniforme.

### Hard delete cascade

`scenes.remove(id)` et `scenes.bulkDelete(ids)` scannent **tous** les carrousels et filtrent les entries avec `kind === "scene" && sceneId === id`. Mêmes patterns que pour les images, mais sur la branche scene de la polymorphe.

`scenes.getCarouselUsages(id)` / `getBulkCarouselUsages(ids)` exposent le reverse-lookup pour la confirmation augmentée avant delete (UI : "⚠️ Cette scène est utilisée dans N carrousels...").

### UI

- **`/scenes`** (route séparée, accessible depuis le nav du dashboard) : grille de scenes filtrable par lighting/energy/space (chips toggle). Tile = image + status + label (displayName du dict ou snippet du customPrompt) + badge "libre" si from-prompt + kebab Réessayer/Supprimer. Multi-select avec sticky bottom bar pour bulk delete.
- **`SceneGenerationPanel`** : modale 2 onglets ("Depuis le dict" avec single-select chips lighting/energy/space + count 1/3/5 + aspect, ou "Prompt libre" avec textarea + count + aspect).
- **`/persona/[id]/new-carousel`** : 2 onglets en tête de la bank zone — "Images · {persona}" / "Scenes". Le state de sélection est polymorphe (`Array<{kind, id, imageUrl, label}>`), survit aux changements d'onglet, max 10 mixé. Footer preview montre les items sélectionnés avec un badge "scene" violet sur les entries scene. Mutation cible : `carousels.createMixed`.
- **Page persona detail** : le rendering des carrousels mixtes affiche les scenes avec un petit badge "scene" violet sur la miniature.
- **Pas de folders pour scenes** au MVP (décision validée). Les folders restent persona-only.
