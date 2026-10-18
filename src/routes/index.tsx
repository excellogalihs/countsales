import { createFileRoute } from "@tanstack/react-router";
import { LayoutDashboard } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/PageScaffold";
import { formatTanggal } from "@/lib/format";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Count Sales" },
      { name: "description", content: "Sistem penjualan dan laporan keuangan untuk toko komputer." },
      { property: "og:title", content: "Count Sales — Penjualan Toko Komputer" },
      { property: "og:description", content: "Sistem penjualan dan laporan keuangan untuk toko komputer." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  return (
    <div>
      <PageHeader title="Dashboard" description={`Ringkasan toko hari ini · ${formatTanggal(new Date())}`} />
      <EmptyState
        icon={LayoutDashboard}
        title="Belum ada data"
        description="Ringkasan penjualan, stok, dan keuangan akan muncul setelah Anda menambahkan produk dan mencatat transaksi."
      />
    </div>
  );
}
