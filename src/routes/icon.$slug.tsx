import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useCallback, useState } from "react";

import { DotMatrixIcon } from "~/components/DotMatrixIcon";
import { PATTERNS } from "~/lib/patterns";
import { serializeIconSvg } from "~/lib/serializeIcon";

export const Route = createFileRoute("/icon/$slug")({
  loader: ({ params }) => {
    const iconIndex = PATTERNS.findIndex((p) => p.slug === params.slug);
    if (iconIndex < 0) throw notFound();
    return { iconIndex };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return {};
    const pattern = PATTERNS[loaderData.iconIndex];
    return {
      meta: [
        { title: `${pattern.title} · dot/matrix` },
        { name: "description", content: pattern.blurb },
        { property: "og:title", content: `${pattern.title} · dot/matrix` },
        { property: "og:description", content: pattern.blurb },
      ],
    };
  },
  notFoundComponent: () => (
    <div className="shell">
      <div className="grid-empty" role="status">
        no loader with that slug — <Link to="/">back to all loaders</Link>.
      </div>
    </div>
  ),
  component: IconDetail,
});

const SAMPLE_SIZES = [16, 24, 32, 48, 72];

function IconDetail() {
  const { iconIndex } = Route.useLoaderData();
  const pattern = PATTERNS[iconIndex];
  const svgString = serializeIconSvg(iconIndex);
  const reactSnippet = `<DotMatrixIcon iconIndex={${iconIndex}} size={48} />`;

  const animatedCells = countAnimatedCells(iconIndex);
  const bytes = new TextEncoder().encode(svgString).length;

  return (
    <div className="shell detail-shell">
      <header className="topbar">
        <Link to="/" className="wordmark" aria-label="back to gallery">
          <span>dot</span>
          <span className="slash">/</span>
          <span>matrix</span>
        </Link>
        <Link to="/" className="back-link">← all loaders</Link>
      </header>

      <section className="detail-hero">
        <div className="detail-stage">
          <DotMatrixIcon iconIndex={iconIndex} size={280} forceLoop />
        </div>
        <div className="detail-meta">
          <div className="detail-eyebrow">
            <span className="eyebrow-index">
              {String(iconIndex + 1).padStart(2, "0")}
            </span>
            <span className="eyebrow-cat">{pattern.category}</span>
          </div>
          <h1>{pattern.title}</h1>
          <p className="detail-blurb">{pattern.blurb}</p>

          <dl className="detail-stats">
            <Stat label="slug" value={pattern.slug} mono />
            <Stat label="duration" value={`${pattern.durationMs}ms`} mono />
            <Stat label="iteration" value={pattern.iteration ?? "infinite"} mono />
            <Stat label="lit cells" value={`${animatedCells} / 25`} mono />
            <Stat label="size" value={`${formatBytes(bytes)}`} mono />
            <Stat label="easing" value={pattern.easing} mono />
          </dl>
        </div>
      </section>

      <section className="detail-section">
        <h2>used at typical sizes</h2>
        <div className="size-strip">
          {SAMPLE_SIZES.map((size) => (
            <figure key={size}>
              <DotMatrixIcon iconIndex={iconIndex} size={size} forceLoop />
              <figcaption>{size}px</figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="detail-section">
        <h2>react</h2>
        <CodeBlock code={reactSnippet} language="tsx" />
      </section>

      <section className="detail-section">
        <h2>standalone svg</h2>
        <CodeBlock code={svgString} language="svg" wrap />
      </section>
    </div>
  );
}

function countAnimatedCells(iconIndex: number): number {
  const pattern = PATTERNS[iconIndex];
  let count = 0;
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 5; col++) {
      if (pattern.delay(col, row) >= 0) count++;
    }
  }
  return count;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(2)} KB`;
}

function Stat({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="stat">
      <dt>{label}</dt>
      <dd className={mono ? "is-mono" : undefined}>{value}</dd>
    </div>
  );
}

function CodeBlock({
  code,
  language,
  wrap,
}: {
  code: string;
  language: string;
  wrap?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const onCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  }, [code]);

  return (
    <div className="code-block">
      <div className="code-meta">
        <span className="code-lang">{language}</span>
        <button
          type="button"
          className={`code-copy ${copied ? "is-copied" : ""}`}
          onClick={() => void onCopy()}
        >
          {copied ? "copied" : "copy"}
        </button>
      </div>
      <pre className={wrap ? "is-wrap" : undefined}>
        <code>{code}</code>
      </pre>
    </div>
  );
}
