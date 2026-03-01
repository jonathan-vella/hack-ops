# HackOps — UI Page Inventory

> Every page and route in the HackOps application.
> Each entry lists the path, role requirement, layout,
> key components, data dependencies, and interaction flows.
>
> Source of truth for frontend builders. Import types from
> `packages/shared/types/api-contract.ts`.

---

## Route Map

| Route               | Role Required | Render | Layout   | Description                      |
| ------------------- | ------------- | ------ | -------- | -------------------------------- |
| `/`                 | None (public) | SSR    | Minimal  | Landing / login redirect         |
| `/join`             | Authenticated | CSR    | Centered | Hacker onboarding via event code |
| `/dashboard`        | Any role      | CSR    | Shell    | Role-scoped dashboard            |
| `/leaderboard/:id`  | Authenticated | SSR    | Shell    | Live leaderboard for a hackathon |
| `/admin/hackathons` | Admin         | CSR    | Admin    | Hackathon lifecycle management   |
| `/admin/teams`      | Admin         | CSR    | Admin    | Team management and reassignment |
| `/admin/rubrics`    | Admin         | CSR    | Admin    | Rubric CRUD and activation       |
| `/admin/audit`      | Admin         | CSR    | Admin    | Paginated audit trail viewer     |
| `/admin/roles`      | Admin         | CSR    | Admin    | Role management and invitations  |
| `/admin/config`     | Admin         | CSR    | Admin    | App-wide configuration settings  |

---

## Layouts

### Minimal Layout

Used for unauthenticated or pre-role pages. No sidebar,
no navigation. Centers content vertically and horizontally.

- **Components**: Logo, `Card`
- **Pages**: `/`

### Centered Layout

Authenticated but pre-dashboard pages. Shows the user's
avatar and a simple header, no sidebar navigation.

- **Components**: `Card`, `Button`, user avatar
- **Pages**: `/join`

### Shell Layout

Standard authenticated layout with top navigation bar,
optional sidebar, and breadcrumbs. Role-aware navigation
hides links the user cannot access.

- **Components**: `Navbar`, `Sidebar` (optional), `Breadcrumb`,
  user menu with role badge
- **Pages**: `/dashboard`, `/leaderboard/:id`

### Admin Layout

Extends Shell Layout with a persistent sidebar listing all
admin pages. Only rendered for Admin role users.

- **Components**: `AdminSidebar`, `Navbar`, `Breadcrumb`,
  notification badge for pending submissions
- **Pages**: All `/admin/*` routes

---

## Page Specifications

### `/` — Landing Page

| Field      | Value          |
| ---------- | -------------- |
| **Route**  | `/`            |
| **File**   | `app/page.tsx` |
| **Role**   | None (public)  |
| **Render** | SSR            |
| **Layout** | Minimal        |

**Description**: If the user is not authenticated, redirect
to GitHub OAuth login via Easy Auth. If already
authenticated, redirect to `/dashboard`.

**Key components**:

- Logo / branding
- `Button` — "Sign in with GitHub" (triggers OAuth redirect)
- Loading spinner during auth check

**Data dependencies**: None (auth state only).

**Interaction flow**:

1. User navigates to `/`
2. Middleware checks auth headers
3. If unauthenticated → show login CTA (or auto-redirect)
4. If authenticated → redirect to `/dashboard`

**User stories**: US-001

---

### `/join` — Hacker Onboarding

| Field      | Value                                 |
| ---------- | ------------------------------------- |
| **Route**  | `/join`                               |
| **File**   | `app/join/page.tsx`                   |
| **Role**   | Authenticated (any, no role required) |
| **Render** | CSR                                   |
| **Layout** | Centered                              |

**Description**: Hacker self-service onboarding. Enter a
4-digit event code to join a hackathon. On success, a
hacker profile is created and the user is redirected to
`/dashboard`.

**Key components**:

- `Card` — join form container
- `Input` — 4-digit event code field (numeric, maxLength 4)
- `Button` — "Join Hackathon" submit
- Inline validation error display
- Success confirmation with hackathon name and team status

