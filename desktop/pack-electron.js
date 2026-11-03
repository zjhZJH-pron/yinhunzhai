#!/usr/bin/env node
/* =============================================================
 * pack-electron.js — 把 app 载荷注入 Electron 官方预编译包
 *
 * 为什么不用 unzip→rezip：
 *   darwin 的 zip 里有 14 个符号链接（Electron Framework.framework 的
 *   Versions/Current 等）和 15 个执行位；linux 有 8 个执行位（含
 *   chrome-sandbox）。Windows 上的解压/再压缩会丢掉这些元数据，
 *   得到的 .app 在 mac 上直接起不来。
 *   所以 mac/linux 采用「只追加」：原 zip 的字节与中央目录项原样保留，
 *   只在末尾追加我们的文件并重写中央目录 —— 符号链接和权限位不受影响。
 *
 *   Windows 的包没有这两类元数据，走正常解压→改名→再压缩。
 *
 * 用法：
 *   node desktop/pack-electron.js <in.zip> <out.zip> <appDir>
 *     appDir 里的内容会被放到 zip 内的 resources/app/ 下
 *   可选环境变量 EXTRA = 'name::mode::filePath' 用 ; 分隔，追加单文件
 *     （用于塞 start.sh / .desktop / README）
 * ============================================================= */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

/* ---------- CRC32 ---------- */
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c | 0;
  }
  return t;
})();
function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

/* ---------- 读原 zip 的中央目录 ---------- */
function findEOCD(buf) {
  const min = Math.max(0, buf.length - 66000);
  for (let i = buf.length - 22; i >= min; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) return i;
  }
  throw new Error('不是有效的 zip（找不到 EOCD）');
}
function readCentral(buf) {
  const eocd = findEOCD(buf);
  const total = buf.readUInt16LE(eocd + 10);
  const cdOff = buf.readUInt32LE(eocd + 16);
  const cdSize = buf.readUInt32LE(eocd + 12);
  const entries = [];
  let p = cdOff;
  for (let i = 0; i < total; i++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error('中央目录项 ' + i + ' 签名不对');
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const cmtLen = buf.readUInt16LE(p + 32);
    const lhOff = buf.readUInt32LE(p + 42);
    // 从本地头取真实数据起点与压缩方式
    if (buf.readUInt32LE(lhOff) !== 0x04034b50) throw new Error('本地头签名不对');
    const lName = buf.readUInt16LE(lhOff + 26), lExtra = buf.readUInt16LE(lhOff + 28);
    const method = buf.readUInt16LE(lhOff + 8);
    const csize = buf.readUInt32LE(lhOff + 18);
    const dataStart = lhOff + 30 + lName + lExtra;
    entries.push({
      raw: buf.slice(p, p + 46 + nameLen + extraLen + cmtLen),
      name: buf.toString('utf8', p + 46, p + 46 + nameLen),
      dataRange: [dataStart, dataStart + csize],
      method,
    });
    p += 46 + nameLen + extraLen + cmtLen;
  }
  return { eocd, cdOff, cdSize, entries };
}

/* ---------- 造新条目 ---------- */
function dosTime(d) {
  return ((d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1)) & 0xffff;
}
function dosDate(d) {
  return (((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()) & 0xffff;
}
const NOW = new Date();

/** 生成 [localHeader+data, centralHeader] */
function makeEntry(name, content, { dir = false, mode = 0o100644 } = {}) {
  const nameBuf = Buffer.from(name, 'utf8');
  const crc = dir ? 0 : crc32(content);
  const comp = dir ? Buffer.alloc(0) : zlib.deflateRawSync(content, { level: 9 });
  const useStore = dir || comp.length >= content.length;
  const data = useStore ? (dir ? Buffer.alloc(0) : content) : comp;
  const method = useStore ? 0 : 8;

  const lh = Buffer.alloc(30);
  lh.writeUInt32LE(0x04034b50, 0);
  lh.writeUInt16LE(20, 4);
  lh.writeUInt16LE(0x0800, 6);              // bit11 = UTF-8 文件名
  lh.writeUInt16LE(method, 8);
  lh.writeUInt16LE(dosTime(NOW), 10);
  lh.writeUInt16LE(dosDate(NOW), 12);
  lh.writeUInt32LE(crc, 14);
  lh.writeUInt32LE(data.length, 18);
  lh.writeUInt32LE(dir ? 0 : content.length, 22);
  lh.writeUInt16LE(nameBuf.length, 26);
  lh.writeUInt16LE(0, 28);
  const local = Buffer.concat([lh, nameBuf, data]);

  const ch = Buffer.alloc(46);
  ch.writeUInt32LE(0x02014b50, 0);
  ch.writeUInt8(3, 4);                       // 由 unix 造 —— 外部属性里的 mode 才生效
  ch.writeUInt8(0, 5);
  ch.writeUInt16LE(20, 6);
  ch.writeUInt16LE(0x0800, 8);
  ch.writeUInt16LE(method, 10);
  ch.writeUInt16LE(dosTime(NOW), 12);
  ch.writeUInt16LE(dosDate(NOW), 14);
  ch.writeUInt32LE(crc, 16);
  ch.writeUInt32LE(data.length, 20);
  ch.writeUInt32LE(dir ? 0 : content.length, 24);
  ch.writeUInt16LE(nameBuf.length, 28);
  ch.writeUInt16LE(0, 30);
  ch.writeUInt16LE(0, 32);
  ch.writeUInt32LE(0, 34);
  ch.writeUInt32LE((mode << 16) >>> 0, 38);  // unix 权限
  const central = Buffer.concat([ch, nameBuf]);
  return { local, central, size: local.length, dir };
}

/** 只追加：原字节原样保留，新数据接在最后，中央目录重写 */
function appendEntries(zipBuf, newEntries) {
  const { eocd, cdOff, entries } = readCentral(zipBuf);
  const head = zipBuf.slice(0, cdOff);                 // 全部本地数据（含尾部数据描述符若有）
  const base = cdOff;
  let appended = Buffer.alloc(0);
  const addedCentrals = [];

  for (const e of newEntries) {
    e.lhOff = base + appended.length;
    appended = Buffer.concat([appended, e.local]);
    const ch = e.central.slice(0, 46);          // 固定头就是 46 字节
    ch.writeUInt32LE(e.lhOff, 42);              // 相对本地头偏移
    addedCentrals.push(Buffer.concat([ch, e.central.slice(46)]));
  }

  const oldCentrals = entries.map(en => Buffer.from(en.raw));  // 原偏移不变，原样写回
  const cd = Buffer.concat([...oldCentrals, ...addedCentrals]);

  const eo = Buffer.alloc(22);
  eo.writeUInt32LE(0x06054b50, 0);
  eo.writeUInt16LE(0, 4); eo.writeUInt16LE(0, 6);
  const total = entries.length + addedCentrals.length;
  eo.writeUInt16LE(total, 8); eo.writeUInt16LE(total, 10);
  eo.writeUInt32LE(cd.length, 12);
  eo.writeUInt32LE(base + appended.length, 16);        // 新中央目录位置
  eo.writeUInt16LE(0, 20);

  return Buffer.concat([head, appended, cd, eo]);
}

/* ---------- 收集 app 目录 ---------- */
function collect(dir, prefix) {
  const out = [];
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    const name = prefix + '/' + f;
    const st = fs.statSync(full);
    if (st.isDirectory()) {
      out.push(makeEntry(name + '/', null, { dir: true, mode: 0o040755 }));
      out.push(...collect(full, name));
    } else {
      out.push(makeEntry(name, fs.readFileSync(full)));
    }
  }
  return out;
}

function main() {
  const [inZip, outZip, appDir] = process.argv.slice(2);
  if (!inZip || !outZip || !appDir) {
    console.error('用法: node pack-electron.js <in.zip> <out.zip> <appDir> [EXTRA=...]');
    process.exit(1);
  }
  const buf = fs.readFileSync(inZip);
  const before = readCentral(buf).entries.length;

  const entries = collect(appDir, 'resources/app');
  // 显式目录项：多数解压器能隐式建父目录，但个别严格实现会失败，成本极低就补上
  entries.unshift(makeEntry('resources/app/', null, { dir: true, mode: 0o040755 }));
  entries.unshift(makeEntry('resources/', null, { dir: true, mode: 0o040755 }));

  // EXTRA='显示名::八进制mode::绝对路径' 用 ; 分隔
  if (process.env.EXTRA) {
    for (const spec of process.env.EXTRA.split(';').filter(Boolean)) {
      const [name, mode, file] = spec.split('::');
      if (!name || !file) continue;
      entries.push(makeEntry(name, fs.readFileSync(file),
        { mode: parseInt(mode || '644', 8) | 0o100000 }));
    }
  }

  const out = appendEntries(buf, entries);
  fs.writeFileSync(outZip, out);

  const after = readCentral(out).entries.length;
  console.log(`✓ ${path.basename(outZip)}`);
  console.log(`  条目 ${before} → ${after}（新增 ${after - before}）`);
  console.log(`  ${(out.length / 1048576).toFixed(1)} MB · 原有字节未改动，符号链接与权限位保留`);
}

main();
