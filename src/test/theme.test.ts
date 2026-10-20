import { describe, expect, it } from "vitest";
import { resolveTheme, THEME_STORAGE_KEY } from "@/lib/theme";

describe("theme preference", () => {
  it("prefers an explicit saved choice over the OS", () => {
    expect(resolveTheme("dark", false)).toBe("dark");
    expect(resolveTheme("light", true)).toBe("light");
  });

  it("falls back to the OS preference when nothing valid is saved", () => {
    expect(resolveTheme(null, true)).toBe("dark");
    expect(resolveTheme(null, false)).toBe("light");
    expect(resolveTheme("sepia", true)).toBe("dark");
  });

  it("keeps a stable storage key shared with the boot script", () => {
    expect(THEME_STORAGE_KEY).toBe("countsales-theme");
  });
});
