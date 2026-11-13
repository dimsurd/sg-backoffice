"use client";

import { useQuery } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState, ErrorState, LoadingRows, PageHeader, StatusBadge } from "@/components/ui-kit";
import { api, unwrap } from "@/lib/api/client";
import { formatDate, formatIDR, formatMonth } from "@/lib/format";

type Filter = "submitted" | "changes_requested" | "approved" | "draft" | "all";

export default function LogbooksPage() {
  const [filter, setFilter] = useState<Filter>("submitted");
  const logbooks = useQuery({
    queryKey: ["logbooks", filter],
    queryFn: () =>
      unwrap(api.GET("/admin/logbooks", { params: { query: filter === "all" ? {} : { status: filter } } })),
  });

  return (
    <>
      <PageHeader
        title="Logbooks"
        description="Tutors submit one logbook per class per month. Review it, check the earnings, then approve — parents and students only see approved logbooks."
      />
      <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)} className="mb-4">
        <TabsList>
          <TabsTrigger value="submitted">Awaiting review</TabsTrigger>
          <TabsTrigger value="changes_requested">Sent back</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="draft">Drafts</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
      </Tabs>
      <Card className="py-0">
        <CardContent className="px-0">
          {logbooks.error ? (
            <ErrorState error={logbooks.error} onRetry={() => logbooks.refetch()} />
          ) : logbooks.isPending ? (
            <LoadingRows />
          ) : logbooks.data.logbooks.length === 0 ? (
            <EmptyState
              title={filter === "submitted" ? "Nothing to review" : "No logbooks here"}
              description={filter === "submitted" ? "Submitted logbooks will appear here." : undefined}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Class & month</TableHead>
                  <TableHead>Tutor</TableHead>
                  <TableHead className="text-right">Entries</TableHead>
                  <TableHead className="text-right">Tutor earnings</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="pr-4" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {logbooks.data.logbooks.map((lb) => (
                  <TableRow key={lb.id} className="cursor-pointer">
                    <TableCell className="pl-4">
                      <Link href={`/logbooks/${lb.id}`} className="font-medium after:absolute after:inset-0">
                        {lb.className}
                      </Link>
                      <p className="text-xs text-muted-foreground">{formatMonth(lb.month)}</p>
                    </TableCell>
                    <TableCell>{lb.tutorName}</TableCell>
                    <TableCell className="text-right tabular-nums">{lb.entryCount}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatIDR(lb.earningsTotal)}</TableCell>
                    <TableCell>
                      <StatusBadge status={lb.status} />
                      <p className="mt-1 text-xs text-muted-foreground">
                        {lb.status === "approved" ? `Approved ${formatDate(lb.approvedAt)}` : lb.submittedAt ? `Submitted ${formatDate(lb.submittedAt)}` : ""}
                      </p>
                    </TableCell>
                    <TableCell className="pr-4 text-right">
                      <ChevronRight className="ml-auto size-4 text-muted-foreground" />
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
