import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ShoppingCart, Search, Eye, Printer, Plus } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, EmptyState } from "@/components/PageScaffold";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { dayEnd, dayStart, formatWaktu, paymentLabels, saleDetailQuery, type PaymentMethod } from "@/lib/sales";
import { formatRupiah } from "@/lib/format";

export const Route = createFileRoute("/penjualan")({
  head: () => ({
    meta: [
      { title: "Riwayat Penjualan — Count Sales" },
      { name: "description", content: "Riwayat dan detail transaksi penjualan." },
      { property: "og:title", content: "Riwayat Penjualan — Count Sales" },
      { property: "og:description", content: "Riwayat dan detail transaksi penjualan." },
    ],
  }),
  component: PenjualanPage,
});

function PenjualanPage() {
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [detailId, setDetailId] = useState<string | null>(null);

  const sales = useQuery({
    queryKey: ["sales", q.trim(), from, to],
    queryFn: async () => {
      let query = supabase.from("sales").select("*, sale_items(qty)").order("created_at", { ascending: false }).limit(200);
      if (q.trim()) query = query.ilike("number", `%${q.trim()}%`);
      if (from) query = query.gte("created_at", dayStart(from));
      if (to) query = query.lte("created_at", dayEnd(to));
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
  const detail = useQuery({ ...saleDetailQuery(detailId ?? ""), enabled: !!detailId });
  const filtering = !!(q.trim() || from || to);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader title="Riwayat Penjualan" description="Daftar transaksi yang tersimpan." />
        <Button asChild><Link to="/kasir"><Plus className="h-4 w-4" /> Transaksi Baru</Link></Button>
      </div>

      <div className="mb-4 grid gap-3 md:grid-cols-[1fr_180px_180px_auto] md:items-end">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="bg-card pl-9" placeholder="Cari nomor transaksi…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div><Label htmlFor="from" className="mb-1 block text-xs">Dari tanggal</Label><Input id="from" type="date" className="bg-card" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
        <div><Label htmlFor="to" className="mb-1 block text-xs">Sampai tanggal</Label><Input id="to" type="date" className="bg-card" value={to} onChange={(e) => setTo(e.target.value)} /></div>
        {filtering && <Button variant="ghost" onClick={() => { setQ(""); setFrom(""); setTo(""); }}>Reset</Button>}
      </div>

      {sales.isLoading ? <p className="text-sm text-muted-foreground">Memuat…</p>
        : sales.error ? <p className="text-sm text-destructive">Gagal memuat transaksi.</p>
        : !sales.data?.length ? (
          <EmptyState icon={ShoppingCart} title={filtering ? "Tidak ada transaksi yang cocok" : "Belum ada transaksi penjualan"}
            description={filtering ? "Ubah pencarian atau rentang tanggal." : "Transaksi dari halaman Kasir akan tampil di sini."} />
        ) : (
          <div className="overflow-x-auto rounded-lg border bg-card">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-muted/60 text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">No. Transaksi</th>
                  <th className="px-4 py-3 font-medium">Waktu</th>
                  <th className="px-4 py-3 text-right font-medium">Item</th>
                  <th className="px-4 py-3 font-medium">Pembayaran</th>
                  <th className="px-4 py-3 text-right font-medium">Total</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {sales.data.map((s) => (
                  <tr key={s.id} className="border-t">
                    <td className="px-4 py-3 font-mono text-xs">{s.number}</td>
                    <td className="px-4 py-3">{formatWaktu(s.created_at)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{s.sale_items.reduce((n, i) => n + i.qty, 0)}</td>
                    <td className="px-4 py-3">{paymentLabels[s.payment_method as PaymentMethod]}</td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums">{formatRupiah(Number(s.total))}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <Button variant="ghost" size="icon" aria-label="Detail" onClick={() => setDetailId(s.id)}><Eye className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" aria-label="Struk" asChild><Link to="/struk/$id" params={{ id: s.id }}><Printer className="h-4 w-4" /></Link></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      <Dialog open={!!detailId} onOpenChange={(o) => !o && setDetailId(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader><DialogTitle>Detail Transaksi</DialogTitle></DialogHeader>
          {detail.isLoading || !detail.data ? <p className="text-sm text-muted-foreground">Memuat…</p> : (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-1 text-muted-foreground">
                <span>No. transaksi</span><span className="text-right font-mono text-foreground">{detail.data.number}</span>
                <span>Waktu</span><span className="text-right text-foreground">{formatWaktu(detail.data.created_at)}</span>
                <span>Metode</span><span className="text-right text-foreground">{paymentLabels[detail.data.payment_method as PaymentMethod]}</span>
              </div>
              <table className="w-full">
                <thead className="text-left text-muted-foreground"><tr><th className="py-1 font-medium">Produk</th><th className="py-1 text-right font-medium">Qty</th><th className="py-1 text-right font-medium">Harga</th><th className="py-1 text-right font-medium">Jumlah</th></tr></thead>
                <tbody>
                  {detail.data.sale_items.map((i) => (
                    <tr key={i.id} className="border-t">
                      <td className="py-2">{i.product_name}<div className="font-mono text-xs text-muted-foreground">{i.sku}</div></td>
                      <td className="py-2 text-right">{i.qty} {i.unit}</td>
                      <td className="py-2 text-right tabular-nums">{formatRupiah(Number(i.price))}</td>
                      <td className="py-2 text-right tabular-nums">{formatRupiah(Number(i.line_total))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="space-y-1 border-t pt-2">
                <Sum k="Subtotal" v={Number(detail.data.subtotal)} />
                <Sum k="Diskon" v={-Number(detail.data.discount)} />
                <Sum k="Total" v={Number(detail.data.total)} bold />
                <Sum k="Uang diterima" v={Number(detail.data.paid)} />
                <Sum k="Kembalian" v={Number(detail.data.change)} />
              </div>
            </div>
          )}
          <DialogFooter>
            {detailId && <Button asChild><Link to="/struk/$id" params={{ id: detailId }}><Printer className="h-4 w-4" /> Cetak struk</Link></Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Sum({ k, v, bold }: { k: string; v: number; bold?: boolean }) {
  return <div className={"flex justify-between" + (bold ? " font-bold" : "")}><span>{k}</span><span className="tabular-nums">{formatRupiah(v)}</span></div>;
}
