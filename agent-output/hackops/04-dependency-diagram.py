"""HackOps Module Dependency Graph — Implementation Plan.

Shows deployment order and parameter dependencies between
Bicep modules. Arrows indicate outputs feeding inputs.
"""

import os

from diagrams import Cluster, Diagram, Edge
from diagrams.azure.compute import AppServices
from diagrams.azure.database import CosmosDb
from diagrams.azure.network import VirtualNetworks
from diagrams.azure.security import KeyVaults
from diagrams.azure.devops import ApplicationInsights
from diagrams.azure.analytics import LogAnalyticsWorkspaces
from diagrams.custom import Custom

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
        net = VirtualNetworks("networking.bicep\nvnetId, subnetIds")
        mon_law = LogAnalyticsWorkspaces("monitoring.bicep\nlogId, appiConnStr")
        kv = KeyVaults("key-vault.bicep\nkvId, kvUri")

    with Cluster("Phase 2: Database"):
        cosmos = CosmosDb("cosmos-db.bicep\ncosmosEndpoint, dbName")

    with Cluster("Phase 3: Compute"):
        app = AppServices("app-service.bicep\nhostname, principalId")

    # Phase 1 internal dependencies
    net >> Edge(label="peSubnetId", color="blue") >> kv

    # Phase 1 → Phase 2
    net >> Edge(label="peSubnetId", color="blue") >> cosmos

    # Phase 1 → Phase 3
    net >> Edge(label="appSubnetId", color="blue") >> app
    mon_law >> Edge(label="appiConnStr", color="gray", style="dashed") >> app
    kv >> Edge(label="kvUri", color="orange", style="dashed") >> app

    # Phase 2 → Phase 3
    cosmos >> Edge(label="cosmosEndpoint", color="green") >> app
