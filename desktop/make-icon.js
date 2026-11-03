#!/usr/bin/env node
/* 生成 icon.png（256×256 红灯笼）——只用 Node 内置 zlib，无图像库依赖。
 * 用法： node desktop/make-icon.js
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const W = 256, H = 256;
const px = Buffer.alloc(W * H * 4);

const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const set = (x, y, r, g, b, a = 255) => {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 4;
  // 与已有像素做 alpha 合成
  const sa = a / 255, da = 1 - sa;
  px[i]     = clamp(r * sa + px[i] * da, 0, 255);
  px[i + 1] = clamp(g * sa + px[i + 1] * da, 0, 255);
  px[i + 2] = clamp(b * sa + px[i + 2] * da, 0, 255);
  px[i + 3] = clamp(a + px[i + 3] * da, 0, 255);
};

/* 背景：近黑 + 一团暖光 */
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const dx = (x - 128) / 128, dy = (y - 118) / 128;
  const d = Math.sqrt(dx * dx + dy * dy);
  const glow = Math.max(0, 1 - d) ** 2.2;
  set(x, y, 12 + glow * 46, 9 + glow * 16, 8 + glow * 10);
}

/* 灯笼本体：竖椭圆 + 左侧高光 + 上下收口 */
const cx = 128, cy = 122, rx = 66, ry = 78;
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const nx = (x - cx) / rx, ny = (y - cy) / ry;
  const q = nx * nx + ny * ny;
  if (q > 1) continue;
  // 收腰：上下端略窄
  const pinch = 1 - Math.pow(Math.abs(ny), 3.2) * 0.34;
  if (Math.abs(nx) > pinch) continue;

  const hl = Math.max(0, 1 - Math.hypot((x - 104) / 34, (y - 96) / 40));   // 高光
  const rim = Math.pow(q, 1.6);                                            // 边缘压暗
  let r = 150 + hl * 105 - rim * 92;
  let g = 24 + hl * 46 - rim * 16;
  let b = 18 + hl * 30 - rim * 12;
  // 竖向骨架棱线
  const rib = Math.abs(Math.asin(clamp(nx / pinch, -1, 1)) * 7 % 2 - 1);
  const shade = 1 - rib * 0.16;
  r *= shade; g *= shade; b *= shade;
  set(x, y, clamp(r, 0, 255), clamp(g, 0, 255), clamp(b, 0, 255));
}

/* 灯罩金圈（上下） */
for (const yy of [cy - ry + 6, cy + ry - 8]) {
  for (let y = yy - 7; y <= yy + 7; y++) for (let x = cx - 40; x <= cx + 40; x++) {
    const t = 1 - Math.abs(y - yy) / 7;
    const ex = 1 - Math.pow(Math.abs(x - cx) / 40, 2);
    if (t <= 0 || ex <= 0) continue;
    set(x, y, clamp(206 * t * ex + 40, 0, 255), clamp(166 * t * ex + 30, 0, 255), clamp(74 * t * ex + 20, 0, 255));
  }
}

/* 顶部挂钩 */
for (let y = 8; y < cy - ry + 8; y++) { set(128, y, 58, 42, 24); set(129, y, 58, 42, 24); }

/* 底部流苏 */
for (let y = cy + ry - 2; y < 246; y++) {
  const t = (y - (cy + ry)) / (246 - (cy + ry));
  for (let x = 112; x <= 144; x++) {
    const sway = Math.sin(t * 3.1 + (x - 128) * 0.4) * 4 * t;
    if (Math.abs(x - 128 - sway) > 15 * (1 - t * 0.5)) continue;
    set(x, y, clamp(196 - t * 70, 0, 255), clamp(150 - t * 60, 0, 255), clamp(48 - t * 24, 0, 255));
  }
}

/* ---------- PNG 编码 ---------- */
function crc32(buf) {
  let c, table = [];
  for (let n = 0; n < 256; n++) { c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; table[n] = c >>> 0; }
  let crc = 0xffffffff;
  for (const b of buf) crc = table[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const t = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
}
const raw = Buffer.alloc(H * (W * 4 + 1));
for (let y = 0; y < H; y++) {
  raw[y * (W * 4 + 1)] = 0;                                  // filter: none
  px.copy(raw, y * (W * 4 + 1) + 1, y * W * 4, (y + 1) * W * 4);
}
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8; ihdr[9] = 6;                                    // 8bit RGBA
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
]);

const out = path.join(__dirname, 'icon.png');
fs.writeFileSync(out, png);
console.log('✓ icon.png', (png.length / 1024).toFixed(1) + ' KB', '→', out);
