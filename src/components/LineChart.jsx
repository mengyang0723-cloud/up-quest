import React from 'react';

// 多序列折线图：series = [{ name, color, points: [{ x, y }] }]，x 为标签字符串
export default function LineChart({ series, height = 240, max = 6 }) {
  const W = 760;
  const H = height;
  const padL = 30;
  const padR = 14;
  const padT = 14;
  const padB = 30;

  const all = series.flatMap((s) => s.points);
  if (!all.length) return <p className="muted">完成两次以上复盘后，这里会出现成长轨迹。</p>;

  const xLabels = [...new Set(all.map((p) => p.x))];
  const xAt = (i) => padL + (i * (W - padL - padR)) / Math.max(1, xLabels.length - 1);
  const yAt = (v) => padT + (1 - Math.max(0, Math.min(max, v)) / max) * (H - padT - padB);

  const gridYs = [0, 1, 2, 3, 4, 5, 6].filter((v) => v <= max);

  return (
    <div>
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" role="img"
        aria-label={`成长轨迹图：${series.map((s) => `${s.name} ${s.points.map((p) => `${p.x}:${p.y}`).join('/')}`).join('；')}`}>
        {gridYs.map((v) => (
          <g key={v}>
            <line x1={padL} y1={yAt(v)} x2={W - padR} y2={yAt(v)} stroke="#EEEEEA" strokeWidth="1" />
            <text x={padL - 8} y={yAt(v) + 3.5} textAnchor="end" fontSize="10" fill="#9CA3AF">{v}</text>
          </g>
        ))}
        {xLabels.map((x, i) => (
          <text key={i} x={xAt(i)} y={H - 10} textAnchor="middle" fontSize="11" fill="#9CA3AF">{x}</text>
        ))}
        {series.map((s) => (
          <g key={s.name}>
            <polyline
              points={s.points.map((p, i) => `${xAt(i)},${yAt(p.y)}`).join(' ')}
              fill="none"
              stroke={s.color}
              strokeWidth="1.8"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {s.points.map((p, i) => (
              <circle key={i} cx={xAt(i)} cy={yAt(p.y)} r="3" fill="#fff" stroke={s.color} strokeWidth="1.6" />
            ))}
          </g>
        ))}
      </svg>
      {series.length > 1 && (
        <div className="traj-legend">
          {series.map((s) => (
            <span key={s.name} className="legend-chip">
              <span className="legend-dot" style={{ background: s.color }} />
              {s.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
