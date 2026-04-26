# Prompt Pipe Gemini — état actuel

Ce document expose **exactement** ce qui est envoyé à Gemini pour chaque génération d'image. Source : [convex/imagePrompts.ts](convex/imagePrompts.ts).

À retravailler par toi puis je remplace.

---

## Structure générale

Chaque appel Gemini reçoit deux parties :

1. **Image inline** : la photo de référence du persona (base64, jpeg).
   → Source : `personas.referenceImageStorageId` lue depuis Convex storage.

2. **Texte** = concaténation de **3 blocs** :
   ```
   {IDENTITY_DESCRIPTION}

   {SCENE_DIRECTION}    ← une variation tirée de TYPE_VARIATIONS[type]

   {RENDERING_DIRECTIVES}
   ```

Avec :
- `aspectRatio: "4:5"` (sera bientôt configurable 4:5 / 9:16)
- Modèle : `gemini-3.1-flash-image-preview`

---

## Bloc 1 — IDENTITY_DESCRIPTION

Le champ `identityDescription` du persona, injecté tel quel.

**Exemple (persona F1 — Méditerranéenne)** :

> a 24-year-old woman with golden-olive Mediterranean skin, almond-shaped dark hazel eyes, thick natural dark eyebrows with a strong arch, a straight nose with a subtle bump at the bridge, high defined cheekbones, full lips in a relaxed expression, a small beauty mark on her left cheek, and shoulder-length dark chestnut brown hair with loose natural waves.

→ Pas de wrapper, pas d'instruction. Juste la description nue.

⚠️ **Manque** : aucune phrase du type *"The attached image is the exact face of the subject. Reproduce her face faithfully."* — en v1 c'était présent et ça verrouillait beaucoup mieux le visage.

---

## Bloc 2 — SCENE_DIRECTION (par type)

Une seule variation est tirée par appel. La sélection se fait par seed (`Date.now() + index`) modulo le nombre de variations.

Voici **toutes** les variations actuelles, par type :

### selfie-frontcam

1. Selfie taken with the front camera, phone held slightly above eye level. Bedroom morning light, hair still messy from sleep, bare shoulders or oversized t-shirt. Natural unposed expression. Slight lens distortion from proximity.
2. Selfie front camera in the passenger seat of a car. Seatbelt visible, daylight through the window, sunglasses pushed up on the head. Casual smile or mid-talk expression.
3. Front-cam selfie on the couch in the evening. Warm lamp light, hoodie or cozy sweater, TV glow on one side of the face. Slight beauty-mode glow.
4. Front camera selfie just out of the shower. Damp hair, towel visible, bathroom light slightly harsh. No makeup, fresh skin.
5. Walking outside selfie, front camera. Buildings and street blurred behind, slight motion blur, daylight. Looking off to the side or laughing.

### selfie-miroir

1. Mirror selfie in a bathroom. Phone at chest height, flash on. Half body visible. Phone clearly visible in the reflection — that is normal for a mirror selfie.
2. Mirror selfie in a bedroom, full body visible. Bed and clothes in background, soft daylight from a window. No flash.
3. Mirror selfie in a gym. Workout outfit, phone in hand, machines and weights behind. Slight sweat on the skin.
4. Mirror selfie in an elevator. Tight framing, phone with flash on, mirrored back wall. Outfit of the day vibe.
5. Mirror selfie in a clothing store fitting room. New outfit being tried on, curtain or wall visible behind. Phone clearly visible in reflection.

### photo-ami

1. Photo taken by a friend at a park. Caught mid-laugh, sitting on the grass or a bench. Slightly imperfect framing, real depth in the background.
2. Photo taken by a friend at a restaurant terrace. Glass of wine or coffee on the table, looking at the camera with a relaxed smile.
3. Photo by a friend at a bar at night. Warm orange and red light, blurred crowd behind. Not posing for a brand shoot, just present.
4. Photo by a friend on a hiking trail. Backpack on, slightly out of breath, mountains or forest behind. Bright outdoor light.
5. Candid photo by a friend on a city street. Walking and turning toward the camera, urban background, daylight.

### photo-couple

1. Couple photo. With her partner, his arm around her shoulders, both looking at the camera with relaxed smiles. Outdoor daylight setting.
2. Couple photo, partner kissing her on the cheek while she laughs. Caught candidly, unposed.
3. Couple selfie style, both faces close, phone held by one of them. Cozy indoor setting, warm light.
4. Couple walking hand in hand, photographed from behind by a third person. City or park setting.
5. Couple at a restaurant table, leaning toward each other across the table, eyes locked, phone candid shot.

### photo-cafe

