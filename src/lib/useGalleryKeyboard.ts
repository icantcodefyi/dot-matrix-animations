import { useEffect, type RefObject } from "react";

interface Args {
  gridRef: RefObject<HTMLElement | null>;
  searchInputRef: RefObject<HTMLInputElement | null>;
  onCopyFocused: () => void;
}

const isTextInput = (el: Element | null) =>
  !!el &&
  (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || (el as HTMLElement).isContentEditable);

const focusableCards = (grid: HTMLElement) =>
  Array.from(grid.querySelectorAll<HTMLElement>('[data-card-index]'));

const focusedCardIndex = (cards: HTMLElement[]) =>
  cards.findIndex((c) => c === document.activeElement);

const visibleColumnCount = (cards: HTMLElement[]): number => {
  if (cards.length === 0) return 1;
  const firstTop = cards[0].getBoundingClientRect().top;
  let count = 0;
  for (const card of cards) {
    if (Math.abs(card.getBoundingClientRect().top - firstTop) > 1) break;
    count++;
  }
  return Math.max(count, 1);
};

export function useGalleryKeyboard({
  gridRef,
  searchInputRef,
  onCopyFocused,
}: Args) {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as Element | null;

      // "/" focuses the search input from anywhere outside a text input.
      if (event.key === "/" && !isTextInput(target)) {
        event.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
        return;
      }

      // Escape blurs an active search input.
      if (event.key === "Escape" && target === searchInputRef.current) {
        searchInputRef.current?.blur();
        return;
      }

      const grid = gridRef.current;
      if (!grid) return;
      const cards = focusableCards(grid);
      if (cards.length === 0) return;

      // "c" copies the currently focused card.
      if (event.key === "c" && !isTextInput(target)) {
        const focusedIdx = focusedCardIndex(cards);
        if (focusedIdx >= 0) {
          event.preventDefault();
          onCopyFocused();
        }
        return;
      }

      // Arrow keys navigate between cards.
      const arrowKeys = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"];
      if (!arrowKeys.includes(event.key)) return;
      if (isTextInput(target)) return;
      const current = focusedCardIndex(cards);
      if (current < 0) return;

      let next = current;
      if (event.key === "ArrowLeft") next = current - 1;
      if (event.key === "ArrowRight") next = current + 1;
      if (event.key === "ArrowUp") next = current - visibleColumnCount(cards);
      if (event.key === "ArrowDown") next = current + visibleColumnCount(cards);
      if (next < 0 || next >= cards.length) return;

      event.preventDefault();
      cards[next].focus();
    };

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [gridRef, searchInputRef, onCopyFocused]);
}
