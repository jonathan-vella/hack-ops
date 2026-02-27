---
name: nextjs-patterns
description: Next.js 15+ App Router patterns for the HackOps platform. Covers route handlers, server/client components, middleware, layouts, and data fetching. Use when building pages, API routes, or debugging Next.js behavior. Keywords: Next.js, App Router, route handler, server component, client component, middleware, layout, RSC.
---

# Next.js Patterns

Next.js 15+ App Router conventions for the HackOps platform.
The app runs on Next.js 16 with `output: "standalone"`.

## When to Use This Skill

- Creating new pages or layouts
- Building API route handlers
- Debugging server/client component boundaries
- Implementing middleware or data fetching patterns

## App Router File Conventions

| File            | Purpose                         | Runs on      |
| --------------- | ------------------------------- | ------------ |
| `page.tsx`      | Route page component            | Server (RSC) |
| `layout.tsx`    | Shared layout wrapping children | Server (RSC) |
| `route.ts`      | API route handler (no UI)       | Server       |
| `loading.tsx`   | Suspense fallback               | Server (RSC) |
| `error.tsx`     | Error boundary                  | Client       |
| `not-found.tsx` | 404 fallback                    | Server (RSC) |

## Route Handler Pattern

```typescript
import { NextResponse } from "next/server";
import type { ApiResponse } from "@hackops/shared";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  // ... fetch data
  return NextResponse.json<ApiResponse<T>>({ data: result, ok: true });
}
```

### Key Rules

- `params` is always a `Promise` in Next.js 15+ — must `await` it
- Use `NextResponse.json()` for typed responses
- Export named functions: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`
- Route handlers in `app/api/` do NOT coexist with `page.tsx`

## Server vs Client Components

| Pattern          | Directive      | Use when                               |
| ---------------- | -------------- | -------------------------------------- |
| Server Component | (default)      | Data fetching, no interactivity needed |
| Client Component | `'use client'` | Event handlers, state, browser APIs    |
| Server Action    | `'use server'` | Form submissions, mutations            |

### Rules

- Default to Server Components — only add `'use client'` when needed
- Don't pass functions as props from Server → Client components
- Use `searchParams` (a Promise in Next.js 15+) for URL query parameters
- Colocate data fetching in Server Components, pass data down as props

## Middleware

```typescript
// src/middleware.ts (root of src/)
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Runs on edge runtime for every matched route
  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*", "/((?!_next/static|_next/image|favicon.ico).*)"],
};
```

## Data Fetching

- Use `fetch()` in Server Components with Next.js caching
- For Cosmos DB, use the `@azure/cosmos` SDK directly in route handlers
- Import `getContainer()` from `@/lib/cosmos`
- Always use parameterized queries — never string interpolation

## Path Aliases

| Alias             | Resolves to             |
| ----------------- | ----------------------- |
| `@/*`             | `apps/web/src/*`        |
| `@hackops/shared` | `packages/shared/types` |

## Error Handling

```typescript
try {
  // ... business logic
} catch (error) {
  console.error("Operation failed:", error);
  return NextResponse.json<ApiResponse<never>>(
    { error: "Internal server error", ok: false },
    { status: 500 },
  );
}
```

## References

- `apps/web/next.config.ts` — Next.js configuration
- `apps/web/src/middleware.ts` — Edge middleware
- `apps/web/tsconfig.json` — path aliases
