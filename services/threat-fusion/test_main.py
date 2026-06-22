from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_evaluate_threat_critical():
    payload = {
        "scam_linguistic_score": 0.90,
        "cli_spoofed": True,
        "voice_deepfake_score": 0.85,
        "graph_risk_score": 0.95,
        "currency_counterfeit_score": 0.0
    }
    response = client.post("/threat/evaluate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["composite_threat_score"] > 0.80
    assert data["hazard_level"] == "CRITICAL"
    assert "LOCK_BANK_APPS" in data["system_directives"]

def test_evaluate_threat_clear():
    payload = {
        "scam_linguistic_score": 0.10,
        "cli_spoofed": False,
        "voice_deepfake_score": 0.0,
        "graph_risk_score": 0.05,
        "currency_counterfeit_score": 0.0
    }
    response = client.post("/threat/evaluate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["composite_threat_score"] < 0.20
    assert data["hazard_level"] == "LOW"

def test_get_geo_hotspots():
    response = client.get("/geo/hotspots")
    assert response.status_code == 200
    data = response.json()
    assert data["type"] == "FeatureCollection"
    assert len(data["features"]) > 0
    assert "isHotspot" in data["features"][0]["properties"]

def test_create_geo_event():
    payload = {
        "incident_type": "DIGITAL_ARREST",
        "latitude": 19.0760,
        "longitude": 72.8777,
        "risk_score": 0.90,
        "description": "Call cluster point"
    }
    response = client.post("/geo/events", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "SUCCESS"
    assert "event_id" in data

def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "UP", "service": "sentinelx-threat-fusion"}
