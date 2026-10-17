// Generated cover artwork, one motif per identity. Pure SVG, seeded by the business slug,
// colored from the live palette — so it always matches the theme, works offline and weighs nothing.
import { memo, useId } from 'react';
import type { Palette } from './derive';
import { alpha, mix } from './derive';
import { seededRandom } from '@/lib/cn';
import { toFa } from '@/lib/digits';
import { WEEKDAYS_SHORT } from '@/lib/jalali';

interface Props {
  palette: Palette;
  seed: string;
  labels?: string[];
  className?: string;
  /** Simpler rendering for small thumbnails. */
  compact?: boolean;
}

const S = 600; // viewBox size; covers crop it with "slice"

export const Motif = memo(function Motif({ palette, seed, labels = [], className, compact }: Props) {
  const id = useId().replace(/:/g, '');
  const rnd = seededRandom(seed + palette.preset.motif);
  const common = { palette, rnd, id, labels, compact: !!compact };
  let body: React.ReactNode;
  switch (palette.preset.motif) {
    case 'poster':
      body = <Poster {...common} />;
      break;
    case 'tabs':
      body = <Tabs {...common} />;
      break;
    case 'blobs':
      body = <Blobs {...common} />;
      break;
    case 'glass':
      body = <Glass {...common} />;
      break;
    case 'grid':
      body = <GridBlocks {...common} />;
      break;
    case 'dots':
      body = <Dots {...common} />;
      break;
    case 'network':
      body = <Network {...common} />;
      break;
    default:
      body = <NuboArt {...common} />;
  }
  return (
    <svg
      viewBox={`0 0 ${S} ${S}`}
      preserveAspectRatio="xMidYMid slice"
      className={className}
      aria-hidden="true"
      style={{ display: 'block', fontFamily: 'inherit' }}
    >
      <rect width={S} height={S} fill={palette.paper} />
      {body}
    </svg>
  );
});

interface ArtProps {
  palette: Palette;
  rnd: () => number;
  id: string;
  labels: string[];
  compact: boolean;
}

/** Barbershop — Braun-style poster: thin giant numerals, a ruler, one red line. */
function Poster({ palette, rnd }: ArtProps) {
  const { ink, accent, muted } = palette;
  const hours = [9, 10, 11, 12, 14, 16, 17, 18, 20];
  const a = hours[Math.floor(rnd() * 3)];
  const nums = [a, a + 4, a + 8];
  const lineY = 190 + Math.floor(rnd() * 60);
  const ticks = Array.from({ length: 40 }, (_, i) => 70 + i * 13);
  const markTick = ticks[18 + Math.floor(rnd() * 6)];
  return (
    <g>
      <line x1="0" y1="70" x2={S} y2="70" stroke={alpha(ink, 0.5)} strokeWidth="1" />
      <line x1="0" y1="560" x2={S} y2="560" stroke={alpha(ink, 0.5)} strokeWidth="1" />
      {[350, 392, 404, 470].map((x) => (
        <line key={x} x1={x} y1="0" x2={x} y2={S} stroke={x === 392 || x === 404 ? accent : alpha(ink, 0.45)} strokeWidth="1" />
      ))}
      {ticks.map((y) => (
        <line key={y} x1="392" y1={y} x2="404" y2={y} stroke={accent} strokeWidth="1" />
      ))}
      <rect x="392" y={markTick} width="12" height="13" fill={accent} />
      {nums.map((n, i) => (
        <text
          key={n}
          x="335"
          y={250 + i * 190}
          textAnchor="end"
          fontSize="240"
          fontWeight="250"
          fill={ink}
          letterSpacing="-12"
          direction="ltr"
        >
          {toFa(n)}
        </text>
      ))}
      {Array.from({ length: 7 }, (_, i) => (
        <text key={i} x="378" y={110 + i * 64} textAnchor="end" fontSize="15" fill={accent} direction="ltr">
          {toFa(8 + i * 2)}
        </text>
      ))}
      {['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'].map((d, i) => (
        <g key={d}>
          <line x1="470" y1={120 + i * 64} x2="480" y2={120 + i * 64} stroke={alpha(ink, 0.6)} />
          <text x="492" y={125 + i * 64} fontSize="16" fill={muted}>
            {d}
          </text>
        </g>
      ))}
      <rect x="0" y={lineY} width={S} height="8" fill={accent} />
    </g>
  );
}

