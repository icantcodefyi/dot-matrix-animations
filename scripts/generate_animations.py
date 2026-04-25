"""Generate hand-designed dot-matrix SVG animations.

Produces 9 standalone animated SVG icons (5x5 dots each) plus a 3x3 scene
SVG that combines them. Each icon uses CSS keyframe animations with per-dot
animation-delay so the SVGs stay small and the patterns are deliberate
rather than sampled noise.

Run from repo root:
    python3 scripts/generate_animations.py
"""

from __future__ import annotations

import math
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Callable, List, Sequence, Tuple


GRID = 5
PAD = 6.0
SPACING = 11.0
VIEWBOX = PAD * 2 + SPACING * (GRID - 1)  # 50
DOT_R_BASE = 2.4
DOT_R_LIT = 3.1
DURATION_MS = 2400
EASE_OUT_QUART = "cubic-bezier(0.25, 1, 0.5, 1)"
EASE_OUT_EXPO = "cubic-bezier(0.16, 1, 0.3, 1)"
EASE_IN_OUT = "cubic-bezier(0.65, 0, 0.35, 1)"

REPO_ROOT = Path(__file__).resolve().parent.parent
ICON_DIR = REPO_ROOT / "svg" / "icons"
SCENE_PATH = REPO_ROOT / "svg" / "dot-matrix-scene.svg"
ICONS_JS_PATH = REPO_ROOT / "svg" / "icons.js"


@dataclass
class IconSpec:
    slug: str
    title: str
    blurb: str
    keyframes_css: str  # body of @keyframes (without the @keyframes wrapper)
    delay_fn: Callable[[int, int], float]  # (col, row) -> delay fraction in [0, 1)
    duration_ms: int = DURATION_MS
    easing: str = EASE_OUT_QUART
    iteration: str = "infinite"
    keyframes_name: str = "lit"


# ---------- delay layouts ----------

CENTER = (GRID - 1) / 2  # 2.0 for 5x5


def delay_chebyshev_rings(col: int, row: int) -> float:
    """Pulse Rings, Chebyshev distance from center (0..2)."""
    d = max(abs(col - CENTER), abs(row - CENTER))
    return d / 6.0  # 0, 1/6, 2/6


def delay_manhattan_cross(col: int, row: int) -> float:
    """Cross Expand, Manhattan distance from center (0..4)."""
    d = abs(col - CENTER) + abs(row - CENTER)
    return d / 10.0  # 0..0.4


def delay_diagonal(col: int, row: int) -> float:
    """Diagonal scan, col+row index (0..8)."""
    return (col + row) / 12.0  # 0..0.667


def delay_wave_horizontal(col: int, row: int) -> float:
    """Sine wave moving left to right with row phase offset."""
    return (col / 5.0) + (row * 0.02)


def delay_rain_columns(col: int, row: int) -> float:
    """Rain, per-column random-feeling starts, then drop falls down."""
    column_starts = [0.00, 0.55, 0.20, 0.75, 0.35]
    return (column_starts[col] + row * 0.07) % 1.0


def delay_zero(col: int, row: int) -> float:
    """All dots animate in unison."""
    return 0.0


def delay_radial_echo(col: int, row: int) -> float:
    """Heartbeat with subtle radial echo from center."""
    d = math.hypot(col - CENTER, row - CENTER)
    return min(d * 0.015, 0.06)


SPIRAL_ORDER = [
    (2, 2), (2, 1), (3, 1), (3, 2), (3, 3), (2, 3), (1, 3), (1, 2), (1, 1),
    (2, 0), (3, 0), (4, 0), (4, 1), (4, 2), (4, 3), (4, 4), (3, 4), (2, 4),
    (1, 4), (0, 4), (0, 3), (0, 2), (0, 1), (0, 0), (1, 0),
]


def delay_spiral(col: int, row: int) -> float:
    idx = SPIRAL_ORDER.index((col, row))
    return idx / (len(SPIRAL_ORDER) + 4)  # leave a small tail


# Edge-only loading spinner: 16 perimeter dots, sweep clockwise.
EDGE_ORDER: List[Tuple[int, int]] = []
for c in range(GRID):
    EDGE_ORDER.append((c, 0))
