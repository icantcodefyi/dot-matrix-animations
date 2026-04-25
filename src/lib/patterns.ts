// 28 hand-designed dot-matrix patterns. Mirrors scripts/generate_animations.py.
// Keep this file and the Python generator in sync if either changes.

export const GRID = 5;
export const PAD = 6;
export const SPACING = 11;
export const VIEWBOX = PAD * 2 + SPACING * (GRID - 1); // 50
export const DOT_R_BASE = 2.4;
export const DOT_R_LIT = 3.1;

const CENTER = (GRID - 1) / 2;

export type DelayFn = (col: number, row: number) => number;

export interface PatternSpec {
  slug: string;
  title: string;
  blurb: string;
  durationMs: number;
  easing: string;
  keyframes: string;
  delay: DelayFn;
}

const EASE_OUT_QUART = "cubic-bezier(0.25, 1, 0.5, 1)";
const EASE_OUT_EXPO = "cubic-bezier(0.16, 1, 0.3, 1)";
const EASE_IN_OUT = "cubic-bezier(0.65, 0, 0.35, 1)";

const PULSE_KF =
  "0%{opacity:0;}8%{opacity:1;}36%{opacity:0.05;}100%{opacity:0;}";
const BREATH_KF =
  "0%{opacity:0.05;}20%{opacity:1;}55%{opacity:0.18;}100%{opacity:0.05;}";
const HEART_KF =
  "0%{opacity:0.18;}6%{opacity:0.95;}14%{opacity:0.30;}22%{opacity:1;}34%{opacity:0.20;}70%{opacity:0.18;}100%{opacity:0.18;}";
const TRAIL_KF =
  "0%{opacity:0;}4%{opacity:1;}26%{opacity:0.08;}100%{opacity:0;}";
const RAIN_KF =
  "0%{opacity:0;}6%{opacity:1;}22%{opacity:0.10;}100%{opacity:0;}";
const SPARKLE_KF =
  "0%{opacity:0.05;}40%{opacity:0.05;}50%{opacity:1;}60%{opacity:0.05;}100%{opacity:0.05;}";
const SLOW_BREATH_KF =
  "0%{opacity:0.10;}50%{opacity:0.85;}100%{opacity:0.10;}";
const BEACON_KF =
  "0%{opacity:0.12;}14%{opacity:1;}40%{opacity:0.12;}100%{opacity:0.12;}";
const BLOOM_KF =
  "0%{opacity:0;}10%{opacity:1;}55%{opacity:0.85;}100%{opacity:0;}";
const RING_KF =
  "0%{opacity:0.10;}20%{opacity:1;}60%{opacity:0.20;}100%{opacity:0.10;}";
const SYNAPSE_KF =
  "0%{opacity:0.05;}30%{opacity:0.05;}40%{opacity:1;}55%{opacity:0.10;}100%{opacity:0.05;}";
const LATTICE_KF =
  "0%{opacity:0.08;}30%{opacity:0.85;}60%{opacity:0.12;}100%{opacity:0.08;}";
const CIPHER_KF =
  "0%{opacity:0;}8%{opacity:1;}22%{opacity:0.05;}46%{opacity:0.85;}58%{opacity:0.05;}100%{opacity:0;}";
const FILL_KF =
  "0%{opacity:0.08;}14%{opacity:1;}72%{opacity:0.95;}100%{opacity:0.08;}";

const SPIRAL_ORDER: ReadonlyArray<readonly [number, number]> = [
  [2, 2], [2, 1], [3, 1], [3, 2], [3, 3], [2, 3], [1, 3], [1, 2], [1, 1],
  [2, 0], [3, 0], [4, 0], [4, 1], [4, 2], [4, 3], [4, 4], [3, 4], [2, 4],
  [1, 4], [0, 4], [0, 3], [0, 2], [0, 1], [0, 0], [1, 0],
];

const EDGE_ORDER: Array<readonly [number, number]> = [];
for (let c = 0; c < GRID; c++) EDGE_ORDER.push([c, 0]);
for (let r = 1; r < GRID; r++) EDGE_ORDER.push([GRID - 1, r]);
for (let c = GRID - 2; c >= 0; c--) EDGE_ORDER.push([c, GRID - 1]);
for (let r = GRID - 2; r > 0; r--) EDGE_ORDER.push([0, r]);

const HALF = EDGE_ORDER.length / 2;

// Verified open knight's tour on 5x5 starting at (0,0).
const KNIGHT_TOUR: ReadonlyArray<readonly [number, number]> = [
  [0, 0], [2, 1], [4, 0], [3, 2], [4, 4],
  [2, 3], [0, 4], [1, 2], [3, 1], [4, 3],
  [2, 4], [0, 3], [1, 1], [3, 0], [4, 2],
  [3, 4], [1, 3], [0, 1], [2, 0], [4, 1],
  [3, 3], [1, 4], [2, 2], [1, 0], [0, 2],
];

// Eight perimeter "principal" dots paired by antipode for Relay.
const RELAY_PAIRS: ReadonlyArray<readonly [readonly [number, number], readonly [number, number]]> = [
  [[0, 0], [4, 4]],
  [[4, 0], [0, 4]],
  [[2, 0], [2, 4]],
  [[0, 2], [4, 2]],
];

const findIndex = (
  list: ReadonlyArray<readonly [number, number]>,
  col: number,
  row: number
) => list.findIndex(([c, r]) => c === col && r === row);

const hash01 = (idx: number, salt = 1): number => {
  const h =
    ((idx * 2654435761) ^ (idx * idx * 40503) ^ (salt * 374761393)) >>> 0;
  return (h % 1000) / 1000;
};

