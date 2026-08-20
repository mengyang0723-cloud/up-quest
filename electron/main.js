'use strict';
/**
 * Electron 主进程：窗口、菜单、单实例、数据目录、启动时清理。
 */
const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { openDb } = require('./db');
const registerIpc = require('./ipc');

// 保持 ASCII 的 userData 路径（%APPDATA%/up-quest）
app.setName('up-quest');

const DEV_URL = process.env.VITE_DEV_SERVER_URL || '';

// 启动期错误一律落盘（%APPDATA%/up-quest/error.log），避免"无窗口静默失败"
function logError(err) {
  try {
    const line = `[${new Date().toISOString()}] ${(err && err.stack) || String(err)}\n`;
    fs.appendFileSync(path.join(app.getPath('userData'), 'error.log'), line);
  } catch { /* 忽略日志失败 */ }
}
process.on('uncaughtException', (err) => logError(err));
process.on('unhandledRejection', (reason) => logError(reason instanceof Error ? reason : new Error(String(reason))));

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  let win = null;

  function dataDir() {
    return path.join(app.getPath('userData'), 'data');
  }

  function ensureDirs() {
    const d = dataDir();
    fs.mkdirSync(path.join(d, 'evidence'), { recursive: true });
    fs.mkdirSync(path.join(d, 'templates'), { recursive: true });
    fs.mkdirSync(path.join(d, 'evidence', '_inbox'), { recursive: true });
  }

  // 清理超过 24 小时仍未被提交的暂存证据文件
  function cleanInbox() {
    const inbox = path.join(dataDir(), 'evidence', '_inbox');
    try {
      const cutoff = Date.now() - 24 * 3600 * 1000;
      for (const f of fs.readdirSync(inbox)) {
        const p = path.join(inbox, f);
        try {
          if (fs.statSync(p).mtimeMs < cutoff) fs.unlinkSync(p);
        } catch { /* 忽略 */ }
      }
    } catch { /* 忽略 */ }
  }

  function buildMenu() {
    const isMac = process.platform === 'darwin';
    const send = (action) => () => {
      if (win && !win.isDestroyed()) win.webContents.send('menu:action', action);
    };
    const template = [
      ...(isMac ? [{ role: 'appMenu' }] : []),
      {
        label: '数据',
        submenu: [
          { label: '导出备份…', accelerator: 'CmdOrCtrl+Shift+E', click: send('export') },
          { label: '导入备份…', accelerator: 'CmdOrCtrl+Shift+I', click: send('import') },
          { type: 'separator' },
          { label: '打开数据目录', click: send('open-data') },
          { label: '打开证据目录', click: send('open-evidence') },
        ],
      },
      {
        label: '视图',
        submenu: [
          { role: 'reload' },
          { role: 'toggleDevTools' },
          { type: 'separator' },
          { role: 'resetZoom' },
          { role: 'zoomIn' },
          { role: 'zoomOut' },
        ],
      },
    ];
    Menu.setApplicationMenu(Menu.buildFromTemplate(template));
  }

  function createWindow() {
    win = new BrowserWindow({
      width: 1180,
      height: 780,
      minWidth: 980,
      minHeight: 660,
      backgroundColor: '#FAFAF7',
      title: 'UP 进阶',
      autoHideMenuBar: true,
      show: false,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    });

    win.once('ready-to-show', () => win.show());

    // 保险：渲染进程异常缓慢时也强制显示，避免"进程在跑、窗口不出现"
    setTimeout(() => {
      if (win && !win.isDestroyed() && !win.isVisible()) {
        win.show();
        logError(new Error('ready-to-show 超时，已强制显示窗口'));
      }
    }, 5000);
    win.webContents.on('did-fail-load', (_e, code, desc) => {
      logError(new Error(`页面加载失败 code=${code} desc=${desc}`));
    });

    if (DEV_URL) {
      win.loadURL(DEV_URL);
    } else {
      win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
    }

    // 外部链接一律交给系统浏览器
    win.webContents.setWindowOpenHandler(({ url }) => {
      if (/^https?:\/\//.test(url)) shell.openExternal(url);
      return { action: 'deny' };
    });

    win.on('closed', () => { win = null; });
  }

  app.on('second-instance', () => {
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });

  app.whenReady().then(() => {
    ensureDirs();
    cleanInbox();
    const db = openDb(path.join(dataDir(), 'up.db'));
    registerIpc({ ipcMain: require('electron').ipcMain, db, dataDir: dataDir(), dialog: require('electron').dialog, shell });
    buildMenu();
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}