1. Sitting alone at a cafe table. Latte with foam art, croissant or pastry in frame. Window light from the side. Phone or book on the table.
2. Cafe interior shot, holding a takeaway cup near her face, slight smile. Background slightly blurred.
3. Outdoor cafe terrace, sunny day, sunglasses on the table, half-finished iced drink. Casual outfit.
4. Cafe corner seat, laptop open in front of her, mug in hand, focused or thinking expression. Soft afternoon light.

### photo-sport

1. Mid-workout at a gym. Slightly out of breath, sweat on the forehead, sportswear. Equipment in background.
2. Going for a run outdoors, phone capturing her mid-stride or cooling down. Path or park setting, bright daylight.
3. Yoga mat at home, mid-pose or stretching. Living room background, natural light.
4. Post-workout in the gym locker room or by the entrance. Water bottle in hand, towel around neck.

### photo-rue

1. Walking down a city street alone, candid shot. Urban architecture behind, daylight, real pedestrians slightly visible.
2. Crossing the street, caught mid-step, slight motion. Cars and street life in background.
3. Standing on a sidewalk waiting for someone or looking at her phone. City environment, real depth.
4. Walking past shop windows, slight reflection visible in the glass. Daytime urban setting.

### photo-monument

1. In front of a recognizable city landmark or famous monument. Tourist-style framing but candid, not posing rigidly.
2. Side profile shot near a monument, looking up or pointing at it. Bright daylight.
3. Sitting on steps near a famous building, reading or just resting. Tourists slightly visible.
4. Walking past a monument, photographed from behind or three-quarter, the monument framed beside her.

### photo-vacances

1. On a beach, swimsuit or sundress, sunlight on the skin, ocean behind. Sand visible, slightly windswept hair.
2. By a hotel pool, lounger visible, drink on the side table. Tropical or summer atmosphere.
3. On a balcony with a sea or city view, morning coffee in hand, robe or summer outfit.
4. Exploring a foreign market or narrow street. Colorful stalls or local architecture, casual travel outfit.

### photo-nuit

1. Out at night in the city. Neon signs reflecting on her skin, dark background with colored bokeh. Going-out outfit.
2. Inside a dim bar, candle or warm pendant light on her face, drink in hand. Slight grain.
3. Walking on a city street at night, streetlight glow above her, slight motion blur in background.
4. On a rooftop at night, city lights behind her. Soft warm light from a string of bulbs or a heater.

### photo-fatiguee

1. Looks tired. Under-eye circles visible, messy hair, oversized hoodie. Lying on the couch, soft low light. End-of-a-long-day vibe, not editorial exhaustion.
2. Sitting on the floor against the bed, knees up, phone in hand or staring off. No makeup, drained expression.
3. In bed under the covers, only head and shoulders visible, soft morning or late-night lamp light. Heavy eyelids.
4. At the kitchen counter holding a mug, leaning, hair tied up loosely, oversized t-shirt. Worn-out expression.

### photo-grateful

1. Candid moment of genuine happiness. Big natural smile, eyes slightly squinted from smiling. Outdoor golden hour light.
2. Sitting in a cozy indoor setting, hands wrapped around a warm mug, soft smile, eyes calm. Feeling grateful, not performing it.
3. Looking up at the sky or out a window, peaceful expression, soft natural light on the face.
4. Hugging a friend or pet, eyes closed, real emotion. Caught candidly.

### photo-blessee

1. Looks emotionally hurt. Red eyes from crying, cheeks slightly damp, hair untidy. Sitting alone in a dim room. Soft window light from the side.
2. On the bathroom floor against the bathtub, knees up, phone face-down beside her. Tear streaks visible.
3. In bed curled up, only part of the face visible, eyes red and unfocused. Low ambient light.

### photo-coeur-brise

1. Sitting on the edge of the bed, head down, hands clasped. Soft late-afternoon light. Quiet sadness, not dramatic.
2. Looking out a rain-streaked window. Reflection slightly visible. Melancholic expression.
3. Wrapped in a blanket on the couch, mug forgotten on the coffee table, staring at nothing. Lamp light only.

### photo-decue

1. Reading something on her phone with a disappointed expression. Slight frown, lips pressed. Indoor neutral light.
2. Standing alone in a kitchen, arms crossed, looking down. Disappointed body language.
3. Sitting at a cafe table alone, half-empty cup, looking out the window with a deflated expression.

### snapshot-mains

1. Close-up of her hands holding a coffee cup on a wooden table. Soft natural light, manicured but not over-styled nails.
2. Close-up of hands typing on a laptop or holding a phone. Realistic skin texture, slight veins visible.
3. Hands holding an open book or journal in lap. Daylight from a window.
4. Hands holding a small object — keys, a flower, jewelry. Macro feel, shallow depth of field.

### snapshot-pieds

1. Close-up of her feet in sneakers on a city sidewalk, photographed looking down. Real urban texture.
2. Bare feet on a beach, sand and water visible. Natural daylight.
3. Feet up on a coffee table or bed, cozy socks, blanket partially visible. Indoor evening light.
4. Feet in sandals on a cafe terrace floor, drink and bag visible at the edge of the frame.

