import React, { useMemo, useState } from 'react';
import { api, errMsg } from '../api.js';
import Icon from '../components/Icon.jsx';
import RadarChart from '../components/RadarChart.jsx';
import GoalForm from '../components/GoalForm.jsx';
import { CEFR_SKILLS, CEFR_LEVELS } from '../data/cefr.js';
import { DEFAULT_TEMPLATE, scaleTo06 } from '../data/defaultTemplate.js';
import { recommend } from '../data/taskCatalog.js';

const PRINCIPLES = [
  { n: '01', t: '不设收藏，只设执行', d: '每个任务都必须产出具体证据文件：文本、截图或录音。没有证据，等于没有练习。' },
  { n: '02', t: '强制单线程', d: '每周只聚焦 1 个小目标，完成并复盘后才能开启新目标。' },
  { n: '03', t: '数据 100% 本地', d: 'SQLite + JSON，全部存在你的电脑里，随时导出备份，你拥有完整控制权。' },
  { n: '04', t: '复盘不可跳过', d: '每周强制弹出复盘模板：回顾目标 → 检查证据 → 分析差距 → 调整计划。' },
];

export default function Onboard({ onDone }) {
  const [step, setStep] = useState(0); // 0 理念 / 1 CEFR / 2 报告 / 3 自定义诊断 / 4 目标
  const [answers, setAnswers] = useState({}); // skillKey -> levelIndex(0-6)
  const [cefrResult, setCefrResult] = useState(null);
  const [customResult, setCustomResult] = useState(null);
  const [customAnswers, setCustomAnswers] = useState({}); // dimKey -> [1-5...]
  const [customTemplate, setCustomTemplate] = useState(DEFAULT_TEMPLATE);
  const [error, setError] = useState('');

  const cefrReady = useMemo(() => CEFR_SKILLS.every((s) => typeof answers[s.key] === 'number'), [answers]);

  const saveCefr = async () => {
    if (!cefrReady) { setError('请完成全部 5 项技能的自测。'); return; }
    const scores = {};
    CEFR_SKILLS.forEach((s) => { scores[s.key] = answers[s.key]; });
    const avg = Object.values(scores).reduce((a, b) => a + b, 0) / 5;
    try {
      await api.diagnosisSave({
        kind: 'cefr', templateId: 'cefr', title: '英语能力（CEFR 自测）', scores,
        overall: Math.round(avg * 10) / 10,
      });
      setCefrResult(scores);
      setError('');
      setStep(2);
    } catch (err) { setError(errMsg(err)); }
  };

  const saveCustom = async () => {
    const dims = customTemplate.dimensions;
    const missing = dims.some((d) => !customAnswers[d.key] || customAnswers[d.key].length !== d.questions.length);
    if (missing) { setError('请完成自定义诊断的全部问题。'); return; }
    const scores = {};
    dims.forEach((d) => {
      const arr = customAnswers[d.key];
      const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
      scores[d.key] = scaleTo06(avg);
    });
    const avg = Object.values(scores).reduce((a, b) => a + b, 0) / Object.keys(scores).length;
    try {
      await api.diagnosisSave({
        kind: 'custom', templateId: customTemplate.id, title: customTemplate.title, scores,
        overall: Math.round(avg * 10) / 10,
      });
      setCustomResult(scores);
      setError('');
      setStep(2);
    } catch (err) { setError(errMsg(err)); }
  };

  const dimsOf = (scores) => Object.entries(scores).map(([k, v], i) => ({ name: dimName(k), value: v, key: k }));

  const dimName = (k) => {
    const s = CEFR_SKILLS.find((x) => x.key === k);
    if (s) return s.name;
    const d = customTemplate.dimensions.find((x) => x.key === k);
    return d ? d.name : k;
  };

  const recs = useMemo(() => {
    const scores = customResult ? { ...cefrResult, ...customResult } : cefrResult;
    return scores ? recommend(scores, 5) : [];
  }, [cefrResult, customResult]);

  const levelLabel = (v) => (v === 0 ? '未达 A1' : CEFR_LEVELS[v - 1]);

  return (
    <div className="onboard">
      {step === 0 && (
        <>
          <div className="onboard-head">
            <div className="mark"><Icon name="loop" size={26} /></div>
            <h1>UP 进阶</h1>
            <p>基于《人生进阶指南》理念的可检查的循环：<b>诊断现状 → 选择任务 → 主动练习 → 获得反馈 → 留下证据 → 调整下一步</b>。</p>
          </div>
          <div className="principle-grid">
            {PRINCIPLES.map((p) => (
              <div className="principle" key={p.n}>
                <div className="p-num">{p.n}</div>
                <div className="p-title">{p.t}</div>
                <div className="p-text">{p.d}</div>
              </div>
            ))}
          </div>
          <div className="step-nav">
            <span className="muted" style={{ fontSize: 12.5 }}>首次使用：先完成诊断，再制定本周目标</span>
            <button className="btn btn-primary" onClick={() => setStep(1)}>开始诊断 <Icon name="play" size={13} /></button>
          </div>
        </>
      )}

      {step === 1 && (
        <>
          <div className="onboard-head">
            <h1>英语能力自测（CEFR）</h1>
            <p>共 5 项技能，每项选择「你目前能稳定做到的最高级别」。约 3 分钟，结果用于推荐任务。</p>
          </div>
          {CEFR_SKILLS.map((s) => (
            <div className="skill-block" key={s.key}>
              <div className="skill-name"><Icon name="target" size={15} /> {s.name}</div>
              {[{ level: '未达 A1', text: '还不能稳定做到 A1 的任何一项。', v: 0 }, ...s.levels.map((l, i) => ({ ...l, v: i + 1 }))].map((opt) => (
                <label key={opt.v} className={`level-option ${answers[s.key] === opt.v ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name={`cefr-${s.key}`}
                    checked={answers[s.key] === opt.v}
                    onChange={() => setAnswers((a) => ({ ...a, [s.key]: opt.v }))}
                  />
                  <span className="lv">{opt.level}</span>
                  <span>{opt.text}</span>
                </label>
              ))}
            </div>
          ))}
          {error && <p className="danger-text" style={{ marginTop: 12 }}>{error}</p>}
          <div className="step-nav">
            <button className="btn" onClick={() => setStep(0)}>上一步</button>
            <button className="btn btn-primary" onClick={saveCefr} disabled={!cefrReady}>生成诊断报告</button>
          </div>
        </>
      )}

      {step === 2 && cefrResult && (
        <>
          <div className="onboard-head">
            <h1>诊断报告</h1>
            <p>短板维度会自动生成任务推荐。可补充「工作与 AI 素养」诊断，也可以直接制定本周目标。</p>
          </div>
          <div className="card">
            <div className="card-title"><Icon name="radar" size={15} /> 英语能力雷达（0–6，A1–C2）</div>
            <RadarChart dims={dimsOf(cefrResult)} />
            <div className="flex" style={{ flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
              {Object.entries(cefrResult).map(([k, v]) => (
                <span className="tag" key={k}>{dimName(k)}：{levelLabel(v)}（{v} 分）</span>
              ))}
            </div>
          </div>

          {customResult && (
            <div className="card">
              <div className="card-title"><Icon name="radar" size={15} /> {customTemplate.title}（0–6）</div>
              <RadarChart dims={dimsOf(customResult)} />
              <div className="flex" style={{ flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
                {Object.entries(customResult).map(([k, v]) => (
                  <span className="tag tag-accent" key={k}>{dimName(k)}：{Number(v).toFixed(1)} 分</span>
                ))}
              </div>
            </div>
          )}

          <div className="card">
            <div className="card-title"><Icon name="check" size={15} /> 推荐任务（来自短板维度）</div>
            {recs.map((t) => (
              <div className="rec-item" key={t.id}>
                <div className="rec-main">
                  <div className="rec-title">{t.title} <span className="tag tag-accent">{t.minutes} 分钟</span></div>
                  <div className="rec-detail">{t.detail}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="step-nav">
            <button className="btn" onClick={() => setStep(1)}>重新自测</button>
            <div className="flex">
              {!customResult && (
                <button className="btn" onClick={() => { setStep(3); setError(''); }}>
                  <Icon name="plus" size={14} /> 补充工作 / AI 素养诊断
                </button>
              )}
              <button className="btn btn-primary" onClick={() => setStep(4)}>制定本周目标 <Icon name="flag" size={14} /></button>
            </div>
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <div className="onboard-head">
            <h1>{customTemplate.title}</h1>
            <p>按 1（完全不符）– 5（完全符合）为每句话打分。可在设置页添加自定义模板。</p>
          </div>
          {customTemplate.dimensions.map((d) => (
            <div className="skill-block" key={d.key}>
              <div className="skill-name">{d.name}</div>
              {d.questions.map((q, qi) => (
                <div key={qi} className="level-option" style={{ display: 'block', padding: '6px 10px' }}>
                  <div style={{ fontSize: 13 }}>{qi + 1}. {q}</div>
                  <div className="flex" style={{ marginTop: 6, gap: 4 }}>
                    {[1, 2, 3, 4, 5].map((v) => (
                      <button
                        key={v}
                        type="button"
                        className={`btn btn-sm ${customAnswers[d.key]?.[qi] === v ? 'btn-primary' : ''}`}
                        onClick={() => setCustomAnswers((a) => {
                          const arr = [...(a[d.key] || [])];
                          arr[qi] = v;
                          return { ...a, [d.key]: arr };
                        })}
                      >
                        {v}
                      </button>
                    ))}
                    <span className="muted" style={{ fontSize: 12, marginLeft: 6 }}>
                      {['非常不符', '不太符', '一般', '比较符', '非常符合'][(customAnswers[d.key]?.[qi] || 1) - 1]}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ))}
          {error && <p className="danger-text">{error}</p>}
          <div className="step-nav">
            <button className="btn" onClick={() => setStep(2)}>上一步</button>
            <button className="btn btn-primary" onClick={saveCustom}>生成报告</button>
          </div>
        </>
      )}

      {step === 4 && (
        <>
          <div className="onboard-head">
            <h1>开启你的第一个循环</h1>
            <p>目标一旦创建，本周就只聚焦它。完成并复盘后，才能开启下一个。</p>
          </div>
          <GoalForm
            recommendations={recs}
            onDone={onDone}
            onError={setError}
            submitLabel="创建本周目标，开始执行"
          />
        </>
      )}
    </div>
  );
}
