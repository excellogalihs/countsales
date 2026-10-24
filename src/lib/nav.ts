import {
  LayoutDashboard,
  Package,
  Tags,
  ShoppingCart,
  Calculator,
  PackagePlus,
  Truck,
  Wallet,
  FileBarChart,
  Settings,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "@/lib/auth";

/** Every navigable path in the app; keeps `Link` fully typed. */
export type NavPath =
  | "/"
  | "/produk"
  | "/kategori"
  | "/kasir"
  | "/penjualan"
  | "/pembelian"
  | "/supplier"
  | "/pengeluaran"
  | "/laporan"
  | "/pengaturan";

export type NavItem = {
  to: NavPath;
  label: string;
  icon: LucideIcon;
  /** Roles allowed to see and open the page. Mirrored by `routeRoles` in lib/access.ts. */
  roles: readonly Role[];
};

export const navItems: readonly NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "kasir"] },
  { to: "/produk", label: "Produk", icon: Package, roles: ["admin", "input"] },
  { to: "/kategori", label: "Kategori", icon: Tags, roles: ["admin", "input"] },
  { to: "/kasir", label: "Kasir", icon: Calculator, roles: ["admin", "kasir"] },
  { to: "/penjualan", label: "Riwayat Penjualan", icon: ShoppingCart, roles: ["admin", "kasir"] },
  { to: "/pembelian", label: "Pembelian Stok", icon: PackagePlus, roles: ["admin", "input"] },
  { to: "/supplier", label: "Supplier", icon: Truck, roles: ["admin", "input"] },
  { to: "/pengeluaran", label: "Pengeluaran", icon: Wallet, roles: ["admin"] },
  { to: "/laporan", label: "Laporan Keuangan", icon: FileBarChart, roles: ["admin"] },
  { to: "/pengaturan", label: "Pengaturan", icon: Settings, roles: ["admin"] },
];

export function navItemsFor(role: Role): readonly NavItem[] {
  return navItems.filter((item) => item.roles.includes(role));
}
