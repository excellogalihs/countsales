import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Download, Printer, AlertTriangle } from "lucide-react";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageScaffold";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatRupiah } from "@/lib/format";
import { dayEnd, dayStart, paymentLabels, type PaymentMethod } from "@/lib/sales";
import { todayJakarta, formatTanggalPendek } from "@/lib/purchasing";
import { buildReport, buildSeries, periodLabels, periodRange, toCsv, type Period } from "@/lib/reports";

export const Route = createFileRoute("/laporan")({
  head: () => ({
    meta: [
      { title: "Laporan Keuangan — Count Sales" },
      { name: "description", content: "Laporan penjualan, laba rugi, arus kas, persediaan, dan utang supplier." },
      { property: "og:title", content: "Laporan Keuangan — Count Sales" },
      { property: "og:description", content: "Laporan penjualan, laba rugi, arus kas, persediaan, dan utang supplier." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LaporanPage,
});

/** Fetch every row (bypasses the 1000-row page limit). */
async function fetchAll<T>(build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>) {
  const out: T[] = [];
  for (let i = 0; ; i += 1000) {
    const { data, error } = await build(i, i + 999);
    if (error) throw error;
    out.push(...(data ?? []));
    if (!data || data.length < 1000) return out;
  }
}

function download(name: string, csv: string) {
  const url = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a"); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

function Row({ label, value, strong, neg }: { label: string; value: number; strong?: boolean; neg?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 py-1.5 text-sm ${strong ? "border-t pt-2 font-semibold" : ""}`}>
      <span className={strong ? "" : "text-muted-foreground"}>{label}</span>
      <span className={`tabular-nums ${value < 0 ? "text-destructive" : ""}`}>{neg && value ? "−" : ""}{formatRupiah(Math.abs(value))}{!neg && value < 0 ? "" : ""}</span>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="break-inside-avoid rounded-lg border bg-card p-4"><h2 className="mb-2 font-semibold">{title}</h2>{children}</section>;
}

function LaporanPage() {
  const [period, setPeriod] = useState<Period>("bulanan");
  const [cFrom, setCFrom] = useState("");
  const [cTo, setCTo] = useState("");
  const today = todayJakarta();
  const { from, to } = periodRange(period, today, cFrom, cTo);

  const data = useQuery({
    queryKey: ["report", from, to],
    queryFn: async () => {
      const [sales, expenses, payments] = await Promise.all([
        fetchAll((a, b) => supabase.from("sales").select("created_at, subtotal, discount, total, payment_method, sale_items(qty, cost_price)").gte("created_at", dayStart(from)).lte("created_at", dayEnd(to)).order("created_at").range(a, b)),
        fetchAll((a, b) => supabase.from("expenses").select("expense_date, amount").gte("expense_date", from).lte("expense_date", to).range(a, b)),
        fetchAll((a, b) => supabase.from("supplier_payments").select("paid_at, amount").gte("paid_at", from).lte("paid_at", to).range(a, b)),
      ]);
      return { sales, expenses, payments };
    },
  });
  const position = useQuery({
    queryKey: ["report-position"],
    queryFn: async () => {
      const [products, purchases] = await Promise.all([
        fetchAll((a, b) => supabase.from("products").select("name, sku, stock, min_stock, cost_price, unit").order("name").range(a, b)),
        fetchAll((a, b) => supabase.from("purchases").select("total, paid, remaining, suppliers(name)").range(a, b)),
      ]);
      return { products, purchases };
    },
  });

  const r = useMemo(() => data.data && buildReport(data.data.sales, data.data.expenses, data.data.payments), [data.data]);
  const series = useMemo(() => data.data ? buildSeries(data.data.sales, data.data.expenses, period === "tahunan") : [], [data.data, period]);
  const inv = useMemo(() => {
    const ps = position.data?.products ?? [];
    return { count: ps.length, units: ps.reduce((s, p) => s + p.stock, 0), value: ps.reduce((s, p) => s + p.stock * Number(p.cost_price), 0), low: ps.filter((p) => p.stock <= p.min_stock) };
  }, [position.data]);
  const ap = useMemo(() => {
    const pu = position.data?.purchases ?? [];
    const bySup = new Map<string, number>();
    for (const p of pu) if (Number(p.remaining) > 0) { const k = p.suppliers?.name ?? "—"; bySup.set(k, (bySup.get(k) ?? 0) + Number(p.remaining)); }
    return { billed: pu.reduce((s, p) => s + Number(p.total), 0), paid: pu.reduce((s, p) => s + Number(p.paid), 0), remaining: pu.reduce((s, p) => s + Number(p.remaining), 0), bySup: [...bySup].sort((a, b) => b[1] - a[1]) };
  }, [position.data]);

  const exportCsv = () => {
    if (!r) return;
    const rows: (string | number)[][] = [
      ["Laporan Count Sales", `${from} s/d ${to}`], [],
      ["PENJUALAN"], ["Jumlah transaksi", r.sales.count], ["Penjualan kotor", r.sales.gross], ["Diskon", r.sales.discount], ["Retur", 0], ["Penjualan bersih", r.sales.net], [],
      ["LABA RUGI"], ["Penjualan bersih", r.pl.net], ["HPP", r.pl.cogs], ["Laba kotor", r.pl.grossProfit], ["Biaya operasional", r.pl.opex], ["Laba bersih", r.pl.netProfit], [],
      ["ARUS KAS"], ["Kas masuk dari pelanggan", r.cash.inflow],
      ...Object.entries(r.cash.byMethod).map(([m, v]) => [`  - ${paymentLabels[m as PaymentMethod] ?? m}`, v]),
      ["Pembayaran supplier", r.cash.supplierPaid], ["Pengeluaran operasional", r.cash.opex], ["Kas keluar", r.cash.outflow], ["Arus kas bersih", r.cash.netCash], [],
      ["PERSEDIAAN (saat ini)"], ["Jumlah produk", inv.count], ["Total unit", inv.units], ["Nilai persediaan (harga modal)", inv.value], [],
      ["Produk stok menipis", "SKU", "Stok", "Minimum"], ...inv.low.map((p) => [p.name, p.sku, p.stock, p.min_stock]), [],
      ["UTANG SUPPLIER (saat ini)"], ["Total tagihan", ap.billed], ["Sudah dibayar", ap.paid], ["Sisa utang", ap.remaining],
      ...ap.bySup.map(([n, v]) => [`  - ${n}`, v]), [],
      ["GRAFIK HARIAN", "Penjualan", "Laba bersih"], ...series.map((s) => [s.label, s.penjualan, s.laba]),
    ];
    download(`laporan-${from}_${to}.csv`, toCsv(rows));
  };

  const loading = data.isLoading || position.isLoading;
  const failed = data.error || position.error;

  return (
    <div className="print:text-black">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader title="Laporan Keuangan" description={`Periode ${formatTanggalPendek(from)} – ${formatTanggalPendek(to)}`} />
        <div className="flex gap-2 print:hidden">
          <Button variant="outline" onClick={exportCsv} disabled={!r}><Download className="h-4 w-4" /> CSV</Button>
          <Button variant="outline" onClick={() => window.print()} disabled={!r}><Printer className="h-4 w-4" /> Cetak / PDF</Button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-2 print:hidden">
        {(Object.keys(periodLabels) as Period[]).map((p) => (
          <Button key={p} size="sm" variant={period === p ? "default" : "outline"} onClick={() => setPeriod(p)}>{periodLabels[p]}</Button>
        ))}
        {period === "khusus" && (
          <>
            <div><Label htmlFor="rf" className="mb-1 block text-xs">Dari</Label><Input id="rf" type="date" className="h-9 bg-card" value={cFrom} onChange={(e) => setCFrom(e.target.value)} /></div>
            <div><Label htmlFor="rt" className="mb-1 block text-xs">Sampai</Label><Input id="rt" type="date" className="h-9 bg-card" value={cTo} onChange={(e) => setCTo(e.target.value)} /></div>
          </>
        )}
      </div>

      {loading ? <p className="text-sm text-muted-foreground">Memuat laporan…</p>
        : failed || !r ? <p className="text-sm text-destructive">Gagal memuat laporan.</p>
        : (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[["Penjualan bersih", r.sales.net], ["Laba bersih", r.pl.netProfit], ["Arus kas bersih", r.cash.netCash], ["Sisa utang supplier", ap.remaining]].map(([l, v]) => (
                <div key={l} className="rounded-lg border bg-card p-4"><div className="text-xs text-muted-foreground">{l}</div><div className={`mt-1 text-xl font-semibold tabular-nums ${Number(v) < 0 ? "text-destructive" : ""}`}>{formatRupiah(Number(v))}</div></div>
              ))}
            </div>

            <Card title="Grafik Penjualan & Laba Bersih">
              {series.length ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={series}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="label" fontSize={11} stroke="var(--muted-foreground)" />
                      <YAxis fontSize={11} stroke="var(--muted-foreground)" tickFormatter={(v) => new Intl.NumberFormat("id-ID", { notation: "compact" }).format(v)} />
                      <Tooltip formatter={(v: number) => formatRupiah(v)} />
                      <Legend />
                      <Bar dataKey="penjualan" name="Penjualan" fill="var(--primary)" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="laba" name="Laba bersih" fill="var(--muted-foreground)" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : <p className="text-sm text-muted-foreground">Belum ada transaksi pada periode ini.</p>}
            </Card>

            <div className="grid gap-4 lg:grid-cols-3">
              <Card title="Penjualan">
                <div className="flex justify-between py-1.5 text-sm"><span className="text-muted-foreground">Jumlah transaksi</span><span className="tabular-nums">{r.sales.count}</span></div>
                <Row label="Penjualan kotor" value={r.sales.gross} />
                <Row label="Diskon" value={r.sales.discount} neg />
                <Row label="Retur" value={0} />
                <Row label="Penjualan bersih" value={r.sales.net} strong />
                <p className="mt-2 text-xs text-muted-foreground">Fitur retur belum tersedia, jadi retur selalu 0.</p>
              </Card>
              <Card title="Laba Rugi">
                <Row label="Penjualan bersih" value={r.pl.net} />
                <Row label="HPP" value={r.pl.cogs} neg />
                <Row label="Laba kotor" value={r.pl.grossProfit} strong />
                <Row label="Biaya operasional" value={r.pl.opex} neg />
                <Row label="Laba bersih" value={r.pl.netProfit} strong />
                <p className="mt-2 text-xs text-muted-foreground">HPP = harga modal produk yang tercatat saat barang terjual × jumlah. Pembelian stok dan pembayaran supplier tidak dihitung sebagai biaya di sini.</p>
              </Card>
              <Card title="Arus Kas">
                <Row label="Kas masuk dari pelanggan" value={r.cash.inflow} />
                {Object.entries(r.cash.byMethod).map(([m, v]) => <div key={m} className="flex justify-between pl-3 text-xs text-muted-foreground"><span>{paymentLabels[m as PaymentMethod] ?? m}</span><span className="tabular-nums">{formatRupiah(v)}</span></div>)}
                <Row label="Pembayaran supplier" value={r.cash.supplierPaid} neg />
                <Row label="Pengeluaran operasional" value={r.cash.opex} neg />
                <Row label="Arus kas bersih" value={r.cash.netCash} strong />
                <p className="mt-2 text-xs text-muted-foreground">Kasir mewajibkan pembayaran penuh, jadi semua penjualan langsung menjadi kas (kembalian tidak dihitung).</p>
              </Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card title="Persediaan (saat ini)">
                <div className="flex justify-between py-1.5 text-sm"><span className="text-muted-foreground">Jumlah produk / total unit</span><span className="tabular-nums">{inv.count} / {inv.units}</span></div>
                <Row label="Nilai persediaan (harga modal)" value={inv.value} strong />
                <h3 className="mt-3 flex items-center gap-1 text-sm font-medium"><AlertTriangle className="h-4 w-4 text-destructive" /> Stok menipis ({inv.low.length})</h3>
                {inv.low.length ? (
                  <ul className="mt-1 max-h-56 divide-y overflow-auto text-sm">
                    {inv.low.map((p) => <li key={p.sku} className="flex justify-between py-1.5"><span>{p.name} <span className="text-xs text-muted-foreground">{p.sku}</span></span><span className="tabular-nums text-destructive">{p.stock} / min {p.min_stock} {p.unit}</span></li>)}
                  </ul>
                ) : <p className="text-sm text-muted-foreground">Tidak ada produk dengan stok menipis.</p>}
              </Card>
              <Card title="Utang Supplier (saat ini)">
                <Row label="Total tagihan pembelian" value={ap.billed} />
                <Row label="Sudah dibayar" value={ap.paid} neg />
                <Row label="Sisa utang" value={ap.remaining} strong />
                {ap.bySup.length > 0 && (
                  <ul className="mt-2 divide-y text-sm">
                    {ap.bySup.map(([n, v]) => <li key={n} className="flex justify-between py-1.5"><span>{n}</span><span className="tabular-nums">{formatRupiah(v)}</span></li>)}
                  </ul>
                )}
              </Card>
            </div>
          </div>
        )}
    </div>
  );
}
