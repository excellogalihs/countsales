import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, Minus, Plus, Trash2, ShoppingCart, CheckCircle2 } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageScaffold";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { productsQuery } from "@/lib/catalog";
import { calcTotals, paymentLabels, type CartLine, type PaymentMethod } from "@/lib/sales";
import { formatRupiah } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/kasir")({
  head: () => ({
    meta: [
      { title: "Kasir — Count Sales" },
      { name: "description", content: "Catat penjualan langsung di kasir." },
      { property: "og:title", content: "Kasir — Count Sales" },
      { property: "og:description", content: "Catat penjualan langsung di kasir." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: KasirPage,
});

function KasirPage() {
  const qc = useQueryClient();
  const prods = useQuery(productsQuery);
  const [q, setQ] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [discount, setDiscount] = useState("");
  const [paid, setPaid] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("tunai");
  const [done, setDone] = useState<{ id: string } | null>(null);
  const clientRef = useRef<string>(crypto.randomUUID());

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return (prods.data ?? []).slice(0, 12);
    return (prods.data ?? []).filter((p) => [p.name, p.sku, p.barcode, p.brand].some((v) => v?.toLowerCase().includes(s))).slice(0, 30);
  }, [prods.data, q]);

  const t = calcTotals(cart, Number(discount) || 0, Number(paid) || 0, method);

  const add = (p: NonNullable<typeof prods.data>[number]) => {
    const inCart = cart.find((l) => l.product_id === p.id)?.qty ?? 0;
    if (inCart + 1 > p.stock) {
      toast.error(`Stok ${p.name} tidak cukup (tersisa ${p.stock})`);
      return;
    }
    setCart((c) => inCart
      ? c.map((l) => (l.product_id === p.id ? { ...l, qty: l.qty + 1 } : l))
      : [...c, { product_id: p.id, name: p.name, sku: p.sku, unit: p.unit, price: Number(p.sell_price), stock: p.stock, qty: 1 }]);
  };

  const setQty = (id: string, qty: number) =>
    setCart((c) => c.map((l) => (l.product_id === id ? { ...l, qty: Math.max(1, Math.min(l.stock, Math.floor(qty) || 1)) } : l)));

  const checkout = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("create_sale", {
        _client_ref: clientRef.current,
        _items: cart.map((l) => ({ product_id: l.product_id, qty: l.qty })),
        _discount: t.discount,
        _paid: t.received,
        _method: method,
      });
      if (error) throw new Error(error.message);
      return data as string;
    },
    onSuccess: (id) => {
      setDone({ id });
      setCart([]); setDiscount(""); setPaid(""); setMethod("tunai");
      clientRef.current = crypto.randomUUID();
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["sales"] });
    },
    onError: (e: Error) => {
      toast.error(e.message);
      qc.invalidateQueries({ queryKey: ["products"] });
    },
  });

  const canPay = cart.length > 0 && !t.discountTooHigh && !t.insufficient && !checkout.isPending;

  return (
    <div>
      <PageHeader title="Kasir" description="Cari produk, masukkan ke keranjang, lalu simpan transaksi." />
      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <section>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input autoFocus className="bg-card pl-9" placeholder="Cari nama, SKU, barcode, atau merek…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          {prods.isLoading ? <p className="text-sm text-muted-foreground">Memuat…</p> : !prods.data?.length ? (
            <p className="rounded-lg border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">
              Belum ada produk. <Link to="/produk" className="text-primary underline">Tambahkan produk</Link> terlebih dahulu.
            </p>
          ) : !results.length ? <p className="text-sm text-muted-foreground">Produk tidak ditemukan.</p> : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {results.map((p) => (
                <button key={p.id} disabled={p.stock <= 0} onClick={() => add(p)}
                  className="rounded-lg border bg-card p-3 text-left transition hover:border-primary disabled:cursor-not-allowed disabled:opacity-50">
                  <div className="line-clamp-2 text-sm font-medium">{p.name}</div>
                  <div className="mt-1 font-mono text-xs text-muted-foreground">{p.sku}</div>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="font-semibold text-primary">{formatRupiah(Number(p.sell_price))}</span>
                    <span className={cn("text-xs", p.stock <= 0 ? "text-destructive" : "text-muted-foreground")}>
                      {p.stock <= 0 ? "Habis" : `Stok ${p.stock}`}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        <aside className="h-fit rounded-lg border bg-card p-4 xl:sticky xl:top-6">
          <h2 className="mb-3 flex items-center gap-2 font-semibold"><ShoppingCart className="h-4 w-4" /> Keranjang</h2>
          {!cart.length ? <p className="py-6 text-center text-sm text-muted-foreground">Keranjang masih kosong.</p> : (
            <ul className="divide-y">
              {cart.map((l) => (
                <li key={l.product_id} className="py-3">
                  <div className="flex justify-between gap-2 text-sm">
                    <span className="font-medium">{l.name}</span>
                    <button aria-label="Hapus" onClick={() => setCart((c) => c.filter((x) => x.product_id !== l.product_id))}><Trash2 className="h-4 w-4 text-destructive" /></button>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => setQty(l.product_id, l.qty - 1)}><Minus className="h-3 w-3" /></Button>
                      <Input className="h-8 w-14 text-center" type="number" min={1} max={l.stock} value={l.qty} onChange={(e) => setQty(l.product_id, Number(e.target.value))} />
                      <Button size="icon" variant="outline" className="h-8 w-8" disabled={l.qty >= l.stock} onClick={() => setQty(l.product_id, l.qty + 1)}><Plus className="h-3 w-3" /></Button>
                    </div>
                    <span className="text-sm tabular-nums">{formatRupiah(l.price * l.qty)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-4 space-y-3 border-t pt-4 text-sm">
            <Row label="Subtotal" value={formatRupiah(t.subtotal)} />
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="disc">Diskon (Rp)</Label>
              <Input id="disc" type="number" min={0} className="h-8 w-40 text-right" value={discount} onChange={(e) => setDiscount(e.target.value)} />
            </div>
            {t.discountTooHigh && <p className="text-xs text-destructive">Diskon melebihi subtotal.</p>}
            <Row label="Total" value={formatRupiah(t.total)} strong />
            <div>
              <Label className="mb-1 block">Metode pembayaran</Label>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(paymentLabels) as PaymentMethod[]).map((m) => (
                  <Button key={m} type="button" size="sm" variant={method === m ? "default" : "outline"} onClick={() => setMethod(m)}>{paymentLabels[m]}</Button>
                ))}
              </div>
            </div>
            {method === "tunai" ? (
              <>
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="paid">Uang diterima</Label>
                  <Input id="paid" type="number" min={0} className="h-8 w-40 text-right" value={paid} onChange={(e) => setPaid(e.target.value)} />
                </div>
                {cart.length > 0 && t.insufficient && <p className="text-xs text-destructive">Uang diterima kurang dari total.</p>}
                <Row label="Kembalian" value={formatRupiah(t.change)} />
              </>
            ) : <p className="text-xs text-muted-foreground">Pastikan pembayaran {paymentLabels[method]} sudah diterima sebelum menyimpan.</p>}
            <Button className="w-full" size="lg" disabled={!canPay} onClick={() => checkout.mutate()}>
              {checkout.isPending ? "Menyimpan…" : "Simpan Transaksi"}
            </Button>
          </div>
        </aside>
      </div>

      <Dialog open={!!done} onOpenChange={(o) => !o && setDone(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-primary" /> Transaksi berhasil disimpan</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Stok produk sudah diperbarui.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDone(null)}>Transaksi baru</Button>
            {done && <Button asChild><Link to="/struk/$id" params={{ id: done.id }}>Cetak struk</Link></Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={cn("flex justify-between", strong && "text-base font-bold")}>
      <span>{label}</span><span className="tabular-nums">{value}</span>
    </div>
  );
}
