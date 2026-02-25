# HackOps — Product Requirements Document

> Azure hackathon management platform for structured MicroHack
> events. This PRD is the single source of truth for product
> requirements — it feeds the backlog, agent prompts, and
> acceptance testing.

---

## Product Vision

HackOps manages the complete lifecycle of a MicroHack event:
team registration, hacker onboarding, rubric-driven scoring,
live leaderboards, and gated challenge progression — all behind
role-based access control and a full audit trail.

The platform targets a solo-dev, local-first,
enterprise-policy-compliant deployment on Microsoft Azure. It
serves small-scale hackathon events (2–3 parallel events, 4–5
teams of 5 per event, ~75 max concurrent users) where
structured scoring and transparent progression matter more than
massive scale.

### Core Value Propositions

1. **Structured scoring** — configurable Markdown-driven
   rubrics eliminate ad-hoc spreadsheets and ensure consistent
   grading
2. **Transparent progression** — gated challenges keep teams
   aligned and prevent skipping ahead
3. **Live visibility** — auto-refreshing leaderboards with
   grade and award badges give real-time feedback
4. **Audit trail** — every reviewer action is logged with who,
   when, and why
5. **Self-service onboarding** — hackers join via a 4-digit
   event code without admin intervention

---

## Success Metrics

| Metric                                    | Target                                           | Measurement                                                                    |
| ----------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------ |
| Hackathon creation to first hacker joined | < 15 minutes                                     | Time from `POST /api/hackathons` to first successful `/api/join`               |
| Leaderboard initial page load             | < 2 seconds                                      | SSR response time at 75 concurrent users                                       |
| Scoring rubric activation                 | Zero-downtime swap                               | Pointer document atomic update; no partial reads during swap                   |
| Submission review turnaround              | 100% of submissions reviewed within event window | No orphaned `pending` submissions at hackathon archive                         |
| Audit coverage                            | 100% of reviewer actions logged                  | Every approve/reject/override has `reviewedBy`, `reviewedAt`, `reviewReason`   |
| Challenge progression accuracy            | Zero false unlocks                               | Challenge N+1 locked until Challenge N is approved                             |
| Auth enforcement                          | Zero unauthenticated data access                 | All endpoints except `/api/health` return 401 without valid session            |
| Role enforcement accuracy                 | Zero cross-role violations                       | Hacker cannot access Admin/Coach routes; Coach cannot access Admin-only routes |
| Infrastructure repeatability              | Idempotent deployments                           | Same Bicep templates produce identical resources on redeploy                   |
| Policy compliance                         | Zero `Deny` policy violations                    | `az deployment group what-if` passes clean                                     |

---

## User Personas

### Admin

- **Role**: Full control over the platform
- **Goals**:
  - Create and manage hackathon events end-to-end
  - Assign teams fairly using automated shuffle
  - Configure scoring rubrics before events begin
  - Monitor all submissions and scores across teams
  - Invite coaches and secondary admins
  - View the complete audit trail for compliance
- **Pain points**:
  - Manual team reassignments are error-prone without a
    dedicated UI
  - No visibility into reviewer actions without an audit trail
  - Rubric changes during an event risk inconsistent scoring
  - Managing multiple parallel events needs clear scoping

### Coach

- **Role**: Validate and score submissions
- **Goals**:
  - Review pending submissions efficiently
  - Approve or reject with clear reasoning
  - See team progress across challenges
  - Trust that scoring criteria are consistent
- **Pain points**:
  - No audit trail on score overrides weakens accountability
  - Switching between events and teams is confusing without
    filters
  - Unclear which submissions are waiting review

### Hacker

- **Role**: Team-scoped participant
- **Goals**:
  - Join a hackathon quickly with an event code
  - Submit scores for their team's current challenge
  - Track their team's progress and leaderboard position
  - Understand which challenges are unlocked
- **Pain points**:
  - Unclear challenge gating rules block progress
  - No feedback on why a submission was rejected
  - Cannot see how scoring rubric maps to their submission

### Anonymous

- **Role**: Unauthenticated visitor
- **Goals**: None — cannot access the platform
- **Pain points**: All routes except the health endpoint require
  authentication; Anonymous users are redirected to GitHub OAuth
  login

---

## Feature Domains

| Domain                 | Plan Phase | Description                                                               |
| ---------------------- | ---------- | ------------------------------------------------------------------------- |
| Authentication & Roles | Phase 5    | GitHub OAuth via Easy Auth, role resolution, role guards, dev auth bypass |
| Hackathon Lifecycle    | Phase 6    | Create, launch, archive hackathon events with state machine               |
| Team Management        | Phase 6    | Fisher-Yates shuffle assignment, manual reassignment                      |
| Hacker Onboarding      | Phase 6    | Event code join flow, profile creation, team auto-assignment              |
| Scoring Engine         | Phase 7    | Rubric CRUD, submission workflow, approval queue, score override          |
| Leaderboard            | Phase 8    | SSR ranked display, auto-refresh, grade badges, award badges              |
| Challenge Progression  | Phase 9    | Sequential gating, auto-unlock on approval, progress tracking             |
| Admin Operations       | Phase 10   | Role management, audit trail viewer, config management                    |

---

## User Stories

### Authentication & Roles

**US-001**: As an unauthenticated user, I want to be redirected
to GitHub OAuth login, so that I can access the platform with
my GitHub identity.

**Acceptance criteria**:

- Given I am not logged in, when I navigate to any route except
  `/api/health`, then I am redirected to GitHub OAuth.
- Given I complete the GitHub OAuth flow, when the callback
  returns, then my session contains my GitHub userId, login,
  email, and avatar.

---

**US-002**: As a logged-in user, I want my role resolved from
the roles container, so that I see only what my role permits.

**Acceptance criteria**:

- Given I am authenticated with GitHub userId `U1` for
  hackathon `H1`, when my role is looked up in the `roles`
  container, then I receive one of Admin, Coach, Hacker, or
  Anonymous.
- Given no role record exists for my userId and hackathonId,
  when the lookup completes, then my role defaults to Anonymous
  and I am blocked from all data routes.

---

**US-003**: As an Admin, I want API routes protected by role
guards, so that only authorised roles can perform actions.

**Acceptance criteria**:

- Given I have role `Hacker`, when I call `POST
/api/hackathons`, then I receive a `403 Forbidden` response.
- Given I have role `Admin`, when I call `POST
/api/hackathons`, then the request proceeds.

---

**US-004**: As a developer, I want a dev auth bypass for local
development, so that I can test without Easy Auth.

**Acceptance criteria**:

- Given `NODE_ENV=development` and `DEV_USER_ROLE=Admin` is set
  in environment variables, when I call an API route, then the
  middleware uses the dev identity instead of Easy Auth headers.
- Given `NODE_ENV=production`, when `DEV_USER_ROLE` is set,
  then the dev bypass is ignored and Easy Auth headers are
  required.

---

**US-005**: As a platform operator, I want CORS configured to
whitelist only the App Service origin, so that cross-origin
attacks are blocked.

**Acceptance criteria**:

- Given a request from `https://app-hackops-dev-x7k2m9
.azurewebsites.net`, when the CORS check runs, then the
  request is allowed.
- Given a request from `https://evil.example.com`, when the
  CORS check runs, then the request is blocked with no
  `Access-Control-Allow-Origin` header.

---

**US-006**: As a platform operator, I want rate limiting on API
endpoints, so that abuse is mitigated.

**Acceptance criteria**:

- Given an IP has made 100 requests in the last minute, when a
  101st request arrives, then a `429 Too Many Requests`
  response is returned with a `Retry-After` header.
- Given the rate limit window has reset, when a new request
  arrives, then it is processed normally.

---

**US-007**: As a platform operator, I want Zod validation on
all request bodies, so that invalid payloads are rejected at
the API boundary.

**Acceptance criteria**:

- Given a `POST /api/hackathons` request with a missing
  required field, when validation runs, then a `400 Bad
Request` response is returned with a structured error body.
- Given a valid request body, when validation runs, then the
  parsed and typed object is passed to the route handler.

---

**US-008**: As an Admin, I want the primary admin to be
protected from demotion, so that the platform always has at
least one administrator.

**Acceptance criteria**:

- Given I am a secondary Admin, when I attempt to remove the
  primary admin's role, then a `403 Forbidden` response is
  returned.
- Given I am the primary Admin, when I attempt to demote
  myself, then the request is rejected with a clear error
  message.

> Enforces invariant: Primary admin cannot be demoted.

---

### Hackathon Lifecycle

**US-009**: As an Admin, I want to create a new hackathon
event, so that I can set up a MicroHack.

**Acceptance criteria**:

- Given I provide a valid hackathon name and configuration,
  when I call `POST /api/hackathons`, then a new hackathon
  record is created in `draft` state.
- Given the hackathon is created, when the response returns,
  then it includes the hackathon ID and a unique 4-digit event
  code.

---

**US-010**: As an Admin, I want the event code auto-generated
as a unique 4-digit number, so that hackers can join easily.

**Acceptance criteria**:

- Given I create a hackathon, when the event code is generated,
  then it is a 4-digit numeric code (`0000`–`9999`) unique
  among all active hackathons.
- Given a collision with an existing active hackathon code,
  when generation detects it, then a new code is generated and
  uniqueness is re-verified.

> Enforces invariant: Event codes stored as SHA-256 hash only.

---

**US-011**: As an Admin, I want to launch a hackathon, so that
hackers can start joining and the event code becomes active.

**Acceptance criteria**:

- Given a hackathon in `draft` state, when I call `PATCH
/api/hackathons/:id` with state `active`, then the hackathon
  transitions to `active` and onboarding is enabled.
- Given a hackathon already in `active` state, when I attempt
  to launch it again, then the request is rejected with a
  `409 Conflict`.

---

**US-012**: As an Admin, I want to archive a hackathon, so that
the event is frozen and no further changes are allowed.

**Acceptance criteria**:

- Given a hackathon in `active` state, when I call `PATCH
/api/hackathons/:id` with state `archived`, then the
  leaderboard is frozen and submissions are disabled.
- Given a hackathon in `archived` state, when a Hacker attempts
  to submit a score, then a `403 Forbidden` response is
  returned.

---

**US-013**: As an Admin, I want to list all hackathons, so that
I can manage multiple events.

**Acceptance criteria**:

- Given multiple hackathons exist in various states, when I
  call `GET /api/hackathons`, then all hackathons are returned
  with their current state.
- Given I am a Coach, when I call `GET /api/hackathons`, then I
  see only hackathons where I have a role assignment.

---

**US-014**: As an Admin, I want hackathon state transitions
validated, so that invalid transitions are prevented.

**Acceptance criteria**:

- Given a hackathon in `draft` state, when I attempt to
  transition directly to `archived`, then the request is
  rejected (must go through `active` first).
- Given a hackathon in `archived` state, when I attempt to
  transition to `active`, then the request is rejected
  (archival is permanent).

---

### Team Management

**US-015**: As an Admin, I want to auto-assign hackers to teams
using Fisher-Yates shuffle, so that team composition is fair
and random.

**Acceptance criteria**:

- Given 20 unassigned hackers and a `teamSize` of 5, when I
  call `POST /api/hackathons/:id/assign-teams`, then 4 teams
  of 5 are created with hackers randomly distributed.
- Given the shuffle algorithm is Fisher-Yates, when assignment
  runs, then every hacker has an equal probability of being in
  any team.

---

**US-016**: As an Admin, I want to configure the team size, so
that I can adjust for different event formats.

**Acceptance criteria**:

- Given I set `teamSize` to 3, when team assignment runs, then
  teams are created with 3 members each (remainder hackers form
  a smaller final team).
- Given 11 hackers and `teamSize` of 5, when assignment runs,
  then 2 teams of 5 and 1 team of 1 are created.

---

**US-017**: As an Admin, I want to manually reassign a hacker
between teams, so that I can handle special circumstances.

**Acceptance criteria**:

- Given hacker `H1` is in team `T1`, when I call `PATCH
/api/teams/:id/reassign` moving `H1` to `T2`, then `H1`'s
  team record is updated to `T2`.
- Given the reassignment completes, when I query teams, then
  `T1` shows one fewer member and `T2` shows one more.

---

**US-018**: As an Admin or Coach, I want to list teams for a
hackathon, so that I can see team composition.

**Acceptance criteria**:

- Given hackathon `H1` has 4 teams, when I call `GET
/api/teams?hackathonId=H1`, then all 4 teams are returned
  with their members.
- Given I am a Hacker, when I call `GET /api/teams`, then I
  receive only my own team's information.

---

**US-019**: As an Admin, I want team assignment to only work on
unassigned hackers, so that already-assigned hackers are not
reshuffled.

**Acceptance criteria**:

- Given 10 hackers where 5 are already assigned, when I call
  assign-teams, then only the 5 unassigned hackers are
  distributed into teams.
- Given all hackers are already assigned, when I call
  assign-teams, then no changes are made and a message
  indicates all hackers are assigned.

---

**US-020**: As a Hacker, I want to see my team members, so that
I know who I am working with.

**Acceptance criteria**:

- Given I am assigned to team `T1`, when I view my dashboard,
  then I see the names and GitHub avatars of all `T1` members.
- Given I call the teams API, when results return, then I see
  only my team and cannot access other teams' member details.

---

### Hacker Onboarding

**US-021**: As a Hacker, I want to join a hackathon using a
4-digit event code, so that I can self-register without admin
help.

**Acceptance criteria**:

- Given I enter a valid event code for an active hackathon,
  when I call `POST /api/join`, then my hacker profile is
  created in the `hackers` container.
- Given I enter an invalid event code, when the hash comparison
  fails, then a `401 Unauthorized` response is returned without
  revealing whether the hackathon exists.

> Enforces invariant: Event codes stored as SHA-256 hash only.

---

**US-022**: As a Hacker, I want my GitHub identity used as my
profile, so that I do not need to fill in registration forms.

**Acceptance criteria**:

- Given I am authenticated via GitHub OAuth, when I join a
  hackathon, then my hacker profile is populated with my GitHub
  userId, login, email, and avatar.
- Given I join a second hackathon, when my profile is created,
  then each hackathon has a separate hacker record with the
  same GitHub identity.

---

**US-023**: As a Hacker, I want to be prevented from joining
the same hackathon twice, so that duplicate registrations are
avoided.

**Acceptance criteria**:

- Given I have already joined hackathon `H1`, when I call
  `POST /api/join` with `H1`'s event code again, then a
  `409 Conflict` response is returned.
- Given I am registered in `H1`, when I join `H2` with a
  different code, then a new hacker record is created for `H2`.

---

**US-024**: As a Hacker, I want to only join active hackathons,
so that I cannot register for draft or archived events.

**Acceptance criteria**:

- Given a hackathon in `draft` state, when I enter its event
  code, then the join attempt is rejected.
- Given a hackathon in `archived` state, when I enter its event
  code, then the join attempt is rejected.

---

**US-025**: As a Hacker, I want confirmation of my successful
join, so that I know I am registered.

**Acceptance criteria**:

- Given I successfully join hackathon `H1`, when the response
  returns, then it includes my hacker ID, team assignment
  status (pending if teams not yet assigned), and the hackathon
  name.
- Given teams have already been assigned, when I join late,
  then I am marked as unassigned pending the next team
  assignment run.

---

**US-026**: As an Admin, I want to see which hackers have joined
and their assignment status, so that I can manage onboarding.

**Acceptance criteria**:

- Given 15 hackers have joined hackathon `H1`, when I query
  hackers by hackathonId, then all 15 are listed with their
  team assignment status.
- Given 3 hackers are unassigned, when I view the list, then
  unassigned hackers are clearly indicated.

---

### Scoring Engine

**US-027**: As an Admin, I want to create a scoring rubric with
Markdown-driven criteria, so that scoring is structured and
consistent.

**Acceptance criteria**:

- Given I provide rubric criteria with categories, max points,
  and Markdown descriptions, when I call `POST /api/rubrics`,
  then a versioned rubric document is created.
- Given the rubric is created, when I inspect the `rubrics`
  container, then a version document (`rubric-v1`) and a
  pointer document exist.

> Enforces invariant: Score entry and grading are fully
> rubric-driven — nothing hardcoded.

---

**US-028**: As an Admin, I want to activate a rubric with
zero-downtime swap, so that the scoring criteria can be updated
atomically.

**Acceptance criteria**:

- Given rubric `v2` exists and `v1` is active, when I activate
  `v2`, then only the pointer document is updated (atomic
  swap).
- Given a concurrent read during the swap, when the consumer
  reads the pointer then fetches the referenced version, then
  they get a complete, consistent rubric (either `v1` or `v2`,
  never a partial state).

> Enforces invariant: One active rubric at a time (atomic swap
> via pointer document + versioned rubric docs).

---

**US-029**: As a Hacker, I want to submit scores for my team's
current challenge, so that my team's work is recorded.

**Acceptance criteria**:

- Given challenge `C1` is unlocked for my team, when I call
  `POST /api/submissions` with valid scores, then a submission
  is created in `pending` state.
- Given I attempt to submit for a team that is not mine, when
  the team-scoping check runs, then a `403 Forbidden` response
  is returned.

> Enforces invariant: Hackers are team-scoped; cross-team
> submission attempts return 403.

---

**US-030**: As a Hacker, I want to submit scores via a dynamic
form driven by the active rubric, so that I fill in exactly the
right fields.

**Acceptance criteria**:

- Given the active rubric has 3 categories with max points of
  10, 20, and 30, when the `<RubricForm>` component renders,
  then it shows 3 input fields with those constraints.
- Given the rubric changes, when I reload the form, then the
  new rubric structure is reflected without code changes.

---

**US-031**: As a Hacker, I want to upload scores via JSON file,
so that I can batch-submit programmatically.

**Acceptance criteria**:

- Given I upload a valid JSON file matching the active rubric
  schema, when Zod validation runs, then the submission is
  accepted.
