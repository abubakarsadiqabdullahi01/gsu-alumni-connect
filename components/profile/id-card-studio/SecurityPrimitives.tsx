"use client";

import { cardVectors } from "./cardVectors";

const W = cardVectors.cardWidth;
const H = cardVectors.cardHeight;

export function GuillochePattern({ id = "guil" }: { id?: string }) {
  return (
    <defs>
      <pattern id={`${id}_cell`} x="0" y="0" width="44" height="44" patternUnits="userSpaceOnUse">
        <circle cx="22" cy="22" r="20" fill="none" stroke="#1a5c3a" strokeWidth="0.35" />
        <circle cx="22" cy="22" r="14" fill="none" stroke="#1a5c3a" strokeWidth="0.28" />
        <circle cx="22" cy="22" r="8" fill="none" stroke="#0a9396" strokeWidth="0.22" />
        <circle cx="22" cy="22" r="3" fill="none" stroke="#0a9396" strokeWidth="0.18" />
      </pattern>
      <pattern id={`${id}_wave`} x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
        <path d="M0 40 Q20 20 40 40 Q60 60 80 40" fill="none" stroke="#1a5c3a" strokeWidth="0.3" opacity="0.7" />
        <path d="M0 60 Q20 40 40 60 Q60 80 80 60" fill="none" stroke="#1a5c3a" strokeWidth="0.25" opacity="0.5" />
      </pattern>
    </defs>
  );
}

export function GuillocheLayer({ id = "guil" }: { id?: string }) {
  return (
    <g opacity={0.05} aria-hidden="true">
      <rect width={W} height={H} fill={`url(#${id}_cell)`} />
      <rect width={W} height={H} fill={`url(#${id}_wave)`} />
    </g>
  );
}

export function WatermarkLayer() {
  return (
    <g opacity={0.04} aria-hidden="true">
      <defs>
        <pattern
          id="wm_pat"
          x="0"
          y="0"
          width="220"
          height="90"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(-18)"
        >
          <text x="10" y="62" fontSize="36" fontFamily="Georgia, serif" fontWeight="900" fill="#1a5c3a">
            GSUALUMNI
          </text>
        </pattern>
      </defs>
      <rect x="-200" y="-200" width={W + 400} height={H + 400} fill="url(#wm_pat)" />
    </g>
  );
}

const MICRO_TEXT =
  "GOMBE STATE UNIVERSITY ALUMNI ASSOCIATION • PRIMUS INTERPARES • UPLIFTING THE IDEAS OF GSU • AUTHORIZED MEMBER • ";

export function MicroprintBorder({ inset = 10 }: { inset?: number }) {
  const rx = inset;
  const ry = inset;
  const rw = W - inset * 2;
  const rh = H - inset * 2;
  const pathD = `M ${rx + 8},${ry} H ${rw} A 8,8 0 0 1 ${rw + 8},${ry + 8} V ${rh} A 8,8 0 0 1 ${rw},${rh + 8} H ${rx} A 8,8 0 0 1 ${rx - 8},${rh} V ${ry + 8} A 8,8 0 0 1 ${rx},${ry} Z`;
  const microprintStr = MICRO_TEXT.repeat(5);

  return (
    <g aria-hidden="true">
      <defs>
        <path id="micro_border_path" d={pathD} />
      </defs>
      <rect
        x={inset}
        y={inset}
        width={W - inset * 2}
        height={H - inset * 2}
        fill="none"
        stroke="#1a5c3a"
        strokeWidth={0.9}
        strokeDasharray="3 2"
        rx={8}
        opacity={0.18}
      />
      <text fontSize={2.8} fontFamily="monospace" fill="#1a5c3a" opacity={0.32}>
        <textPath href="#micro_border_path" startOffset="0">
          {microprintStr}
        </textPath>
      </text>
    </g>
  );
}

