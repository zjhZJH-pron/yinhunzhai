#!/usr/bin/env bash
# =============================================================
# 引魂宅 · 红妆劫 —— Android 包手工构建（不依赖 Gradle / Android Studio）
#
#   javac → d8 → aapt2 compile/link → 塞入 classes.dex → zipalign → apksigner
#
# 需要一套 JDK + Android build-tools + platform，放在 TC 指向的目录里
# （默认 ../_toolchain），脚本自己找绝对路径，不写系统 PATH、不做全局安装。
#
# 用法：  bash build-apk.sh
# 产物：  ../dist/YinHunZhai-mobile-v1.0.0.apk
# =============================================================
set -euo pipefail

HERE=$(cd "$(dirname "$0")" && pwd)
TC=${TC:-$HERE/../_toolchain}
OUT=${OUT:-$HERE/../dist/YinHunZhai-mobile-v1.0.0.apk}

JDK=$(find "$TC" -maxdepth 1 -type d -name 'jdk*' | head -1)
BT=$(find "$TC" -maxdepth 2 -type d -path '*/bt/android-*' | head -1)
PLAT=$(find "$TC" -maxdepth 2 -type d -path '*/plat/android-*' | head -1)
[ -x "$JDK/bin/javac.exe" ] && [ -x "$BT/aapt2.exe" ] && [ -f "$PLAT/android.jar" ] || {
  echo "工具链不完整：JDK=$JDK BT=$BT PLAT=$PLAT"; exit 1; }
JAVA="$JDK/bin/java.exe"
WIN(){ cygpath -w "$1"; }

KS_DIR="$HERE/keystore"
KS="$KS_DIR/yinhunzhai.keystore"
KS_PASS=yinhunzhai-2026
MIN_API=24

echo "· JDK  $JDK"
echo "· BT   $BT"
echo "· PLAT $PLAT"

# 0) 单文件包 → assets（由 build.js 生成，属构建产物，不入版本库）
if [ -z "${GAME:-}" ]; then
  for cand in "$HERE/../game.html" "$HERE/../soul-manor/game.html"; do
    [ -f "$cand" ] && { GAME="$cand"; break; }
  done
fi
[ -f "$GAME" ] || { echo "找不到 game.html：先跑 node build.js，或用 GAME=/路径/游戏包 bash build-apk.sh"; exit 1; }
mkdir -p "$HERE/assets/game"
cp "$GAME" "$HERE/assets/game/index.html"
echo "· ASSET ← $GAME  ($(stat -c%s "$GAME") B)"

AJ=$(WIN "$PLAT/android.jar")
B="$HERE/build"
rm -rf "$B/obj" "$B/dexout" "$B/res.zip" "$B/unsigned.apk" "$B/aligned.apk"
mkdir -p "$B/obj" "$B/dexout"

# 1) Java → class（--release 会用 JDK 自身的 API 签名，必须用 -bootclasspath 锁到 android.jar）
SRCS=()
while IFS= read -r f; do SRCS+=("$(WIN "$f")"); done < <(find "$HERE/src" -name '*.java')
"$JDK/bin/javac.exe" -J-Duser.language=en -encoding UTF-8 -source 8 -target 8 -Xlint:-options -nowarn \
  -bootclasspath "$AJ" -d "$(WIN "$B/obj")" "${SRCS[@]}"

# 2) class → classes.dex
CLASSES=()
while IFS= read -r f; do CLASSES+=("$(WIN "$f")"); done < <(find "$B/obj" -name '*.class')
"$JAVA" -cp "$(WIN "$BT/lib/d8.jar")" com.android.tools.r8.D8 \
  --min-api "$MIN_API" --lib "$AJ" --output "$(WIN "$B/dexout")" "${CLASSES[@]}"

# 3) 资源与 assets 链接成 apk
"$BT/aapt2.exe" compile --dir "$(WIN "$HERE/res")" -o "$(WIN "$B/res.zip")"
"$BT/aapt2.exe" link -o "$(WIN "$B/unsigned.apk")" -I "$AJ" \
  --manifest "$(WIN "$HERE/AndroidManifest.xml")" \
  --auto-add-overlay -A "$(WIN "$HERE/assets")" \
  --version-code 1 --version-name 1.0.0 \
  --min-sdk-version "$MIN_API" --target-sdk-version 34 \
  "$(WIN "$B/res.zip")"

