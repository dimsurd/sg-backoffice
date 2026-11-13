# Star Generation — Back Office

Admin web app for group class enrollment and billing. It covers:
- **Money dashboard**: unpaid invoices with aging, students low on hours, and class profitability
- **Classes**: rates, capacity, tutor
- **Students**: hours balances
- **Invoices**: mark paid, undo, void, history
- **Lessons**
- **Logbook review**: earnings preview → approve or request changes
- **Tutor earnings**

> Setup, seeded logins, architecture and decisions live in the API repo: **[sg-api](https://github.com/dimsurd/sg-api)**.
> The student & tutor PWA is **[sg-app](https://github.com/dimsurd/sg-app)**.

## Run

The API must be running on `http://localhost:4000` (see sg-api's README).

```bash
pnpm install
pnpm dev            # http://localhost:3001
```

Sign in with `admin@stargeneration.test` / `Password123!`.

| Script | |
|---|---|
| `pnpm dev` / `pnpm build` / `pnpm start` | Next.js on port 3001 |
| `pnpm typecheck`, `pnpm lint` | Static checks |
| `pnpm gen:api` | Regenerate `src/lib/api/schema.d.ts` from the running API's `openapi.yaml` |

`API_URL` (default `http://localhost:4000`) is where `/api/*` is proxied.

## Stack

Next.js 16 (App Router), TypeScript, Tailwind CSS 4, shadcn/ui (Radix), TanStack Query, react-hook-form + zod, and `openapi-fetch` with types generated from the API contract.

## Layout

```
src/
  app/(admin)/        dashboard, classes, students, invoices, lessons, logbooks, earnings
  app/login/          sign-in
  components/ui/      shadcn components (themed via tokens in app/globals.css)
  components/         app shell, ui-kit (status badges, stat cards, states), money actions, dialogs
  lib/api/            typed API client + generated schema
  lib/format.ts       IDR, durations, WIB dates
  proxy.ts            redirects to /login without a session (the API still checks every call)
```
