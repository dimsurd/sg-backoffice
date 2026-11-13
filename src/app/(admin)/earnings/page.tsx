"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, ErrorState, LoadingRows, PageHeader, StatCard, StatusBadge } from "@/components/ui-kit";
import { api, unwrap } from "@/lib/api/client";
import { formatDate, formatIDR, formatMinutes, formatMonth } from "@/lib/format";

const ALL = "all";

export default function EarningsPage() {
  const [tutorId, setTutorId] = useState(ALL);
  const tutors = useQuery({ queryKey: ["tutors"], queryFn: () => unwrap(api.GET("/admin/tutors")) });
  const earnings = useQuery({
    queryKey: ["earnings", tutorId],
    queryFn: () => unwrap(api.GET("/admin/earnings", { params: { query: tutorId === ALL ? {} : { tutorId } } })),
  });
  const d = earnings.data;

  return (
    <>
      <PageHeader
        title="Tutor earnings"
        description="Tutor rate × lesson hours, recorded once per lesson when its logbook is approved."
        actions={
          <Select value={tutorId} onValueChange={setTutorId}>
            <SelectTrigger className="w-52" aria-label="Tutor">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All tutors</SelectItem>
              {tutors.data?.tutors.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.fullName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />
      {earnings.error ? (
        <ErrorState error={earnings.error} onRetry={() => earnings.refetch()} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <StatCard
              label="Approved"
              tone="success"
              value={d ? formatIDR(d.totals.approved) : "—"}
              hint={d ? `${formatMinutes(d.totals.approvedMinutes)} taught, logbooks approved` : " "}
            />
            <StatCard
              label="Pending approval"
              tone="warning"
              value={d ? formatIDR(d.totals.pending) : "—"}
              hint={d ? `${formatMinutes(d.totals.pendingMinutes)} taught, logbook not approved yet` : " "}
            />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>By month</CardTitle>
              </CardHeader>
              <CardContent>
                {!d ? (
                  <LoadingRows rows={3} />
                ) : d.months.length === 0 ? (
                  <EmptyState title="No lessons taught yet" />
                ) : (
                  <ul className="divide-y">
                    {d.months.map((m) => (
                      <li key={m.month} className="flex items-baseline justify-between py-2 text-sm">
                        <span>
                          {formatMonth(m.month)}
                          <span className="ml-1 text-xs text-muted-foreground">· {m.lessons} lesson(s)</span>
                        </span>
                        <span className="text-right tabular-nums">
                          {formatIDR(m.approved + m.pending)}
                          {m.pending > 0 && <span className="block text-xs text-warning">{formatIDR(m.pending)} pending</span>}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card className="py-0 lg:col-span-2">
              <CardContent className="px-0">
                {!d ? (
                  <LoadingRows />
                ) : d.lines.length === 0 ? (
                  <EmptyState title="No lessons yet" />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="pl-4">Lesson</TableHead>
                        <TableHead>Tutor</TableHead>
                        <TableHead className="text-right">Hours × rate</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="pr-4">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {d.lines.map((l) => (
                        <TableRow key={l.lessonId}>
                          <TableCell className="pl-4">
                            <p>{l.className}</p>
                            <p className="text-xs text-muted-foreground">{formatDate(l.startsAt)}</p>
                          </TableCell>
                          <TableCell>{l.tutorName}</TableCell>
                          <TableCell className="text-right text-sm tabular-nums">
                            {formatMinutes(l.minutes)} × {formatIDR(l.ratePerHour)}
                          </TableCell>
                          <TableCell className="text-right font-medium tabular-nums">{formatIDR(l.amount)}</TableCell>
                          <TableCell className="pr-4">
                            <StatusBadge status={l.status} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </>
  );
}
