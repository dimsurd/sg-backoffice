"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui-kit";
import { api, unwrap } from "@/lib/api/client";
import { useOnce } from "@/lib/use-once";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Enter your password"),
});
type Values = z.infer<typeof schema>;

export function LoginForm() {
  const next = useSearchParams().get("next");
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: "", password: "" } });
  const login = useMutation({
    mutationFn: (v: Values) => unwrap(api.POST("/auth/login", { body: v })),
    // Full navigation so the proxy sees the new cookie.
    onSuccess: () => window.location.assign(next && next.startsWith("/") ? next : "/"),
    meta: { silent: true }, // the error is shown inline below instead of a toast
  });

  const loginOnce = useOnce(login.mutate, login.isPending);

  return (
    <form onSubmit={form.handleSubmit((v) => loginOnce(v))} className="w-full max-w-sm space-y-6" noValidate>
      <div className="space-y-1">
        <p className="text-xs font-semibold tracking-[0.25em] text-muted-foreground lg:hidden">STAR GENERATION</p>
        <h1 className="text-2xl font-semibold">Back office sign in</h1>
        <p className="text-sm text-muted-foreground">For admins. Tutors and students use the Star Generation app.</p>
      </div>

      {login.error && (
        <Alert variant="destructive">
          <AlertDescription>{login.error.message}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" aria-invalid={!!form.formState.errors.email} {...form.register("email")} />
          {form.formState.errors.email && <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            aria-invalid={!!form.formState.errors.password}
            {...form.register("password")}
          />
          {form.formState.errors.password && (
            <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
          )}
        </div>
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={login.isPending}>
        {login.isPending && <Spinner />}
        Sign in
      </Button>

      <p className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
        Demo admin: <span className="font-medium text-foreground">admin@stargeneration.test</span> /{" "}
        <span className="font-medium text-foreground">Password123!</span>
      </p>
    </form>
  );
}
