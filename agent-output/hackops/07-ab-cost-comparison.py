#!/usr/bin/env python3
"""Generate design vs as-built monthly cost comparison chart for hackops."""

import matplotlib.pyplot as plt

LABELS = ["Design", "As-Built"]
VALUES = [26.00, 232.33]
COLORS = ["#8c8c8c", "#0078d4"]


def main() -> None:
    fig, ax = plt.subplots(figsize=(8, 6))

    bars = ax.bar(LABELS, VALUES, color=COLORS, width=0.55)

    for bar, value in zip(bars, VALUES):
        ax.text(
            bar.get_x() + bar.get_width() / 2,
            value + 2,
            f"${value:.2f}",
            ha="center",
            va="bottom",
            fontsize=10,
            fontweight="bold",
        )

    variance = VALUES[1] - VALUES[0]
    percent = (variance / VALUES[0]) * 100 if VALUES[0] else 0

    ax.set_title(
        "HackOps Monthly Cost Comparison\n"
        f"Variance: +${variance:.2f} ({percent:.1f}%)"
    )
    ax.set_ylabel("Monthly Cost (USD)")
    ax.grid(True, axis="y", linestyle="--", alpha=0.35)

    plt.tight_layout()
    plt.savefig("07-ab-cost-comparison.png", dpi=150)


if __name__ == "__main__":
    main()
