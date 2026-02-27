---
description: 'Apply tool optimization recommendations from context window audit to all agent definitions'
agent: 'agent'
tools: ['read/readFile', 'edit/editFiles', 'search/fileSearch', 'search/textSearch', 'search/listDirectory', 'read/problems']
---

# Tool Optimization — Apply Audit Recommendations

Remove unnecessary tools from agent `tools:` frontmatter arrays based on
the context window audit (`agent-output/hackops/10-context-optimization-report.md`).
Wildcard consolidation (`"azure-mcp/*"`, `"bicep/*"`) is handled separately —
this prompt covers **individual tool removals only**.

## Scope

| Group          | Files                                     | Action     |
| -------------- | ----------------------------------------- | ---------- |
| Infra agents   | `.github/agents/0{1..9}-*.agent.md`       | Heavy trim |
| App agents     | `.github/agents/1{1..6}-*.agent.md`       | Light trim |
| Context agent  | `.github/agents/10-context-optimizer.agent.md` | No change  |
| Subagents      | `.github/agents/_subagents/*.agent.md`    | No change  |

## Workflow

### Step 1 — Read current state

For each agent file in scope, read the `tools:` frontmatter array.
Verify the tool counts match these baselines before making changes:

| Agent                  | Current Tools |
| ---------------------- | ------------- |
| 01-conductor           | 94            |
| 02-requirements        | 94            |
| 03-architect           | 93            |
| 04-design              | 110           |
| 05-bicep-planner       | 104           |
| 06-bicep-code-generator| 104           |
| 07-deploy              | 104           |
| 08-as-built            | 94            |
| 09-diagnose            | 108           |
| 11-app-scaffolder      | 30            |
| 12-api-builder         | 29            |
| 13-frontend-builder    | 29            |
| 14-test-writer         | 27            |
| 15-app-deployer        | 33            |
| 16-app-conductor       | 29            |

### Step 2 — Apply universal removals to all infra agents (01-09)

Remove these 11 tools from **every** infra agent (01 through 09):

| Tool                         | Category  | Reason                                    |
| ---------------------------- | --------- | ----------------------------------------- |
| `edit/createJupyterNotebook` | Notebook  | No notebook workflows in infra agents     |
| `edit/editNotebook`          | Notebook  | No notebook workflows in infra agents     |
| `execute/runNotebookCell`    | Notebook  | No notebook workflows in infra agents     |
| `read/getNotebookSummary`    | Notebook  | No notebook workflows in infra agents     |
| `read/readNotebookCellOutput`| Notebook  | No notebook workflows in infra agents     |
| `vscode/extensions`          | Extension | Agents should not browse extensions       |
| `vscode/installExtension`    | Extension | Agents should not install extensions      |
| `vscode/newWorkspace`        | Workspace | Agents should not create new workspaces   |
| `ms-azuretools.vscode-azure-github-copilot/azure_get_dotnet_templates_for_tag` | .NET | Not a .NET project |
| `ms-azuretools.vscode-azure-github-copilot/azure_get_dotnet_template_tags`     | .NET | Not a .NET project |
| `ms-azuretools.vscode-azure-github-copilot/azure_recommend_custom_modes`       | Meta | Recommending agent modes is not a runtime task |

### Step 3 — Apply per-agent removals (infra agents)

Each agent gets additional targeted removals beyond the 11 universal ones.

#### 01-conductor (orchestrator — delegates, never codes or tests)

Remove 6 additional tools:

| Tool | Reason |
| ---- | ------ |
| `execute/runTests` | Conductor delegates testing to subagents |
| `execute/testFailure` | No test execution capability needed |
| `execute/createAndRunTask` | Delegates deployment/build to 07-deploy |
| `vscode.mermaid-chat-features/renderMermaidDiagram` | Orchestrator does not generate diagrams |
| `vscode/openSimpleBrowser` | No need to open browser pages |
| `ms-azuretools.vscode-azureresourcegroups/azureActivityLog` | No direct Azure resource inspection |

**Total removals: 17** → Expected post-removal count: **77**

---

#### 02-requirements (discovery — reads, asks, writes docs)

Remove 6 additional tools:

| Tool | Reason |
| ---- | ------ |
| `execute/runTests` | Requirements agent never runs tests |
| `execute/testFailure` | No test execution capability needed |
| `execute/createAndRunTask` | No build/deploy tasks needed |
| `vscode.mermaid-chat-features/renderMermaidDiagram` | Requirements docs do not include diagrams |
| `vscode/openSimpleBrowser` | No need to open browser pages |
| `ms-azuretools.vscode-azureresourcegroups/azureActivityLog` | No direct Azure resource inspection |

**Total removals: 17** → Expected post-removal count: **77**

---

#### 03-architect (WAF assessment + cost estimates via subagent)

Remove 5 additional tools:

| Tool | Reason |
| ---- | ------ |
| `execute/runTests` | Architect never runs tests |
| `execute/testFailure` | No test execution capability needed |
| `execute/createAndRunTask` | Cost estimation delegated to subagent |
| `vscode/openSimpleBrowser` | No need to open browser pages |
| `ms-azuretools.vscode-azureresourcegroups/azureActivityLog` | No direct Azure resource inspection |

