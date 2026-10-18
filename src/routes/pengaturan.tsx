import { createFileRoute } from "@tanstack/react-router";
import { Settings } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/PageScaffold";

export const Route = createFileRoute("/pengaturan")({
  head: () => ({
    meta: [
      { title: "Pengaturan — Count Sales" },
      { name: "description", content: "Atur informasi toko dan preferensi aplikasi." },
      { property: "og:title", content: "Pengaturan — Count Sales" },
      { property: "og:description", content: "Atur informasi toko dan preferensi aplikasi." },
    ],
  }),
  component: PengaturanPage,
});

function PengaturanPage() {
  return (
    <div>
      <PageHeader title="Pengaturan" description="Atur informasi toko dan preferensi aplikasi." />
      <EmptyState icon={Settings} title="Pengaturan belum tersedia" description="Pengaturan toko akan dikembangkan pada tahap berikutnya." />
    </div>
  );
}
