---
name: azure-diagrams
description: "Generates professional Azure architecture diagrams and data-visualization charts (WAF pillar scores, cost distribution, cost projection). Produces Python `diagrams` + matplotlib artifacts (`.py` + `.png`) for Step 2 WAF charts, Step 3 design visuals, and Step 7 as-built documentation."
compatibility: Requires graphviz system package and Python diagrams library; works with Claude Code, GitHub Copilot, VS Code, and any Agent Skills compatible tool.
license: MIT
metadata:
  author: cmb211087
  version: "5.0"
  repository: https://github.com/mingrammer/diagrams
---

# Azure Architecture Diagrams Skill

Generate professional Azure architecture diagrams and data-visualization charts using
Python's `diagrams` library and matplotlib. Load reference files on demand for patterns.

## Reference Files (Load on Demand)

| File | When to Load |
| ---- | ------------ |
| `references/output-standards.md` | Professional template, connection syntax, clusters, troubleshooting |
| `references/azure-components.md` | Complete list of 700+ Azure components |
| `references/common-patterns.md` | Ready-to-use architecture patterns (3-tier, microservices, etc.) |
| `references/waf-cost-charts.md` | WAF pillar bar, cost donut & projection chart implementations |
| `references/iac-to-diagram.md` | Generate diagrams from Bicep/Terraform/ARM |
| `references/preventing-overlaps.md` | Layout troubleshooting guide |
| `references/business-process-flows.md` | Workflow and swimlane diagrams |
| `references/entity-relationship-diagrams.md` | Database ERD patterns |
| `references/timeline-gantt-diagrams.md` | Project timeline diagrams |
| `references/ui-wireframe-diagrams.md` | UI mockup patterns |
| `references/sequence-auth-flows.md` | Authentication flow patterns |
| `references/quick-reference.md` | Copy-paste code snippets |
| `references/integration-services.md` | Integration service patterns |
| `references/migration-patterns.md` | Migration diagram patterns |

---

## Output Format

| Format         | File Extension | Tool             | Use Case                             |
| -------------- | -------------- | ---------------- | ------------------------------------ |
| **Python PNG** | `.py` + `.png` | diagrams library | Programmatic, version-controlled, CI |
| **SVG**        | `.svg`         | diagrams library | Web documentation (optional)         |

## Execution Method

**Always save diagram source to file first**, then execute it:

```bash
python3 agent-output/{project}/03-des-diagram.py
```

- ✅ Generate and save `.py` source in `agent-output/{project}/`
- ✅ Execute saved script to produce `.png`
- ✅ Keep source version-controlled for deterministic regeneration

## Architecture Diagram Contract (Mandatory)

Generate **non-Mermaid** diagrams using Python `diagrams` only.

### Required outputs

- `03-des-diagram.py` + `.png` (Step 3)
- `04-dependency-diagram.py` + `.png` (Step 4)
- `04-runtime-diagram.py` + `.png` (Step 4)
- `07-ab-diagram.py` + `.png` (Step 7, when requested)

### Required naming conventions

- Cluster vars: `clu_<scope>_<slug>` where scope ∈ `sub|rg|net|tier|zone|ext`
- Node vars: `n_<domain>_<service>_<role>` where domain ∈ `edge|web|app|data|id|sec|ops|int`
- Edge vars (if reused): `e_<source>_to_<target>_<flow>`
- Flow taxonomy only: `auth|request|response|read|write|event|replicate|secret|telemetry|admin`

### Required layout/style defaults

- `direction="LR"` unless explicitly justified
- deterministic spacing via `graph_attr` (`nodesep`, `ranksep`, `splines`)
- short labels (2–4 words), max 3 edge styles

Read `references/output-standards.md` for the full professional template and settings.

### Quality gate (score /10)

1. Readable at 100% zoom
2. No major label overlap
3. Minimal line crossing
4. Clear tier grouping
5. Correct Azure icons
6. Security boundary visible
7. Data flow direction clear
8. Identity/auth flow visible
9. Telemetry path visible
10. Naming conventions followed

If score < 9/10, regenerate once with simplification.

---

## Prerequisites

```bash
pip install diagrams matplotlib pillow
apt-get install -y graphviz  # Ubuntu/Debian
```

---

## Workflow Integration

