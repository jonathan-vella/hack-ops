---
description: "Create a safe conventional commit, push current branch, and optionally open a PR to main."
agent: "agent"
model: "GPT-5 mini"
argument-hint: "Provide a commit subject or leave blank to auto-generate from staged changes."
tools:
  - execute/runInTerminal
  - read
  - search/codebase
  - vscode/askQuestions
  - github/search_pull_requests
  - github/create_pull_request
---

# Git Commit, Push & PR

Create one conventional commit for HackOps, push the current branch,
and optionally open a pull request to `main`.

## Scope & Preconditions

- Workspace must be a git repository with a configured `origin` remote.
- Use MCP-first GitHub operations for PR creation and search.
- Do not run `gh auth` commands in this workflow.
- Follow the conventional commit rules from `commitlint.config.js` and `.github/skills/git-commit/SKILL.md`.
- Respect repository safety: do not commit directly to `main`, do not force-push.

## Inputs

| Variable    | Source                                    | Default                          |
| ----------- | ----------------------------------------- | -------------------------------- |
| `message`   | argument-hint or user reply               | Auto-generated from staged diff  |
| `branch`    | detected from `git branch --show-current` | Current branch                   |
| `staging`   | user choice                               | All changed files                |
| `run_check` | user choice                               | Run lightweight checks           |
| `create_pr` | user choice                               | No                               |
| `pr_base`   | user choice                               | `main`                           |
| `pr_title`  | user choice or auto-generated             | Derived from commit message      |
| `pr_body`   | user choice or auto-generated             | Summary of commits ahead of base |
| `pr_draft`  | user choice                               | No                               |

## Workflow

### Step 1 — Inspect the working tree

Run the following commands and show the output to the user:

```bash
git status --short
git branch --show-current
git log --oneline origin/$(git branch --show-current)..HEAD 2>/dev/null || git log --oneline -5
```

If `git status --short` returns nothing, stop and tell the user there is nothing
to commit.

If the current branch is `main`, stop and ask the user to switch to a feature branch
before committing.

### Step 2 — Show a change summary

Run:

```bash
git diff --stat
```

Display the file count, insertions, and deletions as a brief summary.

### Step 3 — Ask about staging

Present the list of unstaged/untracked files from Step 1 and ask:

> **Which files should be staged?**
>
> A) All changed files (recommended)
> B) Only already-staged files (skip `git add`)
> C) Specific files — I will list them

Wait for the user's answer before continuing.

- **A**: Run `git add -A`
- **B**: Do not run `git add`. Continue with whatever is already staged.
  If nothing is staged, stop and tell the user.
- **C**: Ask the user for the file paths, then run `git add <paths>`.

### Step 4 — Generate or confirm the commit message

Read `.github/skills/git-commit/SKILL.md` to load the conventional commit
format rules for this repository.

If the user provided a message via the argument-hint, use it as the subject
line (wrap it in conventional format if needed).

Otherwise, run:

```bash
git diff --cached --stat
git diff --cached -- . ':(exclude)*.lock' ':(exclude)package-lock.json' | head -200
```

Use the output to generate a conventional commit message following the format:

```text
<type>(<scope>): <short description in sentence case>

- <bullet summarising change 1>
- <bullet summarising change 2>
```

Message constraints for this repo:

- Allowed types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`,
  `build`, `ci`, `chore`, `revert`
- Header max length: 100
- Subject must not end with `.`

Present the proposed message to the user and ask:

> **Commit message — does this look right?**
>
> A) Yes, use it as-is
> B) Let me edit it — I'll paste the revised message

Wait for confirmation before continuing.

### Step 5 — Optional local checks

Ask:

> **Run local checks before commit?**
>
> A) Yes — run `npm run lint:md` (recommended)
> B) Yes — run `npm run validate`
> C) No — rely on git hooks only

If checks fail, show output and stop for user decision.

### Step 6 — Commit

Run:

```bash
git commit -m "<confirmed subject>" [-m "<optional body>"]
```

If the pre-commit hook fails, show the full error output and stop.
Ask the user to fix the issue and re-run the prompt.

Show the resulting commit hash and subject line.

### Step 7 — Push

Ask:

> **Push to `origin/<branch>`?**
>
> A) Yes, push now
> B) No, skip push

If **A**, run:

```bash
git push origin $(git branch --show-current)
```

Show the push result. If the push fails, display the error and stop.

### Step 8 — Pull request (optional)

Ask:

> **Open a pull request?**
>
> A) Yes — merge `<current branch>` → `main`
> B) Yes — different target branch (I'll specify)
> C) No, skip

If **C**, stop here and confirm the commit and push were successful.

If **A** or **B**:

1. Ask:

   > **PR title** (leave blank to use the commit subject):

2. Ask:

   > **PR description** (leave blank to auto-generate from commit list):
   > Add any context, linked issues (`Closes #N`), or test notes here.

3. Ask:

   > **Draft PR?** Y / N (default: N)

4. Check for an existing open PR from the current branch to the target
   using `github/search_pull_requests` with query:
   `is:open head:<branch> base:<base>`.
   - If one exists, tell the user and skip creation.
   - If none exists, call `github/create_pull_request` with:
     - `owner`: repository owner
     - `repo`: repository name
     - `head`: current branch
     - `base`: target branch
     - `title`: confirmed PR title
     - `body`: confirmed PR body
     - `draft`: user's choice

5. Show the PR URL returned by the MCP tool.

## Output Expectations

At the end of the workflow, print a summary table:

| Step         | Result                               |
| ------------ | ------------------------------------ |
| Files staged | N files                              |
| Commit       | `<hash>` `<subject>`                 |
| Push         | `origin/<branch>` — pushed / skipped |
| Pull request | `<URL>` / not created                |

## Error Handling

- **Nothing to commit**: Stop at Step 1 and say "Working tree is clean."
- **On `main` branch**: Stop at Step 1 and require branch switch.
- **Pre-commit hook failure**: Display full hook output. Do not retry automatically.
- **Push rejected**: Show the error. Suggest `git pull --rebase` if behind.
- **MCP PR creation fails**: Display the error. Provide the compare URL as fallback:
  `https://github.com/<owner>/<repo>/compare/<base>...<head>`

## Quality Assurance

- Never force-push (`--force`) unless the user explicitly asks.
- Never commit directly to `main` — warn and stop if the current branch is `main`.
- Always show the commit hash after a successful commit.
- Always show the PR URL after a successful PR creation.
- Do not skip user confirmation at Steps 3, 4, 7, or 8.
