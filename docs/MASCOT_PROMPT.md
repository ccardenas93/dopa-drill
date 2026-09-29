# Prompt para Astra (Codex, modelo gpt-6-astra): mascota capibara «Capi»

Copia todo lo que hay debajo de la línea y pégalo tal cual. Si Astra puede
escribir archivos, pídele que los deje en `docs/mascot/`; si solo devuelve
texto e imágenes, guarda el SVG como `docs/mascot/capi.svg` y las imágenes en
`docs/mascot/`.

---

Eres director de arte de una app infantil de cálculo mental (niños de 6 a 12
años, Android e iOS). Necesito una **mascota nueva y original**: un
**capibara** llamado **Capi**. Sustituye a una mascota anterior que no
podemos usar por licencia, así que **no debe parecerse** a ella: nada de cabeza
redonda tipo mochi rosa, nada de orejas grandes redondas a los lados, nada de
cuerpo rosado.

## Estilo (obligatorio)

- Estética *sticker / recorte de papel / rubber-hose*: formas simples y
  redondeadas, **contorno de tinta grueso y uniforme** color `#1B1D4D`, colores
  **planos** sin degradados ni texturas, sin sombras suaves (solo una sombra
  dura desplazada si hace falta).
- Cara muy legible a 40 px de alto: ojos grandes con anillo blanco, mejillas
  rosadas, hocico ancho de capibara con nariz, boca pequeña.
- Paleta base: cuerpo marrón-caramelo cálido `#D89A5B`, hocico y barriga crema
  `#FFF3E4`, interior de orejas `#FFD6B8`, mejillas `#FFB7C5`, patas/pies azul
  `#2F79F7`, iris del mismo color del cuerpo. La app también recolorea el
  cuerpo con estas variantes (deben funcionar sin cambiar las formas):
  rosa `#FF97BF`, azul `#6FA0FF`, amarillo `#FFD452`, menta `#5EDDB8`,
  violeta `#B793FF`, dorado `#FFC53D`, nieve `#F4F6FF`.
- Personalidad: tranquilo, simpático, un poco tonto-adorable; celebra los
  aciertos bailando; nunca se enfada cuando el niño falla.

## El rig (crítico: la app lo anima por partes)

La mascota se dibuja en SVG **por piezas separadas** y cada pieza se anima
(la cabeza bota, las orejas se mueven, los brazos son líneas elásticas desde el
hombro hasta una mano circular, los pies pivotan, los ojos y la boca cambian
de expresión). Por eso necesito el diseño en **vista frontal, simétrica**,
con estas piezas como grupos independientes, en este sistema de coordenadas:

- `viewBox="-112 -232 224 240"`. **Los pies apoyan en y = 0**; la cabeza
  termina cerca de y = −150; el eje de simetría es x = 0.
- Cabeza: bloque redondeado de capibara (más ancho que alto, ~112 de ancho,
  centro cerca de (0, −100)), con el **hocico crema** como zona inferior de la
  cara y una **nariz** pequeña oscura en (0, −86).
- Orejas: dos elipses pequeñas **arriba de la cabeza** (cerca de x = ±40,
  y = −148), con interior claro; se dibujan como piezas propias.
- Ojos: en (±23, −94); anillo blanco r≈11 con iris r≈8. Cejas: pequeñas
  elipses en (±13, −111).
- Mejillas: elipses rosadas en (±31, −79). Boca: centrada en (0, −74).
- Cuerpo: forma de pera/barril que sube por debajo de la cabeza sin costura,
  del cuello (y ≈ −66) hasta las caderas (y ≈ −13), unos 60 de ancho; barriga
  crema en el centro (elipse en (0, −32), 36×27).
- Hombros en (±26, −48); manos: círculos r≈10 en reposo en (±38, −35). Los
  brazos NO se dibujan (la app los dibuja como líneas elásticas).
- Pies: dos formas planas y redondeadas (como zapatillas) de ~26 de ancho,
  apoyadas en y = 0, la izquierda alrededor de x = −20 (la derecha es el
  espejo).

## Entregables

1. `capi.svg`: la mascota en pose neutral (de pie, sonriendo), **exactamente**
   con las piezas anteriores como grupos con estos ids: `ear-l`, `ear-r`,
   `head` (relleno + contorno + hocico + nariz), `brow-l`, `brow-r`, `eye-l`,
   `eye-r`, `cheek-l`, `cheek-r`, `mouth`, `body`, `belly`, `hand-l`,
   `hand-r`, `foot-l`, `foot-r`. Rellenos planos, `stroke="#1B1D4D"`,
   `stroke-width="3"`, `stroke-linejoin="round"`. Sin texto, sin filtros, sin
   degradados, sin imágenes incrustadas.
2. `capi-sheet.png` (2048×2048, fondo transparente): hoja de pegatinas con la
   pose neutral, feliz (ojos en arco), bailando (brazos arriba), sorprendido
   (ojos muy abiertos, boca «o»), durmiendo (ojos cerrados) y mareado
   (ojos en espiral). Misma proporción y mismo contorno en todas.
3. `capi-icon.png` (1024×1024): solo la cara de Capi, centrada y grande, sobre
   azul `#3B6BFF`, con el contorno de tinta; sirve de icono de la app.
4. `capi-3-variants.png`: la pose neutral con la paleta base y con las
   variantes rosa, azul y menta, para comprobar que el recoloreado funciona.

Antes de dibujar, resume en 5 líneas cómo vas a diferenciarlo de una mascota
«mochi rosa» y qué hace que se lea como capibara (proporción de la cabeza,
hocico, orejas). Luego entrega los archivos.
