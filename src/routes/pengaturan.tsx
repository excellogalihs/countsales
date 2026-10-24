import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import {
  Building2,
  ImageIcon,
  KeyRound,
  Loader2,
  Save,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageScaffold";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DEFAULT_RECEIPT_FOOTER,
  emptyStoreForm,
  fileToBase64,
  storeFormFrom,
  storeLogoUrlQuery,
  storeSettingsQuery,
  validateLogoFile,
  validateStoreForm,
  type StoreForm,
} from "@/lib/store";
import {
  normalizeUsername,
  roleLabels,
  validatePassword,
  validateUsername,
  type Role,
} from "@/lib/auth";
import {
  createAccount,
  deleteAccount,
  listAccounts,
  resetAccountPassword,
  setAccountRole,
} from "@/api/accounts.functions";
import { saveStoreSettings } from "@/api/store.functions";
import { formatTanggal } from "@/lib/format";

export const Route = createFileRoute("/pengaturan")({
  head: () => ({
    meta: [
      { title: "Pengaturan — Count Sales" },
      { name: "description", content: "Atur informasi toko, struk, dan hak akses pengguna." },
      { property: "og:title", content: "Pengaturan — Count Sales" },
      {
        property: "og:description",
        content: "Atur informasi toko, struk, dan hak akses pengguna.",
      },
    ],
  }),
  component: PengaturanPage,
});