- Given I upload a JSON file that does not match the rubric
  schema, when validation runs, then a `400 Bad Request` is
  returned with details about which fields are invalid.

---

**US-032**: As a Coach, I want to view pending submissions in a
review queue, so that I can approve or reject them.

**Acceptance criteria**:

- Given 5 submissions are in `pending` state, when I call
  `GET /api/submissions?status=pending`, then all 5 are
  returned with team info, challenge info, and submitted scores.
- Given I am a Hacker, when I call the same endpoint, then I
  can only see my own team's submissions.

---

**US-033**: As a Coach, I want to approve a submission, so that
the scores are recorded on the leaderboard.

**Acceptance criteria**:

- Given a `pending` submission, when I call `PATCH
/api/submissions/:id` with status `approved`, then scores are
  copied to the `scores` container as immutable records.
- Given the approval completes, when I check the audit fields,
  then `reviewedBy`, `reviewedAt`, and `reviewReason` are
  populated.

> Enforces invariant: Scores are immutable until approved
> (staging pattern). All reviewer actions are audited.

---

**US-034**: As a Coach, I want to reject a submission with a
reason, so that the team understands why and can resubmit.

**Acceptance criteria**:

- Given a `pending` submission, when I call `PATCH
/api/submissions/:id` with status `rejected` and a reason,
  then the submission is marked rejected and the reason is
  stored.
- Given the rejection is recorded, when the team views their
  submissions, then the rejection reason is visible.

---

**US-035**: As an Admin, I want to override an approved score,
so that I can correct errors after approval.

**Acceptance criteria**:

- Given an approved score record, when I call `PATCH
/api/scores/:id/override` with new values and a mandatory
  reason, then the score is updated and the override is audit
  logged.
- Given I am a Coach, when I attempt to override a score, then
  a `403 Forbidden` response is returned (Admin-only action).

---

**US-036**: As a platform operator, I want submissions validated
against the active rubric at the API boundary, so that invalid
scores cannot enter the system.

**Acceptance criteria**:

- Given the active rubric has a max score of 10 for category
  `Quality`, when a submission includes 15 for `Quality`, then
  it is rejected with a `400 Bad Request`.
- Given all submitted values are within rubric bounds, when
  validation passes, then the submission enters the review
  queue.

---

**US-037**: As a Coach, I want to see which submissions I have
already reviewed, so that I do not duplicate effort.

**Acceptance criteria**:

- Given I have approved 3 submissions, when I view the queue
  with a `reviewed-by-me` filter, then those 3 appear with
  their approval status.
- Given I filter for `pending` only, when the list loads, then
  only unreviewed submissions appear.

---

**US-038**: As a Hacker, I want to see the status of my team's
submissions, so that I know what has been approved or rejected.

**Acceptance criteria**:

- Given my team has 3 submissions (1 approved, 1 rejected, 1
  pending), when I view my submissions, then all 3 are listed
  with their status.
- Given a submission was rejected, when I view it, then the
  rejection reason is displayed.

---

### Leaderboard

**US-039**: As any authenticated user, I want to view the live
leaderboard for a hackathon, so that I can see team rankings.

**Acceptance criteria**:

- Given hackathon `H1` has 4 teams with approved scores, when
  I navigate to `/leaderboard/H1`, then teams are displayed
  ranked by total approved scores (highest first).
- Given the page is server-side rendered, when I load it, then
  the initial HTML contains the full leaderboard (no hydration
  flash).

---

**US-040**: As a user viewing the leaderboard, I want it to
auto-refresh every 30 seconds, so that I see live score
updates.

**Acceptance criteria**:

- Given I am on the leaderboard page, when 30 seconds elapse,
  then the leaderboard data is re-fetched and the display
  updates without a full page reload.
- Given no new scores are approved, when the refresh fires,
  then the display remains unchanged.

---

**US-041**: As a user viewing the leaderboard, I want to expand
a team's row to see per-challenge score breakdown, so that I
understand the details.

**Acceptance criteria**:

- Given team `T1` is ranked first on the leaderboard, when I
  click to expand `T1`'s row, then I see scores for each
  challenge with submission timestamps and reviewer info.
- Given I collapse the row, when the UI updates, then only the
  summary row is visible.

---

**US-042**: As a user viewing the leaderboard, I want grade
badges displayed per team, so that I can quickly assess
performance.

**Acceptance criteria**:

- Given the active rubric defines thresholds for grades A, B,
  C, and D, when a team's total score falls in the A range,
  then a green `A` badge is displayed.
- Given thresholds change when a new rubric is activated, when
  the leaderboard recalculates, then grade badges reflect the
  new thresholds.

