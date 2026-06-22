from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_analyse_session_legit():
    payload = {
        "caller_number": "+919811223344",
        "call_transcript": "Hello, I am calling from HDFC bank. Your check is ready for dispatch. Please collect it from your branch.",
        "origin_ip": "192.168.1.2"
    }
    response = client.post("/sessions/analyse", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["is_scam"] == False
    assert data["scam_score"] < 0.5

def test_analyse_session_scam():
    payload = {
        "caller_number": "+919876500112",
        "call_transcript": "This is CBI officer. There is an arrest warrant against you for narcotics trafficking. Do not leave the camera, you are under digital arrest.",
        "origin_ip": "103.45.22.99"
    }
    response = client.post("/sessions/analyse", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["is_scam"] == True
    assert data["scam_score"] > 0.6
    assert data["impersonated_entity"] == "CBI / ED Enforcement Directorate"

def test_classify_transcript():
    payload = {
        "text": "This is customs clearance of a fedex parcel. You must pay 20000 rupees immediately to clear."
    }
    response = client.post("/transcripts/classify", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["risk_score"] > 0.3
    assert "Mumbai Customs Department" in data["impersonated_official"]

def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "UP", "service": "sentinelx-scam-service"}
