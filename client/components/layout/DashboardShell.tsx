"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  Bell,
  BriefcaseBusiness,
  ChartSpline,
  Gauge,
  LogOut,
  Menu,
  ServerCog,
  ShieldAlert,
  UploadCloud,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import type { Notification } from "@/types/notification";

type NavItem = {
  href: string;
  label: string;
  subtitle: string;
  icon: ComponentType<{ className?: string }>;
  adminOnly?: boolean;
};

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Overview", subtitle: "Portfolio performance, risk score & narrator", icon: Gauge },
  { href: "/dashboard/portfolios", label: "Portfolios", subtitle: "Create and manage portfolio workspaces", icon: BriefcaseBusiness },
  { href: "/dashboard/imports", label: "Imports", subtitle: "CSV trade ingestion jobs & row diagnostics", icon: UploadCloud },
  { href: "/dashboard/alerts", label: "Alerts", subtitle: "Threshold rules & breach explanations", icon: ShieldAlert },
  { href: "/dashboard/notifications", label: "Notifications", subtitle: "Realtime alert & import inbox", icon: Bell },
  { href: "/dashboard/backtest", label: "Backtest", subtitle: "Historical strategy simulation lab", icon: ChartSpline },
  { href: "/dashboard/operations", label: "Operations", subtitle: "API latency, cache & queue telemetry", icon: ServerCog, adminOnly: true }
];

function userInitials(name?: string, email?: string): string {
  const source = name?.trim() || email?.trim() || "U";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

export function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading, logout } = useAuth();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useRealtimeNotifications();

  const unreadQuery = useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: () => apiRequest<Notification[]>("/notifications?isRead=false&limit=50"),
    enabled: Boolean(user),
    staleTime: 30_000
  });
  const unreadCount = unreadQuery.data?.length ?? 0;

  useEffect(() => {
    if (!isLoading && !user) router.replace("/login");
  }, [isLoading, router, user]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileNavOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileNavOpen]);

  const activeSection = useMemo(() => {
    return (
      navItems.find((item) => pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))) ??
      navItems[0]
    );
  }, [pathname]);

  if (isLoading && !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        <div className="flex items-center gap-3 rounded-xl border bg-card px-5 py-4 shadow-soft">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" aria-hidden="true" />
          <span className="font-medium text-foreground">Loading RiskLens workspace...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const navigation = (
    <nav className="flex-1 space-y-1 p-3" aria-label="Primary navigation">
      {navItems
        .filter((item) => !item.adminOnly || user.role === "ADMIN")
        .map((item) => {
          const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          const Icon = item.icon;
          const showUnread = item.href === "/dashboard/notifications" && unreadCount > 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              onClick={() => setMobileNavOpen(false)}
              className={cn(
                "group relative flex h-10 items-center justify-between rounded-lg px-3 text-sm font-medium text-muted-foreground transition-all duration-150 hover:bg-muted/80 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active && "bg-primary/10 font-semibold text-primary hover:bg-primary/15 hover:text-primary"
              )}
            >
              <span className="flex items-center gap-3">
                {active ? (
                  <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-primary" aria-hidden="true" />
                ) : null}
                <Icon className={cn("h-4 w-4 transition-transform duration-150 group-hover:scale-105", active && "text-primary")} />
                {item.label}
              </span>
              {showUnread ? (
                <span className="inline-flex min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-[11px] font-semibold tabular-nums leading-none text-primary-foreground">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              ) : null}
            </Link>
          );
        })}
    </nav>
  );

  const sidebarFooter = (
    <div className="border-t p-3">
      <div className="flex items-center gap-3 rounded-lg bg-muted/50 px-3 py-2.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
          {userInitials(user.name, user.email)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-foreground">{user.name || "Workspace User"}</p>
          <p className="truncate text-[11px] text-muted-foreground">{user.email}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r bg-card/95 backdrop-blur xl:flex">
        <Link href="/dashboard" className="flex h-16 items-center gap-2.5 border-b px-5 transition-opacity hover:opacity-90">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold tracking-tight">RiskLens</p>
            <p className="text-[11px] text-muted-foreground">Risk analytics</p>
          </div>
        </Link>
        {navigation}
        {sidebarFooter}
      </aside>

      <div
        className={cn(
          "fixed inset-0 z-30 bg-slate-950/45 backdrop-blur-[2px] transition-opacity duration-200 xl:hidden",
          mobileNavOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        )}
        role="presentation"
        aria-hidden={!mobileNavOpen}
        onClick={() => setMobileNavOpen(false)}
      >
        <aside
          className={cn(
            "flex h-full w-[min(20rem,85vw)] flex-col border-r bg-card shadow-2xl transition-transform duration-200 ease-out",
            mobileNavOpen ? "translate-x-0" : "-translate-x-full"
          )}
          aria-label="Mobile navigation"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex h-16 items-center justify-between border-b px-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold">RiskLens</p>
                <p className="text-[11px] text-muted-foreground">Risk analytics</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>
          {navigation}
          {sidebarFooter}
        </aside>
      </div>

      <div className="xl:pl-64">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between gap-4 border-b bg-card/85 px-4 backdrop-blur-md sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Button variant="ghost" size="icon" className="xl:hidden" aria-label="Open navigation" onClick={() => setMobileNavOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{activeSection.label}</p>
              <p className="hidden truncate text-xs text-muted-foreground sm:block">{activeSection.subtitle}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2.5">
            <Button asChild variant="ghost" size="icon" className="relative" aria-label="Notifications">
              <Link href="/dashboard/notifications">
                <Bell className="h-4 w-4" />
                {unreadCount > 0 ? (
                  <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary ring-2 ring-card" />
                ) : null}
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await logout();
                router.replace("/");
              }}
            >
              <LogOut className="h-3.5 w-3.5" />
              Logout
            </Button>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <div key={pathname} className="animate-page-enter">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
