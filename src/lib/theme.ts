export type Theme = "light" | "dark";

/** Shared with the inline boot script so both read the same key. */
export const THEME_STORAGE_KEY = "countsales-theme";

/**
 * Picks the theme from an explicit choice, falling back to the OS preference.
 * Exported separately so it can be unit-tested without a browser.
 */
export function resolveTheme(stored: string | null, prefersDark: boolean): Theme {
  if (stored === "light" || stored === "dark") return stored;
  return prefersDark ? "dark" : "light";
}

export function readStoredTheme(): string | null {
  try {
    return window.localStorage.getItem(THEME_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function getPreferredTheme(): Theme {
  if (typeof window === "undefined") return "light";
  return resolveTheme(
    readStoredTheme(),
    window.matchMedia("(prefers-color-scheme: dark)").matches,
  );
}

export function applyTheme(theme: Theme): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
}

export function persistTheme(theme: Theme): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Private mode / storage disabled: the theme still applies for this session.
  }
}

/**
 * Runs before first paint so the page never flashes the wrong theme.
 * Kept as a plain string because it is injected into <head>.
 */
export const THEME_BOOT_SCRIPT = `(function(){try{var k=${JSON.stringify(
  THEME_STORAGE_KEY,
)};var s=localStorage.getItem(k);var d=s==="dark"||(s!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);var r=document.documentElement;r.classList.toggle("dark",d);r.style.colorScheme=d?"dark":"light";}catch(e){}})();`;
