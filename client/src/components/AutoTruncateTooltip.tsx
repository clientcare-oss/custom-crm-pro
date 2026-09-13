import { useEffect } from "react";

/**
 * AutoTruncateTooltip
 * Automatically attaches native hover tooltips (title attribute) to ANY element across the entire CRM
 * whose text is truncated or overflowing (e.g. text-ellipsis, truncate, line-clamp, restricted width).
 */
export function AutoTruncateTooltip() {
  useEffect(() => {
    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target || !(target instanceof HTMLElement)) return;

      // Inspect target and up to 3 parent levels
      let el: HTMLElement | null = target;
      let depth = 0;

      while (el && depth < 3) {
        // Skip if element or ancestor already has an explicit title
        if (el.getAttribute("title")) break;

        // Check if text is clipped or overflowing
        const isOverflowingX = el.scrollWidth > el.clientWidth + 1;
        const isOverflowingY = el.scrollHeight > el.clientHeight + 1;
        const style = window.getComputedStyle(el);
        const hasEllipsis = style.textOverflow === "ellipsis" || style.overflow === "hidden";
        const isTruncatedClass =
          el.classList.contains("truncate") ||
          el.classList.contains("text-ellipsis") ||
          el.classList.contains("line-clamp-1") ||
          el.classList.contains("line-clamp-2") ||
          el.classList.contains("line-clamp-3");

        if ((isOverflowingX || isOverflowingY || isTruncatedClass || hasEllipsis) && el.textContent) {
          const text = el.innerText?.trim() || el.textContent?.trim();
          if (text && text.length > 2 && text.length < 600 && isOverflowingX) {
            el.setAttribute("title", text);
            break;
          }
        }
        el = el.parentElement;
        depth++;
      }
    };

    document.addEventListener("mouseover", handleMouseOver, { passive: true });
    return () => {
      document.removeEventListener("mouseover", handleMouseOver);
    };
  }, []);

  return null;
}
