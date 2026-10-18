import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Printer, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { saleDetailQuery, formatWaktu, paymentLabels, type PaymentMethod } from "@/lib/sales";
import { formatRupiah } from "@/lib/format";

export const Route = createFileRoute("/struk/$id")({
  head: () => ({
    meta: [
      { title: "Struk Penjualan — Count Sales" },
      { name: "description", content: "Struk transaksi penjualan." },
      { property: "og:title", content: "Struk Penjualan — Count Sales" },
      { property: "og:description", content: "Struk transaksi penjualan." },
    ],
  }),
  component: StrukPage,
});

function StrukPage() {
  const { id } = Route.useParams();
  const { data: s, isLoading, error } = useQuery(saleDetailQuery(id));
  if (isLoading) return <p className="text-sm text-muted-foreground">Memuat struk…</p>;
  if (error || !s) return <p className="text-sm text-destructive">Transaksi tidak ditemukan.</p>;

  return (
    <div>
      <div className="mb-4 flex gap-2 print:hidden">
        <Button variant="outline" asChild><Link to="/penjualan"><ArrowLeft className="h-4 w-4" /> Riwayat</Link></Button>
        <Button onClick={() => window.print()}><Printer className="h-4 w-4" /> Cetak</Button>
      </div>
      <div className="mx-auto w-full max-w-[320px] bg-card p-4 font-mono text-xs text-card-foreground shadow print:max-w-none print:p-0 print:shadow-none">
        <div className="text-center">
          <div className="text-sm font-bold">COUNT SALES</div>
          <div>Toko Komputer</div>
        </div>
        <div className="my-2 border-t border-dashed" />
        <div>No : {s.number}</div>
        <div>Tgl: {formatWaktu(s.created_at)}</div>
        <div className="my-2 border-t border-dashed" />
        {s.sale_items.map((i) => (
          <div key={i.id} className="mb-1">
            <div>{i.product_name}</div>
            <div className="flex justify-between"><span>{i.qty} x {formatRupiah(Number(i.price))}</span><span>{formatRupiah(Number(i.line_total))}</span></div>
          </div>
        ))}
        <div className="my-2 border-t border-dashed" />
        <L k="Subtotal" v={formatRupiah(Number(s.subtotal))} />
        {Number(s.discount) > 0 && <L k="Diskon" v={"-" + formatRupiah(Number(s.discount))} />}
        <L k="TOTAL" v={formatRupiah(Number(s.total))} bold />
        <L k={paymentLabels[s.payment_method as PaymentMethod]} v={formatRupiah(Number(s.paid))} />
        <L k="Kembalian" v={formatRupiah(Number(s.change))} />
        <div className="my-2 border-t border-dashed" />
        <div className="text-center">Terima kasih atas kunjungan Anda</div>
      </div>
    </div>
  );
}

function L({ k, v, bold }: { k: string; v: string; bold?: boolean }) {
  return <div className={"flex justify-between" + (bold ? " font-bold" : "")}><span>{k}</span><span>{v}</span></div>;
}
