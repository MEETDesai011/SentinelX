import os
import re
import math
import logging
from typing import Dict, List, Optional
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from pydantic import BaseModel, Field

logging.basicConfig(level=logging.INFO, format="[%(asctime)s] [%(levelname)s] %(message)s")
logger = logging.getLogger("sentinelx-scam-service")

app = FastAPI(title="SentinelX Scam & Deepfake Detection Service", version="1.0.0")

# ----------------------------------------------------
# DATA SCHEMAS
# ----------------------------------------------------

class ScamAnalyseRequest(BaseModel):
    caller_number: str = Field(..., example="+919876500112")
    call_transcript: str = Field(..., example="You are under arrest by CBI for laundering money.")
    origin_ip: Optional[str] = Field(None, example="103.45.22.99")
    sip_headers: Optional[Dict[str, str]] = None

class ScamAnalyseResponse(BaseModel):
    scam_score: float
    is_scam: bool
    urgency_level: str
    impersonated_entity: Optional[str]
    cloned_voice_detected: bool
    confidence: float

class TranscriptClassifyRequest(BaseModel):
    text: str = Field(..., example="This is Customs department. Pay clearance fee of 20000 rupees.")

class TranscriptClassifyResponse(BaseModel):
    category: str
    impersonated_official: str
    risk_score: float
    trigger_phrases: List[str]

class DeepfakeVoiceRequest(BaseModel):
    audio_sample_base64: str

class DeepfakeVoiceResponse(BaseModel):
    deepfake_score: float
    is_synthetic: bool
    confidence: float

# Mock Script Corpus database for Cosine Similarity searches
SCAM_TEMPLATES = [
    {
        "category": "DIGITAL_ARREST",
        "entity": "CBI / ED Enforcement Directorate",
        "keywords": ["digital arrest", "narcotics", "money laundering", "cbi", "arrest warrant", "camera"],
    },
    {
        "category": "CUSTOMS_FEE",
        "entity": "Mumbai Customs Department",
        "keywords": ["customs clearance", "narcotics found", "parcel fee", "fedex parcel", "illegal package"],
    },
    {
        "category": "BANKING_VERIFICATION",
        "entity": "Reserve Bank of India Compliance",
        "keywords": ["verify account", "card blocked", "transfer security", "kyc verification", "otp share"],
    }
]

# ----------------------------------------------------
# NLP SCORING HELPER
# ----------------------------------------------------

def calculate_scam_linguistic_score(text: str) -> tuple[float, str, List[str]]:
    text_lower = text.lower()
    trigger_matches = []
    matched_entity = "UNKNOWN"
    
    # Check trigger words
    all_triggers = [
        "digital arrest", "cbi", "arrest warrant", "money laundering", "narcotics",
        "police custody", "suspect account", "seize assets", "fedex parcel",
        "customs clearance", "penal code", "supreme court", "video surveillance"
    ]
    
    for trigger in all_triggers:
        if re.search(r'\b' + re.escape(trigger) + r'\b', text_lower):
            trigger_matches.append(trigger)
            
    # Calculate Jaccard similarity / Keyword overlap density
    score_density = len(trigger_matches) / 5.0
    scam_score = min(max(score_density, 0.0), 1.0)
    
    # Impersonation matching
    best_match_count = 0
    for t in SCAM_TEMPLATES:
        overlap = sum(1 for kw in t["keywords"] if kw in text_lower)
        if overlap > best_match_count:
            best_match_count = overlap
            matched_entity = t["entity"]
            
    # Urgency analysis
    urgency_terms = ["immediately", "right now", "do not hang up", "confidential", "court order", "prison"]
    urgency_score = sum(1 for term in urgency_terms if term in text_lower)
    urgency_level = "CRITICAL" if urgency_score >= 2 else "HIGH" if urgency_score == 1 else "MEDIUM"
    
    return scam_score, urgency_level, matched_entity

# ----------------------------------------------------
# API ENDPOINTS
# ----------------------------------------------------

