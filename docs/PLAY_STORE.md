# Publicar Dopa Drill en Google Play

Guía paso a paso para la primera publicación. Todo lo técnico ya está en el
repo (AAB firmado, anuncios, política de privacidad, SDK 36); lo que queda son
cuentas, formularios y una decisión legal que hay que tomar antes de subir nada.

## 0. Antes de nada: la licencia del personaje

Este repositorio es un fork de [grmchn/dopa-drill](https://github.com/grmchn/dopa-drill)
(autor: gear_machine). El código es MIT y se puede usar comercialmente, pero
`LICENSE` deja **fuera** del MIT al personaje **Dopakichi**, al **nombre
«Dopa Drill»** y al **logo**, y dice literalmente que sin permiso previo no se
permite:

> commercial use, such as selling goods, artworks or products featuring the
> Characters, or using them in paid products, services or advertising

Una app con anuncios (o con compras) es un uso comercial. Hay dos caminos:

| Opción | Qué hacer | Cuándo se puede publicar |
| --- | --- | --- |
| **A. Permiso** | Escribir a gear_machine (`grmchn4ml@gmail.com`, o un issue en su repo) pidiendo licencia comercial para usar Dopakichi, el nombre y el logo en la versión de Play Store con anuncios. Guardar la respuesta por escrito. | En cuanto conteste que sí. |
| **B. Rebrand** | Cambiar nombre, logo y mascota por unos propios (el código MIT se queda, con el aviso de copyright). Puntos a tocar: `app/js/dopakichi.js`, `app/icon.svg`, `app/js/i18n*.js` (`app.title`, `app.logoTop/Bottom`), iconos Android, `capacitor.config.json` (`appName`), `strings.xml`. | Hoy mismo. |

Subir la app tal cual, con anuncios y sin permiso, expone a una reclamación
de retirada (Play tiene formulario de infracción de copyright) y a perder la
cuenta de desarrollador. Este documento asume que se elige A o B.

## 1. Cuentas necesarias

1. **Google Play Console**: cuenta de desarrollador (pago único de 25 USD),
   verificación de identidad (DNI y, para cuentas personales nuevas,
   a veces un teléfono). Tarda de horas a 2 días.
2. **Google AdMob** (admob.google.com): cuenta con la misma cuenta de Google.
   Pide dirección postal y datos de pago para cobrar (el pago llega al superar
   100 USD).

## 2. AdMob: crear la app y las unidades de anuncio

1. AdMob → *Apps* → *Añadir app* → Android → «¿Está publicada en Play?» **No**
   todavía (se vincula después) → nombre «Dopa Drill».
2. Copiar el **ID de aplicación** (`ca-app-pub-XXXX~YYYY`) y pegarlo en
   `android/app/src/main/res/values/strings.xml` (`admob_app_id`).
3. Crear dos **unidades de anuncio**:
   - Banner → «Dopa Drill · banner» → copiar el ID a `IDS.android.banner` en `app/js/ads.js`.
   - Intersticial → «Dopa Drill · intersticial» → `IDS.android.interstitial`.
   - (Opcional, para más adelante) Recompensado → `IDS.android.rewarded`.
4. En `app/js/ads.js` poner `export const TESTING = false;`.
5. AdMob → la app → *Configuración de la app* → marcar la app como
   **dirigida a niños** (tratamiento infantil). También en *Bloqueo de
   anuncios* → *Categorías sensibles* bloquear todo lo no apto para niños.
6. `npm run sync && npm run aab` → sube el nuevo AAB.
7. Cuando la app esté publicada: AdMob → la app → *Vincular con Play*.
   Opcional: publicar `app-ads.txt` en el dominio del desarrollador.

Mientras los IDs sean los de prueba, la app muestra anuncios de prueba (no
generan ingresos pero tampoco infringen nada).

## 3. Compilar y firmar

Ya está hecho en el repo:

- `android/keystore/upload-keystore.jks` + `android/keystore.properties`
  (los dos **fuera de git**; hacer copia de seguridad de ambos ahora mismo,
  por ejemplo en un gestor de contraseñas). Es la *clave de subida*; Google
  guarda la clave de firma final (Play App Signing), así que si se pierde se
  puede pedir un reset, pero es un trámite.
- `npm run aab` genera `android/app/build/outputs/bundle/release/app-release.aab`.
- `npm run apk:release` genera un APK firmado para probar en un móvil
  (`adb install -r android/app/build/outputs/apk/release/app-release.apk`).
- `versionCode` en `android/app/build.gradle`: subirlo (2, 3, …) en cada
  subida nueva a Play; `versionName` y `APP_VERSION` (main.js) van de la mano.

## 4. Play Console: crear la app

*Crear app*: nombre **Dopa Drill**, idioma predeterminado **Español
(Latinoamérica) – es-419** (o es-ES), tipo **App**, **Gratis** (no se puede
cambiar a de pago después). Aceptar las declaraciones.

### 4.1 Panel «Configura tu app» (todas obligatorias)

| Sección | Respuesta para Dopa Drill |
| --- | --- |
| **Política de privacidad** | `https://ccardenas93.github.io/dopa-drill/privacy.html` (el archivo ya está en el repo de la web; hay que hacer push para que exista). |
| **Acceso a la app** | «Todas las funciones están disponibles sin acceso especial» (no hay login). |
| **Anuncios** | **Sí, la app contiene anuncios.** |
| **Clasificación de contenido** | Cuestionario IARC → categoría *Juego* (o *Utilidad/educación*). Sin violencia, sin sexo, sin lenguaje, sin controles, sin compras, sin intercambio de información personal, sin ubicación. Resultado esperado: **PEGI 3 / Everyone**. |
| **Público objetivo y contenido** | Grupos de edad: **6–8** y **9–12** (marcar también 13+ si quieres adultos; entonces es «público mixto» y el formulario pregunta por pantalla de edad neutra; para no complicarse: solo 6–12). → «¿Puede atraer a niños involuntariamente?» N/A. → Confirmar cumplimiento de la política de **Familias**. |
| **Anuncios en Familias** | Confirmar que solo se usan SDK certificados: **Google AdMob** está en el programa *Families Self-Certified Ads SDK*. Formatos: banner + intersticial cerrable, nunca al abrir la app, nunca durante el juego, no personalizados. |
| **Apps de noticias** | No. |
| **Rastreo de contactos / COVID** | No. |
| **Seguridad de los datos** | Ver 4.2. |
| **Apps gubernamentales** | No. |
| **Funciones financieras** | Ninguna. |
| **Apps de salud** | No. |

### 4.2 Formulario «Seguridad de los datos»

- ¿La app recoge o comparte datos de usuario? → **Sí** (por el SDK de anuncios; el juego en sí no recoge nada).
- ¿Se cifran en tránsito? → Sí (el SDK de Google usa HTTPS).
- ¿Puede el usuario pedir la eliminación? → El usuario borra todo desde Ajustes; no hay cuenta ni datos en servidor. Marcar «No» a «ofrece un mecanismo de solicitud» solo si Play lo permite en tu caso; si no, indicar el correo de contacto.
- Tipos de datos, siguiendo la tabla oficial de AdMob para Play
  (https://support.google.com/admob/answer/10787594): en la práctica para una
  app **infantil sin anuncios personalizados** se declara:
  - **Actividad de la app → Interacciones en la app** (interacciones con anuncios): recogido, compartido con Google, con fines de *Publicidad o marketing* y *Análisis*. No opcional.
  - **Información y rendimiento de la app → Registros de fallos / Diagnóstico**: recogido, fines *Análisis*.
  - **Ubicación aproximada**: NO (derivada de IP por Google, pero no la pide la app; AdMob indica declararla solo si se pide permiso de ubicación).
  - **Identificadores de dispositivo u otros**: NO, porque con `tagForChildDirectedTreatment` no se usa el ID de publicidad. (Si más adelante se quita el modo infantil, habría que declararlo.)
- El juego no recoge nombre, correo, fotos, contactos, mensajes, archivos, salud ni ubicación.

### 4.3 Ficha de Play Store (Store listing)

Textos listos en el apartado 6. Recursos gráficos (`npm run store` los genera
en `store/play/`):

| Recurso | Requisito | Archivo |
| --- | --- | --- |
| Icono | 512×512 PNG, sin transparencia | `store/play/icon-512.png` |
| Gráfico de funciones | 1024×500 PNG/JPG | `store/play/feature-1024x500.png` |
| Capturas de teléfono | mínimo 2, máx. 8; 1080×1920 sirve (ratio ≤ 2:1) | `store/play/shot-*.png` |
| Categoría | **Educación** (o *Educativo* dentro de Juegos) | – |
| Etiquetas | matemáticas, cálculo mental, primaria, niños | – |
| Correo de contacto | obligatorio y visible en la ficha | – |

### 4.4 Versiones: en qué pista subir

1. **Prueba interna** (hasta 100 testers por correo): subir el AAB hoy, instalar
   desde el enlace y comprobar anuncios de prueba, banner en el título,
   intersticial al salir de resultados, splash y botón atrás.
2. **Prueba cerrada**: obligatoria para **cuentas personales creadas después
   de noviembre de 2023**: al menos **12 testers** activos durante **14 días**
   seguidos antes de poder pedir acceso a producción. Si la cuenta es de
   organización o antigua, se puede saltar.
3. **Producción**: revisión de Google entre unas horas y 7 días (las apps de
   Familias tardan más). Publicar por países; Ecuador + Latinoamérica +
   España + EE. UU. es un buen inicio.

Al crear la versión, Play pide activar **Play App Signing**: aceptar (Google
genera la clave de firma; nuestra clave de subida es la del keystore).

## 5. Monetización: qué hay y qué sigue

**Ahora (v1.0)**

| Formato | Dónde | Regla |
| --- | --- | --- |
| Banner adaptativo | Título, árbol, trofeos, colección y pantallas de resultado. Nunca durante la partida (el teclado ocupa el borde inferior). | El diseño reserva `--ad-h` px para que nada quede tapado. |
| Intersticial | Solo al pulsar «Terminar» / «Otra vez» en la pantalla de resultados. | Como mucho 1 cada **3 rondas completas** y cada **3 minutos**, nunca en los primeros 90 s tras abrir la app, nunca al arrancar. Si falla o tarda, el juego continúa igual. |

Configuración del SDK: `tagForChildDirectedTreatment`, `tagForUnderAgeOfConsent`,
contenido máximo **G**, `npa: true` (no personalizados). Es lo que exige la
política de Familias y COPPA; también significa eCPM más bajo que en apps de
adultos (orientativo: banner 0,1–0,5 USD, intersticial 1–4 USD por cada 1000
impresiones en LatAm; más en EE. UU./Europa).

**Siguiente (v1.1, ya preparado en `ads.js`)**: anuncio **recompensado**
opcional, por ejemplo «Ver un anuncio → +1 martillo ‹no cuenta›» cuando el
jugador no tiene martillos. Para niños tiene que ser claramente opcional, con
botón propio, y cerrable a los 5 s.

**Después (v1.2)**: compra única **«Sin anuncios»** (2,99 USD aprox.) con
`@capacitor-community/in-app-purchases` o RevenueCat; en apps infantiles
Play exige que la compra sea fácil de entender y que no haya presión.

Lo que **no** conviene en una app de Familias: anuncios con mediación no
certificada, banners dentro de la partida, intersticiales al abrir, vídeos que
no se pueden cerrar, o «pulsa aquí para ganar» que se confunda con el juego.

## 6. Textos de la ficha

### Español (es-419)

**Nombre (30):** Dopa Drill: cálculo mental

**Descripción breve (80):** Suma, resta, multiplica y divide con fiesta. Matemáticas de 1.º a 6.º.

**Descripción completa:**

Dopa Drill convierte el cálculo mental en una fiesta. Cada acierto sube la
música, llena la pantalla de confeti y hace bailar a Dopakichi, la mascota que
lleva tus números. Equivocarse no resta ni termina la partida: el ritmo sigue.

• 58 habilidades de 1.º a 6.º de primaria: sumas y restas con llevadas,
tablas, división con resto, decimales, fracciones, porcentajes y más.
• «Mi nivel»: una prueba corta coloca al jugador y el árbol de habilidades va
desbloqueando lo siguiente cuando domina lo anterior.
• Modo por grado, práctica libre y repaso de los problemas fallados.
• Rondas de 6, 10 o 14 problemas, y un Extra contrarreloj para quien acierta
el 80 % a la primera.
• Misiones diarias, calendario, calcomanías, más de 300 trofeos y una
colección de efectos que se van desbloqueando.
• Todo en español e inglés. Sin cuentas, sin registro: el progreso se guarda
en el dispositivo.
• Funciona sin conexión.

Pensada para niños de 6 a 12 años y para adultos que quieren mantener la
mente ágil. Contiene anuncios no personalizados aptos para todos los públicos.

### English (en-US)

**Name:** Dopa Drill: mental math

**Short description:** Add, subtract, multiply and divide with a party. Math for grades 1–6.

**Full description:**

Dopa Drill turns mental math into a party. Every right answer turns the music
up, fills the screen with confetti and makes Dopakichi, the mascot who carries
your digits, dance. A wrong answer never ends the round: the beat goes on.

• 58 skills from grade 1 to grade 6: carrying and borrowing, times tables,
division with remainders, decimals, fractions, percentages and more.
• "My level": a short placement test, then a skill tree that unlocks the next
step as each one is mastered.
• Play by grade, free practice, and review of missed problems.
• Rounds of 6, 10 or 14 problems, plus a timed Extra for 80 % first-try scores.
• Daily quests, calendar, stickers, 300+ trophies and a collection of effects
to unlock.
• Spanish and English. No accounts, no sign-up: progress stays on the device.
• Works offline.

Made for kids aged 6–12 and for grown-ups who like to keep their math sharp.
Contains non-personalized, family-safe ads.

## 7. Checklist del día de subida

- [ ] Decidido A (permiso por escrito) o B (rebrand) del apartado 0.
- [ ] Push de `ccardenas93.github.io` para que exista la URL de la política.
- [ ] Correo de contacto revisado en `docs/privacy.html` (aparece público).
- [ ] IDs reales de AdMob en `strings.xml` y `ads.js`, `TESTING = false`.
- [ ] `npm test && npm run i18n && npm run sync && npm run aab`.
- [ ] Copia de seguridad de `android/keystore/` y `android/keystore.properties`.
- [ ] Recursos gráficos generados (`npm run store`) y revisados.
- [ ] Formularios de la sección 4.1 completos; ficha con textos de la sección 6.
- [ ] AAB en Prueba interna → probado en un móvil real → Prueba cerrada.
