"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { TextPromptDialog } from "@/components/text-prompt-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, ErrorState, LoadingRows, PageHeader, StatusBadge, SegmentedControl } from "@/components/ui-kit";
import { api, unwrap, type Schemas } from "@/lib/api/client";
import { formatLessonSlot, formatMinutes } from "@/lib/format";

type Lesson = Schemas["Lesson"];
const ALL = "all";

export default function LessonsPage() {
  const [when, setWhen] = useState<"upcoming" | "past">("upcoming");
  const [classId, setClassId] = useState(ALL);
  const [cancelling, setCancelling] = useState<Lesson | null>(null);

  const classes = useQuery({ queryKey: ["classes"], queryFn: () => unwrap(api.GET("/admin/classes")) });
  const lessons = useQuery({
    queryKey: ["lessons", classId],
    queryFn: () =>
      unwrap(api.GET("/admin/lessons", { params: { query: classId === ALL ? {} : { classId } } })),
  });

  // "Now" = when the data was fetched, so filtering stays pure and consistent with the API's view.
  const fetchedAt = lessons.dataUpdatedAt;
  const rows = useMemo(() => {
    const now = fetchedAt;
    const list = (lessons.data?.lessons ?? []).filter((l) =>
      when === "upcoming" ? new Date(l.endsAt).getTime() > now : new Date(l.endsAt).getTime() <= now,
    );
    return when === "past" ? list.reverse() : list;
  }, [lessons.data, when, fetchedAt]);

  const cancel = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      unwrap(api.POST("/admin/lessons/{id}/cancel", { params: { path: { id } }, body: { reason } })),
    onSuccess: () => {
      toast.success("Lesson cancelled — students' hours were released");
      setCancelling(null);
    },
  });

  return (
    <>
      <PageHeader title="Lessons" description="Every scheduled lesson across tutors. Times are in WIB." />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <SegmentedControl
          label="When"
          value={when}
          onChange={setWhen}
          options={[
            { value: "upcoming", label: "Upcoming" },
            { value: "past", label: "Past" },
          ]}
        />
        <Select value={classId} onValueChange={setClassId}>
          <SelectTrigger className="w-56" aria-label="Class">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All classes</SelectItem>
            {classes.data?.classes.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Card className="py-0">
        <CardContent className="px-0">
          {lessons.error ? (
            <ErrorState error={lessons.error} onRetry={() => lessons.refetch()} />
          ) : lessons.isPending ? (
            <LoadingRows />
          ) : rows.length === 0 ? (
            <EmptyState title={when === "upcoming" ? "No upcoming lessons" : "No past lessons"} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">When</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Tutor</TableHead>
                  <TableHead className="text-right">Length</TableHead>
                  <TableHead className="text-right">Students</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="pr-4" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((l) => (
                  <TableRow key={l.id} className={l.status === "cancelled" ? "text-muted-foreground" : undefined}>
                    <TableCell className="pl-4">{formatLessonSlot(l.startsAt, l.endsAt)}</TableCell>
                    <TableCell>{l.className}</TableCell>
                    <TableCell>{l.tutorName}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatMinutes(l.durationMinutes)}</TableCell>
                    <TableCell className="text-right tabular-nums">{l.participantCount}</TableCell>
                    <TableCell>
                      {l.status === "cancelled" ? (
                        <>
                          <StatusBadge status="cancelled" />
                          {l.cancelReason && <p className="mt-1 max-w-48 truncate text-xs">{l.cancelReason}</p>}
                        </>
                      ) : l.hasEnded ? (
                        <StatusBadge status={l.hasEntry ? "logged" : "not_logged"} />
                      ) : (
                        <StatusBadge status="scheduled" />
                      )}
                    </TableCell>
                    <TableCell className="pr-4 text-right">
                      {l.status === "scheduled" && !l.hasEnded && (
                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setCancelling(l)}>
                          Cancel
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <TextPromptDialog
        open={!!cancelling}
        onOpenChange={(o) => !o && setCancelling(null)}
        title="Cancel this lesson?"
        description={
          cancelling
            ? `${cancelling.className}, ${formatLessonSlot(cancelling.startsAt, cancelling.endsAt)}. Booked hours go back to the ${cancelling.participantCount} student(s) and the tutor earns nothing for it.`
            : undefined
        }
        label="Reason"
        placeholder="e.g. Public holiday"
        confirmLabel="Cancel lesson"
        destructive
        pending={cancel.isPending}
        onConfirm={(reason) => cancelling && cancel.mutate({ id: cancelling.id, reason })}
      />
    </>
  );
}
