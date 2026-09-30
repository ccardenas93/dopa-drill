# CapiFiesta — guion para la próxima sesión

Última actualización: 30 de septiembre de 2026, 00:30. Para retomar, abre Claude en
`/Volumes/Carsk8Mac/GitHub/dopa-drill` y dile: **«lee docs/NEXT_SESSION.md y sigamos»**.

## 1. Dónde estamos

| Cosa | Estado |
| --- | --- |
| Código | `main` en GitHub al día (último commit `0fc1774`). 72 tests, i18n limpio, fuzzer 249 000 problemas sin fallos, auditoría visual sin recortes. |
| AdMob | Cuenta aprobada. App **CapiFiesta** (Android). ID de app `ca-app-pub-2487397476479781~4783522925`. Unidades: Banner `…/5509357799`, Interstitial `…/1793388346`. Rewarded no creado (no se usa aún). `app-ads.txt` publicado en `https://ccardenas93.github.io/app-ads.txt`. |
| Play Console | App `com.tanosix.capifiesta`, cuenta **personal** → obliga a prueba cerrada de **12 testers durante 14 días**. Fichas es-419 y en-US completas, clasificación PEGI 3, público 6–12, seguridad de datos, todas las declaraciones hechas. |
| Bundle en Play | `3 (1.0.0)` (versionCode 3) en **prueba interna** y en **prueba cerrada «Alpha»**. Enviado a revisión de Google el 30/09/2026. Anuncios en modo prueba (`TESTING = true`). |
| Web | Política de privacidad en `https://ccardenas93.github.io/dopa-drill/privacy.html` (versión CapiFiesta). |

Cambios técnicos de hoy que conviene recordar: R8 activado (bundle 5,7 MB), `minSdk 24`,
permiso `AD_ID` y permisos AdServices eliminados del manifiesto (app solo para niños),
IDs reales de AdMob en `android/app/src/main/res/values/strings.xml` y `app/js/ads.js`.

## 2. Lo que toca esperar (tu parte)

1. **Correo de Google con el resultado de la revisión** (horas a 7 días; apps infantiles
   tardan más). Si es rechazo, pega el texto completo a Claude.
2. **Reunir 12 testers** con cuenta de Google y añadirlos a la lista «Test Inicial»
   (Play Console → Testing → Closed testing → Testers). El reloj de 14 días empieza
   cuando haya 12 aceptados a la vez; el Dashboard muestra el contador.
3. Cuando la revisión esté aprobada: copiar el enlace en Closed testing → Testers →
   «Copy link» y mandarles este mensaje:

   > ¡Hola! Estoy lanzando CapiFiesta, un juego de cálculo mental para niños de primaria, y
   > Google me pide 12 personas que la prueben durante 14 días antes de publicarla.
   > 1) Abre este enlace con tu cuenta de Google (la misma que me diste): [ENLACE]
   > 2) Pulsa «Convertirme en tester» y luego «Descargar en Google Play».
   > 3) Juega unas rondas de vez en cuando durante estas dos semanas y no la desinstales.
   > Los anuncios dicen «Test Ad»: es normal. Si algo falla, captura a carsk893@gmail.com. ¡Gracias!

   Si alguien ve «Elemento no encontrado» en Play: cuenta equivocada en el móvil, o
   el enlace aún no se propagó (puede tardar unas horas la primera vez).

## 3. Próxima sesión con Claude, según lo que haya pasado

### A. Llegó la revisión

- **Aprobada**: nada que tocar en código. Verificar en un móvil real (prueba interna o
  cerrada) que el nombre ya no es «(unreviewed)», que el banner y el intersticial salen
  como «Test Ad», y que el botón atrás no cierra la app en mitad de una ronda.
- **Rechazada**: pegar el motivo. Los rechazos típicos en apps de Familias son
  seguridad de datos incompleta, capturas con contenido no infantil, o texto de la
  ficha que sugiere público adulto. Todo eso está revisado, pero se corrige y se reenvía.

