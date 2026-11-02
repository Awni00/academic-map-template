import { useEffect, useRef, useState } from "react";

import type { TocConfig } from "../../config/types";
import { DEFAULT_TOC_CONFIG, filterHeadingsForToc, type TocHeading } from "../../lib/article/toc";
import { TocList, useScrollSpy } from "./TableOfContents";

type Props = {
  headings: TocHeading[];
  tocConfig?: TocConfig;
};

/**
 * The table of contents where the sidebar has no room (≤ 980px): a pill at
 * the foot of the screen naming the section being read, with a ring for how
 * far through the page you are, that opens the contents as a bottom sheet.
 *
 * A native popover, so Esc, outside taps and focus return are the browser's.
 * Picking a section closes the sheet and scrolls there. Hidden from 981px up,
 * where the sidebar shows the same list.
 *
 * The pill stays out of sight until the article header has scrolled away:
 * on the first screen it would sit over the byline, and the header already
 * says where the reader is.
 */
export default function ContentsSheet({ headings, tocConfig = DEFAULT_TOC_CONFIG }: Props) {
  const items = filterHeadingsForToc(headings, tocConfig);
  const activeId = useScrollSpy(items.map((h) => h.slug));
  const progress = useReadingProgress();
  const pastHeader = usePastHeader();
  const sheetRef = useRef<HTMLDivElement | null>(null);

  if (items.length < 2) return null;
  const current = items.find((h) => h.slug === activeId) ?? items[0];

  return (
    <div className="contents-sheet">
      <button
        type="button"
        className="contents-pill"
        popoverTarget="contents-sheet"
        aria-label={`Contents: ${current.text}`}
        data-revealed={pastHeader ? "true" : undefined}
      >
        <span className="contents-pill__ring" style={{ ["--progress" as string]: progress }} aria-hidden="true" />
        <span className="contents-pill__text">{current.text}</span>
      </button>
      <div id="contents-sheet" ref={sheetRef} className="contents-sheet__panel" popover="auto">
        <p className="contents-sheet__label">Contents</p>
        <TocList items={items} activeId={activeId} onNavigate={() => sheetRef.current?.hidePopover()} />
      </div>
    </div>
  );
}

/** How far through the page the reader is, 0–1, updated once per frame. */
function useReadingProgress(): number {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0);
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);
  return progress;
}

/**
 * Whether the article header has scrolled up out of the viewport. True from
 * the start on a page without one, so the pill is never lost for good.
 */
function usePastHeader(): boolean {
  const [past, setPast] = useState(false);
  useEffect(() => {
    const header = document.querySelector(".article-header");
    if (!header || !("IntersectionObserver" in window)) {
      setPast(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      setPast(!entry.isIntersecting && entry.boundingClientRect.bottom <= 0);
    });
    observer.observe(header);
    return () => observer.disconnect();
  }, []);
  return past;
}