Note: 03-architect already lacks `vscode.mermaid-chat-features/renderMermaidDiagram`.

**Total removals: 16** → Expected post-removal count: **77**

---

#### 04-design (Python diagrams + Mermaid rendering)

Remove 12 additional tools:

| Tool | Reason |
| ---- | ------ |
| `execute/runTests` | Design agent never runs tests |
| `execute/testFailure` | No test execution capability needed |
| `execute/createAndRunTask` | No build/deploy tasks needed |
| `vscode/openSimpleBrowser` | No need to open browser pages |
| `ms-azuretools.vscode-azureresourcegroups/azureActivityLog` | No direct Azure resource inspection |
| `pylance-mcp-server/pylanceDocuments` | Not needed for diagram generation |
| `pylance-mcp-server/pylanceImports` | Not needed for diagram generation |
| `pylance-mcp-server/pylanceInstalledTopLevelModules` | Not needed for diagram generation |
| `pylance-mcp-server/pylanceInvokeRefactoring` | Not needed for diagram generation |
| `pylance-mcp-server/pylancePythonEnvironments` | Redundant with ms-python tools |
| `pylance-mcp-server/pylanceSettings` | Not needed for diagram generation |
| `pylance-mcp-server/pylanceUpdatePythonEnvironment` | Not needed for diagram generation |

**KEEP** (essential for diagram generation):
- All `ms-python.python/*` tools (4 tools — env config, install packages, execute)
- `pylance-mcp-server/pylanceSyntaxErrors` — validate generated .py files
- `pylance-mcp-server/pylanceFileSyntaxErrors` — validate generated .py files
- `pylance-mcp-server/pylanceRunCodeSnippet` — test diagram code
- `pylance-mcp-server/pylanceWorkspaceRoots` — workspace path resolution
- `pylance-mcp-server/pylanceWorkspaceUserFiles` — find Python files
- `vscode.mermaid-chat-features/renderMermaidDiagram` — core capability

**Total removals: 23** → Expected post-removal count: **87**

---

#### 05-bicep-planner (plans infra, governance via subagent)

Remove 5 additional tools:

| Tool | Reason |
| ---- | ------ |
| `execute/runTests` | Planner never runs tests |
| `execute/testFailure` | No test execution capability needed |
| `execute/createAndRunTask` | Governance discovery delegated to subagent |
| `vscode/openSimpleBrowser` | No need to open browser pages |
| `ms-azuretools.vscode-azureresourcegroups/azureActivityLog` | No direct Azure resource inspection |

**KEEP**: `vscode.mermaid-chat-features/renderMermaidDiagram` — generates architecture diagrams in plans.

**Total removals: 16** → Expected post-removal count: **88**

---

#### 06-bicep-code-generator (writes Bicep templates)

Remove 6 additional tools:

| Tool | Reason |
| ---- | ------ |
| `execute/runTests` | Bicep validation delegated to lint subagent |
| `execute/testFailure` | No test execution capability needed |
| `execute/createAndRunTask` | Bicep validation delegated to lint subagent |
| `vscode.mermaid-chat-features/renderMermaidDiagram` | Code generator does not produce diagrams |
| `vscode/openSimpleBrowser` | No need to open browser pages |
| `ms-azuretools.vscode-azureresourcegroups/azureActivityLog` | No direct Azure resource inspection |

**Total removals: 17** → Expected post-removal count: **87**

---

#### 07-deploy (runs deployment scripts, verifies in portal)

Remove 3 additional tools:

| Tool | Reason |
| ---- | ------ |
| `execute/runTests` | Deploy agent never runs tests |
| `execute/testFailure` | No test execution capability needed |
| `vscode.mermaid-chat-features/renderMermaidDiagram` | Deploy agent does not produce diagrams |

**KEEP** (essential for deployment):
- `execute/createAndRunTask` — runs deploy.ps1 scripts
- `vscode/openSimpleBrowser` — view Azure Portal post-deployment
- `ms-azuretools.vscode-azureresourcegroups/azureActivityLog` — verify deployment activity

**Total removals: 14** → Expected post-removal count: **90**

---

#### 08-as-built (post-deployment documentation)

Remove 4 additional tools:

| Tool | Reason |
| ---- | ------ |
| `execute/runTests` | Documentation agent never runs tests |
| `execute/testFailure` | No test execution capability needed |
| `execute/createAndRunTask` | No build/deploy tasks needed |
| `vscode/openSimpleBrowser` | No need to open browser pages |

**KEEP**:
- `vscode.mermaid-chat-features/renderMermaidDiagram` — generates diagrams in documentation
- `ms-azuretools.vscode-azureresourcegroups/azureActivityLog` — reads recent deployment activity for docs

**Total removals: 15** → Expected post-removal count: **79**

---

#### 09-diagnose (troubleshooting — runs diagnostics, queries resources)

Remove 3 additional tools:

| Tool | Reason |
| ---- | ------ |
| `execute/runTests` | Diagnostic agent never runs test suites |
| `execute/testFailure` | No test execution capability needed |
| `vscode/openSimpleBrowser` | No need to open browser pages |

**KEEP** (essential for diagnostics):
- All `ms-python.python/*` tools (4 tools — diagnostic scripts)
- `execute/createAndRunTask` — may run diagnostic tasks
- `vscode.mermaid-chat-features/renderMermaidDiagram` — diagnostic report diagrams
- `ms-azuretools.vscode-azureresourcegroups/azureActivityLog` — activity log analysis

**Total removals: 14** → Expected post-removal count: **94**

---

### Step 4 — Apply app agent removals (11-16)

App agents are already lean. Apply these minor trimming changes:

#### 11-app-scaffolder (scaffolds project, does not test)

Remove 3 tools:

| Tool | Reason |
| ---- | ------ |
| `execute/runTests` | Scaffolder does not run test suites |
| `execute/testFailure` | No test execution capability needed |
| `execute/createAndRunTask` | Not needed for scaffolding |

**Expected post-removal count: 27**

---

#### 12-api-builder (writes API routes, validates inline)

Remove 1 tool:

| Tool | Reason |
| ---- | ------ |
| `execute/createAndRunTask` | API validation done via lint subagent |

**KEEP**: `execute/runTests` — validates routes after writing.

**Expected post-removal count: 28**

---

#### 13-frontend-builder (writes pages + components)

Remove 1 tool:

| Tool | Reason |
| ---- | ------ |
| `execute/createAndRunTask` | Component validation done via lint subagent |

**KEEP**: `execute/runTests` — validates components after writing.

**Expected post-removal count: 28**

---

#### 14-test-writer — NO CHANGES

All 27 tools are essential. Testing is this agent's core function.

---

#### 15-app-deployer (creates CI/CD workflows)

Remove 1 tool:

| Tool | Reason |
| ---- | ------ |
| `execute/testFailure` | Deployer does not interpret test failures |

**KEEP**: `execute/createAndRunTask` — CI/CD workflow execution.

**Expected post-removal count: 32**

---

#### 16-app-conductor (orchestrates app agents)

Remove 1 tool:

| Tool | Reason |
| ---- | ------ |
| `execute/createAndRunTask` | Delegates all tasks to child agents |

**Expected post-removal count: 28**

---

### Step 5 — Skip these (no changes needed)

- **10-context-optimizer** (16 tools) — already minimal
- **All 11 subagents** — already use wildcards, tool counts 1-10

### Step 6 — Validate

After all edits, run this command to verify expected counts:

```bash
for f in .github/agents/*.agent.md; do
  name=$(basename "$f" .agent.md)
  count=$(awk '/^tools:/{found=1} found && /]/{print; found=0} found{print}' "$f" \
    | tr ',' '\n' | sed 's/[][ ]//g' | grep -v '^$' | grep -v '^tools:' | wc -l)
  echo "$name: $count"
done
```

**Expected results** (post individual removals, before wildcard consolidation):

| Agent                   | Expected |
| ----------------------- | -------- |
| 01-conductor            | 77       |
| 02-requirements         | 77       |
| 03-architect            | 77       |
| 04-design               | 87       |
| 05-bicep-planner        | 88       |
| 06-bicep-code-generator | 87       |
| 07-deploy               | 90       |
| 08-as-built             | 79       |
| 09-diagnose             | 94       |
| 10-context-optimizer    | 16       |
| 11-app-scaffolder       | 27       |
| 12-api-builder          | 28       |
| 13-frontend-builder     | 28       |
| 14-test-writer          | 27       |
| 15-app-deployer         | 32       |
| 16-app-conductor        | 28       |

After subsequent wildcard consolidation (separate task), infra agents will drop
to approximately **31-48 tool entries** each, within the ≤40 target for most agents.

## Summary of all removals

| Removal Category | Tools Removed | Agents Affected |
| ---------------- | ------------- | --------------- |
| Notebook (5 tools) | `createJupyterNotebook`, `editNotebook`, `runNotebookCell`, `getNotebookSummary`, `readNotebookCellOutput` | 01-09 |
| Extension management (2) | `extensions`, `installExtension` | 01-09 |
| Workspace (1) | `newWorkspace` | 01-09 |
| .NET templates (2) | `azure_get_dotnet_template*` | 01-09 |
| Meta modes (1) | `azure_recommend_custom_modes` | 01-09 |
| Test execution (2) | `runTests`, `testFailure` | 01-09, 11 |
| Build tasks (1) | `createAndRunTask` | 01-06, 08, 11-13, 16 |
| Mermaid (1) | `renderMermaidDiagram` | 01, 02, 06 |
| Browser (1) | `openSimpleBrowser` | 01-06, 08, 09 |
| Activity log (1) | `azureActivityLog` | 01-06 |
| Pylance trim (7) | Various `pylance-mcp-server/*` | 04 only |
| App-specific (1) | `testFailure` | 15 |