for r in range(1, GRID):
    EDGE_ORDER.append((GRID - 1, r))
for c in range(GRID - 2, -1, -1):
    EDGE_ORDER.append((c, GRID - 1))
for r in range(GRID - 2, 0, -1):
    EDGE_ORDER.append((0, r))


def delay_loading_edge(col: int, row: int) -> float:
    if (col, row) in EDGE_ORDER:
        return EDGE_ORDER.index((col, row)) / len(EDGE_ORDER)
    return -1.0  # signal: no animation, stay base


def delay_sparkle(col: int, row: int) -> float:
    """Pseudo-random twinkles with a deterministic hash."""
    idx = row * GRID + col
    h = ((idx * 2654435761) ^ (idx * idx * 40503)) & 0xFFFFFFFF
    return ((h % 1000) / 1000.0)


# ---------- new delay layouts (icons 10-18) ----------


def delay_column_scan(col: int, row: int) -> float:
    """Vertical bar sweeps left to right, one column at a time."""
    return col / 6.0  # 0, 1/6, 2/6, 3/6, 4/6


def delay_beacon(col: int, row: int) -> float:
    """Only the center dot pulses; outer dots stay base."""
    if col == 2 and row == 2:
        return 0.0
    return -1.0


def delay_diamond(col: int, row: int) -> float:
    """Diamond (rotated square) bloom, Manhattan rings from center."""
    d = abs(col - CENTER) + abs(row - CENTER)
    return d / 12.0


def delay_pyramid(col: int, row: int) -> float:
    """Triangle grows from the bottom up, stepped pyramid 1, 1, 3, 3, 5."""
    half_width = row // 2  # 0,0,1,1,2 from top to bottom
    if abs(col - CENTER) > half_width:
        return -1.0
    return (GRID - 1 - row) / 8.0  # bottom row first, apex last


def delay_diagonal_bounce(col: int, row: int) -> float:
    """Single bright dot travels along the main diagonal corner-to-corner."""
    if col != row:
        return -1.0
    return col / 8.0


def delay_breath(col: int, row: int) -> float:
    """All dots breathe in unison, no per-dot offset."""
    return 0.0


# Outer-ring orbit: 16 perimeter dots, single dot sweeping clockwise.
def delay_orbit(col: int, row: int) -> float:
    if (col, row) in EDGE_ORDER:
        return EDGE_ORDER.index((col, row)) / len(EDGE_ORDER)
    return -1.0


# Two-dot counter-rotation on the outer ring. We achieve "two dots" by
# splitting the perimeter into two halves and giving each half a phase that
# wraps within a half-loop, so a CW dot sweeps the top half while a CCW dot
# sweeps the bottom half (visually: two dots circling, never colliding).
TWIN_ORDER_CW = EDGE_ORDER  # clockwise sweep of all 16 perimeter dots
HALF = len(EDGE_ORDER) // 2


def delay_twin_orbit(col: int, row: int) -> float:
    if (col, row) not in EDGE_ORDER:
        return -1.0
    idx = EDGE_ORDER.index((col, row))
    # Each half completes the loop in the full duration, offset by 0.5 so
    # the two halves light at the same time but at opposite points.
    return (idx % HALF) / HALF * 0.5  # 0..0.5 for both halves


def delay_ring_pulse(col: int, row: int) -> float:
    """Outer ring lights as a single unit; interior stays base."""
    if (col, row) in EDGE_ORDER:
        return 0.0
    return -1.0


# ---------- new delay layouts (icons 19-28, agent-themed) ----------


def _hash01(idx: int, salt: int = 1) -> float:
    """Deterministic 0..1 hash for an integer index."""
    h = ((idx * 2654435761) ^ (idx * idx * 40503) ^ (salt * 374761393)) & 0xFFFFFFFF
    return (h % 1000) / 1000.0


def delay_thinking(col: int, row: int) -> float:
    """Thinking, inner 3x3 cluster fires in a deterministic random order."""
    if not (1 <= col <= 3 and 1 <= row <= 3):
        return -1.0
    idx = (row - 1) * 3 + (col - 1)
    return _hash01(idx, salt=7)


