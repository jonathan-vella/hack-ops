---
description: 'React component conventions: functional components, props interfaces, shadcn/ui patterns, composition, and accessibility for HackOps UI components'
applyTo: '**/components/**/*.tsx'
---

# React Component Conventions

## Component Structure

- Functional components only — no class components
- Export a named function (not default export for components)
- Define and export a `Props` interface for every component

```typescript
export interface MetricCardProps {
  title: string;
  value: string | number;
  description?: string;
}

export function MetricCard({ title, value, description }: MetricCardProps) {
  return (/* ... */);
}
```

## Composition Over Inheritance

- Build complex UI by composing smaller components
- Use `children` prop for flexible container components
- Use render props or slots only when composition is insufficient

## shadcn/ui Usage

- Use shadcn/ui primitives for all standard UI elements
- Import from `@/components/ui/` (project-local copies)
- Do not wrap shadcn/ui components in unnecessary abstractions
- Customize via Tailwind classes, not component prop overrides

## Styling

- Tailwind CSS utility classes only — no CSS modules or styled-components
- Use `cn()` helper (from shadcn/ui) for conditional classes
- Responsive: mobile-first with `sm:`, `md:`, `lg:` breakpoints
- Use shadcn/ui CSS variables: `bg-background`, `text-foreground`, `border-border`

## State Management

- Prefer Server Components (no state) wherever possible
- Use `useState` / `useReducer` for local Client Component state
- Lift shared state to nearest common ancestor
- No global state library — use React context sparingly

## Accessibility

- All interactive elements MUST have accessible labels
- Use semantic HTML: `<button>` not `<div onClick>`
- Images need `alt` text
- Tables need `<caption>` or `aria-label`
- Form inputs need associated `<label>` elements
- Color alone must not convey meaning — add text or icons

## File Organization

```text
components/
├── ui/                  # shadcn/ui primitives (auto-generated)
├── LeaderboardTable.tsx  # Feature-specific components
├── GradeBadge.tsx
├── SubmissionForm.tsx
└── __tests__/           # Component tests
```
