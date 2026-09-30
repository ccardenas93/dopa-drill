// Anuncios (Google AdMob a través de @capacitor-community/admob).
//
// Solo funciona dentro de la app nativa (Android/iOS): el plugin llega por
// window.Capacitor.Plugins.AdMob, que el contenedor inyecta en la WebView.
// En la web todas las funciones son no-ops y el juego no cambia.
//
// Reglas (política de Familias de Google Play, público infantil):
// - Modo dirigido a niños: sin anuncios personalizados, sin identificador de
//   publicidad, contenido máximo «G» (tagForChildDirectedTreatment,
//   tagForUnderAgeOfConsent, maxAdContentRating, npa).
// - Banner solo fuera de la partida (nunca tapa el teclado).
// - Intersticial nunca al abrir la app ni durante la partida: solo al salir
//   de la pantalla de resultados, como mucho uno cada AD_ROUNDS rondas y
//   cada AD_GAP_MS, y nunca antes de AD_WARMUP_MS desde el arranque.
// - Todo se cierra y el juego continúa aunque el anuncio falle.
//
// IDs: Android usa las unidades reales de la cuenta AdMob (CapiFiesta);
// «rewarded» sigue con el ID de prueba de Google porque aún no se muestra.
// iOS conserva los IDs de prueba hasta que exista la app iOS en AdMob.
// Mientras TESTING sea true se sirven anuncios de prueba (isTesting en cada
// llamada); ponerlo en false solo en la compilación de producción.
// El ID de aplicación (ca-app-pub-…~…) va en android/app/src/main/res/values/strings.xml.
export const TESTING = true;
const IDS = {
  android: {
    banner: 'ca-app-pub-2487397476479781/5509357799',       // CapiFiesta · Banner (real)
    interstitial: 'ca-app-pub-2487397476479781/1793388346', // CapiFiesta · Interstitial (real)
    rewarded: 'ca-app-pub-3940256099942544/5224354917',     // rewarded (test)
  },
  ios: {
    banner: 'ca-app-pub-3940256099942544/2435281174',
    interstitial: 'ca-app-pub-3940256099942544/4411468910',
    rewarded: 'ca-app-pub-3940256099942544/1712485313',
  },
};

export const AD_ROUNDS = 3;            // rondas completas entre intersticiales
export const AD_GAP_MS = 3 * 60 * 1000; // tiempo mínimo entre intersticiales
export const AD_WARMUP_MS = 90 * 1000;  // sin intersticiales justo tras abrir
// Pantallas donde puede verse el banner (nunca en 'play').
const BANNER_SCREENS = new Set(['title', 'tree', 'trophy', 'collect', 'result', 'final']);

const cap = () => globalThis.Capacitor;
const platform = () => (cap() && typeof cap().getPlatform === 'function' ? cap().getPlatform() : 'web');
const plugin = () => {
  const c = cap();
  if (!c || !c.isNativePlatform || !c.isNativePlatform()) return null;
  return (c.Plugins && c.Plugins.AdMob) || null;
};
const ids = () => IDS[platform()] || IDS.android;

const A = {
  ready: false, enabled: false, screen: 'title',
  bannerShown: false, bannerWanted: false, bannerHeight: 0,
  interReady: false, interLoading: false, rounds: 0, lastInter: 0, startedAt: Date.now(),
  rewardReady: false,
};
export const state = A;

const log = (...a) => { try { console.log('[ads]', ...a); } catch { /* ignore */ } };

function setBannerHeight(h) {
  A.bannerHeight = h;
  const root = globalThis.document && document.documentElement;
  if (!root) return;
  root.style.setProperty('--ad-h', `${h}px`);
  document.body.classList.toggle('has-ad', h > 0);
}

/** Initialise the SDK in child-directed mode. Safe to call anywhere. */
export async function init() {
  const p = plugin();
  if (!p) { log('web: ads disabled'); return false; }
  try {
    await p.initialize({
      initializeForTesting: TESTING,
      tagForChildDirectedTreatment: true,
      tagForUnderAgeOfConsent: true,
      maxAdContentRating: 'General',
    });
    A.ready = true; A.enabled = true;
    // Height in dp == CSS px inside the WebView.
    p.addListener('bannerAdSizeChanged', (info) => setBannerHeight(A.bannerShown ? (info && info.height) || 0 : 0));
    p.addListener('bannerAdFailedToLoad', (e) => { log('banner failed', e && e.message); setBannerHeight(0); });
    p.addListener('interstitialAdLoaded', () => { A.interReady = true; A.interLoading = false; });
    p.addListener('interstitialAdFailedToLoad', (e) => { log('interstitial failed', e && e.message); A.interReady = false; A.interLoading = false; });
    p.addListener('onRewardedVideoAdLoaded', () => { A.rewardReady = true; });
    p.addListener('onRewardedVideoAdFailedToLoad', () => { A.rewardReady = false; });
    prepareInterstitial();
    syncBanner();
    return true;
  } catch (e) {
    log('init failed', e && e.message);
    return false;
  }
}

/** The game tells us which screen is on; the banner follows. */
export function onScreen(name) {
  A.screen = name;
  syncBanner();
}

async function syncBanner() {
  const p = plugin();
  if (!p || !A.ready) return;
  const want = BANNER_SCREENS.has(A.screen);
  if (want === A.bannerWanted) return;
  A.bannerWanted = want;
  try {
    if (want) {
      if (A.bannerShown) { await p.resumeBanner(); }
      else {
        await p.showBanner({ adId: ids().banner, adSize: 'ADAPTIVE_BANNER', position: 'BOTTOM_CENTER', margin: 0, isTesting: TESTING, npa: true });
        A.bannerShown = true;
      }
    } else if (A.bannerShown) {
      await p.hideBanner();
      setBannerHeight(0);
    }
  } catch (e) { log('banner', e && e.message); setBannerHeight(0); }
}

async function prepareInterstitial() {
  const p = plugin();
  if (!p || !A.ready || A.interReady || A.interLoading) return;
  A.interLoading = true;
  try { await p.prepareInterstitial({ adId: ids().interstitial, isTesting: TESTING, npa: true }); }
  catch (e) { log('prepare interstitial', e && e.message); A.interLoading = false; }
}

/** A basic set was completed (result screen). Counts toward the next interstitial. */
export function noteRound() { A.rounds += 1; if (plugin() && A.ready) prepareInterstitial(); }

export function interstitialDue(now = Date.now()) {
  if (!A.ready || !A.enabled || !A.interReady) return false;
  if (now - A.startedAt < AD_WARMUP_MS) return false;
  if (A.rounds < AD_ROUNDS) return false;
  if (now - A.lastInter < AD_GAP_MS) return false;
  return true;
}

/**
 * Runs `next` after showing an interstitial if one is due; otherwise runs it
 * at once. Used on the buttons that leave the result screens, so an ad never
 * interrupts a round and the game always continues.
 */
export function gate(next) {
  if (!interstitialDue()) { next(); return; }
  const p = plugin();
  let done = false;
  const go = () => { if (done) return; done = true; next(); };
  const onDismiss = () => { go(); prepareInterstitial(); };
  const dismissed = p.addListener('interstitialAdDismissed', onDismiss);
  const failed = p.addListener('interstitialAdFailedToShow', go);
  A.interReady = false; A.rounds = 0; A.lastInter = Date.now();
  p.showInterstitial().catch((e) => { log('show interstitial', e && e.message); go(); });
  // Safety net: never leave the player stuck on the result screen.
  setTimeout(() => {
    go();
    Promise.resolve(dismissed).then((h) => h && h.remove && h.remove()).catch(() => {});
    Promise.resolve(failed).then((h) => h && h.remove && h.remove()).catch(() => {});
  }, 60 * 1000);
}

/** Rewarded video (ready for a later feature, e.g. one hammer per ad). Resolves true if rewarded. */
export async function showRewarded() {
  const p = plugin();
  if (!p || !A.ready) return false;
  try {
    if (!A.rewardReady) await p.prepareRewardVideoAd({ adId: ids().rewarded, isTesting: TESTING, npa: true });
    A.rewardReady = false;
    const r = await p.showRewardVideoAd();
    return !!(r && r.amount > 0);
  } catch (e) { log('rewarded', e && e.message); return false; }
}

/** Follow the game's mute switch so an ad never blasts sound when muted. */
export function setMuted(muted) {
  const p = plugin();
  if (!p || !A.ready) return;
  p.setApplicationMuted({ muted: !!muted }).catch(() => {});
}
