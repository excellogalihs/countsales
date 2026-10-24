import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Tags, Pencil, Trash2, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, EmptyState } from "@/components/PageScaffold";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { categoriesQuery, productsQuery, dbErrorMessage, type Category } from "@/lib/catalog";
import { useAuth } from "@/components/AuthProvider";
import { canDeleteInventory } from "@/lib/access";

export const Route = createFileRoute("/kategori")({
  head: () => ({
    meta: [
      { title: "Kategori — Count Sales" },
      { name: "description", content: "Kelompokkan produk berdasarkan jenisnya." },
      { property: "og:title", content: "Kategori — Count Sales" },
      { property: "og:description", content: "Kelompokkan produk berdasarkan jenisnya." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: KategoriPage,
});

function KategoriPage() {
  const { profile } = useAuth();
  const allowDelete = profile ? canDeleteInventory(profile.role) : false;
  const qc = useQueryClient();
  const cats = useQuery(categoriesQuery);
  const prods = useQuery(productsQuery);
  const [editing, setEditing] = useState<Category | "new" | null>(null);
  const [name, setName] = useState("");
  const [toDelete, setToDelete] = useState<Category | null>(null);

  const usage = (id: string) => (prods.data ?? []).filter((p) => p.category_id === id).length;

  const save = useMutation({
    mutationFn: async () => {
      const n = name.trim();
      if (!n) throw new Error("Nama kategori wajib diisi");
      const res = editing === "new"
        ? await supabase.from("categories").insert({ name: n })
        : await supabase.from("categories").update({ name: n }).eq("id", (editing as Category).id);
      if (res.error) throw new Error(dbErrorMessage(res.error));
    },
    onSuccess: () => {
      toast.success("Kategori disimpan");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (c: Category) => {
      const { error } = await supabase.from("categories").delete().eq("id", c.id);
      if (error) throw new Error(dbErrorMessage(error));
    },
    onSuccess: () => {
      toast.success("Kategori dihapus");
      qc.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: (e: Error) => toast.error(e.message),
    onSettled: () => setToDelete(null),
  });

  const open = (c: Category | "new") => { setEditing(c); setName(c === "new" ? "" : c.name); };

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader title="Kategori" description="Kelompokkan produk berdasarkan jenisnya." />
        <Button onClick={() => open("new")}><Plus className="h-4 w-4" /> Tambah Kategori</Button>
      </div>

      {cats.isLoading ? (
        <p className="text-sm text-muted-foreground">Memuat…</p>
      ) : cats.error ? (
        <p className="text-sm text-destructive">Gagal memuat kategori.</p>
      ) : !cats.data?.length ? (
        <EmptyState icon={Tags} title="Belum ada kategori" description="Tambahkan kategori pertama Anda." />
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-left text-muted-foreground">
              <tr><th className="px-4 py-3 font-medium">Nama</th><th className="px-4 py-3 font-medium">Jumlah Produk</th><th className="px-4 py-3" /></tr>
            </thead>
            <tbody>
              {cats.data.map((c) => (
                <tr key={c.id} className="border-t">
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{usage(c.id)}</td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="icon" aria-label="Edit" onClick={() => open(c)}><Pencil className="h-4 w-4" /></Button>
                    {allowDelete && <Button variant="ghost" size="icon" aria-label="Hapus" onClick={() => setToDelete(c)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing === "new" ? "Tambah Kategori" : "Edit Kategori"}</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-2">
            <Label htmlFor="cat-name">Nama kategori</Label>
            <Input id="cat-name" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} autoFocus />
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>Batal</Button>
              <Button type="submit" disabled={save.isPending}>Simpan</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus kategori "{toDelete?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              {toDelete && usage(toDelete.id) > 0
                ? `Kategori ini masih dipakai oleh ${usage(toDelete.id)} produk. Pindahkan produk tersebut ke kategori lain terlebih dahulu.`
                : "Tindakan ini tidak dapat dibatalkan."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            {toDelete && usage(toDelete.id) === 0 && (
              <AlertDialogAction onClick={(e) => { e.preventDefault(); del.mutate(toDelete); }}>Hapus</AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
