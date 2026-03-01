---
description: "10 golden operating principles for all agents — adapted from Harness Engineering"
applyTo: "**"
---

# Golden Principles (Compact)

These 10 imperatives govern every agent in this repository.
For detailed guidance with tests and examples, read `.github/skills/golden-principles/SKILL.md`.

1. **Repo is the record** — all context lives in-repo; if it's not committed, it doesn't exist
2. **Map, not manual** — point to deeper sources; no single file tries to be comprehensive
3. **Invariants, not implementations** — enforce WHAT must be true; let agents choose HOW
4. **Parse at boundaries** — validate inputs/outputs at module edges, not in the middle
5. **AVM-first, security always** — Azure Verified Modules preferred; security baseline non-negotiable
6. **Golden path** — use shared skills/utilities; don't hand-roll what already exists
7. **Encode human taste** — review feedback becomes rules/linters, not one-off fixes
8. **Context is scarce** — every loaded token must earn its keep; progressive loading
9. **Progressive disclosure** — start with the map, drill into skills on demand
10. **Mechanical enforcement** — if a rule can be a linter/CI check, make it one
