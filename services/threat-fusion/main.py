import os
import logging
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
import psycopg2
from psycopg2.extras import RealDictCursor
import numpy as np
from sklearn.cluster import DBSCAN

logging.basicConfig(level=logging.INFO, format="[%(asctime)s] [%(levelname)s] %(message)s")
logger = logging.getLogger("sentinelx-threat-fusion")

app = FastAPI(title="SentinelX Threat Fusion & Geospatial Engine", version="1.0.0")

# ----------------------------------------------------
# DB CONNECTION CONFIG & MOCK FALLBACK
# ----------------------------------------------------
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:password123@localhost:5432/sentinelx?schema=public")

def get_db_connection():
    try:
        conn = psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)
        return conn
    except Exception as e:
        logger.warn(f"PostgreSQL connection failed: {str(e)}. Running with memory mock backup.")
        return None

# Local Mock Database for fallback
mock_geo_events: List[Dict[str, Any]] = [
    {"id": "e-1", "incidentType": "DIGITAL_ARREST", "latitude": 19.0760, "longitude": 72.8777, "riskScore": 0.92, "description": "Bandra East Call Centroid"},
    {"id": "e-2", "incidentType": "DIGITAL_ARREST", "latitude": 19.0820, "longitude": 72.8820, "riskScore": 0.88, "description": "Kurla East Call Centroid"},
    {"id": "e-3", "incidentType": "COUNTERFEIT", "latitude": 18.9220, "longitude": 72.8347, "riskScore": 0.85, "description": "Colaba Retailer scan"},
    {"id": "e-4", "incidentType": "FRAUD_NETWORK", "latitude": 19.2183, "longitude": 72.9781, "riskScore": 0.97, "description": "Thane ATM Cash Out"},
    {"id": "e-5", "incidentType": "DIGITAL_ARREST", "latitude": 28.6139, "longitude": 77.2090, "riskScore": 0.89, "description": "ED Impersonation Threat"},
    {"id": "e-6", "incidentType": "COUNTERFEIT", "latitude": 28.5355, "longitude": 77.3910, "riskScore": 0.94, "description": "Noida Sector 62 scan"},
    {"id": "e-7", "incidentType": "FRAUD_NETWORK", "latitude": 22.5726, "longitude": 88.3639, "riskScore": 0.98, "description": "Salt Lake Sec V Mule Account"},
]

# ----------------------------------------------------
# DATA SCHEMAS
# ----------------------------------------------------

class ThreatEvaluateRequest(BaseModel):
    scam_linguistic_score: float = Field(..., ge=0.0, le=1.0)
    cli_spoofed: bool
    voice_deepfake_score: float = Field(..., ge=0.0, le=1.0)
    graph_risk_score: float = Field(..., ge=0.0, le=1.0)
    currency_counterfeit_score: float = Field(0.0, ge=0.0, le=1.0)

class ThreatEvaluateResponse(BaseModel):
    composite_threat_score: float
    hazard_level: str
    recommended_mitigations: List[str]
    system_directives: List[str]

class GeoEventRequest(BaseModel):
    incident_type: str = Field(..., example="DIGITAL_ARREST")
    latitude: float = Field(..., example=19.0760)
    longitude: float = Field(..., example=72.8777)
    risk_score: float = Field(0.0, ge=0.0, le=1.0)
    description: Optional[str] = None

class GeoEventResponse(BaseModel):
    status: str
    event_id: str

# ----------------------------------------------------
# CORE FUSION & GEOSPATIAL CLUSTERING LOGIC
# ----------------------------------------------------

def calculate_composite_score(req: ThreatEvaluateRequest) -> tuple[float, str, List[str], List[str]]:
    # Weighted consensus:
    # 35% scam linguistic, 15% CLI spoof check, 25% deepfake voice, 25% graph/account trail risk
    cli_weight = 0.15 if req.cli_spoofed else 0.0
    
    composite = (
        (0.35 * req.scam_linguistic_score) +
        cli_weight +
        (0.25 * req.voice_deepfake_score) +
        (0.25 * req.graph_risk_score)
    )
    
    # Cap to max 1.0
    composite = min(composite, 1.0)
    
    # Adjust in case currency counterfeit score is extreme
    if req.currency_counterfeit_score > 0.90:
        composite = max(composite, 0.85)

    # Determine hazard level
    if composite > 0.85:
        level = "CRITICAL"
        mitigations = [
            "Initiate dynamic blocking of financial portals on target device.",
            "Alert cooperating banks to execute instant transaction holds.",
            "Dispatch court-admissible evidence package file."
        ]
        directives = ["LOCK_BANK_APPS", "TRIGGER_NPCI_HOLD", "DISPATCH_CYBER_UNIT"]
    elif composite > 0.60:
        level = "HIGH"
        mitigations = [
            "Display full-screen alert overlay on citizen device.",
            "Add caller and bank details to regional investigative ledger."
        ]
        directives = ["WARN_CITIZEN", "LOG_THREAT_SIGNATURE"]
    elif composite > 0.30:
        level = "MEDIUM"
        mitigations = ["Recommend citizen blocks caller number and checks official credentials."]
        directives = ["SHOW_ALERT_OVERLAY"]
    else:
        level = "LOW"
        mitigations = ["Normal communication signature verified. No actions required."]
        directives = ["PASS"]

    return composite, level, mitigations, directives

