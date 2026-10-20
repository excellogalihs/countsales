import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Loader2, LogOut, RefreshCw, ShieldAlert } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { LoginPage } from "@/components/LoginPage";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { canAccessPath } from "@/lib/access";
import { roleLabels, type Role } from "@/lib/auth";

function FullScreen({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">{children}</div>
  );
}

function LoadingScreen() {
  return (
    <FullScreen>
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
        <p className="text-sm">Memuat…</p>
      </div>
    </FullScreen>
  );
}

function AccountProblem({
  message,
  onRetry,
  onSignOut,
}: {
  message: string | null;
  onRetry: () => Promise<void>;
  onSignOut: () => Promise<void>;
}) {
  return (
    <FullScreen>
      <div className="w-full max-w-sm rounded-xl border bg-card p-6 text-center shadow-sm">
        <ShieldAlert className="mx-auto mb-3 h-8 w-8 text-destructive" />
        <h1 className="font-semibold">Tidak dapat membuka akun</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {message ?? "Profil pengguna tidak ditemukan."}
        </p>
        <div className="mt-5 flex justify-center gap-2">
          <Button variant="outline" onClick={() => void onRetry()}>
            <RefreshCw className="h-4 w-4" /> Coba lagi
          </Button>
          <Button onClick={() => void onSignOut()}>
            <LogOut className="h-4 w-4" /> Keluar
          </Button>
        </div>
      </div>
    </FullScreen>
  );
}

function AccessDenied({ role }: { role: Role }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-card px-6 py-20 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <ShieldAlert className="h-6 w-6" />
      </div>
      <h2 className="text-base font-semibold">Akses ditolak</h2>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Halaman ini hanya tersedia untuk Admin. Akun {roleLabels[role]} hanya dapat mengakses Kasir
        dan Riwayat Penjualan.
      </p>
      <Button className="mt-5" asChild>
        <Link to={role === "kasir" ? "/kasir" : "/"}>
          Kembali ke {role === "kasir" ? "Kasir" : "Dashboard"}
        </Link>
      </Button>
    </div>
  );
}

function AuthenticatedApp() {
  const { profile } = useAuth();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  if (!profile) return null;
  const allowed = canAccessPath(profile.role, pathname);
  return <AppShell>{allowed ? <Outlet /> : <AccessDenied role={profile.role} />}</AppShell>;
}

/**
 * Decides what the root route renders: a loading screen while the Supabase
 * session is restored, the login/bootstrap screen when signed out, or the app
 * shell (with per-role route blocking) when signed in.
 */
export function AppGate() {
  const { loading, session, profile, profileError, refreshProfile, signOut } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!session) return <LoginPage />;
  if (!profile && !profileError) return <LoadingScreen />;
  if (!profile) {
    return <AccountProblem message={profileError} onRetry={refreshProfile} onSignOut={signOut} />;
  }
  return <AuthenticatedApp />;
}
