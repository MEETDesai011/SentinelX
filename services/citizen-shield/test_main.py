from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_assess_scam_en():
    payload = {
        "message_text": "I got a call claiming to be a CBI officer who said there is a warrant for my arrest due to drugs.",
        "language": "en"
    }
    response = client.post("/citizen/assess", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["scam_risk"] in ["HIGH", "CRITICAL"]
    assert "Digital Arrest" in data["guidance_message"]

def test_assess_scam_hi():
    payload = {
        "message_text": "मुझे सीबीआई का फोन आया और उन्होंने मुझसे पैसे की मांग की।",
        "language": "hi"
    }
    response = client.post("/citizen/assess", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "डिजिटल अरेस्ट घोटाले" in data["guidance_message"]

def test_submit_report():
    payload = {
        "reporter_name": "Rajesh Sharma",
        "reporter_phone": "+919811223344",
        "details": "WhatsApp call extortion attempt.",
        "location": "Mumbai"
    }
    response = client.post("/citizen/report", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "SUCCESS"
    assert "REF-SX" in data["case_ref_id"]

def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "UP", "service": "sentinelx-citizen-shield"}
