#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
import statistics
from collections import defaultdict, deque
from pathlib import Path
from typing import Iterable, Sequence

from PIL import Image

BRIGHTNESS_THRESHOLD = 80
MIN_COMPONENT_PIXELS = 12
GROUP_TOLERANCE = 3.0
SAMPLE_RADIUS = 3
FRAME_DURATION_MS = 1500
GRID_SIZE = 5
DOT_SPACING = 12
DOT_RADIUS = 3.75
VIEWBOX_SIZE = 56
SMOOTHING_STEPS_PER_FRAME = 4
TEMPORAL_SMOOTHING_WEIGHT = 0.16
SOURCE_OPACITY_FLOOR = 0.085
SOURCE_OPACITY_CEILING = 0.87
OUTPUT_OPACITY_FLOOR = 0.045
OUTPUT_OPACITY_CEILING = 0.98
OPACITY_GAMMA = 1.08
BASE_DOT_OPACITY = 0.09
BASE_DOT_RADIUS = 3.05
ACTIVE_DOT_RADIUS = 3.45
ACTIVE_OPACITY_EPSILON = 0.035
ACTIVE_SCALE_MIN = 0.98
ACTIVE_SCALE_MAX = 1.11
SPLINE_EASING = "0.22 1 0.36 1"
ICON_SIZE = 56
SCENE_PADDING = 24
SCENE_TILE_SIZE = 184
SCENE_TILE_GAP = 28
SCENE_ICON_SIZE = 56
SCENE_SIZE = SCENE_PADDING * 2 + SCENE_TILE_SIZE * 3 + SCENE_TILE_GAP * 2


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Extract dot-matrix animation data from a frame sequence and build SVG/TS assets."
    )
    parser.add_argument(
        "--input",
        required=True,
        type=Path,
        help="Directory containing the extracted JPG or PNG frames.",
    )
    parser.add_argument(
        "--output",
        required=True,
        type=Path,
        help="Package root that will receive generated data and SVG files.",
    )
    parser.add_argument(
        "--duration-ms",
        default=FRAME_DURATION_MS,
        type=int,
        help="Loop duration for the generated SVG animations.",
    )
    return parser.parse_args()


def load_frames(input_dir: Path) -> list[Path]:
    frames = sorted(
        [
            *input_dir.glob("*.jpg"),
            *input_dir.glob("*.jpeg"),
            *input_dir.glob("*.png"),
        ]
    )
    if not frames:
        raise FileNotFoundError(f"No frame images were found in {input_dir}.")
    return frames


def detect_components(image: Image.Image) -> list[tuple[float, float]]:
    grayscale = image.convert("L")
    width, height = grayscale.size
    pixels = grayscale.load()
    visited = bytearray(width * height)

    def index(x: int, y: int) -> int:
        return y * width + x

    components: list[tuple[float, float]] = []

    for y in range(height):
        for x in range(width):
            current_index = index(x, y)
            if visited[current_index] or pixels[x, y] < BRIGHTNESS_THRESHOLD:
                continue

            queue = deque([(x, y)])
            visited[current_index] = 1
            xs: list[int] = []
            ys: list[int] = []

            while queue:
                cx, cy = queue.popleft()
                xs.append(cx)
                ys.append(cy)

                for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                    if nx < 0 or ny < 0 or nx >= width or ny >= height:
                        continue

                    neighbor_index = index(nx, ny)
                    if visited[neighbor_index] or pixels[nx, ny] < BRIGHTNESS_THRESHOLD:
                        continue

                    visited[neighbor_index] = 1
                    queue.append((nx, ny))

            if len(xs) >= MIN_COMPONENT_PIXELS:
                components.append((sum(xs) / len(xs), sum(ys) / len(ys)))

    return components


def largest_gap_indices(values: Sequence[float], gap_count: int = 2) -> list[int]:
    gaps = sorted(
        ((values[index + 1] - values[index], index) for index in range(len(values) - 1)),
        reverse=True,
    )
    return sorted(index for _, index in gaps[:gap_count])


def cluster_three_groups(values: Sequence[float]) -> list[tuple[float, float]]:
    sorted_values = sorted(values)
    cut_a, cut_b = largest_gap_indices(sorted_values)
    return [
        (sorted_values[0], sorted_values[cut_a]),
        (sorted_values[cut_a + 1], sorted_values[cut_b]),
        (sorted_values[cut_b + 1], sorted_values[-1]),
    ]


def assign_group(value: float, groups: Sequence[tuple[float, float]]) -> int:
    for index, (_, group_max) in enumerate(groups):
        if value <= group_max:
            return index
    return len(groups) - 1


def group_positions(values: Iterable[float], tolerance: float = GROUP_TOLERANCE) -> list[float]:
    groups: list[list[float]] = []

    for value in sorted(values):
        if not groups:
            groups.append([value])
            continue

        group_mean = statistics.fmean(groups[-1])
        if abs(value - group_mean) <= tolerance:
            groups[-1].append(value)
        else:
            groups.append([value])

    return [round(statistics.fmean(group), 2) for group in groups]


def round_opacity(value: float) -> float:
    return round(value / 255, 3)


