import { GalleryCard } from "~/components/GalleryCard";
import { PATTERNS } from "~/lib/patterns";

export function Gallery() {
  return (
    <div className="grid" role="list">
      {PATTERNS.map((pattern, iconIndex) => (
        <GalleryCard
          key={pattern.slug}
          pattern={pattern}
          iconIndex={iconIndex}
        />
      ))}
    </div>
  );
}
