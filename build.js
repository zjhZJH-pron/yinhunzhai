#!/usr/bin/env node
/* =============================================================
 * 引魂宅 · 红妆劫 — 单文件打包器
 *
 * 作用：把 src/ 下的 ES 模块压成一个不依赖服务器、可直接双击打开
 *       的 game.html（也供 Electron 桌面壳加载）。
 *
 * 为什么需要它：浏览器里 <script type="module"> 在 file:// 下会被
 * CORS 拦死，双击 index.html 打不开。打包后走普通脚本，全平台通用。
 *
 * 用法：  node build.js            # 生成 game.html
 *         node build.js --three p  # 指定 three 的 UMD 路径
 * 依赖： 仅 Node 内置模块，无需 npm install。
 * ============================================================= */
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const argv = process.argv.slice(2);
const arg = (name, dflt) => {
  const i = argv.indexOf('--' + name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : dflt;
};

/* 依赖顺序：被依赖者在前。新增模块时按此插入。 */
const ORDER = [
  'src/core/platform.js',      // 无依赖，且 textures 要问它要画质档位
  'src/core/store.js',         // 只依赖 window，main.js 用它读写存档
  'src/core/util.js',
  'src/world/textures.js',
  'src/world/parts.js',
  'src/world/manor.js',
  'src/game/state.js',
  'src/core/audio.js',
  'src/core/postfx.js',
  'src/core/input.js',
  'src/core/touch.js',
  'src/ui/hud.js',
  'src/ui/panels.js',
  'src/game/story.js',
  'src/game/interact.js',
  'src/game/npc.js',
  'src/main.js',
];

const norm = (spec, from) => {
  if (spec === 'three') return 'three';
  return path.normalize(path.join(path.dirname(from), spec)).split(path.sep).join('/');
};

function buildOne(rel) {
  let src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  const names = [];

  // 先收集导出名（必须在剥离 export 关键字之前）
  let re = /^[ \t]*export\s+(?:const|let|var|class|function|async function)\s+(\w+)/gm, m;
  while ((m = re.exec(src))) names.push(m[1]);
  const braced = src.match(/^[ \t]*export\s*\{([^}]*)\}\s*;?[ \t]*$/m);
  if (braced) braced[1].split(',')
    .map(s => s.trim()).filter(Boolean)
    .forEach(s => names.push(s.split(/\s+as\s+/)[0].trim()));

  // import → __req()
  src = src.replace(/^[ \t]*import[ \t][^;\n]*;[ \t]*$/gm, (stmt) => {
    const from = stmt.match(/from\s+['"]([^'"]+)['"]/);
    if (!from) return '';                       // import 'x.css' 之类
    const key = norm(from[1], rel);
    const ns = stmt.match(/import\s+\*\s+as\s+(\w+)/);
    if (ns) return `const ${ns[1]} = __req('${key}');`;
    const braces = stmt.match(/\{([^}]*)\}/);
    if (braces) {
      const list = braces[1].split(',').map(s => s.trim()).filter(Boolean)
        .map(s => { const [a, c] = s.split(/\s+as\s+/).map(x => x && x.trim()); return c ? `${a}: ${c}` : a; });
      return `const { ${list.join(', ')} } = __req('${key}');`;
    }
    const def = stmt.match(/import\s+([A-Za-z_$][\w$]*)\s+from/);
    return def ? `const ${def[1]} = __req('${key}');` : '';
  });

  src = src.replace(/^[ \t]*export\s*\{[^}]*\}\s*;?[ \t]*$/gm, '');
  src = src.replace(/^[ \t]*export\s+/gm, '');

  const tail = names.map(n => `  __x.${n} = ${n};`).join('\n');
  return `__def['${rel}'] = function (__req, __x) {\n${src}\n\n${tail}\n};\n`;
}

function buildRegistry() {
  return ORDER.map(buildOne).join('\n');
}

