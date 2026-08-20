'use strict';
/**
 * Preload：通过 contextBridge 暴露最小 API 面（window.upAPI）。
 * 渲染进程无法直接接触 Node/磁盘，所有文件与数据库操作都经过主进程校验。
 */
const { contextBridge, ipcRenderer } = require('electron');

const api = {
  // —— 应用 ——
  boot: () => ipcRenderer.invoke('app:boot'),
  info: () => ipcRenderer.invoke('app:info'),

  // —— 设置 ——
  settingsGet: () => ipcRenderer.invoke('settings:get'),
  settingsSet: (key, value) => ipcRenderer.invoke('settings:set', { key, value }),

  // —— 目标（单线程） ——
  focusActive: () => ipcRenderer.invoke('focus:active'),
  focusHistory: () => ipcRenderer.invoke('focus:history'),
  focusCreate: (payload) => ipcRenderer.invoke('focus:create', payload),
  focusUpdate: (payload) => ipcRenderer.invoke('focus:update', payload),
  focusComplete: () => ipcRenderer.invoke('focus:complete'),
  focusDelete: (id) => ipcRenderer.invoke('focus:delete', { id }),

  // —— 任务 ——
  taskList: (focusId) => ipcRenderer.invoke('task:list', { focusId }),
  taskCreate: (payload) => ipcRenderer.invoke('task:create', payload),
  taskUpdate: (payload) => ipcRenderer.invoke('task:update', payload),
  taskDelete: (id) => ipcRenderer.invoke('task:delete', { id }),

  // —— 证据 ——
  evidenceList: (focusId, taskId) => ipcRenderer.invoke('evidence:list', { focusId, taskId: taskId ?? null }),
  evidenceAdd: (payload) => ipcRenderer.invoke('evidence:add', payload),
  evidenceSetChecked: (ids, checked) => ipcRenderer.invoke('evidence:setChecked', { ids, checked }),
  evidenceDelete: (id) => ipcRenderer.invoke('evidence:delete', { id }),
  evidenceOpen: (id) => ipcRenderer.invoke('evidence:open', { id }),
  dialogPickFiles: (kinds) => ipcRenderer.invoke('dialog:pickFiles', { kinds }),
  audioSave: (buffer, ext) => ipcRenderer.invoke('audio:save', { buffer, ext }),

  // —— 复盘 ——
  reviewGet: (focusId) => ipcRenderer.invoke('review:get', { focusId }),
  reviewSave: (payload) => ipcRenderer.invoke('review:save', payload),

  // —— 诊断 ——
  diagnosisList: () => ipcRenderer.invoke('diagnosis:list'),
  diagnosisSave: (payload) => ipcRenderer.invoke('diagnosis:save', payload),
  templatesList: () => ipcRenderer.invoke('templates:list'),

  // —— 数据控制权 ——
  exportData: () => ipcRenderer.invoke('data:export'),
  importData: () => ipcRenderer.invoke('data:import'),
  openDir: (which) => ipcRenderer.invoke('data:openDir', { which }),

  // —— 菜单事件 ——
  onMenuAction: (cb) => {
    const listener = (_e, action) => cb(action);
    ipcRenderer.on('menu:action', listener);
    return () => ipcRenderer.removeListener('menu:action', listener);
  },
};

contextBridge.exposeInMainWorld('upAPI', api);