| Workflow Step     | File Pattern                                                  | Description                                |
| ----------------- | ------------------------------------------------------------- | ------------------------------------------ |
| Step 2            | `02-waf-scores.py/.png`                                       | WAF pillar score bar chart                 |
| Step 3 (Design)   | `03-des-diagram.py/.png`                                      | Proposed architecture visualization        |
| Step 3 (Design)   | `03-des-cost-distribution.py/.png`                            | Monthly cost distribution donut chart      |
| Step 3 (Design)   | `03-des-cost-projection.py/.png`                              | 6-month cost projection bar + trend chart  |
| Step 7 (As-Built) | `07-ab-diagram.py/.png`                                       | Deployed architecture documentation        |
| Step 7 (As-Built) | `07-ab-cost-distribution.py/.png`                             | As-built cost distribution donut chart     |
| Step 7 (As-Built) | `07-ab-cost-projection.py/.png`                               | As-built 6-month cost projection chart     |
| Step 7 (As-Built) | `07-ab-cost-comparison.py/.png`                               | Design estimate vs as-built grouped bars   |
| Step 7 (As-Built) | `07-ab-compliance-gaps.py/.png`                               | Compliance gaps by severity horizontal bar |

### Artifact Suffix Convention

- **`-des`**: Design diagrams (Step 3 artifacts) — proposed/conceptual
- **`-ab`**: As-built diagrams (Step 7 artifacts) — deployed/actual

## Data Visualization Charts

Styled matplotlib charts for WAF scores and cost estimates. See `references/waf-cost-charts.md`
for full Python implementations.

### When to generate

| Trigger           | Chart(s) to generate                                                |
| ----------------- | ------------------------------------------------------------------- |
| After WAF scoring | `02-waf-scores.png` — horizontal bar, one colour per pillar         |
| After cost design | `03-des-cost-distribution.png` + `03-des-cost-projection.png`       |
| After as-built    | `07-ab-cost-distribution.png` + `07-ab-cost-projection.png` + `07-ab-cost-comparison.png` |
| After compliance  | `07-ab-compliance-gaps.png` — gap counts by severity                |

### Design tokens (use consistently)

| Token         | Value     | Usage                      |
| ------------- | --------- | -------------------------- |
| Background    | `#F8F9FA` | Figure + axes fill         |
| Azure blue    | `#0078D4` | Primary bars               |
| Minimum line  | `#DC3545` | Red dashed WAF reference   |
| Target line   | `#28A745` | Green dashed WAF reference |
| Trend line    | `#FF8C00` | Orange dashed projection   |
| DPI           | 150       | Crisp PNG output           |

### WAF pillar colours

| Pillar                    | Hex colour |
| ------------------------- | ---------- |
| 🔒 Security               | `#C00000`  |
| 🔄 Reliability            | `#107C10`  |
| ⚡ Performance Efficiency | `#FF8C00`  |
| 💰 Cost Optimization      | `#FFB900`  |
| 🔧 Operational Excellence | `#8764B8`  |

---

## Generation Workflow

1. **Gather Context** — Read Bicep templates, deployment summary, or architecture assessment
2. **Identify Resources** — List all Azure resources to visualize
3. **Determine Hierarchy** — Map Subscription → RG → VNet → Subnet structure
4. **Generate Python Code** — Read `references/output-standards.md` for template
5. **Execute Script** — Run Python to generate PNG
6. **Verify Output** — Confirm PNG file was created successfully

## Guardrails

### DO

- ✅ Create diagram files in `agent-output/{project}/`
- ✅ Use step-prefixed filenames (`03-des-*` or `07-ab-*`)
- ✅ Use valid `diagrams.azure.*` imports only
- ✅ Include docstring with prerequisites and generation command
- ✅ **ALWAYS execute the Python script to generate the PNG file**
- ✅ Use `references/waf-cost-charts.md` patterns for WAF / cost charts
- ✅ Apply the design tokens table to every chart

### DO NOT

- ❌ Use invalid or made-up diagram node types
- ❌ Create diagrams that don't match the actual architecture
- ❌ Skip the PNG generation step
- ❌ Output to legacy `docs/diagrams/` folder (use `agent-output/` instead)
- ❌ Use Mermaid `xychart-beta` for WAF or cost charts (always use matplotlib PNGs)

## What This Skill Does NOT Do

- Generate Bicep or Terraform code (use `bicep-code` agent)
- Create workload documentation (use `azure-artifacts` skill)
- Deploy resources (use `deploy` agent)
- Create ADRs (use `azure-adr` skill)
- Perform WAF assessments (use `architect` agent)