/** Beauty salon — stacked folder dividers in powdery colors. */
function Tabs({ palette, rnd, labels }: ArtProps) {
  const colors = palette.art;
  const names = labels.length ? labels : ['مو', 'رنگ', 'ناخن', 'پوست', 'میکاپ'];
  const tabX = [60, 300, 200, 100, 30];
  const startY = 110 + Math.floor(rnd() * 20);
  return (
    <g>
      {colors.slice(0, 5).map((c, i) => {
        const y = startY + i * 78;
        const tx = tabX[i % tabX.length];
        const label = names[i % names.length];
        const textCol = mix(c, '#000000', 0.62);
        return (
          <g key={i}>
            <path
              d={`M70 ${y + 34} Q70 ${y + 22} 82 ${y + 22} H${tx + 70} Q${tx + 80} ${y + 22} ${tx + 84} ${y + 12} Q${tx + 88} ${y} ${tx + 100} ${y} H${tx + 176} Q${tx + 188} ${y} ${tx + 192} ${y + 12} Q${tx + 196} ${y + 22} ${tx + 206} ${y + 22} H518 Q530 ${y + 22} 530 ${y + 34} V${S + 40} H70 Z`}
              fill={c}
            />
            <text x={tx + 138} y={y + 17} textAnchor="middle" fontSize="15" fontWeight="600" fill={textCol}>
              {label}
            </text>
          </g>
        );
      })}
      <g opacity="0.55">
        {Array.from({ length: 9 }, (_, i) => (
          <line key={`v${i}`} x1={110 + i * 22} y1="500" x2={110 + i * 22} y2="566" stroke={palette.accent} strokeWidth="0.6" />
        ))}
        {Array.from({ length: 4 }, (_, i) => (
          <line key={`h${i}`} x1="110" y1={500 + i * 22} x2="286" y2={500 + i * 22} stroke={palette.accent} strokeWidth="0.6" />
        ))}
      </g>
    </g>
  );
}

