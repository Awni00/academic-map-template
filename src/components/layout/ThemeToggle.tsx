import { useEffect, useState } from "react";

type ThemePreference = "system" | "light" | "dark";

function resolveTheme(preference: ThemePreference): "light" | "dark" {
  if (preference === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return preference;
}

export default function ThemeToggle() {
  const [preference, setPreference] = useState<ThemePreference>("system");

  useEffect(() => {
    const stored = localStorage.getItem("theme") as ThemePreference | null;
    setPreference(stored ?? "system");
  }, []);

  useEffect(() => {
    const resolved = resolveTheme(preference);
    document.documentElement.dataset.theme = resolved;
    document.documentElement.dataset.themePreference = preference;
    localStorage.setItem("theme", preference);
  }, [preference]);

  const next = preference === "system" ? "light" : preference === "light" ? "dark" : "system";
  const label = preference === "system" ? "System theme" : `${preference} theme`;

  return (
    <button
      type="button"
      className="theme-toggle"
      aria-label={`Theme: ${label}. Switch to ${next}.`}
      title={`Theme: ${label}`}
      onClick={() => setPreference(next)}
    >
      {preference === "system" ? "S" : preference === "light" ? "L" : "D"}
    </button>
  );
}
