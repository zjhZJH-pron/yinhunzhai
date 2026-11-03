/* 预加载脚本：只向页面暴露最小信息，不开启 nodeIntegration */
const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('yinhunzhai', {
  platform: process.platform,
  electron: process.versions.electron,
  chrome: process.versions.chrome,
  // 供游戏在标题页显示运行环境；游戏本体不依赖此对象
});
