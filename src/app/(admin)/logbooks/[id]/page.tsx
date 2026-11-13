"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, Lock, MessageSquareWarning } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { TextPromptDialog } from "@/components/text-prompt-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ErrorState, LoadingRows, PageHeader, StatusBadge } from "@/components/ui-kit";
import { api, unwrap } from "@/lib/api/client";
import { formatDate, formatDateTime, formatIDR, formatLessonSlot, formatMinutes, formatMonth, humanize } from "@/lib/format";

export default function LogbookReviewPage() {
  const { id } = useParams<{ id: string }>();
  const [dialog, setDialog] = useState<null | "approve" | "changes">(null);
  const logbook = useQuery({
    queryKey: ["logbook", id],
    queryFn: () => unwrap(api.GET("/admin/logbooks/{id}", { params: { path: { id } } })),
  });

  const approve = useMutation({
    mutationFn: (comment: string) =>
      unwrap(api.POST("/admin/logbooks/{id}/approve", { params: { path: { id } }, body: comment ? { comment } : {} })),
    onSuccess: (r) => {
      toast.success(
        r.alreadyApproved
          ? "This logbook was already approved — nothing changed"
          : `Approved · earnings recorded for ${r.earningsRecorded} lesson(s)`,
      );
      setDialog(null);
    },
  });
  const requestChanges = useMutation({
    mutationFn: (comment: string) =>
      unwrap(api.POST("/admin/logbooks/{id}/request-changes", { params: { path: { id } }, body: { comment } })),
    onSuccess: () => {
      toast.success("Sent back to the tutor with your comment");
      setDialog(null);
    },
  });

  if (logbook.error) return <ErrorState error={logbook.error} onRetry={() => logbook.refetch()} />;
  if (logbook.isPending) return <LoadingRows rows={6} />;

  const lb = logbook.data.logbook;
  const entries = lb.lessons.filter((l) => l.entry);
  const cancelled = lb.lessons.filter((l) => l.status === "cancelled");
  const preview = lb.earningsPreview;
  const tutorNames = [...new Set(preview.lines.map((l) => l.tutorName))].join(", ");

  return (
    <>
      <Link href="/logbooks" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Logbooks
      </Link>
      <PageHeader
        title={`${lb.className} · ${formatMonth(lb.month)}`}
        description={
          <span className="inline-flex items-center gap-2">
            <StatusBadge status={lb.status} />
            {lb.submittedAt && <span>Submitted {formatDateTime(lb.submittedAt)}</span>}
          </span>
        }
        actions={
          lb.status === "submitted" ? (
            <>
              <Button variant="outline" onClick={() => setDialog("changes")}>
                <MessageSquareWarning /> Request changes
              </Button>
              <Button onClick={() => setDialog("approve")}>
                <CheckCircle2 /> Approve
              </Button>
            </>
          ) : undefined
        }
      />

      {lb.status === "approved" && (
        <Alert className="mb-6">
          <Lock />
          <AlertTitle>Approved and read-only</AlertTitle>
          <AlertDescription>
            Approved by {lb.approvedByName} on {lb.approvedAt && formatDateTime(lb.approvedAt)}. Students and parents can see it.
          </AlertDescription>
        </Alert>
      )}
      {lb.status === "changes_requested" && (
        <Alert className="mb-6">
          <MessageSquareWarning />
          <AlertTitle>Waiting for the tutor</AlertTitle>
          <AlertDescription>You sent this back. It returns here once the tutor resubmits.</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {entries.map((l, i) => (
            <Card key={l.id}>
              <CardHeader>
                <CardDescription>
                  Lesson {entries.length - i} · {formatLessonSlot(l.startsAt, l.endsAt)} · {l.tutorName}
                </CardDescription>
                <CardTitle className="text-lg">{l.entry!.topic}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-3">
                <EntryField label="What happened" value={l.entry!.activities} />
                <EntryField label="Tutor observation" value={l.entry!.tutorObservation} />
                <EntryField label="Next steps" value={l.entry!.futureRecommendation} />
              </CardContent>
            </Card>
          ))}
          {cancelled.length > 0 && (
            <p className="text-sm text-muted-foreground">
              {cancelled.length} cancelled lesson(s) this month are not part of the logbook and earn nothing.
            </p>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Tutor earnings</CardTitle>
              <CardDescription>
                {lb.status === "approved"
                  ? `Recorded for ${tutorNames}.`
                  : `What ${tutorNames || "the tutor"} will be paid when you approve.`}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {preview.lines.map((line) => (
                <div key={line.lessonId} className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="text-muted-foreground">
                    {formatDate(line.startsAt)} · {formatMinutes(line.minutes)} ×{" "}
                    {formatIDR(line.ratePerHour)}/h
                  </span>
                  <span className="tabular-nums">{formatIDR(line.amount)}</span>
                </div>
              ))}
              <Separator className="my-2" />
              <div className="flex items-baseline justify-between font-semibold">
                <span>Total · {formatMinutes(preview.totalMinutes)}</span>
                <span className="text-lg tabular-nums">{formatIDR(preview.totalAmount)}</span>
              </div>
            </CardContent>
            {lb.status === "submitted" && (
              <CardFooter className="text-xs text-muted-foreground">
                Earnings are recorded once per lesson; approving again never pays twice.
              </CardFooter>
            )}
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Review history</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-3">
                {lb.reviews.map((r, i) => (
                  <li key={i} className="border-l-2 border-accent pl-3 text-sm">
                    <p className="font-medium">{humanize(r.action)}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.actorName} · {formatDateTime(r.createdAt)}
                    </p>
                    {r.comment && <p className="mt-1">“{r.comment}”</p>}
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>

      <TextPromptDialog
        open={dialog === "approve"}
        onOpenChange={(o) => !o && setDialog(null)}
        title="Approve this logbook?"
        description={`${tutorNames} will be paid ${formatIDR(preview.totalAmount)} for ${preview.lines.length} lesson(s). The logbook becomes read-only and visible to students.`}
        label="Note to the tutor"
        optional
        confirmLabel={`Approve · ${formatIDR(preview.totalAmount)}`}
        pending={approve.isPending}
        onConfirm={(v) => approve.mutate(v)}
      />
      <TextPromptDialog
        open={dialog === "changes"}
        onOpenChange={(o) => !o && setDialog(null)}
        title="Send back for changes"
        description="The tutor sees your comment, fixes the entries and resubmits. Nothing is paid until you approve."
        label="What needs fixing?"
        placeholder="e.g. Lesson 2 doesn't mention the homework that was set."
        minLength={5}
        confirmLabel="Send back"
        pending={requestChanges.isPending}
        onConfirm={(v) => requestChanges.mutate(v)}
      />
    </>
  );
}

function EntryField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
      <p className="mt-1 text-sm whitespace-pre-line">{value}</p>
    </div>
  );
}
