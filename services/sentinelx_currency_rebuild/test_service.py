import base64, glob, os
from fastapi.testclient import TestClient
from main import app
client=TestClient(app)

def test_health_model_loaded():
    r=client.get('/health'); assert r.status_code==200 and r.json()['model_loaded'] is True

def test_missing_image_is_unverified():
    r=client.post('/currency/detect',json={}); assert r.status_code==200
    assert r.json()['classification']=='UNVERIFIED' and r.json()['is_counterfeit'] is None

def test_uploaded_image_never_claims_authenticity():
    # Any real image can exercise API contract; point to one dataset image if available.
    path=glob.glob('/mnt/data/dataset_A/A/*')
    if not path: return
    with open(path[0],'rb') as f: data=base64.b64encode(f.read()).decode()
    r=client.post('/currency/detect',json={'image_base64':data})
    assert r.status_code==200
    body=r.json()
    assert body['classification']=='UNVERIFIED'
    assert body['authenticity_status']=='NOT_CHECKED'
    assert body['is_counterfeit'] is None
    assert body['serial_number'] is None
