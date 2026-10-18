import { createFileRoute } from "@tanstack/react-router";
import { FileBarChart } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/PageScaffold";

export const Route = createFileRoute("/laporan")({
  head: () => ({
    meta: [
      { title: "Laporan Keuangan — Count Sales" },
      { name: "description", content: "Ringkasan pendapatan, modal, pengeluaran, dan laba." },
      { property: "og:title", content: "Laporan Keuangan — Count Sales" },
      { property: "og:description", content: "Ringkasan pendapatan, modal, pengeluaran, dan laba." },
    ],
  }),
  component: LaporanPage,
});

function LaporanPage() {
  return (
    <div>
      <PageHeader title="Laporan Keuangan" description="Ringkasan pendapatan, modal, pengeluaran, dan laba." />
      <EmptyState icon={FileBarChart} title="Belum ada data untuk dilaporkan" description="Laporan akan dihitung otomatis dari data penjualan, pembelian, dan pengeluaran." />
    </div>
  );
}