@app.post("/sessions/analyse", response_model=ScamAnalyseResponse)
def analyse_session(payload: ScamAnalyseRequest):
    logger.info(f"Analyzing call session from caller: {payload.caller_number}")
    
    scam_score, urgency_level, matched_entity = calculate_scam_linguistic_score(payload.call_transcript)
    
    # Mock HLR verification: Check CLI routing anomalies
    # CLI numbers prefixing international IPs flag high CLI spoof probability
    cli_spoofed = False
    if payload.sip_headers:
        user_agent = payload.sip_headers.get("user-agent", "").lower()
        if "sip" in user_agent or "asterisk" in user_agent:
            cli_spoofed = True
            
    # Set final parameters
    is_scam = scam_score > 0.65 or cli_spoofed
    cloned_voice_detected = scam_score > 0.80 # Mock deepfake voice detection if linguistic match is extreme
    confidence_level = max(scam_score, 0.75) if is_scam else 0.90
    
    return ScamAnalyseResponse(
        scam_score=scam_score,
        is_scam=is_scam,
        urgency_level=urgency_level,
        impersonated_entity=matched_entity if is_scam else None,
        cloned_voice_detected=cloned_voice_detected,
        confidence=confidence_level
    )

@app.post("/transcripts/classify", response_model=TranscriptClassifyResponse)
def classify_transcript(payload: TranscriptClassifyRequest):
    logger.info("Classifying incoming text transcript segment")
    scam_score, urgency_level, matched_entity = calculate_scam_linguistic_score(payload.text)
    
    trigger_words = [w for w in ["digital arrest", "cbi", "arrest warrant", "narcotics"] if w in payload.text.lower()]
    
    return TranscriptClassifyResponse(
        category="DIGITAL_ARREST" if scam_score > 0.5 else "OTHER",
        impersonated_official=matched_entity,
        risk_score=scam_score,
        trigger_phrases=trigger_words
    )

@app.post("/voice/deepfake", response_model=DeepfakeVoiceResponse)
def verify_voice(payload: DeepfakeVoiceRequest):
    logger.info("Performing acoustic anomaly verification on voice chunk")
    # Simulate extraction of phase discrepancies and frequency spectral metrics
    # In a full run, this loads a ResNeXt or RawNet model checkpoint
    # Mock output returns clean validation metrics
    mock_synthetic_score = 0.89
    return DeepfakeVoiceResponse(
        deepfake_score=mock_synthetic_score,
        is_synthetic=mock_synthetic_score > 0.5,
        confidence=0.92
    )

# ----------------------------------------------------
# WEBSOCKET REAL-TIME AUDIO CHANNEL
# ----------------------------------------------------

@app.websocket("/live-session")
async def live_websocket_session(websocket: WebSocket):
    await websocket.accept()
    logger.info("Live WebSocket session channel established with edge device")
    
    call_transcript_builder = []
    
    try:
        while True:
            # Expecting text segment or audio packet bytes
            # Here we expect a simple JSON event structure for the MVP
            data = await websocket.receive_json()
            event_type = data.get("event")
            
            if event_type == "audio_chunk":
                # Simulated transcription segment
                transcript_text = data.get("text", "")
                if transcript_text:
                    call_transcript_builder.append(transcript_text)
                    full_text = " ".join(call_transcript_builder)
                    
                    # Evaluate scam probability metrics
                    scam_score, urgency_level, matched_entity = calculate_scam_linguistic_score(full_text)
                    
                    # Push Alert back if threat limit breached
                    if scam_score > 0.70:
                        await websocket.send_json({
                            "event": "threat_alert",
                            "risk_score": scam_score,
                            "urgency": urgency_level,
                            "entity": matched_entity,
                            "directive": "WARN_AND_LOCK"
                        })
                    else:
                        await websocket.send_json({
                            "event": "session_progress",
                            "risk_score": scam_score
                        })
            
            elif event_type == "hangup":
                logger.info("WebSocket connection closed via client hangup event")
                break
                
    except WebSocketDisconnect:
        logger.warn("WebSocket caller disconnected unexpectedly")
    except Exception as e:
        logger.error(f"WebSocket execution error: {str(e)}")
    finally:
        try:
            await websocket.close()
        except Exception:
            pass
        logger.info("WebSocket connection finalized")

@app.get("/health")
def health():
    return {"status": "UP", "service": "sentinelx-scam-service"}
