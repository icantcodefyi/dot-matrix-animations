import { createFileRoute } from "@tanstack/react-router";

import { Gallery } from "~/components/Gallery";
import { PATTERNS } from "~/lib/patterns";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return (
    <div className="shell">
      <header className="topbar">
        <a className="wordmark" href="/" aria-label="dot/matrix home">
          <span>dot</span>
          <span className="slash">/</span>
          <span>matrix</span>
          <span className="v">v0.1 · 2026</span>
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
          <span>click a tile to copy its SVG</span>
          <kbd>↗</kbd>
        </span>
      </div>

      <Gallery />

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