def remap_opacity(value: float) -> float:
    normalized = (value - SOURCE_OPACITY_FLOOR) / (SOURCE_OPACITY_CEILING - SOURCE_OPACITY_FLOOR)
    normalized = max(0.0, min(1.0, normalized))
    eased = normalized**OPACITY_GAMMA
    stretched = OUTPUT_OPACITY_FLOOR + eased * (OUTPUT_OPACITY_CEILING - OUTPUT_OPACITY_FLOOR)
    return round(stretched, 3)


def sample_window(image: Image.Image, cx: float, cy: float) -> float:
    grayscale = image.convert("L")
    pixels = grayscale.load()
    width, height = grayscale.size
    x_center = round(cx)
    y_center = round(cy)
    samples: list[int] = []

    for y in range(y_center - SAMPLE_RADIUS, y_center + SAMPLE_RADIUS + 1):
        for x in range(x_center - SAMPLE_RADIUS, x_center + SAMPLE_RADIUS + 1):
            if 0 <= x < width and 0 <= y < height:
                samples.append(pixels[x, y])

    return remap_opacity(round_opacity(sum(samples) / len(samples)))


def frame_distance(
    frame_a: Sequence[Sequence[float]],
    frame_b: Sequence[Sequence[float]],
) -> float:
    return sum(
        abs(frame_a[row_index][column_index] - frame_b[row_index][column_index])
        for row_index in range(GRID_SIZE)
        for column_index in range(GRID_SIZE)
    )


def rotate_frames_for_smooth_loop(
    icon_frames: Sequence[Sequence[Sequence[float]]],
) -> tuple[list[list[list[float]]], int]:
    frame_count = len(icon_frames)
    if frame_count < 2:
        return [list(map(list, frame)) for frame in icon_frames], 0

    boundary_distances = [
        frame_distance(icon_frames[index], icon_frames[(index + 1) % frame_count])
        for index in range(frame_count)
    ]
    quietest_boundary = min(range(frame_count), key=boundary_distances.__getitem__)
    start_index = (quietest_boundary + 1) % frame_count
    rotated_frames = [icon_frames[(start_index + index) % frame_count] for index in range(frame_count)]
    return rotated_frames, start_index


def clamp(value: float, minimum: float, maximum: float) -> float:
    return max(minimum, min(maximum, value))


def cubic_interpolate(p0: float, p1: float, p2: float, p3: float, mix: float) -> float:
    return 0.5 * (
        (2 * p1)
        + (-p0 + p2) * mix
        + (2 * p0 - 5 * p1 + 4 * p2 - p3) * (mix**2)
        + (-p0 + 3 * p1 - 3 * p2 + p3) * (mix**3)
    )


def upsample_loop_frames(
    icon_frames: Sequence[Sequence[Sequence[float]]],
    steps_per_transition: int = SMOOTHING_STEPS_PER_FRAME,
) -> list[list[list[float]]]:
    frame_count = len(icon_frames)
    if frame_count < 2 or steps_per_transition <= 1:
        return [
            [list(row) for row in frame]
            for frame in icon_frames
        ]

    upsampled_frames: list[list[list[float]]] = []

    for frame_index in range(frame_count):
        previous_frame = icon_frames[(frame_index - 1) % frame_count]
        current_frame = icon_frames[frame_index]
        next_frame = icon_frames[(frame_index + 1) % frame_count]
        future_frame = icon_frames[(frame_index + 2) % frame_count]

        for step_index in range(steps_per_transition):
            mix = step_index / steps_per_transition
            interpolated_rows: list[list[float]] = []

            for row_index in range(GRID_SIZE):
                interpolated_row: list[float] = []
                for column_index in range(GRID_SIZE):
                    value = cubic_interpolate(
                        previous_frame[row_index][column_index],
                        current_frame[row_index][column_index],
                        next_frame[row_index][column_index],
                        future_frame[row_index][column_index],
                        mix,
                    )
                    interpolated_row.append(
                        round(clamp(value, OUTPUT_OPACITY_FLOOR, OUTPUT_OPACITY_CEILING), 3)
                    )
                interpolated_rows.append(interpolated_row)

            upsampled_frames.append(interpolated_rows)

    return upsampled_frames


def smooth_loop_frames(
    icon_frames: Sequence[Sequence[Sequence[float]]],
    smoothing_weight: float = TEMPORAL_SMOOTHING_WEIGHT,
) -> list[list[list[float]]]:
    frame_count = len(icon_frames)
    if frame_count < 3 or smoothing_weight <= 0:
        return [
            [list(row) for row in frame]
            for frame in icon_frames
        ]

    center_weight = 1 - smoothing_weight * 2
    smoothed_frames: list[list[list[float]]] = []

    for frame_index in range(frame_count):
        previous_frame = icon_frames[(frame_index - 1) % frame_count]
        current_frame = icon_frames[frame_index]
        next_frame = icon_frames[(frame_index + 1) % frame_count]
        smoothed_rows: list[list[float]] = []

        for row_index in range(GRID_SIZE):
            smoothed_row: list[float] = []
            for column_index in range(GRID_SIZE):
                value = (
                    previous_frame[row_index][column_index] * smoothing_weight
                    + current_frame[row_index][column_index] * center_weight
                    + next_frame[row_index][column_index] * smoothing_weight
                )
                smoothed_row.append(
                    round(clamp(value, OUTPUT_OPACITY_FLOOR, OUTPUT_OPACITY_CEILING), 3)
                )
            smoothed_rows.append(smoothed_row)

        smoothed_frames.append(smoothed_rows)

    return smoothed_frames


