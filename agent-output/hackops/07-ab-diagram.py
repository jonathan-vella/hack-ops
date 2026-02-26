#!/usr/bin/env python3
"""Generate as-built architecture diagram for hackops deployed state."""

import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch


def add_box(ax, x, y, w, h, text, color):
    box = FancyBboxPatch(
        (x, y),
        w,
        h,
        boxstyle="round,pad=0.02,rounding_size=0.02",
        linewidth=1.5,
        edgecolor="#1a1a1a",
        facecolor=color,
    )
    ax.add_patch(box)
    ax.text(x + w / 2, y + h / 2, text, ha="center", va="center", fontsize=9)


def arrow(ax, x1, y1, x2, y2):
    ax.annotate(
        "",
        xy=(x2, y2),
        xytext=(x1, y1),
        arrowprops={"arrowstyle": "->", "lw": 1.5, "color": "#333333"},
    )


def main() -> None:
    fig, ax = plt.subplots(figsize=(13, 8))
    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    ax.axis("off")

    add_box(ax, 0.05, 0.68, 0.18, 0.12, "Users\nWeb Browser", "#e6f2ff")
    add_box(ax, 0.33, 0.68, 0.22, 0.12, "App Service\napp-hackops-dev", "#cde7ff")
    add_box(ax, 0.66, 0.75, 0.26, 0.1, "Application Insights\nai-hackops-dev", "#f2e6ff")
    add_box(ax, 0.66, 0.61, 0.26, 0.1, "Log Analytics\nlaw-hackops-dev", "#f2e6ff")

    add_box(ax, 0.33, 0.45, 0.22, 0.12, "VNet\nvnet-hackops-dev", "#eaf7ea")
    add_box(ax, 0.66, 0.45, 0.26, 0.12, "Cosmos DB\ncosmos-hackops-dev-fplrs3", "#ffeacc")
    add_box(ax, 0.66, 0.28, 0.26, 0.12, "Key Vault\nkv-hackops-dev-fplrs3", "#ffeacc")

    add_box(ax, 0.33, 0.24, 0.22, 0.12, "Private Endpoints\npe-cosmos / pe-kv", "#fff8cc")
    add_box(ax, 0.33, 0.07, 0.22, 0.1, "Private DNS Zones\nprivatelink.*", "#fff8cc")

    arrow(ax, 0.23, 0.74, 0.33, 0.74)
    arrow(ax, 0.44, 0.68, 0.44, 0.57)
    arrow(ax, 0.55, 0.74, 0.66, 0.80)
    arrow(ax, 0.55, 0.72, 0.66, 0.66)
    arrow(ax, 0.55, 0.50, 0.66, 0.50)
    arrow(ax, 0.55, 0.48, 0.66, 0.34)
    arrow(ax, 0.44, 0.45, 0.44, 0.36)
    arrow(ax, 0.44, 0.24, 0.44, 0.17)

    ax.set_title(
        "HackOps As-Built Architecture (centralus)\n"
        "Resource Group: rg-hackops-us-dev",
        fontsize=14,
        fontweight="bold",
    )

    plt.tight_layout()
    plt.savefig("07-ab-diagram.png", dpi=150)


if __name__ == "__main__":
    main()
