---
description: "React component conventions for the HackOps UI using shadcn/ui and Tailwind CSS"
applyTo: "**/components/**/*.tsx"
---

# React Component Conventions

## Component Rules

- Functional components only — no class components
- One component per file; filename matches component name
- Props defined as an `interface` (not inline `type`)
- Destructure props in the function signature

```typescript
interface HackathonCardProps {
  hackathon: Hackathon;
  onSelect?: (id: string) => void;
}

export function HackathonCard({ hackathon, onSelect }: HackathonCardProps) {
  // ...
}
```

## Directory Structure

| Directory               | Contents                                   |
| ----------------------- | ------------------------------------------ |
| `components/ui/`        | shadcn/ui primitives — never edit directly |
| `components/hackathon/` | Hackathon domain components                |
| `components/scoring/`   | Score display, grade badges                |
| `components/team/`      | Team management components                 |
| `components/layout/`    | Nav, sidebar, footer                       |

## Composition

- Compose shadcn/ui primitives into domain components
- Prefer composition over prop-drilling — use compound components
- Extract reusable patterns into `components/` subdirectories

```typescript
// Good — composes ui primitives
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function HackathonCard({ hackathon }: HackathonCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{hackathon.name}</CardTitle>
        <Badge>{hackathon.status}</Badge>
      </CardHeader>
      <CardContent>{hackathon.description}</CardContent>
    </Card>
  );
}
```

## Styling

- Use Tailwind CSS classes — no inline `style` objects
- Use `cn()` from `@/lib/utils` for conditional classes
- Use semantic tokens: `bg-primary`, `text-muted-foreground` — never raw hex
- Responsive: mobile-first with `sm:`, `md:`, `lg:` breakpoints

## Accessibility

| Requirement         | Implementation                        |
| ------------------- | ------------------------------------- |
| Form labels         | Every input has a `<Label>` component |
| Icon buttons        | Add `aria-label` attribute            |
| Color contrast      | WCAG AA minimum (4.5:1)               |
| Keyboard navigation | Focusable elements use `tabIndex`     |
| Screen readers      | Use semantic HTML (`<nav>`, `<main>`) |

## Client Components

- Add `'use client'` only when the component uses hooks or event handlers
- Keep client components small — push logic to Server Components
- Never import server-only modules in client components

## State Management

- Local state: `useState` / `useReducer`
- Server state: fetch in Server Component, pass via props
- URL state: use `useSearchParams()` for filter/pagination state
- No global state library unless complexity demands it

## Event Handlers

```typescript
// Good — handler defined in component body
function handleClick() {
  onSelect?.(hackathon.id);
}

// Bad — inline arrow in JSX for non-trivial logic
<Button onClick={() => { complexLogic(); otherThing(); }} />
```