**Data dependencies**:

| API Endpoint     | Type  | Contract              |
| ---------------- | ----- | --------------------- |
| `POST /api/join` | Write | `JoinAPI.JoinRequest` |

**Interaction flow**:

1. User enters 4-digit event code
2. Client validates format (4 digits, `1000`–`9999`)
3. Submit calls `POST /api/join` with `{ eventCode }`
4. On success → show confirmation → redirect to `/dashboard`
5. On error → show inline error (invalid code, already joined,
   rate limited)

**User stories**: US-021, US-023, US-024, US-025

---

### `/dashboard` — Role-Scoped Dashboard

| Field      | Value                    |
| ---------- | ------------------------ |
| **Route**  | `/dashboard`             |
| **File**   | `app/dashboard/page.tsx` |
| **Role**   | Any authenticated role   |
| **Render** | CSR                      |
| **Layout** | Shell                    |

**Description**: The main dashboard, rendered differently
based on the user's role. Hacker, Coach, and Admin each
see a tailored view.

#### Admin Dashboard

**Key components**:

- `Card` — summary cards (active hackathons count, total
  teams, pending submissions count, recent audit entries)
- `Table` — hackathon list with status badges
- `Badge` — notification count for pending items
- Quick-action buttons (create hackathon, view audit)

**Data dependencies**:

| API Endpoint                          | Type | Contract                     |
| ------------------------------------- | ---- | ---------------------------- |
| `GET /api/hackathons`                 | Read | `HackathonsAPI.ListRequest`  |
| `GET /api/submissions?status=pending` | Read | `SubmissionsAPI.ListRequest` |
| `GET /api/audit/:hackathonId`         | Read | `AuditAPI.ListRequest`       |

**User stories**: US-064

#### Coach Dashboard

**Key components**:

- `Card` — pending review count per hackathon
- `Table` — pending submissions queue (team, challenge,
  submitted time)
- Hackathon selector dropdown
- Quick link to leaderboard

**Data dependencies**:

| API Endpoint                          | Type | Contract                     |
| ------------------------------------- | ---- | ---------------------------- |
| `GET /api/hackathons`                 | Read | `HackathonsAPI.ListRequest`  |
| `GET /api/submissions?status=pending` | Read | `SubmissionsAPI.ListRequest` |

#### Hacker Dashboard

**Key components**:

- `Card` — team info (name, members list)
- Challenge progress bar with lock/unlock indicators
- Current challenge details (Markdown rendered)
- `Button` — "Submit Evidence" for current challenge
- `Badge` — submission state (pending, approved, rejected)
- Link to leaderboard

**Data dependencies**:

| API Endpoint           | Type | Contract                     |
| ---------------------- | ---- | ---------------------------- |
| `GET /api/progression` | Read | `ProgressionAPI.GetRequest`  |
| `GET /api/challenges`  | Read | `ChallengesAPI.ListRequest`  |
| `GET /api/teams`       | Read | `TeamsAPI.ListRequest`       |
| `GET /api/submissions` | Read | `SubmissionsAPI.ListRequest` |

**User stories**: US-020

**Interaction flow**:

1. Page loads, resolves user role from session
2. Renders role-specific dashboard variant
3. Admin sees overview + quick actions
4. Coach sees pending review queue
5. Hacker sees team, challenges, and submission status

---

### `/leaderboard/:id` — Live Leaderboard

| Field      | Value                             |
| ---------- | --------------------------------- |
| **Route**  | `/leaderboard/:id`                |
| **File**   | `app/leaderboard/[id]/page.tsx`   |
| **Role**   | Authenticated                     |
| **Render** | SSR (initial), CSR (auto-refresh) |
| **Layout** | Shell                             |

**Description**: SSR-rendered leaderboard showing ranked
teams with approved scores. Client component wraps the
table for auto-refresh polling every 30 seconds.

**Key components**:

- `Table` — ranked team rows (rank, team name, total score,
  grade badge, award badges)
