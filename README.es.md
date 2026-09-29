# CapiFiesta

[日本語](README.md) · **Español**

Un cuaderno de cálculo en el navegador donde la música y los efectos suben de nivel con cada acierto. El juego está en español e inglés: arranca en el idioma del dispositivo (español si es cualquier variante de español, inglés en los demás casos) y se puede cambiar en Ajustes. (El japonés del que se tradujo sigue disponible solo para mantenimiento, abriendo la página con `?lang=ja`.)

## Web, iOS y Android con un solo código

El juego vive una sola vez, en **`app/`**, y desde ahí sale a los tres sitios:

| Carpeta | Qué es |
| --- | --- |
| `app/` | El juego (HTML/CSS/JS sin dependencias). Web y fuente de verdad. |
| `ios/` | Proyecto Xcode con el juego dentro (Capacitor). |
| `android/` | Proyecto Android con el juego dentro (Capacitor). |

La app móvil no reescribe nada: envuelve la misma aplicación web, así que
conserva el 100 % de la funcionalidad (audio sintetizado, fondo WebGL,
partículas, el personaje SVG y el guardado local). Los detalles están en
[MOBILE.md](MOBILE.md).

```bash
npm install          # una vez
npm run sync         # copia app/ a ios/ y android/
npm run apk          # APK de prueba
npm run ios:build    # comprueba que iOS compila
```

Incluye los 58 ejercicios, los modos, la puntuación con dopa y combo, la prueba
de nivel, las estrellas, el óxido, las misiones, los trofeos, la colección, el
calendario, el bono diario, el martillo «no cuenta» y la cápsula del tiempo. El
progreso se guarda en un archivo JSON en la carpeta de datos del usuario.

Está pendiente el audio: la interfaz `AudioEngine` existe y la aplicación usa
una implementación silenciosa, así que la partida se juega igual pero sin
música (ver «Diferencias conocidas» en [SPECS.md](SPECS.md)).

## Versión web (referencia)

El personaje «Capi» recoge con sus manos los números que escribes y celebra cada respuesta correcta. Cuanto más avanzas, más crecen la pantalla y el sonido hasta acabar como una fiesta. Equivocarse no baja el ritmo y nunca hay «game over».

## Características

- 58 habilidades de cálculo de 1º a 6º grado (según el currículo escolar japonés): sumas, restas, multiplicaciones, divisiones, cuentas en columna paso a paso, decimales, fracciones, porcentajes y más
- Modo «Mi nivel»: empieza con una prueba de nivel y desbloquea la siguiente habilidad según tu dominio
- Modos por grado, práctica, repaso y un árbol de habilidades
- Con todo correcto, 100 puntos. Si aciertas a la primera el 80% o más, el Extra con tiempo limitado te deja pasar de 100
- Toda la música y los efectos de sonido se generan con la Web Audio API (no hay archivos de audio)
- Funciona en vertical en el teléfono y en computadora. En computadora también puedes escribir con el teclado numérico y Retroceso
- En Ajustes puedes regular la intensidad del movimiento y silenciar el sonido
- Los registros se guardan solo en el dispositivo (localStorage); nunca se envían afuera

## Cómo jugar (en tu computadora)

No hace falta compilar nada: basta con servir la carpeta `app/` como archivos estáticos.

```bash
python3 -m http.server 8000 -d app
```

Abre `http://localhost:8000/` en el navegador. Como usa ES Modules, no funciona abriendo el archivo con `file://`.

## Pruebas

Requiere Node.js 20 o superior.

```bash
node --test tests/*.test.mjs
```

También puedes comprobar la traducción (que cada clave exista en español e inglés y que no quede texto japonés en pantalla):

```bash
node tools/check_i18n.mjs
```

## Estructura

| Ruta | Contenido |
| --- | --- |
| `app/` | El juego (ES Modules sin dependencias) |
| `app/js/i18n.js` | Textos en japonés y español y el cambio de idioma (el inglés está en `app/js/i18n.en.js`) |
| `docs/SPEC.md` | Especificación (en japonés) |
| `docs/curriculum.md` | Currículo por grado y diseño del árbol de habilidades |
| `docs/dopakichi.svg` | Dibujo original de Capi |
| `tests/` | Pruebas unitarias |
| `tools/build_fonts.sh` | Regenera los subconjuntos de fuentes (hay que ejecutarlo al añadir textos nuevos) |
| `tools/check_i18n.mjs` | Comprobación de la traducción |
| `tools/dom_smoke.mjs` | Prueba de extremo a extremo de la interfaz y del cambio de idioma (necesita jsdom) |

## Anuncios, privacidad y tiendas

- La versión móvil muestra anuncios de Google AdMob en modo infantil (no
  personalizados, contenido apto para todos); la lógica está en
  `app/js/ads.js` y en la web no hace nada.
- Política de privacidad: `docs/privacy.html` (publicada en
  https://ccardenas93.github.io/dopa-drill/privacy.html) y un resumen dentro
  de la app en Ajustes → Sobre la app.
- Publicación en Google Play (cuentas, AdMob, formularios, firma, textos de la
  ficha): [docs/PLAY_STORE.md](docs/PLAY_STORE.md). Recursos gráficos:
  `npm run store`.

## Licencia

- Código fuente: licencia MIT (incluye el código original de gear_machine).
- La mascota «Capi», el nombre y el logotipo de «CapiFiesta» (`docs/mascot/`, `app/js/mascot.js`, `app/icon.svg`, el logo de `app/index.html`): © 2026 ccardenas93, todos los derechos reservados; no están cubiertos por la MIT.
- La mascota original «Dopakichi» y el nombre y logotipo «Dopa Drill» de gear_machine **no forman parte** de este fork: se retiraron el 29 de septiembre de 2026.
- Fuentes (`app/fonts/`): SIL Open Font License 1.1

Consulta [LICENSE](LICENSE) para más detalles.
