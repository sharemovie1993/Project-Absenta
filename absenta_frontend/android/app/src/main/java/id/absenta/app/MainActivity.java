package id.absenta.app;

import android.os.Bundle;
import android.view.View;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if (this.bridge != null && this.bridge.getWebView() != null) {
            final WebView webView = this.bridge.getWebView();
            WebSettings settings = webView.getSettings();
            settings.setMediaPlaybackRequiresUserGesture(false);
            settings.setJavaScriptCanOpenWindowsAutomatically(true);

            // Terapkan Safe-Area Insets untuk HP berponi (Display Cutout / Status Bar) & Navigasi Bawah Android
            View rootView = getWindow().getDecorView().findViewById(android.R.id.content);
            if (rootView != null) {
                ViewCompat.setOnApplyWindowInsetsListener(rootView, (v, windowInsets) -> {
                    Insets insets = windowInsets.getInsets(
                        WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout()
                    );
                    float density = v.getResources().getDisplayMetrics().density;
                    int topDp = Math.max(28, Math.round(insets.top / (density > 0 ? density : 1f)));
                    int bottomDp = Math.max(20, Math.round(insets.bottom / (density > 0 ? density : 1f)));

                    // Sinkronkan ukuran poni kamera (top) & bilah navigasi sistem (bottom) ke CSS variable di WebView
                    webView.post(() -> {
                        String js = "try{document.documentElement.classList.add('is-native-apk');"
                                  + "document.documentElement.style.setProperty('--native-safe-top','" + topDp + "px');"
                                  + "document.documentElement.style.setProperty('--native-safe-bottom','" + bottomDp + "px');}catch(e){}";
                        webView.evaluateJavascript(js, null);
                    });
                    return windowInsets;
                });
            }
        }
    }
}
