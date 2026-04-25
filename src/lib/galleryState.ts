import type { Category, PatternSpec } from "~/lib/patterns";

export type Density = "comfortable" | "compact";

export interface GalleryFilter {
  query: string;
  activeCategories: ReadonlySet<Category>;
}

export function filterPatterns(
  patterns: ReadonlyArray<PatternSpec>,
  { query, activeCategories }: GalleryFilter,
): ReadonlyArray<{ pattern: PatternSpec; iconIndex: number }> {
  const needle = query.trim().toLowerCase();
  return patterns
    .map((pattern, iconIndex) => ({ pattern, iconIndex }))
    .filter(({ pattern }) => {
      if (
        activeCategories.size > 0 &&
        !activeCategories.has(pattern.category)
      ) {
        return false;
      }
      if (needle.length === 0) return true;
      return (
        pattern.title.toLowerCase().includes(needle) ||
        pattern.slug.toLowerCase().includes(needle) ||
        pattern.blurb.toLowerCase().includes(needle)
      );
    });
}
