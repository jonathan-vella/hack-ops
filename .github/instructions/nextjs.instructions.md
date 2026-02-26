---
description: 'Next.js 15 App Router file conventions, server/client boundaries, middleware chain, and route handler patterns for the HackOps web app'
applyTo: '**/apps/web/**'
---

# Next.js App Router Conventions

## File Conventions

| File            | Purpose                                | Required directive |
| --------------- | -------------------------------------- | ------------------ |
| `page.tsx`      | Route UI (required for route to exist) | —                  |
| `layout.tsx`    | Shared wrapper (persists across nav)   | —                  |
| `loading.tsx`   | Suspense fallback                      | —                  |
| `error.tsx`     | Error boundary                         | `'use client'`     |
| `not-found.tsx` | 404 UI                                 | —                  |
| `route.ts`      | API route handler (no UI)              | —                  |

## Server vs Client Boundaries

- **Default is Server Component** — add `'use client'` only when needed
- Never mark `layout.tsx` or `page.tsx` as `'use client'` — wrap interactive
  bits in a child Client Component
- `'use server'` is for Server Actions (form submissions, mutations)

## Route Groups

Use `(groupName)/` for logical grouping without URL impact:

- `(auth)/` — requires authentication
- `(public)/` — no auth required

## Dynamic Routes

In Next.js 15, `params` is a `Promise` — always `await` it:

```typescript
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
}
```

## Middleware

- Single `src/middleware.ts` file for the web app
- Parse Easy Auth headers (`x-ms-client-principal`)
- Redirect unauthenticated users to `/.auth/login/github`
- Exclude health endpoint and static assets from auth checks

## Data Fetching

- Fetch data in Server Components (not in Client Components)
- Use `revalidate` export for time-based ISR
- Use `revalidatePath()` / `revalidateTag()` for on-demand revalidation
- Never use `getServerSideProps` or `getStaticProps` (Pages Router patterns)

## Environment Variables

- Server-only: `COSMOS_DB_ENDPOINT`, `COSMOS_DB_KEY` (no `NEXT_PUBLIC_` prefix)
- Client-exposed: `NEXT_PUBLIC_APP_URL` only
- Access server env in route handlers and Server Components only