export const PATTERNS: ReadonlyArray<PatternSpec> = [
  {
    slug: "icon-01",
    title: "Pulse Rings",
    blurb: "Concentric rings expand from the center.",
    durationMs: 2200,
    easing: EASE_OUT_EXPO,
    keyframes: PULSE_KF,
    delay: (col, row) =>
      Math.max(Math.abs(col - CENTER), Math.abs(row - CENTER)) / 6,
  },
  {
    slug: "icon-02",
    title: "Spiral",
    blurb: "A bright trace winds outward from the center.",
    durationMs: 2800,
    easing: EASE_OUT_QUART,
    keyframes: TRAIL_KF,
    delay: (col, row) => {
      const idx = findIndex(SPIRAL_ORDER, col, row);
      return idx < 0 ? 0 : idx / (SPIRAL_ORDER.length + 4);
    },
  },
  {
    slug: "icon-03",
    title: "Wave",
    blurb: "A breathing sine wave drifts left to right.",
    durationMs: 2400,
    easing: EASE_IN_OUT,
    keyframes: BREATH_KF,
    delay: (col, row) => col / 5 + row * 0.02,
  },
  {
    slug: "icon-04",
    title: "Cross Expand",
    blurb: "A plus shape blooms outward in Manhattan steps.",
    durationMs: 2200,
    easing: EASE_OUT_EXPO,
    keyframes: PULSE_KF,
    delay: (col, row) => (Math.abs(col - CENTER) + Math.abs(row - CENTER)) / 10,
  },
  {
    slug: "icon-05",
    title: "Rain",
    blurb: "Independent drops fall column by column.",
    durationMs: 1800,
    easing: EASE_OUT_QUART,
    keyframes: RAIN_KF,
    delay: (col, row) => {
      const starts = [0.0, 0.55, 0.2, 0.75, 0.35];
      return (starts[col] + row * 0.07) % 1;
    },
  },
  {
    slug: "icon-06",
    title: "Heartbeat",
    blurb: "Lub-dub pulse with a soft radial echo.",
    durationMs: 1600,
    easing: EASE_OUT_QUART,
    keyframes: HEART_KF,
    delay: (col, row) =>
      Math.min(Math.hypot(col - CENTER, row - CENTER) * 0.015, 0.06),
  },
  {
    slug: "icon-07",
    title: "Loading",
    blurb: "A trailing spinner sweeps the outer ring.",
    durationMs: 2000,
    easing: "linear",
    keyframes: TRAIL_KF,
    delay: (col, row) => {
      const idx = findIndex(EDGE_ORDER, col, row);
      return idx < 0 ? -1 : idx / EDGE_ORDER.length;
    },
  },
  {
    slug: "icon-08",
    title: "Diagonal Scan",
    blurb: "A diagonal stripe sweeps from corner to corner.",
    durationMs: 2200,
    easing: EASE_OUT_QUART,
    keyframes: PULSE_KF,
    delay: (col, row) => (col + row) / 12,
  },
  {
    slug: "icon-09",
    title: "Sparkle",
    blurb: "Independent dots twinkle on a deterministic loop.",
    durationMs: 2600,
    easing: EASE_IN_OUT,
    keyframes: SPARKLE_KF,
    delay: (col, row) => {
      const idx = row * GRID + col;
      const h = ((idx * 2654435761) ^ (idx * idx * 40503)) >>> 0;
      return (h % 1000) / 1000;
    },
  },
  {
    slug: "icon-10",
    title: "Column Scan",
    blurb: "A vertical bar sweeps left to right, one column at a time.",
    durationMs: 2200,
    easing: EASE_OUT_QUART,
    keyframes: PULSE_KF,
    delay: (col) => col / 6,
  },
  {
    slug: "icon-11",
    title: "Beacon",
    blurb: "A single center dot pulses on a quiet field.",
    durationMs: 1800,
    easing: EASE_OUT_EXPO,
    keyframes: BEACON_KF,
    delay: (col, row) => (col === 2 && row === 2 ? 0 : -1),
  },
  {
    slug: "icon-12",
    title: "Diamond",
    blurb: "A diamond blooms outward from the center.",
    durationMs: 2200,
    easing: EASE_OUT_EXPO,
    keyframes: BLOOM_KF,
    delay: (col, row) => (Math.abs(col - CENTER) + Math.abs(row - CENTER)) / 12,
  },
  {
    slug: "icon-13",
    title: "Pyramid",
    blurb: "A triangle grows from the bottom up, one row at a time.",
    durationMs: 2400,
    easing: EASE_OUT_QUART,
    keyframes: BLOOM_KF,
    delay: (col, row) => {
      const halfWidth = Math.floor(row / 2); // 0,0,1,1,2 top→bottom
      if (Math.abs(col - CENTER) > halfWidth) return -1;
      return (GRID - 1 - row) / 8;
    },
  },
  {
    slug: "icon-14",
    title: "Bounce",
    blurb: "A bright dot travels along the main diagonal.",
    durationMs: 2400,
    easing: EASE_IN_OUT,
    keyframes: TRAIL_KF,
    delay: (col, row) => (col === row ? col / 8 : -1),
  },
  {
    slug: "icon-15",
    title: "Breath",
    blurb: "The whole field breathes in and out together.",
    durationMs: 2800,
    easing: EASE_IN_OUT,
    keyframes: SLOW_BREATH_KF,
    delay: () => 0,
  },
  {
    slug: "icon-16",
    title: "Orbit",
    blurb: "A single dot circles the perimeter at a steady pace.",
    durationMs: 2400,
    easing: "linear",
    keyframes: TRAIL_KF,
    delay: (col, row) => {
      const idx = findIndex(EDGE_ORDER, col, row);
      return idx < 0 ? -1 : idx / EDGE_ORDER.length;
    },
  },
  {
    slug: "icon-17",
    title: "Twin Orbit",
    blurb: "Two dots circle the perimeter, each owning a half.",
    durationMs: 1800,
    easing: "linear",
    keyframes: TRAIL_KF,
    delay: (col, row) => {
      const idx = findIndex(EDGE_ORDER, col, row);
      if (idx < 0) return -1;
      return ((idx % HALF) / HALF) * 0.5;
    },
  },
  {
    slug: "icon-18",
    title: "Ring Pulse",
    blurb: "The outer ring lights as one and slowly fades.",
    durationMs: 2000,
    easing: EASE_OUT_QUART,
    keyframes: RING_KF,
    delay: (col, row) => (findIndex(EDGE_ORDER, col, row) >= 0 ? 0 : -1),
  },
  {
    slug: "icon-19",
    title: "Thinking",
    blurb: "Inner cluster fires like neurons while the field rests.",
    durationMs: 1800,
    easing: EASE_IN_OUT,
    keyframes: SYNAPSE_KF,
    delay: (col, row) => {
      if (col < 1 || col > 3 || row < 1 || row > 3) return -1;
      const idx = (row - 1) * 3 + (col - 1);
      return hash01(idx, 7);
    },
  },
  {
    slug: "icon-20",
    title: "Stream",
    blurb: "Tokens emit in reading order, top-left to bottom-right.",
    durationMs: 2400,
    easing: EASE_OUT_QUART,
    keyframes: TRAIL_KF,
    delay: (col, row) => (row * GRID + col) / 28,
  },
  {
    slug: "icon-21",
    title: "Scan Line",
    blurb: "A full row sweeps top to bottom like a CRT raster.",
    durationMs: 2000,
    easing: "linear",
    keyframes: PULSE_KF,
    delay: (_col, row) => row / 6,
  },
  {
    slug: "icon-22",
    title: "Handshake",
    blurb: "Two travelers meet at the center along the diagonal.",
    durationMs: 2000,
    easing: EASE_OUT_QUART,
    keyframes: TRAIL_KF,
    delay: (col, row) => {
      if (col !== row) return -1;
      const d = Math.min(col, GRID - 1 - col); // 0,1,2,1,0
      return d / 6;
    },
  },
  {
    slug: "icon-23",
    title: "Knight's Tour",
    blurb: "A single dot traces every cell with knight moves.",
    durationMs: 3200,
    easing: "linear",
    keyframes: TRAIL_KF,
    delay: (col, row) => {
      const idx = findIndex(KNIGHT_TOUR, col, row);
      return idx < 0 ? -1 : idx / (KNIGHT_TOUR.length + 4);
    },
  },
  {
    slug: "icon-24",
    title: "Lattice",
    blurb: "A checkerboard breathes in two opposing phases.",
    durationMs: 2400,
    easing: EASE_IN_OUT,
    keyframes: LATTICE_KF,
    delay: (col, row) => ((col + row) % 2 === 0 ? 0 : 0.5),
  },
  {
    slug: "icon-25",
    title: "Cipher",
    blurb: "Decryption flashes ripple through the grid in waves.",
    durationMs: 1600,
    easing: EASE_OUT_QUART,
    keyframes: CIPHER_KF,
    delay: (col, row) => {
      const idx = row * GRID + col;
      const h =
        ((idx * 1103515245 + 12345) ^ (idx * idx * 2654435761)) >>> 0;
      return (h % 4) / 4;
    },
  },
  {
    slug: "icon-26",
    title: "Listening",
    blurb: "Concentric rings collapse inward toward the center.",
    durationMs: 2200,
    easing: EASE_OUT_EXPO,
    keyframes: PULSE_KF,
    delay: (col, row) => {
      const d = Math.max(Math.abs(col - CENTER), Math.abs(row - CENTER));
      return (2 - d) / 6;
    },
  },
  {
    slug: "icon-27",
    title: "Relay",
    blurb: "Antipodal pairs ping around the perimeter.",
    durationMs: 1800,
    easing: EASE_OUT_QUART,
    keyframes: PULSE_KF,
    delay: (col, row) => {
      for (let i = 0; i < RELAY_PAIRS.length; i++) {
        const [a, b] = RELAY_PAIRS[i];
        if ((a[0] === col && a[1] === row) || (b[0] === col && b[1] === row)) {
          return i / 4;
        }
      }
      return -1;
    },
  },
  {
    slug: "icon-28",
    title: "Compile",
    blurb: "Each column fills bottom-up, then releases as one.",
    durationMs: 2400,
    easing: EASE_IN_OUT,
    keyframes: FILL_KF,
    delay: (col, row) => col * 0.04 + (GRID - 1 - row) * 0.1,
  },
];

export function dotPosition(col: number, row: number): [number, number] {
  return [PAD + col * SPACING, PAD + row * SPACING];
}
