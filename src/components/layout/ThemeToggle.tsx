import { useEffect, useState } from "react";

type ThemeMode = "light" | "dark";

function readInitialTheme(): ThemeMode {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

export default function ThemeToggle() {
  const [mode, setMode] = useState<ThemeMode>("light");

  useEffect(() => {
    setMode(readInitialTheme());
  }, []);

  const next = mode === "light" ? "dark" : "light";
  const label = `${mode} theme`;

  function toggleTheme() {
    setMode(next);
    document.documentElement.dataset.theme = next;
    document.documentElement.dataset.themePreference = next;
    localStorage.setItem("theme", next);
  }

  return (
    <button
      type="button"
      className="theme-toggle"
      aria-label={`Theme: ${label}. Switch to ${next}.`}
      title={`Theme: ${label}`}
      data-theme-preference={mode}
      onClick={toggleTheme}
    >
      <ThemeIcon mode={mode} />
    </button>
  );
}

function ThemeIcon({ mode }: { mode: ThemeMode }) {
  if (mode === "light") {
    return (
      <svg className="theme-toggle__icon" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2.5v2.25M12 19.25v2.25M4.75 4.75l1.6 1.6M17.65 17.65l1.6 1.6M2.5 12h2.25M19.25 12h2.25M4.75 19.25l1.6-1.6M17.65 6.35l1.6-1.6" />
      </svg>
    );
  }

  return (
    <svg className="theme-toggle__icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20.5 14.25A7.8 7.8 0 0 1 9.75 3.5a8.9 8.9 0 1 0 10.75 10.75Z" />
    </svg>
  );
}
