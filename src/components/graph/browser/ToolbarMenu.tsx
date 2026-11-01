import { useEffect, useId, useRef, useState, type ReactNode } from "react";

import Icon, { type IconName } from "./icons";

type ToolbarMenuProps = {
  /** Accessible name, and the visible label from tablet width up. */
  label: string;
  icon: IconName;
  /** A count on the button, e.g. how many filters are on. */
  badge?: number;
  /** Replaces `label` as the visible text, e.g. the current sort. */
  text?: string;
  /** The panel's contents; `close` dismisses it, returning focus to the button. */
  children: (close: () => void) => ReactNode;
};

/**
 * A toolbar button that opens a panel: a dropdown card under the button from
 * tablet width up, a bottom sheet over a scrim on phones (graph.css,
 * `.wb-menu`). One component, so Filters and Sort open, dismiss and return
 * focus the same way at every size.
 *
 * Dismissed by Esc, by a press outside, or by the panel's own actions.
 * `pointerdown`, not `click`: a press that starts on the map should dismiss
 * before the canvas reads its release as a node selection.
 */
export default function ToolbarMenu({ label, icon, badge, text, children }: ToolbarMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const panelId = useId();

  const close = (refocus = true) => {
    setOpen(false);
    if (refocus) buttonRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    panelRef.current?.querySelector<HTMLElement>("button, a, input")?.focus({ preventScroll: true });
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) close(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="wb-menu" ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        className="wb-tool"
        aria-label={label}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((current) => !current)}
      >
        <Icon name={icon} />
        <span className="wb-tool__label">{text ?? label}</span>
        {badge ? <span className="wb-badge">{badge}</span> : null}
      </button>
      {open && (
        <>
          <div className="wb-menu__scrim" onClick={() => close()} />
          <div ref={panelRef} id={panelId} className="wb-menu__panel" role="dialog" aria-label={label}>
            {children(() => close())}
          </div>
        </>
      )}
    </div>
  );
}
