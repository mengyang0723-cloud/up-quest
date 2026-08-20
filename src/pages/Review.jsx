import React, { useEffect, useMemo, useState } from 'react';
import { api, errMsg } from '../api.js';
import Icon from '../components/Icon.jsx';
import ReviewForm from '../components/ReviewForm.jsx';
import LineChart from '../components/LineChart.jsx';
import { dimColor, fmtDate } from '../util.js';

export default function Review({ ctx }) {
  const { active, pending, reload, setError } = ctx;
  const [history, setHistory] = useState([]);

  const load = async () => {
    try { setHistory(await api.focusHistory()); } catch (err) { setError(errMsg(err)); }
  };
  useEffect(() => { load(); }, [ctx.rev]);

  const pendingFocus = pending ? pending.focus : active && active.status === 'done' ? active : active;
  const needForm = pending || (active && (active.status === 'done' || true));

  // 成长轨迹：所有已复盘周的自评分数
  const reviewed = useMemo(() => {
    return history.filter((h) => h.self_rating && h.reviewed_at2).reverse();
  }, [history]);

  const trajSeries = useMemo(() => {
    if (!reviewed.length) return [];
    const dims = new Set();
    reviewed.forEach((r) => Object.keys(r.self_rating).forEach((k) => dims.add(k)));
    const dimsArr = [...dims];
    const overall = [];
    const series = dimsArr.map((d, i) => ({
      name: d,
      color: dimColor(i),
      points: reviewed.map((r, ri) => ({ x: `W${ri + 1}`, y: Number(r.self_rating[d]) || 0 })),
    }));
    reviewed.forEach((r, ri) => {
      const vals = dimsArr.map((d) => Number(r.self_rating[d]) || 0);
      overall.push({ x: `W${ri + 1}`, y: vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0 });
    });
    return [...series, { name: '综合', color: '#1F2937', points: overall }];
  }, [reviewed]);

  // 复盘表单（进行中/已完成目标）优先
  if (active || pending) {
    return (
      <div>
        <div className="page-head">
          <h1>复盘</h1>
          <p>周复盘模板：回顾目标 → 检查证据 → 分析差距 → 调整计划。复盘不可跳过。</p>
        </div>
        <ReviewForm focus={pendingFocus} onDone={reload} onError={setError} />
      </div>
    );
  }

  return (
    <div>
      <div className="page-head">
        <h1>复盘</h1>
        <p>没有进行中的目标。下方是历史复盘与长期成长轨迹。</p>
      </div>

      <div className="card">
        <div className="card-title"><Icon name="chart" size={15} /> 长期成长轨迹</div>
        <p className="card-sub">每周复盘时自评的各维度得分（0–6），随周数变化。完成两次以上复盘后曲线出现。</p>
        <LineChart series={trajSeries} />
        {reviewed.length === 0 && <p className="chart-tip">完成第一次复盘后，这里会出现你的第一个数据点。</p>}
      </div>

      <div className="card">
        <div className="card-title"><Icon name="loop" size={15} /> 历史复盘记录</div>
        {history.filter((h) => h.answers).length === 0 && (
          <p className="card-sub">暂无复盘记录。</p>
        )}
        {history.filter((h) => h.answers).map((h) => (
          <details key={h.id} className="review-history-item">
            <summary>
              <span>{h.title}</span>
              <span className="sub">{fmtDate(h.week_start)} · {h.self_rating ? `综合 ${(() => { const v = Object.values(h.self_rating); return (v.reduce((a, b) => a + b, 0) / v.length).toFixed(1); })()}` : ''}</span>
            </summary>
            <div className="review-answers">
              <div className="qa"><div className="q">① 回顾目标</div><div className="a">{h.answers.goal}</div></div>
              <div className="qa"><div className="q">② 检查证据</div><div className="a">{h.answers.evidence}</div></div>
              <div className="qa"><div className="q">③ 分析差距</div><div className="a">{h.answers.gap}</div></div>
              <div className="qa"><div className="q">④ 调整计划</div><div className="a">{h.answers.plan}</div></div>
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
