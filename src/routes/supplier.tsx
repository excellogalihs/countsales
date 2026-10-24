import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Truck, Pencil, Trash2, Plus, Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { PageHeader, EmptyState } from "@/components/PageScaffold";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/components/AuthProvider";
import { canDeleteInventory } from "@/lib/access";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Supplier = Tables<"suppliers">;
type Form = { name: string; contact: string; address: string; notes: string };
const empty: Form = { name: "", contact: "", address: "", notes: "" };

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
  const { profile } = useAuth();
  const allowDelete = profile ? canDeleteInventory(profile.role) : false;
  const qc = useQueryClient();
  const sups = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("suppliers").select("*, purchases(count)").order("name");
      if (error) throw error;
      return data;
    },
  });
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Supplier | "new" | null>(null);
  const [form, setForm] = useState<Form>(empty);
  const [toDelete, setToDelete] = useState<(Supplier & { used: number }) | null>(null);

  const used = (s: { purchases: { count: number }[] }) => s.purchases[0]?.count ?? 0;
  const list = (sups.data ?? []).filter((s) =>
    [s.name, s.contact, s.address].some((v) => v?.toLowerCase().includes(q.trim().toLowerCase())));

  const save = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error("Nama supplier wajib diisi");
      const row = {
        name: form.name.trim(),
        contact: form.contact.trim() || null,
        address: form.address.trim() || null,
        notes: form.notes.trim() || null,
      };
      const res = editing === "new"
        ? await supabase.from("suppliers").insert(row)
        : await supabase.from("suppliers").update(row).eq("id", (editing as Supplier).id);
      if (res.error) throw new Error("Gagal menyimpan: " + res.error.message);
    },
    onSuccess: () => { toast.success("Supplier disimpan"); setEditing(null); qc.invalidateQueries({ queryKey: ["suppliers"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (s: Supplier) => {
      const { error } = await supabase.from("suppliers").delete().eq("id", s.id);
      if (error) throw new Error(error.code === "23503" ? "Supplier masih memiliki riwayat pembelian" : error.message);
    },
    onSuccess: () => { toast.success("Supplier dihapus"); qc.invalidateQueries({ queryKey: ["suppliers"] }); },
    onError: (e: Error) => toast.error(e.message),
    onSettled: () => setToDelete(null),
  });

  const open = (s: Supplier | "new") => {
    setEditing(s);
    setForm(s === "new" ? empty : { name: s.name, contact: s.contact ?? "", address: s.address ?? "", notes: s.notes ?? "" });
  };

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader title="Supplier" description="Kelola data pemasok barang." />
        <Button onClick={() => open("new")}><Plus className="h-4 w-4" /> Tambah Supplier</Button>
      </div>
      <div className="relative mb-4 max-w-md">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input className="bg-card pl-9" placeholder="Cari nama, kontak, atau alamat…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {sups.isLoading ? <p className="text-sm text-muted-foreground">Memuat…</p>
        : sups.error ? <p className="text-sm text-destructive">Gagal memuat supplier.</p>
        : !sups.data?.length ? <EmptyState icon={Truck} title="Belum ada supplier" description="Tambahkan supplier pertama Anda." />
        : !list.length ? <EmptyState icon={Search} title="Tidak ada hasil" description="Tidak ada supplier yang cocok." />
        : (
          <div className="overflow-x-auto rounded-lg border bg-card">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-muted/60 text-left text-muted-foreground">
                <tr><th className="px-4 py-3 font-medium">Nama</th><th className="px-4 py-3 font-medium">Kontak</th><th className="px-4 py-3 font-medium">Alamat</th><th className="px-4 py-3 font-medium">Catatan</th><th className="px-4 py-3" /></tr>
              </thead>
              <tbody>
                {list.map((s) => (
                  <tr key={s.id} className="border-t align-top">
                    <td className="px-4 py-3 font-medium">{s.name}<div className="text-xs font-normal text-muted-foreground">{used(s)} pembelian</div></td>
                    <td className="px-4 py-3">{s.contact || "—"}</td>
                    <td className="px-4 py-3">{s.address || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{s.notes || "—"}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <Button variant="ghost" size="icon" aria-label="Edit" onClick={() => open(s)}><Pencil className="h-4 w-4" /></Button>
                      {allowDelete && <Button variant="ghost" size="icon" aria-label="Hapus" onClick={() => setToDelete({ ...s, used: used(s) })}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing === "new" ? "Tambah Supplier" : "Edit Supplier"}</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-3">
            <div className="space-y-1"><Label htmlFor="s-name">Nama supplier *</Label><Input id="s-name" maxLength={120} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="space-y-1"><Label htmlFor="s-contact">Kontak (telepon/email)</Label><Input id="s-contact" maxLength={120} value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} /></div>
            <div className="space-y-1"><Label htmlFor="s-address">Alamat</Label><Textarea id="s-address" maxLength={300} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            <div className="space-y-1"><Label htmlFor="s-notes">Catatan</Label><Textarea id="s-notes" maxLength={500} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setEditing(null)}>Batal</Button><Button type="submit" disabled={save.isPending}>Simpan</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus supplier "{toDelete?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              {toDelete && toDelete.used > 0
                ? `Supplier ini memiliki ${toDelete.used} riwayat pembelian sehingga tidak dapat dihapus agar catatan pembelian dan utang tetap utuh.`
                : "Tindakan ini tidak dapat dibatalkan."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            {toDelete && toDelete.used === 0 && <AlertDialogAction onClick={(e) => { e.preventDefault(); del.mutate(toDelete); }}>Hapus</AlertDialogAction>}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
