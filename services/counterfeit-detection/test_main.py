import base64
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

# Create a mock 10x10 white PNG base64 string for testing
def get_mock_image():
    # Mini 1x1 black pixel PNG
    png_bytes = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\rIDATx\x9cc```\x00\x00\x00\x02\x00\x01H\xaf\xa4q\x00\x00\x00\x00IEND\xaeB`\x82'
    return base64.b64encode(png_bytes).decode('utf-8')

def test_detect_currency_invalid_base64():
    payload = {
        "image_base64": "invalid_data_here",
        "claimed_denomination": 500
    }
    response = client.post("/currency/detect", json=payload)
    assert response.status_code == 400

def test_detect_currency_mock_run():
    # Testing with a valid base64 PNG but since it's 1x1 it will trigger edge & hue variance checks
    # and flag it as counterfeit (which is perfect because we want to see counterfeit flag working)
    payload = {
        "image_base64": get_mock_image(),
        "claimed_denomination": 500
    }
    response = client.post("/currency/detect", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["is_counterfeit"] == True
    assert len(data["failed_markers"]) > 0

def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "UP", "service": "sentinelx-counterfeit-service"}