- `Badge` — grade badges (A/B/C/D) with colour variants
- `Badge` — award badges ("Fastest", "Highest per Category",
  "Perfect Score")
- Expandable row → per-challenge score breakdown with
  timestamps and reviewer info
- Auto-refresh indicator (countdown to next poll)
- `Select` — hackathon selector (if user is in multiple)

**Data dependencies**:

| API Endpoint                        | Type | Contract                             |
| ----------------------------------- | ---- | ------------------------------------ |
| `GET /api/leaderboard/:hackathonId` | Read | `LeaderboardAPI.LeaderboardResponse` |

**Interaction flow**:

1. SSR fetches leaderboard data at request time
2. Page renders ranked table with grade/award badges
3. Client component mounts, starts polling every 30s
   (`useSWR` with `refreshInterval`)
4. User clicks a team row → expands to show per-challenge
   breakdown
5. Hackathon selector switches between events

**User stories**: US-041 through US-048

---

### `/admin/hackathons` — Hackathon Lifecycle

| Field      | Value                           |
| ---------- | ------------------------------- |
| **Route**  | `/admin/hackathons`             |
| **File**   | `app/admin/hackathons/page.tsx` |
| **Role**   | Admin                           |
| **Render** | CSR                             |
| **Layout** | Admin                           |

**Description**: Full CRUD for hackathon events. Create new
hackathons, launch (draft → active), and archive
(active → archived). Displays event codes and team counts.

**Key components**:

- `Table` — hackathon list (name, status, event code,
  team count, hacker count, actions)
- `Badge` — status indicator (draft/active/archived)
- `Dialog` — create hackathon form
  - `Input` — hackathon name
  - `Textarea` — description (optional)
  - `Input` — team size (number, default from config)
- `Button` — "Launch" (draft → active), "Archive"
  (active → archived)
- Confirmation `Dialog` for destructive actions (archive)

**Data dependencies**:

| API Endpoint                            | Type  | Contract                           |
| --------------------------------------- | ----- | ---------------------------------- |
| `GET /api/hackathons`                   | Read  | `HackathonsAPI.ListRequest`        |
| `POST /api/hackathons`                  | Write | `HackathonsAPI.CreateRequest`      |
| `PATCH /api/hackathons/:id`             | Write | `HackathonsAPI.UpdateRequest`      |
| `POST /api/hackathons/:id/assign-teams` | Write | `HackathonsAPI.AssignTeamsRequest` |

**Interaction flow**:

1. Page loads hackathon list
2. Admin clicks "Create" → `Dialog` opens → submits form
3. New hackathon appears in list with status `draft`
4. Admin clicks "Launch" → status changes to `active`,
   event code becomes usable
5. Admin clicks "Assign Teams" → triggers Fisher-Yates
   shuffle, shows result count
6. Admin clicks "Archive" → confirmation dialog → status
   changes to `archived`

**User stories**: US-009 through US-014, US-060

---

### `/admin/teams` — Team Management

| Field      | Value                      |
| ---------- | -------------------------- |
| **Route**  | `/admin/teams`             |
| **File**   | `app/admin/teams/page.tsx` |
| **Role**   | Admin                      |
| **Render** | CSR                        |
| **Layout** | Admin                      |

**Description**: View teams for a selected hackathon.
Shows team members, submission status per team, and
supports drag-and-drop hacker reassignment between teams.

**Key components**:

- `Select` — hackathon filter (required)
- `Card` — team cards showing members and submission status
- Drag-and-drop zones for hacker reassignment
- `Badge` — submission status per team (pending count,
  approved count)
- Confirmation `Dialog` for reassignment

**Data dependencies**:

| API Endpoint                    | Type  | Contract                    |
| ------------------------------- | ----- | --------------------------- |
| `GET /api/teams`                | Read  | `TeamsAPI.ListRequest`      |
| `GET /api/hackathons`           | Read  | `HackathonsAPI.ListRequest` |
| `PATCH /api/teams/:id/reassign` | Write | `TeamsAPI.ReassignRequest`  |

**Interaction flow**:

1. Admin selects a hackathon from the dropdown
2. Teams load as cards with member lists
3. Admin drags a hacker from one team card to another
4. Confirmation dialog appears → confirms → API call
5. UI updates to reflect the reassignment

**User stories**: US-017, US-018, US-061

---

### `/admin/rubrics` — Rubric Management

| Field      | Value                        |
| ---------- | ---------------------------- |
| **Route**  | `/admin/rubrics`             |
| **File**   | `app/admin/rubrics/page.tsx` |
| **Role**   | Admin                        |
| **Render** | CSR                          |
| **Layout** | Admin                        |

**Description**: CRUD for scoring rubrics. Create rubrics
with categories (name, description, max score), view
versions, and activate a rubric (atomic swap via pointer
document). Only one rubric can be active at a time.

**Key components**:

- `Table` — rubric list (version, category count, active
  status, created date)
- `Badge` — active/inactive indicator
- `Dialog` — create/edit rubric form
  - Dynamic category fields (add/remove categories)
  - `Input` — category name, max score
  - `Textarea` — category description
- `Button` — "Activate" (sets rubric as active)
- Version history viewer

**Data dependencies**:

| API Endpoint             | Type  | Contract                   |
| ------------------------ | ----- | -------------------------- |
| `GET /api/rubrics`       | Read  | `RubricsAPI.ListRequest`   |
| `POST /api/rubrics`      | Write | `RubricsAPI.CreateRequest` |
| `PATCH /api/rubrics/:id` | Write | `RubricsAPI.UpdateRequest` |

**Interaction flow**:

1. Page loads rubric list with active indicator
2. Admin clicks "Create" → dialog with dynamic category
   fields
3. Admin adds categories (name, description, max score)
4. Submits → new rubric appears as inactive
5. Admin clicks "Activate" on a rubric → pointer document
   updates atomically → old rubric deactivated

**User stories**: US-027, US-028

---

### `/admin/audit` — Audit Trail Viewer

| Field      | Value                      |
| ---------- | -------------------------- |
| **Route**  | `/admin/audit`             |
| **File**   | `app/admin/audit/page.tsx` |
| **Role**   | Admin                      |
| **Render** | CSR                        |
| **Layout** | Admin                      |

**Description**: Paginated, filterable log of all reviewer
actions (approve, reject, override). Scoped to a
hackathon. Supports filtering by action type and reviewer.

**Key components**:

- `Select` — hackathon filter (required)
- `Select` — action type filter (all, approve, reject,
  override)
- `Table` — audit entries (timestamp, action, target,
  performed by, reason)
- Pagination controls (next/previous using continuation
  tokens)

**Data dependencies**:

| API Endpoint                  | Type | Contract               |
| ----------------------------- | ---- | ---------------------- |
| `GET /api/audit/:hackathonId` | Read | `AuditAPI.ListRequest` |

**Interaction flow**:

1. Admin selects a hackathon
2. Audit entries load in reverse chronological order
3. Admin optionally filters by action type
4. Paginate through results using next/previous controls

**User stories**: US-058, US-059

---

### `/admin/roles` — Role Management

| Field      | Value                      |
| ---------- | -------------------------- |
| **Route**  | `/admin/roles`             |
| **File**   | `app/admin/roles/page.tsx` |
| **Role**   | Admin                      |
| **Render** | CSR                        |
| **Layout** | Admin                      |

**Description**: Invite users by GitHub username and assign
Coach or Admin roles scoped to a hackathon. View and
remove existing role assignments. Primary admin is
protected from demotion.

**Key components**:

- `Select` — hackathon filter (required)
- `Table` — role list (GitHub login, role, assigned by,
  assigned date)
- `Badge` — role type (Admin, Coach, Hacker)
- `Badge` — "Primary" indicator for protected admin
- `Dialog` — invite form
  - `Input` — GitHub username
  - `Select` — role (Admin, Coach)
- `Button` — "Remove" (disabled for primary admin)

**Data dependencies**:

| API Endpoint             | Type  | Contract                 |
| ------------------------ | ----- | ------------------------ |
| `GET /api/roles`         | Read  | `RolesAPI.ListRequest`   |
| `POST /api/roles/invite` | Write | `RolesAPI.InviteRequest` |
| `DELETE /api/roles/:id`  | Write | —                        |

**Interaction flow**:

1. Admin selects a hackathon
2. Role list loads with current assignments
3. Admin clicks "Invite" → dialog opens → enters GitHub
   username and role
4. Submit → new role appears in list
5. Admin clicks "Remove" on a role → confirmation →
   role deleted (blocked for primary admin)

**User stories**: US-055, US-056, US-057, US-063

---

### `/admin/config` — Configuration

| Field      | Value                       |
| ---------- | --------------------------- |
| **Route**  | `/admin/config`             |
| **File**   | `app/admin/config/page.tsx` |
| **Role**   | Admin                       |
| **Render** | CSR                         |
| **Layout** | Admin                       |

**Description**: App-wide settings stored in the `config`
SQL Database table. Manage leaderboard refresh interval,
max team size, and other operational parameters.

**Key components**:

- `Table` — config entries (key, current value, last
  updated, updated by)
- Inline edit controls per row
- `Input` — value editor (type-aware: number, string,
  boolean toggle)
- `Button` — "Save" per row

**Data dependencies**:

| API Endpoint             | Type  | Contract                  |
| ------------------------ | ----- | ------------------------- |
| `GET /api/config`        | Read  | —                         |
| `PATCH /api/config/:key` | Write | `ConfigAPI.UpdateRequest` |

**Interaction flow**:

1. Page loads all config entries
2. Admin clicks a value to enter edit mode
3. Admin modifies the value and clicks "Save"
4. API call updates the config container
5. UI refreshes to show updated value and timestamp

**User stories**: US-062

---

## Shared Components Reference

Components are sourced from **shadcn/ui** and customised
as needed. All components live in `apps/web/src/components/`.

| Component         | shadcn/ui Base | Custom Additions                         |
| ----------------- | -------------- | ---------------------------------------- |
| `Navbar`          | —              | Role-aware nav links, user menu, avatar  |
| `AdminSidebar`    | —              | Admin route links, pending count badges  |
| `RubricForm`      | —              | Dynamic category fields from rubric JSON |
| `GradeBadge`      | `Badge`        | A/B/C/D colour variants                  |
| `AwardBadge`      | `Badge`        | Special award icons                      |
| `SubmissionCard`  | `Card`         | Evidence display, review actions         |
| `TeamCard`        | `Card`         | Members list, drag-and-drop support      |
| `ChallengeCard`   | `Card`         | Lock/unlock state, progress indicator    |
| `HackathonPicker` | `Select`       | Hackathon dropdown used across pages     |
| `ConfirmDialog`   | `Dialog`       | Destructive action confirmation          |
| `PaginationBar`   | —              | Continuation-token-based pagination      |

---

## Component-to-Page Mapping

| Component         | Pages                                               |
| ----------------- | --------------------------------------------------- |
| `Navbar`          | All Shell/Admin layout pages                        |
| `AdminSidebar`    | All `/admin/*` pages                                |
| `HackathonPicker` | `/admin/teams`, `/admin/audit`, `/admin/roles`,     |
|                   | `/dashboard` (Coach/Admin)                          |
| `RubricForm`      | `/admin/rubrics` (create/edit),                     |
|                   | Coach review flow (score entry)                     |
| `GradeBadge`      | `/leaderboard/:id`                                  |
| `AwardBadge`      | `/leaderboard/:id`                                  |
| `SubmissionCard`  | `/dashboard` (Coach review queue)                   |
| `TeamCard`        | `/admin/teams`, `/dashboard` (Hacker)               |
| `ChallengeCard`   | `/dashboard` (Hacker)                               |
| `PaginationBar`   | `/admin/audit`, `/admin/roles`, `/admin/hackathons` |
| `ConfirmDialog`   | `/admin/hackathons` (archive), `/admin/teams`       |
|                   | (reassign), `/admin/roles` (remove)                 |
