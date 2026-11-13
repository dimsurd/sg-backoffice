"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui-kit";

/**
 * Confirmation dialog that asks for one piece of text (a reason, a comment,
 * a payment reference). Used for every money/review action so each one leaves
 * an explanation in the audit trail.
 */
export function TextPromptDialog({
  open,
  onOpenChange,
  title,
  description,
  label,
  placeholder,
  confirmLabel,
  destructive,
  multiline = true,
  minLength = 3,
  optional = false,
  pending,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: React.ReactNode;
  label: string;
  placeholder?: string;
  confirmLabel: string;
  destructive?: boolean;
  multiline?: boolean;
  minLength?: number;
  optional?: boolean;
  pending?: boolean;
  onConfirm: (value: string) => void;
}) {
  const [value, setValue] = useState("");
  const valid = optional || value.trim().length >= minLength;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) setValue("");
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (valid) onConfirm(value.trim());
          }}
          className="grid gap-4"
        >
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="prompt-value">
              {label}
              {optional && <span className="font-normal text-muted-foreground"> (optional)</span>}
            </Label>
            {multiline ? (
              <Textarea
                id="prompt-value"
                value={value}
                placeholder={placeholder}
                onChange={(e) => setValue(e.target.value)}
                rows={3}
                autoFocus
              />
            ) : (
              <Input id="prompt-value" value={value} placeholder={placeholder} onChange={(e) => setValue(e.target.value)} autoFocus />
            )}
            {!optional && value.length > 0 && !valid && (
              <p className="text-xs text-destructive">Please write at least {minLength} characters.</p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!valid || pending}
              className={destructive ? "bg-destructive text-white hover:bg-destructive/90" : undefined}
            >
              {pending && <Spinner />}
              {confirmLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