### snapshot-plat

1. Flat lay of a meal at a restaurant — plates, drinks, hands slightly visible at the edge. Top-down phone shot, natural light.
2. Flat lay of breakfast at home — coffee, toast, fruit on a wooden table. Morning light.
3. Flat lay of a desk setup — laptop, notebook, pen, mug. Daylight from above.

### snapshot-livre

1. Close-up of a book held open in her hands, blurred bedroom or living room behind. Soft daylight.
2. Book on a table next to a coffee cup, page visible, slight blur, cozy reading nook.
3. Hand holding a book against a window light, the title or page softly readable.

### photo-lifestyle

1. Cooking in a home kitchen, candid shot of stirring or chopping. Warm light, casual outfit.
2. Tidying her bedroom, making the bed or folding clothes. Daylight, no makeup.
3. Watering plants on a windowsill, soft morning light.
4. Lying on the couch with a pet, scrolling phone. Cozy indoor setting.
5. Doing skincare in the bathroom mirror — sheet mask or moisturizer. Bright vanity light.

---

## Bloc 3 — RENDERING_DIRECTIVES (constant)

Identique pour tous les types :

```
CRITICAL RENDERING DIRECTIVES:
- Phone photo quality, NOT studio quality
- Realistic skin texture: visible pores, natural slight unevenness, no airbrushed look
- Natural imperfections: slight under-eye shadows, minor skin irregularities, visible hair texture
- iPhone front-camera characteristics: slight lens distortion on close selfies, beauty mode soft glow
- Casual framing, not composed professionally
- Real environment, not a set
- No phone visible in the frame (except for mirror selfies where the phone in the reflection is OK)
- Aspect ratio 4:5
```

⚠️ **Plus court que la v1** qui avait en plus :
- *"The face must look like a real human photographed on an iPhone, NOT like an AI-generated face"*
- *"Visible digital grain throughout the image, iPhone night mode aesthetic"*
- *"Image is not perfectly sharp — slight softness consistent with handheld low-light capture"*
- *"No digital smoothing, no beauty retouching, no cinematic perfection"*
- *"Mixed warm light sources with realistic color temperature variation"*
- *"Candid photo feel — as if a friend took this on their phone"*
- *"The subject is integrated into the environment, not pasted onto a background"*
- *"Lighting continuity is non-negotiable: the direction, color temperature, and intensity of the light on the subject match the ambient light of the scene"*
- *"The image has the subtle imperfections of a real iPhone photo: natural film-like grain, mild chromatic aberration on high-contrast edges, very slight motion blur on moving subjects"*
- *"Ban: studio lighting, professional photography, clean cutout, isolated subject, perfectly even lighting on face, ring light, beauty dish, uniform background"*

---

## Exemple complet de prompt envoyé

**Persona F1, type `selfie-miroir`, variation #3 (gym)** :

```
a 24-year-old woman with golden-olive Mediterranean skin, almond-shaped dark hazel eyes, thick natural dark eyebrows with a strong arch, a straight nose with a subtle bump at the bridge, high defined cheekbones, full lips in a relaxed expression, a small beauty mark on her left cheek, and shoulder-length dark chestnut brown hair with loose natural waves.

Mirror selfie in a gym. Workout outfit, phone in hand, machines and weights behind. Slight sweat on the skin.

CRITICAL RENDERING DIRECTIVES:
- Phone photo quality, NOT studio quality
- Realistic skin texture: visible pores, natural slight unevenness, no airbrushed look
- Natural imperfections: slight under-eye shadows, minor skin irregularities, visible hair texture
- iPhone front-camera characteristics: slight lens distortion on close selfies, beauty mode soft glow
- Casual framing, not composed professionally
- Real environment, not a set
- No phone visible in the frame (except for mirror selfies where the phone in the reflection is OK)
- Aspect ratio 4:5
```

+ photo de référence de F1 envoyée en `inlineData` (jpeg, base64).

---

## Ce que je suggère que tu retravailles

1. **L'entête identité** : ajouter un wrapper "The attached image is the exact face..." avant `{identityDescription}` pour forcer le character lock.
2. **Les directives de rendu** : restaurer la version longue v1 (ban list, lighting continuity, grain explicit, no beauty retouching).
3. **Les variations par type** : tu peux les muscler, en ajouter, les rendre plus précises sur l'outfit/contexte.
4. **Décider** d'un format unifié pour l'aspect ratio (4:5 et 9:16 — un champ par batch ?).
5. **Optionnel** : ajouter au persona un `defaultOutfit` ou laisser ça par batch.

Renvoie-moi le doc retravaillé (markdown ou texte brut), et je remplace `convex/imagePrompts.ts` à l'identique.
