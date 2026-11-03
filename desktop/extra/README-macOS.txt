引魂宅 · 红妆劫 —— macOS 版
==============================

两个包，按你的机器选一个：
  YinHunZhai-mac-arm64.zip    Apple 芯片（M1 / M2 / M3 / M4）
  YinHunZhai-mac-x64.zip      Intel 芯片
  不确定就点左上角苹果 → 关于本机，看「芯片」那一行。

【怎么开始】
  1. 解压（会得到 Electron.app、start-game.command 等，放在同一个文件夹里）
  2. 双击 start-game.command
     或直接把 Electron.app 拖进「应用程序」再从 Launchpad 打开

【第一次一定会被 Gatekeeper 拦】
  这不是坏了 —— 这个包没有花 99 美元/年 找 Apple 做公证（notarize）。
  任选一种放行：
    A. 访达里右键 Electron.app → 打开 → 再点「打开」
    B. 终端执行一次（把路径换成你的）：
         xattr -dr com.apple.quarantine "/你的解压目录/Electron.app"
    C. 系统设置 → 隐私与安全性 → 拉到底，点「仍要打开」

【想让它看起来像个正经 App】
  解压目录里执行：
      mv Electron.app 引魂宅.app
  图标和应用名会短暂显示为 Electron，因为 Info.plist 里的
  CFBundleName / CFBundleIconFile 是 Apple 格式，改它需要 icns
  与重签名，在 Windows 上打包做不了。程序内标题栏与菜单栏
  已经显示「引魂宅 · 红妆劫」。

【存档位置】
  ~/Library/Application Support/yinhunzhai/Local Storage/leveldb
  菜单「游戏 → 打开存档所在文件夹」可直达。

【常用键】
  WASD 行走  Shift 疾走  E 交互  Ctrl 屏息  H 燃香  F 火折子
  Tab/J 背包与引魂簿  G 问柳三娘  F11 全屏
  若 F11 被系统截屏占用，用菜单栏「视图 → 切换全屏」。

【内容提示】
  含惊吓、幽闭与民俗恐怖元素。所有女性角色均为成年人设，
  魅惑止于氛围与暗示，不含露骨内容。