export function HologramSticker({ cx, cy, r = 32 }: { cx: number; cy: number; r?: number }) {
  return (
    <g aria-label="Holographic security seal">
      <defs>
        <radialGradient id="holo_grad" cx="50%" cy="50%">
          <stop offset="0%" stopColor="#7fffd4" />
          <stop offset="25%" stopColor="#ffd700" />
          <stop offset="50%" stopColor="#ff69b4" />
          <stop offset="75%" stopColor="#6495ed" />
          <stop offset="100%" stopColor="#7fffd4" />
        </radialGradient>
        <clipPath id="holo_clip">
          <circle cx={cx} cy={cy} r={r} />
        </clipPath>
      </defs>
      <circle cx={cx} cy={cy} r={r} fill="url(#holo_grad)" opacity={0.75} stroke="#c9a84c" strokeWidth={1.5} />
      <polygon
        points={`
          ${cx},${cy - r * 0.7}
          ${cx + r * 0.2},${cy - r * 0.2}
          ${cx + r * 0.7},${cy - r * 0.2}
          ${cx + r * 0.3},${cy + r * 0.15}
          ${cx + r * 0.45},${cy + r * 0.65}
          ${cx},${cy + r * 0.3}
          ${cx - r * 0.45},${cy + r * 0.65}
          ${cx - r * 0.3},${cy + r * 0.15}
          ${cx - r * 0.7},${cy - r * 0.2}
          ${cx - r * 0.2},${cy - r * 0.2}
        `}
        fill="rgba(255,255,255,0.3)"
        stroke="rgba(255,255,255,0.5)"
        strokeWidth={0.8}
        clipPath="url(#holo_clip)"
      />
      <circle cx={cx} cy={cy} r={r * 0.45} fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth={0.8} />
      <text x={cx} y={cy + 3} textAnchor="middle" fontSize={7} fontFamily="sans-serif" fontWeight="900" fill="rgba(255,255,255,0.7)" letterSpacing={1}>
        GSU
      </text>
    </g>
  );
}

export function SmartChip({ x, y, w = 52, h = 38 }: { x: number; y: number; w?: number; h?: number }) {
  return (
    <g aria-label="Smart chip">
      <rect x={x} y={y} width={w} height={h} rx={4} fill="url(#chip_grad)" stroke="#a07820" strokeWidth={1} />
      <defs>
        <linearGradient id="chip_grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#e8c84a" />
          <stop offset="40%" stopColor="#f0d878" />
          <stop offset="100%" stopColor="#c9a030" />
        </linearGradient>
      </defs>
      {[0, 1, 2].map((row) =>
        [0, 1].map((col) => {
          const px = x + 8 + (col * (w - 40)) / 1;
          const py = y + 7 + (row * (h - 25)) / 2;
          return (
            <rect
              key={`${row}-${col}`}
              x={px}
              y={py}
              width={(w - 25) / 2}
              height={(h - 25) / 3}
              rx={1}
              fill="rgba(139,100,20,0.3)"
              stroke="rgba(139,100,20,0.5)"
              strokeWidth={0.5}
            />
          );
        })
      )}
      <line x1={x + w / 2} y1={y + 4} x2={x + w / 2} y2={y + h - 4} stroke="rgba(139,100,20,0.4)" strokeWidth={0.8} />
    </g>
  );
}

export function QRFrame({ x, y, size }: { x: number; y: number; size: number }) {
  const pad = 6;
  return (
    <g aria-label="Verification QR code">
      <rect x={x - pad} y={y - pad} width={size + pad * 2} height={size + pad * 2} rx={4} fill="#fff" stroke="#ddd" strokeWidth={1} />
      <text x={x + size / 2} y={y + size + pad * 2 + 6} textAnchor="middle" fontSize={7} fontFamily="sans-serif" fill="#999" letterSpacing={1.5}>
        SCAN TO VERIFY
      </text>
    </g>
  );
}

export function PrintRegistrationMarks({ bleed = 20, cropLen = 12 }: { bleed?: number; cropLen?: number }) {
  const marks = [
    { x: -bleed, y: -bleed },
    { x: W + bleed, y: -bleed },
    { x: -bleed, y: H + bleed },
    { x: W + bleed, y: H + bleed },
  ];
  return (
    <g stroke="#999" strokeWidth={0.6} opacity={0.7} aria-label="Print registration marks">
      {marks.map((m, i) => {
        const dx = m.x < 0 ? 1 : -1;
        const dy = m.y < 0 ? 1 : -1;
        return (
          <g key={i}>
            <line x1={m.x} y1={m.y} x2={m.x + dx * cropLen} y2={m.y} />
            <line x1={m.x} y1={m.y} x2={m.x} y2={m.y + dy * cropLen} />
          </g>
        );
      })}
      <circle cx={W / 2} cy={H + bleed} r={5} fill="none" />
      <line x1={W / 2 - 8} y1={H + bleed} x2={W / 2 + 8} y2={H + bleed} />
      <line x1={W / 2} y1={H + bleed - 8} x2={W / 2} y2={H + bleed + 8} />
    </g>
  );
}
