import { GRID, PATTERNS, VIEWBOX, dotPosition } from "./patterns";

const OG_W = 1200;
const OG_H = 630;
const SITE_HOST = "dot-matrix-animations.vercel.app";

const C = {
  bg: "#1c1b18",
  text: "#f5f5f3",
  textChrome: "#c4c2bb",
  textMid: "#9a9892",
  textDim: "#6a6863",
  hairline: "#2a2925",
};

const FONT_SANS =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, system-ui, sans-serif";
const FONT_MONO = "ui-monospace, 'SF Mono', Menlo, monospace";

export function serializeOgIconSvg(iconIndex: number): string {
  const pattern = PATTERNS[iconIndex];
  if (!pattern) throw new Error(`unknown icon index ${iconIndex}`);

  const total = PATTERNS.length;
  const indexLabel = `${String(iconIndex + 1).padStart(2, "0")} / ${String(total).padStart(2, "0")}`;

  // Static "stamp" of the timing pattern. Cells are placed at their actual
  // grid positions; brightness encodes the per-cell delay so the OG image
  // visualises the wave/scan/echo as a still composition.
  const stampSize = 380;
  const stampScale = stampSize / VIEWBOX;
  const stampCenterX = 320;
  const stampCenterY = 315;
  const stampX = stampCenterX - stampSize / 2;
  const stampY = stampCenterY - stampSize / 2;

  let maxDelay = 0;
  for (let r = 0; r < GRID; r++) {
    for (let c = 0; c < GRID; c++) {
      const d = pattern.delay(c, r);
      if (d > maxDelay) maxDelay = d;
    }
  }
  const span = maxDelay > 0 ? maxDelay : 1;

  const dots: string[] = [];
  for (let row = 0; row < GRID; row++) {
    for (let col = 0; col < GRID; col++) {
      const [cx, cy] = dotPosition(col, row);
      const px = (stampX + cx * stampScale).toFixed(2);
      const py = (stampY + cy * stampScale).toFixed(2);
      const delay = pattern.delay(col, row);
      if (delay < 0) {
        const r = (2.4 * stampScale).toFixed(2);
        dots.push(
          `<circle cx="${px}" cy="${py}" r="${r}" fill="${C.text}" opacity="0.10"/>`,
        );
      } else {
        const t = delay / span;
        const opacity = (1 - t * 0.72).toFixed(3);
        const r = (3.1 * stampScale).toFixed(2);
        dots.push(
          `<circle cx="${px}" cy="${py}" r="${r}" fill="${C.text}" opacity="${opacity}"/>`,
        );
      }
    }
  }

  const TEXT_X = 600;
  const TEXT_RIGHT = 1120;
  const TEXT_WIDTH = TEXT_RIGHT - TEXT_X;

  // Two-line wrap budget for the blurb at 28px sans (~22 px ch on average).
  const blurbLines = wrapTwoLines(pattern.blurb, 38);

  const url = `${SITE_HOST}/icon/${pattern.slug}`;
  const meta = `${pattern.category}  ·  ${pattern.durationMs}ms`;

  const parts: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${OG_W}" height="${OG_H}" viewBox="0 0 ${OG_W} ${OG_H}" role="img" aria-label="dot/matrix — ${escapeXml(pattern.title)}: ${escapeXml(pattern.blurb)}">`,
    `<rect width="${OG_W}" height="${OG_H}" fill="${C.bg}"/>`,
    // top hairline + chrome
    `<line x1="80" y1="72" x2="1120" y2="72" stroke="${C.hairline}" stroke-width="1"/>`,
    `<text x="80" y="50" fill="${C.textChrome}" font-family="${FONT_MONO}" font-size="17" font-weight="500" letter-spacing="0.3">dot<tspan fill="${C.textDim}">/</tspan>matrix</text>`,
    `<text x="1120" y="50" text-anchor="end" fill="${C.textMid}" font-family="${FONT_MONO}" font-size="17" letter-spacing="1">${indexLabel}  ·  v0.1</text>`,
    // loader stamp
    ...dots,
    // category eyebrow
    `<text x="${TEXT_X}" y="240" fill="${C.textMid}" font-family="${FONT_MONO}" font-size="16" letter-spacing="2.6">${pattern.category.toUpperCase()}</text>`,
    // title
    `<text x="${TEXT_X}" y="318" fill="${C.text}" font-family="${FONT_SANS}" font-size="76" font-weight="500" letter-spacing="-2">${escapeXml(pattern.title)}</text>`,
  ];

  // blurb (1 or 2 lines)
  parts.push(
    `<text x="${TEXT_X}" y="380" fill="${C.textChrome}" font-family="${FONT_SANS}" font-size="28" letter-spacing="-0.3">${escapeXml(blurbLines[0] ?? "")}</text>`,
  );
  if (blurbLines[1]) {
    parts.push(
      `<text x="${TEXT_X}" y="418" fill="${C.textChrome}" font-family="${FONT_SANS}" font-size="28" letter-spacing="-0.3">${escapeXml(blurbLines[1])}</text>`,
    );
  }

  // meta line
  parts.push(
    `<text x="${TEXT_X}" y="478" fill="${C.textMid}" font-family="${FONT_MONO}" font-size="17" letter-spacing="1">${meta}</text>`,
  );

  // bottom hairline + chrome
  parts.push(
    `<line x1="80" y1="558" x2="1120" y2="558" stroke="${C.hairline}" stroke-width="1"/>`,
    `<text x="80" y="590" fill="${C.textMid}" font-family="${FONT_MONO}" font-size="17" letter-spacing="0.6">${escapeXml(url)}</text>`,
    `<text x="1120" y="590" text-anchor="end" fill="${C.textMid}" font-family="${FONT_MONO}" font-size="17" letter-spacing="1.2">5×5  ·  ~4 KB  ·  NO JS</text>`,
    `</svg>`,
  );

  void TEXT_WIDTH;
  return parts.join("");
}

function wrapTwoLines(text: string, maxChars: number): [string, string?] {
  if (text.length <= maxChars) return [text];
  const words = text.split(" ");
  let line1 = "";
  let line2 = "";
  for (const word of words) {
    if (!line2 && (line1 ? line1.length + 1 + word.length : word.length) <= maxChars) {
      line1 = line1 ? `${line1} ${word}` : word;
    } else {
      line2 = line2 ? `${line2} ${word}` : word;
    }
  }
  return line2 ? [line1, line2] : [line1];
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
