# dot/matrix

A small library of 60 quiet 5×5 dot-matrix loader animations. Each one is a
hand-designed pattern, not per-frame brightness sampled from a video. They
ship in two forms:

- **Standalone animated SVG files** in [`public/svg/icons/`](./public/svg/icons) — about 4 KB each, no JS runtime
- **A React component** in [`src/components/DotMatrixIcon.tsx`](./src/components/DotMatrixIcon.tsx)

The showcase site is built with [TanStack Start](https://tanstack.com/start)
(React 19 + Vite + Nitro) and lives in [`src/routes/`](./src/routes).

## Loaders

60 patterns spanning rings, sweeps, sparkles, sequences, agent states,
physics-feeling motion, semantic outcome icons, and a small audio / radar /
equalizer set. The full list with categories and blurbs lives in
[`src/lib/patterns.ts`](./src/lib/patterns.ts), which is the single source of
truth for the React component, the standalone SVGs, and the sitemap.

Roadmap items live in [`ROADMAP.md`](./ROADMAP.md).

## How the animations work

Each icon is a single CSS `@keyframes` definition (a pulse, a heartbeat,
a fade trail, etc.) applied to all 25 dots. Per-dot `animation-delay`
values turn that one keyframe into a coordinated pattern: ring distances,
spiral order, sine wave, etc.

This keeps each SVG ≈4 KB, lets the browser run the animation natively at
60 fps with GPU compositing (only `opacity` is animated), and respects
`prefers-reduced-motion` automatically.

## Develop

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm build
pnpm preview
```

## React usage

```tsx
import { DotMatrixIcon } from "~/components/DotMatrixIcon";

<DotMatrixIcon iconIndex={0} size={96} />
```

`DotMatrixIcon` props: `iconIndex` (wraps modulo the icon count), `size`,
`color`, `baseColor`, `autoPlay`, plus standard SVG props.

## Regenerate the SVGs

```bash
pnpm regen        # alias for: tsx scripts/regen.ts
```

`scripts/regen.ts` imports `PATTERNS` directly from `src/lib/patterns.ts`,
re-uses `serializeIconSvg` for the per-icon files, and re-emits the scene SVG
plus `public/sitemap.xml`. There is no second generator to keep in sync —
edit a pattern, run regen, ship.

## Project layout

```
public/
  svg/icons/icon-NN.svg     standalone animated SVGs (~4 KB each)
  svg/dot-matrix-scene.svg  combined scene grid
  sitemap.xml               regenerated alongside the SVGs
src/
  routes/                   TanStack Start route files
  components/               DotMatrixIcon, DotMatrixScene, gallery UI
  lib/patterns.ts           single source of truth for every loader
  lib/serializeIcon.ts      runtime SVG-string renderer (copy button + regen)
  styles/app.css            global styles + design tokens
scripts/
  regen.ts                  TS regen — writes SVGs, scene, and sitemap
```
