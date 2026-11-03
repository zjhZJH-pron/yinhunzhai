/* 引魂宅 · 红妆劫 — service worker
 * 目标：手机「添加到主屏幕」后可离线游玩。
 * 策略：stale-while-revalidate —— 先用缓存秒开，同时后台拉新版，下次进入即更新。
 * 改代码后务必递增 VERSION，否则老缓存会赖着不走。
 */
const VERSION='yinhunzhai-v1.0.0';
const SHELL=[
  './','./index.html','./styles.css','./game.html','./manifest.webmanifest',
  './vendor/three.module.js',
  './src/main.js','./src/core/util.js','./src/core/input.js','./src/core/audio.js',
  './src/core/postfx.js','./src/core/platform.js','./src/core/touch.js',
  './src/world/textures.js','./src/world/parts.js','./src/world/manor.js',
  './src/game/state.js','./src/game/interact.js','./src/game/story.js','./src/game/npc.js',
  './src/ui/hud.js','./src/ui/panels.js',
  './desktop/icon.png'
];

self.addEventListener('install',e=>{
  e.waitUntil(caches.open(VERSION).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',e=>{
  e.waitUntil(
    caches.keys().then(keys=>Promise.all(
      keys.filter(k=>k!==VERSION).map(k=>caches.delete(k))
    )).then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch',e=>{
  const req=e.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  if(url.origin!==location.origin)return;                 // 不碰外部域名

  e.respondWith((async()=>{
    const cache=await caches.open(VERSION);
    const hit=await cache.match(req,{ignoreSearch:true});
    const refresh=fetch(req).then(res=>{
      if(res&&res.ok)cache.put(req,res.clone());
      return res;
    }).catch(()=>null);
    return hit||refresh||Response.error();
  })());
});
