import { describe, expect, it } from "vitest";
import { canAccessPath, canDeleteInventory, canRecordSupplierPayment, landingPath, rolesForPath } from "@/lib/access";
import {
  normalizeUsername,
  passwordsMatch,
  usernameToEmail,
  validatePassword,
  validateUsername,
} from "@/lib/auth";
import { navItems, navItemsFor } from "@/lib/nav";

describe("username handling", () => {
  it("normalizes casing and whitespace", () => {
    expect(normalizeUsername("  KaSiR1 ")).toBe("kasir1");
  });

  it("maps usernames to internal-only auth emails", () => {
    expect(usernameToEmail(" Admin ")).toBe("admin@countsales.local");
  });

  it("accepts valid usernames", () => {
    expect(validateUsername("admin")).toBeNull();
    expect(validateUsername("kasir_01")).toBeNull();
    expect(validateUsername("a.b-c")).toBeNull();
  });

  it("rejects malformed usernames", () => {
    expect(validateUsername("")).toBeTruthy();
    expect(validateUsername("ab")).toBeTruthy();
    expect(validateUsername("admin@mail")).toBeTruthy();
    expect(validateUsername("admin space")).toBeTruthy();
  });

  it("normalizes casing before validating", () => {
    expect(validateUsername("Admin")).toBeNull();
  });
});

describe("password rules", () => {
  it("requires at least 6 chars and one number, with no other rules", () => {
    expect(validatePassword("rahasia123")).toBeNull();
    expect(validatePassword("pendek1")).toBeNull();
    expect(validatePassword("123456")).toBeNull();
    expect(validatePassword("TOKO12")).toBeNull();
    expect(validatePassword("abc12")).toBeTruthy();
    expect(validatePassword("abcdef")).toBeTruthy();
    expect(validatePassword("")).toBeTruthy();
  });

  it("matches confirmation", () => {
    expect(passwordsMatch("rahasia123", "rahasia123")).toBeNull();
    expect(passwordsMatch("rahasia123", "rahasia124")).toBeTruthy();
  });
});

describe("route access by role", () => {
  it("allows Input to enter products and inventory purchases", () => {
    for (const path of ["/produk", "/kategori", "/supplier", "/pembelian"]) {
      expect(canAccessPath("input", path)).toBe(true);
    }
    expect(landingPath("input")).toBe("/produk");
  });

  it("denies Input sales, financial reports, expenses and user settings", () => {
    for (const path of ["/", "/kasir", "/penjualan", "/struk/123", "/laporan", "/pengeluaran", "/pengaturan"]) {
      expect(canAccessPath("input", path)).toBe(false);
    }
  });

  it("reserves inventory deletion for Admin", () => {
    expect(canDeleteInventory("input")).toBe(false);
    expect(canDeleteInventory("admin")).toBe(true);
  });

  it("reserves supplier payment entry for Admin", () => {
    expect(canRecordSupplierPayment("input")).toBe(false);
    expect(canRecordSupplierPayment("admin")).toBe(true);
  });
  it("lets Admin open management pages", () => {
    for (const path of ["/produk", "/laporan", "/pengaturan", "/pembelian", "/pengeluaran"]) {
      expect(canAccessPath("admin", path)).toBe(true);
    }
  });

  it("restricts Kasir to sales pages", () => {
    expect(canAccessPath("kasir", "/kasir")).toBe(true);
    expect(canAccessPath("kasir", "/penjualan")).toBe(true);
    expect(canAccessPath("kasir", "/")).toBe(true);
    expect(canAccessPath("kasir", "/struk/abc-123")).toBe(true);

    expect(canAccessPath("kasir", "/produk")).toBe(false);
    expect(canAccessPath("kasir", "/laporan")).toBe(false);
    expect(canAccessPath("kasir", "/pengaturan")).toBe(false);
    expect(canAccessPath("kasir", "/pembelian")).toBe(false);
  });

  it("matches nested paths against their section", () => {
    expect(rolesForPath("/struk/123")).toEqual(["admin", "kasir"]);
    expect(rolesForPath("/tidak-dikenal")).toBeNull();
    expect(canAccessPath("kasir", "/tidak-dikenal")).toBe(true);
  });

  it("sends each role to a page it may open", () => {
    expect(landingPath("kasir")).toBe("/kasir");
    expect(canAccessPath("kasir", landingPath("kasir"))).toBe(true);
  });
});

describe("navigation", () => {
  it("shows Input only the inventory-entry sections", () => {
    expect(navItemsFor("input").map((item) => item.to)).toEqual(["/produk", "/kategori", "/pembelian", "/supplier"]);
  });
  it("hides Admin-only links from Kasir", () => {
    const labels = navItemsFor("kasir").map((item) => item.label);
    expect(labels).toEqual(["Dashboard", "Kasir", "Riwayat Penjualan"]);
  });

  it("keeps navigation roles in sync with the access rules", () => {
    for (const item of navItems) {
      expect(rolesForPath(item.to)).toEqual(item.roles);
    }
  });
});
