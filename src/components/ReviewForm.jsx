import React, { useEffect, useMemo, useState } from 'react';
import { api, errMsg } from '../api.js';
import Icon from './Icon.jsx';
import { KIND_LABEL, fmtDateTime, dimColor } from '../util.js';

// 周复盘模板（不可跳过）：回顾目标 → 检查证据 → 分析差距 → 调整计划
export default function ReviewForm({ focus, onDone, onError }) {
  const [evidences, setEvidences] = useState([]);
  const [dims, setDims] = useState([]);
  const [form, setForm] = useState({ goal: '', evidence: '', gap: '', plan: '' });
  const [ratings, setRatings] = useState({});
  const [nextTitle, setNextTitle] = useState('');
  const [nextGoal, setNextGoal] = useState('');
  const [checked, setChecked] = useState({});
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    api.evidenceList(focus.id).then((rows) => {
      setEvidences(rows);
      const map = {};
      rows.forEach((r) => { map[r.id] = true; });
      setChecked(map);
    }).catch((e) => onError(errMsg(e)));
    api.diagnosisList().then((list) => {
      const latest = list[0];
      if (latest && latest.scores && Object.keys(latest.scores).length) {
        const ds = Object.entries(latest.scores).map(([k, v], i) => ({ key: k, name: k, value: v, color: dimColor(i) }));
        setDims(ds);
        setRatings(Object.fromEntries(ds.map((d) => [d.key, Number(d.value) || 0])));
      }
    }).catch((e) => onError(errMsg(e)));
  }, [focus.id]);

  const dimNames = useMemo(() => {
    const m = {};
    dims.forEach((d) => { m[d.key] = d.name; });
    return m;
  }, [dims]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const validate = () => {
    const e = {};
    if (!form.goal.trim()) e.goal = '请回顾本周目标与完成情况';
    if (!form.evidence.trim()) e.evidence = '请对照证据检查执行情况';
    if (!form.gap.trim()) e.gap = '请写下差距与分析';
    if (!form.plan.trim()) e.plan = '请写下调整计划';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const save = async () => {
    if (!validate()) return;
    setBusy(true);
    try {
      await api.reviewSave({
        focusId: focus.id,
        answers: { goal: form.goal, evidence: form.evidence, gap: form.gap, plan: form.plan },
        ratings,
        nextTitle,
        nextGoal,
      });
      onDone();
    } catch (err) {
      onError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card">
      <div className="card-title">
        <Icon name="loop" size={16} />
        周复盘模板 · {focus.title}
      </div>
      <p className="card-sub">
        复盘不可跳过：回顾目标 → 检查证据 → 分析差距 → 调整计划。全部填写后方可提交，提交后本周目标正式归档。
      </p>

      <div className="review-section">
        <label htmlFor="rv-goal">① 回顾目标</label>
        <p className="sec-desc">本周目标：{focus.goal || focus.title}　｜　完成度自评（0–10）：</p>
        <textarea
          id="rv-goal"
          className="textarea"
          placeholder="事实描述：本周实际完成了什么？与目标相比完成度如何？"
          value={form.goal}
          onChange={(e) => set('goal', e.target.value)}
        />
        {errors.goal && <p className="danger-text" style={{ fontSize: 12, marginTop: 4 }}>{errors.goal}</p>}
      </div>

      <div className="review-section">
        <label>② 检查证据</label>
        <p className="sec-desc">逐条核对本周证据（共 {evidences.length} 条）。确认过的证据将标记为「已检查」并永久归档：</p>
        {evidences.length === 0 && (
          <p className="warn-text" style={{ fontSize: 13 }}>本周没有任何证据。请如实评估：没有证据的练习，等于没有发生。</p>
        )}
        {evidences.map((ev) => (
          <label key={ev.id} className="ev-item" style={{ cursor: 'pointer' }}>
            <input
              className="checkbox"
              type="checkbox"
              checked={!!checked[ev.id]}
              onChange={(e) => setChecked((c) => ({ ...c, [ev.id]: e.target.checked }))}
            />
            <div className="ev-content">
              {ev.content && <div className="ev-text">{ev.content}</div>}
              {ev.file_name && <span className="ev-file">{ev.file_name}</span>}
              <span className="ev-time">{fmtDateTime(ev.created_at)} · {KIND_LABEL[ev.kind]}{ev.task_title ? ` · ${ev.task_title}` : ''}</span>
            </div>
          </label>
        ))}
        {errors.evidence && <p className="danger-text" style={{ fontSize: 12, marginTop: 4 }}>{errors.evidence}</p>}
      </div>

      <div className="review-section">
        <label>③ 分析差距</label>
        <p className="sec-desc">差距在哪里？是目标太大、方法不对，还是执行不够？</p>
        <textarea
          className="textarea"
          placeholder="例：听写任务 4 天只完成 2 天，原因是安排在晚上，精力不足；方法上跟读速度跟不上……"
          value={form.gap}
          onChange={(e) => set('gap', e.target.value)}
        />
        {errors.gap && <p className="danger-text" style={{ fontSize: 12, marginTop: 4 }}>{errors.gap}</p>}
      </div>

      <div className="review-section">
        <label>④ 调整计划</label>
        <p className="sec-desc">下周如何调整（目标大小 / 时段 / 方法 / 资源）？</p>
        <textarea
          className="textarea"
          placeholder="例：任务时长从 40 分钟降到 25 分钟；固定早晨 7:30 执行；先跟读再听写……"
          value={form.plan}
          onChange={(e) => set('plan', e.target.value)}
        />
        {errors.plan && <p className="danger-text" style={{ fontSize: 12, marginTop: 4 }}>{errors.plan}</p>}
      </div>

      {dims.length > 0 && (
        <div className="review-section">
          <label>本周能力自评（用于成长轨迹，0–6 分）</label>
          <p className="sec-desc">沿用上次诊断的维度，拖动滑块记录本周感受：</p>
          {dims.map((d) => (
            <div className="rating-row" key={d.key}>
              <span className="rating-name">{dimNames[d.key] || d.key}</span>
              <input
                className="rating-input"
                type="range"
                min="0"
                max="6"
                step="0.5"
                value={ratings[d.key] ?? 0}
                onChange={(e) => setRatings((r) => ({ ...r, [d.key]: Number(e.target.value) }))}
                aria-label={`${d.key} 自评`}
              />
              <span className="rating-val">{Number(ratings[d.key] ?? 0).toFixed(1)}</span>
            </div>
          ))}
        </div>
      )}

      <div className="review-section">
        <label htmlFor="rv-next">下周目标（可选，提交后立即开启新一周）</label>
        <p className="sec-desc">依据本次差距分析，写下下周唯一要聚焦的小目标：</p>
        <input
          id="rv-next"
          className="input"
          placeholder="例：每天 25 分钟英语听写，连续 5 天"
          value={nextTitle}
          onChange={(e) => setNextTitle(e.target.value)}
        />
        <textarea
          className="textarea mt8"
          placeholder="目标描述（可选）：具体做到什么程度、怎么检验……"
          value={nextGoal}
          onChange={(e) => setNextGoal(e.target.value)}
        />
      </div>

      <div className="flex-between mt16">
        <span className="muted" style={{ fontSize: 12 }}>提交后本周目标将归档为「已复盘」，数据进入成长轨迹。</span>
        <button className="btn btn-primary" onClick={save} disabled={busy}>
          <Icon name="check" size={14} /> 提交复盘（不可跳过）
        </button>
      </div>
    </div>
  );
}