def delay_stream(col: int, row: int) -> float:
    """Stream, left-to-right, top-to-bottom token emission."""
    return (row * GRID + col) / 28.0  # 0..0.857, leaves a small tail


def delay_scan_line(col: int, row: int) -> float:
    """Scan Line, entire row lights together, advances down the grid."""
    return row / 6.0  # 0, 1/6, 2/6, 3/6, 4/6


def delay_handshake(col: int, row: int) -> float:
    """Handshake, two travelers move along the main diagonal to meet at center."""
    if col != row:
        return -1.0
    # Distance from each end to center → both ends fire first, center last.
    d = min(col, GRID - 1 - col)  # 0,1,2,1,0
    return d / 6.0  # 0, 1/6, 2/6


# Verified open knight's tour on 5x5 starting at (0,0).
KNIGHT_TOUR: List[Tuple[int, int]] = [
    (0, 0), (2, 1), (4, 0), (3, 2), (4, 4),
    (2, 3), (0, 4), (1, 2), (3, 1), (4, 3),
    (2, 4), (0, 3), (1, 1), (3, 0), (4, 2),
    (3, 4), (1, 3), (0, 1), (2, 0), (4, 1),
    (3, 3), (1, 4), (2, 2), (1, 0), (0, 2),
]


def delay_knight(col: int, row: int) -> float:
    """Knight's Tour, single bright dot follows a 25-step open tour."""
    idx = KNIGHT_TOUR.index((col, row))
    return idx / (len(KNIGHT_TOUR) + 4)  # leaves a small tail before loop


def delay_lattice(col: int, row: int) -> float:
    """Lattice, checkerboard breathes in two opposing phases."""
    return 0.0 if (col + row) % 2 == 0 else 0.5


def delay_cipher(col: int, row: int) -> float:
    """Cipher, dots fire in four hash-bucketed waves, decryption-style."""
    idx = row * GRID + col
    h = ((idx * 1103515245 + 12345) ^ (idx * idx * 2654435761)) & 0xFFFFFFFF
    bucket = h % 4
    return bucket / 4.0  # 0, 0.25, 0.5, 0.75


def delay_listening(col: int, row: int) -> float:
    """Listening, concentric rings collapse INWARD, edge first then center."""
    d = max(abs(col - CENTER), abs(row - CENTER))  # 0,1,2
    return (2 - d) / 6.0  # outer=0, mid=1/6, center=2/6


# Eight perimeter principal dots (4 corners + 4 edge midpoints) for Relay.
RELAY_PAIRS: List[Tuple[Tuple[int, int], Tuple[int, int]]] = [
    ((0, 0), (4, 4)),  # TL ↔ BR
    ((4, 0), (0, 4)),  # TR ↔ BL
    ((2, 0), (2, 4)),  # T  ↔ B
    ((0, 2), (4, 2)),  # L  ↔ R
]


def delay_relay(col: int, row: int) -> float:
    """Relay, 8 perimeter dots ping in antipodal pairs around the cycle."""
    for i, (a, b) in enumerate(RELAY_PAIRS):
        if (col, row) == a or (col, row) == b:
            return i / 4.0
    return -1.0


def delay_compile(col: int, row: int) -> float:
    """Compile, each column fills bottom-up with a slight per-column stagger."""
    col_offset = col * 0.04
    row_step = (GRID - 1 - row) * 0.10  # bottom row first
    return col_offset + row_step  # 0..0.56


# ---------- keyframes ----------

# Standard "brief peak then rest" pulse.
PULSE_KF = """
0%   { opacity: 0; }
8%   { opacity: 1; }
36%  { opacity: 0.05; }
100% { opacity: 0; }
"""

# Soft sustained breath, for waves.
BREATH_KF = """
0%   { opacity: 0.05; }
20%  { opacity: 1; }
55%  { opacity: 0.18; }
100% { opacity: 0.05; }
"""

# Heartbeat, lub-dub, then long rest.
HEART_KF = """
0%   { opacity: 0.18; }
6%   { opacity: 0.95; }
14%  { opacity: 0.30; }
22%  { opacity: 1; }
34%  { opacity: 0.20; }
70%  { opacity: 0.18; }
100% { opacity: 0.18; }
"""

# Spinner trail, sharp on, smooth fade.
TRAIL_KF = """
0%   { opacity: 0; }
4%   { opacity: 1; }
26%  { opacity: 0.08; }
100% { opacity: 0; }
"""

# Rain drop, quick on, vertical fade.
RAIN_KF = """
0%   { opacity: 0; }
6%   { opacity: 1; }
22%  { opacity: 0.10; }
100% { opacity: 0; }
"""

# Sparkle, tiny twinkle.
SPARKLE_KF = """
0%   { opacity: 0.05; }
40%  { opacity: 0.05; }
50%  { opacity: 1; }
60%  { opacity: 0.05; }
100% { opacity: 0.05; }
"""

# Slow, synchronized breath, used for the all-on ambient glow.
SLOW_BREATH_KF = """
0%   { opacity: 0.10; }
50%  { opacity: 0.85; }
100% { opacity: 0.10; }
"""

# Beacon, long rest, single bright peak, slow fade.
BEACON_KF = """
0%   { opacity: 0.12; }
14%  { opacity: 1; }
40%  { opacity: 0.12; }
100% { opacity: 0.12; }
"""

# Bloom, held bright then a slow release (used for diamond and pyramid).
BLOOM_KF = """
0%   { opacity: 0; }
10%  { opacity: 1; }
55%  { opacity: 0.85; }
100% { opacity: 0; }
"""

# Ring breath, entire ring lights together, holds, fades.
RING_KF = """
0%   { opacity: 0.10; }
20%  { opacity: 1; }
60%  { opacity: 0.20; }
100% { opacity: 0.10; }
"""

# Synapse, short sharp neuron-fire flash with quiet rest.
SYNAPSE_KF = """
0%   { opacity: 0.05; }
30%  { opacity: 0.05; }
40%  { opacity: 1; }
55%  { opacity: 0.10; }
100% { opacity: 0.05; }
"""

# Lattice breath, slow opposing breath shared by half the grid.
LATTICE_KF = """
0%   { opacity: 0.08; }
30%  { opacity: 0.85; }
60%  { opacity: 0.12; }
100% { opacity: 0.08; }
"""

# Cipher flicker, rapid binary-style on/off, tighter than sparkle.
CIPHER_KF = """
0%   { opacity: 0; }
8%   { opacity: 1; }
22%  { opacity: 0.05; }
46%  { opacity: 0.85; }
58%  { opacity: 0.05; }
100% { opacity: 0; }
"""

# Fill, bright rise, holds for most of the cycle, releases together.
FILL_KF = """
0%   { opacity: 0.08; }
14%  { opacity: 1; }
72%  { opacity: 0.95; }
100% { opacity: 0.08; }
"""


# ---------- icon set ----------

