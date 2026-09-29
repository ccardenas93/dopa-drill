# Dopa Drill en iOS y Android

La app móvil **es la misma aplicación web** dentro de un contenedor nativo
(Capacitor). No hay una segunda versión del juego: se toca `app/` una vez y sale
en la web, en iOS y en Android, con toda la funcionalidad intacta (audio
sintetizado con Web Audio, fondo WebGL, partículas, el SVG de Dopakichi, las
fuentes locales y el guardado en `localStorage`).

```
app/            ← el juego (única fuente de verdad)
ios/            ← proyecto Xcode generado por Capacitor
android/        ← proyecto Gradle generado por Capacitor
capacitor.config.json
```

## Requisitos

| Herramienta | Versión probada | Nota |
| --- | --- | --- |
| Node + npm | 25 / 11 | para el CLI de Capacitor |
| Xcode | 27 | iOS; el proyecto pide iOS 15 o superior |
| CocoaPods | 1.16 | lo usa `npx cap sync ios` |
| Android SDK | 36 | Android; `android/build.gradle` lo toma de `ANDROID_HOME` |
| JDK | **21** | Capacitor 7 compila con Java 21 |

> En este Mac, `~/.gradle/gradle.properties` fija Java 17 para todos los
> proyectos. Por eso el script `npm run apk` pasa `-Dorg.gradle.java.home`
> apuntando al JDK 21 de Homebrew (`brew install openjdk@21`). Si tu JDK 21 está
> en otro sitio: `JDK21=/ruta/al/jdk npm run apk`.

## Uso diario

```bash
npm run sync         # copia app/ a ios/ y android/ (hazlo tras cada cambio en el juego)
npm run apk          # APK de depuración -> android/app/build/outputs/apk/debug/app-debug.apk
npm run ios:build    # comprueba que iOS compila (sin firmar)
npm run android      # abre Android Studio
npm run ios          # abre Xcode
```

Para probar en un teléfono Android conectado por USB:

```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

## Lo único que añade el contenedor nativo

1. **Sesión de audio en iOS** (`ios/App/App/AppDelegate.swift`): se declara
   `AVAudioSession` como `.playback` para que el juego suene aunque el iPhone
   esté en silencio, y se desactiva el rebote del `WKWebView`.
2. **Botón atrás de Android** (`android/app/src/main/java/com/tanosix/dopa_drill/MainActivity.java`):
   dentro de una partida envía `Escape` (el juego ya pregunta «¿Volver al
   título?»), y en el título cierra la app.
3. **Iconos**: generados a partir del Dopakichi de `app/icon.svg`, con el azul
   de la marca de fondo; el icono adaptativo de Android usa ese azul y el
   primer plano con la zona segura del 66 %.

No hay más código nativo. Todo lo demás lo pone el juego.

## Rendimiento

El espectáculo crece con cada acierto, así que la calidad se ajusta sola
(`app/js/perf.js`). Un gobernador mide los fotogramas reales y baja o sube un
nivel:

| Nivel | Cuándo | Qué cambia |
| --- | --- | --- |
| full | ordenadores | todo activado |
| lite | teléfonos | fondo WebGL pequeño a 30 fps, menos partículas e invitados, invitados a 30 fps, sin animaciones CSS que repintan |
| low | teléfonos con ≤ 4 núcleos o ≤ 3 GB, o si lite no llega a 40 fps | fondo mínimo, pocas partículas, sin desfile |

Con `?tier=0|1|2` en la URL se fuerza un nivel para probar. Reglas para no
volver a perder rendimiento en el bucle de fotogramas: no leer
`innerWidth`/`innerHeight`/`getBoundingClientRect` dentro de `onFrame` (usar
`view` de `core.js` o valores cacheados), no asignar `ctx.font` en un canvas
visible y no poner variables CSS que cambian cada fotograma en `<body>`.

## Anuncios (AdMob)

El contenedor lleva el plugin `@capacitor-community/admob`; toda la lógica está
en `app/js/ads.js` y en la web es un no-op. Reglas para público infantil
(política de Familias de Play): SDK inicializado con
`tagForChildDirectedTreatment`, `tagForUnderAgeOfConsent`, contenido máximo
**G** y `npa: true`; banner solo fuera de la partida (el CSS reserva `--ad-h`
px abajo); intersticial solo al salir de la pantalla de resultados, máximo uno
cada 3 rondas y 3 minutos, nunca en los primeros 90 s ni al abrir la app.

Los IDs del repo son los **de prueba** de Google. Para publicar: ID de
aplicación en `android/app/src/main/res/values/strings.xml` (`admob_app_id`) y
en `ios/App/App/Info.plist` (`GADApplicationIdentifier`), unidades en `IDS` de
`app/js/ads.js` y `TESTING = false`. Detalles y formularios de la consola en
[docs/PLAY_STORE.md](docs/PLAY_STORE.md).

## Firma y AAB (Android)

- Clave de subida: `android/keystore/upload-keystore.jks` (alias `upload`),
  contraseñas en `android/keystore.properties`. **Ninguno de los dos está en
  git**: guarda una copia de los dos en un sitio seguro.
- `android/app/build.gradle` lee `keystore.properties` si existe y firma la
  release con él; si falta, la release sale sin firmar.
- `npm run aab` → `android/app/build/outputs/bundle/release/app-release.aab`
  (lo que se sube a Play Console).
- `npm run apk:release` → APK firmado para instalar por USB y probar.
- Antes de cada subida nueva: subir `versionCode` en `android/app/build.gradle`
  (y `versionName` + `APP_VERSION` de `app/js/main.js` si cambia la versión
  visible).
- Objetivo de compilación: `compileSdk`/`targetSdk` **36** (Play lo exige para
  apps nuevas desde el 31/08/2026). Está en `android/variables.gradle`.

La pantalla de arranque usa `res/drawable/splash.xml` (azul de la marca con
Dopakichi) y, en Android 12+, el icono adaptativo sobre el mismo azul
(`styles.xml`, `AppTheme.NoActionBarLaunch`).

## Recursos de la ficha de Play

`npm run store` (usa `puppeteer-core` con el Chrome instalado) genera en
`store/play/`: icono 512×512, gráfico de funciones 1024×500 y capturas de
teléfono 1080×1920 (título, partida, árbol, trofeos), en español e inglés.

## Publicar en las tiendas

- **Android (Play Store)**: ver [docs/PLAY_STORE.md](docs/PLAY_STORE.md)
  (cuentas, AdMob, formularios, pistas de prueba, textos de la ficha y la
  cuestión de la licencia del personaje).
- **iOS (App Store)**: abrir `npm run ios`, elegir tu equipo de firma en
  *Signing & Capabilities* y archivar (Product → Archive). Hace falta cuenta de
  desarrollador de Apple.

Los identificadores ya están puestos: `com.tanosix.dopa_drill`, nombre visible
«Dopa Drill», versión 1.0.0.

## Trabajar en el juego

```bash
npm run serve        # http://localhost:8000 para probar en el navegador
npm test             # 58 pruebas de la lógica
npm run i18n         # comprueba textos en español
```

Tras cualquier cambio: `npm run sync` y volver a compilar (o `npm run android`
/ `npm run ios` para que el IDE recompile al vuelo).
