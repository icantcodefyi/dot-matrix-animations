import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  DOT_R_BASE,
  DOT_R_LIT,
  GRID,
  PATTERNS,
  VIEWBOX,
  dotPosition,
  type PatternSpec,
} from "../src/lib/patterns.ts";
import { serializeIconSvg } from "../src/lib/serializeIcon.ts";
import { serializeOgIconSvg } from "../src/lib/serializeOgSvg.ts";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..");
const iconDir = resolve(repoRoot, "public", "svg", "icons");
const ogDir = resolve(repoRoot, "public", "og");
const rootOgSvg = resolve(repoRoot, "public", "og-image.svg");
const rootOgPng = resolve(repoRoot, "public", "og-image.png");
const scenePath = resolve(repoRoot, "public", "svg", "dot-matrix-scene.svg");
const sitemapPath = resolve(repoRoot, "public", "sitemap.xml");
const SITE_URL = "https://dot-matrix-animations.vercel.app";

mkdirSync(iconDir, { recursive: true });
mkdirSync(ogDir, { recursive: true });

const hasRsvg = (() => {
  try {
    execFileSync("rsvg-convert", ["--version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
})();
if (!hasRsvg) {
  console.warn(
    "rsvg-convert not found on PATH — OG SVGs written but PNGs skipped.\n" +
      "  install with: brew install librsvg",
  );
}

function rasterize(svgPath: string, pngPath: string): void {
  if (!hasRsvg) return;
  execFileSync("rsvg-convert", [
    "-w",
    "1200",
    "-h",
    "630",
    svgPath,
    "-o",
    pngPath,
  ]);
}

for (let i = 0; i < PATTERNS.length; i++) {
  const pattern = PATTERNS[i];
  const file = resolve(iconDir, `${pattern.slug}.svg`);
  writeFileSync(file, serializeIconSvg(i) + "\n", "utf8");
  console.log(`wrote public/svg/icons/${pattern.slug}.svg  ${pattern.title}`);
}

// Per-icon OG images (SVG + PNG) for /icon/<slug> social previews.
for (let i = 0; i < PATTERNS.length; i++) {
  const pattern = PATTERNS[i];
  const ogSvg = resolve(ogDir, `${pattern.slug}.svg`);
  const ogPng = resolve(ogDir, `${pattern.slug}.png`);
  writeFileSync(ogSvg, serializeOgIconSvg(i) + "\n", "utf8");
  rasterize(ogSvg, ogPng);
}
console.log(
  `wrote ${PATTERNS.length} OG images to public/og/${hasRsvg ? "" : " (svg only — install rsvg-convert for png)"}`,
);

// Root OG png is rendered from the hand-authored og-image.svg.
rasterize(rootOgSvg, rootOgPng);
if (hasRsvg) console.log(`wrote public/og-image.png  (root)`);

const SCENE_COLS = 6;
const tile = VIEWBOX + 14;
const rows = Math.ceil(PATTERNS.length / SCENE_COLS);
const sceneW = tile * SCENE_COLS;
const sceneH = tile * rows;

function renderTile(spec: PatternSpec, prefix: string): { style: string; body: string } {
  const iteration = spec.iteration ?? "infinite";
  const litCls = `${prefix}lit`;
  const bgCls = `${prefix}bg`;
  const kfName = `${prefix}kf`;
  const rules: string[] = [
    `.${bgCls}{fill:#f5f5f5;opacity:0.07;}`,
    `.${litCls}{fill:#ffffff;opacity:0;animation:${kfName} ${spec.durationMs}ms ${spec.easing} ${iteration} both;}`,
    `@keyframes ${kfName} {${spec.keyframes}}`,
    `@media (prefers-reduced-motion: reduce){.${litCls}{animation:none;opacity:0.45;}}`,
  ];
  const bg: string[] = [];
  const lit: string[] = [];
  for (let row = 0; row < GRID; row++) {
    for (let col = 0; col < GRID; col++) {
      const [cx, cy] = dotPosition(col, row);
      bg.push(`<circle class="${bgCls}" cx="${cx}" cy="${cy}" r="${DOT_R_BASE}"/>`);
      const delay = spec.delay(col, row);
      if (delay < 0) continue;
      const delayMs = Math.round(delay * spec.durationMs);
      const factor = spec.durationFactor?.(col, row) ?? 1;
      const dur =
        factor === 1
          ? ""
          : `animation-duration:${Math.round(spec.durationMs * factor)}ms;`;
      rules.push(`.${prefix}d${row}${col}{animation-delay:${delayMs}ms;${dur}}`);
      lit.push(
        `<circle class="${litCls} ${prefix}d${row}${col}" cx="${cx}" cy="${cy}" r="${DOT_R_LIT}"/>`,
      );
    }
  }
  return { style: rules.join(""), body: bg.join("") + lit.join("") };
}

const sceneStyles: string[] = [".tile{fill:#0a0a0a;stroke:#1a1a1a;stroke-width:1;}"];
const sceneBodies: string[] = [];
for (let i = 0; i < PATTERNS.length; i++) {
  const col = i % SCENE_COLS;
  const row = Math.floor(i / SCENE_COLS);
  const x = col * tile;
  const y = row * tile;
  const { style, body } = renderTile(PATTERNS[i], `i${i}_`);
  sceneStyles.push(style);
  const tx = x + (tile - VIEWBOX) / 2;
  const ty = y + (tile - VIEWBOX) / 2;
  sceneBodies.push(
    `<rect class="tile" x="${x + 0.5}" y="${y + 0.5}" width="${tile - 1}" height="${tile - 1}" rx="10"/>` +
      `<g transform="translate(${tx.toFixed(2)} ${ty.toFixed(2)})">${body}</g>`,
  );
}

const sceneSvg =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${sceneW} ${sceneH}" role="img" aria-label="Dot Matrix Scene">` +
  `<title>Dot Matrix Scene</title>` +
  `<desc>${PATTERNS.length} deliberate dot-matrix animations laid out on a grid.</desc>` +
  `<style>${sceneStyles.join("")}</style>` +
  `<rect width="${sceneW}" height="${sceneH}" fill="#050505"/>` +
  sceneBodies.join("") +
  `</svg>\n`;

writeFileSync(scenePath, sceneSvg, "utf8");
console.log(`wrote public/svg/dot-matrix-scene.svg  ${PATTERNS.length} tiles`);

const today = new Date().toISOString().slice(0, 10);
const urls: string[] = [
  `  <url>\n    <loc>${SITE_URL}/</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>1.0</priority>\n  </url>`,
];
for (const p of PATTERNS) {
  urls.push(
    `  <url>\n    <loc>${SITE_URL}/icon/${p.slug}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.7</priority>\n  </url>`,
  );
}
const sitemap =
  `<?xml version="1.0" encoding="UTF-8"?>\n` +
  `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  urls.join("\n") +
  `\n</urlset>\n`;
writeFileSync(sitemapPath, sitemap, "utf8");
console.log(`wrote public/sitemap.xml  ${PATTERNS.length + 1} urls`);
