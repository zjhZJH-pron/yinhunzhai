引魂宅 · 红妆劫 —— Linux 版 (x86_64)
======================================

【怎么开始】
  1. 解压到任意目录，例如 ~/yinhunzhai
  2. cd 进去，执行：
        ./start.sh
     start.sh 已经带 --no-sandbox，普通用户开箱即用。

【想装成桌面应用（可选）】
     sudo mkdir -p /opt/yinhunzhai
     sudo cp -r ./* /opt/yinhunzhai/
     sudo chmod +x /opt/yinhunzhai/start.sh /opt/yinhunzhai/electron
     sudo cp /opt/yinhunzhai/yinhunzhai.desktop ~/.local/share/applications/
     然后应用菜单里就能搜到「引魂宅」。

【关于沙箱】
  Electron 的 chrome-sandbox 需要 setuid root。免安装解压场景下没有 root，
  所以默认 --no-sandbox。想开沙箱，让管理员执行：
     sudo chown root:root /opt/yinhunzhai/chrome-sandbox
     sudo chmod 4755 /opt/yinhunzhai/chrome-sandbox
  然后把 start.sh 里的 --no-sandbox 去掉。

【缺库】
  Electron 32 依赖一堆 X/图形库，最小集（Debian/Ubuntu）：
     sudo apt install libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 \
          libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 \
          libxrandr2 libgbm1 libasound2 libpango-1.0-0 libcairo2
  Arch: sudo pacman -S gtk3 nss libnotify ; Fedora: sudo dnf install nss atk at-spi2-core cups-libs libdrm

【存档位置】
  ~/.config/yinhunzhai/Local Storage/leveldb
  菜单「游戏 → 打开存档所在文件夹」可直达。

【常用键】
  WASD 行走  Shift 疾走  E 交互  Ctrl 屏息  H 燃香  F 火折子
  Tab/J 背包与引魂簿  G 问柳三娘  F11 全屏

【内容提示】
  含惊吓、幽闭与民俗恐怖元素。所有女性角色均为成年人设，
  魅惑止于氛围与暗示，不含露骨内容。
