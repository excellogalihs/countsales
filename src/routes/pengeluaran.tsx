import { createFileRoute } from "@tanstack/react-router";
import { Wallet } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/PageScaffold";

export const Route = createFileRoute("/pengeluaran")({
  head: () => ({
    meta: [
      { title: "Pengeluaran — Count Sales" },
      { name: "description", content: "Catat biaya operasional toko." },
      { property: "og:title", content: "Pengeluaran — Count Sales" },
      { property: "og:description", content: "Catat biaya operasional toko." },
    ],
  }),
  component: PengeluaranPage,
});

function PengeluaranPage() {
  return (
    <div>
      <PageHeader title="Pengeluaran" description="Catat biaya operasional toko." />
      <EmptyState icon={Wallet} title="Belum ada pengeluaran" description="Pengeluaran operasional akan tampil di sini." />
    </div>
  );
}
