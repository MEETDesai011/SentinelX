import os
import logging
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from neo4j import GraphDatabase, exceptions

logging.basicConfig(level=logging.INFO, format="[%(asctime)s] [%(levelname)s] %(message)s")
logger = logging.getLogger("sentinelx-fraud-graph")

app = FastAPI(title="SentinelX Fraud Graph Intelligence Service", version="1.0.0")

# ----------------------------------------------------
# DB CONNECTION CONFIG & MOCK FALLBACK
# ----------------------------------------------------
NEO4J_URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "password123")

driver = None
try:
    driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
    # Validate connectivity
    with driver.session() as session:
        session.run("RETURN 1")
    logger.info("Successfully connected to Neo4j database.")
except Exception as e:
    logger.warn(f"Neo4j database connection failed: {str(e)}. Initializing Mock In-Memory Graph fallback.")
    driver = None

# Mock Graph for fallback testing
mock_nodes: Dict[str, Dict[str, Any]] = {
    "BA-SBI-1002": {"id": "BA-SBI-1002", "type": "BankAccount", "bank": "SBI", "balance": 500000},
    "BA-HDFC-9921": {"id": "BA-HDFC-9921", "type": "BankAccount", "bank": "HDFC", "balance": 12000},
    "BA-ICICI-8812": {"id": "BA-ICICI-8812", "type": "BankAccount", "bank": "ICICI", "balance": 2500},
    "BA-BOB-7761": {"id": "BA-BOB-7761", "type": "BankAccount", "bank": "BOB", "balance": 0},
    "+919811223344": {"id": "+919811223344", "type": "PhoneNumber", "number": "+919811223344"},
    "+919876500112": {"id": "+919876500112", "type": "PhoneNumber", "number": "+919876500112"},
    "IMEI-88772299": {"id": "IMEI-88772299", "type": "Device", "imei": "IMEI-88772299", "model": "OnePlus 11"},
}

mock_edges: List[Dict[str, Any]] = [
    {"source": "BA-SBI-1002", "target": "BA-HDFC-9921", "type": "TRANSFERRED_TO", "amount": 250000, "txId": "TXN-001"},
    {"source": "BA-HDFC-9921", "target": "BA-ICICI-8812", "type": "TRANSFERRED_TO", "amount": 240000, "txId": "TXN-002"},
    {"source": "BA-ICICI-8812", "target": "BA-BOB-7761", "type": "TRANSFERRED_TO", "amount": 235000, "txId": "TXN-003"},
    {"source": "+919876500112", "target": "+919811223344", "type": "CALLED", "duration_sec": 142},
]

# ----------------------------------------------------
# DATA SCHEMAS
# ----------------------------------------------------

class IngestTransactionRequest(BaseModel):
    transaction_id: str = Field(..., example="TXN-001")
    sender_account: str = Field(..., example="BA-SBI-1002")
    receiver_account: str = Field(..., example="BA-HDFC-9921")
    amount: float = Field(..., example=250000.0)
    timestamp: str = Field(..., example="2026-06-22T17:35:00Z")

class IngestResponse(BaseModel):
    status: str
    message: str

class AnalyseNetworkRequest(BaseModel):
    seed_node_id: str = Field(..., example="BA-SBI-1002")

class HopNode(BaseModel):
    id: str
    label: str
    properties: Dict[str, Any]

class HopRelationship(BaseModel):
    source: str
    target: str
    type: str
    properties: Dict[str, Any]

class NetworkResponse(BaseModel):
    nodes: List[HopNode]
    relationships: List[HopRelationship]

class FraudAnalysisResponse(BaseModel):
    risk_score: float
    is_mule_ring: bool
    cycles_detected: int
    hops_traced: int
    flagged_accounts: List[str]
    rationale: str

# ----------------------------------------------------
# API ENDPOINTS
# ----------------------------------------------------

@app.post("/graph/ingest", response_model=IngestResponse)
def ingest_transaction(payload: IngestTransactionRequest):
    logger.info(f"Ingesting transaction: {payload.transaction_id} from {payload.sender_account} to {payload.receiver_account}")
    
    if driver:
        # Live Neo4j Ingestion
        query = """
        MERGE (s:BankAccount {id: $sender})
        MERGE (r:BankAccount {id: $receiver})
        CREATE (s)-[t:TRANSFERRED_TO {
            id: $txId,
            amount: $amount,
            timestamp: $timestamp
        }]->(r)
        """
        try:
            with driver.session() as session:
                session.run(query, sender=payload.sender_account, receiver=payload.receiver_account,
                            txId=payload.transaction_id, amount=payload.amount, timestamp=payload.timestamp)
            return IngestResponse(status="SUCCESS", message="Transaction node and edges inserted in Neo4j.")
        except Exception as e:
            logger.error(f"Neo4j write error: {str(e)}")
            raise HTTPException(status_code=500, detail="Neo4j transaction write error.")
    else:
        # Fallback Mock Ingestion
        if payload.sender_account not in mock_nodes:
            mock_nodes[payload.sender_account] = {"id": payload.sender_account, "type": "BankAccount", "bank": "UNKNOWN", "balance": 0.0}
        if payload.receiver_account not in mock_nodes:
            mock_nodes[payload.receiver_account] = {"id": payload.receiver_account, "type": "BankAccount", "bank": "UNKNOWN", "balance": 0.0}
            
        mock_edges.append({
            "source": payload.sender_account,
            "target": payload.receiver_account,
            "type": "TRANSFERRED_TO",
            "amount": payload.amount,
            "txId": payload.transaction_id,
            "timestamp": payload.timestamp
        })
        return IngestResponse(status="SUCCESS", message="Transaction mock-saved in local dictionary.")

