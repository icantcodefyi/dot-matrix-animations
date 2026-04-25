import { DotMatrixIcon, DOT_MATRIX_ICON_COUNT } from "./DotMatrixIcon";

const SCENE_PADDING = 24;
const TILE_SIZE = 184;
const TILE_GAP = 28;
const ICON_SIZE = 96;
const SCENE_SIZE = SCENE_PADDING * 2 + TILE_SIZE * 3 + TILE_GAP * 2;

export interface DotMatrixSceneProps {
  autoPlay?: boolean;
  backgroundColor?: string;
  showTileGrid?: boolean;
  tileFill?: string;
  tileStroke?: string;
}

export function DotMatrixScene({
  autoPlay = true,
  backgroundColor = "#060606",
  showTileGrid = true,
  tileFill = "#0a0a0a",
  tileStroke = "#1a1a1a",
}: DotMatrixSceneProps) {
  return (
    <svg
      aria-label="Dot Matrix Scene"
      role="img"
      viewBox={`0 0 ${SCENE_SIZE} ${SCENE_SIZE}`}
      width={SCENE_SIZE}
      height={SCENE_SIZE}
    >
      <rect width={SCENE_SIZE} height={SCENE_SIZE} fill={backgroundColor} />
      {Array.from({ length: DOT_MATRIX_ICON_COUNT }, (_, iconIndex) => {
        const rowIndex = Math.floor(iconIndex / 3);
        const columnIndex = iconIndex % 3;
        const tileX = SCENE_PADDING + columnIndex * (TILE_SIZE + TILE_GAP);
        const tileY = SCENE_PADDING + rowIndex * (TILE_SIZE + TILE_GAP);
        const iconX = tileX + (TILE_SIZE - ICON_SIZE) / 2;
        const iconY = tileY + (TILE_SIZE - ICON_SIZE) / 2;

        return (
          <g key={iconIndex}>
            {showTileGrid ? (
              <rect
                x={tileX}
                y={tileY}
                width={TILE_SIZE}
                height={TILE_SIZE}
                rx={18}
                fill={tileFill}
                stroke={tileStroke}
              />
            ) : null}
            <DotMatrixIcon
              autoPlay={autoPlay}
              iconIndex={iconIndex}
              size={ICON_SIZE}
              x={iconX}
              y={iconY}
            />
          </g>
        );
      })}
    </svg>
  );
}