### B. Pasaron los 14 días con 12 testers

En el Dashboard aparece **Apply for production access**. Formulario de tres partes;
borrador de respuestas (Claude lo afina con los datos reales):

1. *Sobre la prueba cerrada*: testers reclutados entre familia, amigos y padres de
   alumnos; usaron modo «Mi nivel», árbol de habilidades, trofeos y colección; el uso
   fue el esperado para un juego diario corto; feedback recogido por correo y WhatsApp
   (poner 2 o 3 comentarios reales).
2. *Sobre la app*: público 6–12 años; valor: cálculo mental de 1.º a 6.º con
   progresión adaptativa y repaso espaciado, en español e inglés, sin cuentas;
   instalaciones estimadas primer año: 1 000–10 000.
3. *Preparación*: cambios hechos a partir de la prueba (listar los que haya) y cómo se
   decidió que está lista (tests automáticos, fuzzer, auditoría visual, prueba en
   dispositivos reales).

### C. Google concedió acceso a producción

Pedir a Claude «compilación de producción». Hará:

1. `app/js/ads.js`: `TESTING = false`.
2. `android/app/build.gradle`: `versionCode 4` (cada código se consume aunque se borre el bundle).
3. `npx cap copy && npm run aab` → `android/app/build/outputs/bundle/release/app-release.aab`.
4. Comprobar el manifiesto del bundle (sin `AD_ID`, versionCode 4) y commit + push.

Luego en Play: Production → Create new release → subir el AAB → países (Ecuador,
Latinoamérica, España, EE. UU. como mínimo) → enviar a revisión → publicar.

### D. La app ya está publicada

1. AdMob → Apps → CapiFiesta → **Link to app store** → buscar por `com.tanosix.capifiesta`.
   Dispara la revisión de AdMob (2 o 3 días) y el estado pasa a «Lista».
2. Al día siguiente, AdMob → Apps → app-ads.txt: debe aparecer **verificado**. Requiere
   que la ficha de Play tenga el sitio web `https://ccardenas93.github.io` (ya puesto).
3. Comprobar en un móvil real que salen anuncios reales (sin «Test Ad»). No pulsar los
   anuncios propios: es tráfico inválido.
4. Cuando AdMob llegue a 10 USD manda un PIN por correo postal; hay 4 meses para meterlo.
5. Revisar el resultado de «Teacher Approved» (llega por correo, puede tardar semanas).

## 4. Mejoras pendientes (opcionales, por prioridad)

1. Recordatorio de racha con `@capacitor/local-notifications` (permiso POST_NOTIFICATIONS).
2. Anuncio bonificado opcional «ver anuncio → +1 martillo» (unidad Rewarded en AdMob; el
   código en `ads.js` ya lo soporta).
3. Subir `videos/capifiesta-promo/renders/video-16x9.mp4` a YouTube y poner la URL en la ficha.
4. Compra única «Sin anuncios» (v1.2).
5. iOS: crear la app iOS en AdMob, poner sus IDs en `Info.plist` y `ads.js`, y preparar App Store.
6. Actualizar el SDK de anuncios (AdMob avisa de versión antigua) y, más adelante, AGP 9.

## 5. Comandos de verificación

```bash
node --test tests/*.test.mjs          # 72 tests
node tools/check_i18n.mjs             # claves es/en completas
node tools/fuzz_problems.mjs          # generadores: debe decir "Hard failures: 0"
node tools/ui_audit.mjs <carpeta> --locales es,en --vps 360x640   # necesita servidor en :8766
npx cap copy && npm run aab           # bundle firmado
npm run store                         # capturas y gráficos de la ficha (store/play/)
```

Servidor estático para las herramientas de captura: `python3 -m http.server 8766 --bind 127.0.0.1`
desde la raíz del repo.
