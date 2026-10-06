package app.kidoo.kids;

import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(KidooLocationPlugin.class);
        super.onCreate(savedInstanceState);
        WebView webView = bridge != null ? bridge.getWebView() : null;
        if (webView == null) return;
        webView.getSettings().setCacheMode(WebSettings.LOAD_NO_CACHE);
        webView.clearCache(true);
        webView.reload();
    }
}
