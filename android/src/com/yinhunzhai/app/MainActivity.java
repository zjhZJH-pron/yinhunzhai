package com.yinhunzhai.app;

import android.app.Activity;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

/* 全屏 WebView 壳：游戏整体是 assets/game/index.html 这一个自包含文件，
   不联网、不申请任何权限。页面走 file://，存档改由 Store 桥落盘。 */
public class MainActivity extends Activity {

    private static final String URL = "file:///android_asset/game/index.html";

    private WebView web;
    private long lastBack = 0L;

    @Override
    protected void onCreate(Bundle saved) {
        super.onCreate(saved);
        web = new WebView(this);
        setContentView(web);
        web.setBackgroundColor(Color.rgb(10, 8, 7));

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(true);
        // 页面的 <meta viewport> 只有开了 wide viewport 才生效，
        // 否则按 980px 虚拟宽度渲染，触屏坐标会整体错位。
        s.setUseWideViewPort(true);
        s.setLoadWithOverviewMode(true);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setDisplayZoomControls(false);
        s.setTextZoom(100);
        s.setMediaPlaybackRequiresUserGesture(false);
        if (Build.VERSION.SDK_INT >= 29) s.setForceDark(WebSettings.FORCE_DARK_OFF);

        web.addJavascriptInterface(new Store(this), "AndroidStore");
        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
                return true;                       // 本地包不放行任何跳转
            }
            @Override
            public void onReceivedError(WebView v, WebResourceRequest req,
                                        android.webkit.WebResourceError err) {
                if (req.isForMainFrame())
                    Toast.makeText(MainActivity.this,
                            "资源载入失败：" + err.getDescription(), Toast.LENGTH_LONG).show();
            }
        });

        web.loadUrl(URL);
        getWindow().addFlags(
                android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        immersive();
    }

    private void immersive() {
        if (Build.VERSION.SDK_INT >= 30) {
            WindowInsetsController c = getWindow().getInsetsController();
            if (c != null) {
                c.hide(WindowInsets.Type.systemBars());
                c.setSystemBarsBehavior(
                        WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
            }
        } else {
            getWindow().getDecorView().setSystemUiVisibility(
                    View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                    | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                    | View.SYSTEM_UI_FLAG_FULLSCREEN
                    | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                    | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                    | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN);
        }
    }

    @Override
    public void onWindowFocusChanged(boolean has) {
        super.onWindowFocusChanged(has);
        if (has) immersive();
    }

    /* 恐怖游戏最怕误触返回键丢掉进度：连按两次才退。 */
    @Override
    public void onBackPressed() {
        long now = System.currentTimeMillis();
        if (now - lastBack < 2000L) { super.onBackPressed(); return; }
        lastBack = now;
        Toast.makeText(this, "再按一次退出（进度已自动存档）", Toast.LENGTH_SHORT).show();
    }

    @Override
    protected void onPause() {
        super.onPause();
        web.onPause();                             // 退到后台要停渲染与音频
    }

    @Override
    protected void onResume() {
        super.onResume();
        web.onResume();
        immersive();
    }

    @Override
    protected void onDestroy() {
        web.destroy();
        super.onDestroy();
    }
}
