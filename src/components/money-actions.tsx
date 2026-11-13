"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { History, MoreHorizontal, PackagePlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TextPromptDialog } from "@/components/text-prompt-dialog";
import { LoadingRows, Spinner } from "@/components/ui-kit";
import { api, unwrap } from "@/lib/api/client";
import { formatDateTime, formatIDR, humanize } from "@/lib/format";

type InvoiceLike = { id: string; invoiceNo: string; amount: number; status?: string; studentName: string };

/**
 * Row actions for an invoice. Every action asks for a reference or reason,
 * which the API stores in the audit log.
 *  - Mark paid: unpaid -> paid (bank-transfer reference)
 *  - Undo payment: paid -> unpaid, only while no hours were used (API enforces)
 *  - Void: unpaid -> void; releases the seat if nothing was ever paid
 */
export function InvoiceActions({ invoice }: { invoice: InvoiceLike }) {
  const status = invoice.status ?? "unpaid";
  const [dialog, setDialog] = useState<null | "pay" | "undo" | "void" | "history">(null);
  const close = () => setDialog(null);

  const markPaid = useMutation({
    mutationFn: (paymentReference: string) =>
      unwrap(api.POST("/admin/invoices/{id}/mark-paid", { params: { path: { id: invoice.id } }, body: { paymentReference } })),
    onSuccess: (r) => {
      toast.success(
        `${invoice.invoiceNo} marked as paid` + (r.lessonsJoined ? ` · added to ${r.lessonsJoined} upcoming lesson(s)` : ""),
      );
      close();
    },
  });
  const undo = useMutation({
    mutationFn: (reason: string) =>
      unwrap(api.POST("/admin/invoices/{id}/undo-paid", { params: { path: { id: invoice.id } }, body: { reason } })),
    onSuccess: () => {
      toast.success(`Payment on ${invoice.invoiceNo} was undone`);
      close();
    },
  });
  const voidInv = useMutation({
    mutationFn: (reason: string) =>
      unwrap(api.POST("/admin/invoices/{id}/void", { params: { path: { id: invoice.id } }, body: { reason } })),
    onSuccess: (r) => {
      toast.success(`${invoice.invoiceNo} voided` + (r.seatReleased ? " · seat released" : ""));
      close();
    },
  });

  return (
    <>
      <div className="flex items-center justify-end gap-1">
        {status === "unpaid" && (
          <Button size="sm" onClick={() => setDialog("pay")}>
            Mark paid
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label={`More actions for ${invoice.invoiceNo}`}>
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {status === "paid" && <DropdownMenuItem onSelect={() => setDialog("undo")}>Undo payment</DropdownMenuItem>}
            {status === "unpaid" && (
              <DropdownMenuItem variant="destructive" onSelect={() => setDialog("void")}>
                Void invoice
              </DropdownMenuItem>
            )}
            {status !== "void" && <DropdownMenuSeparator />}
            <DropdownMenuItem onSelect={() => setDialog("history")}>
              <History /> History
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <TextPromptDialog
        open={dialog === "pay"}
        onOpenChange={(o) => !o && close()}
        title={`Mark ${invoice.invoiceNo} as paid`}
        description={`${invoice.studentName} · ${formatIDR(invoice.amount)}. The student gets access and joins upcoming lessons right away.`}
        label="Payment reference"
        placeholder="e.g. BCA transfer 12 Nov, ref 0042"
        confirmLabel="Mark as paid"
        multiline={false}
        pending={markPaid.isPending}
        onConfirm={(v) => markPaid.mutate(v)}
      />
      <TextPromptDialog
        open={dialog === "undo"}
        onOpenChange={(o) => !o && close()}
        title={`Undo payment on ${invoice.invoiceNo}?`}
        description="Only possible while none of this package's hours were used. The student may be removed from upcoming lessons."
        label="Reason"
        placeholder="e.g. Transfer bounced"
        confirmLabel="Undo payment"
        destructive
        pending={undo.isPending}
        onConfirm={(v) => undo.mutate(v)}
      />
      <TextPromptDialog
        open={dialog === "void"}
        onOpenChange={(o) => !o && close()}
        title={`Void ${invoice.invoiceNo}?`}
        description="The invoice can't be paid afterwards. If the student never paid for this class, their seat is released."
        label="Reason"
        placeholder="e.g. Student withdrew before paying"
        confirmLabel="Void invoice"
        destructive
        pending={voidInv.isPending}
        onConfirm={(v) => voidInv.mutate(v)}
      />
      <InvoiceHistoryDialog invoice={invoice} open={dialog === "history"} onOpenChange={(o) => !o && close()} />
    </>
  );
}

function InvoiceHistoryDialog({
  invoice,
  open,
  onOpenChange,
}: {
  invoice: InvoiceLike;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const history = useQuery({
    queryKey: ["invoice-history", invoice.id],
    queryFn: () => unwrap(api.GET("/admin/invoices/{id}/history", { params: { path: { id: invoice.id } } })),
    enabled: open,
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{invoice.invoiceNo} history</DialogTitle>
          <DialogDescription>Every payment action on this invoice, oldest first.</DialogDescription>
        </DialogHeader>
        {history.isPending ? (
          <LoadingRows rows={2} />
        ) : history.data?.history.length ? (
          <ol className="space-y-3">
            {history.data.history.map((h, i) => {
              const after = (h.after ?? {}) as Record<string, unknown>;
              const note = (after.reason ?? after.paymentReference) as string | undefined;
              return (
                <li key={i} className="border-l-2 border-accent pl-3 text-sm">
                  <p className="font-medium">{humanize(h.action)}</p>
                  <p className="text-muted-foreground">
                    {h.actorName} ({h.actorRole}) · {formatDateTime(h.createdAt)}
                  </p>
                  {note && <p className="mt-0.5">“{note}”</p>}
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="text-sm text-muted-foreground">No recorded actions yet.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Issue a new package invoice for an existing enrollment (default hours at the current rate). */
export function IssuePackageButton({
  enrollmentId,
  studentName,
  className,
  defaultHours,
  disabled,
  size = "sm",
}: {
  enrollmentId: string;
  studentName: string;
  className: string;
  defaultHours: number;
  disabled?: boolean;
  size?: "sm" | "default";
}) {
  const issue = useMutation({
    mutationFn: () => unwrap(api.POST("/admin/enrollments/{id}/packages", { params: { path: { id: enrollmentId } }, body: {} })),
    onSuccess: (r) =>
      toast.success(`${r.invoice.invoiceNo} issued to ${studentName}`, {
        description: `${r.invoice.hours}h package for ${className} · ${formatIDR(r.invoice.amount)}`,
      }),
  });
  return (
    <Button
      variant="outline"
      size={size}
      disabled={disabled || issue.isPending}
      onClick={() => issue.mutate()}
      title={disabled ? "There is already an unpaid package" : `Issue a ${defaultHours}h package invoice`}
    >
      {issue.isPending ? <Spinner /> : <PackagePlus />}
      Issue package
    </Button>
  );
}
