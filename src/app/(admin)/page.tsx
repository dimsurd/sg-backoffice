"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Clock, ReceiptText, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { cn } from "cn";
import { IssuePackageButton, InvoiceActions } from "@/components/money-actions";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  EmptyState,
  ErrorState,
  HoursMeter,
  LoadingRows,
  PageHeader,
  StatCard,
  StatusBadge,
} from "@/components/ui-kit";
import { api, unwrap } from "@/lib/api/client";
import { currentMonth, formatDate, formatIDR, formatMinutes, formatMonth } from "@/lib/format";

const ALL = "all";

export default function DashboardPage() {
  const [month, setMonth] = useState<string>(ALL);
  const overview = useQuery({
    queryKey: ["overview"],
    queryFn: () => unwrap(api.GET("/admin/reports/overview")),
  });

  const data = overview.data;
  const months = useMemo(() => {
    const set = new Set<string>([currentMonth(), ...(data?.classFinancials.map((f) => f.month) ?? [])]);
    return [...set].sort().reverse();
  }, [data]);

  const financials = useMemo(
    () => (data?.classFinancials ?? []).filter((f) => month === ALL || f.month === month),
    [data, month],
  );
  const totals = financials.reduce(
    (t, f) => ({
      billed: t.billed + f.billed,
      delivered: t.delivered + f.deliveredRevenue,
      approved: t.approved + f.tutorCostApproved,
      pending: t.pending + f.tutorCostPending,
      margin: t.margin + f.margin,
    }),
    { billed: 0, delivered: 0, approved: 0, pending: 0, margin: 0 },
  );

  if (overview.error) return <ErrorState error={overview.error} onRetry={() => overview.refetch()} />;

  const attention = data?.balances.filter((b) => b.flag === "low" || b.flag === "out") ?? [];

  return (
    <>
      <PageHeader
        title="Money dashboard"
        description="Who still owes, who is running out of hours, and whether each class makes money."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Outstanding"
          icon={ReceiptText}
          value={data ? formatIDR(data.kpis.outstandingAmount) : "—"}
          hint={data ? `${data.kpis.unpaidCount} unpaid invoice(s)` : " "}
        />
        <StatCard
          label="Overdue"
          icon={Clock}
          tone={data && data.kpis.overdueCount > 0 ? "danger" : "default"}
          value={data?.kpis.overdueCount ?? "—"}
          hint="Past the 7-day due date"
        />
        <StatCard
          label="Low on hours"
          icon={AlertTriangle}
          tone={data && data.kpis.lowBalanceCount > 0 ? "warning" : "default"}
          value={data?.kpis.lowBalanceCount ?? "—"}
          hint="≤ 2h left, or everything left is booked"
        />
        <StatCard
          label={`Margin · ${data ? formatMonth(data.kpis.month) : "this month"}`}
          icon={TrendingUp}
          tone={data ? (data.kpis.monthMargin < 0 ? "danger" : "success") : "default"}
          value={data ? formatIDR(data.kpis.monthMargin) : "—"}
          hint={data ? `${formatIDR(data.kpis.monthDeliveredRevenue)} delivered this month` : " "}
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-5">
        {/* Unpaid invoices */}
        <Card className="xl:col-span-3">
          <CardHeader>
            <CardTitle>Unpaid invoices</CardTitle>
            <CardDescription>Oldest due date first. Mark paid once the transfer arrives.</CardDescription>
            <CardAction>
              <Link href="/invoices" className="text-sm font-medium underline-offset-4 hover:underline">
                All invoices
              </Link>
            </CardAction>
          </CardHeader>
          <CardContent className="px-0">
            {overview.isPending ? (
              <LoadingRows />
            ) : data!.unpaidInvoices.length === 0 ? (
              <EmptyState title="Everything is paid" description="New package invoices will show up here until they're paid." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">Invoice</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead className="pr-4 text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data!.unpaidInvoices.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="pl-4">
                        <p className="font-medium">{inv.studentName}</p>
                        <p className="text-xs text-muted-foreground">
                          {inv.invoiceNo} · {inv.className} · {inv.hours}h
                        </p>
                      </TableCell>
                      <TableCell className="tabular-nums">{formatIDR(inv.amount)}</TableCell>
                      <TableCell>
                        <p className="text-sm">{formatDate(inv.dueAt)}</p>
                        <StatusBadge status={inv.agingBucket} className="mt-1" />
                      </TableCell>
                      <TableCell className="pr-4">
                        <InvoiceActions invoice={{ ...inv, status: "unpaid" }} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Hours needing attention */}
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Running low on hours</CardTitle>
            <CardDescription>Issue a new package before they miss a lesson.</CardDescription>
            <CardAction>
              <Link href="/students" className="text-sm font-medium underline-offset-4 hover:underline">
                All balances
              </Link>
            </CardAction>
          </CardHeader>
          <CardContent>
            {overview.isPending ? (
              <LoadingRows rows={3} />
            ) : attention.length === 0 ? (
              <EmptyState title="Everyone has hours left" />
            ) : (
              <ul className="divide-y">
                {attention.map((b) => (
                  <li key={b.enrollmentId} className="space-y-2 py-3 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{b.studentName}</p>
                        <p className="text-xs text-muted-foreground">
                          {b.className} · {formatMinutes(b.remainingMinutes)} left of {formatMinutes(b.paidMinutes)}
                        </p>
                      </div>
                      <StatusBadge status={b.flag} />
                    </div>
                    <HoursMeter
                      paidMinutes={b.paidMinutes}
                      usedMinutes={b.usedMinutes}
                      awaitingMinutes={b.awaitingMinutes}
                      reservedMinutes={b.reservedMinutes}
                    />
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-muted-foreground">
                        {formatMinutes(b.reservedMinutes)} booked in upcoming lessons
                        {b.awaitingMinutes > 0 && ` · ${formatMinutes(b.awaitingMinutes)} awaiting notes`}
                      </p>
                      {b.hasUnpaidPackage ? (
                        <span className="text-xs font-medium text-warning">Package invoice unpaid</span>
                      ) : (
                        <IssuePackageButton
                          enrollmentId={b.enrollmentId}
                          studentName={b.studentName}
                          className={b.className}
                          defaultHours={b.defaultPackageHours}
                        />
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Profitability */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Class profitability</CardTitle>
          <CardDescription>
            Delivered revenue is hours actually taught × what students paid per hour. Margin subtracts approved tutor pay
            and an estimate for lessons whose logbook isn&apos;t approved yet.
          </CardDescription>
          <CardAction>
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger className="w-44" aria-label="Month">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All months</SelectItem>
                {months.map((m) => (
                  <SelectItem key={m} value={m}>
                    {formatMonth(m)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardAction>
        </CardHeader>
        <CardContent className="px-0">
          {overview.isPending ? (
            <LoadingRows />
          ) : financials.length === 0 ? (
            <EmptyState title="No activity in this period" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Class</TableHead>
                  <TableHead className="text-right">Billed</TableHead>
                  <TableHead className="text-right">Delivered</TableHead>
                  <TableHead className="text-right">Tutor pay (approved)</TableHead>
                  <TableHead className="text-right">Tutor pay (pending)</TableHead>
                  <TableHead className="pr-4 text-right">Margin</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {financials.map((f) => (
                  <TableRow key={`${f.classId}-${f.month}`}>
                    <TableCell className="pl-4">
                      <p className="font-medium">{f.className}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatMonth(f.month)} · {f.lessonsHeld} lesson(s) · {formatMinutes(f.deliveredStudentMinutes)} student-hours
                      </p>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatIDR(f.billed)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatIDR(f.deliveredRevenue)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatIDR(f.tutorCostApproved)}</TableCell>
                    <TableCell className="text-right text-muted-foreground tabular-nums">
                      {formatIDR(f.tutorCostPending)}
                    </TableCell>
                    <TableCell className="pr-4 text-right">
                      <MarginCell margin={f.margin} pct={f.marginPct} />
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50 font-medium hover:bg-muted/50">
                  <TableCell className="pl-4">Total</TableCell>
                  <TableCell className="text-right tabular-nums">{formatIDR(totals.billed)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatIDR(totals.delivered)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatIDR(totals.approved)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatIDR(totals.pending)}</TableCell>
                  <TableCell className="pr-4 text-right">
                    <MarginCell
                      margin={totals.margin}
                      pct={totals.delivered > 0 ? Math.round((totals.margin * 1000) / totals.delivered) / 10 : null}
                    />
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}

function MarginCell({ margin, pct }: { margin: number; pct: number | null }) {
  return (
    <span className={cn("tabular-nums", margin < 0 ? "text-destructive" : margin > 0 ? "text-success" : "")}>
      {formatIDR(margin)}
      {pct !== null && <span className="ml-1 text-xs">({pct}%)</span>}
    </span>
  );
}
