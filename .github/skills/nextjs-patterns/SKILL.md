---
name: nextjs-patterns
description: >-
  Next.js 15 App Router conventions for the HackOps platform. Covers route
  handlers, middleware, server vs client components, use server/use client
  boundaries, SSR patterns, error boundaries, and loading states. Use when
  building or reviewing Next.js pages, layouts, API routes, or middleware.
---

# Next.js 15 App Router Patterns

Conventions for building HackOps with Next.js 15 App Router on Azure App Service.

## Key Concepts

### Server vs Client Components

| Type             | Default? | Directive      | Use when                                  |
| ---------------- | -------- | -------------- | ----------------------------------------- |
| Server Component | Yes      | (none)         | Data fetching, no interactivity, no state |
| Client Component | No       | `'use client'` | Event handlers, useState, browser APIs    |
| Server Action    | —        | `'use server'` | Form submissions, mutations               |

**Rule**: Start with Server Components. Add `'use client'` only when the component
needs interactivity. Never mark a layout or page as `'use client'` unless absolutely
necessary — wrap the interactive part in a child Client Component instead.

### File Conventions

| File          | Purpose                                  | Renders on |
| ------------- | ---------------------------------------- | ---------- |
| `page.tsx`    | Route UI (required for route to exist)   | Server     |
| `layout.tsx`  | Shared wrapper (persists across nav)     | Server     |
| `loading.tsx` | Suspense fallback while page loads       | Server     |
| `error.tsx`   | Error boundary for the route segment     | Client     |
| `not-found.tsx` | 404 UI for `notFound()` calls          | Server     |
| `route.ts`    | API route handler (no UI)                | Server     |

### Route Groups

Use parenthesized folders to organize without affecting URLs:

```text
app/
├── (auth)/           # Requires authentication
│   ├── dashboard/
│   └── hackathons/
├── (public)/         # No auth required
│   └── leaderboard/
└── layout.tsx        # Root layout
```

## Route Handlers (API Routes)

API routes live in `app/api/` using `route.ts` files:

```typescript
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const data = await fetchData();
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  // Validate with Zod before processing
  return NextResponse.json({ id: result.id }, { status: 201 });
}
```

**HackOps conventions**:

- Import types from `@hackops/shared/types/api-contract`
- Validate input with Zod at the boundary
- Apply role guards before business logic
- Return consistent error shapes: `{ error: string, code: string }`

### Dynamic Route Parameters

```typescript
// app/api/hackathons/[id]/route.ts
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  // In Next.js 15, params is a Promise — must await
}
```

## Middleware

Single `middleware.ts` at the project root (or `src/middleware.ts`):

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Parse Easy Auth headers
  const principal = request.headers.get('x-ms-client-principal');
  if (!principal && !request.nextUrl.pathname.startsWith('/api/health')) {
    return NextResponse.redirect(new URL('/.auth/login/github', request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

## SSR Patterns

### Data Fetching in Server Components

```typescript
// app/leaderboard/[hackathonId]/page.tsx (Server Component)
export default async function LeaderboardPage({
  params,
}: {
  params: Promise<{ hackathonId: string }>;
}) {
  const { hackathonId } = await params;
  const scores = await getLeaderboard(hackathonId);
  return <LeaderboardTable scores={scores} />;
}
```

### Revalidation

```typescript
// Time-based revalidation for leaderboard
export const revalidate = 30; // Revalidate every 30 seconds

// On-demand revalidation after score changes
import { revalidatePath } from 'next/cache';
revalidatePath('/leaderboard/[hackathonId]');
```

## Error Handling

```typescript
// app/(auth)/hackathons/error.tsx
'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div>
      <h2>Something went wrong</h2>
      <button onClick={() => reset()}>Try again</button>
    </div>
  );
}
```

## Loading States

```typescript
// app/(auth)/hackathons/loading.tsx
export default function Loading() {
  return <div>Loading hackathons...</div>;
}
```

## Learn More

| Topic                | How to find                                                                   |
| -------------------- | ----------------------------------------------------------------------------- |
| App Router reference | `microsoft_docs_search(query="next.js app router azure app service")`         |
| Streaming SSR        | `microsoft_docs_search(query="next.js streaming server side rendering")`      |
| Deployment to Azure  | `microsoft_docs_search(query="deploy next.js azure app service linux")`       |
| Route handler docs   | https://nextjs.org/docs/app/building-your-application/routing/route-handlers  |
| Server Actions       | https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations |
