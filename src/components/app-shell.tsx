"use client";

import { useQuery } from "@tanstack/react-query";
import {
  BookOpenCheck,
  CalendarDays,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  ReceiptText,
  Users,
  Wallet,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "cn";
import { api, unwrap } from "@/lib/api/client";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/classes", label: "Classes", icon: GraduationCap },
  { href: "/students", label: "Students", icon: Users },
  { href: "/invoices", label: "Invoices", icon: ReceiptText },
  { href: "/lessons", label: "Lessons", icon: CalendarDays },
  { href: "/logbooks", label: "Logbooks", icon: BookOpenCheck },
  { href: "/earnings", label: "Tutor earnings", icon: Wallet },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const me = useQuery({ queryKey: ["me"], queryFn: () => unwrap(api.GET("/auth/me")) });
  const pendingLogbooks = useQuery({
    queryKey: ["logbooks", "submitted"],
    queryFn: () => unwrap(api.GET("/admin/logbooks", { params: { query: { status: "submitted" } } })),
  });
  const submittedCount = pendingLogbooks.data?.logbooks.length ?? 0;

  async function logout() {
    await api.POST("/auth/logout");
    // Full reload on purpose: clears all cached data and lets the proxy see the cookie is gone.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/login";
  }

  const sidebar = (
    <nav className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="px-5 py-5">
        <Image src="/brand/wordmark.png" alt="Star Generation" width={186} height={27} priority />
        <p className="mt-2 text-[11px] font-medium tracking-[0.2em] text-sidebar-foreground/70 uppercase">Back office</p>
      </div>
      <ul className="flex-1 space-y-0.5 px-3">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                onClick={() => setOpen(false)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent font-medium text-white before:absolute before:inset-y-1.5 before:left-0 before:w-1 before:rounded-full before:bg-sidebar-primary"
                    : "hover:bg-sidebar-accent hover:text-white",
                )}
              >
                <Icon className={cn("size-4", active && "text-sidebar-primary")} />
                <span className="flex-1">{label}</span>
                {href === "/logbooks" && submittedCount > 0 && (
                  <span className="rounded-full bg-sidebar-primary px-1.5 text-[11px] font-semibold text-sidebar-primary-foreground">
                    {submittedCount}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-3 rounded-md px-2 py-2">
          <span className="flex size-8 items-center justify-center rounded-full bg-sidebar-accent text-xs font-semibold text-white">
            {me.data?.user.fullName
              .split(" ")
              .map((p) => p[0])
              .slice(0, 2)
              .join("") ?? "…"}
          </span>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm text-white">{me.data?.user.fullName ?? "Loading…"}</p>
            <p className="truncate text-[11px] text-sidebar-foreground/70">Admin</p>
          </div>
          <button
            onClick={logout}
            className="rounded-md p-1.5 text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-white"
            aria-label="Log out"
            title="Log out"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </nav>
  );

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 lg:block">{sidebar}</aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64">{sidebar}</aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/90 px-4 backdrop-blur lg:hidden">
          <button onClick={() => setOpen((o) => !o)} aria-label="Toggle menu" className="rounded-md p-1.5 hover:bg-muted">
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
          <span className="flex items-center gap-2">
            <Image src="/brand/star-mark.png" alt="" width={20} height={22} />
            <span className="text-sm font-semibold tracking-[0.18em]">STAR GENERATION</span>
          </span>
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
