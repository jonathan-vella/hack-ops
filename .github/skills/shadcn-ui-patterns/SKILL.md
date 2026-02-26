---
name: shadcn-ui-patterns
description: >-
  shadcn/ui component catalog and patterns for the HackOps platform. Covers
  Table (leaderboard), Form (submissions), Badge (grades/awards), Dialog
  (confirmations), Card (dashboard), and Tabs (admin) with Tailwind CSS 4
  styling conventions. Use when building or reviewing React components and UI.
---

# shadcn/ui Patterns for HackOps

Component catalog and usage patterns for the HackOps UI layer.

## Setup

shadcn/ui is not a package — it copies component source into your project:

```bash
npx shadcn@latest init
npx shadcn@latest add table form badge dialog card tabs button input label select textarea
```

Components land in `src/components/ui/`. Customize them directly.

## Component Catalog

### Table — Leaderboard, Team Lists, Audit Trail

```tsx
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table';

export function LeaderboardTable({ scores }: { scores: ScoreEntry[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-12">#</TableHead>
          <TableHead>Team</TableHead>
          <TableHead className="text-right">Score</TableHead>
          <TableHead>Grade</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {scores.map((entry, index) => (
          <TableRow key={entry.teamId}>
            <TableCell>{index + 1}</TableCell>
            <TableCell className="font-medium">{entry.teamName}</TableCell>
            <TableCell className="text-right">{entry.totalScore}</TableCell>
            <TableCell><GradeBadge grade={entry.grade} /></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

### Badge — Grade Labels, Award Indicators, Status

```tsx
import { Badge } from '@/components/ui/badge';

const gradeVariants: Record<string, string> = {
  Gold: 'bg-yellow-500 text-black',
  Silver: 'bg-gray-300 text-black',
  Bronze: 'bg-amber-700 text-white',
  Pass: 'bg-green-600 text-white',
  Fail: 'bg-red-600 text-white',
};

export function GradeBadge({ grade }: { grade: string }) {
  return (
    <Badge className={gradeVariants[grade] ?? 'bg-muted'}>
      {grade}
    </Badge>
  );
}

// Status badges for submissions
export function StatusBadge({ status }: { status: 'pending' | 'approved' | 'rejected' }) {
  const variants = {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
  };
  return <Badge className={variants[status]}>{status}</Badge>;
}
```

### Form — Submission Forms, Hackathon CRUD

```tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Form, FormControl, FormField, FormItem,
  FormLabel, FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const hackathonSchema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().max(500).optional(),
  teamSize: z.number().int().min(2).max(10),
});

type HackathonFormValues = z.infer<typeof hackathonSchema>;

export function HackathonForm({ onSubmit }: { onSubmit: (data: HackathonFormValues) => void }) {
  const form = useForm<HackathonFormValues>({
    resolver: zodResolver(hackathonSchema),
    defaultValues: { name: '', teamSize: 5 },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Hackathon Name</FormLabel>
              <FormControl><Input {...field} /></FormControl>
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

### Dialog — Confirmations, Detail Views

```tsx
'use client';

import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export function ConfirmDialog({
  title, description, onConfirm, children,
}: {
  title: string;
  description: string;
  onConfirm: () => void;
  children: React.ReactNode;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline">Cancel</Button>
          <Button onClick={onConfirm}>Confirm</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

### Card — Dashboard Metrics, Team Cards

```tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function MetricCard({
  title, value, description,
}: {
  title: string;
  value: string | number;
  description?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}
```

### Tabs — Admin Views, Multi-Section Pages

```tsx
'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function AdminTabs() {
  return (
    <Tabs defaultValue="hackathons">
      <TabsList>
        <TabsTrigger value="hackathons">Hackathons</TabsTrigger>
        <TabsTrigger value="teams">Teams</TabsTrigger>
        <TabsTrigger value="audit">Audit Trail</TabsTrigger>
      </TabsList>
      <TabsContent value="hackathons">{/* Hackathon list */}</TabsContent>
      <TabsContent value="teams">{/* Team management */}</TabsContent>
      <TabsContent value="audit">{/* Audit log viewer */}</TabsContent>
    </Tabs>
  );
}
```

## Tailwind CSS 4 Conventions

- Use CSS variables from shadcn/ui theme: `bg-background`, `text-foreground`, `border-border`
- Responsive: mobile-first with `sm:`, `md:`, `lg:` prefixes
- Dark mode: handled by shadcn/ui class strategy (`dark:` prefix)
- Spacing: use Tailwind scale (`p-4`, `gap-2`, `space-y-4`)

## Accessibility

- All interactive elements need `aria-label` or visible label text
- Dialogs manage focus trap automatically (shadcn/ui uses Radix)
- Tables need `<caption>` or `aria-label` for screen readers
- Badge text must be readable (sufficient contrast ratios)

## Learn More

| Topic               | Reference                                        |
| ------------------- | ------------------------------------------------ |
| shadcn/ui docs      | https://ui.shadcn.com/docs                       |
| Tailwind CSS v4     | https://tailwindcss.com/docs                     |
| Radix UI primitives | https://www.radix-ui.com/primitives              |
| React Hook Form     | https://react-hook-form.com/get-started          |
