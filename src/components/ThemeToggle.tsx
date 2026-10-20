import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";

type ThemeToggleProps = {
  className?: string;
};

/**
 * A small "day/night" switch: gradient track, sliding orb, and a few stars that
 * only appear in dark mode. The visual state is driven by the `.dark` class on
 * <html>, so it is correct even before React hydrates.
 */
export function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? "Aktifkan mode terang" : "Aktifkan mode gelap"}
      title={isDark ? "Mode gelap — klik untuk mode terang" : "Mode terang — klik untuk mode gelap"}
      onClick={toggleTheme}
      className={cn(
        "group relative inline-flex h-9 w-[68px] shrink-0 items-center rounded-full border border-border/80 p-1",
        "bg-gradient-to-r from-amber-100 via-orange-50 to-sky-100",
        "shadow-inner transition-colors duration-500 hover:border-primary/50",
        "dark:from-indigo-950 dark:via-slate-900 dark:to-slate-800",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className,
      )}
    >
      <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-full">
        <span className="absolute left-3 top-2 h-1 w-1 rounded-full bg-white opacity-0 transition-opacity duration-500 dark:opacity-90" />
        <span className="absolute left-5 top-3 h-0.5 w-0.5 rounded-full bg-white/80 opacity-0 transition-opacity delay-100 duration-500 dark:opacity-80" />
        <span className="absolute bottom-2.5 left-2.5 h-0.5 w-0.5 rounded-full bg-white/60 opacity-0 transition-opacity delay-200 duration-500 dark:opacity-70" />
      </span>

      {/* The icon on the far side hints at the mode you can switch to. */}
      <Sun className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 -rotate-90 text-amber-400/80 opacity-0 transition-all duration-500 dark:rotate-0 dark:opacity-100" />
      <Moon className="pointer-events-none absolute right-2.5 h-3.5 w-3.5 text-indigo-300/70 transition-all duration-500 dark:rotate-90 dark:opacity-0" />

      <span
        className={cn(
          "relative z-10 flex h-7 w-7 translate-x-0 items-center justify-center rounded-full",
          "bg-white text-amber-500 shadow-md ring-1 ring-black/5",
          "transition-transform duration-300 ease-out",
          "dark:translate-x-[30px] dark:bg-slate-950 dark:text-indigo-300 dark:shadow-[0_0_16px_-2px_rgba(129,140,248,0.65)] dark:ring-white/10",
          "group-hover:scale-105 group-active:scale-95",
        )}
      >
        <Sun className="h-3.5 w-3.5 dark:hidden" />
        <Moon className="hidden h-3.5 w-3.5 dark:block" />
      </span>
    </button>
  );
}
