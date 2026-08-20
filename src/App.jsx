import React, { useEffect, useMemo, useState } from 'react';
import { api, errMsg, isPreview } from './api.js';
import Icon from './components/Icon.jsx';
import { weekDueMs, fmtCountdown, isOverdue, addDays, fmtDate } from './util.js';
import Onboard from './pages/Onboard.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Focus from './pages/Focus.jsx';
import Evidence from './pages/Evidence.jsx';
import Review from './pages/Review.jsx';
import Settings from './pages/Settings.jsx';
import ReviewForm from './components/ReviewForm.jsx';

const NAV = [
  { id: 'dashboard', label: '仪表盘', icon: 'target' },
  { id: 'focus', label: '本周任务', icon: 'flag' },
  { id: 'evidence', label: '证据链', icon: 'paper' },
  { id: 'review', label: '复盘', icon: 'loop' },
  { id: 'settings', label: '设置', icon: 'gear' },
];

function Splash() {
  return (
    <div className="splash">
      <div className="splash-mark"><Icon name="loop" size={28} /></div>
      <p>UP 进阶 · 可检查的循环</p>
    </div>
  );
}

export default function App() {
  const [boot, setBoot] = useState(null);
  const [route, setRoute] = useState('dashboard');
  const [error, setError] = useState('');
  const [rev, setRev] = useState(0); // 数据版本号：变更后 +1 触发页面刷新

  const reload = async () => {
    try {
      const b = await api.boot();
      setBoot(b);
      setRev((r) => r + 1);
    } catch (err) {
      setError(errMsg(err));
    }
  };

  useEffect(() => { reload(); }, []);
  useEffect(() => api.onMenuAction((a) => {
    if (a === 'export') setRoute('settings');
    if (a === 'import') setRoute('settings');
    if (a === 'open-data') setRoute('settings');
  }), []);

  const active = boot?.activeFocus || null;
  const pending = boot?.reviewPending || null;

  const ctx = useMemo(() => ({
    boot,
    active,
    pending,
    route,
    setRoute,
    reload,
    rev,
    error,
    setError,
  }), [boot, active, pending, route, rev, error]);

  if (!boot) return <Splash />;

  // 强制复盘门：进行中目标到期，或已完成目标未复盘 —— 不可跳过
  if (pending) {
    return (
      <div className="gate">
        <div className="gate-head">
          <div className="gate-title">
            <Icon name="loop" size={18} />
            <span>每周复盘</span>
          </div>
          <p className="gate-sub">
            {pending.reason === 'weekly'
              ? `本周目标「${pending.focus.title}」已到复盘时间（${fmtDate(pending.focus.week_start)} 起 7 天），复盘后才能开启新目标。`
              : `「${pending.focus.title}」已完成，还需完成复盘归档。`}
          </p>
        </div>
        <div className="gate-body">
          <ReviewForm focus={pending.focus} onDone={async () => { await reload(); }} onError={setError} />
        </div>
      </div>
    );
  }

  // 首屏：没有诊断记录 → 只做诊断引导
  if (!boot.hasDiagnosis) {
    return <Onboard onDone={reload} />;
  }

  const page = {
    dashboard: <Dashboard ctx={ctx} />,
    focus: <Focus ctx={ctx} />,
    evidence: <Evidence ctx={ctx} />,
    review: <Review ctx={ctx} />,
    settings: <Settings ctx={ctx} />,
  }[route];

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark"><Icon name="loop" size={17} /></span>
          <span className="brand-name">UP 进阶</span>
        </div>
        <nav className="nav">
          {NAV.map((n) => (
            <button
              key={n.id}
              className={`nav-item ${route === n.id ? 'active' : ''}`}
              onClick={() => setRoute(n.id)}
              aria-current={route === n.id ? 'page' : undefined}
            >
              <Icon name={n.icon} size={16} />
              <span>{n.label}</span>
              {n.id === 'evidence' && boot.pendingEvidence > 0 && (
                <span className="nav-badge">{boot.pendingEvidence}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-foot">
          {active ? (
            <div className="mini-focus">
              <div className="mini-focus-label">当前唯一任务</div>
              <div className="mini-focus-title" title={active.title}>{active.title}</div>
              {isOverdue(active.week_start) ? (
                <div className="mini-focus-due overdue">复盘已到期</div>
              ) : (
                <div className="mini-focus-due">距复盘 {fmtCountdown(weekDueMs(active.week_start))}</div>
              )}
            </div>
          ) : (
            <div className="mini-focus">
              <div className="mini-focus-label">当前状态</div>
              <div className="mini-focus-title">暂无进行中的目标</div>
            </div>
          )}
          {isPreview && <div className="preview-tag">浏览器预览模式 · 数据仅存于 localStorage</div>}
        </div>
      </aside>
      <main className="main">
        {error && (
          <div className="toast" role="alert">
            <span>{error}</span>
            <button className="btn-icon" onClick={() => setError('')} aria-label="关闭"><Icon name="x" size={14} /></button>
          </div>
        )}
        <div key={rev} className="page-fade">{page}</div>
      </main>
    </div>
  );
}
