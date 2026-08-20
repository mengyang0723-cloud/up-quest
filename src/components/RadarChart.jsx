import React from 'react';

// SVG 雷达图：dims = [{ name, value 0-6 }]，max 默认 6
export default function RadarChart({ dims, max = 6, size = 380 }) {
  const n = dims.length;
  if (!n) return <p className="muted">暂无数据</p>;
  const cx = size / 2;
  const cy = size / 2;
  const R = size / 2 - 46;
  const angle = (i) => (Math.PI * 2 * i) / n - Math.PI / 2;
  const pt = (i, r) => [cx + Math.cos(angle(i)) * r, cy + Math.sin(angle(i)) * r];

  const rings = [1, 2, 3, 4, 5, 6].filter((v) => v <= max);
  const poly = dims
    .map((d, i) => {
      const [x, y] = pt(i, (Math.max(0, Math.min(max, d.value || 0)) / max) * R);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const avg = dims.reduce((s, d) => s + Number(d.value || 0), 0) / n;

  return (
    <div className="radar-wrap">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img"
        aria-label={`雷达图：${dims.map((d) => `${d.name} ${d.value} 分`).join('，')}，平均 ${avg.toFixed(1)} 分`}>
        {/* 网格环 */}
        {rings.map((r) => (
          <polygon
            key={r}
            points={dims.map((_, i) => pt(i, (r / max) * R).join(',')).join(' ')}
            fill="none"
            stroke="#E5E7EB"
            strokeWidth="1"
          />
        ))}
        {/* 轴线 */}
        {dims.map((_, i) => {
          const [x, y] = pt(i, R);
          return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#E5E7EB" strokeWidth="1" />;
        })}
        {/* 数据多边形 */}
        <polygon points={poly} fill="rgba(15,118,110,.12)" stroke="#0F766E" strokeWidth="1.8" strokeLinejoin="round" />
        {dims.map((d, i) => {
          const [x, y] = pt(i, (Math.max(0, Math.min(max, d.value || 0)) / max) * R);
          return <circle key={i} cx={x} cy={y} r="3.2" fill="#0F766E" />;
        })}
        {/* 标签 */}
        {dims.map((d, i) => {
          const [x, y] = pt(i, R + 22);
          const anchor = Math.abs(x - cx) < 6 ? 'middle' : x > cx ? 'start' : 'end';
          return (
            <g key={i}>
              <text x={x} y={y} textAnchor={anchor} fontSize="12.5" fontWeight="600" fill="#1F2937">{d.name}</text>
              <text x={x} y={y + 15} textAnchor={anchor} fontSize="11" fontWeight="500" fill="#9CA3AF" fontFamily="inherit">
                {Number(d.value || 0).toFixed(1)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
