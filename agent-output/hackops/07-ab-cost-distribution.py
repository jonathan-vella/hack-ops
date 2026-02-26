#!/usr/bin/env python3
"""Generate as-built monthly cost distribution chart for hackops."""

import matplotlib.pyplot as plt

CATEGORIES = ["Compute", "Data Services", "Networking", "Security", "Monitoring"]
VALUES = [164.25, 25.16, 18.60, 5.00, 19.32]
COLORS = ["#1f77b4", "#2ca02c", "#ff7f0e", "#9467bd", "#d62728"]


def main() -> None:
    total = sum(VALUES)
    labels = [f"{category}\n${value:.2f}" for category, value in zip(CATEGORIES, VALUES)]

    fig, ax = plt.subplots(figsize=(10, 6))
    wedges, _, autotexts = ax.pie(
        VALUES,
        labels=labels,
        autopct=lambda p: f"{p:.1f}%",
        startangle=130,
        colors=COLORS,
        wedgeprops={"linewidth": 1, "edgecolor": "white"},
    )

    for autotext in autotexts:
        autotext.set_color("white")
        autotext.set_fontweight("bold")

    ax.set_title(f"HackOps As-Built Monthly Cost Distribution\nTotal: ${total:.2f}")
    ax.axis("equal")

    plt.tight_layout()
    plt.savefig("07-ab-cost-distribution.png", dpi=150)


if __name__ == "__main__":
    main()
