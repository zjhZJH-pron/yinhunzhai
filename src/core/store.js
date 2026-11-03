/* 存档读写的一层薄壳。
   APK 里页面走 file://，WebView 在该源下不保证 localStorage 可写，
   原生壳注入的 AndroidStore 桥会落到 SharedPreferences；浏览器与
   Electron 没有这个桥，继续用 localStorage。 */
const B = typeof window !== 'undefined' ? window.AndroidStore : null;

export function getItem(k){
  if(B) return B.get(k);
  try { return localStorage.getItem(k); } catch(e) { return null; }
}

export function setItem(k,v){
  if(B) return B.put(k,v);
  try { localStorage.setItem(k,v); return true; } catch(e) { return false; }
}
