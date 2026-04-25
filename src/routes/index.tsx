import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useMemo, useRef, useState } from "react";

import { Gallery } from "~/components/Gallery";
import { Toolbar } from "~/components/Toolbar";
import { filterPatterns, type Density } from "~/lib/galleryState";
import { PATTERNS, type Category } from "~/lib/patterns";
import { useGalleryKeyboard } from "~/lib/useGalleryKeyboard";

export const Route = createFileRoute("/")({
  component: Home,
});

const DEFAULT_ACCENT = "#ffffff";

function Home() {
  const [query, setQuery] = useState("");
  const [activeCategories, setActiveCategories] = useState<ReadonlySet<Category>>(
    () => new Set(),
  );
  const [density, setDensity] = useState<Density>("comfortable");
  const [paused, setPaused] = useState(false);
  const [accentColor, setAccentColor] = useState(DEFAULT_ACCENT);
  const [speed, setSpeed] = useState(1);

  const filtered = useMemo(
    () => filterPatterns(PATTERNS, { query, activeCategories }),
    [query, activeCategories],
  );

  const gridRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const triggerCopyOnFocused = useCallback(() => {
    const focused = document.activeElement;
    if (focused instanceof HTMLElement && focused.dataset.cardIndex) {
      focused.click();
    }
  }, []);

  useGalleryKeyboard({
    gridRef,
    searchInputRef,
    onCopyFocused: triggerCopyOnFocused,
  });

  const toggleCategory = useCallback((category: Category) => {
    setActiveCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  }, []);

  const clearCategories = useCallback(
    () => setActiveCategories(new Set()),
    [],
  );

  return (
    <div className="shell">
      <header className="topbar">
        <a className="wordmark" href="/" aria-label="dot/matrix home">
          <span>dot</span>
          <span className="slash">/</span>
          <span>matrix</span>
          <span className="v">v0.2 · 2026</span>
        </a>
        <div className="meta">
          <span>
            <b>{PATTERNS.length}</b>&thinsp;loaders
          </span>
          <span>
            <b>5×5</b>&thinsp;grid
          </span>
          <span>
            <b>~4&thinsp;kb</b>&thinsp;each
          </span>
          <a
            className="gh"
            href="https://github.com/icantcodefyi/dot-matrix-animations"
            target="_blank"
            rel="noopener noreferrer"
          >
            github
          </a>
        </div>
      </header>

      <section className="hero">
        <h1>
          A small library
          <br />
          of <em>quiet</em> loaders<span className="punct">.</span>
        </h1>
        <p className="lede">
          Dot-matrix patterns, each animated from a single CSS keyframe and a
          per-dot delay map.{" "}
          <strong>No noise sampling, no GIFs, no JavaScript runtime.</strong>{" "}
          Drop the SVG into a page and it loops forever, about four kilobytes
          a piece.
        </p>
      </section>

      <div className="section-head">
        <h2>The set</h2>
        <span className="legend">
          <span>
            click a tile to copy its SVG, or focus and press <kbd>c</kbd>
          </span>
        </span>
      </div>

      <Toolbar
        query={query}
        onQueryChange={setQuery}
        searchInputRef={searchInputRef}
        activeCategories={activeCategories}
        onToggleCategory={toggleCategory}
        onClearCategories={clearCategories}
        density={density}
        onDensityChange={setDensity}
        paused={paused}
        onPausedChange={setPaused}
        resultCount={filtered.length}
        accentColor={accentColor}
        defaultAccentColor={DEFAULT_ACCENT}
        onAccentColorChange={setAccentColor}
        speed={speed}
        onSpeedChange={setSpeed}
      />

      <Gallery
        ref={gridRef}
        items={filtered}
        density={density}
        autoPlay={!paused}
        accentColor={accentColor}
        speed={speed}
      />

      <div className="section-head">
        <h2>Notes</h2>
      </div>

      <div className="footer">
        <p>
          Each loader is a self-contained <code>&lt;svg&gt;</code> with an
          inline <code>&lt;style&gt;</code> block. Copy one out and paste it
          anywhere. There are no external dependencies and no required font.
          They respect <code>prefers-reduced-motion</code> and fall back to a
          calm static state.
        </p>
        <div className="colophon">
          <div className="row">
            <span>regen</span>
            <span>python3 scripts/generate_animations.py</span>
          </div>
          <div className="row">
            <span>source</span>
            <span>./public/svg/icons/icon-NN.svg</span>
          </div>
          <div className="row">
            <span>repo</span>
            <span>
              <a
                href="https://github.com/icantcodefyi/dot-matrix-animations"
                target="_blank"
                rel="noopener noreferrer"
              >
                github.com/icantcodefyi/dot-matrix-animations
              </a>
            </span>
          </div>
          <div className="row">
            <span>license</span>
            <span>MIT. use anywhere</span>
          </div>
        </div>
      </div>
    </div>
  );
}
