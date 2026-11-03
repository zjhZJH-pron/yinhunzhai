package com.yinhunzhai.app;

import android.content.Context;
import android.content.SharedPreferences;
import android.webkit.JavascriptInterface;

/* file:// 源下 WebView 不保证 localStorage 可写，存档改走这里落盘。
   JS 侧只认 window.AndroidStore，见 src/core/store.js。 */
public class Store {

    private final SharedPreferences p;

    public Store(Context c) {
        p = c.getSharedPreferences("yinhunzhai", Context.MODE_PRIVATE);
    }

    @JavascriptInterface
    public String get(String k) {
        return p.getString(k, null);
    }

    @JavascriptInterface
    public boolean put(String k, String v) {
        return p.edit().putString(k, v).commit();
    }
}