---

**US-043**: As a user viewing the leaderboard, I want award
badges for special achievements, so that standout teams are
highlighted.

**Acceptance criteria**:

- Given team `T2` has the highest score in the `Quality`
  category, when the leaderboard renders, then `T2` shows a
  "Highest Quality" award badge.
- Given team `T3` was the fastest to complete all challenges,
  when the leaderboard renders, then `T3` shows a "Fastest
  Completion" award badge.

---

**US-044**: As a user, I want the leaderboard to show only
approved scores, so that pending or rejected submissions do not
distort rankings.

**Acceptance criteria**:

- Given a team has 3 approved and 2 pending submissions, when
  the leaderboard aggregates, then only the 3 approved scores
  count towards the total.
- Given a submission is approved after the last refresh, when
  the next auto-refresh fires, then the newly approved score is
  included.

> Enforces invariant: Scores are immutable until approved
> (staging pattern).

---

**US-045**: As a user, I want the leaderboard URL to be
shareable, so that I can send it to others.

**Acceptance criteria**:

- Given I copy the URL `/leaderboard/H1`, when another
  authenticated user opens it, then they see the same
  leaderboard.
- Given the page is SSR, when a search engine or link preview
  service requests the URL, then it receives the rendered HTML.

---

**US-046**: As an Admin, I want the leaderboard frozen when a
hackathon is archived, so that final results are preserved.

**Acceptance criteria**:

- Given hackathon `H1` is archived, when I view its
  leaderboard, then the scores are displayed as final and the
  auto-refresh is disabled.
- Given the hackathon is archived, when a new submission
  attempt is made, then it is rejected and the leaderboard
  remains unchanged.

---

### Challenge Progression

**US-047**: As an Admin, I want to define ordered challenges for
a hackathon, so that teams work through them sequentially.

**Acceptance criteria**:

- Given I create 5 challenges with orders 1–5, when I call
  `POST /api/challenges`, then each challenge is stored with
  its order, title, Markdown description, and max score.
- Given I create a challenge with a duplicate order, when
  validation runs, then a `400 Bad Request` is returned.

---

**US-048**: As a Hacker, I want Challenge 1 auto-unlocked when
the hackathon starts, so that my team can begin immediately.

**Acceptance criteria**:

- Given hackathon `H1` transitions to `active`, when my team's
  progression record is created, then `currentChallenge` is set
  to 1 with an `unlockedAt` timestamp.
- Given no progression record exists, when my team checks
  challenge status, then Challenge 1 is shown as unlocked.

---

**US-049**: As a Hacker, I want to see which challenges are
locked and unlocked, so that I know what to work on next.

**Acceptance criteria**:

- Given my team has completed challenges 1 and 2, when I view
  my dashboard, then challenges 1 and 2 show a completed
  checkmark, challenge 3 shows as unlocked, and challenges 4–5
  show as locked.
- Given a progress bar is displayed, when challenge 2 of 5 is
  completed, then the bar shows 40% progress.

---

**US-050**: As a Hacker, I want to be blocked from submitting
for a locked challenge, so that I cannot skip ahead.

**Acceptance criteria**:

- Given my team's `currentChallenge` is 2, when I attempt to
  submit for challenge 3, then a `403 Forbidden` response is
  returned.
- Given my team's `currentChallenge` is 2, when I submit for
  challenge 2, then the submission is accepted.

> Enforces invariant: Challenge N+1 is gated until challenge N
> is approved.

---

**US-051**: As the system, I want Challenge N+1 auto-unlocked
when Challenge N's submission is approved, so that progression
is seamless.

**Acceptance criteria**:

- Given my team completes challenge 2 and a Coach approves the
  submission, when the approval is processed, then
  `currentChallenge` is incremented to 3 and an `unlockedAt`
  timestamp is recorded.
- Given challenge 5 is the last challenge, when it is approved,
  then `currentChallenge` is set to a completed sentinel value
  and no further unlock occurs.

> Enforces invariant: Challenge N+1 is gated until challenge N
> is approved.

---

**US-052**: As a Coach, I want to see team progression status,
so that I can identify teams that are stuck.

**Acceptance criteria**:

- Given 4 teams in hackathon `H1`, when I view the progression
  overview, then each team's current challenge and unlock
  timestamps are displayed.
- Given a team has been on the same challenge for longer than a
  configurable threshold, when I view the overview, then that
  team is highlighted.

---

**US-053**: As an Admin, I want progression to work correctly
with the scoring engine, so that only approved submissions
trigger unlocks.

**Acceptance criteria**:

