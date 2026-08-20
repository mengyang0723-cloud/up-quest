import React, { useState } from 'react';
import { api, errMsg } from '../api.js';
import Icon from './Icon.jsx';

// 制定本周目标：标题 + 目标描述 + 从推荐任务中挑选（可改时长）+ 自定义任务
export default function GoalForm({ recommendations = [], onDone, onError, submitLabel = '开启本周目标' }) {
  const [title, setTitle] = useState('');
  const [goal, setGoal] = useState('');
  const [picked, setPicked] = useState({});
  const [minutes, setMinutes] = useState({});
  const [customTitle, setCustomTitle] = useState('');
  const [customDetail, setCustomDetail] = useState('');
  const [customMinutes, setCustomMinutes] = useState(30);
  const [customs, setCustoms] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const toggle = (t) => {
    setPicked((p) => {
      const next = { ...p };
      if (next[t.id]) delete next[t.id];
      else next[t.id] = true;
      return next;
    });
    setMinutes((m) => ({ ...m, [t.id]: m[t.id] ?? t.minutes }));
  };

  const addCustom = () => {
    const name = customTitle.trim();
    if (!name) return;
    setCustoms((c) => [...c, { title: name, detail: customDetail.trim(), minutes: customMinutes, source: 'manual', _k: Date.now() }]);
    setCustomTitle('');
    setCustomDetail('');
  };

  const removeCustom = (k) => setCustoms((c) => c.filter((x) => x._k !== k));

  const submit = async () => {
    if (!title.trim()) { setError('请为本周目标起一个标题（唯一聚焦的小目标）。'); return; }
    setBusy(true);
    setError('');
    try {
      const tasks = [
        ...recommendations.filter((t) => picked[t.id]).map((t) => ({
          title: t.title, detail: t.detail, minutes: Number(minutes[t.id]) || t.minutes, source: 'recommend',
        })),
        ...customs.map((c) => ({ title: c.title, detail: c.detail, minutes: c.minutes, source: 'manual' })),
      ];
      await api.focusCreate({ title: title.trim(), goal: goal.trim(), tasks });
      onDone();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="card">
        <div className="card-title"><Icon name="flag" size={15} /> 制定本周目标（单线程：每周只聚焦这一件事）</div>
        <p className="card-sub">目标越小越具体越好；任务时长建议 25–45 分钟，每个任务都要能产出证据。</p>

        <div className="field">
          <label htmlFor="gf-title">本周目标标题 *</label>
          <input id="gf-title" className="input" placeholder="例：每天 30 分钟英语听力精听，连续 5 天"
            value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="gf-goal">目标描述（做到什么程度、如何检验）</label>
          <textarea id="gf-goal" className="textarea" placeholder="例：完成 5 篇听写，错词率从 30% 降到 20% 以下；每天录音 1 分钟作为证据。"
            value={goal} onChange={(e) => setGoal(e.target.value)} />
        </div>
      </div>

      {recommendations.length > 0 && (
        <div className="card">
          <div className="card-title"><Icon name="target" size={15} /> 推荐任务（依据诊断短板，可勾选、可改时长）</div>
          <p className="card-sub">未勾选的任务不会进入本周；稍后也可在任务页手动调整。</p>
          {recommendations.map((t) => (
            <div key={t.id} className="rec-item" style={{ borderColor: picked[t.id] ? 'var(--accent-line)' : undefined, background: picked[t.id] ? 'var(--accent-soft)' : undefined }}>
              <input
                className="checkbox"
                type="checkbox"
                checked={!!picked[t.id]}
                onChange={() => toggle(t)}
                aria-label={`选择任务：${t.title}`}
              />
              <div className="rec-main">
                <div className="rec-title">{t.title}</div>
                <div className="rec-detail">{t.detail}</div>
                <div className="rec-meta">
                  <span className="tag">建议 {t.minutes} 分钟</span>
                  <span className="tag tag-accent">证据：{(t.kinds || []).map((k) => ({ text: '文本', image: '图片', audio: '录音', file: '文件' }[k])).join(' / ')}</span>
                  <label className="flex" style={{ marginLeft: 8, fontSize: 12.5 }}>
                    时长
                    <input
                      className="minutes-input"
                      type="number"
                      min="5"
                      max="240"
                      value={minutes[t.id] ?? t.minutes}
                      onChange={(e) => setMinutes((m) => ({ ...m, [t.id]: Number(e.target.value) }))}
                      aria-label={`${t.title} 时长`}
                    />
                    分钟
                  </label>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <div className="card-title"><Icon name="plus" size={15} /> 自定义任务（可选）</div>
        <p className="card-sub">诊断覆盖不到的需求，手动补上——同样必须能产出证据。</p>
        <div className="field">
          <input className="input" placeholder="任务标题" value={customTitle} onChange={(e) => setCustomTitle(e.target.value)} />
        </div>
        <div className="field">
          <textarea className="textarea" style={{ minHeight: 52 }} placeholder="任务说明（做什么、产出什么）"
            value={customDetail} onChange={(e) => setCustomDetail(e.target.value)} />
        </div>
        <div className="flex-between">
          <label className="flex" style={{ fontSize: 13 }}>
            时长
            <input className="minutes-input" type="number" min="5" max="240" value={customMinutes}
              onChange={(e) => setCustomMinutes(Number(e.target.value))} />
            分钟
          </label>
          <button className="btn" onClick={addCustom} disabled={!customTitle.trim()}>加入任务</button>
        </div>
        {customs.length > 0 && (
          <div className="mt16">
            {customs.map((c) => (
              <div key={c._k} className="ev-item">
                <Icon name="flag" size={14} />
                <div className="ev-content">
                  <div className="ev-text">{c.title} <span className="tag">{c.minutes} 分钟</span></div>
                  {c.detail && <div className="ev-text muted" style={{ fontSize: 12.5 }}>{c.detail}</div>}
                </div>
                <button className="btn-icon" onClick={() => removeCustom(c._k)} aria-label="移除"><Icon name="trash" size={14} /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && <p className="danger-text" style={{ fontSize: 13, marginTop: 12 }}>{error}</p>}
      <div className="flex-between mt24">
        <span className="muted" style={{ fontSize: 12 }}>
          已选 {Object.keys(picked).length + customs.length} 个任务
        </span>
        <button className="btn btn-primary" onClick={submit} disabled={busy}>
          <Icon name="flag" size={14} /> {submitLabel}
        </button>
      </div>
    </div>
  );
}