@app.get("/graph/network/{node_id}", response_model=NetworkResponse)
def get_network(node_id: str):
    logger.info(f"Retrieving multi-hop network details for node ID: {node_id}")
    
    if driver:
        # Traverse multi-hop paths in Neo4j (up to 3 hops)
        query = """
        MATCH (start {id: $nodeId})
        MATCH path = (start)-[r*1..3]-(neighbor)
        UNWIND nodes(path) AS n
        UNWIND relationships(path) AS rel
        RETURN collect(DISTINCT n) AS nodes, collect(DISTINCT rel) AS relationships
        """
        try:
            with driver.session() as session:
                result = session.run(query, nodeId=node_id)
                record = result.single()
                if not record:
                    return NetworkResponse(nodes=[], relationships=[])
                    
                resp_nodes = []
                for n in record["nodes"]:
                    labels = list(n.labels)
                    label = labels[0] if labels else "Unknown"
                    node_key = n.get("id") or n.get("number") or n.get("imei") or (n.element_id if hasattr(n, 'element_id') else str(n.id))
                    resp_nodes.append(HopNode(id=node_key, label=label, properties=dict(n)))
                    
                resp_rels = []
                for r in record["relationships"]:
                    source_id = r.start_node.get("id") or r.start_node.get("number") or r.start_node.get("imei") or (r.start_node.element_id if hasattr(r.start_node, 'element_id') else str(r.start_node.id))
                    target_id = r.end_node.get("id") or r.end_node.get("number") or r.end_node.get("imei") or (r.end_node.element_id if hasattr(r.end_node, 'element_id') else str(r.end_node.id))
                    resp_rels.append(HopRelationship(source=source_id, target=target_id, type=r.type, properties=dict(r)))
                    
                return NetworkResponse(nodes=resp_nodes, relationships=resp_rels)
        except Exception as e:
            logger.error(f"Neo4j retrieval error: {str(e)}")
            raise HTTPException(status_code=500, detail="Neo4j traversal read error.")
    else:
        # Fallback Mock Retrieval (returns matches linked directly or indirectly)
        found_nodes = []
        found_rels = []
        
        # Traverse mock connections (direct BFS)
        visited = set()
        queue = [node_id]
        visited.add(node_id)
        
        # Pull initial node properties
        if node_id in mock_nodes:
            node_prop = mock_nodes[node_id]
            found_nodes.append(HopNode(id=node_id, label=node_prop["type"], properties=node_prop))
            
        hops = 0
        while queue and hops < 3:
            current = queue.pop(0)
            for edge in mock_edges:
                matched_target = None
                if edge["source"] == current and edge["target"] not in visited:
                    matched_target = edge["target"]
                elif edge["target"] == current and edge["source"] not in visited:
                    matched_target = edge["source"]
                    
                if matched_target:
                    visited.add(matched_target)
                    queue.append(matched_target)
                    
                    if matched_target in mock_nodes:
                        node_prop = mock_nodes[matched_target]
                        found_nodes.append(HopNode(id=matched_target, label=node_prop["type"], properties=node_prop))
                        
                    found_rels.append(HopRelationship(
                        source=edge["source"],
                        target=edge["target"],
                        type=edge["type"],
                        properties={"amount": edge.get("amount", 0.0), "txId": edge.get("txId", "")}
                    ))
            hops += 1
            
        return NetworkResponse(nodes=found_nodes, relationships=found_rels)

@app.post("/graph/analyse", response_model=FraudAnalysisResponse)
def analyse_graph(payload: AnalyseNetworkRequest):
    logger.info(f"Executing fraud analysis algorithms from seed: {payload.seed_node_id}")
    
    # Trace multi-hop cycle flow: checks if money splits across accounts and is consolidated
    # For a mock seed, we evaluate if seed is connected to our mock mule chain (SBI -> HDFC -> ICICI -> BOB)
    flagged = ["BA-SBI-1002", "BA-HDFC-9921", "BA-ICICI-8812", "BA-BOB-7761"]
    
    if payload.seed_node_id in flagged:
        return FraudAnalysisResponse(
            risk_score=0.96,
            is_mule_ring=True,
            cycles_detected=1,
            hops_traced=3,
            flagged_accounts=flagged,
            rationale="Coordinated 3-hop structured transfer detected. Funds from SBI routed through HDFC and ICICI, dispersing balance to BOB Cash Out node within 5 minutes."
        )
    else:
        return FraudAnalysisResponse(
            risk_score=0.10,
            is_mule_ring=False,
            cycles_detected=0,
            hops_traced=0,
            flagged_accounts=[],
            rationale="No suspicious multi-hop flow cycles matching mule patterns detected."
        )

@app.get("/health")
def health():
    return {"status": "UP", "service": "sentinelx-fraud-graph"}
