---
description: "Build admin, hacker, and coach dashboard pages with role-scoped views and layouts"
agent: 11-App Builder
tools:
  [
    "read/readFile",
    "edit/editFiles",
    "edit/createFile",
    "edit/createDirectory",
    "search/textSearch",
    "search/fileSearch",
    "search/usages",
    "execute/runInTerminal",
    "execute/runTests",
  ]
---

# Build Dashboard Pages

Create the role-scoped dashboards: admin dashboard (hackathon
lifecycle, team management, rubric management, audit, roles,
config), hacker dashboard (challenge progress, submission
form), and coach dashboard (review queue).

## Mission

Build all remaining frontend pages from `docs/ui-pages.md`,
completing the UI layer. Each page is role-gated and uses the
appropriate layout (Shell, Admin, or Centered).

## Scope & Preconditions

- **Prerequisite**: app-07-leaderboard completed — SSR page
  pattern established, shared components exist
- **Plan reference**: `.github/prompts/plan-hackOps.prompt.md`
  — read Phases 6, 9, 10 for feature context
- **UI spec**: `docs/ui-pages.md` — **SOURCE OF TRUTH** for
  all page specifications
- **API contract**: `packages/shared/types/api-contract.ts`
  — all API namespaces for data fetching
- **Skills**: Read `nextjs-patterns` (layouts, client/server
  components), `shadcn-ui-patterns` (component catalog),
  `hackops-domain` (role-based views)

## Workflow

### Step 1 — Read context

1. `docs/ui-pages.md` — all 10 page specifications
2. `packages/shared/types/api-contract.ts` — response types
3. `docs/prd.md` — user personas and stories
4. `.github/skills/nextjs-patterns/SKILL.md`
5. `.github/skills/shadcn-ui-patterns/SKILL.md`
6. `.github/skills/hackops-domain/SKILL.md`

### Step 2 — Create layouts

In `apps/web/src/app/`:

1. **Root layout** — already exists from scaffold; verify
   Tailwind, fonts, metadata
2. **Shell layout** — create layout group for authenticated
   pages: navbar, optional sidebar, breadcrumbs, user menu
   with role badge
3. **Admin layout** — extends Shell with persistent sidebar
   listing all admin pages, notification badge for pending
   submissions
4. **Centered layout** — for pre-dashboard pages (join)

### Step 3 — Landing page (`/`)

Update `apps/web/src/app/page.tsx`:

1. If unauthenticated → show "Sign in with GitHub" button
   (triggers Easy Auth OAuth redirect)
2. If authenticated → redirect to `/dashboard`
3. Minimal layout, centered content

### Step 4 — Join page (`/join`)

Create `apps/web/src/app/join/page.tsx`:

1. Centered layout
2. Input field for 4-digit event code
3. Submit calls `POST /api/join`
4. Success → redirect to `/dashboard`
5. Error → show error message (invalid code, already joined)

### Step 5 — Dashboard page (`/dashboard`)

Create `apps/web/src/app/dashboard/page.tsx`:

1. Shell layout
2. Role-scoped content:
   - **Admin**: quick stats (active hackathons, pending
     submissions, total hackers), links to admin pages
   - **Coach**: assigned hackathons, pending review count,
     link to review queue
   - **Hacker**: current team, challenge progress bar,
     submission form link, leaderboard link

### Step 6 — Admin hackathon management (`/admin/hackathons`)

Create `apps/web/src/app/admin/hackathons/page.tsx`:

1. Admin layout
2. List hackathons with status badges
3. Create hackathon form (Dialog)
4. Launch / archive actions with confirmation
5. Show event code for active hackathons

### Step 7 — Admin team management (`/admin/teams`)

Create `apps/web/src/app/admin/teams/page.tsx`:

1. Admin layout
2. Select hackathon → show teams with members
3. Assign teams button (triggers Fisher-Yates)
4. Manual reassignment (move hacker between teams)
5. Show per-team submission status

### Step 8 — Admin rubric management (`/admin/rubrics`)

Create `apps/web/src/app/admin/rubrics/page.tsx`:

1. Admin layout
2. List rubric versions with active indicator
3. Create new rubric version (form with dynamic categories)
4. Activate a rubric version (with confirmation)
5. `<RubricForm>` component renders scoring form dynamically
   from active rubric JSON

### Step 9 — Admin audit trail (`/admin/audit`)

Create `apps/web/src/app/admin/audit/page.tsx`:

1. Admin layout
2. Paginated table of reviewer actions
3. Filters: action type, user, date range
4. Continuation token pagination (load more)

### Step 10 — Admin role management (`/admin/roles`)

Create `apps/web/src/app/admin/roles/page.tsx`:

1. Admin layout
2. List current role assignments per hackathon
3. Invite form (GitHub username + role)
4. Remove role (with primary admin protection)

### Step 11 — Admin config (`/admin/config`)

Create `apps/web/src/app/admin/config/page.tsx`:

1. Admin layout
2. Display current config values
3. Editable fields for non-read-only keys
4. Save button with confirmation

### Step 12 — Shared components

Create reusable components in `apps/web/src/components/`:

- `navbar.tsx` — top navigation, user menu, role badge
- `sidebar.tsx` — admin sidebar with page links
- `breadcrumb.tsx` — route-aware breadcrumbs
- `submission-form.tsx` — hacker evidence submission
- `review-card.tsx` — coach submission review card
- `challenge-card.tsx` — challenge with lock/unlock state
- `progress-bar.tsx` — team challenge progress
- `rubric-form.tsx` — dynamic scoring form from rubric JSON
- `status-badge.tsx` — hackathon/submission status badges
- `empty-state.tsx` — placeholder for empty data states
- `loading-skeleton.tsx` — loading states for data fetching

### Step 13 — Validate

1. `npm run build` — all pages build
2. `npm run type-check` — zero type errors
3. Verify route protection: admin pages return 403 for
   non-admin roles
4. `app-review-subagent` — APPROVED

## Output Expectations

- Pages under `apps/web/src/app/` for all 10 routes
- Layouts in appropriate route groups
- Shared components in `apps/web/src/components/`
- All types imported from `@hackops/shared/types/api-contract`

## Exit Criteria

- `npm run build` succeeds with zero errors
- `app-review-subagent` APPROVED
- All routes render with correct layouts

## Quality Assurance

- [ ] All 10 pages from `docs/ui-pages.md` implemented
- [ ] Role-based navigation hides inaccessible links
- [ ] Admin pages use Admin layout with sidebar
- [ ] Hacker dashboard shows challenge progress
- [ ] Coach dashboard shows review queue
- [ ] Join page validates 4-digit event code format
- [ ] Forms use Zod validation on client side
- [ ] Loading states shown during data fetching
- [ ] Empty states shown for no-data scenarios
- [ ] All components use shadcn/ui primitives
- [ ] Responsive design works on mobile
