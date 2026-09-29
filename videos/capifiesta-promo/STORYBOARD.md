---
format: 1080x1920
duration: 35s
message: "Cada acierto sube la fiesta: matemáticas de primaria que dan ganas de seguir"
arc: Demo Loop — pregunta → producto → demo (la fiesta) → demo 2 (el árbol) → confianza (hábito) → CTA
audience: padres y niños de 6 a 12 años en Latinoamérica y España
mode: autonomous
music: none
language: es
---

## Video direction

- **Palette system** (from `frame.md`): ground `cream #FFF8EC` with the game's paper grid (thin `#3B6BFF` lines at ~11% opacity, 26px cells) for content frames; `turquoise #3B6BFF` (brand blue) is the saturated ground for the cover (Frame 1) and the closer (Frame 6) with white display type + 3px ink text-shadow. `text-dark #1B1D4D` is every outline, hard offset shadow and headline on cream. `coral #FF7AB6` (pink) and `butter #FFD23F` (yellow) are the chip/marker accents; `mint`, `sky`, `lavender`, `peach`, `soft-pink` are card tints only. No ninth color, no gradients, no blurred shadows.
- **Type**: display = Dela Gothic One 400 (local `assets/fonts/dela-gothic-one.woff2`), body = Zen Maru Gothic 700/900 (local `assets/fonts/zen-maru-gothic-bold.woff2` / `-black.woff2`). Every frame declares its own `@font-face` with project-root-relative paths (`assets/fonts/dela-gothic-one.woff2`, `assets/fonts/zen-maru-gothic-bold.woff2`, `assets/fonts/zen-maru-gothic-black.woff2`). No Google Fonts.
- **Drawing language** (match the game): 3px ink outlines, hard offset ink shadows (6px cards / 4px chips, zero blur), pill chips (`radius-pill`), 20–28px card radii, and operator scraps ＋ × ÷ − as the ornament layer (3–5 per frame, tilted, cropping past the edge) instead of daisies.
- **Motion grammar + reveal model**: long-tail settles (`power3`; overshoot only on the two logo pops, Frames 2 and 6, where the game's own bouncy logo licenses it). Every frame reveals on its spoken cue — at t=0 only what the VO says at t=0; chips, lines and cards arrive as the narration names them, mostly in the back half. Entrances are `fromTo`, transforms and opacity only. During a hold at most **subtle jitter** (`sine-wave-loop`, low amplitude) or the live video; no breathing cards, no back-half camera drift.
- **Rhythm / held frames**: Frame 2 (the lockup, held from ~2.5s) and Frame 6 (the end card, held from ~2.5s) are the breathers. Frame 3 is the climax and is alive by nature (real gameplay video). Frames 1, 4, 5 develop across their whole duration.
- **Caption band**: the bottom ~17% (below y≈1594px) stays clear in every frame; the caption pill lives there.
- **Media**: the gameplay clip is an approved `[video]` declared inside Frame 3 and hoisted by the assembler to the host root, where it paints above the frame's own DOM (so nothing in that frame may overlap its rectangle); it plays `muted` and its sound is the video-wide music bed (`audio_meta.json` → `bgm`, the same recording's audio from t=0), which is why its `data-media-start` equals the frame's global start time (8.0s).
- **Negative list**: no invented UI (only the real screenshots and the real recording), no daisies/rainbows, no Google Fonts, no purple-blue "AI" gradients, no bokeh, no browser chrome, no cursors, no `Math.random`/`Date.now`/`repeat:-1`/CSS transitions, no slideshow (front-load then freeze) and no screensaver (many things floating).

## Frame 1 — ¿Una fiesta?

- scene: Sobre azul de marca, la pregunta se arma palabra a palabra y «UNA FIESTA» estalla con confeti
- voiceover: "¿Y si las matemáticas fueran… una fiesta?"
- duration: 3.4s
- poster: 2.8s
- transition_in: cut
- status: animated
- src: compositions/frames/01-una-fiesta.html
- type: hook
- persuasion: Future pacing (reframe the dreaded subject as a party)
- beat: curiosity → excitement
- blueprint: compose
- focal: (typography only)
- roles: (none)
- sfx: none
- asset_candidates:

