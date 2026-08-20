'use strict';
/**
 * IPC 业务层：所有数据库读写、文件搬移、导入导出都在这一个进程内完成。
 * 渲染进程只能拿到 JSON 安全数据。违反单线程约束的操作会直接抛错。
 */
const fs = require('fs');
const path = require('path');

const APP_VERSION = require('../package.json').version;

const now = () => new Date().toISOString();

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// 'YYYY-MM-DD' -> 本地时间戳（该日 00:00）
function localDateMs(ws) {
  const [y, m, d] = ws.split('-').map(Number);
  return new Date(y, m - 1, d).getTime();
}

// 复盘截止 = 目标开始 + 7 天
function weekDueMs(ws) {
  return localDateMs(ws) + 7 * 24 * 3600 * 1000;
}

function parseJson(s, fallback) {
  try { return JSON.parse(s); } catch { return fallback; }
}

module.exports = function registerIpc({ ipcMain, db, dataDir, dialog, shell }) {
  const evidenceRoot = path.join(dataDir, 'evidence');
  const templatesRoot = path.join(dataDir, 'templates');

  const winOf = (e) => (e.sender ? require('electron').BrowserWindow.fromWebContents(e.sender) : null);

  /* ---------------- 应用 ---------------- */

  ipcMain.handle('app:info', () => ({
    version: APP_VERSION,
    dataDir,
    evidenceDir: evidenceRoot,
    templatesDir: templatesRoot,
    dbPath: path.join(dataDir, 'up.db'),
  }));

  ipcMain.handle('app:boot', () => {
    const latest = db.prepare('SELECT * FROM diagnosis ORDER BY id DESC LIMIT 1').get();
    const active = db.prepare("SELECT * FROM focus WHERE status='active' ORDER BY id DESC LIMIT 1").get();
    const done = active ? null : db.prepare("SELECT * FROM focus WHERE status='done' ORDER BY id DESC LIMIT 1").get();
    let reviewPending = null;
    if (active && Date.now() >= weekDueMs(active.week_start)) {
      reviewPending = { focus: active, reason: 'weekly', dueMs: weekDueMs(active.week_start) };
    } else if (done) {
      reviewPending = { focus: done, reason: 'done', dueMs: null };
    }
    const pendingEvidence = db.prepare('SELECT COUNT(*) AS c FROM evidence WHERE checked = 0').get().c;
    const settings = {};
    for (const row of db.prepare('SELECT key, value FROM settings').all()) settings[row.key] = row.value;
    return {
      hasDiagnosis: !!latest,
      latestDiagnosis: latest ? { ...latest, scores: parseJson(latest.scores, {}) } : null,
      activeFocus: active,
      reviewPending,
      pendingEvidence,
      settings,
    };
  });

  /* ---------------- 设置 ---------------- */

  ipcMain.handle('settings:get', () => {
    const out = {};
    for (const row of db.prepare('SELECT key, value FROM settings').all()) out[row.key] = row.value;
    return out;
  });

  ipcMain.handle('settings:set', (_e, { key, value }) => {
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
      .run(String(key), String(value));
    return true;
  });

  /* ---------------- 目标（强制单线程） ---------------- */

  const assertCanOpenNewFocus = () => {
    const last = db.prepare('SELECT status FROM focus ORDER BY id DESC LIMIT 1').get();
    if (last && last.status !== 'reviewed') {
      throw new Error('每周只允许一个进行中的目标：当前目标必须先完成复盘，才能开启新目标。');
    }
  };

  ipcMain.handle('focus:active', () => {
    const f = db.prepare("SELECT * FROM focus WHERE status='active' ORDER BY id DESC LIMIT 1").get();
    if (!f) return null;
    const taskTotal = db.prepare('SELECT COUNT(*) AS c FROM task WHERE focus_id = ?').get(f.id).c;
    const taskDone = db.prepare("SELECT COUNT(*) AS c FROM task WHERE focus_id = ? AND status='done'").get(f.id).c;
    const evidenceCount = db.prepare('SELECT COUNT(*) AS c FROM evidence WHERE focus_id = ?').get(f.id).c;
    return { ...f, taskTotal, taskDone, evidenceCount };
  });

  ipcMain.handle('focus:history', () => {
    return db.prepare(`
      SELECT f.*,
        (SELECT COUNT(*) FROM task t WHERE t.focus_id = f.id) AS taskTotal,
        (SELECT COUNT(*) FROM task t WHERE t.focus_id = f.id AND t.status = 'done') AS taskDone,
        (SELECT COUNT(*) FROM evidence ev WHERE ev.focus_id = f.id) AS evidenceCount,
        (SELECT COUNT(*) FROM evidence ev WHERE ev.focus_id = f.id AND ev.checked = 0) AS pendingEvidence,
        r.answers, r.self_rating, r.created_at AS reviewed_at2
      FROM focus f LEFT JOIN review r ON r.focus_id = f.id
      ORDER BY f.id DESC LIMIT 60
    `).all().map((r) => ({
      ...r,
      answers: r.answers ? parseJson(r.answers, null) : null,
      self_rating: r.self_rating ? parseJson(r.self_rating, null) : null,
    }));
  });

  ipcMain.handle('focus:create', (_e, { title, goal, tasks }) => {
    assertCanOpenNewFocus();
    const t = title ? String(title).trim() : '';
    if (!t) throw new Error('目标标题不能为空。');
    const tx = db.transaction(() => {
      const info = db.prepare(
        "INSERT INTO focus (title, goal, week_start, status, created_at) VALUES (?, ?, ?, 'active', ?)"
      ).run(t, String(goal || '').trim(), todayStr(), now());
      const focusId = Number(info.lastInsertRowid);
      const ins = db.prepare(
        'INSERT INTO task (focus_id, title, detail, minutes, status, source, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
      );
      for (const tk of Array.isArray(tasks) ? tasks : []) {
        const name = String(tk.title || '').trim();
        if (!name) continue;
        ins.run(focusId, name, String(tk.detail || '').trim(), Math.min(240, Math.max(5, Number(tk.minutes) || 30)),
          'todo', tk.source === 'recommend' ? 'recommend' : 'manual', now());
      }
      return focusId;
    });
    return tx();
  });

  ipcMain.handle('focus:update', (_e, { id, title, goal }) => {
    const f = db.prepare('SELECT * FROM focus WHERE id = ?').get(id);
    if (!f) throw new Error('目标不存在。');
    if (f.status !== 'active') throw new Error('只有进行中的目标可以编辑。');
    db.prepare('UPDATE focus SET title = ?, goal = ? WHERE id = ?')
      .run(String(title || f.title).trim() || f.title, String(goal ?? f.goal), id);
    return true;
  });

  ipcMain.handle('focus:complete', () => {
    const f = db.prepare("SELECT * FROM focus WHERE status='active' ORDER BY id DESC LIMIT 1").get();
    if (!f) throw new Error('当前没有进行中的目标。');
    db.prepare("UPDATE focus SET status='done', completed_at = ? WHERE id = ?").run(now(), f.id);
    return true;
  });

  // 仅允许删除「空目标」：没有任何任务与证据，用于误建清理；有产出的目标必须走复盘。
  ipcMain.handle('focus:delete', (_e, { id }) => {
    const f = db.prepare('SELECT * FROM focus WHERE id = ?').get(id);
    if (!f) throw new Error('目标不存在。');
    const c = db.prepare('SELECT (SELECT COUNT(*) FROM task WHERE focus_id = ?) + (SELECT COUNT(*) FROM evidence WHERE focus_id = ?) AS c').get(id, id).c;
    if (c > 0) throw new Error('该目标已有任务或证据，不能删除；请先完成复盘归档。');
    db.prepare('DELETE FROM focus WHERE id = ?').run(id);
    return true;
  });

  /* ---------------- 任务 ---------------- */

  ipcMain.handle('task:list', (_e, { focusId }) => {
    return db.prepare(`
      SELECT t.*,
        (SELECT COUNT(*) FROM evidence ev WHERE ev.task_id = t.id) AS evidenceCount
      FROM task t WHERE t.focus_id = ? ORDER BY t.id ASC
    `).all(focusId);
  });

  ipcMain.handle('task:create', (_e, { focusId, title, detail, minutes, source }) => {
    const f = db.prepare('SELECT * FROM focus WHERE id = ?').get(focusId);
    if (!f || f.status !== 'active') throw new Error('只能给进行中的目标添加任务。');
    if (!String(title || '').trim()) throw new Error('任务标题不能为空。');
    return db.prepare(
      'INSERT INTO task (focus_id, title, detail, minutes, status, source, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(focusId, String(title).trim(), String(detail || '').trim(), Math.min(240, Math.max(5, Number(minutes) || 30)),
      'todo', source === 'recommend' ? 'recommend' : 'manual', now()).lastInsertRowid;
  });

  ipcMain.handle('task:update', (_e, { id, patch }) => {
    const row = db.prepare('SELECT * FROM task WHERE id = ?').get(id);
    if (!row) throw new Error('任务不存在。');
    const p = patch || {};
    const next = { ...row };
    if (typeof p.title === 'string') next.title = p.title.trim() || row.title;
    if (typeof p.detail === 'string') next.detail = p.detail;
    if (typeof p.minutes === 'number') next.minutes = Math.min(240, Math.max(5, p.minutes));
    if (p.status && ['todo', 'done', 'abandoned'].includes(p.status)) {
      next.status = p.status;
      next.completed_at = p.status === 'done' ? now() : null;
    }
    db.prepare('UPDATE task SET title = ?, detail = ?, minutes = ?, status = ?, completed_at = ? WHERE id = ?')
      .run(next.title, next.detail, next.minutes, next.status, next.completed_at, id);
    return true;
  });

  ipcMain.handle('task:delete', (_e, { id }) => {
    // 先删证据文件，再删行（级联删除证据记录）
    const evs = db.prepare('SELECT file_path FROM evidence WHERE task_id = ? AND file_path IS NOT NULL').all(id);
    for (const ev of evs) {
      try { fs.unlinkSync(path.join(evidenceRoot, ev.file_path)); } catch { /* 忽略 */ }
    }
    db.prepare('DELETE FROM task WHERE id = ?').run(id);
    return true;
  });

  /* ---------------- 证据 ---------------- */

  ipcMain.handle('evidence:list', (_e, { focusId, taskId }) => {
    const rows = taskId
      ? db.prepare('SELECT * FROM evidence WHERE task_id = ? ORDER BY id DESC').all(taskId)
      : db.prepare('SELECT * FROM evidence WHERE focus_id = ? ORDER BY id DESC').all(focusId);
    return rows.map((r) => ({
      ...r,
      task_title: r.task_id
        ? (db.prepare('SELECT title FROM task WHERE id = ?').get(r.task_id) || {}).title || null
        : null,
    }));
  });

  ipcMain.handle('evidence:add', (_e, { taskId, focusId, kind, content, file }) => {
    const f = db.prepare('SELECT * FROM focus WHERE id = ?').get(focusId);
    if (!f) throw new Error('目标不存在。');
    if (taskId) {
      const t = db.prepare('SELECT * FROM task WHERE id = ? AND focus_id = ?').get(taskId, focusId);
      if (!t) throw new Error('任务不存在。');
    }
    const kinds = ['text', 'image', 'audio', 'file'];
    if (!kinds.includes(kind)) kind = 'text';
    const filePath = file && file.relPath ? file.relPath : null;
    return db.prepare(
      'INSERT INTO evidence (task_id, focus_id, kind, content, file_path, file_name, file_size, checked, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)'
    ).run(taskId || null, focusId, kind, String(content || '').trim(), filePath,
      file && file.name ? file.name : null, file && file.size ? Number(file.size) : null, now()).lastInsertRowid;
  });

  ipcMain.handle('evidence:setChecked', (_e, { ids, checked }) => {
    const st = db.prepare('UPDATE evidence SET checked = ? WHERE id = ?');
    const tx = db.transaction(() => {
      for (const id of ids || []) st.run(checked ? 1 : 0, id);
    });
    tx();
    return true;
  });

  ipcMain.handle('evidence:delete', (_e, { id }) => {
    const r = db.prepare('SELECT * FROM evidence WHERE id = ?').get(id);
    if (!r) return true;
    if (r.file_path) {
      try { fs.unlinkSync(path.join(evidenceRoot, r.file_path)); } catch { /* 忽略 */ }
    }
    db.prepare('DELETE FROM evidence WHERE id = ?').run(id);
    return true;
  });

  ipcMain.handle('evidence:open', (_e, { id }) => {
    const r = db.prepare('SELECT * FROM evidence WHERE id = ?').get(id);
    if (!r || !r.file_path) throw new Error('该证据没有关联文件。');
    const abs = path.join(evidenceRoot, r.file_path);
    if (!fs.existsSync(abs)) throw new Error('证据文件已被移动或删除。');
    shell.openPath(abs);
    return true;
  });

  // 选择文件 -> 复制进 _inbox -> 返回元数据（渲染层随后以证据形式提交）
  ipcMain.handle('dialog:pickFiles', async (e, { kinds }) => {
    const filters = [];
    if ((kinds || []).includes('image')) filters.push({ name: '图片', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'] });
    if ((kinds || []).includes('audio')) filters.push({ name: '音频', extensions: ['mp3', 'wav', 'm4a', 'ogg', 'webm', 'aac', 'flac'] });
    filters.push({ name: '所有文件', extensions: ['*'] });
    const r = await dialog.showOpenDialog(winOf(e), {
      title: '选择证据文件',
      properties: ['openFile', 'multiSelections'],
      filters,
    });
    if (r.canceled || !r.filePaths.length) return { canceled: true, files: [] };
    const files = r.filePaths.map((p) => {
      const name = path.basename(p);
      const relPath = `_inbox/${Date.now()}-${name}`;
      fs.copyFileSync(p, path.join(evidenceRoot, relPath));
      return { name, relPath, size: fs.statSync(p).size };
    });
    return { canceled: false, files };
  });

  // 渲染层录音（MediaRecorder -> ArrayBuffer）落盘到 _inbox
  ipcMain.handle('audio:save', (_e, { buffer, ext }) => {
    const name = `rec-${Date.now()}.${ext || 'webm'}`;
    const relPath = `_inbox/${name}`;
    fs.writeFileSync(path.join(evidenceRoot, relPath), Buffer.from(buffer));
    return { name, relPath, size: Buffer.byteLength(buffer) };
  });

  /* ---------------- 复盘 ---------------- */

  ipcMain.handle('review:get', (_e, { focusId }) => {
    const r = db.prepare('SELECT * FROM review WHERE focus_id = ?').get(focusId);
    return r ? { ...r, answers: parseJson(r.answers, {}), self_rating: parseJson(r.self_rating, {}) } : null;
  });

  ipcMain.handle('review:save', (_e, { focusId, answers, ratings, nextTitle, nextGoal }) => {
    const f = db.prepare('SELECT * FROM focus WHERE id = ?').get(focusId);
    if (!f) throw new Error('目标不存在。');
    if (f.status !== 'active' && f.status !== 'done') throw new Error('该目标已完成复盘，无需重复提交。');
    const a = answers || {};
    if (!String(a.goal || '').trim()) throw new Error('“回顾目标”不能为空。');
    if (!String(a.evidence || '').trim()) throw new Error('“检查证据”不能为空。');
    if (!String(a.gap || '').trim()) throw new Error('“分析差距”不能为空。');
    if (!String(a.plan || '').trim()) throw new Error('“调整计划”不能为空。');

    const tx = db.transaction(() => {
      db.prepare(`
        INSERT INTO review (focus_id, week_start, answers, self_rating, created_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(focus_id) DO UPDATE SET answers = excluded.answers, self_rating = excluded.self_rating, created_at = excluded.created_at
      `).run(focusId, f.week_start, JSON.stringify(a), JSON.stringify(ratings || {}), now());
      db.prepare("UPDATE focus SET status = 'reviewed', reviewed_at = ? WHERE id = ?").run(now(), focusId);
      db.prepare('UPDATE evidence SET checked = 1 WHERE focus_id = ?').run(focusId);
      let nextId = null;
      if (nextTitle && String(nextTitle).trim()) {
        const info = db.prepare(
          "INSERT INTO focus (title, goal, week_start, status, created_at) VALUES (?, ?, ?, 'active', ?)"
        ).run(String(nextTitle).trim(), String(nextGoal || '').trim(), todayStr(), now());
        nextId = Number(info.lastInsertRowid);
      }
      return { nextId };
    });
    return tx();
  });

  /* ---------------- 诊断 ---------------- */

  ipcMain.handle('diagnosis:list', () => {
    return db.prepare('SELECT * FROM diagnosis ORDER BY id DESC').all().map((r) => ({
      ...r, scores: parseJson(r.scores, {}),
    }));
  });

  ipcMain.handle('diagnosis:save', (_e, { kind, templateId, title, scores, overall }) => {
    if (!scores || typeof scores !== 'object') throw new Error('诊断结果无效。');
    const total = Object.values(scores).reduce((s, v) => s + Number(v || 0), 0);
    const avg = Object.keys(scores).length ? total / Object.keys(scores).length : 0;
    return db.prepare(
      'INSERT INTO diagnosis (kind, template_id, title, scores, overall, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(kind === 'custom' ? 'custom' : 'cefr', String(templateId || ''), String(title || '未命名诊断'),
      JSON.stringify(scores), Number(overall ?? avg), now()).lastInsertRowid;
  });

  // 用户自定义诊断模板（JSON 文件，放于 templates 目录；格式见 README）
  ipcMain.handle('templates:list', () => {
    const out = [];
    let files = [];
    try { files = fs.readdirSync(templatesRoot); } catch { return out; }
    for (const f of files) {
      if (!f.endsWith('.json')) continue;
      try {
        const t = JSON.parse(fs.readFileSync(path.join(templatesRoot, f), 'utf8'));
        if (t && typeof t === 'object' && t.title && Array.isArray(t.dimensions)) {
          t._file = f;
          out.push(t);
        }
      } catch { /* 跳过损坏的模板文件 */ }
    }
    return out;
  });

  /* ---------------- 数据控制权（导出 / 导入） ---------------- */

  const TABLES = ['settings', 'diagnosis', 'focus', 'task', 'evidence', 'review'];
  const evidenceDirFor = (backupPath) => backupPath.replace(/\.json$/i, '.evidence');

  ipcMain.handle('data:export', async (e) => {
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const r = await dialog.showSaveDialog(winOf(e), {
      title: '导出全部数据备份',
      defaultPath: `up-backup-${ts}.json`,
      filters: [{ name: 'JSON 备份', extensions: ['json'] }],
    });
    if (r.canceled || !r.filePath) return { canceled: true };
    const tables = {};
    for (const t of TABLES) tables[t] = db.prepare(`SELECT * FROM ${t}`).all();
    const bundle = { app: 'up-quest', version: APP_VERSION, exportedAt: now(), tables };
    fs.writeFileSync(r.filePath, JSON.stringify(bundle, null, 2), 'utf8');
    const evDir = evidenceDirFor(r.filePath);
    fs.rmSync(evDir, { recursive: true, force: true });
    fs.cpSync(evidenceRoot, evDir, { recursive: true });
    return {
      canceled: false,
      path: r.filePath,
      evidenceDir: evDir,
      counts: Object.fromEntries(TABLES.map((t) => [t, tables[t].length])),
    };
  });

  ipcMain.handle('data:import', async (e) => {
    const r = await dialog.showOpenDialog(winOf(e), {
      title: '选择备份文件（up-backup-*.json）',
      properties: ['openFile'],
      filters: [{ name: 'JSON 备份', extensions: ['json'] }],
    });
    if (r.canceled || !r.filePaths.length) return { canceled: true };
    const filePath = r.filePaths[0];
    let bundle;
    try { bundle = JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch { throw new Error('备份文件不是有效的 JSON。'); }
    if (!bundle || bundle.app !== 'up-quest' || !bundle.tables) throw new Error('这不是 UP 进阶的备份文件。');

    const tx = db.transaction(() => {
      for (const t of TABLES) {
        db.prepare(`DELETE FROM ${t}`).run();
        const rows = bundle.tables[t];
        if (!Array.isArray(rows) || !rows.length) continue;
        const cols = Object.keys(rows[0]);
        const placeholders = cols.map(() => '?').join(', ');
        const st = db.prepare(`INSERT INTO ${t} (${cols.join(', ')}) VALUES (${placeholders})`);
        for (const row of rows) st.run(cols.map((c) => row[c] ?? null));
        db.prepare(`DELETE FROM sqlite_sequence WHERE name = ?`).run(t);
      }
    });
    tx();

    // 恢复证据文件（备份 json 旁的 .evidence 文件夹）
    const evDir = evidenceDirFor(filePath);
    fs.rmSync(evidenceRoot, { recursive: true, force: true });
    fs.mkdirSync(path.join(evidenceRoot, '_inbox'), { recursive: true });
    if (fs.existsSync(evDir)) fs.cpSync(evDir, evidenceRoot, { recursive: true });
    const counts = Object.fromEntries(TABLES.map((t) => [t, (bundle.tables[t] || []).length]));
    return { canceled: false, path: filePath, counts };
  });

  ipcMain.handle('data:openDir', (_e, { which }) => {
    const p = which === 'templates' ? templatesRoot : which === 'evidence' ? evidenceRoot : dataDir;
    shell.openPath(p);
    return true;
  });
};
