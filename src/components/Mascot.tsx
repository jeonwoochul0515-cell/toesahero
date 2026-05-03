import type { CSSProperties } from "react";

export type MascotPose = "stand" | "wave" | "fly" | "wink" | "shock";

type Props = {
  size?: number;
  pose?: MascotPose;
  className?: string;
  style?: CSSProperties;
};

export function Mascot({
  size = 80,
  pose = "stand",
  className = "",
  style,
}: Props) {
  return (
    <svg
      className={`mascot ${className}`}
      width={size}
      height={size}
      viewBox="0 0 100 100"
      style={style}
      aria-hidden="true"
    >
      <path
        d={
          pose === "fly"
            ? "M28 38 Q12 50 18 70 L40 60 Q42 48 38 36 Z"
            : "M30 40 Q18 56 24 78 L44 70 Q44 56 38 40 Z"
        }
        fill="#FF6B35"
        stroke="#0A0A0A"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path
        d={
          pose === "fly"
            ? "M72 38 Q88 50 82 70 L60 60 Q58 48 62 36 Z"
            : "M70 40 Q82 56 76 78 L56 70 Q56 56 62 40 Z"
        }
        fill="#FF6B35"
        stroke="#0A0A0A"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <circle cx="50" cy="50" r="28" fill="#FFD60A" stroke="#0A0A0A" strokeWidth="2.5" />
      <path d="M26 44 Q50 38 74 44 L74 50 Q50 46 26 50 Z" fill="#0A0A0A" />
      {pose === "wink" ? (
        <>
          <circle cx="40" cy="48" r="2.5" fill="#FFFBF0" />
          <path
            d="M56 48 Q60 46 64 48"
            stroke="#FFFBF0"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
        </>
      ) : pose === "shock" ? (
        <>
          <circle cx="40" cy="48" r="3" fill="#FFFBF0" />
          <circle cx="60" cy="48" r="3" fill="#FFFBF0" />
        </>
      ) : (
        <>
          <circle cx="40" cy="48" r="2.5" fill="#FFFBF0" />
          <circle cx="60" cy="48" r="2.5" fill="#FFFBF0" />
        </>
      )}
      {pose === "shock" ? (
        <ellipse cx="50" cy="60" rx="3" ry="4" fill="#0A0A0A" />
      ) : pose === "wave" || pose === "fly" ? (
        <path
          d="M44 58 Q50 64 56 58"
          stroke="#0A0A0A"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
        />
      ) : (
        <path
          d="M44 60 Q50 64 56 60"
          stroke="#0A0A0A"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
        />
      )}
      <circle cx="34" cy="58" r="2.5" fill="#FF8FB1" opacity=".8" />
      <circle cx="66" cy="58" r="2.5" fill="#FF8FB1" opacity=".8" />
      <g transform="translate(50 70)">
        <rect
          x="-7"
          y="-4"
          width="14"
          height="9"
          rx="2"
          fill="#FF6B35"
          stroke="#0A0A0A"
          strokeWidth="1.5"
        />
        <text
          x="0"
          y="3"
          textAnchor="middle"
          fill="#FFFBF0"
          fontSize="7"
          fontWeight="900"
          fontFamily="Space Grotesk, sans-serif"
        >
          H
        </text>
      </g>
      {pose === "wave" && (
        <g>
          <circle cx="78" cy="34" r="6" fill="#FFD60A" stroke="#0A0A0A" strokeWidth="2.5" />
          <line x1="74" y1="40" x2="68" y2="46" stroke="#0A0A0A" strokeWidth="2.5" strokeLinecap="round" />
        </g>
      )}
    </svg>
  );
}