function PengaturanPage() {
  return (
    <div>
      <PageHeader
        title="Pengaturan"
        description="Kelola informasi toko dan akun pengguna."
      />
      <Tabs defaultValue="toko">
        <TabsList className="mb-4">
          <TabsTrigger value="toko" className="gap-2">
            <Building2 className="h-4 w-4" /> Toko & Struk
          </TabsTrigger>
          <TabsTrigger value="pengguna" className="gap-2">
            <Users className="h-4 w-4" /> Pengguna
          </TabsTrigger>
        </TabsList>
        <TabsContent value="toko">
          <StoreSettingsTab />
        </TabsContent>
        <TabsContent value="pengguna">
          <UserManagementTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StoreSettingsTab() {
  const queryClient = useQueryClient();
  const settings = useQuery(storeSettingsQuery);
  const [form, setForm] = useState<StoreForm>(emptyStoreForm);
  const [errors, setErrors] = useState<Partial<Record<keyof StoreForm, string>>>({});
  const [file, setFile] = useState<File | null>(null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (settings.data) setForm(storeFormFrom(settings.data));
  }, [settings.data]);

  useEffect(() => {
    if (!file) {
      setObjectUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const savedLogo = useQuery(storeLogoUrlQuery(file ? null : (settings.data?.logo_path ?? null)));
  const previewSrc = objectUrl ?? savedLogo.data ?? null;

  const save = useMutation({
    mutationFn: async () => {
      const logo = file ? { data: await fileToBase64(file), contentType: file.type } : undefined;
      return saveStoreSettings({
        data: {
          ...form,
          removeLogo,
          ...(logo ? { logo } : {}),
        },
      });
    },
    onSuccess: (row) => {
      setFile(null);
      setRemoveLogo(false);
      if (fileInput.current) fileInput.current.value = "";
      setForm(storeFormFrom(row));
      void queryClient.invalidateQueries({ queryKey: ["store-settings"] });
      void queryClient.invalidateQueries({ queryKey: ["store-logo"] });
      toast.success("Pengaturan toko disimpan.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const setField = (key: keyof StoreForm, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const picked = event.target.files?.[0] ?? null;
    if (!picked) {
      setFile(null);
      return;
    }
    const invalid = validateLogoFile(picked);
    if (invalid) {
      toast.error(invalid);
      event.target.value = "";
      return;
    }
    setFile(picked);
    setRemoveLogo(false);
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validateStoreForm(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    if (file) {
      const invalid = validateLogoFile(file);
      if (invalid) {
        toast.error(invalid);
        return;
      }
    }
    save.mutate();
  };

  const clearLogo = () => {
    setFile(null);
    setRemoveLogo(true);
    if (fileInput.current) fileInput.current.value = "";
  };

  return (
    <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <Card>
        <CardHeader>
          <CardTitle>Informasi Toko</CardTitle>
          <CardDescription>
            Data ini tersimpan di database dan dipakai kembali setelah aplikasi dibuka.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {settings.isLoading ? (
            <p className="text-sm text-muted-foreground">Memuat pengaturan…</p>
          ) : settings.isError ? (
            <p className="text-sm text-destructive">Gagal memuat pengaturan toko.</p>
          ) : null}

          <div>
            <Label htmlFor="store-name" className="mb-1 block">
              Nama toko
            </Label>
            <Input
              id="store-name"
              className="bg-background"
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
              placeholder="mis. Count Computer"
            />
            {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name}</p>}
          </div>

          <div>
            <Label htmlFor="store-address" className="mb-1 block">
              Alamat
            </Label>
            <Textarea
              id="store-address"
              className="bg-background"
              rows={2}
              value={form.address}
              onChange={(e) => setField("address", e.target.value)}
              placeholder="Alamat toko yang tampil pada struk"
            />
            {errors.address && <p className="mt-1 text-xs text-destructive">{errors.address}</p>}
          </div>

          <div>
            <Label htmlFor="store-phone" className="mb-1 block">
              Nomor telepon
            </Label>
            <Input
              id="store-phone"
              className="bg-background"
              value={form.phone}
              onChange={(e) => setField("phone", e.target.value)}
              placeholder="mis. 0812-3456-7890"
            />
            {errors.phone && <p className="mt-1 text-xs text-destructive">{errors.phone}</p>}
          </div>

          <div>
            <Label className="mb-1 block">Logo (opsional)</Label>
            <div className="flex flex-wrap items-center gap-3">
              <Input
                ref={fileInput}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="max-w-xs bg-background"
                onChange={onFileChange}
              />
              {(file || (settings.data?.logo_path && !removeLogo)) && (
                <Button type="button" variant="ghost" size="sm" onClick={clearLogo}>
                  <X className="h-4 w-4" /> Hapus logo
                </Button>
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              PNG, JPG, atau WEBP. Maksimal 2 MB.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="receipt-header" className="mb-1 block">
                Header struk
              </Label>
              <Textarea
                id="receipt-header"
                className="bg-background"
                rows={3}
                value={form.receipt_header}
                onChange={(e) => setField("receipt_header", e.target.value)}
                placeholder="Baris tambahan di atas struk"
              />
              {errors.receipt_header && (
                <p className="mt-1 text-xs text-destructive">{errors.receipt_header}</p>
              )}
            </div>
            <div>
              <Label htmlFor="receipt-footer" className="mb-1 block">
                Footer struk
              </Label>
              <Textarea
                id="receipt-footer"
                className="bg-background"
                rows={3}
                value={form.receipt_footer}
                onChange={(e) => setField("receipt_footer", e.target.value)}
                placeholder={DEFAULT_RECEIPT_FOOTER}
              />
              {errors.receipt_footer && (
                <p className="mt-1 text-xs text-destructive">{errors.receipt_footer}</p>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={save.isPending || settings.isLoading}>
              {save.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Simpan pengaturan
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="h-fit">
        <CardHeader>
          <CardTitle>Pratinjau Struk</CardTitle>
          <CardDescription>Tampilan struk cetak memakai data di samping.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mx-auto w-full max-w-[260px] rounded-md border bg-card p-3 font-mono text-[11px] shadow-sm">
            <div className="text-center">
              {previewSrc ? (
                <img
                  src={previewSrc}
                  alt="Logo toko"
                  className="mx-auto mb-1 h-10 w-auto object-contain"
                />
              ) : (
                <ImageIcon className="mx-auto mb-1 h-6 w-6 text-muted-foreground" />
              )}
              <div className="text-sm font-bold">{form.name.trim() || "Nama Toko"}</div>
              {form.address.trim() && (
                <div className="whitespace-pre-line">{form.address.trim()}</div>
              )}
              {form.phone.trim() && <div>{form.phone.trim()}</div>}
            </div>
            {form.receipt_header.trim() && (
              <>
                <div className="my-2 border-t border-dashed" />
                <div className="whitespace-pre-line text-center">{form.receipt_header.trim()}</div>
              </>
            )}
            <div className="my-2 border-t border-dashed" />
            <div>No : TRX-00000000-00001</div>
            <div>Tgl: {formatTanggal(new Date())}</div>
            <div className="my-2 border-t border-dashed" />
            <div className="flex justify-between">
              <span>Contoh produk</span>
              <span>10.000</span>
            </div>
            <div className="my-2 border-t border-dashed" />
            <div className="flex justify-between font-bold">
              <span>TOTAL</span>
              <span>10.000</span>
            </div>
            <div className="my-2 border-t border-dashed" />
            <div className="whitespace-pre-line text-center">
              {form.receipt_footer.trim() || DEFAULT_RECEIPT_FOOTER}
            </div>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}

function UserManagementTab() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ userId: string; username: string } | null>(
    null,
  );

  const accounts = useQuery({
    queryKey: ["accounts"],
    queryFn: () => listAccounts(),
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["accounts"] });
  };

  const roleMutation = useMutation({
    mutationFn: (input: { userId: string; role: Role }) => setAccountRole({ data: input }),
    onSuccess: () => {
      toast.success("Hak akses diperbarui.");
      refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (userId: string) => deleteAccount({ data: { userId } }),
    onSuccess: () => {
      toast.success("Pengguna dihapus.");
      setDeleteTarget(null);
      refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle>Pengguna & Hak Akses</CardTitle>
          <CardDescription>
            Admin · Kasir · Input
          </CardDescription>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <UserPlus className="h-4 w-4" /> Tambah pengguna
        </Button>
      </CardHeader>
      <CardContent>
        {accounts.isLoading ? (
          <p className="text-sm text-muted-foreground">Memuat pengguna…</p>
        ) : accounts.isError ? (
          <p className="text-sm text-destructive">
            {accounts.error instanceof Error ? accounts.error.message : "Gagal memuat pengguna."}
          </p>
        ) : !accounts.data?.length ? (
          <p className="text-sm text-muted-foreground">Belum ada pengguna.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="bg-muted/60 text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Nama pengguna</th>
                  <th className="px-4 py-3 font-medium">Peran</th>
                  <th className="px-4 py-3 font-medium">Dibuat</th>
                  <th className="px-4 py-3 text-right font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {accounts.data.map((account) => (
                  <tr key={account.userId} className="border-t">
                    <td className="px-4 py-3">
                      <span className="font-medium">{account.username}</span>
                      {account.isSelf && (
                        <Badge variant="secondary" className="ml-2">
                          Anda
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {account.isSelf || !account.role ? (
                        <Badge variant={account.role === "admin" ? "default" : "secondary"}>
                          {account.role ? roleLabels[account.role] : "Tanpa peran"}
                        </Badge>
                      ) : (
                        <Select
                          value={account.role}
                          onValueChange={(value) =>
                            roleMutation.mutate({ userId: account.userId, role: value as Role })
                          }
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="kasir">Kasir</SelectItem>
                            <SelectItem value="input">Input</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatTanggal(account.createdAt)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Reset kata sandi"
                        onClick={() => setResetTarget(account.userId)}
                      >
                        <KeyRound className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Hapus pengguna"
                        disabled={account.isSelf}
                        onClick={() =>
                          setDeleteTarget({ userId: account.userId, username: account.username })
                        }
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      <CreateUserDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={refresh} />
      <ResetPasswordDialog userId={resetTarget} onClose={() => setResetTarget(null)} />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus pengguna {deleteTarget?.username}?</AlertDialogTitle>
            <AlertDialogDescription>
              Akun ini tidak akan bisa masuk lagi. Riwayat transaksi yang sudah tercatat tetap
              tersimpan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.userId)}
              disabled={deleteMutation.isPending}
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function CreateUserDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("kasir");
  const [error, setError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: () =>
      createAccount({ data: { username: normalizeUsername(username), password, role } }),
    onSuccess: (account) => {
      toast.success(`Pengguna ${account.username} dibuat.`);
      setUsername("");
      setPassword("");
      setRole("kasir");
      setError(null);
      onOpenChange(false);
      onCreated();
    },
    onError: (err: Error) => setError(err.message),
  });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const usernameError = validateUsername(username);
    if (usernameError) return setError(usernameError);
    const passwordError = validatePassword(password);
    if (passwordError) return setError(passwordError);
    setError(null);
    create.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tambah pengguna</DialogTitle>
          <DialogDescription>
            Tambah akun Admin, Kasir, atau Input.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={submit} noValidate>
          <div>
            <Label htmlFor="new-username" className="mb-1 block">
              Nama pengguna
            </Label>
            <Input
              id="new-username"
              className="bg-background"
              autoCapitalize="none"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="mis. kasir1"
            />
          </div>
          <div>
            <Label htmlFor="new-password" className="mb-1 block">
              Kata sandi
            </Label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              className="bg-background"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div>
            <Label className="mb-1 block">Peran</Label>
            <Select value={role} onValueChange={(value) => setRole(value as Role)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="kasir">Kasir</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="input">Input</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {error && (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Buat pengguna
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ResetPasswordDialog({ userId, onClose }: { userId: string | null; onClose: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const reset = useMutation({
    mutationFn: () => resetAccountPassword({ data: { userId: userId ?? "", password } }),
    onSuccess: () => {
      toast.success("Kata sandi diperbarui.");
      setPassword("");
      setError(null);
      onClose();
    },
    onError: (err: Error) => setError(err.message),
  });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const passwordError = validatePassword(password);
    if (passwordError) return setError(passwordError);
    setError(null);
    reset.mutate();
  };

  return (
    <Dialog open={!!userId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset kata sandi</DialogTitle>
          <DialogDescription>
            Masukkan kata sandi baru. Pengguna dapat menggantinya lagi melalui Admin.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={submit} noValidate>
          <div>
            <Label htmlFor="reset-password" className="mb-1 block">
              Kata sandi baru
            </Label>
            <Input
              id="reset-password"
              type="password"
              autoComplete="new-password"
              className="bg-background"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Batal
            </Button>
            <Button type="submit" disabled={reset.isPending || !userId}>
              {reset.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Simpan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