def extract_animation_data(
    frame_paths: Sequence[Path],
) -> tuple[list[list[list[list[float]]]], list[int]]:
    component_map: dict[Path, list[tuple[float, float]]] = {}
    all_points: list[tuple[float, float]] = []

    for frame_path in frame_paths:
        frame_components = detect_components(Image.open(frame_path))
        component_map[frame_path] = frame_components
        all_points.extend(frame_components)

    x_groups = cluster_three_groups([x for x, _ in all_points])
    y_groups = cluster_three_groups([y for _, y in all_points])

    x_positions_by_group: dict[int, list[float]] = defaultdict(list)
    y_positions_by_group: dict[int, list[float]] = defaultdict(list)

    for x, y in all_points:
        x_positions_by_group[assign_group(x, x_groups)].append(x)
        y_positions_by_group[assign_group(y, y_groups)].append(y)

    x_positions = {group_index: group_positions(values) for group_index, values in x_positions_by_group.items()}
    y_positions = {group_index: group_positions(values) for group_index, values in y_positions_by_group.items()}

    if any(len(values) != GRID_SIZE for values in x_positions.values()):
        raise RuntimeError(f"Expected 5 sampled x positions per icon group, found {x_positions}.")

    if any(len(values) != GRID_SIZE for values in y_positions.values()):
        raise RuntimeError(f"Expected 5 sampled y positions per icon group, found {y_positions}.")

    frame_data: list[list[list[list[float]]]] = []

    for frame_path in frame_paths:
        frame_image = Image.open(frame_path)
        icon_frames: list[list[list[float]]] = []

        for row_group in range(3):
            for column_group in range(3):
                rows: list[list[float]] = []
                for row_index, y in enumerate(y_positions[row_group]):
                    row_values: list[float] = []
                    for column_index, x in enumerate(x_positions[column_group]):
                        row_values.append(sample_window(frame_image, x, y))
                    rows.append(row_values)
                icon_frames.append(rows)

        frame_data.append(icon_frames)

    icon_major_data: list[list[list[list[float]]]] = []
    loop_rotations: list[int] = []

    for icon_index in range(9):
        icon_frames: list[list[list[float]]] = []
        for frame_index in range(len(frame_paths)):
            icon_frames.append(frame_data[frame_index][icon_index])
        rotated_frames, start_index = rotate_frames_for_smooth_loop(icon_frames)
        processed_frames = smooth_loop_frames(upsample_loop_frames(rotated_frames))
        icon_major_data.append(processed_frames)
        loop_rotations.append(start_index)

    return icon_major_data, loop_rotations


def format_nested(values: Sequence, indent: int = 0) -> str:
    if not isinstance(values, list):
        return repr(values)

    next_indent = indent + 2
    formatted_items = ",\n".join(
        f"{' ' * next_indent}{format_nested(item, next_indent)}" for item in values
    )
    return "[\n" + formatted_items + f"\n{' ' * indent}]"


def build_filter_def(filter_id: str) -> str:
    return "\n".join(
        [
            "  <defs>",
            (
                f'    <filter id="{filter_id}" x="-35%" y="-35%" width="170%" height="170%" '
                'color-interpolation-filters="sRGB">'
            ),
            '      <feGaussianBlur in="SourceGraphic" stdDeviation="0.7" result="blur" />',
            "      <feMerge>",
            '        <feMergeNode in="blur" />',
            '        <feMergeNode in="SourceGraphic" />',
            "      </feMerge>",
            "    </filter>",
            "  </defs>",
        ]
    )


def normalize_active_opacity(total_opacity: float) -> float:
    normalized = clamp((total_opacity - BASE_DOT_OPACITY) / (1 - BASE_DOT_OPACITY), 0.0, 1.0)
    if normalized < ACTIVE_OPACITY_EPSILON:
        return 0.0
    return normalized


def build_active_layers(icon_frames: Sequence[Sequence[Sequence[float]]], row_index: int, column_index: int):
    active_opacities: list[float] = []
    active_scales: list[float] = []

    for frame in icon_frames:
        normalized = normalize_active_opacity(frame[row_index][column_index])
        active_opacities.append(round(normalized, 3))
        active_scales.append(
            round(ACTIVE_SCALE_MIN + normalized * (ACTIVE_SCALE_MAX - ACTIVE_SCALE_MIN), 3)
        )

    active_opacities.append(active_opacities[0])
    active_scales.append(active_scales[0])
    return active_opacities, active_scales


