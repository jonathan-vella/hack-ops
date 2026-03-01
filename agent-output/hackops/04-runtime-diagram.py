"""HackOps Runtime Flow Diagram — Implementation Plan.

Shows request, auth, secret, and telemetry paths through the
deployed architecture at runtime. Updated for containerized
App Service pulling from ACR, Azure SQL via PE, and ACI seeding.
"""

import os

from diagrams import Cluster, Diagram, Edge
from diagrams.azure.compute import AppServices, ContainerInstances, ContainerRegistries
from diagrams.azure.database import SQLServers
from diagrams.azure.identity import ManagedIdentities
from diagrams.azure.network import DNSZones
from diagrams.azure.security import KeyVaults
from diagrams.azure.devops import ApplicationInsights
from diagrams.azure.analytics import LogAnalyticsWorkspaces
from diagrams.azure.general import Usericon
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
    n_edge_user = Usericon("Browser\n(Hacker/Coach/Admin)")
    n_id_github = Github("GitHub OAuth")

    with Cluster("rg-hackops-se-dev"):
        with Cluster("Container Supply Chain"):
            n_app_acr = ContainerRegistries("ACR Standard\ncrhackopsdev*")
            n_app_aci = ContainerInstances("ACI (ephemeral)\nSQL seed / migrate")

        with Cluster("App Service (Easy Auth)"):
            n_web_app = AppServices("app-hackops-dev\nContainerized Next.js 15")

        n_id_msi = ManagedIdentities("System MSI\n(Entra ID RBAC)")

        with Cluster("Private Network"):
            n_data_sql = SQLServers("sql-hackops-dev\nS2 / 50 DTU")
            n_sec_kv = KeyVaults("kv-hackops-dev")
            n_net_dns = DNSZones("Private DNS\nZones")

        with Cluster("Observability"):
            n_ops_appi = ApplicationInsights("appi-hackops-dev")
            n_ops_law = LogAnalyticsWorkspaces("log-hackops-dev")

    # Request flow
    n_edge_user >> Edge(label="1. HTTPS request", color="darkgreen") >> n_web_app
    n_web_app >> Edge(label="2. OAuth redirect", color="purple", style="dashed") >> n_id_github
    n_id_github >> Edge(label="3. Token callback", color="purple", style="dashed") >> n_web_app

    # Container pull
    n_app_acr >> Edge(label="4. Image pull\n(MI AcrPull)", color="teal") >> n_web_app

    # Data flow (private)
    n_web_app >> Edge(label="5. SQL query\n(Entra auth)", color="blue") >> n_data_sql
    n_web_app >> Edge(label="6. Secret read", color="orange", style="dashed") >> n_sec_kv

    # ACI seed flow
    n_app_acr >> Edge(label="seed image", color="teal", style="dashed") >> n_app_aci
    n_app_aci >> Edge(label="schema seed\n(VNet PE)", color="blue", style="dashed") >> n_data_sql

    # Identity
    n_web_app >> Edge(label="identity", color="gray", style="dotted") >> n_id_msi
    n_id_msi >> Edge(label="RBAC", color="gray", style="dotted") >> n_data_sql
    n_id_msi >> Edge(label="RBAC", color="gray", style="dotted") >> n_sec_kv

    # DNS resolution
    n_data_sql >> Edge(label="DNS", color="purple", style="dotted") >> n_net_dns
    n_sec_kv >> Edge(label="DNS", color="purple", style="dotted") >> n_net_dns

    # Telemetry
    n_web_app >> Edge(label="7. Telemetry", color="gray", style="dashed") >> n_ops_appi
    n_ops_appi >> Edge(color="gray", style="dashed") >> n_ops_law