narrativeRole: Opens on the viewer's outcome ("a party") before any product; the message lands with the payoff word.
keyMessage: Las mates pueden sentirse como una fiesta.

Compose (kinetic-type shape: the words ARE the motion — chunks land one per spoken beat, then a spring-pop payoff word; the voice line is 2.37s long, the frame holds after it).
Scene 1 (0.0–1.5s): full-bleed `turquoise` (brand blue) ground with the paper grid at low contrast; four operator scraps (＋ × ÷ −) sit tilted near the corners, cropping past the edge (ornament layer, static, present from t=0). As the VO speaks, "¿Y si las" (t≈0.05) / "matemáticas" (t≈0.55) / "fueran…" (t≈1.1) arrive one chunk per spoken beat via **per-word staggered reveal** (`dynamic-content-sequencing`), white display type (Dela Gothic One) with the 3px ink text-shadow, stacked centered in the upper-middle (top ~50% of frame), each landing on a smooth long-tail settle. Nothing else on screen.
Scene 2 (1.5–2.6s): on "una fiesta" (t≈1.6) the three lines settle up slightly to make room and "UNA FIESTA" lands dead-center at ~1.6× their size via **spring-pop entrance** (`spring-pop-entrance`, the playful overshoot this frame is allowed) in `butter` yellow with the ink text-shadow; a **confetti burst** (`particle-burst`, ≤ 40 pieces in pink/yellow/mint/white) fires from behind it and drifts down on gravity.
Scene 3 (2.6–3.4s): held read; confetti finishes falling; everything else still (no jitter needed — the falling confetti is the aliveness). Content sits in the top ~80%; caption band clear.

## Frame 2 — CapiFiesta

