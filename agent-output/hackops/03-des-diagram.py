"""HackOps Azure Architecture Diagram — Design Phase.

Generates a network-centric view showing VNet topology, Private
Endpoints, App Service integration, and observability paths.
"""

import os

from diagrams import Cluster, Diagram, Edge
from diagrams.azure.compute import AppServices
from diagrams.azure.database import SQLDatabases
from diagrams.azure.identity import ManagedIdentities
from diagrams.azure.network import DNSZones, Subnets, VirtualNetworks
from diagrams.azure.security import KeyVaults
from diagrams.azure.devops import ApplicationInsights
from diagrams.azure.analytics import LogAnalyticsWorkspaces
from diagrams.azure.general import Usericon

output_dir = os.path.dirname(os.path.abspath(__file__))
output_path = os.path.join(output_dir, "03-des-diagram")

graph_attr = {
    "fontsize": "14",
    "bgcolor": "white",
    "pad": "0.5",
    "nodesep": "0.8",
    "ranksep": "1.2",
    "splines": "ortho",
}

with Diagram(
    "HackOps — Azure Architecture (Design)",
    filename=output_path,
    direction="LR",
    show=False,
    graph_attr=graph_attr,
    outformat="png",
):
    n_edge_user = Usericon("Hacker / Coach\n/ Admin")

    with Cluster("rg-hackops-dev (swedencentral)"):

        with Cluster("Observability"):
            n_ops_law = LogAnalyticsWorkspaces("log-hackops-dev")
            n_ops_appi = ApplicationInsights("appi-hackops-dev")

        with Cluster("vnet-hackops-dev (10.0.0.0/24)"):

            with Cluster("snet-app (10.0.0.0/26)"):
                n_web_app = AppServices("app-hackops-dev\nNode 22 / Next.js 15")

            with Cluster("snet-pe (10.0.0.64/27)"):
                n_data_sql = SQLDatabases("sql-hackops-dev\nServerless GP")
                n_sec_kv = KeyVaults("kv-hackops-dev")

        n_id_msi = ManagedIdentities("System MSI")
        n_net_dns = DNSZones("privatelink\n.database\n.windows.net")

    # Runtime data flow
    n_edge_user >> Edge(label="HTTPS + Easy Auth", color="darkgreen") >> n_web_app

    # App Service → SQL Database via Private Endpoint
    n_web_app >> Edge(label="mssql (private)", color="blue") >> n_data_sql

    # App Service → Key Vault for secrets
    n_web_app >> Edge(label="secrets", color="orange", style="dashed") >> n_sec_kv

    # Managed Identity relationships
    n_web_app >> Edge(label="identity", color="gray", style="dotted") >> n_id_msi

    # DNS resolution
    n_data_sql >> Edge(label="DNS", color="purple", style="dotted") >> n_net_dns

    # Telemetry
    n_web_app >> Edge(label="telemetry", color="gray", style="dashed") >> n_ops_appi
    n_ops_appi >> Edge(color="gray", style="dashed") >> n_ops_law
