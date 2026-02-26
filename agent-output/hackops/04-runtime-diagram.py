"""HackOps Runtime Flow Diagram — Implementation Plan.

Shows request, auth, secret, and telemetry paths through the
deployed architecture at runtime.
"""

import os

from diagrams import Cluster, Diagram, Edge
from diagrams.azure.compute import AppServices
from diagrams.azure.database import CosmosDb
from diagrams.azure.identity import ManagedIdentities
from diagrams.azure.network import DNSZones
from diagrams.azure.security import KeyVaults
from diagrams.azure.devops import ApplicationInsights
from diagrams.azure.analytics import LogAnalyticsWorkspaces
from diagrams.azure.general import Usericon
from diagrams.programming.language import NodeJS
from diagrams.onprem.vcs import Github

output_dir = os.path.dirname(os.path.abspath(__file__))
output_path = os.path.join(output_dir, "04-runtime-diagram")

graph_attr = {
    "fontsize": "14",
    "bgcolor": "white",
    "pad": "0.5",
    "nodesep": "0.8",
    "ranksep": "1.2",
    "splines": "ortho",
}

with Diagram(
    "HackOps — Runtime Flow",
    filename=output_path,
    direction="LR",
    show=False,
    graph_attr=graph_attr,
    outformat="png",
):
    user = Usericon("Browser\n(Hacker/Coach/Admin)")
    github = Github("GitHub OAuth")

    with Cluster("rg-hackops-dev"):
        with Cluster("App Service (Easy Auth)"):
            app = AppServices("app-hackops-dev\nNext.js 15 SSR + API")

        msi = ManagedIdentities("System MSI\n(Entra ID RBAC)")

        with Cluster("Private Network"):
            cosmos = CosmosDb("cosmos-hackops-dev\nServerless NoSQL")
            kv = KeyVaults("kv-hackops-dev")
            dns = DNSZones("Private DNS\nZones")

        with Cluster("Observability"):
            appi = ApplicationInsights("appi-hackops-dev")
            law = LogAnalyticsWorkspaces("log-hackops-dev")

    # Request flow
    user >> Edge(label="1. HTTPS request", color="darkgreen") >> app
    app >> Edge(label="2. OAuth redirect", color="purple", style="dashed") >> github
    github >> Edge(label="3. Token callback", color="purple", style="dashed") >> app

    # Data flow (private)
    app >> Edge(label="4. SDK call\n(Entra RBAC)", color="blue") >> cosmos
    app >> Edge(label="5. Secret read", color="orange", style="dashed") >> kv

    # Identity
    app >> Edge(label="identity", color="gray", style="dotted") >> msi
    msi >> Edge(label="RBAC", color="gray", style="dotted") >> cosmos
    msi >> Edge(label="RBAC", color="gray", style="dotted") >> kv

    # DNS resolution
    cosmos >> Edge(label="DNS", color="purple", style="dotted") >> dns
    kv >> Edge(label="DNS", color="purple", style="dotted") >> dns

    # Telemetry
    app >> Edge(label="6. Telemetry", color="gray", style="dashed") >> appi
    appi >> Edge(color="gray", style="dashed") >> law