- scene: El logo CAPI / FIESTA se ensambla sobre papel cuadriculado, Capi asoma y el subtítulo «1.º a 6.º de primaria» se escribe debajo
- voiceover: "CapiFiesta: cálculo mental de primero a sexto de primaria."
- duration: 4.6s
- poster: 3.8s
- transition_in: zoom-through
- status: animated
- src: compositions/frames/02-dopa-drill.html
- type: product_intro
- persuasion: Category announcement (name + who it is for)
- beat: clarity + warmth
- blueprint: logo-assemble-lockup (Adapt)
- focal: assets/logo-transparent.png
- roles: logo-transparent.png = cutout (hero) · icon-512.png = supporting (Capi's face, small, bottom-right of the logo)
- sfx: none
- asset_candidates: assets/logo-transparent.png — CAPI / FIESTA logo, transparent background; assets/icon-512.png — Capi's face on blue (app icon)

narrativeRole: Names the product and its audience right after the promise.
keyMessage: CapiFiesta es cálculo mental para toda la primaria.

Adapt: keep the signature — the mark comes to exist on a cleared stage and resolves into a held lockup; parts = the logo image popping whole (the game's own logo already has the burst/ribbon layers), the icon sliding in beside it, and the sub-line arriving on its spoken cue. No URL extension.
Scene 1 (0.0–1.0s): `cream` ground with the paper grid; 4 operator scraps at the edges (static ornaments, present from t=0). On "CapiFiesta" (t≈0.05) the logo (`assets/logo-transparent.png`, ~82% of frame width) lands centered in the upper-middle via **spring-pop entrance** (`spring-pop-entrance`, playful overshoot allowed here) with a hard ink drop shadow baked as a second offset copy; it is the only element on screen.
Scene 2 (1.0–3.4s): as the VO says "cálculo mental" (t≈0.9), the app icon (`assets/icon-512.png`, a 3px-ink-outlined rounded square with a 6px ink hard shadow, ~22% of frame width) slides in from the right and tucks against the logo's lower-right corner, slightly tilted (long-tail settle, `power3`); at "de primero a sexto de primaria" (t≈1.7–3.3) a `butter` badge-pill "1.º a 6.º de primaria" (Zen Maru Gothic 900, ink text, 3px outline, 4px hard shadow) reveals below the logo via **per-word staggered reveal** (`dynamic-content-sequencing`), centered.
Scene 3 (3.4–4.6s): held lockup (the allocated breather, the voice line ends at 3.4s): logo + icon + pill perfectly still. All content within the top ~78% of the frame.

## Frame 3 — La fiesta (partida real)

- scene: Una partida real dentro de un teléfono dibujado; tres chips aparecen cuando la voz los nombra: música, confeti, Capi; luego «Sin game over»
- voiceover: "Cada acierto sube la música, llena la pantalla de confeti y hace bailar a Capi. ¿Te equivocas? No pasa nada: el ritmo sigue."
- duration: 12.8s
- poster: 6s
- transition_in: zoom-through
- status: animated
- src: compositions/frames/03-la-fiesta.html
- type: feature_showcase
- persuasion: Show-don't-tell proof (the real product doing its core loop)
- beat: excitement → relief
- blueprint: device-surface-showcase (Adapt)
- focal: assets/gameplay-demo.mp4
- roles: gameplay-demo.mp4 = cutout (hero, inside the device frame)
- sfx: none
- asset_candidates: assets/gameplay-demo.mp4 — [video] real recorded round in demo mode, 1080×1920, ~40 s, effects and music escalating with each right answer

narrativeRole: The evidence for the promise — the party is literal: the real game escalating on screen while the narration names what the viewer sees.
keyMessage: Cada acierto sube la fiesta, y equivocarse no la corta.

Adapt: keep the signature — a device held as hero whose surface advances through a real flow; the "screens" are the live recording itself (no cuts inside it), and the secondary copy is a set of chips that arrive on their spoken cues. Cursorless, static camera. The voice line is 7.28s long; the recording keeps the frame alive to 12.8s.
VIDEO GEOMETRY (binding — the approved `[video]` is hoisted to the host root and paints ABOVE this frame's DOM, so nothing may overlap its rectangle and the frame cannot clip it): `<video data-frame-video="approved" src="assets/gameplay-demo.mp4" muted playsinline data-media-start="8" data-start="0" data-duration="12.8" data-track-index="5" data-frame-video-x="208" data-frame-video-y="110" data-frame-video-width="664" data-frame-video-height="1180" data-frame-video-fit="cover"></video>` — the recording occupies x 208–872, y 110–1290. `data-media-start="8"` equals this frame's global start (3.4 + 4.6), which keeps the picture locked to the music bed (the same recording's audio) that runs from t=0.
Scene 1 (0.0–1.0s): `cream` ground with the paper grid, present from t=0; the "device" is a bezel drawn AROUND the video rectangle: a rounded rectangle (16px radius, 3px ink outline, 8px ink hard shadow, `white` fill) spanning x 196–884, y 98–1302 — its interior is fully covered by the hoisted video, so only its outline and shadow show. The bezel scales in from 0.92 → 1 with a long-tail settle (`power3`) as the frame opens (the video itself cannot animate). Two operator scraps sit outside the bezel near the top corners.
Scene 2 (1.0–5.0s): chips arrive one per spoken cue in a 2×2 grid BELOW the bezel (rows at y≈1330–1400 and y≈1420–1490, columns centered at x≈330 and x≈750, each chip ≤ 380px wide), each a badge-pill (Zen Maru Gothic 900, 3px ink outline, 4px hard shadow) via **spring-pop entrance** (`spring-pop-entrance`, smooth settle, no overshoot): "♪ sube la música" (`butter`, t≈1.0), "confeti" (`coral` pink with white text, t≈2.6), "Capi baila" (`mint`, t≈4.3). No chip touches the video rectangle.
Scene 3 (5.0–7.5s): on "¿Te equivocas?" (t≈5.3) the fourth chip (`sky`) pops in the last grid slot reading "¿Te equivocas?"; on "No pasa nada" (t≈6.2) its text hard-cuts (`discrete-text-sequence`) to "Sin game over ✓" and its fill to `butter`.
Scene 4 (7.5–12.8s): held read: bezel + four chips still, the recording carrying all the motion; **subtle jitter** (`sine-wave-loop`, low amplitude) on the "Sin game over ✓" chip only. Everything stays above y≈1500px so the caption band is clear.

## Frame 4 — El árbol

- scene: El árbol de habilidades real detrás de cuatro chips que se apilan al ritmo de la voz: Sumas · Tablas · Fracciones · Porcentajes, y el contador 58
- voiceover: "Cincuenta y ocho habilidades, de sumas a porcentajes, en un árbol que se abre a tu ritmo."
- duration: 5.9s
- poster: 4.6s
- transition_in: push-slide LEFT
- status: animated
- src: compositions/frames/04-el-arbol.html
- type: benefit_highlight
- persuasion: Feature-to-benefit translation (a big catalogue → "at your own pace")
- beat: confidence + control
- blueprint: grid-card-assemble (Adapt)
- focal: assets/shot-es-3-tree.png
- roles: shot-es-3-tree.png = background (the real screen, dimmed ~35% behind the cards)
- sfx: none
- asset_candidates: assets/shot-es-3-tree.png — skill tree screen, phone 1080×1920

narrativeRole: Breadth and progression: the Duolingo-like tree means there is always a next step.
keyMessage: 58 habilidades que se desbloquean a tu ritmo.

Adapt: keep the signature — items self-assemble in a staggered cascade and hold; N = a count-up card + four skill chips in a vertical stack, over the real tree screenshot rather than a bare grid. No camera zoom-out.
Scene 1 (0.0–1.3s): the real tree screenshot (`assets/shot-es-3-tree.png`) fills the frame (object-fit cover) under a `cream` wash at ~35% so it reads as background; two operator scraps at the corners. On "Cincuenta y ocho" a white card (28px radius, 3px outline, 6px hard shadow, ~62% frame width, centered in the upper third) reveals with a **value-scaled counter** (`counting-dynamic-scale`) climbing 0 → 58 in Dela Gothic One display, ink; "habilidades" in Zen Maru Gothic 900 beneath it appears as the VO says it.
Scene 2 (1.3–3.6s): as the VO says "de sumas a porcentajes", four chips stack below the card one at a time (**staggered cascade**, `spring-pop-entrance`, smooth settle, ≤ 0.5s total spread per arrival group): "Sumas y restas" (`soft-pink`), "Tablas" (`butter`), "Fracciones" (`mint`), "Porcentajes" (`sky`) — each a pill with 3px outline and 4px hard shadow, centered column, Zen Maru Gothic 900 ink text.
Scene 3 (3.6–5.9s): on "a tu ritmo" (t≈4.3) a small `coral` pink badge-pill "a tu ritmo ✓" (white text, soft ink text-shadow) pops beside the last chip; the voice ends at 5.1s and everything holds still to 5.9s (no drift). Stack ends above y≈1560px.

## Frame 5 — Volver mañana

- scene: La pantalla de trofeos real, y tres tarjetas que llegan una por una: Misiones diarias · 306 trofeos · Racha
- voiceover: "Misiones diarias, trofeos y una racha que da ganas de volver mañana."
- duration: 4.7s
- poster: 4.0s
- transition_in: push-slide LEFT
- status: animated
- src: compositions/frames/05-volver-manana.html
- type: benefit_highlight
- persuasion: Value stacking (three habit loops, rule of three)
- beat: motivation + belonging
- blueprint: grid-card-assemble (Adapt)
- focal: assets/shot-es-4-trophies.png
- roles: shot-es-4-trophies.png = background (the real screen, dimmed ~35%)
- sfx: none
- asset_candidates: assets/shot-es-4-trophies.png — trophies screen, phone 1080×1920 ("1/306", category Constancia)

narrativeRole: Trust that the habit sticks: the retention loops, named on their beats.
keyMessage: Hay motivos para volver cada día.

Adapt: keep the signature — a staggered cascade of cards that accumulates and holds; three horizontal cards instead of a grid, each landing on its spoken cue over the real trophies screenshot.
Scene 1 (0.0–1.2s): the trophies screenshot (`assets/shot-es-4-trophies.png`) fills the frame under a `cream` wash (~35%); two operator scraps at the edges. On "Misiones diarias" the first white card (20px radius, 3px outline, 6px hard shadow, ~78% frame width, centered, upper third) slides in from the left and settles (`power3`): a `butter` circle-marker with "✓" + "Misiones diarias" (Zen Maru Gothic 900, ink).
Scene 2 (1.2–2.6s): on "trofeos" the second card lands beneath it from the right: `coral` pink circle-marker with a small trophy glyph drawn in CSS/SVG + "306 trofeos" — the number arrives as a quick **count-up** (`counting-dynamic-scale`, no scale growth) 0 → 306.
Scene 3 (2.6–4.7s): on "una racha" (t≈2.5) the third card lands from the left: `sky` circle-marker with a simple flame drawn in SVG (no emoji) + "Racha de días"; on "volver mañana" (t≈3.4) a `butter` badge-pill "¡Hasta mañana!" pops under the stack; the voice ends at 3.97s and everything holds still to 4.7s. Stack ends above y≈1560px.

## Frame 6 — Gratis en Google Play

- scene: Sobre azul de marca, el icono y el logo se juntan; debajo, «Gratis en Google Play» y «Sin cuentas · Funciona sin conexión»
- voiceover: "CapiFiesta. Gratis en Google Play."
- duration: 4.7s
- poster: 3.8s
- transition_in: zoom-through
- status: animated
- src: compositions/frames/06-gratis-google-play.html
- type: cta
- persuasion: Friction reduction (free, no accounts, offline)
- beat: ease + urgency-to-act
- blueprint: logo-assemble-lockup (Reproduce, CTA variant)
- focal: assets/logo-transparent.png
- roles: logo-transparent.png = cutout (hero) · icon-512.png = supporting (above the logo)
- sfx: none
- asset_candidates: assets/logo-transparent.png — CAPI / FIESTA logo, transparent background; assets/icon-512.png — app icon, Capi's face on blue

narrativeRole: The ask, with the two frictions removed in the same breath.
keyMessage: Descárgala gratis en Google Play.

Scene 1 (0.0–1.0s): `turquoise` (brand blue) ground with the paper grid at low contrast and 4 operator scraps as ornaments, present from t=0. On "CapiFiesta" (t≈0.05) the app icon (`assets/icon-512.png`, rounded square with 3px white outline, 6px ink hard shadow, ~30% of frame width) lands centered at ~22% height via **spring-pop entrance** (`spring-pop-entrance`, playful overshoot allowed); the logo (`assets/logo-transparent.png`, ~78% of frame width) pops beneath it with the same move a beat later (t≈0.5).
Scene 2 (1.0–2.4s): on "Gratis en Google Play" (t≈0.9) a white card (28px radius, 3px ink outline, 6px ink hard shadow, ~80% frame width) pops below the logo (**spring-pop entrance**, smooth settle): "GRATIS" in Dela Gothic One display (ink) over "en Google Play" in Zen Maru Gothic 900; a small **confetti burst** (`particle-burst`, ≤ 30 pieces) punctuates the card's arrival at t≈1.4.
Scene 3 (2.4–4.7s): the end card holds (the allocated breather; the voice ends at 2.07s): a `butter` badge-pill "Sin cuentas · Funciona sin conexión" settles under the card at t≈2.4 and then everything is perfectly still to the end. This is the final frame: it ends on the held lockup with no exit. All content above y≈1560px.
