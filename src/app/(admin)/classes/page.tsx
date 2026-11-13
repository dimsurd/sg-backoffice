"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Info, Pencil, Plus } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState, ErrorState, LoadingRows, PageHeader, Spinner, StatusBadge } from "@/components/ui-kit";
import { ApiError, api, unwrap, type Schemas } from "@/lib/api/client";
import { formatDateTime, formatIDR } from "@/lib/format";

type AdminClass = Schemas["AdminClass"];

export default function ClassesPage() {
  const classes = useQuery({ queryKey: ["classes"], queryFn: () => unwrap(api.GET("/admin/classes")) });
  const [editing, setEditing] = useState<AdminClass | "new" | null>(null);

  return (
    <>
      <PageHeader
        title="Classes"
        description="Rates, capacity and the assigned tutor for each group class."
        actions={
          <Button onClick={() => setEditing("new")}>
            <Plus /> New class
          </Button>
        }
      />
      <Card className="py-0">
        <CardContent className="px-0">
          {classes.error ? (
            <ErrorState error={classes.error} onRetry={() => classes.refetch()} />
          ) : classes.isPending ? (
            <LoadingRows />
          ) : classes.data.classes.length === 0 ? (
            <EmptyState title="No classes yet" description="Create the first class to start enrolling students." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Class</TableHead>
                  <TableHead>Tutor</TableHead>
                  <TableHead className="text-right">Student rate / h</TableHead>
                  <TableHead className="text-right">Tutor rate / h</TableHead>
                  <TableHead className="text-right">Margin / h (full)</TableHead>
                  <TableHead>Seats</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="pr-4" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {classes.data.classes.map((c) => {
                  // Tutors are paid per lesson regardless of headcount; a full class earns capacity x student rate.
                  const fullMargin = c.studentRatePerHour * c.capacity - c.tutorRatePerHour;
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="pl-4">
                        <p className="font-medium">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{c.defaultPackageHours}h package</p>
                      </TableCell>
                      <TableCell>{c.tutorName}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatIDR(c.studentRatePerHour)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatIDR(c.tutorRatePerHour)}</TableCell>
                      <TableCell className={`text-right tabular-nums ${fullMargin < 0 ? "text-destructive" : ""}`}>
                        {formatIDR(fullMargin)}
                      </TableCell>
                      <TableCell>
                        <span className="tabular-nums">
                          {c.seatsTaken}/{c.capacity}
                        </span>
                        {c.seatsTaken > c.activeStudents && (
                          <span className="ml-1 text-xs text-muted-foreground">
                            ({c.seatsTaken - c.activeStudents} awaiting payment)
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={c.status} />
                      </TableCell>
                      <TableCell className="pr-4 text-right">
                        <Button variant="ghost" size="sm" onClick={() => setEditing(c)}>
                          <Pencil /> Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {editing && <ClassDialog cls={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
    </>
  );
}

// ---------------------------------------------------------------------------

const rupiah = z.coerce.number({ error: "Enter an amount" }).int("Whole rupiah only").positive("Must be more than 0");
const formSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  description: z.string().trim().max(2000),
  tutorId: z.string().min(1, "Choose a tutor"),
  studentRatePerHour: rupiah,
  tutorRatePerHour: rupiah,
  capacity: z.coerce.number().int().min(1, "At least 1").max(100),
  defaultPackageHours: z.coerce.number().int().min(1).max(200),
  status: z.enum(["active", "archived"]),
});
type FormIn = z.input<typeof formSchema>;
type FormOut = z.output<typeof formSchema>;

function ClassDialog({ cls, onClose }: { cls: AdminClass | null; onClose: () => void }) {
  const tutors = useQuery({ queryKey: ["tutors"], queryFn: () => unwrap(api.GET("/admin/tutors")) });
  const form = useForm<FormIn, unknown, FormOut>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: cls?.name ?? "",
      description: cls?.description ?? "",
      tutorId: cls?.tutorId ?? "",
      studentRatePerHour: cls?.studentRatePerHour ?? 150000,
      tutorRatePerHour: cls?.tutorRatePerHour ?? 100000,
      capacity: cls?.capacity ?? 4,
      defaultPackageHours: cls?.defaultPackageHours ?? 12,
      status: (cls?.status as "active" | "archived") ?? "active",
    },
  });
  const errors = form.formState.errors;

  const save = useMutation({
    mutationFn: async (v: FormOut) => {
      if (!cls) {
        const { name, description, tutorId, studentRatePerHour, tutorRatePerHour, capacity, defaultPackageHours } = v;
        return unwrap(
          api.POST("/admin/classes", {
            body: { name, description, tutorId, studentRatePerHour, tutorRatePerHour, capacity, defaultPackageHours },
          }),
        );
      }
      // Send only what changed so the audit log shows the real edit.
      const changed = Object.fromEntries(
        Object.entries(v).filter(([k, val]) => (cls as Record<string, unknown>)[k] !== val),
      ) as Partial<FormOut>;
      if (Object.keys(changed).length === 0) return null;
      return unwrap(api.PATCH("/admin/classes/{id}", { params: { path: { id: cls.id } }, body: changed }));
    },
    meta: { silent: true },
    onSuccess: (r) => {
      if (r) toast.success(cls ? "Class updated" : "Class created");
      onClose();
    },
  });

  const clashes =
    save.error instanceof ApiError
      ? ((save.error.details as { clashes?: { startsAt: string; otherClass: string }[] } | undefined)?.clashes ?? [])
      : [];

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={form.handleSubmit((v) => save.mutate(v))} className="grid gap-4" noValidate>
          <DialogHeader>
            <DialogTitle>{cls ? `Edit ${cls.name}` : "New class"}</DialogTitle>
            <DialogDescription>
              {cls
                ? "Changes apply going forward: paid packages keep their price, and lessons already scheduled keep their tutor rate."
                : "Students buy packages at the student rate; the tutor earns the tutor rate per lesson hour, whatever the headcount."}
            </DialogDescription>
          </DialogHeader>

          {save.error && (
            <Alert variant="destructive">
              <AlertDescription>
                {save.error.message}
                {clashes.length > 0 && (
                  <ul className="mt-1 list-disc pl-4">
                    {clashes.map((c, i) => (
                      <li key={i}>
                        {formatDateTime(c.startsAt)} — already teaching {c.otherClass}
                      </li>
                    ))}
                  </ul>
                )}
              </AlertDescription>
            </Alert>
          )}

          <Field label="Name" error={errors.name?.message} id="name">
            <Input id="name" {...form.register("name")} aria-invalid={!!errors.name} />
          </Field>
          <Field label="Description" id="description" error={errors.description?.message}>
            <Textarea id="description" rows={2} {...form.register("description")} />
          </Field>
          <Field label="Tutor" id="tutorId" error={errors.tutorId?.message}>
            <Controller
              control={form.control}
              name="tutorId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="tutorId" className="w-full" aria-invalid={!!errors.tutorId}>
                    <SelectValue placeholder={tutors.isPending ? "Loading…" : "Choose a tutor"} />
                  </SelectTrigger>
                  <SelectContent>
                    {tutors.data?.tutors.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.fullName} · {t.activeClasses} class(es)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {cls && (
              <p className="flex gap-1 text-xs text-muted-foreground">
                <Info className="mt-0.5 size-3 shrink-0" />
                Changing the tutor moves upcoming lessons to them; past lessons and earnings stay with the original tutor.
              </p>
            )}
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Student rate / hour (Rp)" id="studentRatePerHour" error={errors.studentRatePerHour?.message}>
              <Input id="studentRatePerHour" inputMode="numeric" {...form.register("studentRatePerHour")} />
            </Field>
            <Field label="Tutor rate / hour (Rp)" id="tutorRatePerHour" error={errors.tutorRatePerHour?.message}>
              <Input id="tutorRatePerHour" inputMode="numeric" {...form.register("tutorRatePerHour")} />
            </Field>
            <Field label="Capacity" id="capacity" error={errors.capacity?.message}>
              <Input id="capacity" inputMode="numeric" {...form.register("capacity")} />
            </Field>
            <Field label="Package size (hours)" id="defaultPackageHours" error={errors.defaultPackageHours?.message}>
              <Input id="defaultPackageHours" inputMode="numeric" {...form.register("defaultPackageHours")} />
            </Field>
          </div>
          {cls && (
            <Field label="Status" id="status">
              <Controller
                control={form.control}
                name="status"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="status" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active — open for enrollment</SelectItem>
                      <SelectItem value="archived">Archived — hidden from the catalogue</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending && <Spinner />}
              {cls ? "Save changes" : "Create class"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, id, error, children }: { label: string; id: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
