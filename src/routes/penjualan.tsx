import { createFileRoute } from "@tanstack/react-router";
import { ShoppingCart } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/PageScaffold";

export const Route = createFileRoute("/penjualan")({
  head: () => ({
    meta: [
      { title: "Penjualan — Count Sales" },
      { name: "description", content: "Catat dan pantau transaksi penjualan." },
      { property: "og:title", content: "Penjualan — Count Sales" },
      { property: "og:description", content: "Catat dan pantau transaksi penjualan." },
    ],
  }),
  component: PenjualanPage,
});

function PenjualanPage() {
  return (
    <div>
      <PageHeader title="Penjualan" description="Catat dan pantau transaksi penjualan." />
      <EmptyState icon={ShoppingCart} title="Belum ada transaksi penjualan" description="Transaksi penjualan akan tampil di sini setelah dicatat." />
    </div>
  );
}