def circle_elements(
    icon_frames: Sequence[Sequence[Sequence[float]]],
    offset_x: float,
    offset_y: float,
    animation_duration_ms: int,
    filter_id: str,
) -> str:
    padding = (VIEWBOX_SIZE - DOT_SPACING * (GRID_SIZE - 1)) / 2
    circles: list[str] = []
    frame_count = len(icon_frames)
    key_times = ";".join(f"{index / frame_count:.4f}" for index in range(frame_count + 1))
    key_splines = ";".join([SPLINE_EASING] * frame_count)

    for row_index in range(GRID_SIZE):
        for column_index in range(GRID_SIZE):
            opacities, scales = build_active_layers(icon_frames, row_index, column_index)
            opacity_values = ";".join(f"{opacity:.3f}" for opacity in opacities)
            scale_values = ";".join(f"{scale:.3f}" for scale in scales)
            cx = offset_x + padding + column_index * DOT_SPACING
            cy = offset_y + padding + row_index * DOT_SPACING
            circles.append(
                "\n".join(
                    [
                        f'  <g transform="translate({cx:.2f} {cy:.2f})">',
                        (
                            f'    <circle cx="0" cy="0" r="{BASE_DOT_RADIUS:.2f}" fill="#ffffff" '
                            f'opacity="{BASE_DOT_OPACITY:.3f}" />'
                        ),
                        f'    <g filter="url(#{filter_id})">',
                        (
                            f'      <circle cx="0" cy="0" r="{ACTIVE_DOT_RADIUS:.2f}" fill="#ffffff" '
                            'opacity="0">'
                        ),
                        (
                            f'        <animate attributeName="opacity" dur="{animation_duration_ms}ms" '
                            'repeatCount="indefinite" calcMode="spline" '
                            f'keyTimes="{key_times}" keySplines="{key_splines}" values="{opacity_values}" />'
                        ),
                        "      </circle>",
                        (
                            f'      <animateTransform attributeName="transform" type="scale" '
                            f'dur="{animation_duration_ms}ms" repeatCount="indefinite" '
                            f'calcMode="spline" keyTimes="{key_times}" keySplines="{key_splines}" '
                            f'values="{scale_values}" />'
                        ),
                        "    </g>",
                        "  </g>",
                    ]
                )
            )

    return "\n".join(circles)


def build_icon_svg(icon_frames: Sequence[Sequence[Sequence[float]]], animation_duration_ms: int) -> str:
    filter_id = "dot-glow"
    circles = circle_elements(icon_frames, 0, 0, animation_duration_ms, filter_id)
    return "\n".join(
        [
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 56 56" fill="none" shape-rendering="geometricPrecision">',
            build_filter_def(filter_id),
            circles,
            "</svg>",
        ]
    )


def build_scene_svg(
    animation_data: Sequence[Sequence[Sequence[Sequence[float]]]],
    animation_duration_ms: int,
) -> str:
    filter_id = "scene-dot-glow"
    lines = [
        (
            f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {SCENE_SIZE} {SCENE_SIZE}" '
            'fill="none" shape-rendering="geometricPrecision">'
        ),
        build_filter_def(filter_id),
        f'  <rect width="{SCENE_SIZE}" height="{SCENE_SIZE}" fill="#060606" />',
    ]

    for row_index in range(3):
        for column_index in range(3):
            x = SCENE_PADDING + column_index * (SCENE_TILE_SIZE + SCENE_TILE_GAP)
            y = SCENE_PADDING + row_index * (SCENE_TILE_SIZE + SCENE_TILE_GAP)
            lines.append(
                f'  <rect x="{x}" y="{y}" width="{SCENE_TILE_SIZE}" height="{SCENE_TILE_SIZE}" '
                'rx="18" fill="#070707" stroke="#151515" />'
            )

    for icon_index, icon_frames in enumerate(animation_data):
        row_index = icon_index // 3
        column_index = icon_index % 3
        tile_x = SCENE_PADDING + column_index * (SCENE_TILE_SIZE + SCENE_TILE_GAP)
        tile_y = SCENE_PADDING + row_index * (SCENE_TILE_SIZE + SCENE_TILE_GAP)
        icon_offset_x = tile_x + (SCENE_TILE_SIZE - SCENE_ICON_SIZE) / 2
        icon_offset_y = tile_y + (SCENE_TILE_SIZE - SCENE_ICON_SIZE) / 2
        lines.append(circle_elements(icon_frames, icon_offset_x, icon_offset_y, animation_duration_ms, filter_id))

    lines.append("</svg>")
    return "\n".join(lines)


