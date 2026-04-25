# dot/matrix

A small library of quiet 5×5 dot-matrix loader animations. Each one is a
hand-designed pattern, not per-frame brightness sampled from a video. They
ship in two forms:

- **Standalone animated SVG files** in [`public/svg/icons/`](./public/svg/icons) — about 4 KB each, no JS runtime
- **A React component** in [`src/components/DotMatrixIcon.tsx`](./src/components/DotMatrixIcon.tsx)

The showcase site is built with [TanStack Start](https://tanstack.com/start)
(React 19 + Vite + Nitro) and lives in [`src/routes/`](./src/routes).

## Loaders

The first 28 cover rings, sweeps, sparkles, sequences, and an agent set:
**Pulse Rings**, **Spiral**, **Wave**, **Cross Expand**, **Rain**,
**Heartbeat**, **Loading**, **Diagonal Scan**, **Sparkle**,
**Column Scan**, **Beacon**, **Diamond**, **Pyramid**, **Bounce**,
**Breath**, **Orbit**, **Twin Orbit**, **Ring Pulse**, **Thinking**,
**Stream**, **Scan Line**, **Handshake**, **Knight's Tour**, **Lattice**,
**Cipher**, **Listening**, **Relay**, **Compile**.

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
pnpm regen        # alias for: python3 scripts/generate_animations.py
```

If you change a pattern in [`src/lib/patterns.ts`](./src/lib/patterns.ts),
mirror the change in [`scripts/generate_animations.py`](./scripts/generate_animations.py)
(or vice versa) so the React and SVG outputs stay in sync.

## Project layout

```
public/
  svg/icons/icon-NN.svg     standalone animated SVGs (~4 KB each)
  svg/dot-matrix-scene.svg  3×3 scene grid
src/
  routes/                   TanStack Start route files
  components/               DotMatrixIcon, DotMatrixScene, gallery UI
  lib/patterns.ts           pattern specs (mirrored in the Python generator)
  lib/serializeIcon.ts      runtime SVG-string renderer (used by copy button)
  styles/app.css            global styles + design tokens
scripts/
  generate_animations.py    Python generator for the standalone SVGs
```
