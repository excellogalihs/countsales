import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Wallet, Pencil, Trash2, Plus, Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { PageHeader, EmptyState } from "@/components/PageScaffold";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { expenseCategories, formatTanggalPendek, todayJakarta, validateExpense, type ExpenseForm } from "@/lib/purchasing";
import { paymentLabels, type PaymentMethod } from "@/lib/sales";
import { formatRupiah } from "@/lib/format";

type Expense = Tables<"expenses">;
const selectCls = "h-9 w-full rounded-md border border-input bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

export const Route = createFileRoute("/pengeluaran")({
  head: () => ({
    meta: [
      { title: "Pengeluaran — Count Sales" },
      { name: "description", content: "Catat biaya operasional toko." },
      { property: "og:title", content: "Pengeluaran — Count Sales" },
      { property: "og:description", content: "Catat biaya operasional toko." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PengeluaranPage,
});

function PengeluaranPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [editing, setEditing] = useState<Expense | "new" | null>(null);
  const [form, setForm] = useState<ExpenseForm>({ expense_date: "", category: "", description: "", amount: "", payment_method: "tunai" });
  const [toDelete, setToDelete] = useState<Expense | null>(null);

  const exps = useQuery({
    queryKey: ["expenses", from, to],
    queryFn: async () => {
      let query = supabase.from("expenses").select("*").order("expense_date", { ascending: false }).order("created_at", { ascending: false });
      if (from) query = query.gte("expense_date", from);
      if (to) query = query.lte("expense_date", to);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
  const s = q.trim().toLowerCase();
  const list = (exps.data ?? []).filter((e) => !s || e.category.toLowerCase().includes(s) || e.description?.toLowerCase().includes(s));
  const total = list.reduce((n, e) => n + Number(e.amount), 0);
  const filtering = !!(s || from || to);

  const save = useMutation({
    mutationFn: async () => {
      const err = validateExpense(form);
      if (err) throw new Error(err);
      const row = {
        expense_date: form.expense_date, category: form.category.trim(),
        description: form.description.trim() || null, amount: Number(form.amount), payment_method: form.payment_method,
      };
      const res = editing === "new"
        ? await supabase.from("expenses").insert(row)
        : await supabase.from("expenses").update(row).eq("id", (editing as Expense).id);
      if (res.error) throw new Error("Gagal menyimpan: " + res.error.message);
    },
    onSuccess: () => { toast.success("Pengeluaran disimpan"); setEditing(null); qc.invalidateQueries({ queryKey: ["expenses"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (x: Expense) => {
      const { error } = await supabase.from("expenses").delete().eq("id", x.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { toast.success("Pengeluaran dihapus"); qc.invalidateQueries({ queryKey: ["expenses"] }); },
    onError: (e: Error) => toast.error(e.message),
    onSettled: () => setToDelete(null),
  });

  const open = (x: Expense | "new") => {
    setEditing(x);
    setForm(x === "new"
      ? { expense_date: todayJakarta(), category: expenseCategories[0] ?? "Lainnya", description: "", amount: "", payment_method: "tunai" }
      : { expense_date: x.expense_date, category: x.category, description: x.description ?? "", amount: String(x.amount), payment_method: x.payment_method });
  };

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader title="Pengeluaran Operasional" description="Biaya operasional toko (listrik, sewa, gaji, dll). Pembelian stok dicatat terpisah di menu Pembelian Stok." />
        <Button onClick={() => open("new")}><Plus className="h-4 w-4" /> Tambah Pengeluaran</Button>
      </div>

      <div className="mb-4 grid gap-3 md:grid-cols-[1fr_180px_180px_auto] md:items-end">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="bg-card pl-9" placeholder="Cari kategori atau deskripsi…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div><Label htmlFor="from" className="mb-1 block text-xs">Dari tanggal</Label><Input id="from" type="date" className="bg-card" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
        <div><Label htmlFor="to" className="mb-1 block text-xs">Sampai tanggal</Label><Input id="to" type="date" className="bg-card" value={to} onChange={(e) => setTo(e.target.value)} /></div>
        {filtering && <Button variant="ghost" onClick={() => { setQ(""); setFrom(""); setTo(""); }}>Reset</Button>}
      </div>

      {exps.isLoading ? <p className="text-sm text-muted-foreground">Memuat…</p>
        : exps.error ? <p className="text-sm text-destructive">Gagal memuat pengeluaran.</p>
        : !list.length ? <EmptyState icon={Wallet} title={filtering ? "Tidak ada pengeluaran yang cocok" : "Belum ada pengeluaran"} description={filtering ? "Ubah pencarian atau rentang tanggal." : "Catat pengeluaran operasional pertama Anda."} />
        : (
          <div className="overflow-x-auto rounded-lg border bg-card">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-muted/60 text-left text-muted-foreground">
                <tr><th className="px-4 py-3 font-medium">Tanggal</th><th className="px-4 py-3 font-medium">Kategori</th><th className="px-4 py-3 font-medium">Deskripsi</th><th className="px-4 py-3 font-medium">Metode</th><th className="px-4 py-3 text-right font-medium">Nominal</th><th className="px-4 py-3" /></tr>
              </thead>
              <tbody>
                {list.map((x) => (
                  <tr key={x.id} className="border-t">
                    <td className="px-4 py-3">{formatTanggalPendek(x.expense_date)}</td>
                    <td className="px-4 py-3 font-medium">{x.category}</td>
                    <td className="px-4 py-3 text-muted-foreground">{x.description || "—"}</td>
                    <td className="px-4 py-3">{paymentLabels[x.payment_method as PaymentMethod]}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatRupiah(Number(x.amount))}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <Button variant="ghost" size="icon" aria-label="Edit" onClick={() => open(x)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" aria-label="Hapus" onClick={() => setToDelete(x)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr className="border-t bg-muted/40 font-semibold"><td className="px-4 py-3" colSpan={4}>Total ({list.length} catatan)</td><td className="px-4 py-3 text-right tabular-nums">{formatRupiah(total)}</td><td /></tr></tfoot>
            </table>
          </div>
        )}

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing === "new" ? "Tambah Pengeluaran" : "Edit Pengeluaran"}</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1"><Label htmlFor="e-date">Tanggal *</Label><Input id="e-date" type="date" value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} /></div>
            <div className="space-y-1"><Label htmlFor="e-cat">Kategori *</Label>
              <select id="e-cat" className={selectCls} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {[...new Set([...expenseCategories, form.category].filter(Boolean))].map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-1 sm:col-span-2"><Label htmlFor="e-desc">Deskripsi</Label><Input id="e-desc" maxLength={200} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div className="space-y-1"><Label htmlFor="e-amount">Nominal (Rp) *</Label><Input id="e-amount" type="number" min={1} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
            <div className="space-y-1"><Label htmlFor="e-method">Metode pembayaran</Label>
              <select id="e-method" className={selectCls} value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })}>
                {(Object.keys(paymentLabels) as PaymentMethod[]).map((m) => <option key={m} value={m}>{paymentLabels[m]}</option>)}
              </select>
            </div>
            <DialogFooter className="sm:col-span-2"><Button type="button" variant="outline" onClick={() => setEditing(null)}>Batal</Button><Button type="submit" disabled={save.isPending}>Simpan</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus pengeluaran ini?</AlertDialogTitle>
            <AlertDialogDescription>
              {toDelete && `${toDelete.category} · ${formatRupiah(Number(toDelete.amount))} · ${formatTanggalPendek(toDelete.expense_date)}. `}Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
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
