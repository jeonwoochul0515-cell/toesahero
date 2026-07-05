// 네오브루탈리즘 톤(굵은 2.5px stroke, 각진 캡)으로 통일한 인라인 SVG 아이콘 세트 — 이모지 대체용
import type { CSSProperties } from "react";

export type IconName =
  // UI
  | "chat"
  | "phone"
  | "compass"
  | "calc"
  | "scale"
  | "clock"
  | "arrow"
  | "check"
  | "external"
  | "megaphone"
  | "handshake"
  | "doc"
  | "coins"
  // Audience / Calculator 스팟
  | "monday"
  | "ghost"
  | "twoface"
  | "contract"
  | "siren"
  | "gavel"
  | "receipt"
  | "bank"
  | "palm"
  | "moon"
  | "mail"
  | "lock"
  | "warning"
  | "card"
  | "pin"
  | "globe"
  | "home"
  | "help"
  | "clipboard"
  | "paperclip"
  | "x"
  | "shield"
  | "building"
  | "bulb"
  | "info";

type Props = {
  name: IconName;
  size?: number;
  className?: string;
  style?: CSSProperties;
  strokeWidth?: number;
};

// 각 아이콘은 24x24 그리드, stroke=currentColor 로 부모 색을 따라감
const paths: Record<IconName, React.ReactNode> = {
  chat: (
    <>
      <path d="M4 5h16v11H9l-4 4v-4H4z" />
      <path d="M8 9h8M8 12h5" />
    </>
  ),
  phone: (
    <path d="M6 3l3 1 1 4-2 2a11 11 0 0 0 5 5l2-2 4 1 1 3a2 2 0 0 1-2 2A16 16 0 0 1 4 6a2 2 0 0 1 2-3z" />
  ),
  compass: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M15.5 8.5l-2 5-5 2 2-5z" />
    </>
  ),
  calc: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="1.5" />
      <path d="M8 7h8" />
      <path d="M8.5 12h.01M12 12h.01M15.5 12h.01M8.5 16h.01M12 16h.01M15.5 16h.01" />
    </>
  ),
  scale: (
    <>
      <path d="M12 3v16M6 21h12M4 8h16M8 8l-3 6h6zM16 8l3 6h-6z" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  arrow: <path d="M5 12h13M13 6l6 6-6 6" />,
  check: <path d="M5 13l4 4 10-11" />,
  external: <path d="M14 4h6v6M20 4l-9 9M18 13v5H6V6h5" />,
  megaphone: (
    <>
      <path d="M4 10v4l9 4V6zM13 7l5-2v14l-5-2" />
      <path d="M7 14v4h3v-3" />
    </>
  ),
  handshake: (
    <path d="M3 11l4-4 5 3 5-3 4 4-4 5-3-2-3 3-3-3-2 1z" />
  ),
  doc: (
    <>
      <path d="M6 3h8l4 4v14H6z" />
      <path d="M14 3v4h4M9 12h6M9 16h4" />
    </>
  ),
  coins: (
    <>
      <ellipse cx="9" cy="7" rx="5" ry="3" />
      <path d="M4 7v5c0 1.7 2.2 3 5 3M14 11c2.8.3 5 1.6 5 3.5S16.3 18 13 18s-5-1.3-5-3" />
    </>
  ),
  monday: (
    <>
      <path d="M3 17h18M5 17v-5a3 3 0 0 1 3-3h11v8" />
      <path d="M5 12h6M3 17v3M21 17v3" />
    </>
  ),
  ghost: (
    <>
      <path d="M5 20v-9a7 7 0 0 1 14 0v9l-2.3-2-2.3 2-2.4-2-2.3 2z" />
      <path d="M9 10h.01M15 10h.01" />
    </>
  ),
  twoface: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3v18" />
      <path d="M7 10h.01M8 15q1.5 1.5 3 0" />
      <path d="M17 10h.01M16 16q-1.5-1.5-3 0" />
    </>
  ),
  contract: (
    <>
      <path d="M6 3h8l4 4v14H6z" />
      <path d="M14 3v4h4" />
      <path d="M9.5 13.5l4 4M13.5 13.5l-4 4" />
    </>
  ),
  siren: (
    <>
      <path d="M5 20h14M6 20v-5a6 6 0 0 1 12 0v5" />
      <path d="M12 3v3M4.5 8.5l2 1M19.5 8.5l-2 1" />
    </>
  ),
  gavel: (
    <>
      <path d="M3 21h9" />
      <rect x="12" y="3" width="6" height="6" transform="rotate(45 15 6)" />
      <path d="M9 12l4-4M7 14l3 3" />
    </>
  ),
  receipt: (
    <>
      <path d="M6 3l1.5 1.5L9 3l1.5 1.5L12 3l1.5 1.5L15 3l1.5 1.5L18 3v18l-1.5-1.5L15 21l-1.5-1.5L12 21l-1.5-1.5L9 21l-1.5-1.5L6 21z" />
      <path d="M9 9h6M9 13h4" />
    </>
  ),
  bank: (
    <>
      <path d="M3 9l9-5 9 5M4 9h16M5 9v8M9 9v8M15 9v8M19 9v8M3 20h18" />
    </>
  ),
  palm: (
    <>
      <path d="M12 21v-9" />
      <path d="M12 12c0-3-2-5-5-5 1 3 3 5 5 5zM12 12c0-3 2-5 5-5-1 3-3 5-5 5zM12 12c-1.5-2-1.5-5 0-7 1.5 2 1.5 5 0 7z" />
    </>
  ),
  moon: <path d="M19 14.5A8 8 0 0 1 9.5 5 8 8 0 1 0 19 14.5z" />,
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="1.5" />
      <path d="M3 7l9 6 9-6" />
    </>
  ),
  lock: (
    <>
      <rect x="4" y="10" width="16" height="11" rx="1.5" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </>
  ),
  warning: (
    <>
      <path d="M12 3l9 16H3z" />
      <path d="M12 9v5M12 17h.01" />
    </>
  ),
  card: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 10h18M7 15h4" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s7-6.4 7-12a7 7 0 0 0-14 0c0 5.6 7 12 7 12z" />
      <circle cx="12" cy="9" r="2.5" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18" />
    </>
  ),
  home: (
    <>
      <path d="M4 11l8-7 8 7" />
      <path d="M6 10v10h12V10" />
      <path d="M10 20v-6h4v6" />
    </>
  ),
  help: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9a2.5 2.5 0 0 1 4 2c0 1.5-2 2-2 3.5M12 17h.01" />
    </>
  ),
  clipboard: (
    <>
      <rect x="6" y="4" width="12" height="17" rx="1.5" />
      <path d="M9 4a3 3 0 0 1 6 0M9 11h6M9 15h4" />
    </>
  ),
  paperclip: (
    <path d="M19 11l-7 7a4 4 0 0 1-6-6l8-8a3 3 0 0 1 4 4l-8 8a1.5 1.5 0 0 1-2-2l7-7" />
  ),
  x: <path d="M6 6l12 12M18 6L6 18" />,
  shield: (
    <>
      <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" />
      <path d="M9 12l2 2 4-4" />
    </>
  ),
  building: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="1" />
      <path d="M9 7h.01M12 7h.01M15 7h.01M9 11h.01M12 11h.01M15 11h.01M9 15h6v6" />
    </>
  ),
  bulb: (
    <>
      <path d="M9 18h6M10 21h4" />
      <path d="M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.3 1 2.5h6c0-1.2.3-1.8 1-2.5A6 6 0 0 0 12 3z" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </>
  ),
};

export function Icon({
  name,
  size = 24,
  className = "",
  style,
  strokeWidth = 2.5,
}: Props) {
  return (
    <svg
      className={`icon ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
      aria-hidden="true"
      focusable="false"
    >
      {paths[name]}
    </svg>
  );
}
