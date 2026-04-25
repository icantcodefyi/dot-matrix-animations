import { useId, type SVGProps } from "react";

import {
  DOT_R_BASE,
  DOT_R_LIT,
  GRID,
  PATTERNS,
  VIEWBOX,
  dotPosition,
  type PatternSpec,
} from "~/lib/patterns";

export const DOT_MATRIX_ICON_COUNT = PATTERNS.length;

function wrapIcon(iconIndex: number) {
  return ((iconIndex % DOT_MATRIX_ICON_COUNT) + DOT_MATRIX_ICON_COUNT) % DOT_MATRIX_ICON_COUNT;
}

export function getDotMatrixPattern(iconIndex: number): PatternSpec {
  return PATTERNS[wrapIcon(iconIndex)];
}

export interface DotMatrixIconProps extends Omit<SVGProps<SVGSVGElement>, "color"> {
  iconIndex: number;
  size?: number;
  /** Defaults to currentColor so a parent can recolor by setting CSS color. */
  color?: string;
  baseColor?: string;
  /** When true, the animation runs; when false, dots stay in their resting state. */
  autoPlay?: boolean;
  /** Multiplier applied to durationMs and per-cell delays. 1 = native speed, 2 = 2× faster. */
  speedMultiplier?: number;
}

export function DotMatrixIcon({
  iconIndex,
  size = 56,
  color = "currentColor",
  baseColor,
  autoPlay = true,
  speedMultiplier = 1,
  style,
  ...props
}: DotMatrixIconProps) {
  const pattern = getDotMatrixPattern(iconIndex);
  const rawId = useId();
  const id = `dm-${rawId.replace(/[:]/g, "")}-${pattern.slug}`;
  const iteration = pattern.iteration ?? "infinite";
  const speed = speedMultiplier > 0 ? speedMultiplier : 1;
  const scaledDuration = Math.round(pattern.durationMs / speed);
  const animation = autoPlay
    ? `${id}-kf ${scaledDuration}ms ${pattern.easing} ${iteration} both`
    : "none";
  const restOpacity = autoPlay ? 0 : 0.45;

  const styleSheet = `
    .${id}-bg { fill: ${baseColor ?? color}; opacity: 0.07; }
    .${id}-lit { fill: ${color}; opacity: ${restOpacity}; animation: ${animation}; }
    @keyframes ${id}-kf {${pattern.keyframes}}
    @media (prefers-reduced-motion: reduce) {
      .${id}-lit { animation: none; opacity: 0.45; }
    }
  `;

  const dots: React.ReactNode[] = [];
  const litDots: React.ReactNode[] = [];
  const cellRules: string[] = [];

  for (let row = 0; row < GRID; row++) {
    for (let col = 0; col < GRID; col++) {
      const [cx, cy] = dotPosition(col, row);
      dots.push(
        <circle
          key={`bg-${row}-${col}`}
          className={`${id}-bg`}
          cx={cx}
          cy={cy}
          r={DOT_R_BASE}
        />
      );
      const delay = pattern.delay(col, row);
      if (delay < 0) continue;
      const delayMs = Math.round((delay * pattern.durationMs) / speed);
      const dotClass = `${id}-d${row}${col}`;
      const factor = pattern.durationFactor?.(col, row) ?? 1;
      const durationOverride =
        factor === 1
          ? ""
          : ` animation-duration: ${Math.round((pattern.durationMs * factor) / speed)}ms;`;
      cellRules.push(
        `.${dotClass} { animation-delay: ${delayMs}ms;${durationOverride} }`,
      );
      litDots.push(
        <circle
          key={`lit-${row}-${col}`}
          className={`${id}-lit ${dotClass}`}
          cx={cx}
          cy={cy}
          r={DOT_R_LIT}
        />
      );
    }
  }

  return (
    <svg
      aria-label={pattern.title}
      role="img"
      viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
      width={size}
      height={size}
      {...props}
      style={style}
    >
      <title>{pattern.title}</title>
      <desc>{pattern.blurb}</desc>
      <style>{styleSheet + cellRules.join("\n")}</style>
      {dots}
      {litDots}
    </svg>
  );
}