# ----------------------------------------------------
# API ENDPOINTS
# ----------------------------------------------------

@app.post("/threat/evaluate", response_model=ThreatEvaluateResponse)
def evaluate_threat(payload: ThreatEvaluateRequest):
    logger.info("Executing threat fusion scoring model pipeline")
    score, level, mitigations, directives = calculate_composite_score(payload)
    return ThreatEvaluateResponse(
        composite_threat_score=score,
        hazard_level=level,
        recommended_mitigations=mitigations,
        system_directives=directives
    )

@post_db = get_db_connection()

@app.post("/geo/events", response_model=GeoEventResponse)
def create_geo_event(payload: GeoEventRequest):
    logger.info(f"Ingesting geo incident event: {payload.incident_type} at ({payload.latitude}, {payload.longitude})")
    
    conn = get_db_connection()
    if conn:
        try:
            with conn.cursor() as cur:
                cur.execute(
                    'INSERT INTO "GeoEvent" (id, "incidentType", latitude, longitude, "riskScore", description) VALUES (uuid_generate_v4(), %s, %s, %s, %s, %s) RETURNING id;',
                    (payload.incident_type, payload.latitude, payload.longitude, payload.risk_score, payload.description)
                )
                row = cur.fetchone()
                conn.commit()
                event_id = row['id']
            return GeoEventResponse(status="SUCCESS", event_id=str(event_id))
        except Exception as e:
            conn.rollback()
            logger.error(f"PostgreSQL GeoEvent insert failed: {str(e)}")
            raise HTTPException(status_code=500, detail="Database write error.")
        finally:
            conn.close()
    else:
        # Fallback local ingestion
        import uuid
        event_id = str(uuid.uuid4())
        mock_geo_events.append({
            "id": event_id,
            "incidentType": payload.incident_type,
            "latitude": payload.latitude,
            "longitude": payload.longitude,
            "riskScore": payload.risk_score,
            "description": payload.description
        })
        return GeoEventResponse(status="SUCCESS", event_id=event_id)

@app.get("/geo/hotspots")
def get_geo_hotspots():
    logger.info("Retrieving geospatial hotspot clusters")
    
    # 1. Fetch Coordinates
    events = []
    conn = get_db_connection()
    if conn:
        try:
            with conn.cursor() as cur:
                cur.execute('SELECT "incidentType", latitude, longitude, "riskScore", description FROM "GeoEvent" WHERE "deletedAt" IS NULL;')
                rows = cur.fetchall()
                events = [dict(r) for r in rows]
        except Exception as e:
            logger.error(f"PostgreSQL fetch failed: {str(e)}")
        finally:
            conn.close()
            
    if not events:
        events = mock_geo_events

    # 2. Extract Coordinates array for DBSCAN
    if len(events) >= 2:
        coords = np.array([[e["latitude"], e["longitude"]] for e in events])
        # Run DBSCAN (eps: approx 10km grid clustering)
        db = DBSCAN(eps=0.08, min_samples=2).fit(coords)
        labels = db.labels_
    else:
        labels = [-1] * len(events)

    # 3. Compile GeoJSON response
    features = []
    for i, e in enumerate(events):
        cluster_id = int(labels[i])
        features.append({
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [e["longitude"], e["latitude"]]
            },
            "properties": {
                "incidentType": e["incidentType"] if "incidentType" in e else e.get("incident_type", "UNKNOWN"),
                "riskScore": e["riskScore"] if "riskScore" in e else e.get("risk_score", 0.0),
                "description": e["description"],
                "clusterId": cluster_id,
                "isHotspot": cluster_id != -1
            }
        })

    return {
        "type": "FeatureCollection",
        "features": features
    }

@app.get("/health")
def health():
    return {"status": "UP", "service": "sentinelx-threat-fusion"}
