"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { InvoiceActions } from "@/components/money-actions";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState, ErrorState, LoadingRows, PageHeader, StatusBadge } from "@/components/ui-kit";
import { api, unwrap } from "@/lib/api/client";
import { formatDate, formatIDR } from "@/lib/format";

type Filter = "unpaid" | "paid" | "void" | "all";

export default function InvoicesPage() {
  const [filter, setFilter] = useState<Filter>("unpaid");
  const invoices = useQuery({
    queryKey: ["invoices", filter],
    queryFn: () =>
      unwrap(api.GET("/admin/invoices", { params: { query: filter === "all" ? {} : { status: filter } } })),
  });

  return (
    <>
      <PageHeader
        title="Invoices"
        description="One invoice per package of hours. Payments are recorded here (no payment gateway)."
      />
      <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)} className="mb-4">
        <TabsList>
          <TabsTrigger value="unpaid">Unpaid</TabsTrigger>
          <TabsTrigger value="paid">Paid</TabsTrigger>
          <TabsTrigger value="void">Void</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
      </Tabs>
      <Card className="py-0">
        <CardContent className="px-0">
          {invoices.error ? (
            <ErrorState error={invoices.error} onRetry={() => invoices.refetch()} />
          ) : invoices.isPending ? (
            <LoadingRows />
          ) : invoices.data.invoices.length === 0 ? (
            <EmptyState title={filter === "unpaid" ? "No unpaid invoices" : "No invoices here"} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Invoice</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead className="text-right">Package</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Issued / due</TableHead>
                  <TableHead className="pr-4 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.data.invoices.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="pl-4 font-medium">{inv.invoiceNo}</TableCell>
                    <TableCell>
                      <p>{inv.studentName}</p>
                      <p className="text-xs text-muted-foreground">{inv.className}</p>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {inv.hours}h × {formatIDR(inv.ratePerHour)}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">{formatIDR(inv.amount)}</TableCell>
                    <TableCell>
                      <StatusBadge status={inv.status} />
                      {inv.isOverdue && <p className="mt-1 text-xs text-destructive">Overdue</p>}
                      {inv.status === "paid" && inv.paymentReference && (
                        <p className="mt-1 max-w-40 truncate text-xs text-muted-foreground" title={inv.paymentReference}>
                          Ref: {inv.paymentReference}
                        </p>
                      )}
                      {inv.status === "void" && inv.voidReason && (
                        <p className="mt-1 max-w-40 truncate text-xs text-muted-foreground" title={inv.voidReason}>
                          {inv.voidReason}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      <p>{formatDate(inv.createdAt)}</p>
                      <p className="text-xs text-muted-foreground">
                        {inv.status === "paid" ? `Paid ${formatDate(inv.paidAt)}` : `Due ${formatDate(inv.dueAt)}`}
                      </p>
                    </TableCell>
                    <TableCell className="pr-4">
                      <InvoiceActions invoice={inv} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}
