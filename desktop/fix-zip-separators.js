#!/usr/bin/env node
/* =============================================================
 * fix-zip-separators.js
 *
 * .NET Framework 的 ZipFile / PowerShell 的 Compress-Archive 在
 * Windows 上会把路径分隔符写成 '\' —— 而 ZIP 规范（APPNOTE 4.4.17）
 * 规定目录分隔符必须是 '/'。Windows 资源管理器容忍反斜杠，
 * 但 7-Zip / unzip / macOS 归档工具会把它当成文件名的一部分，
 * 于是解出来是一堆形如 "resources\app\game.html" 的单层文件。
 *
 * 本工具只改「名字段」里的字节，不碰任何文件数据，因此安全。
 * 用法： node desktop/fix-zip-separators.js <a.zip>
 * ============================================================= */
const fs = require('fs');
const path = require('path');

function fix(file) {
  const buf = fs.readFileSync(file);

  // 定位 EOCD
  let eocd = -1;
  for (let i = buf.length - 22; i > Math.max(0, buf.length - 66000); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('找不到 EOCD：' + file);

  const total = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  let patched = 0, localSeen = new Set();

  const slashName = (base, nameLen) => {
    for (let k = 0; k < nameLen; k++) {
      if (buf[base + k] === 0x5c) { buf[base + k] = 0x2f; patched++; }
    }
  };

  for (let i = 0; i < total; i++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error('中央目录项签名异常 @' + p);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const cmtLen = buf.readUInt16LE(p + 32);
    const lhOff = buf.readUInt32LE(p + 42);

    // 中央目录里的名字
    slashName(p + 46, nameLen);

    // 对应本地头的名字（同一本地头可能被引用多次，去重）
    if (!localSeen.has(lhOff)) {
      localSeen.add(lhOff);
      if (buf.readUInt32LE(lhOff) === 0x04034b50) {
        slashName(lhOff + 30, buf.readUInt16LE(lhOff + 26));
      }
    }
    p += 46 + nameLen + extraLen + cmtLen;
  }

  fs.writeFileSync(file, buf);
  return { total, patched };
}

const target = process.argv[2];
if (!target) { console.error('用法: node fix-zip-separators.js <a.zip>'); process.exit(1); }
const r = fix(target);
console.log(`✓ ${path.basename(target)}  条目 ${r.total} · 修正分隔符 ${r.patched} 处`);
