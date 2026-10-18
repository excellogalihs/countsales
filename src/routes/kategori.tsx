import { createFileRoute } from "@tanstack/react-router";
import { Tags } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/PageScaffold";

export const Route = createFileRoute("/kategori")({
  head: () => ({
    meta: [
      { title: "Kategori — Count Sales" },
      { name: "description", content: "Kelompokkan produk berdasarkan jenisnya." },
      { property: "og:title", content: "Kategori — Count Sales" },
      { property: "og:description", content: "Kelompokkan produk berdasarkan jenisnya." },
    ],
  }),
  component: KategoriPage,
});

function KategoriPage() {
  return (
    <div>
      <PageHeader title="Kategori" description="Kelompokkan produk berdasarkan jenisnya." />
      <EmptyState icon={Tags} title="Belum ada kategori" description="Kategori produk akan tampil di sini." />
    </div>
  );
}