- Given a submission for challenge 2 is in `pending` state,
  when the progression check runs, then challenge 3 remains
  locked.
- Given the submission is then approved, when the auto-unlock
  trigger fires, then challenge 3 unlocks and the team can
  submit for it.

---

**US-054**: As a Hacker, I want to see the challenge details
(title, Markdown description, max score), so that I understand
what to work on.

**Acceptance criteria**:

- Given challenge 3 is unlocked for my team, when I view the
  challenge details, then the title, rendered Markdown
  description, and max score are displayed.
- Given challenge 4 is locked, when I view the challenge list,
  then challenge 4 shows as locked with only its title visible.

---

### Admin Operations

**US-055**: As an Admin, I want to invite a user as a Coach by
GitHub username, so that I can build my review team.

**Acceptance criteria**:

- Given I provide a valid GitHub username and select the Coach
  role, when I call `POST /api/roles/invite`, then a role
  record is created in the `roles` container.
- Given I provide the same username that already has a role,
  when the invite is processed, then the existing role is
  updated (not duplicated).

---

**US-056**: As an Admin, I want to invite a secondary Admin, so
that I can share platform management.

**Acceptance criteria**:

- Given I invite user `U2` as Admin, when the role record is
  created, then `U2` can perform all Admin actions.
- Given `U2` is a secondary Admin, when `U2` attempts to
  demote the primary Admin, then the request is rejected.

> Enforces invariant: Primary admin cannot be demoted.

---

**US-057**: As an Admin, I want to remove a role assignment, so
that I can revoke access when needed.

**Acceptance criteria**:

- Given user `U3` has a Coach role, when I call `DELETE
/api/roles/:id`, then the role record is deleted and `U3`
  loses Coach access.
- Given the removed user was the primary admin, when the delete
  is attempted, then it is rejected.

---

**US-058**: As an Admin, I want to view a paginated audit trail
of all reviewer actions, so that I can verify compliance.

**Acceptance criteria**:

- Given 50 reviewer actions have been logged, when I call
  `GET /api/audit/:hackathonId?page=1&limit=20`, then the
  first 20 entries are returned with pagination metadata.
- Given I filter by reviewer, when I provide a `reviewedBy`
  query parameter, then only that reviewer's actions are
  returned.

> Enforces invariant: All reviewer actions are audited
> (reviewedBy, reviewedAt, reviewReason).

---

**US-059**: As an Admin, I want the audit trail to capture all
approve, reject, and override actions, so that no reviewer
action is untracked.

**Acceptance criteria**:

- Given a Coach approves a submission, when the audit log is
  checked, then an entry exists with action `approve`,
  `reviewedBy`, `reviewedAt`, and `reviewReason`.
- Given an Admin overrides a score, when the audit log is
  checked, then an entry exists with action `override`, the
  old and new values, and the mandatory reason.

---

**US-060**: As an Admin, I want a hackathon lifecycle management
UI, so that I can create, launch, and archive events visually.

**Acceptance criteria**:

- Given I navigate to `/admin/hackathons`, when the page loads,
  then I see all hackathons with their current state and action
  buttons (Launch for drafts, Archive for active).
- Given I click Archive on an active hackathon, when the state
  transition completes, then the hackathon shows as archived
  and submission controls are disabled.

---

**US-061**: As an Admin, I want a team management UI with
reassignment capability, so that I can manage teams visually.

**Acceptance criteria**:

- Given I navigate to `/admin/teams`, when the page loads, then
  I see all teams with their members and submission status.
- Given I drag a hacker from team `T1` to `T2`, when the
  reassignment is confirmed, then the API is called and the UI
  updates.

---

**US-062**: As an Admin, I want a config management page, so
that I can adjust app-wide settings.

**Acceptance criteria**:

- Given I navigate to `/admin/config`, when the page loads,
  then I see current settings (leaderboard refresh interval,
  max team size, etc.).
- Given I update the leaderboard refresh interval from 30s to
  60s, when I save, then the `config` container is updated and
  the leaderboard uses the new interval.

---

**US-063**: As an Admin, I want role management scoped to a
specific hackathon, so that roles do not leak across events.

**Acceptance criteria**:

- Given user `U4` is a Coach for hackathon `H1` only, when
  `U4` accesses hackathon `H2`, then `U4` has no role and is
  treated as Anonymous.
- Given I invite `U4` as Coach for `H2` separately, when the
  role is created, then `U4` has Coach access to both `H1` and
  `H2` independently.

---

**US-064**: As an Admin, I want to see a dashboard overview, so
that I can monitor all hackathon activity at a glance.

**Acceptance criteria**:

