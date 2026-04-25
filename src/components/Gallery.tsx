import { forwardRef } from "react";

import { GalleryCard } from "~/components/GalleryCard";
import type { Density } from "~/lib/galleryState";
import type { PatternSpec } from "~/lib/patterns";

interface GalleryProps {
  items: ReadonlyArray<{ pattern: PatternSpec; iconIndex: number }>;
  density: Density;
  autoPlay: boolean;
  accentColor: string;
  speed: number;
}

export const Gallery = forwardRef<HTMLDivElement, GalleryProps>(function Gallery(
  { items, density, autoPlay, accentColor, speed },
  ref,
) {
  if (items.length === 0) {
    return (
      <div className="grid-empty" role="status">
        no loaders match — try clearing the filter or pressing <kbd>/</kbd>.
      </div>
    );
  }
  return (
    <div
      ref={ref}
      className={`grid is-${density}`}
      role="list"
      aria-label="dot-matrix loader gallery"
      style={{ color: accentColor }}
    >
      {items.map(({ pattern, iconIndex }, position) => (
        <GalleryCard
          key={pattern.slug}
          pattern={pattern}
          iconIndex={iconIndex}
          cardIndex={position}
          autoPlay={autoPlay}
          speed={speed}
        />
      ))}
    </div>
  );
});
