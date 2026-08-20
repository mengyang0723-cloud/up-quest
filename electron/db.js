'use strict';
/**
 * 数据库层：better-sqlite3，单文件 SQLite（WAL 模式）。
 * 强制单线程模式由唯一部分索引保证：同一时刻至多一个 status='active' 的目标。
 */
const Database = require('better-sqlite3');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS diagnosis (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  kind        TEXT NOT NULL,              -- 'cefr' | 'custom'
  template_id TEXT,
  title       TEXT NOT NULL,
  scores      TEXT NOT NULL,              -- JSON { dimensionKey: 0-6 }
  overall     REAL NOT NULL,
  created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS focus (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  title        TEXT NOT NULL,
  goal         TEXT NOT NULL DEFAULT '',
  week_start   TEXT NOT NULL,             -- 本地日期 YYYY-MM-DD
  status       TEXT NOT NULL DEFAULT 'active',  -- active | done | reviewed
  created_at   TEXT NOT NULL,
  completed_at TEXT,
  reviewed_at  TEXT
);

-- 强制单线程：任何时候只有一个 active 目标
CREATE UNIQUE INDEX IF NOT EXISTS idx_focus_one_active
  ON focus(status) WHERE status = 'active';

CREATE TABLE IF NOT EXISTS task (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  focus_id     INTEGER NOT NULL REFERENCES focus(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  detail       TEXT NOT NULL DEFAULT '',
  minutes      INTEGER NOT NULL DEFAULT 30,
  status       TEXT NOT NULL DEFAULT 'todo',  -- todo | done | abandoned
  source       TEXT NOT NULL DEFAULT 'manual', -- recommend | manual
  created_at   TEXT NOT NULL,
  completed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_task_focus ON task(focus_id);

CREATE TABLE IF NOT EXISTS evidence (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id    INTEGER REFERENCES task(id) ON DELETE CASCADE, -- 可空：挂在目标下
  focus_id   INTEGER NOT NULL REFERENCES focus(id) ON DELETE CASCADE,
  kind       TEXT NOT NULL,               -- text | image | audio | file
  content    TEXT NOT NULL DEFAULT '',
  file_path  TEXT,                        -- 相对 data/evidence 的路径
  file_name  TEXT,
  file_size  INTEGER,
  checked    INTEGER NOT NULL DEFAULT 0,  -- 0 待检查 / 1 已在复盘中检查
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_evidence_focus ON evidence(focus_id);
CREATE INDEX IF NOT EXISTS idx_evidence_task  ON evidence(task_id);

CREATE TABLE IF NOT EXISTS review (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  focus_id    INTEGER NOT NULL UNIQUE REFERENCES focus(id) ON DELETE CASCADE,
  week_start  TEXT NOT NULL,
  answers     TEXT NOT NULL,   -- JSON { goal, evidence, gap, plan }
  self_rating TEXT NOT NULL,   -- JSON { dimensionKey: 0-6 }
  created_at  TEXT NOT NULL
);
`;

function openDb(dbPath) {
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(SCHEMA);
  return db;
}

module.exports = { openDb };
