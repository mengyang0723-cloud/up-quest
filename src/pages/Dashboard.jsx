import React from 'react';
import Icon from '../components/Icon.jsx';
import { isOverdue, weekDueMs, fmtCountdown, fmtDate, addDays } from '../util.js';

const LOOP = [
  { name: '诊断', desc: '诊断现状' },
  { name: '任务', desc: '选择任务' },
  { name: '证据', desc: '留下证据' },
  { name: '复盘', desc: '调整下一步' },
];

export default function Dashboard({ ctx }) {
  const { boot, active, pending, setRoute } = ctx;
  const dueMs = active ? weekDueMs(active.week_start) : null;
  const overdue = active ? isOverdue(active.week_start) : false;

  // 当前处于循环的哪一步
  const phase = pending ? 3 : active ? (boot.pendingEvidence > 0 ? 2 : 1) : 0;

  return (
    <div>
      <div className="page-head">
        <h1>仪表盘</h1>
        <p>可检查的循环：诊断现状 → 选择任务 → 主动练习 → 获得反馈 → 留下证据 → 调整下一步</p>
      </div>

      <div className="stats">
        <div className="stat">
          <div className="stat-label">当前唯一任务</div>
          <div className="stat-value small" title={active ? active.title : '无'}>
            {active ? active.title : '未开启'}
          </div>
          {active ? (
            <div className="stat-sub">
              {active.taskTotal === 0 ? '还没有任务，去任务页添加' : `任务 ${active.taskDone}/${active.taskTotal} 已完成`}
            </div>
          ) : (
            <div className="stat-sub">完成复盘后即可开启新目标</div>
          )}
        </div>
        <div className="stat">
          <div className="stat-label">待检查证据</div>
          <div className="stat-value">{boot.pendingEvidence}</div>
          <div className="stat-sub">条证据尚未在复盘中核对</div>
        </div>
        <div className="stat">
          <div className="stat-label">距离下次复盘</div>
          <div className={`stat-value small ${overdue ? 'overdue' : ''}`}>
            {pending ? '需立即复盘' : active ? fmtCountdown(dueMs) : '—'}
          </div>
          {active ? (
            <div className="stat-sub">
              {overdue ? `已逾期（${fmtDate(addDays(active.week_start, 7))} 截止）` : `截止 ${fmtDate(addDays(active.week_start, 7))}`}
            </div>
          ) : (
            <div className="stat-sub">—</div>
          )}
        </div>
      </div>

      <div className="loop-strip">
        {LOOP.map((s, i) => (
          <div key={s.name} className={`loop-step ${phase === i ? 'active' : ''}`}>
            <div className="num">STEP {i + 1}</div>
            <div className="name">{s.name}</div>
            <div className="stat-sub" style={{ marginTop: 2 }}>{s.desc}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-title"><Icon name="target" size={15} /> 下一步</div>
        <p className="card-sub">
          {pending
            ? `本周目标「${pending.focus.title}」需要复盘归档。复盘是循环的支点，不可跳过。`
            : active
              ? `本周聚焦「${active.title}」。完成每个任务时，记得在任务页留下证据。`
              : '当前没有进行中的目标。诊断与复盘已完成，现在开启新一周的唯一目标。'}
        </p>
        <div className="dash-actions">
          {pending ? (
            <button className="btn btn-primary" onClick={() => setRoute('review')}>
              <Icon name="loop" size={14} /> 立即复盘
            </button>
          ) : active ? (
            <button className="btn btn-primary" onClick={() => setRoute('focus')}>
              <Icon name="play" size={14} /> 去执行本周任务
            </button>
          ) : (
            <button className="btn btn-primary" onClick={() => setRoute('focus')}>
              <Icon name="flag" size={14} /> 开启新目标
            </button>
          )}
          {!pending && (
            <button className="btn" onClick={() => setRoute('evidence')}>
              <Icon name="paper" size={14} /> 查看证据链
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