# 4) 把 dex 塞进 apk 根目录（aapt 用文件名作条目名，所以要 cd 过去执行）
( cd "$B/dexout" && "$BT/aapt.exe" add "$(WIN "$B/unsigned.apk")" classes.dex )

# 4.5) 修条目名分隔符。aapt2 在 Windows 上把 assets 子目录写成反斜杠
#      （assets\game\index.html），Android 的 asset 树会把它当成一个整文件名，
#      file:///android_asset/game/index.html 于是 404 —— 装得上、打开黑屏。
#      反斜杠与斜杠同宽，逐字节改名不移动任何偏移；但签名覆盖条目名，
#      所以必须在 zipalign 与 apksigner 之前做。
perl -e 'local $/; open(F,"<",$ARGV[0]) or die "open: $!"; binmode F; my $d=<F>; close F;
  my $n = ($d =~ s{assets/game\x5Cindex\.html}{assets/game/index.html}g);
  die "反斜杠条目名替换数=$n，预期 2（local header + central directory）\n" unless $n == 2;
  open(O,">",$ARGV[0]) or die "write: $!"; binmode O; print O $d; close O;' \
  "$(WIN "$B/unsigned.apk")"
echo "· 条目名分隔符已修正"

# 5) 对齐（-p 让 .arsc 页对齐，Android 8+ 要求）
"$BT/zipalign.exe" -f -p 4 "$(WIN "$B/unsigned.apk")" "$(WIN "$B/aligned.apk")"

# 6) 签名。keystore 只留在本地，丢了就无法给同一批用户原地升级。
if [ ! -f "$KS" ]; then
  mkdir -p "$KS_DIR"
  "$JDK/bin/keytool.exe" -genkeypair -v -keystore "$(WIN "$KS")" -alias yinhunzhai \
    -keyalg RSA -keysize 2048 -validity 10950 \
    -storepass "$KS_PASS" -keypass "$KS_PASS" \
    -dname "CN=YinHunZhai, OU=App, O=YinHunZhai, L=Unknown, ST=Unknown, C=CN"
fi
mkdir -p "$(dirname "$OUT")"
rm -f "$OUT"
"$JAVA" -cp "$(WIN "$BT/lib/apksigner.jar")" com.android.apksigner.ApkSignerTool sign \
  --ks "$(WIN "$KS")" --ks-key-alias yinhunzhai --ks-pass "pass:$KS_PASS" --key-pass "pass:$KS_PASS" \
  --v1-signing-enabled true --v2-signing-enabled true --v3-signing-enabled true \
  --out "$(WIN "$OUT")" "$(WIN "$B/aligned.apk")"

echo
echo "✓ $OUT  $(stat -c%s "$OUT") bytes"

# 7) 自检：条目名分隔符 / asset 逐字节一致 / 签名方案 / 权限面
if unzip -l "$OUT" | grep -q '\\'; then echo "✗ 包内仍有反斜杠条目名"; exit 1; fi
unzip -p "$OUT" assets/game/index.html | cmp - "$HERE/assets/game/index.html" \
  && echo "✓ asset 与源码构建产物逐字节一致"
unzip -l "$OUT" | awk 'NF==4 && $4 != "" {print "  · "$4" ("$1" B)"}'
"$JAVA" -cp "$(WIN "$BT/lib/apksigner.jar")" com.android.apksigner.ApkSignerTool verify \
  --verbose "$(WIN "$OUT")" | grep -E "Verifies|Verified using"
PERMS=$("$BT/aapt2.exe" dump badging "$(WIN "$OUT")" | grep -c "^uses-permission" || true)
echo "· 申请的权限数：$PERMS（预期 0）"
"$BT/aapt2.exe" dump badging "$(WIN "$OUT")" | grep -E "^(package|application-label|sdkVersion|targetSdkVersion|launchable-activity)"
