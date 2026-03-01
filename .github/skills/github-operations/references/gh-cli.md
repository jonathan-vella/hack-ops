# GitHub CLI Reference

Use `gh` CLI as fallback when no equivalent MCP tool exists.
Primary use cases: Actions, releases, repos, secrets, API calls.

## Repositories

```bash
# Create
gh repo create my-project --public --clone --gitignore python --license mit

# Clone / Fork
gh repo clone owner/repo
gh repo fork owner/repo --clone

# View / Edit
gh repo view owner/repo --json name,description
gh repo edit --default-branch main --delete-branch-on-merge

# Sync fork
gh repo sync

# Set default repo (avoid --repo flag)
gh repo set-default owner/repo
```

---

## GitHub Actions

### Workflows

```bash
gh workflow list
gh workflow run ci.yml --ref main
gh workflow enable ci.yml
gh workflow disable ci.yml
```

### Runs

```bash
gh run list --workflow ci.yml --limit 5
gh run watch <run-id>
gh run view <run-id> --log
gh run rerun <run-id>
gh run rerun <run-id> --failed    # Only failed jobs
gh run download <run-id> --dir ./artifacts
gh run cancel <run-id>
```

### CI/CD Pattern

```bash
gh workflow run ci.yml --ref main
RUN_ID=$(gh run list --workflow ci.yml --limit 1 --json databaseId --jq '.[0].databaseId')
gh run watch "$RUN_ID"
gh run download "$RUN_ID" --dir ./artifacts
```

---

## Releases

```bash
# Create
gh release create v1.0.0 --title "v1.0.0" --notes "Release notes"
gh release create v1.0.0 --generate-notes    # Auto-generate notes
gh release create v1.0.0 ./dist/*.tar.gz     # With assets

# List / View / Download
gh release list
gh release view v1.0.0
gh release download v1.0.0 --dir ./download

# Delete
gh release delete v1.0.0 --yes
```

---

## Secrets & Variables

```bash
# Secrets
gh secret set MY_SECRET --body "secret_value"
gh secret list
gh secret delete MY_SECRET

# Variables
gh variable set MY_VAR --body "value"
gh variable list
gh variable get MY_VAR
```

---

## API Requests

```bash
# GET
gh api /user
gh api /repos/owner/repo --jq '.stargazers_count'

# POST
gh api --method POST /repos/owner/repo/issues \
  --field title="Issue title" \
  --field body="Issue body"

# Pagination
gh api /user/repos --paginate

# GraphQL
gh api graphql -f query='{
  viewer { login repositories(first: 5) { nodes { name } } }
}'
```

> **IMPORTANT**: `gh api -f` does not support object values. Use multiple
> `-f` flags with hierarchical keys and string values instead.

---

## Auth & Search

```bash
# Auth
gh auth login
gh auth status
gh auth token

# Labels
gh label create bug --color "d73a4a" --description "Bug report"
gh label list

# Search
gh search repos "azure bicep" --language hcl
gh search code "uniqueString" --repo owner/repo
gh search issues "label:bug is:open" --repo owner/repo
```

---

## Global Flags

| Flag                | Description                |
| ------------------- | -------------------------- |
| `--repo OWNER/REPO` | Target specific repository |
| `--json FIELDS`     | Output JSON with fields    |
| `--jq EXPRESSION`   | Filter JSON output         |
| `--web`             | Open in browser            |
| `--paginate`        | Fetch all pages            |
