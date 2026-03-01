"""HackOps Module Dependency Graph — Implementation Plan.

Shows deployment order and parameter dependencies between
Bicep modules. Arrows indicate outputs feeding inputs.
"""

import os

from diagrams import Cluster, Diagram, Edge
from diagrams.azure.compute import AppServices, ContainerInstances
from diagrams.azure.database import SQLServers
from diagrams.azure.network import VirtualNetworks
from diagrams.azure.security import KeyVaults
from diagrams.azure.devops import ApplicationInsights
from diagrams.azure.analytics import LogAnalyticsWorkspaces
from diagrams.azure.compute import ContainerRegistries

output_dir = os.path.dirname(os.path.abspath(__file__))
output_path = os.path.join(output_dir, "04-dependency-diagram")

graph_attr = {
    "fontsize": "14",
    "bgcolor": "white",
    "pad": "0.5",
    "nodesep": "1.0",
    "ranksep": "1.5",
    "splines": "ortho",
}

with Diagram(
    "HackOps — Module Dependency Graph",
    filename=output_path,
    direction="TB",
    show=False,
    graph_attr=graph_attr,
    outformat="png",
):
    with Cluster("Phase 1: Foundation"):
        n_net_vnet = VirtualNetworks("networking.bicep\nvnetId, subnetIds")
        n_ops_mon = LogAnalyticsWorkspaces("monitoring.bicep\nlogId, appiConnStr")
        n_sec_kv = KeyVaults("key-vault.bicep\nkvId, kvUri")

    with Cluster("Phase 2: Data + Registry"):
        n_data_sql = SQLServers("sql-database.bicep\nsqlFqdn, dbName")
        n_app_acr = ContainerRegistries("container-registry.bicep\nacrLoginServer")

    with Cluster("Phase 3: Compute"):
        n_web_app = AppServices("app-service.bicep\nhostname, principalId")

    with Cluster("Phase 4: Seed"):
        n_app_aci = ContainerInstances("ACI (post-deploy)\nSQL schema seed")

    # Phase 1 internal dependencies
    n_net_vnet >> Edge(label="peSubnetId", color="blue") >> n_sec_kv

    # Phase 1 → Phase 2
    n_net_vnet >> Edge(label="peSubnetId", color="blue") >> n_data_sql
    n_ops_mon >> Edge(label="logAnalyticsId", color="gray", style="dashed") >> n_app_acr

    # Phase 1 + 2 → Phase 3
    n_net_vnet >> Edge(label="appSubnetId", color="blue") >> n_web_app
    n_ops_mon >> Edge(label="appiConnStr", color="gray", style="dashed") >> n_web_app
    n_sec_kv >> Edge(label="kvUri", color="orange", style="dashed") >> n_web_app
    n_data_sql >> Edge(label="sqlFqdn", color="green") >> n_web_app
    n_app_acr >> Edge(label="acrLoginServer", color="teal") >> n_web_app

    # Phase 3 → Phase 4 (ACI needs SQL + VNet + ACR)
    n_data_sql >> Edge(label="sqlFqdn", color="green", style="dashed") >> n_app_aci
    n_net_vnet >> Edge(label="defaultSubnetId", color="blue", style="dashed") >> n_app_aci
    n_app_acr >> Edge(label="seed image", color="teal", style="dashed") >> n_app_aci
