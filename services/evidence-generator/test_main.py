import os
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_generate_package():
    payload = {
        "case_number": "SX-TEST-9921",
        "incident_type": "DIGITAL_ARREST",
        "reporter_name": "Test Citizen",
        "call_transcript": "This is test transcript data.",
        "threat_level": "HIGH",
        "scam_score": 0.85,
        "deepfake_score": 0.0,
        "money_trail": [
            {
                "tx_id": "TXN-001",
                "from_account": "BA-SBI-1002",
                "to_account": "BA-HDFC-9921",
                "amount": 5000.0,
                "timestamp": "2026-06-22T17:35:00Z"
            }
        ]
    }
    response = client.post("/evidence/package", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "SUCCESS"
    assert "pdf_file_path" in data
    assert "sha256_hash" in data
    assert "digital_signature" in data
    
    # Check if file was physically created
    file_path = data["pdf_file_path"]
    assert os.path.exists(file_path)

def test_download_package():
    # Attempt to download the file created in previous test
    response = client.get("/evidence/download/SX-TEST-9921")
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"

def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "UP", "service": "sentinelx-evidence-service"}
