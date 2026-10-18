import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Package, Pencil, Trash2, Plus, Search, AlertTriangle } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, EmptyState } from "@/components/PageScaffold";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  categoriesQuery, productsQuery, dbErrorMessage, emptyProductForm, isLowStock, toProductRow, validateProduct,
  type Product, type ProductForm,
} from "@/lib/catalog";
import { formatRupiah } from "@/lib/format";

export const Route = createFileRoute("/produk")({
  head: () => ({
    meta: [
      { title: "Produk — Count Sales" },
      { name: "description", content: "Kelola daftar produk toko komputer." },
      { property: "og:title", content: "Produk — Count Sales" },
      { property: "og:description", content: "Kelola daftar produk toko komputer." },
    ],
  }),
  component: ProdukPage,
});

const selectCls = "h-9 w-full rounded-md border border-input bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

function ProdukPage() {
  const qc = useQueryClient();
  const prods = useQuery(productsQuery);
  const cats = useQuery(categoriesQuery);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [lowOnly, setLowOnly] = useState(false);
  const [editing, setEditing] = useState<Product | "new" | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyProductForm);
  const [errors, setErrors] = useState<Partial<Record<keyof ProductForm, string>>>({});
  const [toDelete, setToDelete] = useState<Product | null>(null);

  const catName = (id: string | null) => cats.data?.find((c) => c.id === id)?.name ?? "—";

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (prods.data ?? []).filter((p) => {
      if (cat && p.category_id !== cat) return false;
      if (lowOnly && !isLowStock(p)) return false;
      if (!s) return true;
      return [p.name, p.sku, p.barcode, p.brand].some((v) => v?.toLowerCase().includes(s));
    });
  }, [prods.data, q, cat, lowOnly]);

  const lowCount = (prods.data ?? []).filter(isLowStock).length;

  const save = useMutation({
    mutationFn: async () => {
      const row = toProductRow(form);
      const res = editing === "new"
        ? await supabase.from("products").insert(row)
        : await supabase.from("products").update(row).eq("id", (editing as Product).id);
      if (res.error) throw new Error(dbErrorMessage(res.error));
    },
    onSuccess: () => {
      toast.success("Produk disimpan");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (e: Error) => {
      if (e.message.includes("SKU")) setErrors({ sku: e.message });
      toast.error(e.message);
    },
  });

  const del = useMutation({
    mutationFn: async (p: Product) => {
      const { error } = await supabase.from("products").delete().eq("id", p.id);
      if (error) throw new Error(dbErrorMessage(error));
    },
    onSuccess: () => { toast.success("Produk dihapus"); qc.invalidateQueries({ queryKey: ["products"] }); },
    onError: (e: Error) => toast.error(e.message),
    onSettled: () => setToDelete(null),
  });

  const open = (p: Product | "new") => {
    setErrors({});
    setEditing(p);
    setForm(p === "new" ? emptyProductForm : {
      name: p.name, sku: p.sku, barcode: p.barcode ?? "", brand: p.brand ?? "", model: p.model ?? "",
      category_id: p.category_id ?? "", cost_price: String(p.cost_price), sell_price: String(p.sell_price),
      stock: String(p.stock), min_stock: String(p.min_stock), unit: p.unit,
    });
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validateProduct(form);
    setErrors(errs);
    if (Object.keys(errs).length === 0) save.mutate();
  };

  const field = (k: keyof ProductForm, label: string, props: React.ComponentProps<typeof Input> = {}) => (
    <div className="space-y-1">
      <Label htmlFor={`f-${k}`}>{label}</Label>
      <Input id={`f-${k}`} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} {...props} />
      {errors[k] && <p className="text-xs text-destructive">{errors[k]}</p>}
    </div>
  );

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader title="Produk" description="Kelola daftar produk toko komputer." />
        <Button onClick={() => open("new")}><Plus className="h-4 w-4" /> Tambah Produk</Button>
      </div>

      <div className="mb-4 grid gap-3 md:grid-cols-[1fr_220px_auto]">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9 bg-card" placeholder="Cari nama, SKU, barcode, atau merek…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className={selectCls} value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Filter kategori">
          <option value="">Semua kategori</option>
          {cats.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <Button variant={lowOnly ? "default" : "outline"} onClick={() => setLowOnly(!lowOnly)}>
          <AlertTriangle className="h-4 w-4" /> Stok menipis ({lowCount})
        </Button>
      </div>

      {prods.isLoading ? (
        <p className="text-sm text-muted-foreground">Memuat…</p>
      ) : prods.error ? (
        <p className="text-sm text-destructive">Gagal memuat produk.</p>
      ) : !prods.data?.length ? (
        <EmptyState icon={Package} title="Belum ada produk" description="Klik “Tambah Produk” untuk menambahkan produk pertama." />
      ) : !filtered.length ? (
        <EmptyState icon={Search} title="Tidak ada hasil" description="Tidak ada produk yang cocok dengan pencarian atau filter." />
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-muted/60 text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Produk</th>
                <th className="px-4 py-3 font-medium">SKU</th>
                <th className="px-4 py-3 font-medium">Kategori</th>
                <th className="px-4 py-3 text-right font-medium">Harga Modal</th>
                <th className="px-4 py-3 text-right font-medium">Harga Jual</th>
                <th className="px-4 py-3 text-right font-medium">Stok</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="px-4 py-3">
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-muted-foreground">{[p.brand, p.model].filter(Boolean).join(" · ") || "—"}{p.barcode ? ` · ${p.barcode}` : ""}</div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{p.sku}</td>
                  <td className="px-4 py-3">{catName(p.category_id)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatRupiah(Number(p.cost_price))}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatRupiah(Number(p.sell_price))}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {p.stock} {p.unit}
                    {isLowStock(p) && <Badge variant="destructive" className="ml-2">Menipis</Badge>}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <Button variant="ghost" size="icon" aria-label="Edit" onClick={() => open(p)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" aria-label="Hapus" onClick={() => setToDelete(p)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader><DialogTitle>{editing === "new" ? "Tambah Produk" : "Edit Produk"}</DialogTitle></DialogHeader>
          <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">{field("name", "Nama produk *", { maxLength: 150 })}</div>
            {field("sku", "SKU / Kode *", { maxLength: 50 })}
            {field("barcode", "Barcode (opsional)", { maxLength: 50 })}
            {field("brand", "Merek", { maxLength: 60 })}
            {field("model", "Model", { maxLength: 80 })}
            <div className="space-y-1">
              <Label htmlFor="f-cat">Kategori</Label>
              <select id="f-cat" className={selectCls} value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
                <option value="">Tanpa kategori</option>
                {cats.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            {field("unit", "Satuan *", { maxLength: 20, placeholder: "pcs, unit, box…" })}
            {field("cost_price", "Harga modal (Rp) *", { type: "number", min: 0, step: "any" })}
            {field("sell_price", "Harga jual (Rp) *", { type: "number", min: 0, step: "any" })}
            {field("stock", "Stok *", { type: "number", min: 0, step: 1 })}
            {field("min_stock", "Batas stok menipis *", { type: "number", min: 0, step: 1 })}
            <DialogFooter className="sm:col-span-2">
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>Batal</Button>
              <Button type="submit" disabled={save.isPending}>Simpan</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus produk "{toDelete?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>Tindakan ini tidak dapat dibatalkan.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); if (toDelete) del.mutate(toDelete); }}>Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