- Given I navigate to `/dashboard`, when the page loads with
  Admin role, then I see a summary of active hackathons, total
  teams, pending submissions, and recent audit entries.
- Given a hackathon has pending submissions, when the dashboard
  loads, then a notification badge shows the count.

---

---

## Non-Functional Requirements

### Performance

- **Leaderboard SSR response**: < 2 seconds at 75 concurrent
  users
- **API response time**: < 500 ms for standard CRUD operations
  at normal load
- **Auto-refresh interval**: Configurable, default 30 seconds,
  uses client-side polling (no WebSockets)

### Security

- All API endpoints authenticated except `/api/health`
- GitHub OAuth via Azure App Service Easy Auth
- Event codes stored as SHA-256 hash only — plaintext returned
  to Admin once at creation and never persisted
- Role-based access control on every route
- Primary admin protection — cannot be demoted
- CORS restricted to App Service origin and `localhost:3000`
  (dev only)
- Rate limiting at 100 requests/min/IP on all API routes
- Zod validation on all request bodies at API boundary
- Cosmos DB accessible only via Private Endpoint
  (`publicNetworkAccess: Disabled`)
- Key Vault secrets accessed via managed identity, not
  connection strings in production
- TLS 1.2 enforced, HTTPS-only

### Accessibility

- WCAG 2.1 AA compliance for all public-facing pages
- Accessible form controls for score submission
- Keyboard-navigable leaderboard and challenge views
- Screen reader support for grade and award badges

### Compliance

- Azure Policy guardrails respected (no public endpoints for
  database, mandatory tags, approved regions, allowed SKUs)
- All infrastructure deployed via Bicep — fully repeatable,
  idempotent
- Deployment via Azure Deployment Stacks for rollback
  protection
- Governance constraints documented in
  `04-governance-constraints.json`

### Observability

- All reviewer actions audited with `reviewedBy`,
  `reviewedAt`, `reviewReason`
- Application Insights for APM and distributed tracing
- Log Analytics workspace as central log sink
- Custom events for audit trail entries

### Data Integrity

- Scores immutable until approved (staging pattern)
- One active rubric at a time (atomic swap via pointer +
  versioned docs)
- Cross-team submission attempts blocked (403)
- Challenge gating enforced at API boundary

---

## Out of Scope

The following items are explicitly **not** included in HackOps:

- **Mobile native app** — web-only, responsive design
- **Email or SMS notifications** — no notification system
- **Multi-tenant SaaS** — single-organisation deployment per
  Azure subscription
- **Self-hosted GitHub Enterprise integration** — GitHub.com
  OAuth only
- **Real-time collaboration (WebSockets)** — leaderboard uses
  polling, not push
- **Custom domain / SSL certificate management** — uses default
  `azurewebsites.net` domain
- **User registration beyond GitHub OAuth** — no
  username/password accounts
- **Offline mode** — requires internet connectivity
- **Data export / reporting** — no CSV/PDF export features
- **Internationalisation (i18n)** — English only

---

## Glossary

| Term                     | Definition                                                                                                    |
| ------------------------ | ------------------------------------------------------------------------------------------------------------- |
| **MicroHack**            | A structured hackathon event with defined challenges, team-based scoring, and gated progression               |
| **Event code**           | A 4-digit numeric code auto-generated per hackathon; used by hackers to self-register; stored as SHA-256 hash |
| **Rubric**               | A configurable, Markdown-driven scoring template defining categories, max points, and grade thresholds        |
| **Pointer document**     | A small Cosmos DB document that references the active rubric version; enables atomic swap                     |
| **Staging pattern**      | Submissions enter a `pending` state and must be explicitly approved before scores appear on the leaderboard   |
| **Fisher-Yates shuffle** | An unbiased algorithm for randomly assigning hackers to teams with equal probability                          |
| **Easy Auth**            | Azure App Service built-in authentication; handles GitHub OAuth without custom middleware                     |
| **Grade badge**          | A visual indicator (A/B/C/D) on the leaderboard based on rubric-defined score thresholds                      |
| **Award badge**          | A special recognition badge for achievements like "Highest Score" or "Fastest Completion"                     |
| **Challenge gating**     | The rule that Challenge N+1 is locked until Challenge N's submission is approved                              |
| **Private Endpoint**     | An Azure networking feature that gives a resource a private IP within a VNet, disabling public access         |
| **Deployment Stack**     | An Azure resource that tracks all resources deployed by a template as a unit, with deny-settings and rollback |
| **AVM**                  | Azure Verified Modules — Microsoft's official Bicep module library for Azure resources                        |
