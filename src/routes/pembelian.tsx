import { createFileRoute } from "@tanstack/react-router";
import { PackagePlus } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/PageScaffold";

export const Route = createFileRoute("/pembelian")({
  head: () => ({
    meta: [
      { title: "Pembelian Stok — Count Sales" },
      { name: "description", content: "Catat pembelian stok dari supplier." },
      { property: "og:title", content: "Pembelian Stok — Count Sales" },
      { property: "og:description", content: "Catat pembelian stok dari supplier." },
    ],
  }),
  component: PembelianPage,
});

function PembelianPage() {
  return (
    <div>
      <PageHeader title="Pembelian Stok" description="Catat pembelian stok dari supplier." />
      <EmptyState icon={PackagePlus} title="Belum ada pembelian stok" description="Riwayat pembelian stok akan tampil di sini." />
    </div>
  );
}
