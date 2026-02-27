---
description: "Next.js App Router conventions for the HackOps web application"
applyTo: "**/apps/web/**"
---

# Next.js Conventions

## App Router File Structure

| File            | Purpose                       | Directive      |
| --------------- | ----------------------------- | -------------- |
| `page.tsx`      | Route page (Server Component) | —              |
| `layout.tsx`    | Shared layout                 | —              |
| `route.ts`      | API route handler             | —              |
| `loading.tsx`   | Suspense fallback             | —              |
| `error.tsx`     | Error boundary                | `'use client'` |
| `not-found.tsx` | 404 fallback                  | —              |

- `route.ts` and `page.tsx` must NOT coexist in the same directory
- API routes go under `src/app/api/`
- Pages go under `src/app/(dashboard)/` or similar route groups

## Server vs Client Boundary

```typescript
// Default: Server Component (no directive needed)
export default function Page() { ... }

// Client Component: add directive at top of file
'use client';
export function InteractiveWidget() { ... }
```

| Use Server Component when        | Use Client Component when               |
| -------------------------------- | --------------------------------------- |
| Fetching data                    | Event handlers (`onClick`, `onChange`)  |
| Accessing backend resources      | `useState`, `useEffect`, `useRef`       |
| Rendering static/dynamic content | Browser APIs (`localStorage`, `window`) |

- Default to Server Components — add `'use client'` only when needed
- Never pass functions as props from Server → Client boundary
- Keep client components as small/leaf-level as possible

## Route Handlers

```typescript
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  // ...
}
```

- `params` is a `Promise` in Next.js 15+ — always `await` it
- `searchParams` in pages is also a `Promise` — always `await` it
- Export named HTTP method functions: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`

## Middleware

- Single `src/middleware.ts` at the `src` root
- Use `matcher` config to scope — avoid running on static assets
- Edge runtime only — no Node.js-specific APIs

## Data Fetching

- Fetch data in Server Components or route handlers
- Use `@/lib/cosmos` for Cosmos DB access
- No client-side data fetching for initial page loads

## Path Aliases

| Alias             | Resolves to             |
| ----------------- | ----------------------- |
| `@/*`             | `apps/web/src/*`        |
| `@hackops/shared` | `packages/shared/types` |

## Configuration

- `output: "standalone"` in `next.config.ts` for container deployment
- Environment variables: use `NEXT_PUBLIC_` prefix only for client-side values
- Server-only secrets: access via `process.env` in route handlers and Server Components