def write_typescript_data(
    output_root: Path,
    animation_data: list[list[list[list[float]]]],
    loop_rotations: list[int],
    duration_ms: int,
    source_frame_count: int,
) -> None:
    ts_output = output_root / "src" / "dotMatrixAnimationData.ts"
    ts_output.parent.mkdir(parents=True, exist_ok=True)

    ts_output.write_text(
        "\n".join(
            [
                "export const DOT_MATRIX_FRAME_COUNT = "
                f"{len(animation_data[0])} as const;",
                f"export const DOT_MATRIX_SOURCE_FRAME_COUNT = {source_frame_count} as const;",
                "export const DOT_MATRIX_ICON_COUNT = 9 as const;",
                f"export const DOT_MATRIX_GRID_SIZE = {GRID_SIZE} as const;",
                f"export const DOT_MATRIX_DEFAULT_DURATION_MS = {duration_ms} as const;",
                f"export const DOT_MATRIX_DOT_SPACING = {DOT_SPACING} as const;",
                f"export const DOT_MATRIX_DOT_RADIUS = {DOT_RADIUS} as const;",
                f"export const DOT_MATRIX_VIEWBOX_SIZE = {VIEWBOX_SIZE} as const;",
                f"export const DOT_MATRIX_SMOOTHING_STEPS_PER_FRAME = {SMOOTHING_STEPS_PER_FRAME} as const;",
                f"export const DOT_MATRIX_BASE_OPACITY = {BASE_DOT_OPACITY} as const;",
                f"export const DOT_MATRIX_BASE_DOT_RADIUS = {BASE_DOT_RADIUS} as const;",
                f"export const DOT_MATRIX_ACTIVE_DOT_RADIUS = {ACTIVE_DOT_RADIUS} as const;",
                f"export const DOT_MATRIX_ACTIVE_OPACITY_EPSILON = {ACTIVE_OPACITY_EPSILON} as const;",
                f"export const DOT_MATRIX_ACTIVE_SCALE_MIN = {ACTIVE_SCALE_MIN} as const;",
                f"export const DOT_MATRIX_ACTIVE_SCALE_MAX = {ACTIVE_SCALE_MAX} as const;",
                "export const DOT_MATRIX_LOOP_ROTATIONS = "
                f"{format_nested(loop_rotations)} as const;",
                "",
                "export const DOT_MATRIX_ANIMATION_DATA = "
                f"{format_nested(animation_data)} as const;",
                "",
                "export type DotMatrixAnimationData = typeof DOT_MATRIX_ANIMATION_DATA;",
            ]
        )
        + "\n"
    )


def write_json_data(
    output_root: Path,
    animation_data: list[list[list[list[float]]]],
    loop_rotations: list[int],
    duration_ms: int,
    source_frame_count: int,
) -> None:
    data_output = output_root / "data" / "dot-matrix-animation-data.json"
    data_output.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "frameCount": len(animation_data[0]),
        "sourceFrameCount": source_frame_count,
        "iconCount": len(animation_data),
        "gridSize": GRID_SIZE,
        "loopDurationMs": duration_ms,
        "loopRotations": loop_rotations,
        "icons": animation_data,
    }
    data_output.write_text(json.dumps(payload, indent=2) + "\n")


def write_svg_assets(output_root: Path, animation_data: list[list[list[list[float]]]], duration_ms: int) -> None:
    svg_root = output_root / "svg"
    icon_root = svg_root / "icons"
    icon_root.mkdir(parents=True, exist_ok=True)

    scene_svg = build_scene_svg(animation_data, duration_ms)
    (svg_root / "dot-matrix-scene.svg").write_text(scene_svg + "\n")

    for icon_index, icon_frames in enumerate(animation_data, start=1):
        icon_svg = build_icon_svg(icon_frames, duration_ms)
        (icon_root / f"icon-{icon_index:02}.svg").write_text(icon_svg + "\n")


