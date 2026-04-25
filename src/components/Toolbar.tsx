import { CATEGORIES, type Category } from "~/lib/patterns";

import type { Density } from "~/lib/galleryState";

interface ToolbarProps {
  query: string;
  onQueryChange: (value: string) => void;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  activeCategories: ReadonlySet<Category>;
  onToggleCategory: (category: Category) => void;
  onClearCategories: () => void;
  density: Density;
  onDensityChange: (density: Density) => void;
  paused: boolean;
  onPausedChange: (paused: boolean) => void;
  resultCount: number;
  accentColor: string;
  defaultAccentColor: string;
  onAccentColorChange: (color: string) => void;
  speed: number;
  onSpeedChange: (speed: number) => void;
}

const SPEED_PRESETS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2];

export function Toolbar({
  query,
  onQueryChange,
  searchInputRef,
  activeCategories,
  onToggleCategory,
  onClearCategories,
  density,
  onDensityChange,
  paused,
  onPausedChange,
  resultCount,
  accentColor,
  defaultAccentColor,
  onAccentColorChange,
  speed,
  onSpeedChange,
}: ToolbarProps) {
  const speedLabel = `${speed.toFixed(2).replace(/\.?0+$/, "")}×`;
  const isCustomColor =
    accentColor.toLowerCase() !== defaultAccentColor.toLowerCase();
  const allActive = activeCategories.size === 0;

  return (
    <div className="toolbar" role="search">
      <div className="toolbar-row">
        <label className="search">
          <span className="search-icon" aria-hidden="true">⌕</span>
          <input
            ref={searchInputRef}
            type="search"
            placeholder="filter by name…"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            aria-label="Filter loaders by name"
            spellCheck={false}
          />
          <kbd aria-hidden="true">/</kbd>
        </label>

        <div className="toolbar-controls">
          <div className="density-toggle" role="group" aria-label="Grid density">
            <button
              type="button"
              className={density === "comfortable" ? "is-active" : ""}
              aria-pressed={density === "comfortable"}
              onClick={() => onDensityChange("comfortable")}
            >
              comfortable
            </button>
            <button
              type="button"
              className={density === "compact" ? "is-active" : ""}
              aria-pressed={density === "compact"}
              onClick={() => onDensityChange("compact")}
            >
              compact
            </button>
          </div>

          <button
            type="button"
            className={`pause-toggle ${paused ? "is-paused" : ""}`}
            aria-pressed={paused}
            onClick={() => onPausedChange(!paused)}
            title={paused ? "resume all animations" : "pause all animations"}
          >
            <span className="pause-glyph" aria-hidden="true">
              {paused ? "▶" : "▌▌"}
            </span>
            <span>{paused ? "play all" : "pause all"}</span>
          </button>
        </div>
      </div>

      <div className="filter-row">
        <div className="pills" role="group" aria-label="Filter by category">
          <button
            type="button"
            className={`pill ${allActive ? "is-active" : ""}`}
            aria-pressed={allActive}
            onClick={onClearCategories}
          >
            all
          </button>
          {CATEGORIES.map((cat) => {
            const active = activeCategories.has(cat.id);
            return (
              <button
                key={cat.id}
                type="button"
                className={`pill ${active ? "is-active" : ""}`}
                aria-pressed={active}
                onClick={() => onToggleCategory(cat.id)}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
        <span className="result-count" aria-live="polite">
          {resultCount} {resultCount === 1 ? "loader" : "loaders"}
        </span>
      </div>

      <div className="tune-row">
        <label className="color-picker">
          <span className="tune-label">tint</span>
          <span
            className="color-swatch"
            aria-hidden="true"
            style={{ background: accentColor }}
          />
          <input
            type="color"
            value={accentColor}
            onChange={(e) => onAccentColorChange(e.target.value)}
            aria-label="Loader tint color"
          />
          {isCustomColor ? (
            <button
              type="button"
              className="reset-link"
              onClick={() => onAccentColorChange(defaultAccentColor)}
              title="reset to default tint"
            >
              reset
            </button>
          ) : null}
        </label>

        <label className="speed-scrubber">
          <span className="tune-label">speed</span>
          <input
            type="range"
            min={0.25}
            max={2}
            step={0.05}
            list="speed-presets"
            value={speed}
            onChange={(e) => onSpeedChange(Number(e.target.value))}
            aria-label="Animation speed"
          />
          <datalist id="speed-presets">
            {SPEED_PRESETS.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
          <output className="speed-value">{speedLabel}</output>
        </label>
      </div>
    </div>
  );
}