/** Psychology — soft blurred color fields with tiny labels (calm, safe). */
function Blobs({ palette, rnd, id, labels, compact }: ArtProps) {
  const names = labels.length ? labels : ['گفت‌وگو', 'آرامش', 'خانواده', 'رشد', 'خانه'];
  const spots = palette.art.map((c, i) => ({
    c,
    x: 140 + rnd() * 320 + (i % 2 ? 40 : -40),
    y: 110 + i * 100 + rnd() * 40,
    r: 90 + rnd() * 60,
  }));
  return (
    <g>
      <defs>
        <filter id={`blur${id}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation={compact ? 30 : 46} />
        </filter>
      </defs>
      <g filter={`url(#blur${id})`}>
        {spots.map((s, i) => (
          <circle key={i} cx={s.x} cy={s.y} r={s.r} fill={s.c} opacity={0.85} />
        ))}
      </g>
      {!compact &&
        spots.map((s, i) => (
          <text
            key={i}
            x={s.x}
            y={s.y + 6}
            textAnchor="middle"
            fontSize="17"
            letterSpacing="2"
            fill={alpha(palette.ink, 0.78)}
            fontWeight="500"
          >
            {names[i % names.length]}
          </text>
        ))}
    </g>
  );
}

/** Dental — frosted folder over clean white cards. */
function Glass({ palette, id }: ArtProps) {
  const dark = palette.art[0];
  const cards = [
    { x: 196, y: 150, r: -4 },
    { x: 262, y: 160, r: 3 },
    { x: 312, y: 176, r: 7 },
  ];
  const papers = (
    <g>
      {cards.map((c, i) => (
        <g key={i} transform={`rotate(${c.r} ${c.x + 70} ${c.y + 90})`}>
          <rect x={c.x} y={c.y} width="150" height="200" rx="14" fill="#FFFFFF" />
          <rect x={c.x + 22} y={c.y + 28} width={i === 0 ? 96 : 60} height="10" rx="5" fill="#D5D8DD" />
          {[0, 1, 2].map((k) => (
            <rect key={k} x={c.x + 22} y={c.y + 56 + k * 22} width={90 - k * 18} height="7" rx="3.5" fill="#E4E7EB" />
          ))}
          {i === 0 && <circle cx={c.x + 124} cy={c.y + 33} r="8" fill={palette.accent} />}
        </g>
      ))}
    </g>
  );
  const front = 'M150 268 Q150 252 166 252 H300 Q312 252 320 262 L334 280 H446 Q462 280 462 296 L450 446 Q448 462 432 462 H168 Q152 462 150 446 Z';
  return (
    <g>
      <defs>
        <clipPath id={`front${id}`}>
          <path d={front} />
        </clipPath>
        <filter id={`fb${id}`}>
          <feGaussianBlur stdDeviation="9" />
        </filter>
        <filter id={`sh${id}`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="14" />
        </filter>
        <linearGradient id={`fg${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.5" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0.16" />
        </linearGradient>
      </defs>
      <ellipse cx="306" cy="478" rx="160" ry="14" fill={alpha('#000000', 0.18)} filter={`url(#sh${id})`} />
      <rect x="170" y="190" width="272" height="256" rx="22" fill={dark} />
      {papers}
      <g clipPath={`url(#front${id})`}>
        <rect x="140" y="240" width="340" height="240" fill={mix(dark, '#FFFFFF', 0.25)} />
        <g filter={`url(#fb${id})`} opacity="0.9">
          {papers}
        </g>
        <rect x="140" y="240" width="340" height="240" fill={`url(#fg${id})`} />
      </g>
      <path d={front} fill="none" stroke={alpha('#FFFFFF', 0.5)} strokeWidth="1.2" />
    </g>
  );
}

/** General clinic — hairline grid with solid blocks forming a cross. */
function GridBlocks({ palette, rnd }: ArtProps) {
  const cols = 5;
  const rows = 6;
  const x0 = 70;
  const y0 = 60;
  const cw = 92;
  const ch = 82;
  const cross = [
    [2, 1],
    [1, 2],
    [2, 2],
    [3, 2],
    [2, 3],
  ];
  const extra = [Math.floor(rnd() * 2) * 4, 4 + Math.floor(rnd() * 2)];
  return (
    <g>
      {Array.from({ length: cols + 1 }, (_, i) => (
        <line key={`v${i}`} x1={x0 + i * cw} y1={y0} x2={x0 + i * cw} y2={y0 + rows * ch} stroke={palette.accent} strokeWidth="1.2" />
      ))}
      {Array.from({ length: rows + 1 }, (_, i) => (
        <line key={`h${i}`} x1={x0} y1={y0 + i * ch} x2={x0 + cols * cw} y2={y0 + i * ch} stroke={palette.accent} strokeWidth="1.2" />
      ))}
      {[...cross, extra].map(([c, r], i) => (
        <rect key={i} x={x0 + c * cw} y={y0 + r * ch} width={cw} height={ch} fill={palette.accent} />
      ))}
    </g>
  );
}

/** Gym — rows of dots like training days; one accent "today". */
function Dots({ palette, rnd, compact }: ArtProps) {
  const cols = 7;
  const rows = 5;
  const filled = 18 + Math.floor(rnd() * 8);
  const gap = 74;
  const x0 = (S - (cols - 1) * gap) / 2;
  const y0 = 170;
  return (
    <g>
      {!compact &&
        WEEKDAYS_SHORT.map((d, i) => (
          <text key={d} x={S - x0 - i * gap} y={y0 - 56} textAnchor="middle" fontSize="16" fill={palette.muted}>
            {d}
          </text>
        ))}
      {Array.from({ length: cols * rows }, (_, i) => {
        const cx = S - x0 - (i % cols) * gap;
        const cy = y0 + Math.floor(i / cols) * gap;
        if (i < filled) return <circle key={i} cx={cx} cy={cy} r="28" fill={palette.ink} />;
        if (i === filled) return <circle key={i} cx={cx} cy={cy} r="28" fill={palette.accent} />;
        return <circle key={i} cx={cx} cy={cy} r="27" fill="none" stroke={alpha(palette.ink, 0.25)} strokeWidth="2" />;
      })}
    </g>
  );
}

/** Private tutor — colorful dots joined by a line on a grid. */
function Network({ palette, rnd, compact }: ArtProps) {
  const n = 7;
  const cell = 62;
  const x0 = (S - n * cell) / 2;
  const y0 = 90;
  const colors = palette.art.slice(0, 5);
  const nodes: { c: number; r: number }[] = [{ c: 1, r: 0 }];
  const seen = new Set(['1,0']);
  while (nodes.length < 14) {
    const last = nodes[nodes.length - 1];
    const dirs = [
      [1, 0], [-1, 0], [0, 1], [1, 1], [-1, 1], [1, -1],
    ];
    let placed = false;
    for (let tries = 0; tries < 12 && !placed; tries += 1) {
      const [dc, dr] = dirs[Math.floor(rnd() * dirs.length)];
      const c = last.c + dc;
      const r = last.r + dr;
      if (c < 0 || c > n || r < 0 || r > n || seen.has(`${c},${r}`)) continue;
      seen.add(`${c},${r}`);
      nodes.push({ c, r });
      placed = true;
    }
    if (!placed) break;
  }
  const pt = (p: { c: number; r: number }) => ({ x: x0 + p.c * cell, y: y0 + p.r * cell });
  return (
    <g>
      {Array.from({ length: n + 1 }, (_, i) => (
        <g key={i}>
          <line x1={x0 + i * cell} y1={y0} x2={x0 + i * cell} y2={y0 + n * cell} stroke={alpha(palette.ink, 0.12)} strokeWidth="2" />
          <line x1={x0} y1={y0 + i * cell} x2={x0 + n * cell} y2={y0 + i * cell} stroke={alpha(palette.ink, 0.12)} strokeWidth="2" />
        </g>
      ))}
      {nodes.map((p, i) => {
        const a = pt(p);
        return <circle key={`c${i}`} cx={a.x} cy={a.y} r="27" fill={i === 9 ? palette.ink : colors[(i * 3 + 1) % colors.length]} />;
      })}
      <polyline
        points={nodes.map((p) => `${pt(p).x},${pt(p).y}`).join(' ')}
        fill="none"
        stroke={palette.ink}
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      {!compact &&
        nodes.map((p, i) =>
          i % 2 ? (
            <text key={`t${i}`} x={pt(p).x - 40} y={pt(p).y + 44} fontSize="15" fill={palette.ink} direction="ltr">
              {toFa(i + 2)}
            </text>
          ) : null,
        )}
    </g>
  );
}

/** Nubo brand — a quiet dot calendar with one orange "today". */
function NuboArt({ palette, rnd }: ArtProps) {
  const today = 16 + Math.floor(rnd() * 6);
  const gap = 70;
  const x0 = (S - 6 * gap) / 2;
  return (
    <g>
      {Array.from({ length: 28 }, (_, i) => {
        const cx = S - x0 - (i % 7) * gap;
        const cy = 160 + Math.floor(i / 7) * gap;
        if (i < today) return <circle key={i} cx={cx} cy={cy} r="26" fill={palette.ink} />;
        if (i === today) return <circle key={i} cx={cx} cy={cy} r="26" fill={palette.accent} />;
        return <circle key={i} cx={cx} cy={cy} r="25" fill="none" stroke={alpha(palette.ink, 0.22)} strokeWidth="2" />;
      })}
    </g>
  );
}
