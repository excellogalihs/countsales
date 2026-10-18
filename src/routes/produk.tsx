import { createFileRoute } from "@tanstack/react-router";
import { Package } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/PageScaffold";

export const Route = createFileRoute("/produk")({
  head: () => ({
    meta: [
      { title: "Produk — Count Sales" },
      { name: "description", content: "Kelola daftar produk toko: monitor, flash drive, printer, tinta, RAM, SSD/HDD, dan aksesori." },
      { property: "og:title", content: "Produk — Count Sales" },
      { property: "og:description", content: "Kelola daftar produk toko: monitor, flash drive, printer, tinta, RAM, SSD/HDD, dan aksesori." },
    ],
  }),
  component: ProdukPage,
});

function ProdukPage() {
  return (
    <div>
      <PageHeader title="Produk" description="Kelola daftar produk toko: monitor, flash drive, printer, tinta, RAM, SSD/HDD, dan aksesori." />
      <EmptyState icon={Package} title="Belum ada produk" description="Produk yang Anda tambahkan akan tampil di sini." />
    </div>
  );
}
