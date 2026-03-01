---
name: shadcn-ui-patterns
description: shadcn/ui component patterns and Tailwind CSS v4 styling rules for the HackOps platform. Covers component usage, composition, theming, and accessibility. Use when building pages, layouts, or UI components. Keywords: shadcn, shadcn/ui, Tailwind, component, UI, dialog, form, table, card, button.
---

# shadcn/ui Patterns

Component catalog and styling conventions for the HackOps platform.
Uses shadcn/ui with Tailwind CSS v4 and CSS custom properties for
theming.

## When to Use This Skill

- Building new pages or layout sections
- Adding or customizing shadcn/ui components
- Implementing form controls, tables, or dialogs
- Theming or styling with Tailwind CSS v4

## Component Catalog

Core components installed via `npx shadcn@latest add <name>`:

| Component   | Use case                                          |
| ----------- | ------------------------------------------------- |
| `Button`    | Actions, form submits, navigation triggers        |
| `Card`      | Content containers — hackathon cards, score cards |
| `Dialog`    | Modal forms — create hackathon, invite team       |
| `Form`      | React Hook Form wrapper with Zod validation       |
| `Input`     | Text fields                                       |
| `Label`     | Form field labels                                 |
| `Select`    | Dropdown selectors — role, status, category       |
| `Table`     | Data display — teams, scores, submissions         |
| `Tabs`      | Section switching — dashboard views               |
| `Badge`     | Status indicators — hackathon state, grade        |
| `Separator` | Visual dividers                                   |
| `Skeleton`  | Loading placeholders                              |
| `Sonner`    | Toast notifications                               |

## Component Location

```text
apps/web/src/
├── components/
│   ├── ui/           # shadcn/ui primitives (auto-generated)
│   ├── hackathon/    # Domain components (cards, forms, lists)
│   ├── scoring/      # Score display, grade badges
│   ├── team/         # Team management components
│   └── layout/       # Nav, sidebar, footer
```

### Rules

- **Never edit** files in `components/ui/` directly — they are generated
- Domain components compose `ui/` primitives
- Every domain component gets its own file
- Client components use `'use client'` directive at top of file

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

## Composition Example

```tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Hackathon } from "@hackops/shared";

interface HackathonCardProps {
  hackathon: Hackathon;
}

export function HackathonCard({ hackathon }: HackathonCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{hackathon.name}</CardTitle>
          <Badge variant={statusVariant(hackathon.status)}>
            {hackathon.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{hackathon.description}</p>
      </CardContent>
    </Card>
  );
}
```

## Form Pattern

```tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const schema = z.object({
  name: z.string().min(1, "Required").max(100),
});

type FormValues = z.infer<typeof schema>;

export function CreateHackathonForm() {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "" },
  });

  async function onSubmit(values: FormValues) {
    // POST to API route
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Create</Button>
      </form>
    </Form>
  );
}
```

## Styling

- Use Tailwind CSS classes — no inline `style` objects
- Use `cn()` from `@/lib/utils` for conditional classes
- Use semantic tokens: `bg-primary`, `text-muted-foreground` — never raw hex
- Responsive: mobile-first with `sm:`, `md:`, `lg:` breakpoints
- Colors defined via CSS custom properties in `globals.css`
- Dark mode supported via `class` strategy on `<html>`

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

- Define handlers in the component body
- Avoid complex inline arrows in JSX

## Client Components

- Add `'use client'` only when the component uses hooks or event handlers
- Keep client components small — push logic to Server Components
- Never import server-only modules in client components

## Accessibility

- All form inputs need associated `<Label>` components
- Dialogs auto-manage focus trap and escape-to-close
- Use `aria-label` on icon-only buttons
- Color contrast ratios must meet WCAG AA (4.5:1 minimum)
- Keyboard navigation: focusable elements use `tabIndex`
- Screen readers: use semantic HTML (`<nav>`, `<main>`)

## Context7 Dynamic Verification

Agents MUST cross-check this skill's patterns against live documentation at
**both code generation and review time**.

### When to Verify

- Before generating code that uses patterns from this skill
- During code review passes (app-review-subagent, app-lint-subagent)

### Verification Steps

1. Call `resolve-library-id` for `shadcn/ui`
2. Call `query-docs` with topic `"shadcn components Card Dialog Form"` (5000 tokens)
3. Call `query-docs` with topic `"form react-hook-form zod resolver"` (5000 tokens)
4. Compare returned docs against skill patterns
5. If patterns changed, flag discrepancy before proceeding

### What to Cross-Check

- Component import paths (`@/components/ui/...`)
- `Form` component with `FormField`, `FormItem`, `FormControl`
- `zodResolver` integration with `useForm`
- CLI command for adding components (`npx shadcn@latest add`)

### Fallback

If Context7 is unavailable (network error, rate limit, timeout):

1. **Warn the user** that live verification was not possible
2. **Ask for confirmation** before proceeding with the skill's hardcoded patterns
3. Do NOT silently fall back — the user must acknowledge the risk

## References

- `apps/web/src/components/ui/` — shadcn/ui primitives
- `apps/web/src/app/globals.css` — theme variables
- `apps/web/src/lib/utils.ts` — `cn()` utility
- `apps/web/components.json` — shadcn/ui config
