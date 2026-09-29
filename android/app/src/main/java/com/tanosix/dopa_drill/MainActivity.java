package com.tanosix.dopa_drill;

import android.os.Bundle;
import android.webkit.WebView;

import androidx.activity.OnBackPressedCallback;

import com.getcapacitor.BridgeActivity;

/**
 * Contenedor nativo del juego.
 *
 * Lo único que añade es el botón atrás de Android: si hay algo abierto (ajustes,
 * guía, diálogos) o se está en una partida, envía Escape, que el juego ya
 * escucha; solo en el título sin nada encima cierra la app.
 */
public class MainActivity extends BridgeActivity {

    private static final String READ_SCREEN =
        "(function(){try{var D=window.__dopa;return D&&D.backTarget?D.backTarget():''}catch(e){return ''}})()";

    private static final String PRESS_ESCAPE =
        "window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                handleBack();
            }
        });
    }

    private void handleBack() {
        WebView webView = getBridge() != null ? getBridge().getWebView() : null;
        if (webView == null) {
            finish();
            return;
        }
        webView.evaluateJavascript(READ_SCREEN, value -> {
            String screen = value == null ? "" : value.replace("\"", "");
            if (screen.isEmpty() || "title".equals(screen)) {
                finish();
            } else {
                webView.evaluateJavascript(PRESS_ESCAPE, null);
            }
        });
    }
}
