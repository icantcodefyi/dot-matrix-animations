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
}

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
}: ToolbarProps) {
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
    </div>
  );
}
