# Dot Matrix Animations

Twenty-eight deliberate 5×5 dot-matrix animations, each a hand-designed
pattern rather than per-frame brightness sampled from a video. Ships in two
forms:

- Standalone animated SVG files in [`svg/`](./svg) (~4 KB each)
- A small React/TypeScript component in [`src/`](./src)

Both render the same set of patterns: **Pulse Rings**, **Spiral**, **Wave**,
**Cross Expand**, **Rain**, **Heartbeat**, **Loading**, **Diagonal Scan**,
**Sparkle**, **Column Scan**, **Beacon**, **Diamond**, **Pyramid**,
**Bounce**, **Breath**, **Orbit**, **Twin Orbit**, **Ring Pulse**,
**Thinking**, **Stream**, **Scan Line**, **Handshake**, **Knight's Tour**,
**Lattice**, **Cipher**, **Listening**, **Relay**, **Compile**.

The last ten are agent-flavored — useful for AI/agent loading states,
streaming output, decryption, peer handshakes, and build progress.

## Files

- [`scripts/generate_animations.py`](./scripts/generate_animations.py) —
  Python generator for the SVGs and the 3×3 scene.
- [`src/dotMatrixPatterns.ts`](./src/dotMatrixPatterns.ts) — pattern specs
  shared across the React side (mirrors the Python generator).
- [`src/DotMatrixIcon.tsx`](./src/DotMatrixIcon.tsx) — single icon component.
- [`src/DotMatrixScene.tsx`](./src/DotMatrixScene.tsx) — 3×3 scene component.
- [`svg/icons/`](./svg/icons) — nine standalone animated icons.
- [`svg/dot-matrix-scene.svg`](./svg/dot-matrix-scene.svg) — the 3×3 scene.
- [`index.html`](./index.html) — open in any browser to view the set.

## How the animations work

Each icon is a single CSS `@keyframes` definition (a brief opacity pulse,
a heartbeat, a fade trail, etc.) applied to all 25 dots. Per-dot
`animation-delay` values turn that one keyframe into a coordinated pattern —
ring distances, spiral order, sine wave, etc.

This keeps each SVG ≈4 KB, lets the browser run the animation natively at
60 fps with GPU compositing (only `opacity` is animated), and respects
`prefers-reduced-motion` automatically.

## React usage

```tsx
import { DotMatrixIcon, DotMatrixScene } from "./src";

export function Example() {
  return (
    <div style={{ background: "#050505", padding: 24 }}>
      <DotMatrixIcon iconIndex={0} size={96} />
      <DotMatrixScene />
    </div>
  );
}
```

`DotMatrixIcon` props: `iconIndex` (0–27, wraps), `size`, `color`, `baseColor`,
`autoPlay`, plus standard SVG props.

## Regenerate the SVGs

```bash
python3 scripts/generate_animations.py
```

If you change a pattern in `dotMatrixPatterns.ts`, mirror the change in
`generate_animations.py` (or vice versa) so the React and SVG outputs stay
in sync.
