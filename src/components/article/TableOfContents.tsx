import { useEffect, useState } from "react";

type Heading = {
  depth: number;
  slug: string;
  text: string;
};

type Props = {
  headings: Heading[];
};

/**
 * Distill-style progress strip TOC. Renders one row per h2/h3 with a small
 * leading dot and the heading text. The active row is highlighted via the
 * left-border slab + accent text colour applied by `.article-sidebar .toc
 * a[aria-current="true"]`. The dot stays neutral (deliberately not blue —
 * see article.css notes) so it doesn't read as a highlighted first
 * character of the heading.
 */
export default function TableOfContents({ headings }: Props) {
  const items = headings.filter((heading) => heading.depth >= 2 && heading.depth <= 3);
  const activeId = useScrollSpy(items.map((h) => h.slug));

  if (items.length === 0) return <p className="muted">No headings yet.</p>;

  return (
    <ul className="toc toc--strip" aria-label="Table of contents">
      {items.map((heading) => (
        <li
          key={heading.slug}
          data-depth={heading.depth}
          data-active={activeId === heading.slug ? "true" : undefined}
        >
          <a
            href={`#${heading.slug}`}
            aria-current={activeId === heading.slug ? "true" : undefined}
          >
            <span className="toc-dot" aria-hidden="true" />
            <span className="toc-tip">{heading.text}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

/**
 * Track which heading is currently the "current" reading position by
 * observing all matching elements with IntersectionObserver. The active
 * id is the topmost heading whose top has crossed a sticky threshold
 * (~30% from the viewport top).
 */
function useScrollSpy(slugs: string[]): string | null {
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || slugs.length === 0) return;
    const elements = slugs
      .map((slug) => document.getElementById(slug))
      .filter((el): el is HTMLElement => Boolean(el));
    if (elements.length === 0) return;

    // Recompute the active heading from current positions. The active id
    // is the *latest* heading whose top is at or above the 30%-of-viewport
    // line (i.e., the heading we've most recently scrolled past). This
    // beats transition-tracking because it's stateless and self-correcting
    // when the observer's batched updates skip a state.
    const recompute = () => {
      const threshold = window.innerHeight * 0.3;
      let lastActive: string | null = null;
      for (const el of elements) {
        if (el.getBoundingClientRect().top <= threshold) lastActive = el.id;
      }
      setActiveId(lastActive ?? elements[0].id);
    };

    // Use IntersectionObserver as a low-frequency change-trigger; the real
    // computation reads layout directly. This avoids missing intermediate
    // states and is still cheap (recompute is O(headings), called only on
    // band crossings + scroll).
    const observer = new IntersectionObserver(() => recompute(), {
      rootMargin: "0px 0px -70% 0px",
      threshold: [0, 1]
    });
    for (const el of elements) observer.observe(el);
    // Also recompute on scroll as a safety net; coalesced via rAF so the
    // cost is one layout-read per frame at most.
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        recompute();
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    recompute();
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [slugs.join("|")]);

  return activeId;
}
