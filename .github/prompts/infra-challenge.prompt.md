---
description: "Adversarial review of HackOps architecture assessment and implementation plan before deployment proceeds"
agent: infra-challenger-subagent
tools: ["read/readFile", "search/textSearch", "search/fileSearch"]
---

# Challenge HackOps Infrastructure Plan

Adversarial review of the architecture assessment and
implementation plan. Identify untested assumptions, governance
gaps, WAF blind spots, and architectural weaknesses before
deployment proceeds.

## Mission

Act as a critical reviewer. Read the architecture assessment,
implementation plan, and technical plan, then produce structured
findings with severity ratings. The goal is to catch issues that
would cause deployment failure, security incidents, or cost
overruns before they happen.

## Scope & Preconditions

- **Architecture assessment**:
  `agent-output/hackops/02-architecture-assessment.md` (must exist)
- **Implementation plan**:
  `agent-output/hackops/04-implementation-plan.md` (must exist if
  governance/planning phase completed; skip if not yet created)
- **Governance constraints**:
  `agent-output/hackops/04-governance-constraints.json` (if exists)
- **Design artifacts**: `agent-output/hackops/03-des-*.md` (ADRs)
- **Source plan**: `.github/prompts/plan-hackOps.prompt.md`
- **Challenge findings**: Output to
  `agent-output/hackops/challenge-findings.json`

## Workflow

### Step 1 — Read all artifacts

Read in order:

1. `agent-output/hackops/02-architecture-assessment.md`
2. `agent-output/hackops/04-implementation-plan.md` (if exists)
3. `agent-output/hackops/04-governance-constraints.json` (if exists)
4. All `agent-output/hackops/03-des-adr-*.md` files
5. `.github/prompts/plan-hackOps.prompt.md` — `Tech Stack
Recommendation`, `Key Invariants`, and Phases 2-4

### Step 2 — Challenge architecture decisions

For each architecture decision, challenge:

1. **Untested assumptions**: Is the assumption verifiable? Has it
   been tested against the target subscription?
2. **WAF blind spots**: Which WAF pillars were underweighted?
3. **Scale limits**: Will the architecture handle the stated
   ~75 concurrent users with headroom?
4. **Failure modes**: What happens when Cosmos DB throttles? When
   App Service restarts? When private endpoint DNS fails?
5. **Security gaps**: Are there unprotected endpoints, unaudited
   operations, or credential exposure risks?

### Step 3 — Challenge governance compliance

1. Are all governance constraints addressed in the implementation?
2. Are there `Deny` policies that could block deployment?
3. Are tag requirements complete?
4. Are SKU restrictions respected?
5. Is `centralus` confirmed for all resource types?

### Step 4 — Challenge cost assumptions

1. Are Serverless Cosmos DB burst limits sufficient?
2. Is P1v3 App Service adequate for the workload?
3. Are there hidden costs (private DNS zones, data transfer,
   Log Analytics ingestion)?
4. What happens to costs at 2x-3x the expected load?

### Step 5 — Challenge operational readiness

1. Is the monitoring stack sufficient for production?
2. Are alerting rules defined?
3. Is there a rollback strategy?
4. Are deployment slots properly configured?
5. Is the backup strategy adequate (periodic 4h/8h)?

### Step 6 — Produce findings

Output `agent-output/hackops/challenge-findings.json` with
structured findings:

```json
{
  "reviewDate": "YYYY-MM-DD",
  "artifactsReviewed": ["list of files"],
  "findings": [
    {
      "id": "CF-NNN",
      "severity": "critical|high|medium|low",
      "category": "security|governance|cost|reliability|operations",
      "title": "Short description",
      "description": "Detailed finding",
      "recommendation": "What to fix",
      "status": "open|resolved|accepted"
    }
  ],
  "summary": {
    "critical": 0,
    "high": 0,
    "medium": 0,
    "low": 0,
    "mustFix": ["CF-NNN list of critical/high findings"]
  }
}
```

## Output Expectations

- `agent-output/hackops/challenge-findings.json` — structured
  findings with severity ratings
- All `critical` and `high` findings must be resolved before
  deployment proceeds (infra-06)
- `medium` and `low` findings are documented but non-blocking

## Quality Assurance

- [ ] All available artifacts were reviewed
- [ ] Each WAF pillar has at least one finding or explicit "no
      issues found"
- [ ] Security review covers: identity, network, data protection,
      credential management
- [ ] Cost review includes scaling scenarios
- [ ] Governance review cross-references actual policy constraints
- [ ] Every finding has a specific, actionable recommendation
