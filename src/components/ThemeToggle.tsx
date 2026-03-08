import { useEffect, useRef, useState } from "react";

type Theme = "light" | "dark";

export function ThemeToggle() {
  // Track if the user has manually set a preference (vs. auto-detected from OS)
  // Use a separate localStorage key to persist this flag
  const hasManualPreference = useRef(
    localStorage.getItem("theme-manual") === "true"
  );

  const [theme, setTheme] = useState<Theme>(() => {
    // Read from body class first (set by main.tsx before React renders)
    if (document.body.classList.contains("light")) {
      return "light";
    }
    if (document.body.classList.contains("dark")) {
      return "dark";
    }
    // Fallback: check localStorage
    const saved = localStorage.getItem("theme") as Theme | null;
    if (saved === "light" || saved === "dark") {
      return saved;
    }
    // Fall back to OS preference
    if (window.matchMedia("(prefers-color-scheme: light)").matches) {
      return "light";
    }
    return "dark";
  });

  useEffect(() => {
    // Apply theme to body
    document.body.classList.remove("light", "dark");
    document.body.classList.add(theme);
    
    // Always save the theme to localStorage so it persists across reloads
    localStorage.setItem("theme", theme);
    
    // Save the manual preference flag if it was manually set
    if (hasManualPreference.current) {
      localStorage.setItem("theme-manual", "true");
    }
  }, [theme]);

  useEffect(() => {
    // Listen for OS preference changes (only if no manual preference is set)
    const mediaQuery = window.matchMedia("(prefers-color-scheme: light)");
    const handleChange = (e: MediaQueryListEvent) => {
      // Only auto-update if user hasn't manually set a preference
      if (!hasManualPreference.current) {
        setTheme(e.matches ? "light" : "dark");
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const toggleTheme = () => {
    // Mark as manual preference when user toggles (so OS changes are ignored)
    hasManualPreference.current = true;
    localStorage.setItem("theme-manual", "true");
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="theme-toggle"
      aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
      title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
    >
      {theme === "light" ? (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      ) : (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      )}
    </button>
  );
}