def build_preview_html(
    animation_data: list[list[list[list[float]]]],
    loop_rotations: list[int],
    duration_ms: int,
    source_frame_count: int,
) -> str:
    payload = {
        "frameCount": len(animation_data[0]),
        "sourceFrameCount": source_frame_count,
        "gridSize": GRID_SIZE,
        "loopDurationMs": duration_ms,
        "dotSpacing": DOT_SPACING,
        "dotRadius": DOT_RADIUS,
        "viewBoxSize": VIEWBOX_SIZE,
        "smoothingStepsPerFrame": SMOOTHING_STEPS_PER_FRAME,
        "baseDotOpacity": BASE_DOT_OPACITY,
        "baseDotRadius": BASE_DOT_RADIUS,
        "activeDotRadius": ACTIVE_DOT_RADIUS,
        "activeOpacityEpsilon": ACTIVE_OPACITY_EPSILON,
        "activeScaleMin": ACTIVE_SCALE_MIN,
        "activeScaleMax": ACTIVE_SCALE_MAX,
        "loopRotations": loop_rotations,
        "icons": animation_data,
    }

    html = """<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Dot Matrix Animations Preview</title>
    <style>
      :root {
        color-scheme: dark;
        --bg: #050505;
        --panel: rgba(10, 10, 10, 0.92);
        --tile: #070707;
        --stroke: #171717;
        --stroke-strong: #222;
        --text: #f3f3f3;
        --muted: #8d8d8d;
        --accent: #d9d9d9;
      }

      * {
        box-sizing: border-box;
      }

      html,
      body {
        margin: 0;
        min-height: 100%;
        background:
          radial-gradient(circle at top, rgba(255, 255, 255, 0.05), transparent 28%),
          linear-gradient(180deg, rgba(255, 255, 255, 0.015), transparent 30%),
          var(--bg);
        color: var(--text);
        font-family: "Segoe UI", -apple-system, BlinkMacSystemFont, sans-serif;
      }

      body {
        padding: 28px 20px 56px;
      }

      main {
        width: min(1160px, 100%);
        margin: 0 auto;
      }

      h1 {
        margin: 0;
        font-size: clamp(2rem, 3vw, 2.9rem);
        line-height: 1.05;
        letter-spacing: 0.03em;
        font-weight: 650;
      }

      p {
        margin: 0;
        color: var(--muted);
        line-height: 1.6;
      }

      .hero {
        display: grid;
        gap: 18px;
        padding: 26px;
        border: 1px solid var(--stroke);
        border-radius: 28px;
        background: var(--panel);
        box-shadow: 0 22px 80px rgba(0, 0, 0, 0.36);
      }

      .hero-top {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 18px;
        flex-wrap: wrap;
      }

      .eyebrow {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        font-size: 0.76rem;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: #b8b8b8;
      }

      .eyebrow::before {
        content: "";
        width: 8px;
        height: 8px;
        border-radius: 999px;
        background: #f1f1f1;
        box-shadow: 0 0 18px rgba(255, 255, 255, 0.45);
      }

      .hero-copy {
        display: grid;
        gap: 10px;
        max-width: 72ch;
      }

      .controls {
        display: flex;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
      }

      .button {
        appearance: none;
        border: 1px solid var(--stroke-strong);
        background: #111;
        color: var(--text);
        border-radius: 999px;
        padding: 10px 16px;
        font: inherit;
        cursor: pointer;
        transition:
          transform 180ms cubic-bezier(0.25, 1, 0.5, 1),
          border-color 180ms cubic-bezier(0.25, 1, 0.5, 1),
          background 180ms cubic-bezier(0.25, 1, 0.5, 1);
      }

      .button:hover {
        transform: translateY(-1px);
        border-color: #303030;
        background: #141414;
      }

      .button:disabled {
        opacity: 0.55;
        cursor: default;
        transform: none;
      }

      .meta {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
      }

      .pill {
        padding: 8px 12px;
        border-radius: 999px;
        border: 1px solid var(--stroke);
        color: #bdbdbd;
        background: rgba(255, 255, 255, 0.02);
        font-size: 0.84rem;
      }

      section {
        margin-top: 24px;
      }

      .section-head {
        display: flex;
        justify-content: space-between;
        align-items: end;
        gap: 12px;
        margin-bottom: 14px;
      }

      .section-head h2 {
        margin: 0;
        font-size: 1.08rem;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: #d4d4d4;
      }

      .scene-panel,
      .icon-panel {
        border: 1px solid var(--stroke);
        border-radius: 28px;
        background: var(--panel);
        padding: 22px;
      }

      .scene-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 22px;
      }

      .scene-tile {
        aspect-ratio: 1;
        display: grid;
        place-items: center;
        border-radius: 22px;
        background: var(--tile);
        border: 1px solid var(--stroke);
      }

      .icon-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
        gap: 18px;
      }

      .icon-card {
        padding: 18px 16px;
        border-radius: 22px;
        border: 1px solid var(--stroke);
        background: var(--tile);
        display: grid;
        justify-items: center;
        gap: 14px;
      }

      .icon-label {
        text-align: center;
        display: grid;
        gap: 4px;
      }

      .icon-label strong {
        font-size: 0.94rem;
        font-weight: 600;
        letter-spacing: 0.02em;
      }

      .icon-label span {
        color: var(--muted);
        font-size: 0.8rem;
      }

      .preview-svg {
        display: block;
        overflow: visible;
      }

      .footer-note {
        margin-top: 16px;
        color: #818181;
        font-size: 0.84rem;
      }

      @media (max-width: 820px) {
        .scene-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }

      @media (max-width: 560px) {
        body {
          padding-inline: 14px;
        }

        .hero,
        .scene-panel,
        .icon-panel {
          padding: 18px;
          border-radius: 24px;
        }

        .scene-grid {
          grid-template-columns: 1fr;
        }
      }
    </style>
  </head>
  <body>
    <main>
      <section class="hero">
        <div class="hero-top">
          <div class="hero-copy">
            <span class="eyebrow">Polished Motion Preview</span>
            <h1>Dot Matrix Animation Study</h1>
            <p>
              This preview is generated from the reconstructed frame data itself, not from screenshots.
              The loop seam for each icon is rotated to its quietest point, then each motion path is
              rebuilt into denser render samples so the loop breathes instead of stepping from frame to frame.
            </p>
          </div>
          <div class="controls">
            <button class="button" type="button" data-toggle>Pause</button>
          </div>
        </div>
        <div class="meta">
          <span class="pill">9 icons</span>
          <span class="pill">__SOURCE_FRAME_COUNT__ source frames</span>
          <span class="pill">__RENDER_FRAME_COUNT__ render samples</span>
          <span class="pill">Loop __DURATION__ms</span>
          <span class="pill" data-status>Glow layer active</span>
        </div>
      </section>

      <section>
        <div class="section-head">
          <h2>Scene</h2>
          <p>Live scene rendered from the same smoothed data used by the exported SVGs.</p>
        </div>
        <div class="scene-panel">
          <div class="scene-grid" data-scene-grid></div>
        </div>
      </section>

      <section>
        <div class="section-head">
          <h2>Icons</h2>
          <p>Each icon keeps its own source seam, then renders with a layered glow and softened motion curve.</p>
        </div>
        <div class="icon-panel">
          <div class="icon-grid" data-icon-grid></div>
          <p class="footer-note">
            The standalone SVG files are still available in <code>./svg/icons</code>, but this preview
            is self-contained and can be opened directly from disk.
          </p>
        </div>
      </section>
    </main>

    <script>
      const payload = __PAYLOAD__;
      const svgNamespace = "http://www.w3.org/2000/svg";
      const sceneGrid = document.querySelector("[data-scene-grid]");
      const iconGrid = document.querySelector("[data-icon-grid]");
      const toggleButton = document.querySelector("[data-toggle]");
      const statusPill = document.querySelector("[data-status]");
      const prefersReducedMotion =
        window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      const sceneInstances = [];
      const cardInstances = [];
      let animationFrameId = 0;
      let isRunning = !prefersReducedMotion;
      let currentProgress = 0;
      let startedAt = performance.now();

      function dotCenter(index) {
        return (
          (payload.viewBoxSize - payload.dotSpacing * (payload.gridSize - 1)) / 2 +
          index * payload.dotSpacing
        );
      }

      function wrapProgress(progress) {
        return ((progress % 1) + 1) % 1;
      }

      function interpolateFrame(iconFrames, progress) {
        const wrapped = wrapProgress(progress);
        const scaled = wrapped * payload.frameCount;
        const fromIndex = Math.floor(scaled) % payload.frameCount;
        const toIndex = (fromIndex + 1) % payload.frameCount;
        const rawMix = scaled - fromIndex;
        const mix = rawMix * rawMix * (3 - 2 * rawMix);

        return iconFrames[fromIndex].map((row, rowIndex) =>
          row.map((opacity, columnIndex) => {
            const target = iconFrames[toIndex][rowIndex][columnIndex];
            return opacity + (target - opacity) * mix;
          })
        );
      }

      function normalizeActiveOpacity(totalOpacity) {
        const normalized = Math.max(
          0,
          Math.min(1, (totalOpacity - payload.baseDotOpacity) / (1 - payload.baseDotOpacity))
        );
        return normalized < payload.activeOpacityEpsilon ? 0 : normalized;
      }

      function activeScaleForOpacity(activeOpacity) {
        return (
          payload.activeScaleMin +
          activeOpacity * (payload.activeScaleMax - payload.activeScaleMin)
        );
      }

      function createGlowDefs(filterId) {
        const defs = document.createElementNS(svgNamespace, "defs");
        const filter = document.createElementNS(svgNamespace, "filter");
        filter.setAttribute("id", filterId);
        filter.setAttribute("x", "-35%");
        filter.setAttribute("y", "-35%");
        filter.setAttribute("width", "170%");
        filter.setAttribute("height", "170%");
        filter.setAttribute("color-interpolation-filters", "sRGB");

        const blur = document.createElementNS(svgNamespace, "feGaussianBlur");
        blur.setAttribute("in", "SourceGraphic");
        blur.setAttribute("stdDeviation", "0.7");
        blur.setAttribute("result", "blur");
        filter.appendChild(blur);

        const merge = document.createElementNS(svgNamespace, "feMerge");
        const mergeBlur = document.createElementNS(svgNamespace, "feMergeNode");
        mergeBlur.setAttribute("in", "blur");
        merge.appendChild(mergeBlur);
        const mergeSource = document.createElementNS(svgNamespace, "feMergeNode");
        mergeSource.setAttribute("in", "SourceGraphic");
        merge.appendChild(mergeSource);
        filter.appendChild(merge);

        defs.appendChild(filter);
        return defs;
      }

      function setScaleTransform(node, scale) {
        node.setAttribute("transform", `scale(${scale.toFixed(3)})`);
      }

      function createIconSvg(iconIndex, size) {
        const svg = document.createElementNS(svgNamespace, "svg");
        svg.setAttribute("class", "preview-svg");
        svg.setAttribute("viewBox", `0 0 ${payload.viewBoxSize} ${payload.viewBoxSize}`);
        svg.setAttribute("width", String(size));
        svg.setAttribute("height", String(size));
        svg.setAttribute("fill", "none");
        svg.setAttribute("shape-rendering", "geometricPrecision");
        svg.style.color = "#ffffff";

        const filterId = `dot-glow-${iconIndex + 1}-${size}`;
        svg.appendChild(createGlowDefs(filterId));

        const dots = [];

        for (let rowIndex = 0; rowIndex < payload.gridSize; rowIndex += 1) {
          for (let columnIndex = 0; columnIndex < payload.gridSize; columnIndex += 1) {
            const centerX = dotCenter(columnIndex);
            const centerY = dotCenter(rowIndex);

            const wrapper = document.createElementNS(svgNamespace, "g");
            wrapper.setAttribute("transform", `translate(${centerX.toFixed(2)} ${centerY.toFixed(2)})`);

            const baseCircle = document.createElementNS(svgNamespace, "circle");
            baseCircle.setAttribute("cx", "0");
            baseCircle.setAttribute("cy", "0");
            baseCircle.setAttribute("r", String(payload.baseDotRadius));
            baseCircle.setAttribute("fill", "currentColor");
            baseCircle.setAttribute("opacity", String(payload.baseDotOpacity));
            wrapper.appendChild(baseCircle);

            const activeGroup = document.createElementNS(svgNamespace, "g");
            activeGroup.setAttribute("filter", `url(#${filterId})`);
            setScaleTransform(activeGroup, payload.activeScaleMin);

            const activeCircle = document.createElementNS(svgNamespace, "circle");
            activeCircle.setAttribute("cx", "0");
            activeCircle.setAttribute("cy", "0");
            activeCircle.setAttribute("r", String(payload.activeDotRadius));
            activeCircle.setAttribute("fill", "currentColor");
            activeCircle.setAttribute("opacity", "0");
            activeGroup.appendChild(activeCircle);

            wrapper.appendChild(activeGroup);
            svg.appendChild(wrapper);
            dots.push({ activeCircle, activeGroup });
          }
        }

        return { iconIndex, svg, dots };
      }

      function renderInstance(instance, progress) {
        const frame = interpolateFrame(payload.icons[instance.iconIndex], progress);
        let dotIndex = 0;

        for (let rowIndex = 0; rowIndex < payload.gridSize; rowIndex += 1) {
          for (let columnIndex = 0; columnIndex < payload.gridSize; columnIndex += 1) {
            const activeOpacity = normalizeActiveOpacity(frame[rowIndex][columnIndex]);
            instance.dots[dotIndex].activeCircle.setAttribute("opacity", activeOpacity.toFixed(3));
            setScaleTransform(instance.dots[dotIndex].activeGroup, activeScaleForOpacity(activeOpacity));
            dotIndex += 1;
          }
        }
      }

      function renderAll(progress) {
        currentProgress = wrapProgress(progress);
        [...sceneInstances, ...cardInstances].forEach((instance) => renderInstance(instance, currentProgress));
      }

      function loop(timestamp) {
        if (!isRunning) {
          return;
        }

        const elapsed = timestamp - startedAt;
        renderAll(elapsed / payload.loopDurationMs);
        animationFrameId = window.requestAnimationFrame(loop);
      }

      function start() {
        if (prefersReducedMotion) {
          return;
        }

        startedAt = performance.now() - currentProgress * payload.loopDurationMs;
        isRunning = true;
        toggleButton.textContent = "Pause";
        statusPill.textContent = "Smoothed glow loop active";
        animationFrameId = window.requestAnimationFrame(loop);
      }

      function stop() {
        isRunning = false;
        window.cancelAnimationFrame(animationFrameId);
        toggleButton.textContent = "Resume";
        statusPill.textContent = "Paused on current phase";
      }

      function buildScene() {
        payload.icons.forEach((_, iconIndex) => {
          const tile = document.createElement("div");
          tile.className = "scene-tile";
          const instance = createIconSvg(iconIndex, 56);
          tile.appendChild(instance.svg);
          sceneGrid.appendChild(tile);
          sceneInstances.push(instance);
        });
      }

      function buildCards() {
        payload.icons.forEach((_, iconIndex) => {
          const card = document.createElement("article");
          card.className = "icon-card";

          const instance = createIconSvg(iconIndex, 56);
          card.appendChild(instance.svg);

          const label = document.createElement("div");
          label.className = "icon-label";

          const title = document.createElement("strong");
          title.textContent = `Icon ${String(iconIndex + 1).padStart(2, "0")}`;
          label.appendChild(title);

          const subtitle = document.createElement("span");
          subtitle.textContent =
            `Loop seam starts from source frame ${payload.loopRotations[iconIndex] + 1}`;
          label.appendChild(subtitle);

          card.appendChild(label);
          iconGrid.appendChild(card);
          cardInstances.push(instance);
        });
      }

      buildScene();
      buildCards();
      renderAll(0);

      if (prefersReducedMotion) {
        toggleButton.disabled = true;
        toggleButton.textContent = "Reduced motion";
        statusPill.textContent = "Reduced motion: static preview";
      } else {
        start();
      }

      toggleButton.addEventListener("click", () => {
        if (prefersReducedMotion) {
          return;
        }

        if (isRunning) {
          stop();
        } else {
          start();
        }
      });
    </script>
  </body>
</html>
"""

    return (
        html.replace("__PAYLOAD__", json.dumps(payload, separators=(",", ":")))
        .replace("__DURATION__", str(duration_ms))
        .replace("__SOURCE_FRAME_COUNT__", str(source_frame_count))
        .replace("__RENDER_FRAME_COUNT__", str(len(animation_data[0])))
    )


def write_preview_html(
    output_root: Path,
    animation_data: list[list[list[list[float]]]],
    loop_rotations: list[int],
    duration_ms: int,
    source_frame_count: int,
) -> None:
    preview_output = output_root / "preview.html"
    preview_output.write_text(
        build_preview_html(animation_data, loop_rotations, duration_ms, source_frame_count) + "\n"
    )


def main() -> None:
    args = parse_args()
    frame_paths = load_frames(args.input)
    output_root = args.output
    animation_data, loop_rotations = extract_animation_data(frame_paths)

    write_typescript_data(output_root, animation_data, loop_rotations, args.duration_ms, len(frame_paths))
    write_json_data(output_root, animation_data, loop_rotations, args.duration_ms, len(frame_paths))
    write_svg_assets(output_root, animation_data, args.duration_ms)
    write_preview_html(output_root, animation_data, loop_rotations, args.duration_ms, len(frame_paths))

    print(f"Generated assets from {len(frame_paths)} frames into {output_root}.")


if __name__ == "__main__":
    main()
