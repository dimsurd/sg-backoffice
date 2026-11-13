import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <section className="relative hidden flex-col justify-between bg-primary p-10 text-primary-foreground lg:flex">
        <p className="text-sm font-semibold tracking-[0.25em]">STAR GENERATION</p>
        <div className="max-w-md space-y-4">
          <h2 className="text-3xl leading-tight font-semibold">
            Every student&apos;s hours, every unpaid invoice and every class margin — in one place.
          </h2>
          <p className="text-primary-foreground/70">
            Review tutor logbooks, approve earnings and keep group classes profitable without the spreadsheets.
          </p>
        </div>
        <div className="h-1 w-16 rounded-full bg-accent" />
      </section>
      <section className="flex items-center justify-center px-4 py-12">
        <Suspense>
          <LoginForm />
        </Suspense>
      </section>
    </main>
  );
}
