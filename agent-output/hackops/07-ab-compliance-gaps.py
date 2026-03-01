#!/usr/bin/env python3
"""Generate compliance gap severity chart for hackops as-built state."""

import matplotlib.pyplot as plt

SEVERITIES = ["Critical", "High", "Medium", "Low"]
COUNTS = [0, 1, 2, 0]
COLORS = ["#7f0000", "#d62728", "#ff7f0e", "#2ca02c"]


def main() -> None:
    fig, ax = plt.subplots(figsize=(9, 5.5))

    bars = ax.bar(SEVERITIES, COUNTS, color=COLORS, width=0.6)

    for bar, count in zip(bars, COUNTS):
        ax.text(
            bar.get_x() + bar.get_width() / 2,
            count + 0.03,
            str(count),
            ha="center",
            va="bottom",
            fontweight="bold",
        )

    ax.set_title("HackOps Compliance Gaps by Severity")
    ax.set_ylabel("Gap Count")
    ax.set_ylim(0, max(COUNTS) + 1)
    ax.grid(True, axis="y", linestyle="--", alpha=0.35)

    plt.tight_layout()
    plt.savefig("07-ab-compliance-gaps.png", dpi=150)


if __name__ == "__main__":
    main()
