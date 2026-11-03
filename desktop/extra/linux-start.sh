#!/usr/bin/env bash
# 引魂宅 · 红妆劫 —— Linux 启动脚本
set -e
cd "$(dirname "$0")"

chmod +x electron chrome_crashpad_handler 2>/dev/null || true

# chrome-sandbox 需要 setuid root 才能以沙箱模式运行。
# 解压即用的场景下没有 root，因此默认加 --no-sandbox。
# 想要沙箱，请由管理员执行：  sudo chown root:root chrome-sandbox && sudo chmod 4755 chrome-sandbox
# 然后去掉下面的 --no-sandbox。
exec ./electron --no-sandbox --enable-features=WaylandWindowDecorations "$@"
