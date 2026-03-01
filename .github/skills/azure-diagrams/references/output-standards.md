# Professional Output Standards

> Extracted from `azure-diagrams/SKILL.md` for progressive loading.
> Load when generating diagrams to ensure professional quality output.

## The Key Setting: `labelloc='t'`

To keep labels inside cluster boundaries, **put labels ABOVE icons**:

```python
node_attr = {
    "fontname": "Arial Bold",
    "fontsize": "11",
    "labelloc": "t",  # KEY: Labels at TOP - stays inside clusters!
}

with Diagram("Title", node_attr=node_attr, ...):
    # Your diagram code
```

## Full Professional Template

```python
from diagrams import Diagram, Cluster, Edge
from diagrams.azure.compute import KubernetesServices
from diagrams.azure.database import SQLDatabases

graph_attr = {
    "bgcolor": "white",
    "pad": "0.8",
    "nodesep": "0.9",
    "ranksep": "0.9",
    "splines": "spline",
    "fontname": "Arial Bold",
    "fontsize": "16",
    "dpi": "150",
}

node_attr = {
    "fontname": "Arial Bold",
    "fontsize": "11",
    "labelloc": "t",           # Labels ABOVE icons - KEY!
}

cluster_style = {"margin": "30", "fontname": "Arial Bold", "fontsize": "14"}

with Diagram("My Architecture",
             direction="TB",
             graph_attr=graph_attr,
             node_attr=node_attr):

    with Cluster("Data Tier", graph_attr=cluster_style):
        sql = SQLDatabases("sql-myapp-prod\nS3 tier")
```

## Professional Standards Checklist

| Check                      | Requirement                              |
| -------------------------- | ---------------------------------------- |
| ✅ **labelloc='t'**        | Labels above icons (stays in clusters)   |
| ✅ **Bold fonts**          | `fontname="Arial Bold"` for readability  |
| ✅ **Full resource names** | Actual names from IaC, not abbreviations |
| ✅ **High DPI**            | `dpi="150"` or higher for crisp text     |
| ✅ **Azure icons**         | Use `diagrams.azure.*` components        |
| ✅ **Cluster margins**     | `margin="30"` or higher                  |
| ✅ **CIDR blocks**         | Include IP ranges in VNet/Subnet labels  |

## Connection Syntax

```python
# Basic connections
a >> b                              # Simple arrow
a >> b >> c                         # Chain
a >> [b, c, d]                      # Fan-out (one to many)
[a, b] >> c                         # Fan-in (many to one)

# Labeled connections
a >> Edge(label="HTTPS") >> b       # With label
a >> Edge(label="443") >> b         # Port number

# Styled connections
a >> Edge(style="dashed") >> b      # Dashed line (config/secrets)
a >> Edge(style="dotted") >> b      # Dotted line
a >> Edge(color="red") >> b         # Colored
a >> Edge(color="red", style="bold") >> b  # Combined

# Bidirectional
a >> Edge(label="sync") << b        # Two-way
a - Edge(label="peer") - b          # Undirected
```

## Diagram Attributes

```python
with Diagram(
    "Title",
    show=False,                    # Don't auto-open
    filename="output",             # Output filename (no extension)
    direction="TB",                # TB, BT, LR, RL
    outformat="png",               # png, jpg, svg, pdf
    graph_attr={
        "splines": "spline",       # Curved edges
        "nodesep": "1.0",          # Horizontal spacing
        "ranksep": "1.0",          # Vertical spacing
        "pad": "0.5",              # Graph padding
        "bgcolor": "white",        # Background color
        "dpi": "150",              # Resolution
    }
):
```

## Clusters (Azure Hierarchy)

Use `Cluster()` for proper Azure hierarchy: Subscription → Resource Group → VNet → Subnet

```python
with Cluster("Azure Subscription"):
    with Cluster("rg-app-prod"):
        with Cluster("vnet-spoke (10.1.0.0/16)"):
            with Cluster("snet-app"):
                vm1 = VM("VM 1")
                vm2 = VM("VM 2")
            with Cluster("snet-data"):
                db = SQLDatabases("Database")
```

Cluster styling:

```python
with Cluster("Styled", graph_attr={"bgcolor": "#E8F4FD", "style": "rounded"}):
```

## Troubleshooting

### Overlapping Nodes

Increase spacing for complex diagrams:

```python
graph_attr={
    "nodesep": "1.2",   # Horizontal (default 0.25)
    "ranksep": "1.2",   # Vertical (default 0.5)
    "pad": "0.5"
}
```

### Labels Outside Clusters

Use `labelloc="t"` in `node_attr` to place labels above icons.

### Missing Icons

Check available icons:

```python
from diagrams.azure import network
print(dir(network))
```

See `preventing-overlaps.md` for detailed guidance.
