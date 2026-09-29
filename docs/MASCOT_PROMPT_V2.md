# Prompt v2 para Astra: Capi debe parecer un capibara de verdad + elenco con accesorios

Guarda la imagen de referencia como `docs/mascot/referencia.png` y ejecuta desde
la raíz del repo:

```bash
sed -n '/^---$/,$p' docs/MASCOT_PROMPT_V2.md | tail -n +2 \
  | codex exec -m gpt-6-astra -C "$PWD" -s workspace-write --skip-git-repo-check -i docs/mascot/referencia.png -
```

(O pega en Astra todo lo que hay debajo de la línea, junto con la imagen.)

---

Eres director de arte de una app infantil de cálculo mental. Ya hiciste una
primera versión de la mascota «Capi» en `docs/mascot/capi.svg`, pero **no se
lee como capibara**: parece un osito/hámster. La imagen adjunta es la
referencia de cómo tiene que verse. Rehaz la mascota manteniendo el mismo
estilo de contorno y el mismo rig, y cambia lo que la hace capibara:

## Qué tiene que tener para ser un capibara

- **Hocico largo y rectangular** que ocupa el tercio inferior de la cabeza y es
  la parte más ancha de la cara; la nariz es un óvalo oscuro **ancho** en la
  punta superior del hocico, con dos fosas insinuadas; **bigotes** cortos (dos
  o tres trazos a cada lado).
- **Ojos pequeños**, colocados **altos y separados**, a los lados de la cabeza
  (no grandes ojos frontales de peluche). Expresión relajada, párpados medio
  caídos en la pose neutral: el «chill» del capibara es parte del personaje.
- **Orejas pequeñas y redondas en la parte alta-trasera** de la cabeza, no
  encima como un oso.
- Cabeza más **alargada hacia delante** (perfil de ladrillo redondeado), cuello
  corto, cuerpo de **barril** regordete, patas cortas.
- Pelaje marrón-caramelo `#D89A5B` con el hocico/barriga crema `#FFF3E4`;
  mismo contorno de tinta `#1B1D4D`, 3 px, colores planos, estilo pegatina.
- Debe seguir siendo adorable y legible a 40 px de alto, y **muy diferente**
  de un oso, un hámster o un mochi.

## El rig (no cambia)

Mismo sistema de coordenadas que antes: `viewBox="-112 -232 224 240"`, pies
apoyados en y = 0, eje de simetría x = 0, vista frontal. Grupos con ids
`ear-l`, `ear-r`, `head` (relleno + contorno + hocico + nariz + bigotes),
`brow-l`, `brow-r`, `eye-l`, `eye-r`, `cheek-l`, `cheek-r`, `mouth`, `body`,
`belly`, `hand-l`, `hand-r`, `foot-l`, `foot-r`. Ojos en (±23, −94) o algo más
separados si el hocico lo pide (dime las coordenadas finales), cejas en
(±13, −111), mejillas en (±31, −79), boca centrada en (0, −74), hombros en
(±26, −48), manos r≈10 en (±38, −35), pies de ~26 de ancho. Sin brazos (la app
los dibuja).

## Elenco: capibaras distintos, no de colores

Además de Capi, la app muestra un público de capibaras. Quiero que sean
**personajes distintos por accesorios**, todos con el mismo pelaje caramelo.
Diseña **8 accesorios** como capas SVG separadas, en el mismo sistema de
coordenadas y encajadas sobre el rig anterior, cada una en su propio archivo
`docs/mascot/acc-<nombre>.svg` con un solo `<g id="acc-<nombre>" data-layer="head|face|back">`:

1. `mochila` — mochila pequeña (capa `back`, se dibuja detrás del cuerpo, con
   las correas asomando sobre los hombros).
2. `sombrero-flor` — sombrero de paja con una flor (capa `head`).
3. `gafas` — gafas redondas (capa `face`, centradas en los ojos).
4. `bufanda` — bufanda a rayas al cuello (capa `head`, cuelga sobre el pecho).
5. `gorro-fiesta` — gorro cónico de cumpleaños con pompón (capa `head`).
6. `corbatin` — corbatín / pajarita (capa `head`, bajo la barbilla).
7. `auriculares` — auriculares grandes (capa `head`).
8. `corona-hojas` — coronita de hojas y una naranja en la cabeza (guiño al
   capibara con mandarina) (capa `head`).

Las capas `head` giran con la cabeza (pivote en el cuello, y = −63), así que
deben dibujarse pegadas a la cabeza; las `face` van sobre los ojos; las `back`
detrás del cuerpo.

## Entregables

1. `docs/mascot/capi.svg` (sobrescribir) — nueva pose neutral con el rig.
2. `docs/mascot/capi-sheet.png` (2048×2048, transparente) — poses: neutral,
   feliz, bailando con los brazos arriba, sorprendido, dormido, mareado.
3. `docs/mascot/capi-icon.png` (1024×1024) — solo la cara, grande, sobre azul
   `#3B6BFF`.
4. `docs/mascot/acc-*.svg` — los 8 accesorios, más
   `docs/mascot/capi-cast.png` (2048×1024): Capi neutral y los 8 personajes
   con sus accesorios en fila, para revisarlos de un vistazo.

Antes de dibujar, explica en 5 líneas qué cambias respecto a la v1 para que
se lea como capibara (hocico, ojos, orejas, proporciones), luego entrega los
archivos. No modifiques ningún otro archivo del repositorio.
