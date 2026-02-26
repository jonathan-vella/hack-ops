#!/usr/bin/env python3
"""Generate six-month as-built cost projection chart for hackops."""

import matplotlib.pyplot as plt

MONTHS = ["M1", "M2", "M3", "M4", "M5", "M6"]
COSTS = [232.33, 239.30, 246.48, 253.87, 261.49, 269.34]


def main() -> None:
    fig, ax = plt.subplots(figsize=(10, 6))

    ax.plot(MONTHS, COSTS, marker="o", linewidth=2.5, color="#0078d4")
    ax.fill_between(MONTHS, COSTS, color="#0078d4", alpha=0.12)

    for idx, value in enumerate(COSTS):
        ax.text(idx, value + 1.5, f"${value:.2f}", ha="center", fontsize=9)

    ax.set_title("HackOps As-Built 6-Month Cost Projection")
    ax.set_xlabel("Month")
    ax.set_ylabel("Estimated Monthly Cost (USD)")
    ax.grid(True, linestyle="--", alpha=0.4)

    plt.tight_layout()
    plt.savefig("07-ab-cost-projection.png", dpi=150)


if __name__ == "__main__":
    main()
