"use client";

import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { IssuePackageButton } from "@/components/money-actions";
import { EmptyState, ErrorState, HoursMeter, LoadingRows, PageHeader, StatusBadge } from "@/components/ui-kit";
import { api, unwrap } from "@/lib/api/client";
import { formatMinutes } from "@/lib/format";

export default function StudentsPage() {
  // The overview already carries every live enrollment with its balance and flag.
  const overview = useQuery({ queryKey: ["overview"], queryFn: () => unwrap(api.GET("/admin/reports/overview")) });
  const students = useQuery({ queryKey: ["students"], queryFn: () => unwrap(api.GET("/admin/students")) });

  const error = overview.error ?? students.error;
  const pending = overview.isPending || students.isPending;

  return (
    <>
      <PageHeader
        title="Students"
        description="Hours paid, used, booked and left for every student in every class."
      />
      <Card className="py-0">
        <CardContent className="px-0">
          {error ? (
            <ErrorState error={error} onRetry={() => (overview.refetch(), students.refetch())} />
          ) : pending ? (
            <LoadingRows />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Student</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead className="w-56">Hours</TableHead>
                  <TableHead className="text-right">Left</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="pr-4" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.data!.students.map((s) => {
                  const rows = overview.data!.balances.filter((b) => b.studentId === s.id);
                  if (rows.length === 0) {
                    return (
                      <TableRow key={s.id}>
                        <TableCell className="pl-4">
                          <p className="font-medium">{s.fullName}</p>
                          <p className="text-xs text-muted-foreground">{s.email}</p>
                        </TableCell>
                        <TableCell colSpan={5} className="text-sm text-muted-foreground">
                          Not enrolled in any class
                        </TableCell>
                      </TableRow>
                    );
                  }
                  // One student, several classes: the student cell spans all their class rows.
                  return rows.map((b, i) => (
                    <TableRow key={b.enrollmentId} className={i === 0 ? "border-t-2" : "border-dashed"}>
                      {i === 0 && (
                        <TableCell rowSpan={rows.length} className="border-r pl-4 align-top">
                          <p className="font-medium">{s.fullName}</p>
                          <p className="text-xs text-muted-foreground">{s.email}</p>
                          {rows.length > 1 && (
                            <Badge variant="secondary" className="mt-1.5">
                              {rows.length} classes
                            </Badge>
                          )}
                        </TableCell>
                      )}
                      <TableCell>{b.className}</TableCell>
                      <TableCell>
                        <HoursMeter
                          paidMinutes={b.paidMinutes}
                          usedMinutes={b.usedMinutes}
                          awaitingMinutes={b.awaitingMinutes}
                          reservedMinutes={b.reservedMinutes}
                        />
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatMinutes(b.usedMinutes)} used · {formatMinutes(b.reservedMinutes)} booked · {formatMinutes(b.paidMinutes)} paid
                          {b.awaitingMinutes > 0 && ` · ${formatMinutes(b.awaitingMinutes)} awaiting notes`}
                        </p>
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">{formatMinutes(b.remainingMinutes)}</TableCell>
                      <TableCell>
                        <StatusBadge status={b.flag} />
                      </TableCell>
                      <TableCell className="pr-4 text-right">
                        {b.enrollmentStatus === "active" && (
                          <IssuePackageButton
                            enrollmentId={b.enrollmentId}
                            studentName={s.fullName}
                            className={b.className}
                            defaultHours={b.defaultPackageHours}
                            disabled={b.hasUnpaidPackage}
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  ));
                })}
              </TableBody>
            </Table>
          )}
          {!pending && !error && students.data!.students.length === 0 && <EmptyState title="No students" />}
        </CardContent>
      </Card>
    </>
  );
}
