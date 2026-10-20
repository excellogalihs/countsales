import { useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, LogIn, Monitor, ShieldCheck, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  normalizeUsername,
  passwordsMatch,
  PASSWORD_HINT,
  signIn,
  USERNAME_HINT,
} from "@/lib/auth";
import { bootstrapAdmin, getSetupStatus } from "@/api/accounts.functions";

export function LoginPage() {
  const queryClient = useQueryClient();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const status = useQuery({
    queryKey: ["setup-status"],
    queryFn: () => getSetupStatus(),
    retry: false,
    staleTime: 0,
  });
  const setup = status.data?.needsSetup ?? false;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const uname = normalizeUsername(username);
    setPending(true);
    try {
      if (setup) {
        const mismatch = passwordsMatch(password, confirm);
        if (mismatch) throw new Error(mismatch);
        await bootstrapAdmin({ data: { username: uname, password, confirm } });
        await signIn(uname, password);
        toast.success("Akun Admin pertama dibuat. Selamat datang!");
      } else {
        await signIn(uname, password);
      }
      await queryClient.invalidateQueries();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal masuk. Coba lagi.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-muted/40 px-4 py-10">
      <div className="fixed right-4 top-4 z-20 sm:right-6 sm:top-6">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Monitor className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Count Sales</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sistem penjualan dan laporan keuangan toko komputer.
          </p>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            {setup ? (
              <ShieldCheck className="h-5 w-5 text-primary" />
            ) : (
              <LogIn className="h-5 w-5 text-primary" />
            )}
            <div>
              <h2 className="font-semibold">{setup ? "Penyiapan awal" : "Masuk"}</h2>
              <p className="text-xs text-muted-foreground">
                {setup
                  ? "Belum ada akun. Buat akun Admin pertama untuk mulai memakai aplikasi."
                  : "Gunakan akun Admin atau Kasir yang diberikan kepadamu."}
              </p>
            </div>
          </div>

          {status.isError && (
            <div className="mb-4 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Status penyiapan tidak dapat diperiksa. Pastikan konfigurasi server sudah lengkap.
              </span>
            </div>
          )}

          <form className="space-y-4" onSubmit={submit} noValidate>
            <div>
              <Label htmlFor="username" className="mb-1 block">
                Nama pengguna
              </Label>
              <Input
                id="username"
                name="username"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                className="bg-background"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="mis. admin"
                required
              />
              {setup && <p className="mt-1 text-xs text-muted-foreground">{USERNAME_HINT}</p>}
            </div>

            <div>
              <Label htmlFor="password" className="mb-1 block">
                Kata sandi
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete={setup ? "new-password" : "current-password"}
                className="bg-background"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              {setup && <p className="mt-1 text-xs text-muted-foreground">{PASSWORD_HINT}</p>}
            </div>

            {setup && (
              <div>
                <Label htmlFor="confirm" className="mb-1 block">
                  Ulangi kata sandi
                </Label>
                <Input
                  id="confirm"
                  name="confirm"
                  type="password"
                  autoComplete="new-password"
                  className="bg-background"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                />
              </div>
            )}

            {error && (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={pending || status.isLoading}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              {setup ? "Buat akun Admin" : "Masuk"}
            </Button>
          </form>
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Admin mengelola pengaturan, produk, pembelian, pengeluaran, laporan, dan pengguna. Kasir
          fokus pada penjualan dan riwayat transaksi.
        </p>
      </div>
    </div>
  );
}
