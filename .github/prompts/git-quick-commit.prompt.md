---
description: "Quick commit flow: stage, commit with conventional format, and optionally push to origin."
agent: "agent"
model: "GPT-5 mini"
argument-hint: "Provide a commit subject or leave blank to auto-generate from staged changes."
tools:
  - execute/runInTerminal
  - read
  - vscode/askQuestions
---

# Git Quick Commit

Fast path for one conventional commit in HackOps.

## Scope & Safety

- Do not commit on `main`; stop and ask user to switch branches.
- Never use `--no-verify` unless user explicitly requests it.
- Never force-push.

## Workflow

### Step 1 — Inspect status

Run:

```bash
git status --short
git branch --show-current
```

- If no changes: stop with "Working tree is clean."
- If branch is `main`: stop and request a feature branch.

### Step 2 — Stage

Ask:

> **Stage changes?**
>
> A) `git add -A` (recommended)
> B) Keep current staged set
> C) Stage specific paths

- For C, ask for paths and run `git add <paths>`.

### Step 3 — Propose commit message

If no message is provided via argument-hint, run:

```bash
git diff --cached --stat
git diff --cached -- . ':(exclude)*.lock' ':(exclude)package-lock.json' | head -200
```

Propose a conventional commit subject that matches repo rules:

- Type must be one of: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`,
  `test`, `build`, `ci`, `chore`, `revert`
- Header max length: 100
- Subject must not end with `.`

Ask the user to confirm or edit before commit.

### Step 4 — Commit

Run:

```bash
git commit -m "<confirmed subject>"
```

If hooks fail, show full output and stop.

### Step 5 — Optional push

Ask:

> **Push to origin/current-branch?**
>
> A) Yes
> B) No

If yes, run:

```bash
git push origin $(git branch --show-current)
```

## Output

Return a short summary:

- Staged files count
- Commit hash + subject
- Push result (pushed or skipped)
