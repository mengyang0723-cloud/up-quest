import React, { useEffect, useState } from 'react';
import { api, errMsg } from '../api.js';
import Icon from '../components/Icon.jsx';
import { fmtDateTime, KIND_LABEL, addDays } from '../util.js';

const KIND_ICON = { text: 'paper', image: 'image', audio: 'mic', file: 'file' };

export default function Evidence({ ctx }) {
  const { boot, reload, setError } = ctx;
  const [history, setHistory] = useState([]);

  const load = async () => {
    try {
      setHistory(await api.focusHistory());
    } catch (err) { setError(errMsg(err)); }
  };

  useEffect(() => { load(); }, [ctx.rev]);

  const withEvidence = history.filter((f) => f.evidenceCount > 0);
  const weeks = withEvidence.length ? withEvidence : history.slice(0, 3);

  const open = async (id) => { try { await api.evidenceOpen(id); } catch (err) { setError(errMsg(err)); } };
  const remove = async (id) => {
    try { await api.evidenceDelete(id); await load(); reload(); } catch (err) { setError(errMsg(err)); }
  };
  const toggleChecked = async (id, checked) => {
    try { await api.evidenceSetChecked([id], checked); await load(); reload(); } catch (err) { setError(errMsg(err)); }
  };

  return (
    <div>
      <div className="page-head">
        <h1>证据链</h1>
        <p>
          证据自动按周归档。当前待检查 {boot.pendingEvidence} 条
          {boot.pendingEvidence > 0 ? '（在下次复盘中核对并归档）' : ''}。
        </p>
      </div>

      {weeks.length === 0 && (
        <div className="card">
          <div className="card-title"><Icon name="paper" size={15} /> 还没有证据</div>
          <p className="card-sub">完成第一个任务并留下证据后，这里会按周展示你的证据链条。</p>
        </div>
      )}

      {weeks.map((f) => (
        <div key={f.id} className="week-block">
          <div className="week-head">
            <Icon name="flag" size={15} />
            <span className="week-title">{f.title}</span>
            <span className="week-range">
              {f.week_start} — {addDays(f.week_start, 7)} · {f.evidenceCount} 条证据 ·{' '}
              {f.self_rating ? '已复盘' : f.status === 'reviewed' ? '已复盘' : '未复盘'}
            </span>
            {f.pendingEvidence > 0 && <span className="tag tag-warn">{f.pendingEvidence} 待检查</span>}
          </div>
          <div className="chain">
            {f.pendingEvidence === 0 && f.evidenceCount === 0 && <div className="chain-empty">本周没有留下证据。</div>}
            <WeekChain
              focusId={f.id}
              key={f.id}
              onOpen={open}
              onRemove={remove}
              onToggle={toggleChecked}
              onError={setError}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// 按任务分组的证据链
function WeekChain({ focusId, onOpen, onRemove, onToggle, onError }) {
  const [items, setItems] = useState(null);

  useEffect(() => {
    let alive = true;
    api.evidenceList(focusId).then((rows) => { if (alive) setItems(rows); }).catch((e) => onError(errMsg(e)));
    return () => { alive = false; };
  }, [focusId]);

  if (!items) return <div className="chain-empty">加载中…</div>;
  if (!items.length) return <div className="chain-empty">本周没有证据。</div>;

  const groups = {};
  for (const ev of items) {
    const key = ev.task_title || '未关联任务';
    (groups[key] = groups[key] || []).push(ev);
  }

  return (
    <>
      {Object.entries(groups).map(([taskTitle, evs]) => (
        <div key={taskTitle}>
          <div className="muted" style={{ fontSize: 12.5, fontWeight: 600, marginTop: 6 }}>{taskTitle}</div>
          {evs.map((ev) => (
            <div key={ev.id} className={`chain-item ${ev.checked ? 'checked' : ''}`}>
              <div className="ev-item">
                <span className="ev-kind"><Icon name={KIND_ICON[ev.kind] || 'paper'} size={15} /></span>
                <div className="ev-content">
                  {ev.content && <div className="ev-text">{ev.content}</div>}
                  {ev.file_name && (
                    <button className="ev-file" onClick={() => onOpen(ev.id)}>
                      <Icon name="external" size={12} /> {ev.file_name}
                    </button>
                  )}
                  <span className="ev-time">{fmtDateTime(ev.created_at)} · {KIND_LABEL[ev.kind]}{ev.checked ? ' · 已检查' : ' · 待检查'}</span>
                </div>
                <div className="ev-meta">
                  <input
                    className="checkbox"
                    type="checkbox"
                    checked={!!ev.checked}
                    onChange={(e) => onToggle(ev.id, e.target.checked)}
                    aria-label="标记检查状态"
                    title="复盘中是否已检查"
                  />
                  <button className="btn-icon" onClick={() => onRemove(ev.id)} aria-label="删除证据"><Icon name="trash" size={14} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ))}
    </>
  );
}
