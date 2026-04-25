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
  color?: string;
  baseColor?: string;
  /** When true, the animation runs; when false, dots stay in their resting state. */
  autoPlay?: boolean;
}

export function DotMatrixIcon({
  iconIndex,
  size = 56,
  color = "#ffffff",
  baseColor,
  autoPlay = true,
  style,
  ...props
}: DotMatrixIconProps) {
  const pattern = getDotMatrixPattern(iconIndex);
  const rawId = useId();
  const id = `dm-${rawId.replace(/[:]/g, "")}-${pattern.slug}`;
  const animation = autoPlay
    ? `${id}-kf ${pattern.durationMs}ms ${pattern.easing} infinite both`
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
  const delayRules: string[] = [];

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
      const delayMs = Math.round(delay * pattern.durationMs);
      const dotClass = `${id}-d${row}${col}`;
      delayRules.push(`.${dotClass} { animation-delay: ${delayMs}ms; }`);
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
      <style>{styleSheet + delayRules.join("\n")}</style>
      {dots}
      {litDots}
    </svg>
  );
}
