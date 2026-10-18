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
} from "lucide-react";

export const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/produk", label: "Produk", icon: Package },
  { to: "/kategori", label: "Kategori", icon: Tags },
  { to: "/kasir", label: "Kasir", icon: Calculator },
  { to: "/penjualan", label: "Riwayat Penjualan", icon: ShoppingCart },
  { to: "/pembelian", label: "Pembelian Stok", icon: PackagePlus },
  { to: "/supplier", label: "Supplier", icon: Truck },
  { to: "/pengeluaran", label: "Pengeluaran", icon: Wallet },
  { to: "/laporan", label: "Laporan Keuangan", icon: FileBarChart },
  { to: "/pengaturan", label: "Pengaturan", icon: Settings },
] as const;
