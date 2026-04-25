import {
  DOT_R_BASE,
  DOT_R_LIT,
  GRID,
  PATTERNS,
  VIEWBOX,
  dotPosition,
} from "./patterns";

/**
 * Renders an animated 5×5 SVG to a self-contained string.
 *
 * Equivalent output to scripts/generate_animations.py — same per-cell
 * delay map, same opacity-only keyframes, same DOM shape — so the copy
 * button on a card produces a file that matches the on-disk SVG byte-
 * for-byte (modulo whitespace).
 */
export function serializeIconSvg(iconIndex: number, color = "#ffffff"): string {
  const pattern = PATTERNS[iconIndex];
  if (!pattern) throw new Error(`unknown icon index ${iconIndex}`);

  const id = pattern.slug;
  const bgRules: string[] = [];
  const litRules: string[] = [];
  const dots: string[] = [];

  for (let row = 0; row < GRID; row++) {
    for (let col = 0; col < GRID; col++) {
      const [cx, cy] = dotPosition(col, row);
      bgRules.push(
        `<circle class="bg" cx="${cx}" cy="${cy}" r="${DOT_R_BASE}"/>`,
      );
      const delay = pattern.delay(col, row);
      if (delay < 0) continue;
      const delayMs = Math.round(delay * pattern.durationMs);
      const cls = `d${row}${col}`;
      litRules.push(`.${cls}{animation-delay:${delayMs}ms;}`);
      dots.push(
        `<circle class="lit ${cls}" cx="${cx}" cy="${cy}" r="${DOT_R_LIT}"/>`,
      );
    }
  }

  const css = [
    `.bg{fill:${color};opacity:0.07;}`,
    `.lit{fill:${color};opacity:0;animation:${id}-kf ${pattern.durationMs}ms ${pattern.easing} infinite both;}`,
    `@keyframes ${id}-kf {${pattern.keyframes}}`,
    `@media (prefers-reduced-motion: reduce){.lit{animation:none;opacity:0.45;}}`,
    ...litRules,
  ].join("");

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VIEWBOX} ${VIEWBOX}" role="img" aria-label="${pattern.title}">`,
    `<title>${pattern.title}</title>`,
    `<desc>${pattern.blurb}</desc>`,
    `<style>${css}</style>`,
    bgRules.join(""),
    dots.join(""),
    `</svg>`,
  ].join("");
}
