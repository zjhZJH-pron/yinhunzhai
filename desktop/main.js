/* 引魂宅 · 红妆劫 — Electron 主进程
 * 跨平台外壳：Windows / macOS / Linux 共用
 */
const { app, BrowserWindow, Menu, shell, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

const APP_TITLE = '引魂宅 · 红妆劫';
const isMac = process.platform === 'darwin';
// 自检模式：真正加载一次游戏并把结果写盘，用于验证打包产物（不是验证源码）
//   YinHunZhai.exe --smoke-test
const SMOKE = process.argv.includes('--smoke-test');

// 单实例：第二次启动时聚焦已有窗口
if (!app.requestSingleInstanceLock()) {
  app.quit();
}

let win = null;

function createWindow() {
  win = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 900,
    minHeight: 620,
    title: APP_TITLE,
    backgroundColor: '#000000',
    show: false,
    autoHideMenuBar: true,          // 恐怖氛围：默认不显示菜单栏，按 Alt 唤出
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
      // 游戏需要指针锁定与 WebGL
      experimentalFeatures: false,
    },
  });

  win.loadFile(path.join(__dirname, 'game.html'));
  win.once('ready-to-show', () => { if (!SMOKE) win.show(); });

  if (SMOKE) {
    win.webContents.once('did-finish-load', async () => {
      const outFile = path.join(app.getPath('temp'), 'yinhunzhai-smoke.json');
      let result;
      try {
        result = await win.webContents.executeJavaScript(`(function(){
          return new Promise(function(res){
            var btn = document.getElementById('btnStart');
            if (btn) btn.click();                       // 真的推门而入，走完整启动路径
            var t = setInterval(function(){
              var a = window.__app;
              if (a && a.running && a.interactives && a.interactives.length) {
                clearInterval(t);
                a.player.pos.set(0, 0, 13.2);           // 挪进喜堂中央，确认可移动
                res({ ok: true, three: window.THREE.REVISION,
                      interactables: a.interactives.length,
                      colliders: a.colliders.length,
                      room: a.room().name,
                      chapter: a.state.chapter });
              }
            }, 150);
            setTimeout(function(){
              clearInterval(t);
              var a = window.__app;
              res({ ok: false, hasApp: !!a, running: !!(a && a.running),
                    three: window.THREE ? window.THREE.REVISION : null,
                    err: (window.__bootErr || null) });
            }, 25000);
          });
        })()`);
      } catch (e) {
        result = { ok: false, error: String(e && e.message || e) };
      }
      try { fs.writeFileSync(outFile, JSON.stringify(result, null, 2)); } catch (e) { /* ignore */ }
      app.exit(result.ok ? 0 : 1);
    });
  }

  // 拦截外链：游戏内不应跳转浏览器
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

  win.on('closed', () => { win = null; });

  // F11 / Alt+Enter 切全屏
  win.webContents.on('before-input-event', (e, input) => {
    if (input.type !== 'keyDown') return;
    if (input.key === 'F11' || (input.alt && input.key === 'Enter')) {
      win.setFullScreen(!win.isFullScreen());
      e.preventDefault();
    }
  });

  win.setTitle(APP_TITLE);
  buildMenu();
}

function buildMenu() {
  const template = [
    {
      label: '游戏',
      submenu: [
        {
          label: '重新开始（清除存档）',
          click: async () => {
            const r = await dialog.showMessageBox(win, {
              type: 'warning',
              buttons: ['清除', '取消'],
              defaultId: 1,
              cancelId: 1,
              title: '清除存档',
              message: '确定要烧掉引魂簿？',
              detail: '存档会回到「门外」，已解开的机关与线索一并抹去。此操作不可撤销。',
            });
            if (r.response === 0) {
              await win.webContents.executeJavaScript('try{localStorage.clear()}catch(e){}');
              win.reload();
            }
          },
        },
        { label: '打开存档所在文件夹', click: () => shell.openPath(app.getPath('userData')) },
        { type: 'separator' },
        { role: 'quit', label: '退出' },
      ],
    },
    {
      label: '视图',
      submenu: [
        { label: '全屏 / 窗口', accelerator: 'F11', click: () => win && win.setFullScreen(!win.isFullScreen()) },
        { role: 'togglefullscreen', label: '切换全屏' },
        { type: 'separator' },
        { role: 'resetZoom', label: '实际大小' },
        { role: 'zoomIn', label: '放大' },
        { role: 'zoomOut', label: '缩小' },
        { type: 'separator' },
        { role: 'reload', label: '重进本宅' },
      ],
    },
    {
      label: '帮助',
      submenu: [
        {
          label: '操作释义',
          click: () => dialog.showMessageBox(win, {
            title: '操作释义',
            message: APP_TITLE,
            detail: [
              'WASD 行走 · Shift 疾走（脚步响亮，她听得见）',
              '鼠标 视角 · E 查看 / 拾取 / 动手',
              'Ctrl 屏息 —— 藏身时她走近，屏息可躲过',
              'H 于香炉前燃香，平定阴气，方圆之内她不敢入',
              'F 火折子（照亮，也照得见她）',
              'Tab / J 囊中物与引魂簿 · G 问柳三娘卖关子',
              'F11 全屏 · Alt 唤出菜单栏',
              '',
              '魂灯即你的心智。灯灭，你便不再是自己。',
              '每破一道机关，宅门松一道闩；九闩尽落，以九宫算开最后一道。',
            ].join('\n'),
            buttons: ['知道了'],
          }),
        },
        {
          label: '关于',
          click: () => dialog.showMessageBox(win, {
            title: '关于',
            message: APP_TITLE,
            detail: '中式恐怖 3D 密室逃脱\n\n全程序化生成：建模、贴图、音乐、音效无一使用外部素材。\n以民国冥婚民俗为题，谜题根植于五行方色、生数、昭穆、六礼、洛书九宫。\n\n分级提示：含惊吓、幽闭与民俗恐怖元素。所有女性角色均为成年人设，魅惑止于氛围与暗示，不含露骨内容。',
            buttons: ['好'],
          }),
        },
      ],
    },
  ];

  if (isMac) {
    template.unshift({
      label: APP_TITLE,
      submenu: [
        { role: 'about', label: '关于' },
        { type: 'separator' },
        { role: 'hide', label: '隐藏' },
        { role: 'hideOthers', label: '隐藏其它' },
        { role: 'unhide', label: '全部显示' },
        { type: 'separator' },
        { role: 'quit', label: '退出' },
      ],
    });
  }

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('second-instance', () => {
  if (win) { if (win.isMinimized()) win.restore(); win.focus(); }
});

app.on('window-all-closed', () => { if (!isMac) app.quit(); });

// 关掉无关的 GPU 警告噪声
app.on('child-process-gone', () => {});
