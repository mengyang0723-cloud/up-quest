import React, { useEffect, useMemo, useState } from 'react';
import { api, errMsg } from '../api.js';
import Icon from '../components/Icon.jsx';
import EvidenceBox from '../components/EvidenceBox.jsx';
import GoalForm from '../components/GoalForm.jsx';
import { recommend } from '../data/taskCatalog.js';
import { isOverdue, weekDueMs, fmtCountdown, fmtDate, addDays, STATUS_LABEL } from '../util.js';

export default function Focus({ ctx }) {
  const { active, reload, setRoute, setError } = ctx;
  const [focus, setFocus] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [diag, setDiag] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const [customDetail, setCustomDetail] = useState('');
  const [customMinutes, setCustomMinutes] = useState(30);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const f = await api.focusActive();
      setFocus(f);
      if (f) setTasks(await api.taskList(f.id));
      const list = await api.diagnosisList();
      setDiag(list[0] || null);
    } catch (err) { setError(errMsg(err)); }
  };

  useEffect(() => { load(); }, [ctx.rev]);

  const recs = useMemo(() => (diag ? recommend(diag.scores, 4) : []), [diag]);

  const setStatus = async (t, status) => {
    try {
      await api.taskUpdate({ id: t.id, patch: { status } });
      await load();
      reload();
    } catch (err) { setError(errMsg(err)); }
  };

  const removeTask = async (t) => {
    if (!window.confirm(`删除任务「${t.title}」？其下的证据将一并删除。`)) return;
    try { await api.taskDelete(t.id); await load(); } catch (err) { setError(errMsg(err)); }
  };

  const addTask = async (title, detail, minutes, source) => {
    if (!title.trim()) return;
    setBusy(true);
    try {
      await api.taskCreate({ focusId: focus.id, title, detail, minutes, source });
      await load();
      setCustomTitle(''); setCustomDetail('');
      setAddOpen(false);
    } catch (err) { setError(errMsg(err)); } finally { setBusy(false); }
  };

  const completeFocus = async () => {
    if (!window.confirm('确认完成本周目标？完成后必须填写复盘才能开启新目标。')) return;
    try {
      await api.focusComplete();
      await reload();
      setRoute('review');
    } catch (err) { setError(errMsg(err)); }
  };

  // 无进行中目标 → 制定新目标
  if (!active) {
    return (
      <div>
        <div className="page-head">
          <h1>本周任务</h1>
          <p>单线程模式：每周只聚焦 1 个小目标。诊断与复盘已就绪，现在制定本周唯一目标。</p>
        </div>
        <GoalForm recommendations={recs} onDone={reload} onError={setError} />
      </div>
    );
  }

  const doneCount = tasks.filter((t) => t.status === 'done').length;
  const overdue = isOverdue(focus.week_start);
  const current = tasks.find((t) => t.status === 'todo');

  return (
    <div>
      <div className="page-head">
        <h1>本周任务</h1>
        <p>任务页面附带证据产出框——每个任务必须留下可检查的证据。</p>
      </div>

      <div className="card">
        <div className="focus-head">
          <div>
            <div className="focus-title">
              {focus.title}
              <span className="tag tag-accent">进行中</span>
              {overdue ? <span className="tag tag-warn">复盘已到期</span> : <span className="tag">距复盘 {fmtCountdown(weekDueMs(focus.week_start))}</span>}
            </div>
            {focus.goal && <p className="focus-goal">{focus.goal}</p>}
            <div className="focus-meta">
              <span className="tag">开始 {fmtDate(focus.week_start)}</span>
              <span className="tag">截止 {fmtDate(addDays(focus.week_start, 7))}</span>
              <span className="tag">证据 {focus.evidenceCount} 条</span>
            </div>
          </div>
          <button className="btn btn-primary" onClick={completeFocus}>
            <Icon name="check" size={14} /> 完成目标
          </button>
        </div>
        <div className="progress">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: tasks.length ? `${(doneCount / tasks.length) * 100}%` : '0%' }} />
          </div>
          <div className="progress-note">
            <span>任务进度 {doneCount}/{tasks.length}</span>
            {current && <span>当前应执行：{current.title}</span>}
            {!current && tasks.length > 0 && <span>本周任务已全部收尾，记得完成目标并复盘</span>}
          </div>
        </div>
      </div>

      {tasks.map((t) => (
        <div key={t.id} className="task">
          <div className="task-head">
            <div className="task-main">
              <div className={`task-title ${t.status === 'done' ? 'done' : ''}`}>
                {t.title}
                <span className={`tag ${t.status === 'done' ? 'tag-ok' : t.status === 'abandoned' ? '' : 'tag-accent'}`}>
                  {STATUS_LABEL[t.status]}
                </span>
                <span className="tag">{t.minutes} 分钟</span>
                {t.source === 'recommend' && <span className="tag">诊断推荐</span>}
              </div>
              {t.detail && <p className="task-detail">{t.detail}</p>}
            </div>
            <div className="task-actions">
              {t.status === 'todo' && (
                <button className="btn btn-sm btn-primary" onClick={() => setStatus(t, 'done')}>完成</button>
              )}
              {t.status === 'done' && (
                <button className="btn btn-sm" onClick={() => setStatus(t, 'todo')}>恢复</button>
              )}
              {t.status === 'todo' && (
                <button className="btn btn-sm" onClick={() => setStatus(t, 'abandoned')}>放弃</button>
              )}
              {t.status === 'abandoned' && (
                <button className="btn btn-sm" onClick={() => setStatus(t, 'todo')}>恢复</button>
              )}
              <button className="btn-icon" onClick={() => removeTask(t)} aria-label="删除任务"><Icon name="trash" size={14} /></button>
            </div>
          </div>
          <EvidenceBox focusId={focus.id} taskId={t.id} />
        </div>
      ))}

      <div className="card mt16">
        <div className="flex-between">
          <div className="card-title" style={{ marginBottom: 0 }}><Icon name="plus" size={15} /> 添加任务</div>
          <button className="btn btn-sm" onClick={() => setAddOpen(!addOpen)}>
            {addOpen ? '收起' : '展开'}
          </button>
        </div>
        {addOpen && (
          <div className="mt16">
            {recs.length > 0 && (
              <>
                <p className="card-sub">诊断推荐（点击直接加入）：</p>
                <div className="flex" style={{ flexWrap: 'wrap', gap: 8 }}>
                  {recs.map((r) => (
                    <button key={r.id} className="btn btn-sm" onClick={() => addTask(r.title, r.detail, r.minutes, 'recommend')}>
                      <Icon name="plus" size={12} /> {r.title}（{r.minutes} 分钟）
                    </button>
                  ))}
                </div>
                <div className="divider" />
              </>
            )}
            <div className="field">
              <label htmlFor="ft-title">任务标题 *</label>
              <input id="ft-title" className="input" placeholder="例：慢速英语逐句听写"
                value={customTitle} onChange={(e) => setCustomTitle(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="ft-detail">任务说明与产出要求</label>
              <textarea id="ft-detail" className="textarea" style={{ minHeight: 56 }}
                placeholder="做什么、产出什么证据（文本 / 截图 / 录音）"
                value={customDetail} onChange={(e) => setCustomDetail(e.target.value)} />
            </div>
            <div className="flex-between">
              <label className="flex" style={{ fontSize: 13 }}>
                时长
                <input className="minutes-input" type="number" min="5" max="240" value={customMinutes}
                  onChange={(e) => setCustomMinutes(Number(e.target.value))} />
                分钟
              </label>
              <button className="btn btn-primary" disabled={busy || !customTitle.trim()} onClick={() => addTask(customTitle, customDetail, customMinutes, 'manual')}>
                加入本周任务
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
