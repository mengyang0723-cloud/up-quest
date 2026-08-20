import React from 'react';

// 内联 SVG 图标（线性风格，1.5px 描边）。禁止 emoji 图标。
const PATHS = {
  check: <path d="M4 12.5l5 5L20 6.5" />,
  target: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  doc: (
    <>
      <path d="M6 2.5h8L19 7.5v14H6z" />
      <path d="M14 2.5v5h5" />
      <path d="M9 12h7M9 16h7" />
    </>
  ),
  paper: (
    <>
      <path d="M6 2.5h8L19 7.5v14H6z" />
      <path d="M14 2.5v5h5" />
      <path d="M9 12h7M9 16h7" />
    </>
  ),
  image: (
    <>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
      <circle cx="9" cy="10" r="1.6" />
      <path d="M4 17.5l4.5-4.5 3.5 3.5 3-3 4 4" />
    </>
  ),
  mic: (
    <>
      <rect x="9" y="2.5" width="6" height="12" rx="3" />
      <path d="M5.5 11.5a6.5 6.5 0 0013 0M12 18v3.5" />
    </>
  ),
  file: (
    <>
      <path d="M6 2.5h8L19 7.5v14H6z" />
      <path d="M14 2.5v5h5" />
    </>
  ),
  folder: <path d="M3 6.5h6l2 2.5h10v10.5a2 2 0 01-2 2H5a2 2 0 01-2-2z" />,
  trash: (
    <>
      <path d="M4.5 6.5h15M9.5 6.5V4.5h5v2M6.5 6.5l1 13h9l1-13M10 10.5v6M14 10.5v6" />
    </>
  ),
  chart: (
    <>
      <path d="M4 20V10M10 20V4M16 20v-8M22 20H2" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  gear: (
    <>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 2.8v3M12 18.2v3M2.8 12h3M18.2 12h3M5.5 5.5l2.1 2.1M16.4 16.4l2.1 2.1M18.5 5.5l-2.1 2.1M7.6 16.4l-2.1 2.1" />
    </>
  ),
  loop: (
    <>
      <path d="M20 12a8 8 0 11-2.34-5.66" />
      <path d="M20 3.5v5h-5" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7v5.5l3.5 2" />
    </>
  ),
  play: <path d="M7 4.5l12 7.5-12 7.5z" />,
  pause: <path d="M8 5v14M16 5v14" />,
  stop: <rect x="7" y="7" width="10" height="10" rx="1.5" />,
  refresh: (
    <>
      <path d="M20 12a8 8 0 11-2.34-5.66" />
      <path d="M20 3.5v5h-5" />
    </>
  ),
  external: <path d="M14 4h6v6M20 4L10.5 13.5M18 13v6a1.5 1.5 0 01-1.5 1.5h-11A1.5 1.5 0 013.5 19V8A1.5 1.5 0 015 6.5h6" />,
  x: <path d="M6 6l12 12M18 6L6 18" />,
  flag: <path d="M6 21V4m0 1h11l-2.5 3.5L17 12H6" />,
  radar: (
    <>
      <path d="M12 2l8.5 5v10L12 22l-8.5-5V7z" />
      <path d="M12 2v20M3.5 7l17 10M20.5 7l-17 10" />
    </>
  ),
};

export default function Icon({ name, size = 16, className = '' }) {
  return (
    <svg
      className={`icon ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name] || PATHS.doc}
    </svg>
  );
}
