"use client";

import { AlertTriangle, Inbox, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "cn";
import { humanize } from "@/lib/format";

// ---------------------------------------------------------------- Page header
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

// ---------------------------------------------------------------- Status badges
type Variant = "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "gold";

const STATUS_VARIANT: Record<string, Variant> = {
  // invoices
  paid: "success",
  unpaid: "warning",
  void: "outline",
  // enrollments
  active: "success",
  pending_payment: "warning",
  awaiting_payment: "warning",
  cancelled: "outline",
  // lessons
  scheduled: "secondary",
  // logbooks
  not_started: "outline",
  draft: "secondary",
  submitted: "gold",
  changes_requested: "destructive",
  approved: "success",
  // balance flags
  ok: "success",
  low: "warning",
  out: "destructive",
  // earnings
  pending: "warning",
  // aging
  not_due: "secondary",
  overdue_1_7: "warning",
  overdue_8_30: "destructive",
  overdue_30_plus: "destructive",
  archived: "outline",
  // lesson logging
  logged: "success",
  not_logged: "warning",
};

const STATUS_LABEL: Record<string, string> = {
  pending_payment: "Awaiting payment",
  awaiting_payment: "Awaiting payment",
  changes_requested: "Changes requested",
  submitted: "Awaiting review",
  overdue_1_7: "1–7 days overdue",
  overdue_8_30: "8–30 days overdue",
  overdue_30_plus: "30+ days overdue",
  not_due: "Not due",
  ok: "On track",
  low: "Low hours",
  out: "Out of hours",
  logged: "Logged",
  not_logged: "Entry missing",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <Badge variant={STATUS_VARIANT[status] ?? "secondary"} className={cn("font-medium", className)}>
      {STATUS_LABEL[status] ?? humanize(status)}
    </Badge>
  );
}

// ---------------------------------------------------------------- Stat card
export function StatCard({
  label,
  value,
  hint,
  tone = "default",
  icon: Icon,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: "default" | "success" | "danger" | "warning";
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card className="gap-1 py-4">
      <CardContent className="px-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
          {Icon && <Icon className="size-4 text-muted-foreground" />}
        </div>
        <p
          className={cn(
            "mt-2 text-2xl font-semibold tabular-nums",
            tone === "success" && "text-success",
            tone === "danger" && "text-destructive",
            tone === "warning" && "text-warning",
          )}
        >
          {value}
        </p>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------- States
export function LoadingRows({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-2 p-4" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-9 w-full" />
      ))}
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 px-4 py-10 text-center">
      <Inbox className="mb-1 size-6 text-muted-foreground" />
      <p className="text-sm font-medium">{title}</p>
      {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: Error; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-10 text-center" role="alert">
      <AlertTriangle className="size-6 text-destructive" />
      <p className="text-sm font-medium">Couldn&apos;t load this</p>
      <p className="text-sm text-muted-foreground">{error.message}</p>
      {onRetry && (
        <button onClick={onRetry} className="text-sm font-medium underline underline-offset-4">
          Try again
        </button>
      )}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("size-4 animate-spin", className)} />;
}

/** Hours progress: used vs paid, with reserved shown lighter. */
export function HoursMeter({
  paidMinutes,
  usedMinutes,
  reservedMinutes,
  inverse = false,
}: {
  paidMinutes: number;
  usedMinutes: number;
  reservedMinutes: number;
  /** For use on navy surfaces. */
  inverse?: boolean;
}) {
  const pct = (n: number) => (paidMinutes > 0 ? Math.min(100, (n / paidMinutes) * 100) : 0);
  return (
    <div
      className={cn("flex h-1.5 w-full overflow-hidden rounded-full", inverse ? "bg-white/15" : "bg-muted")}
      role="img"
      aria-label={`${Math.round(pct(usedMinutes))}% used`}
    >
      <div className={inverse ? "bg-accent" : "bg-primary"} style={{ width: `${pct(usedMinutes)}%` }} />
      <div className={inverse ? "bg-accent/40" : "bg-primary/30"} style={{ width: `${pct(reservedMinutes)}%` }} />
    </div>
  );
}

// ---------------------------------------------------------------- Segmented control
/**
 * A row of mutually exclusive filter buttons. Used instead of Tabs when the
 * buttons filter one list (Tabs require a tab panel per tab for valid ARIA).
 */
export function SegmentedControl<T extends string>({
  label,
  value,
  onChange,
  options,
  className,
}: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  className?: string;
}) {
  return (
    <div role="group" aria-label={label} className={cn("inline-flex w-fit rounded-lg bg-muted p-[3px]", className)}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "rounded-md px-2.5 py-1 text-sm font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              active ? "bg-background text-foreground shadow-sm" : "text-foreground/75 hover:text-foreground",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
