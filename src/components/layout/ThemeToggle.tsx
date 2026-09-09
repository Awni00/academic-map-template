import { useEffect, useState } from "react";

type ThemePreference = "light" | "dark" | "system";

const CYCLE: Record<ThemePreference, ThemePreference> = {
  light: "dark",
  dark: "system",
  system: "light"
};

const LABEL: Record<ThemePreference, string> = {
  light: "light",
  dark: "dark",
  system: "system"
};

declare global {
  interface Window {
    /** Published by the inline bootstrap in BaseLayout.astro. */
    __applyTheme?: (preference: ThemePreference, persist: boolean) => "light" | "dark";
  }
}

function readPreference(): ThemePreference {
  const stored = document.documentElement.dataset.themePreference;
  return stored === "light" || stored === "dark" || stored === "system" ? stored : "light";
}

/**
 * Cycles light → dark → system.
 *
 * "system" is in the cycle because it is otherwise unreachable: the bootstrap
 * only honours it until the reader's first click, after which the stored
 * preference is a fixed mode forever. Applying the change goes through
 * `window.__applyTheme` so the resolve-and-stamp logic lives in exactly one
 * place; the local fallback covers the window before the inline script runs.
 */
export default function ThemeToggle() {
  const [preference, setPreference] = useState<ThemePreference>("light");

  useEffect(() => {
    setPreference(readPreference());
  }, []);

  // A "system" preference can change what is on screen without a click.
  useEffect(() => {
    if (preference !== "system") return;
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => setPreference("system");
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, [preference]);

  const next = CYCLE[preference];

  function toggleTheme() {
    setPreference(next);
    if (window.__applyTheme) {
      window.__applyTheme(next, true);
      return;
    }
    const resolved =
      next === "system"
        ? window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light"
        : next;
    document.documentElement.dataset.theme = resolved;
    document.documentElement.dataset.themePreference = next;
    localStorage.setItem("theme", next);
  }

  return (
    <button
      type="button"
      className="theme-toggle"
      aria-label={`Theme: ${LABEL[preference]}. Switch to ${LABEL[next]}.`}
      title={`Theme: ${LABEL[preference]}`}
      data-theme-preference={preference}
      onClick={toggleTheme}
    >
      <ThemeIcon preference={preference} />
    </button>
  );
}

function ThemeIcon({ preference }: { preference: ThemePreference }) {
  if (preference === "light") {
    return (
      <svg className="theme-toggle__icon" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2.5v2.25M12 19.25v2.25M4.75 4.75l1.6 1.6M17.65 17.65l1.6 1.6M2.5 12h2.25M19.25 12h2.25M4.75 19.25l1.6-1.6M17.65 6.35l1.6-1.6" />
      </svg>
    );
  }

  if (preference === "dark") {
    return (
      <svg className="theme-toggle__icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M20.5 14.25A7.8 7.8 0 0 1 9.75 3.5a8.9 8.9 0 1 0 10.75 10.75Z" />
      </svg>
    );
  }

  // "system": a display, i.e. whatever the device says.
  return (
    <svg className="theme-toggle__icon" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="4.5" width="18" height="12.5" rx="1.75" />
      <path d="M9 20.5h6" />
    </svg>
  );
}
