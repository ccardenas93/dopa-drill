---
workflow: product-launch-video
flow: automation
storyboard: no
message: "Cada acierto sube la fiesta: matemáticas de primaria que dan ganas de seguir"
destination: play-store
aspect: 1080x1920
language: es
audience: padres y niños de 6 a 12 años en Latinoamérica y España
length: 35s
angle: show-the-party
narration: yes
style_preset: daisy-days
---

## Intent

Promo de lanzamiento de **CapiFiesta** para la ficha de Google Play (vídeo de
YouTube enlazado), Shorts y TikTok. Vertical 1080x1920; después se deriva una
versión 1920x1080 para YouTube normal. Vender el juego enseñándolo tal cual:
capturas y una partida real grabada de la app (modo demostración), con la
música y los efectos que el propio juego sintetiza subiendo con cada acierto.
Tono alegre, infantil-sin-ser-cursi, corto y rítmico: cada acierto sube la
fiesta, equivocarse no corta la música, y el árbol de habilidades hace que
siempre haya un «siguiente». Narración en español neutro (voz local Kokoro
`ef_dora`, HeyGen no disponible: credencial caducada).

Decisiones tomadas en modo autónomo (el usuario pidió «todo todo» sin más
preguntas): ruta product-launch-video (app mostrada desde sus pantallas
reales), 35 s, vertical primero, preset `daisy-days` (picture-book infantil,
contornos gruesos y sombras duras: la estética del juego), arco Demo Loop.

## Assets

- ../../store/play/logo-transparent.png — logo CAPI / FIESTA con fondo transparente; apertura y cierre.
- ../../store/play/icon-512.png — icono de la app (cara de Capi sobre azul); cierre / CTA.
- ../../store/play/shot-es-1-title.png — pantalla de título 1080x1920; presentación.
- ../../store/play/shot-es-2-play.png — pantalla de juego 1080x1920 (pregunta 1).
- ../../store/play/shot-es-3-tree.png — árbol de habilidades 1080x1920.
- ../../store/play/shot-es-4-trophies.png — lista de trofeos 1080x1920.
- assets/gameplay-demo.mp4 — partida real grabada en modo demostración (1080x1920, ~24 s, con el audio del juego); el corazón del vídeo.
- assets/gameplay-demo-audio.m4a — la misma pista de audio del juego, para usarla como cama musical bajo la narración.

## Customizations

- Feature the app's own captured screens and the recorded gameplay clip as the video's assets (show-it-as-is inside a promo).
- La cama musical es el audio real del juego (no la biblioteca HeyGen: sin credencial). `music: none` en el storyboard; la pista se coloca a mano bajo la narración con ducking.
- Subtítulos quemados en español (los Shorts se ven sin sonido).
- Cierre con el icono, el logo y «Gratis en Google Play».

## Notes

- Público infantil: nada de humor negro, nada de urgencia artificial; sin precios ni «compra».
- No inventar pantallas: solo capturas y grabación reales.
- Versión 16:9 al final: la vertical centrada sobre fondo azul de marca con el logo a los lados (pillarbox de marca), vía ffmpeg.