ICONS: List[IconSpec] = [
    IconSpec(
        slug="icon-01",
        title="Pulse Rings",
        blurb="Concentric rings expand from the center.",
        keyframes_css=PULSE_KF,
        delay_fn=delay_chebyshev_rings,
        duration_ms=2200,
        easing=EASE_OUT_EXPO,
    ),
    IconSpec(
        slug="icon-02",
        title="Spiral",
        blurb="A bright trace winds outward from the center.",
        keyframes_css=TRAIL_KF,
        delay_fn=delay_spiral,
        duration_ms=2800,
        easing=EASE_OUT_QUART,
    ),
    IconSpec(
        slug="icon-03",
        title="Wave",
        blurb="A breathing sine wave drifts left to right.",
        keyframes_css=BREATH_KF,
        delay_fn=delay_wave_horizontal,
        duration_ms=2400,
        easing=EASE_IN_OUT,
    ),
    IconSpec(
        slug="icon-04",
        title="Cross Expand",
        blurb="A plus shape blooms outward in Manhattan steps.",
        keyframes_css=PULSE_KF,
        delay_fn=delay_manhattan_cross,
        duration_ms=2200,
        easing=EASE_OUT_EXPO,
    ),
    IconSpec(
        slug="icon-05",
        title="Rain",
        blurb="Independent drops fall column by column.",
        keyframes_css=RAIN_KF,
        delay_fn=delay_rain_columns,
        duration_ms=1800,
        easing=EASE_OUT_QUART,
    ),
    IconSpec(
        slug="icon-06",
        title="Heartbeat",
        blurb="Lub-dub pulse with a soft radial echo.",
        keyframes_css=HEART_KF,
        delay_fn=delay_radial_echo,
        duration_ms=1600,
        easing=EASE_OUT_QUART,
    ),
    IconSpec(
        slug="icon-07",
        title="Loading",
        blurb="A trailing spinner sweeps the outer ring.",
        keyframes_css=TRAIL_KF,
        delay_fn=delay_loading_edge,
        duration_ms=2000,
        easing="linear",
    ),
    IconSpec(
        slug="icon-08",
        title="Diagonal Scan",
        blurb="A diagonal stripe sweeps from corner to corner.",
        keyframes_css=PULSE_KF,
        delay_fn=delay_diagonal,
        duration_ms=2200,
        easing=EASE_OUT_QUART,
    ),
    IconSpec(
        slug="icon-09",
        title="Sparkle",
        blurb="Independent dots twinkle on a deterministic loop.",
        keyframes_css=SPARKLE_KF,
        delay_fn=delay_sparkle,
        duration_ms=2600,
        easing=EASE_IN_OUT,
    ),
    IconSpec(
        slug="icon-10",
        title="Column Scan",
        blurb="A vertical bar sweeps left to right, one column at a time.",
        keyframes_css=PULSE_KF,
        delay_fn=delay_column_scan,
        duration_ms=2200,
        easing=EASE_OUT_QUART,
    ),
    IconSpec(
        slug="icon-11",
        title="Beacon",
        blurb="A single center dot pulses while the field stays quiet.",
        keyframes_css=BEACON_KF,
        delay_fn=delay_beacon,
        duration_ms=1800,
        easing=EASE_OUT_EXPO,
    ),
    IconSpec(
        slug="icon-12",
        title="Diamond",
        blurb="A diamond blooms outward from the center.",
        keyframes_css=BLOOM_KF,
        delay_fn=delay_diamond,
        duration_ms=2200,
        easing=EASE_OUT_EXPO,
    ),
    IconSpec(
        slug="icon-13",
        title="Pyramid",
        blurb="A triangle grows from the bottom up, one row at a time.",
        keyframes_css=BLOOM_KF,
        delay_fn=delay_pyramid,
        duration_ms=2400,
        easing=EASE_OUT_QUART,
    ),
    IconSpec(
        slug="icon-14",
        title="Bounce",
        blurb="A bright dot travels along the main diagonal.",
        keyframes_css=TRAIL_KF,
        delay_fn=delay_diagonal_bounce,
        duration_ms=2400,
        easing=EASE_IN_OUT,
    ),
    IconSpec(
        slug="icon-15",
        title="Breath",
        blurb="The whole field breathes in and out together.",
        keyframes_css=SLOW_BREATH_KF,
        delay_fn=delay_breath,
        duration_ms=2800,
        easing=EASE_IN_OUT,
    ),
    IconSpec(
        slug="icon-16",
        title="Orbit",
        blurb="A single dot circles the perimeter at a steady pace.",
        keyframes_css=TRAIL_KF,
        delay_fn=delay_orbit,
        duration_ms=2400,
        easing="linear",
    ),
    IconSpec(
        slug="icon-17",
        title="Twin Orbit",
        blurb="Two dots circle the perimeter, each owning a half.",
        keyframes_css=TRAIL_KF,
        delay_fn=delay_twin_orbit,
        duration_ms=1800,
        easing="linear",
    ),
    IconSpec(
        slug="icon-18",
        title="Ring Pulse",
        blurb="The outer ring lights as one and slowly fades.",
        keyframes_css=RING_KF,
        delay_fn=delay_ring_pulse,
        duration_ms=2000,
        easing=EASE_OUT_QUART,
    ),
    IconSpec(
        slug="icon-19",
        title="Thinking",
        blurb="Inner cluster fires like neurons while the field rests.",
        keyframes_css=SYNAPSE_KF,
        delay_fn=delay_thinking,
        duration_ms=1800,
        easing=EASE_IN_OUT,
    ),
    IconSpec(
        slug="icon-20",
        title="Stream",
        blurb="Tokens emit in reading order, top-left to bottom-right.",
        keyframes_css=TRAIL_KF,
        delay_fn=delay_stream,
        duration_ms=2400,
        easing=EASE_OUT_QUART,
    ),
    IconSpec(
        slug="icon-21",
        title="Scan Line",
        blurb="A full row sweeps top to bottom like a CRT raster.",
        keyframes_css=PULSE_KF,
        delay_fn=delay_scan_line,
        duration_ms=2000,
        easing="linear",
    ),
    IconSpec(
        slug="icon-22",
        title="Handshake",
        blurb="Two travelers meet at the center along the diagonal.",
        keyframes_css=TRAIL_KF,
        delay_fn=delay_handshake,
        duration_ms=2000,
        easing=EASE_OUT_QUART,
    ),
    IconSpec(
        slug="icon-23",
        title="Knight's Tour",
        blurb="A single dot traces every cell with knight moves.",
        keyframes_css=TRAIL_KF,
        delay_fn=delay_knight,
        duration_ms=3200,
        easing="linear",
    ),
    IconSpec(
        slug="icon-24",
        title="Lattice",
        blurb="A checkerboard breathes in two opposing phases.",
        keyframes_css=LATTICE_KF,
        delay_fn=delay_lattice,
        duration_ms=2400,
        easing=EASE_IN_OUT,
    ),
    IconSpec(
        slug="icon-25",
        title="Cipher",
        blurb="Decryption flashes ripple through the grid in waves.",
        keyframes_css=CIPHER_KF,
        delay_fn=delay_cipher,
        duration_ms=1600,
        easing=EASE_OUT_QUART,
    ),
    IconSpec(
        slug="icon-26",
        title="Listening",
        blurb="Concentric rings collapse inward toward the center.",
        keyframes_css=PULSE_KF,
        delay_fn=delay_listening,
        duration_ms=2200,
        easing=EASE_OUT_EXPO,
    ),
    IconSpec(
        slug="icon-27",
        title="Relay",
        blurb="Antipodal pairs ping around the perimeter.",
        keyframes_css=PULSE_KF,
        delay_fn=delay_relay,
        duration_ms=1800,
        easing=EASE_OUT_QUART,
    ),
    IconSpec(
        slug="icon-28",
        title="Compile",
        blurb="Each column fills bottom-up, then releases as one.",
        keyframes_css=FILL_KF,
        delay_fn=delay_compile,
        duration_ms=2400,
        easing=EASE_IN_OUT,
    ),
]