function main() {
  const threePath = arg('three', 'vendor/three.min.js');
  const outFile = arg('out', 'game.html');
  const threeFull = path.resolve(ROOT, threePath);

  if (!fs.existsSync(threeFull)) {
    console.error(`缺少 three 的 UMD 版本：${threeFull}`);
    console.error('取回方式： npm i three@0.160.1  或从镜像下载 build/three.min.js');
    console.error('  https://cdn.npmmirror.com/binaries/npm/three/0.160.1/three.min.js');
    process.exit(1);
  }

  if (/</.test(fs.readFileSync(threeFull, 'utf8').match(/<\/script/i) ? 'x' : '')) {
    // 防御：内联脚本里出现 </script> 会提前闭合标签
    console.error('three.min.js 内含 </script>，需转义后再内联');
    process.exit(1);
  }

  const threeRaw = fs.readFileSync(threeFull, 'utf8');
  /* three 的 UMD 版形如：  console.warn('…deprecated…'), function(t,e){…}(this,function(t){…})
   * 注意它是「逗号运算符」连成的一条表达式语句 —— 直接删掉前半句会让
   * `function(t,e){…}` 落到函数声明的位置上而报语法错。
   * 所以把 warn 换成 0，保留那个逗号。同时去掉末尾的 sourcemap 注释。 */
  let three = threeRaw;
  if (three.startsWith("console.warn('Scripts ")) {
    const end = three.indexOf("'),");
    if (end < 0) {
      console.error('three.min.js 开头结构与预期不符，请检查版本');
      process.exit(1);
    }
    three = '0' + three.slice(end + 2);
  }
  three = three.replace(/\n?\/\/#\s*sourceMappingURL=[^\n]*\s*$/, '\n');

  // 断言：UMD 挂载点与包装头必须完好
  if (!/\.THREE=\{\}/.test(three) || !/^\s*0\s*,/.test(three)
      || !/function\(t,e\)\{"object"==typeof exports/.test(three)) {
    console.error('three.min.js 处理后结构异常（UMD 头被破坏），中止构建');
    console.error('  开头：' + JSON.stringify(three.slice(0, 80)));
    process.exit(1);
  }
  const css = fs.readFileSync(path.join(ROOT, 'styles.css'), 'utf8');
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const registry = buildRegistry();

  let body = html.match(/<body>([\s\S]*)<\/body>/i)[1];
  body = body
    .replace(/<script type="importmap">[\s\S]*?<\/script>/i, '')
    .replace(/<script type="module"[^>]*>[\s\S]*?<\/script>/i, '')
    .replace(/<noscript>[\s\S]*?<\/noscript>/i, '');

  const loader = `(function(){
var __def = {}, __cache = {};
function __req(id){
  if (id === 'three') return window.THREE;
  if (__cache[id]) return __cache[id].exports;
  if (!__def[id]) throw new Error('缺少模块: ' + id);
  var m = { exports: {} }; __cache[id] = m;
  __def[id](__req, m.exports);
  return m.exports;
}
${registry}
try {
  __req('src/main.js');
} catch (e) {
  document.body.insertAdjacentHTML('afterbegin',
    '<pre style="color:#f66;background:#000;padding:14px;font:12px/1.6 monospace;white-space:pre-wrap">'
    + '启动失败：' + (e && e.message) + '\\n' + (e && e.stack || '') + '</pre>');
  throw e;
}
})();`;

  const out = `<!DOCTYPE html>
<html lang="zh-CN">
<!-- 本文件由 build.js 自动生成，请勿手改；改源码 src/ 后重新构建 -->
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
<meta name="theme-color" content="#0a0807">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="引魂宅">
<title>引魂宅 · 红妆劫 — 中式恐怖 3D 密室逃脱</title>
<style>
${css}
</style>
</head>
<body>${body}
<script>${three}</script>
<script>${loader}</script>
</body></html>`;

  fs.writeFileSync(path.join(ROOT, outFile), out, 'utf8');
  console.log(`✓ ${outFile}  ${(Buffer.byteLength(out) / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  内联模块 ${ORDER.length} 个 · three ← ${threePath}`);
}

main();
