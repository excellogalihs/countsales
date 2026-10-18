import { createFileRoute } from "@tanstack/react-router";
import { Truck } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/PageScaffold";

export const Route = createFileRoute("/supplier")({
  head: () => ({
    meta: [
      { title: "Supplier — Count Sales" },
      { name: "description", content: "Kelola data pemasok barang." },
      { property: "og:title", content: "Supplier — Count Sales" },
      { property: "og:description", content: "Kelola data pemasok barang." },
    ],
  }),
  component: SupplierPage,
});

function SupplierPage() {
  return (
    <div>
      <PageHeader title="Supplier" description="Kelola data pemasok barang." />
      <EmptyState icon={Truck} title="Belum ada supplier" description="Data supplier akan tampil di sini." />
    </div>
  );
}