# ---------- rendering ----------

def position(col: int, row: int) -> Tuple[float, float]:
    return (PAD + col * SPACING, PAD + row * SPACING)


def render_icon_inner(spec: IconSpec, prefix: str = "") -> Tuple[str, str]:
    """Return (style_block, body_markup) for an icon, with class prefix.

    The prefix lets the scene SVG namespace each tile so per-dot
    animation-delay rules don't collide across the 9 patterns.
    """
    cls_lit = f"{prefix}lit" if prefix else "lit"
    cls_bg = f"{prefix}bg" if prefix else "bg"
    kf_name = f"{prefix}kf" if prefix else "kf"

    style_lines = [
        f".{cls_bg} {{ fill: #f5f5f5; opacity: 0.07; }}",
        f".{cls_lit} {{ fill: #ffffff; opacity: 0;"
        f" animation: {kf_name} {spec.duration_ms}ms {spec.easing} {spec.iteration} both; }}",
        f"@keyframes {kf_name} {{{spec.keyframes_css.strip()}}}",
        "@media (prefers-reduced-motion: reduce) {"
        f" .{cls_lit} {{ animation: none; opacity: 0.45; }} }}",
    ]

    bg_dots: List[str] = []
    lit_dots: List[str] = []
    for row in range(GRID):
        for col in range(GRID):
            cx, cy = position(col, row)
            bg_dots.append(
                f'<circle class="{cls_bg}" cx="{cx:.2f}" cy="{cy:.2f}" r="{DOT_R_BASE}" />'
            )
            delay = spec.delay_fn(col, row)
            if delay < 0:
                # No animation for this dot (loading spinner inner dots).
                continue
            delay_ms = int(round(delay * spec.duration_ms))
            style_lines.append(
                f".{prefix}d{row}{col} {{ animation-delay: {delay_ms}ms; }}"
            )
            lit_dots.append(
                f'<circle class="{cls_lit} {prefix}d{row}{col}" '
                f'cx="{cx:.2f}" cy="{cy:.2f}" r="{DOT_R_LIT}" />'
            )

    style_block = "\n    ".join(style_lines)
    body = "\n  ".join(bg_dots + lit_dots)
    return style_block, body


