# Recursos de la ficha de Google Play

Todo lo de `play/` lo genera `npm run store` (`tools/store_assets.mjs`, Chrome
headless a través de puppeteer-core). Se puede editar el HTML de esta carpeta
y volver a generar.

| Archivo | Tamaño | Dónde va en Play Console |
| --- | --- | --- |
| `play/icon-512.png` | 512×512 | Ficha de Play Store → Icono de la app |
| `play/feature-1024x500-es.png` | 1024×500 | Ficha → Gráfico de funciones (idioma es-419 / es-ES) |
| `play/feature-1024x500-en.png` | 1024×500 | Ficha → Gráfico de funciones (traducción en-US) |
| `play/shot-es-1-title.png` … `shot-es-4-trophies.png` | 1080×1920 | Ficha → Capturas de pantalla de teléfono (español) |
| `play/shot-en-1-title.png` … `shot-en-4-trophies.png` | 1080×1920 | Ficha → Capturas de pantalla de teléfono (inglés) |
| `play/logo-transparent.png` | 1400×1040, fondo transparente | Redes, web, vídeo promocional, prensa |
| `play/logo-transparent-ja.png` | 1400×1040, fondo transparente | Logo original en japonés (solo referencia) |

Orden recomendado de las capturas en la ficha: título → partida → árbol de
habilidades → trofeos. Play acepta de 2 a 8 por idioma; se pueden añadir más
pantallas editando la lista de `tools/store_assets.mjs`.

Los textos de la ficha (nombre, descripción breve y completa, en español e
inglés) están en `docs/PLAY_STORE.md`, sección 6. El vídeo promocional (enlace
de YouTube en la ficha) se produce desde `videos/capifiesta-promo/` (HyperFrames; ver `docs/PLAY_STORE.md`).

Fuentes de los gráficos:

- `icon.html`: cara de Capi (`app/icon.svg`) sobre el azul de la marca.
- `feature.html`: logo, eslogan y Capi de cuerpo entero; `?lang=en`.
- `logo.html`: solo el logo, fondo transparente; `?lang=ja` para el original.
