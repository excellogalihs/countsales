import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PackagePlus, Plus, Trash2, Eye, Search, PackageCheck } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, EmptyState } from "@/components/PageScaffold";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { productsQuery } from "@/lib/catalog";
import {
  formatTanggalPendek, purchaseStatusLabels, purchaseTotal, todayJakarta, validatePurchase, type PurchaseLine,
} from "@/lib/purchasing";
import { paymentLabels, type PaymentMethod } from "@/lib/sales";
import { formatRupiah } from "@/lib/format";

const selectCls = "h-9 w-full rounded-md border border-input bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

export const Route = createFileRoute("/pembelian")({
  head: () => ({
    meta: [
      { title: "Pembelian Stok — Count Sales" },
      { name: "description", content: "Catat pembelian stok, penerimaan barang, dan utang supplier." },
      { property: "og:title", content: "Pembelian Stok — Count Sales" },
      { property: "og:description", content: "Catat pembelian stok, penerimaan barang, dan utang supplier." },
    ],
  }),
  component: PembelianPage,
});

const statusVariant = (s: string) => (s === "lunas" ? "default" : s === "sebagian" ? "secondary" : "destructive") as "default" | "secondary" | "destructive";

function PembelianPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [creating, setCreating] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const purchases = useQuery({
    queryKey: ["purchases"],
    queryFn: async () => {
      const { data, error } = await supabase.from("purchases").select("*, suppliers(name)").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const s = q.trim().toLowerCase();
  const list = (purchases.data ?? []).filter((p) =>
    (!status || p.status === status) && (!s || p.number.toLowerCase().includes(s) || p.suppliers?.name.toLowerCase().includes(s)));
  const totalDebt = (purchases.data ?? []).reduce((n, p) => n + Number(p.remaining ?? 0), 0);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader title="Pembelian Stok" description="Pembelian barang dari supplier. Stok bertambah hanya setelah barang diterima." />
        <Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> Catat Pembelian</Button>
      </div>

      {totalDebt > 0 && (
        <div className="mb-4 rounded-lg border bg-card px-4 py-3 text-sm">Total sisa utang ke supplier: <span className="font-semibold text-destructive">{formatRupiah(totalDebt)}</span></div>
      )}

      <div className="mb-4 grid gap-3 md:grid-cols-[1fr_220px]">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="bg-card pl-9" placeholder="Cari nomor pembelian atau supplier…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className={selectCls} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter status">
          <option value="">Semua status</option>
          {Object.entries(purchaseStatusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {purchases.isLoading ? <p className="text-sm text-muted-foreground">Memuat…</p>
        : purchases.error ? <p className="text-sm text-destructive">Gagal memuat pembelian.</p>
        : !list.length ? <EmptyState icon={PackagePlus} title={purchases.data?.length ? "Tidak ada hasil" : "Belum ada pembelian stok"} description={purchases.data?.length ? "Ubah pencarian atau filter." : "Catat pembelian barang dari supplier di sini."} />
        : (
          <div className="overflow-x-auto rounded-lg border bg-card">
            <table className="w-full min-w-[860px] text-sm">
              <thead className="bg-muted/60 text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">No. Pembelian</th><th className="px-4 py-3 font-medium">Tanggal</th><th className="px-4 py-3 font-medium">Supplier</th>
                  <th className="px-4 py-3 text-right font-medium">Total</th><th className="px-4 py-3 text-right font-medium">Sisa Utang</th>
                  <th className="px-4 py-3 font-medium">Pembayaran</th><th className="px-4 py-3 font-medium">Barang</th><th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {list.map((p) => (
                  <tr key={p.id} className="border-t">
                    <td className="px-4 py-3 font-mono text-xs">{p.number}</td>
                    <td className="px-4 py-3">{formatTanggalPendek(p.purchase_date)}</td>
                    <td className="px-4 py-3">{p.suppliers?.name}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatRupiah(Number(p.total))}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatRupiah(Number(p.remaining))}</td>
                    <td className="px-4 py-3"><Badge variant={statusVariant(p.status ?? "")}>{purchaseStatusLabels[p.status ?? ""]}</Badge></td>
                    <td className="px-4 py-3">{p.received ? <Badge variant="outline">Diterima</Badge> : <Badge variant="secondary">Belum diterima</Badge>}</td>
                    <td className="px-4 py-3 text-right"><Button variant="ghost" size="icon" aria-label="Detail" onClick={() => setDetailId(p.id)}><Eye className="h-4 w-4" /></Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      {creating && <CreatePurchase onClose={() => setCreating(false)} onCreated={(id) => { setCreating(false); setDetailId(id); qc.invalidateQueries({ queryKey: ["purchases"] }); qc.invalidateQueries({ queryKey: ["products"] }); qc.invalidateQueries({ queryKey: ["suppliers"] }); }} />}
      {detailId && <PurchaseDetail id={detailId} onClose={() => setDetailId(null)} />}
    </div>
  );
}

function CreatePurchase({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const prods = useQuery(productsQuery);
  const sups = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("suppliers").select("*, purchases(count)").order("name");
      if (error) throw error;
      return data;
    },
  });
  const [supplierId, setSupplierId] = useState("");
  const [date, setDate] = useState(todayJakarta());
  const [lines, setLines] = useState<PurchaseLine[]>([{ product_id: "", qty: "1", cost_price: "" }]);
  const [paid, setPaid] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("transfer");
  const [receive, setReceive] = useState(false);
  const [notes, setNotes] = useState("");
  const clientRef = useRef(crypto.randomUUID());
  const total = purchaseTotal(lines);

  const setLine = (i: number, patch: Partial<PurchaseLine>) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  const save = useMutation({
    mutationFn: async () => {
      const err = validatePurchase(supplierId, lines, Number(paid) || 0);
      if (err) throw new Error(err);
      const { data, error } = await supabase.rpc("create_purchase", {
        _client_ref: clientRef.current, _supplier_id: supplierId, _date: date,
        _items: lines.map((l) => ({ product_id: l.product_id, qty: Number(l.qty), cost_price: Number(l.cost_price) })),
        _paid: Number(paid) || 0, _method: method, _receive: receive, _notes: notes,
      });
      if (error) throw new Error(error.message);
      return data as string;
    },
    onSuccess: (id) => { toast.success(receive ? "Pembelian disimpan & stok ditambahkan" : "Pembelian disimpan"); onCreated(id); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader><DialogTitle>Catat Pembelian Stok</DialogTitle></DialogHeader>
        {!sups.data?.length && !sups.isLoading ? (
          <p className="text-sm text-muted-foreground">Belum ada supplier. <Link to="/supplier" className="text-primary underline">Tambahkan supplier</Link> terlebih dahulu.</p>
        ) : !prods.data?.length && !prods.isLoading ? (
          <p className="text-sm text-muted-foreground">Belum ada produk. <Link to="/produk" className="text-primary underline">Tambahkan produk</Link> terlebih dahulu.</p>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1"><Label htmlFor="p-sup">Supplier *</Label>
                <select id="p-sup" className={selectCls} value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                  <option value="">Pilih supplier</option>
                  {sups.data?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="space-y-1"><Label htmlFor="p-date">Tanggal *</Label><Input id="p-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
            </div>

            <div className="space-y-2">
              <Label>Barang</Label>
              {lines.map((l, i) => (
                <div key={i} className="grid grid-cols-[1fr_80px_140px_auto] items-center gap-2">
                  <select aria-label="Produk" className={selectCls} value={l.product_id} onChange={(e) => {
                    const p = prods.data?.find((x) => x.id === e.target.value);
                    setLine(i, { product_id: e.target.value, cost_price: l.cost_price || (p ? String(p.cost_price) : "") });
                  }}>
                    <option value="">Pilih produk</option>
                    {prods.data?.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                  </select>
                  <Input aria-label="Jumlah" type="number" min={1} step={1} value={l.qty} onChange={(e) => setLine(i, { qty: e.target.value })} />
                  <Input aria-label="Harga modal" type="number" min={0} placeholder="Harga modal" value={l.cost_price} onChange={(e) => setLine(i, { cost_price: e.target.value })} />
                  <Button type="button" variant="ghost" size="icon" aria-label="Hapus baris" disabled={lines.length === 1} onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => setLines((ls) => [...ls, { product_id: "", qty: "1", cost_price: "" }])}><Plus className="h-4 w-4" /> Tambah baris</Button>
            </div>

            <div className="flex justify-between border-t pt-3 text-base font-semibold"><span>Total</span><span className="tabular-nums">{formatRupiah(total)}</span></div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1"><Label htmlFor="p-paid">Dibayar sekarang (Rp)</Label><Input id="p-paid" type="number" min={0} placeholder="0" value={paid} onChange={(e) => setPaid(e.target.value)} /></div>
              <div className="space-y-1"><Label htmlFor="p-method">Metode pembayaran</Label>
                <select id="p-method" className={selectCls} value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
                  {(Object.keys(paymentLabels) as PaymentMethod[]).map((m) => <option key={m} value={m}>{paymentLabels[m]}</option>)}
                </select>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">Sisa utang: <span className="font-medium text-foreground">{formatRupiah(Math.max(0, total - (Number(paid) || 0)))}</span></p>
            <div className="space-y-1"><Label htmlFor="p-notes">Catatan</Label><Input id="p-notes" maxLength={300} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={receive} onCheckedChange={(v) => setReceive(v === true)} />
              Barang sudah diterima sekarang (stok langsung ditambahkan)
            </label>
            <DialogFooter><Button type="button" variant="outline" onClick={onClose}>Batal</Button><Button type="submit" disabled={save.isPending}>{save.isPending ? "Menyimpan…" : "Simpan Pembelian"}</Button></DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function PurchaseDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const qc = useQueryClient();
  const detail = useQuery({
    queryKey: ["purchase", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("purchases").select("*, suppliers(name), purchase_items(*), supplier_payments(*)").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("transfer");
  const [payDate, setPayDate] = useState(todayJakarta());
  const payRef = useRef(crypto.randomUUID());

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["purchase", id] });
    qc.invalidateQueries({ queryKey: ["purchases"] });
    qc.invalidateQueries({ queryKey: ["products"] });
  };

  const receive = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("receive_purchase", { _purchase_id: id });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { toast.success("Barang diterima, stok ditambahkan"); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const pay = useMutation({
    mutationFn: async () => {
      const a = Number(amount);
      if (!Number.isFinite(a) || a <= 0) throw new Error("Nominal pembayaran harus lebih dari 0");
      if (detail.data && a > Number(detail.data.remaining)) throw new Error("Pembayaran melebihi sisa utang");
      const { error } = await supabase.rpc("add_supplier_payment", { _client_ref: payRef.current, _purchase_id: id, _amount: a, _method: method, _date: payDate });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { toast.success("Pembayaran dicatat"); setAmount(""); payRef.current = crypto.randomUUID(); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const d = detail.data;
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader><DialogTitle>Detail Pembelian</DialogTitle></DialogHeader>
        {!d ? <p className="text-sm text-muted-foreground">Memuat…</p> : (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-1 text-muted-foreground">
              <span>No. pembelian</span><span className="text-right font-mono text-foreground">{d.number}</span>
              <span>Tanggal</span><span className="text-right text-foreground">{formatTanggalPendek(d.purchase_date)}</span>
              <span>Supplier</span><span className="text-right text-foreground">{d.suppliers?.name}</span>
              <span>Status bayar</span><span className="text-right"><Badge variant={statusVariant(d.status ?? "")}>{purchaseStatusLabels[d.status ?? ""]}</Badge></span>
              {d.notes && <><span>Catatan</span><span className="text-right text-foreground">{d.notes}</span></>}
            </div>

            <table className="w-full">
              <thead className="text-left text-muted-foreground"><tr><th className="py-1 font-medium">Produk</th><th className="py-1 text-right font-medium">Qty</th><th className="py-1 text-right font-medium">Harga Modal</th><th className="py-1 text-right font-medium">Jumlah</th></tr></thead>
              <tbody>
                {d.purchase_items.map((i) => (
                  <tr key={i.id} className="border-t"><td className="py-2">{i.product_name}</td><td className="py-2 text-right">{i.qty}</td><td className="py-2 text-right tabular-nums">{formatRupiah(Number(i.cost_price))}</td><td className="py-2 text-right tabular-nums">{formatRupiah(Number(i.line_total))}</td></tr>
                ))}
              </tbody>
            </table>
            <div className="space-y-1 border-t pt-2">
              <div className="flex justify-between font-semibold"><span>Total</span><span>{formatRupiah(Number(d.total))}</span></div>
              <div className="flex justify-between"><span>Sudah dibayar</span><span>{formatRupiah(Number(d.paid))}</span></div>
              <div className="flex justify-between font-semibold text-destructive"><span>Sisa utang</span><span>{formatRupiah(Number(d.remaining))}</span></div>
            </div>

            <div className="rounded-md border p-3">
              {d.received ? (
                <p className="flex items-center gap-2"><PackageCheck className="h-4 w-4 text-primary" /> Barang diterima{d.received_at ? ` pada ${formatTanggalPendek(d.received_at.slice(0, 10))}` : ""}. Stok sudah ditambahkan.</p>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-muted-foreground">Barang belum diterima. Stok belum bertambah.</span>
                  <Button size="sm" disabled={receive.isPending} onClick={() => receive.mutate()}><PackageCheck className="h-4 w-4" /> Tandai barang diterima</Button>
                </div>
              )}
            </div>

            <div>
              <h3 className="mb-2 font-semibold">Riwayat pembayaran</h3>
              {!d.supplier_payments.length ? <p className="text-muted-foreground">Belum ada pembayaran.</p> : (
                <ul className="divide-y rounded-md border">
                  {[...d.supplier_payments].sort((a, b) => a.created_at.localeCompare(b.created_at)).map((p) => (
                    <li key={p.id} className="flex justify-between px-3 py-2"><span>{formatTanggalPendek(p.paid_at)} · {paymentLabels[p.method as PaymentMethod]}</span><span className="tabular-nums">{formatRupiah(Number(p.amount))}</span></li>
                  ))}
                </ul>
              )}
              {Number(d.remaining) > 0 && (
                <form onSubmit={(e) => { e.preventDefault(); pay.mutate(); }} className="mt-3 grid gap-2 sm:grid-cols-[1fr_140px_150px_auto]">
                  <Input aria-label="Nominal" type="number" min={1} max={Number(d.remaining)} placeholder="Nominal bayar" value={amount} onChange={(e) => setAmount(e.target.value)} />
                  <select aria-label="Metode" className={selectCls} value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
                    {(Object.keys(paymentLabels) as PaymentMethod[]).map((m) => <option key={m} value={m}>{paymentLabels[m]}</option>)}
                  </select>
                  <Input aria-label="Tanggal bayar" type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
                  <Button type="submit" disabled={pay.isPending}>Catat Bayar</Button>
                </form>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
