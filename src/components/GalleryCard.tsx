import { Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";

import { DotMatrixIcon } from "~/components/DotMatrixIcon";
import type { PatternSpec } from "~/lib/patterns";
import { serializeIconSvg } from "~/lib/serializeIcon";

type CopyState = "idle" | "copied" | "error";

interface GalleryCardProps {
  pattern: PatternSpec;
  iconIndex: number;
  /** Position in the filtered grid; used by keyboard nav. */
  cardIndex: number;
  autoPlay: boolean;
  speed: number;
}

function fallbackCopy(text: string): boolean {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.setAttribute("readonly", "");
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  document.body.removeChild(ta);
  return ok;
}

export function GalleryCard({
  pattern,
  iconIndex,
  cardIndex,
  autoPlay,
  speed,
}: GalleryCardProps) {
  const [state, setState] = useState<CopyState>("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  const handleCopy = useCallback(async () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const svg = serializeIconSvg(iconIndex);
    let copied = false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(svg);
        copied = true;
      } else {
        copied = fallbackCopy(svg);
      }
    } catch {
      copied = fallbackCopy(svg);
    }
    setState(copied ? "copied" : "error");
    timerRef.current = setTimeout(
      () => setState("idle"),
      copied ? 1400 : 1800,
    );
  }, [iconIndex]);

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLElement>) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        void handleCopy();
      }
    },
    [handleCopy],
  );

  const indexLabel = String(iconIndex + 1).padStart(2, "0");
  const className = ["card", state === "copied" ? "is-copied" : "", state === "error" ? "is-error" : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <article
      className={className}
      role="listitem"
      tabIndex={0}
      data-card-index={cardIndex}
      data-slug={pattern.slug}
      data-category={pattern.category}
      aria-label={`${pattern.title}, ${pattern.category}, click to copy SVG`}
      onClick={() => void handleCopy()}
      onKeyDown={onKeyDown}
    >
      <span className="index">{indexLabel}</span>
      <span className="copy" aria-hidden="true" />
      <div className="stage">
        <DotMatrixIcon
          iconIndex={iconIndex}
          size={88}
          autoPlay={autoPlay}
          speedMultiplier={speed}
          forceLoop
        />
      </div>
      <div className="info">
        <div className="info-head">
          <span className="name">{pattern.title}</span>
          <span className="slug">{pattern.slug}</span>
        </div>
        <span className="blurb">{pattern.blurb}</span>
        <div className="info-foot">
          <span className="category-tag" aria-hidden="true">
            {pattern.category}
          </span>
          <Link
            to="/icon/$slug"
            params={{ slug: pattern.slug }}
            className="details-link"
            aria-label={`open ${pattern.title} details`}
            onClick={(e) => e.stopPropagation()}
          >
            details →
          </Link>
        </div>
      </div>
    </article>
  );
}
