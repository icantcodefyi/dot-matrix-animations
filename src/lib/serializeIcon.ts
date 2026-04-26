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
/**
 * Renders an animated 5×5 SVG to a self-contained string.
 *
 * Default `color` is "#ffffff" — a hard-coded color makes the copied SVG
 * self-sufficient (no host stylesheet needed). Pass a different color to
 * match the gallery's accent picker; pass "currentColor" to inherit.
 */
export function serializeIconSvg(iconIndex: number, color = "#ffffff"): string {
  const pattern = PATTERNS[iconIndex];
  if (!pattern) throw new Error(`unknown icon index ${iconIndex}`);

  const id = pattern.slug;
  const bgUses: string[] = [];
  const litUses: string[] = [];
  const iteration = pattern.iteration ?? "infinite";

  // delay+factor signature -> list of cell class names. Lets us emit a single
  // grouped selector per unique timing tuple, which is a big win for any
  // pattern where rows/columns share a phase (Column Scan, Boot, Scan Line…).
  const groups = new Map<string, string[]>();

  for (let row = 0; row < GRID; row++) {
    for (let col = 0; col < GRID; col++) {
      const [cx, cy] = dotPosition(col, row);
      bgUses.push(`<use href="#b" x="${cx}" y="${cy}"/>`);
      const delay = pattern.delay(col, row);
      if (delay < 0) continue;
      const delayMs = Math.round(delay * pattern.durationMs);
      const factor = pattern.durationFactor?.(col, row) ?? 1;
      const durMs = factor === 1 ? 0 : Math.round(pattern.durationMs * factor);
      const key = `${delayMs}|${durMs}`;
      const cls = `d${row}${col}`;
      const list = groups.get(key);
      if (list) list.push(cls);
      else groups.set(key, [cls]);
      litUses.push(`<use class="l ${cls}" href="#l" x="${cx}" y="${cy}"/>`);
    }
  }

  const cellRules: string[] = [];
  for (const [key, classes] of groups) {
    const [delayStr, durStr] = key.split("|");
    const dur = durStr === "0" ? "" : `animation-duration:${durStr}ms;`;
    const sel = classes.map((c) => `.${c}`).join(",");
    cellRules.push(`${sel}{animation-delay:${delayStr}ms;${dur}}`);
  }

  const kf = `${id}-k`;
  const css = [
    `.l{fill:${color};opacity:0;animation:${kf} ${pattern.durationMs}ms ${pattern.easing} ${iteration} both;}`,
    `@keyframes ${kf}{${pattern.keyframes}}`,
    `@media (prefers-reduced-motion:reduce){.l{animation:none;opacity:0.45;}}`,
    ...cellRules,
  ].join("");

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VIEWBOX} ${VIEWBOX}" role="img" aria-label="${pattern.title}">`,
    `<title>${pattern.title}</title>`,
    `<desc>${pattern.blurb}</desc>`,
    `<defs>`,
    `<circle id="b" r="${DOT_R_BASE}" fill="${color}" opacity="0.07"/>`,
    `<circle id="l" r="${DOT_R_LIT}"/>`,
    `</defs>`,
    `<style>${css}</style>`,
    bgUses.join(""),
    litUses.join(""),
    `</svg>`,
  ].join("");
}
