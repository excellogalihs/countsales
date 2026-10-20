import { Link, useRouterState } from "@tanstack/react-router";
import { Menu, X, Monitor, LogOut } from "lucide-react";
import { useState, type ReactNode } from "react";
import { navItemsFor } from "@/lib/nav";
import { roleLabels } from "@/lib/auth";
import { useAuth } from "@/components/AuthProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useTheme } from "@/components/ThemeProvider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function NavList({ onNavigate }: { onNavigate?: (() => void) | undefined }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { profile } = useAuth();
  const items = profile ? navItemsFor(profile.role) : [];
  return (
    <nav className="flex-1 overflow-y-auto p-3">
      <div className="flex flex-col gap-1">
        {items.map((item) => {
          const active = item.to === "/" ? path === "/" : path.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent",
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function Brand() {
  return (
    <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-5">
      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <Monitor className="h-4 w-4" />
      </div>
      <span className="text-lg font-bold tracking-tight">Count Sales</span>
    </div>
  );
}

function ThemeRow() {
  const { theme } = useTheme();
  return (
    <div className="mb-3 flex items-center justify-between gap-2 rounded-lg border border-sidebar-border/70 bg-sidebar-accent/40 px-3 py-2">
      <div className="min-w-0">
        <div className="text-xs font-medium text-sidebar-foreground">Tampilan</div>
        <div className="truncate text-[11px] text-muted-foreground">
          {theme === "dark" ? "Mode gelap" : "Mode terang"}
        </div>
      </div>
      <ThemeToggle />
    </div>
  );
}

function AccountBox({ onNavigate }: { onNavigate?: (() => void) | undefined }) {
  const { profile, signOut } = useAuth();
  if (!profile) return null;
  return (
    <div className="border-t border-sidebar-border p-3">
      <ThemeRow />
      <div className="mb-2 px-1">
        <div className="truncate text-sm font-medium text-sidebar-foreground">
          {profile.username}
        </div>
        <div className="text-xs text-muted-foreground">{roleLabels[profile.role]}</div>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={() => {
          onNavigate?.();
          void signOut();
        }}
      >
        <LogOut className="h-4 w-4" /> Keluar
      </Button>
    </div>
  );
}

function SidebarBody({ onNavigate }: { onNavigate?: (() => void) | undefined }) {
  return (
    <div className="flex h-full flex-col">
      <Brand />
      <NavList onNavigate={onNavigate} />
      <AccountBox onNavigate={onNavigate} />
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-sidebar-border bg-sidebar lg:flex lg:flex-col print:!hidden">
        <SidebarBody />
      </aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-foreground/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 bg-sidebar shadow-xl">
            <button
              aria-label="Tutup menu"
              onClick={() => setOpen(false)}
              className="absolute right-3 top-4 z-10 rounded-md p-1 hover:bg-sidebar-accent"
            >
              <X className="h-5 w-5" />
            </button>
            <SidebarBody onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col lg:pl-64 print:pl-0">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-card/90 px-4 backdrop-blur lg:hidden print:hidden">
          <button
            aria-label="Buka menu"
            onClick={() => setOpen(true)}
            className="rounded-md p-2 hover:bg-muted"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="font-bold">Count Sales</span>
          <ThemeToggle className="ml-auto" />
        </header>
        <main className="flex-1 p-4 md:p-8 print:p-0">{children}</main>
      </div>
    </div>
  );
}
