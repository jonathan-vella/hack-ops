---
description: 'Build SSR leaderboard page with auto-refresh, expandable rows, grade badges, and award badges'
agent: 13-Frontend Builder
tools:
  [
    'read/readFile',
    'edit/editFiles',
    'edit/createFile',
    'edit/createDirectory',
    'search/textSearch',
    'search/fileSearch',
    'search/usages',
    'execute/runInTerminal',
    'execute/runTests',
  ]
---

# Build Leaderboard Page

Create the SSR leaderboard page showing ranked teams with
approved scores, auto-refreshing every 30 seconds, expandable
rows for per-challenge breakdown, grade badges, and award
badges.

## Mission

Build the leaderboard API route and frontend page at
`/leaderboard/:id` — the most visible feature of HackOps.
Server-rendered for fast first paint and shareable URLs,
with client-side polling for live updates.

## Scope & Preconditions

- **Prerequisite**: app-06-api-admin completed — all API
  routes work, scores exist in the `scores` container
- **Plan reference**: `.github/prompts/plan-hackOps.prompt.md`
  — read `Phase 8: Leaderboard & Live Updates`
- **API contract**: `packages/shared/types/api-contract.ts`
  — `LeaderboardAPI` namespace
- **UI spec**: `docs/ui-pages.md` — `/leaderboard/:id` page
  specification
- **Skills**: Read `nextjs-patterns` (SSR + client hydration),
  `shadcn-ui-patterns` (Badge, Table components),
  `hackops-domain` (grade thresholds, award rules)

## Workflow

### Step 1 — Read context

1. `packages/shared/types/api-contract.ts` — leaderboard types
2. `docs/ui-pages.md` — leaderboard page specification
3. `docs/data-model.md` — `scores` container, aggregation
4. `docs/prd.md` — leaderboard success metrics (< 2s load)
5. `.github/skills/nextjs-patterns/SKILL.md`
6. `.github/skills/shadcn-ui-patterns/SKILL.md`
7. `.github/skills/hackops-domain/SKILL.md` — grade and
   award badge rules

### Step 2 — Leaderboard API route

Create `apps/web/src/app/api/leaderboard/[hackathonId]/route.ts`:

- `GET /api/leaderboard/:hackathonId` (authenticated) —
  aggregate approved scores by team, rank by total score
  descending. Compute:
  - **Grade badges**: A/B/C/D based on rubric thresholds
  - **Award badges**: "Fastest to Complete", "Highest Score
    per Challenge", "Perfect Score"
  - **Tiebreaker**: earliest last-approval timestamp wins
- Return `LeaderboardEntry[]` with team name, total score,
  per-challenge breakdown, grade, awards

### Step 3 — SSR leaderboard page

Create `apps/web/src/app/leaderboard/[id]/page.tsx`:

1. **Server component** for initial render — fetch leaderboard
   data server-side for fast first paint and SEO/shareable URL
2. Use Shell layout with navbar and breadcrumbs
3. Display hackathon name and status in header

### Step 4 — Auto-refresh client component

Create `apps/web/src/components/leaderboard-table.tsx`:

1. Client component wrapping the leaderboard table
2. Poll `/api/leaderboard/:id` every 30 seconds using
   SWR `refreshInterval` or React Query
3. Smooth transitions when data updates (no flash)
4. Show "Last updated" timestamp

### Step 5 — Expandable rows

In the leaderboard table:

1. Click a team row to expand
2. Expanded view shows per-challenge score breakdown:
   challenge name, score, max possible, submission timestamp,
   reviewer info
3. Use shadcn/ui `Table` with collapsible rows

### Step 6 — Grade badges

Create `apps/web/src/components/grade-badge.tsx`:

1. shadcn/ui `Badge` with color variants:
   - A: green, B: blue, C: yellow, D: red
2. Grade thresholds derived from active rubric total:
   - A: >= 90%, B: >= 75%, C: >= 60%, D: < 60%

### Step 7 — Award badges

Create `apps/web/src/components/award-badge.tsx`:

1. Special badges displayed next to team names:
   - "Fastest to Complete" — first team to have all
     challenges approved
   - "Highest Score per Challenge" — top scorer per
     individual challenge
   - "Perfect Score" — team with 100% on any challenge

### Step 8 — Validate

1. `npm run build` — page builds with zero errors
2. `npm run type-check` — zero type errors
3. Verify SSR: page renders server-side HTML
4. Verify auto-refresh: data updates without page reload

## Output Expectations

- API route: `apps/web/src/app/api/leaderboard/[hackathonId]/route.ts`
- Page: `apps/web/src/app/leaderboard/[id]/page.tsx`
- Components: `leaderboard-table.tsx`, `grade-badge.tsx`,
  `award-badge.tsx`
- All types imported from `@hackops/shared/types/api-contract`

## Exit Criteria

- `npm run build` succeeds with zero errors
- No type errors
- `app-security-challenger-subagent` (focus: `data-handling`)
  — no data exposure issues

## Quality Assurance

- [ ] SSR renders complete HTML server-side
- [ ] Auto-refresh polls every 30s without page reload
- [ ] Expandable rows show per-challenge breakdown
- [ ] Grade badges use correct color mapping and thresholds
- [ ] Award badges computed correctly
- [ ] Tiebreaker uses earliest last-approval timestamp
- [ ] Only approved scores shown (no pending/rejected)
- [ ] Leaderboard is hackathon-scoped
