# What-If Interpretation

> Extracted from `azure-bicep-patterns/SKILL.md` for progressive loading.

Before deploying, always run what-if to preview changes:

```bash
az deployment group what-if \
  --resource-group "$rgName" \
  --template-file main.bicep \
  --parameters main.bicepparam \
  --no-pretty-print
```

Interpret results:

| Change Type | Icon   | Action Required                              |
| ----------- | ------ | -------------------------------------------- |
| Create      | green  | New resource — verify name and configuration |
| Modify      | yellow | Property change — check for breaking changes |
| Delete      | red    | Resource removal — confirm intentional       |
| NoChange    | grey   | Idempotent — no action needed                |
| Deploy      | blue   | Child resource deployment                    |
| Ignore      | grey   | Read-only property change — safe to ignore   |

Red flags to catch: unexpected deletes, SKU downgrades, public access changes,
authentication mode changes, or identity removal.