def render_icon_svg(spec: IconSpec) -> str:
    style_block, body = render_icon_inner(spec)
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {VIEWBOX:.0f} {VIEWBOX:.0f}" role="img" aria-label="{spec.title}">
  <title>{spec.title}</title>
  <desc>{spec.blurb}</desc>
  <style>
    {style_block}
  </style>
  {body}
</svg>
"""


SCENE_COLS = 3


def render_scene_svg(specs: Sequence[IconSpec]) -> str:
    """Scene combining all patterns in a SCENE_COLS-wide grid. Tiles are square."""
    tile = VIEWBOX + 14
    cols = SCENE_COLS
    rows = (len(specs) + cols - 1) // cols
    scene_w = tile * cols
    scene_h = tile * rows
    style_chunks: List[str] = [
        ".tile { fill: #0a0a0a; stroke: #1a1a1a; stroke-width: 1; }",
    ]
    body_chunks: List[str] = []
    for i, spec in enumerate(specs):
        col = i % cols
        row = i // cols
        x = col * tile
        y = row * tile
        prefix = f"i{i}_"
        s, b = render_icon_inner(spec, prefix=prefix)
        style_chunks.append(s)
        body_chunks.append(
            f'<rect class="tile" x="{x + 0.5}" y="{y + 0.5}" width="{tile - 1}" height="{tile - 1}" rx="10" />'
            f'\n  <g transform="translate({x + (tile - VIEWBOX) / 2:.2f} {y + (tile - VIEWBOX) / 2:.2f})">\n    {b}\n  </g>'
        )

    style_block = "\n    ".join(style_chunks)
    body = "\n  ".join(body_chunks)
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {scene_w:.0f} {scene_h:.0f}" role="img" aria-label="Dot Matrix Scene">
  <title>Dot Matrix Scene</title>
  <desc>{len(specs)} deliberate dot-matrix animations laid out on a grid.</desc>
  <style>
    {style_block}
  </style>
  <rect width="{scene_w:.0f}" height="{scene_h:.0f}" fill="#050505" />
  {body}
</svg>
"""


def render_icons_js(specs: Sequence[IconSpec]) -> str:
    """Sidecar JS module exposing every icon SVG as a string on window.

    Used by preview.html so the copy button works when the page is opened
    directly via file:// (where fetch() is blocked in Chrome/Safari).
    """
    import json

    payload = {spec.slug: render_icon_svg(spec) for spec in specs}
    return (
        "// Auto-generated by scripts/generate_animations.py, do not edit by hand.\n"
        "window.__DOT_MATRIX_ICONS = "
        + json.dumps(payload, ensure_ascii=False)
        + ";\n"
    )


def main() -> None:
    ICON_DIR.mkdir(parents=True, exist_ok=True)
    SCENE_PATH.parent.mkdir(parents=True, exist_ok=True)

    for spec in ICONS:
        path = ICON_DIR / f"{spec.slug}.svg"
        path.write_text(render_icon_svg(spec), encoding="utf-8")
        print(f"wrote {path.relative_to(REPO_ROOT)}, {spec.title}")

    SCENE_PATH.write_text(render_scene_svg(ICONS), encoding="utf-8")
    print(f"wrote {SCENE_PATH.relative_to(REPO_ROOT)}")

    ICONS_JS_PATH.write_text(render_icons_js(ICONS), encoding="utf-8")
    print(f"wrote {ICONS_JS_PATH.relative_to(REPO_ROOT)}")


if __name__ == "__main__":
    main()
