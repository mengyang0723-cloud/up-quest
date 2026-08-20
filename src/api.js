// 渲染层数据通道：优先走 window.upAPI（Electron preload），
// 纯浏览器预览（npm run dev:renderer）时退回 localStorage mock，便于调试界面。
export const isPreview = typeof window !== 'undefined' && !window.upAPI;

const MOCK_KEY = 'upquest-mock-v1';

function mockLoad() {
  try {
    const s = JSON.parse(localStorage.getItem(MOCK_KEY));
    if (s && s.focuses) return s;
  } catch { /* 重新播种 */ }
  const seed = {
    seq: 1,
    settings: {},
    diagnoses: [],
    focuses: [],
    tasks: [],
    evidences: [],
    reviews: [],
    templates: [],
  };
  localStorage.setItem(MOCK_KEY, JSON.stringify(seed));
  return seed;
}
function mockSave(s) { localStorage.setItem(MOCK_KEY, JSON.stringify(s)); }
function mockId(s) { return s.seq++; }
function mockNow() { return new Date().toISOString(); }
function mockToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function makeMock() {
  const evDir = () => { try { return localStorage.getItem('upquest-mock-ev') || ''; } catch { return ''; } };
  return {
    boot: async () => {
      const s = mockLoad();
      const latest = s.diagnoses[s.diagnoses.length - 1] || null;
      const active = s.focuses.filter((f) => f.status === 'active')[0] || null;
      const done = active ? null : s.focuses.filter((f) => f.status === 'done')[0] || null;
      let reviewPending = null;
      if (active) {
        const due = new Date(active.week_start).getTime() + 7 * 86400000;
        if (Date.now() >= due) reviewPending = { focus: active, reason: 'weekly' };
      } else if (done) reviewPending = { focus: done, reason: 'done' };
      return {
        hasDiagnosis: !!latest,
        latestDiagnosis: latest,
        activeFocus: active,
        reviewPending,
        pendingEvidence: s.evidences.filter((e) => !e.checked).length,
        settings: s.settings,
      };
    },
    info: async () => ({ version: '1.0.0-preview', dataDir: '（浏览器预览模式，无真实数据目录）', evidenceDir: '', templatesDir: '', dbPath: '' }),
    settingsGet: async () => mockLoad().settings,
    settingsSet: async (k, v) => { const s = mockLoad(); s.settings[k] = v; mockSave(s); return true; },
    focusActive: async () => {
      const s = mockLoad();
      const f = s.focuses.filter((x) => x.status === 'active')[0] || null;
      if (!f) return null;
      const tasks = s.tasks.filter((t) => t.focus_id === f.id);
      return { ...f, taskTotal: tasks.length, taskDone: tasks.filter((t) => t.status === 'done').length, evidenceCount: s.evidences.filter((e) => e.focus_id === f.id).length };
    },
    focusHistory: async () => mockLoad().focuses.slice().reverse().slice(0, 60).map((f) => {
      const r = mockLoad().reviews.find((x) => x.focus_id === f.id) || null;
      return { ...f, taskTotal: 0, taskDone: 0, evidenceCount: 0, pendingEvidence: 0, answers: r ? r.answers : null, self_rating: r ? r.self_rating : null };
    }),
    focusCreate: async ({ title, goal, tasks }) => {
      const s = mockLoad();
      const last = s.focuses[s.focuses.length - 1];
      if (last && last.status !== 'reviewed') throw new Error('每周只允许一个进行中的目标：当前目标必须先完成复盘，才能开启新目标。');
      const f = { id: mockId(s), title, goal: goal || '', week_start: mockToday(), status: 'active', created_at: mockNow(), completed_at: null, reviewed_at: null };
      s.focuses.push(f);
      for (const t of tasks || []) s.tasks.push({ id: mockId(s), focus_id: f.id, title: t.title, detail: t.detail || '', minutes: t.minutes || 30, status: 'todo', source: t.source || 'manual', created_at: mockNow(), completed_at: null });
      mockSave(s);
      return f.id;
    },
    focusUpdate: async ({ id, title, goal }) => {
      const s = mockLoad();
      const f = s.focuses.find((x) => x.id === id);
      if (f) { f.title = title; f.goal = goal ?? f.goal; mockSave(s); }
      return true;
    },
    focusComplete: async () => {
      const s = mockLoad();
      const f = s.focuses.filter((x) => x.status === 'active')[0];
      if (f) { f.status = 'done'; f.completed_at = mockNow(); mockSave(s); }
      return true;
    },
    focusDelete: async (id) => {
      const s = mockLoad();
      s.focuses = s.focuses.filter((f) => f.id !== id);
      s.tasks = s.tasks.filter((t) => t.focus_id !== id);
      s.evidences = s.evidences.filter((e) => e.focus_id !== id);
      mockSave(s);
      return true;
    },
    taskList: async (focusId) => {
      const s = mockLoad();
      return s.tasks.filter((t) => t.focus_id === focusId).map((t) => ({ ...t, evidenceCount: s.evidences.filter((e) => e.task_id === t.id).length }));
    },
    taskCreate: async ({ focusId, title, detail, minutes, source }) => {
      const s = mockLoad();
      const t = { id: mockId(s), focus_id: focusId, title, detail: detail || '', minutes: minutes || 30, status: 'todo', source: source === 'recommend' ? 'recommend' : 'manual', created_at: mockNow(), completed_at: null };
      s.tasks.push(t);
      mockSave(s);
      return t.id;
    },
    taskUpdate: async ({ id, patch }) => {
      const s = mockLoad();
      const t = s.tasks.find((x) => x.id === id);
      if (t) { Object.assign(t, patch); if (patch.status === 'done') t.completed_at = mockNow(); mockSave(s); }
      return true;
    },
    taskDelete: async (id) => {
      const s = mockLoad();
      s.tasks = s.tasks.filter((t) => t.id !== id);
      s.evidences = s.evidences.filter((e) => e.task_id !== id);
      mockSave(s);
      return true;
    },
    evidenceList: async (focusId, taskId) => {
      const s = mockLoad();
      return s.evidences
        .filter((e) => (taskId ? e.task_id === taskId : e.focus_id === focusId))
        .slice()
        .reverse()
        .map((e) => ({ ...e, task_title: taskId ? null : (s.tasks.find((t) => t.id === e.task_id) || {}).title || null }));
    },
    evidenceAdd: async ({ taskId, focusId, kind, content, file }) => {
      const s = mockLoad();
      const e = { id: mockId(s), task_id: taskId || null, focus_id: focusId, kind, content: content || '', file_path: file ? file.relPath : null, file_name: file ? file.name : null, file_size: file ? file.size : null, checked: 0, created_at: mockNow() };
      s.evidences.push(e);
      mockSave(s);
      return e.id;
    },
    evidenceSetChecked: async (ids, checked) => {
      const s = mockLoad();
      for (const id of ids || []) { const e = s.evidences.find((x) => x.id === id); if (e) e.checked = checked ? 1 : 0; }
      mockSave(s);
      return true;
    },
    evidenceDelete: async (id) => {
      const s = mockLoad();
      s.evidences = s.evidences.filter((e) => e.id !== id);
      mockSave(s);
      return true;
    },
    evidenceOpen: async () => { window.alert('浏览器预览模式无法打开文件。'); return true; },
    dialogPickFiles: async () => ({ canceled: true, files: [] }),
    audioSave: async () => { throw new Error('浏览器预览模式不支持录音保存，请改用文本证据。'); },
    reviewGet: async (focusId) => {
      const s = mockLoad();
      const r = s.reviews.find((x) => x.focus_id === focusId) || null;
      return r ? { ...r } : null;
    },
    reviewSave: async ({ focusId, answers, ratings, nextTitle, nextGoal }) => {
      const s = mockLoad();
      const f = s.focuses.find((x) => x.id === focusId);
      if (!f || (f.status !== 'active' && f.status !== 'done')) throw new Error('该目标已完成复盘。');
      s.reviews.push({ id: mockId(s), focus_id: focusId, week_start: f.week_start, answers, self_rating: ratings || {}, created_at: mockNow() });
      f.status = 'reviewed';
      f.reviewed_at = mockNow();
      for (const e of s.evidences) if (e.focus_id === focusId) e.checked = 1;
      let nextId = null;
      if (nextTitle && nextTitle.trim()) {
        const nf = { id: mockId(s), title: nextTitle.trim(), goal: nextGoal || '', week_start: mockToday(), status: 'active', created_at: mockNow(), completed_at: null, reviewed_at: null };
        s.focuses.push(nf);
        nextId = nf.id;
      }
      mockSave(s);
      return { nextId };
    },
    diagnosisList: async () => mockLoad().diagnoses.slice().reverse(),
    diagnosisSave: async ({ kind, templateId, title, scores, overall }) => {
      const s = mockLoad();
      const vals = Object.values(scores);
      const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
      const d = { id: mockId(s), kind, template_id: templateId || '', title, scores, overall: overall ?? Math.round(avg * 10) / 10, created_at: mockNow() };
      s.diagnoses.push(d);
      mockSave(s);
      return d.id;
    },
    templatesList: async () => mockLoad().templates,
    exportData: async () => { window.alert('浏览器预览模式无法导出，请运行 Electron 版本。'); return { canceled: true }; },
    importData: async () => { window.alert('浏览器预览模式无法导入。'); return { canceled: true }; },
    openDir: async () => true,
    onMenuAction: () => () => {},
  };
}

export const api = isPreview ? makeMock() : window.upAPI;

export function errMsg(err) {
  if (!err) return '未知错误';
  const m = err && err.message ? err.message : String(err);
  return m.replace(/^Error invoking remote method '[^']+': (Error: )?/, '');
}
