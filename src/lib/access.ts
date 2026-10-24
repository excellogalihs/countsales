import type { Role } from "@/lib/auth";

/**
 * Route-level role requirements. This is the single source of truth used both by
 * the sidebar (to hide links) and by the authenticated shell (to block direct
 * URL access). Backend tables and RPCs enforce the same rules independently via
 * RLS (see migration 0003), so hiding UI alone is never the only guard.
 */
export const routeRoles: Record<string, readonly Role[]> = {
  "/": ["admin", "kasir"],
  "/kasir": ["admin", "kasir"],
  "/penjualan": ["admin", "kasir"],
  "/struk": ["admin", "kasir"],
  "/produk": ["admin", "input"],
  "/kategori": ["admin", "input"],
  "/pembelian": ["admin", "input"],
  "/supplier": ["admin", "input"],
  "/pengeluaran": ["admin"],
  "/laporan": ["admin"],
  "/pengaturan": ["admin"],
};

const ROUTE_KEYS = Object.keys(routeRoles).sort((a, b) => b.length - a.length);

/** Roles allowed for a URL pathname. Unknown paths (404 pages) are open. */
export function rolesForPath(pathname: string): readonly Role[] | null {
  for (const key of ROUTE_KEYS) {
    if (key === "/" ? pathname === "/" : pathname === key || pathname.startsWith(`${key}/`)) {
      return routeRoles[key] ?? null;
    }
  }
  return null;
}

export function canAccessPath(role: Role, pathname: string): boolean {
  const roles = rolesForPath(pathname);
  return roles === null || roles.includes(role);
}

/** Where a role lands when it asks for a page it may not open. */
export function landingPath(role: Role): string {
  return role === "kasir" ? "/kasir" : role === "input" ? "/produk" : "/";
}

export const canDeleteInventory = (role: Role) => role === "admin";
export const canRecordSupplierPayment = (role: Role) => role === "admin";
