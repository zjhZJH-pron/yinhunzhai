#!/bin/bash
# 引魂宅 · 红妆劫 —— macOS 启动脚本
# 双击本文件即可（若被 Gatekeeper 拦下，见同目录 README-macOS.txt）
cd "$(dirname "$0")" || exit 1

APP="Electron.app"
BIN="$APP/Contents/MacOS/Electron"

if [ ! -x "$BIN" ]; then
  chmod +x "$BIN" 2>/dev/null
  chmod +x "$APP/Contents/Frameworks/Electron Helper"*.app/Contents/MacOS/* 2>/dev/null
fi

# 首次运行若提示"无法验证开发者"，在终端执行一次：
#   xattr -dr com.apple.quarantine "$(dirname "$0")"
open "$APP" 2>/dev/null || exec "$BIN"
