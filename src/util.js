// 轻量日期/格式化工具（全部基于本地时区）

export function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// 'YYYY-MM-DD' -> 本地时间戳
export function localDateMs(ws) {
  const [y, m, d] = String(ws).split('-').map(Number);
  return new Date(y, m - 1, d).getTime();
}

export function addDays(ws, days) {
  const ms = localDateMs(ws) + days * 86400000;
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function weekDueMs(ws) {
  return localDateMs(ws) + 7 * 86400000;
}

// 距离某个毫秒时间戳的倒计时文本
export function fmtCountdown(ms) {
  const diff = ms - Date.now();
  if (diff <= 0) return '已到期';
  const totalH = Math.floor(diff / 3600000);
  const days = Math.floor(totalH / 24);
  const hours = totalH % 24;
  if (days > 0) return `${days} 天 ${hours} 小时`;
  const mins = Math.floor((diff % 3600000) / 60000);
  return `${hours} 小时 ${mins} 分`;
}

export function fmtDate(isoOrWs) {
  if (!isoOrWs) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(isoOrWs)) {
    const [y, m, d] = isoOrWs.split('-').map(Number);
    return `${y} 年 ${m} 月 ${d} 日`;
  }
  const d = new Date(isoOrWs);
  if (Number.isNaN(d.getTime())) return isoOrWs;
  return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日`;
}

export function fmtDateTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${d.getMonth() + 1}月${d.getDate()}日 ${hh}:${mm}`;
}

export function weekLabel(ws) {
  return `${ws}（第 ${Math.floor((localDateMs(ws) - localDateMs(todayStr())) / 86400000) + 1} 天）`;
}

export function isOverdue(ws) {
  return Date.now() >= weekDueMs(ws);
}

// 维度折线配色（克制、低饱和）
export const DIM_COLORS = [
  '#0F766E', '#B45309', '#4F46E5', '#BE185D', '#15803D',
  '#7C3AED', '#0369A1', '#A16207', '#9F1239', '#166534',
];

export function dimColor(i) {
  return DIM_COLORS[i % DIM_COLORS.length];
}

export const KIND_LABEL = {
  text: '文本',
  image: '图片',
  audio: '录音',
  file: '文件',
};

export const STATUS_LABEL = {
  todo: '待执行',
  done: '已完成',
  abandoned: '已放弃',
};
