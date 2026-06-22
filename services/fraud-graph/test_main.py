from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_ingest_transaction():
    payload = {
        "transaction_id": "TXN-test-99",
        "sender_account": "BA-SBI-1002",
        "receiver_account": "BA-HDFC-9921",
        "amount": 10000.0,
        "timestamp": "2026-06-22T17:35:00Z"
    }
    response = client.post("/graph/ingest", json=payload)
    assert response.status_code == 200
    assert response.json()["status"] == "SUCCESS"

def test_get_network_nodes():
    response = client.get("/graph/network/BA-SBI-1002")
    assert response.status_code == 200
    data = response.json()
    assert "nodes" in data
    assert len(data["nodes"]) > 0

def test_analyse_graph_flagged():
    payload = {
        "seed_node_id": "BA-SBI-1002"
    }
    response = client.post("/graph/analyse", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["is_mule_ring"] == True
    assert data["risk_score"] > 0.9

def test_analyse_graph_clear():
    payload = {
        "seed_node_id": "BA-CLEAR-ACCOUNT"
    }
    response = client.post("/graph/analyse", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["is_mule_ring"] == False
    assert data["risk_score"] < 0.2

def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "UP", "service": "sentinelx-fraud-graph"}
