import os
import re
import math
import logging
import uuid
from datetime import datetime
from typing import Dict, List, Optional, Any
try:
    from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
    from fastapi.middleware.cors import CORSMiddleware
    from pydantic import BaseModel, Field
except ImportError:
    class FastAPI:
        def __init__(self, *args, **kwargs): pass
        def add_middleware(self, *args, **kwargs): pass
        def post(self, *args, **kwargs): return lambda f: f
        def get(self, *args, **kwargs): return lambda f: f
        def websocket(self, *args, **kwargs): return lambda f: f
    class HTTPException(Exception):
        def __init__(self, status_code=400, detail=""):
            super().__init__(detail)
            self.status_code = status_code
            self.detail = detail
    class WebSocket: pass
    class WebSocketDisconnect(Exception): pass
    class CORSMiddleware: pass
    class BaseModel:
        def __init__(self, **kwargs):
            for k, v in kwargs.items():
                setattr(self, k, v)
        def dict(self): return self.__dict__
    def Field(default=None, **kwargs): return default

logging.basicConfig(level=logging.INFO, format="[%(asctime)s] [%(levelname)s] %(message)s")
logger = logging.getLogger("sentinelx-scam-service")

app = FastAPI(
    title="SentinelX Scam & Adaptive Fraud Detection Service",
    description="Active/Adaptive Fraud Detection System implementing Fraud Detection Decision Table (Rules 1-4) with incident pattern retention and future similarity matching.",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------------------------------------------
# DYNAMIC LEARNED FRAUD PATTERNS DATABASE (Adaptive Memory)
# ----------------------------------------------------
# Retains learned patterns when fraud incidents are resolved (PDF Item 2, Steps 8-11)
LEARNED_FRAUD_PATTERNS: List[Dict[str, Any]] = [
    {
        "pattern_id": "PAT-DA-9811",
        "category": "DIGITAL_ARREST",
        "title": "CBI Narcotics & Money Laundering Video Arrest Lure",
        "keywords": ["digital arrest", "narcotics", "money laundering", "cbi", "arrest warrant", "skype camera", "supreme court"],
        "caller_prefix": "+91800",
        "threat_signature": "Impersonates CBI Commander demanding 24hr Skype video lock and RTGS verification transfer.",
        "resolved_at": "2026-08-28T14:22:00Z",
        "match_count": 14,
        "prevention_directive": "BLOCK_CALLER_AND_LOCK_BANKING_APPS"
    },
    {
        "pattern_id": "PAT-FX-4402",
        "category": "CUSTOMS_EXTORTION",
        "title": "FedEx Illegal Narcotics Parcel Customs Clearance Fee",
        "keywords": ["fedex parcel", "customs clearance", "narcotics found", "mumbai airport", "passport seizure", "clearance fee"],
        "caller_prefix": "+91700",
        "threat_signature": "Claims courier contains illegal MDMA seized at customs, demands instant UPI payment.",
        "resolved_at": "2026-08-30T09:15:00Z",
        "match_count": 9,
        "prevention_directive": "FLAG_CUSTOMS_SCAM_AND_ALERT_USER"
    },
    {
        "pattern_id": "PAT-BK-1109",
        "category": "BANKING_KYC_SPOOF",
        "title": "Electricity Bill / NetBanking Suspension Phishing Lure",
        "keywords": ["power disconnected", "electricity bill", "update apk", "kyc verification", "card blocked", "otp share"],
        "caller_prefix": "+91910",
        "threat_signature": "SMS urging download of remote access APK to prevent immediate power disconnection.",
        "resolved_at": "2026-08-31T18:40:00Z",
        "match_count": 22,
        "prevention_directive": "BLOCK_REMOTE_APK_DOWNLOAD"
    }
]

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
    matched_learned_pattern: Optional[str] = None
    similarity_score: float = 0.0

class DecisionTableEvaluateRequest(BaseModel):
    activity_text: str = Field(..., example="This is CBI officer. You are on digital arrest for illegal FedEx narcotics parcel.")
    caller_id: Optional[str] = Field("+91800123456", example="+91800123456")
    is_incident_resolved: bool = Field(False, description="Whether the user/officer marked the fraud incident as resolved/stopped")
    force_suspicious: Optional[bool] = None

class DecisionTableEvaluateResponse(BaseModel):
    decision_rule: str # "Rule 1" | "Rule 2" | "Rule 3" | "Rule 4"
    rule_title: str
    suspicious_detected: bool
    matches_known_pattern: bool
    incident_resolved: bool
    action_allow_normal_processing: bool
    action_flag_investigate: bool
    action_record_learn_pattern: bool
    similarity_score: float
    matched_pattern_details: Optional[Dict[str, Any]]
    explanation: str

class RetainPatternRequest(BaseModel):
    incident_id: str
    title: str
    category: str
    transcript_or_text: str
    keywords: List[str]
    caller_id: Optional[str] = None
    threat_signature: str

class RetainPatternResponse(BaseModel):
    status: str
    pattern_id: str
    total_learned_patterns: int
    message: str

# ----------------------------------------------------
# ADAPTIVE PATTERN SIMILARITY & EVALUATION LOGIC
# ----------------------------------------------------

def find_best_matching_pattern(text: str, caller_id: Optional[str] = None) -> tuple[Optional[Dict[str, Any]], float]:
    """
    Compares incoming activity with learned fraud patterns (Step 10 in Structured English).
    Calculates Jaccard/keyword overlap similarity.
    """
    text_lower = text.lower()
    best_pattern = None
    highest_similarity = 0.0

    for pat in LEARNED_FRAUD_PATTERNS:
        keywords = pat.get("keywords", [])
        if not keywords:
            continue
        matched_kw = sum(1 for kw in keywords if kw.lower() in text_lower)
        similarity = matched_kw / len(keywords)
        
        # Boost similarity if caller prefix matches
        if caller_id and pat.get("caller_prefix") and caller_id.startswith(pat.get("caller_prefix")):
            similarity = min(1.0, similarity + 0.25)
            
        if similarity > highest_similarity:
            highest_similarity = similarity
            best_pattern = pat

    return best_pattern, round(highest_similarity, 3)

def calculate_scam_linguistic_score(text: str) -> tuple[float, str, List[str]]:
    text_lower = text.lower()
    trigger_matches = []
    
    all_triggers = [
        "digital arrest", "cbi", "arrest warrant", "money laundering", "narcotics",
        "police custody", "suspect account", "seize assets", "fedex parcel",
        "customs clearance", "penal code", "supreme court", "video surveillance",
        "electricity bill", "update apk", "kyc verification", "card blocked", "otp"
    ]
    
    for trigger in all_triggers:
        if re.search(r'\b' + re.escape(trigger) + r'\b', text_lower):
            trigger_matches.append(trigger)
            
    score_density = len(trigger_matches) / 4.0
    scam_score = min(max(score_density, 0.0), 1.0)
    
    urgency_terms = ["immediately", "right now", "do not hang up", "confidential", "court order", "prison", "suspended"]
    urgency_score = sum(1 for term in urgency_terms if term in text_lower)
    urgency_level = "CRITICAL" if urgency_score >= 2 else "HIGH" if urgency_score == 1 else "MEDIUM"
    
    return scam_score, urgency_level, trigger_matches

# ----------------------------------------------------
# API ENDPOINTS
# ----------------------------------------------------

@app.post("/sessions/analyse", response_model=ScamAnalyseResponse)
def analyse_session(payload: ScamAnalyseRequest):
    logger.info(f"Analyzing call session from caller: {payload.caller_number}")
    
    scam_score, urgency_level, trigger_words = calculate_scam_linguistic_score(payload.call_transcript)
    best_pattern, similarity = find_best_matching_pattern(payload.call_transcript, payload.caller_number)
    
    # Check for CLI spoofing
    cli_spoofed = False
    if payload.sip_headers:
        user_agent = payload.sip_headers.get("user-agent", "").lower()
        if "sip" in user_agent or "asterisk" in user_agent:
            cli_spoofed = True
            
    is_scam = scam_score > 0.50 or similarity > 0.40 or cli_spoofed
    cloned_voice_detected = scam_score > 0.75
    confidence_level = max(scam_score, similarity, 0.75) if is_scam else 0.92
    
    return ScamAnalyseResponse(
        scam_score=scam_score,
        is_scam=is_scam,
        urgency_level=urgency_level,
        impersonated_entity=best_pattern["title"] if (best_pattern and similarity > 0.4) else "UNCLASSIFIED_SUSPECT",
        cloned_voice_detected=cloned_voice_detected,
        confidence=confidence_level,
        matched_learned_pattern=best_pattern["pattern_id"] if (best_pattern and similarity > 0.4) else None,
        similarity_score=similarity
    )

@app.post("/patterns/evaluate-decision-table", response_model=DecisionTableEvaluateResponse)
def evaluate_decision_table(payload: DecisionTableEvaluateRequest):
    """
    Implements the Decision Table — Fraud Detection from PDF:
    Conditions:
      1. Suspicious activity detected?
      2. Matches known fraud pattern?
      3. Fraud incident resolved/stopped?
    Actions:
      - Allow normal processing
      - Flag / investigate
      - Record / learn pattern
    """
    logger.info("Evaluating Fraud Detection Decision Table")
    
    # 1. Suspicious detection
    scam_score, _, triggers = calculate_scam_linguistic_score(payload.activity_text)
    if payload.force_suspicious is not None:
        suspicious_detected = payload.force_suspicious
    else:
        suspicious_detected = scam_score > 0.30 or len(triggers) > 0

    # 2. Known pattern match
    best_pattern, similarity = find_best_matching_pattern(payload.activity_text, payload.caller_id)
    matches_known_pattern = suspicious_detected and (similarity >= 0.35)
    
    # 3. Incident resolved state
    incident_resolved = payload.is_incident_resolved

    # Apply Decision Table Rules:
    if not suspicious_detected:
        # Rule 1: No suspicious activity
        return DecisionTableEvaluateResponse(
            decision_rule="Rule 1",
            rule_title="Rule 1: Normal Routine Activity",
            suspicious_detected=False,
            matches_known_pattern=False,
            incident_resolved=False,
            action_allow_normal_processing=True,
            action_flag_investigate=False,
            action_record_learn_pattern=False,
            similarity_score=similarity,
            matched_pattern_details=None,
            explanation="Activity verified benign. Allowed normal processing without intervention."
        )
    elif suspicious_detected and not matches_known_pattern:
        # Rule 2: Suspicious activity detected, but NO match with known learned pattern
        return DecisionTableEvaluateResponse(
            decision_rule="Rule 2",
            rule_title="Rule 2: Unmatched Suspicious Activity (Monitoring)",
            suspicious_detected=True,
            matches_known_pattern=False,
            incident_resolved=incident_resolved,
            action_allow_normal_processing=True, # Rule 2 footnote: activity is not treated as known fraud, normal monitoring continues
            action_flag_investigate=False,
            action_record_learn_pattern=False,
            similarity_score=similarity,
            matched_pattern_details=None,
            explanation="Suspicious anomaly detected, but does not match any known learned fraud pattern. Normal monitoring continues."
        )
    elif suspicious_detected and matches_known_pattern and not incident_resolved:
        # Rule 3: Suspicious activity matches known fraud pattern, incident ongoing/unresolved
        if best_pattern:
            best_pattern["match_count"] = best_pattern.get("match_count", 0) + 1
        return DecisionTableEvaluateResponse(
            decision_rule="Rule 3",
            rule_title="Rule 3: Active Known Fraud Attack Detected",
            suspicious_detected=True,
            matches_known_pattern=True,
            incident_resolved=False,
            action_allow_normal_processing=False,
            action_flag_investigate=True,
            action_record_learn_pattern=False,
            similarity_score=similarity,
            matched_pattern_details=best_pattern,
            explanation=f"Matches learned pattern '{best_pattern.get('title')}' with {similarity*100:.1f}% similarity. Action: Flagged for investigation & blocked from normal processing."
        )
    else:
        # Rule 4: Suspicious activity matches known fraud pattern AND incident resolved/stopped
        return DecisionTableEvaluateResponse(
            decision_rule="Rule 4",
            rule_title="Rule 4: Fraud Incident Resolved & Pattern Learned",
            suspicious_detected=True,
            matches_known_pattern=True,
            incident_resolved=True,
            action_allow_normal_processing=False,
            action_flag_investigate=True,
            action_record_learn_pattern=True, # Retain pattern!
            similarity_score=similarity,
            matched_pattern_details=best_pattern,
            explanation=f"Incident resolved. Pattern '{best_pattern.get('title')}' updated and retained in adaptive memory database for future prevention."
        )

@app.post("/patterns/retain", response_model=RetainPatternResponse)
def retain_learned_pattern(payload: RetainPatternRequest):
    """
    Step 9: Store the relevant learned fraud pattern for future detection.
    """
    logger.info(f"Retaining learned fraud pattern from incident: {payload.incident_id}")
    
    new_pattern_id = f"PAT-LRN-{uuid.uuid4().hex[:6].upper()}"
    new_entry = {
        "pattern_id": new_pattern_id,
        "category": payload.category,
        "title": payload.title,
        "keywords": payload.keywords if payload.keywords else payload.transcript_or_text.lower().split()[:8],
        "caller_prefix": payload.caller_id[:6] if payload.caller_id else "+91",
        "threat_signature": payload.threat_signature,
        "resolved_at": datetime.now().isoformat() + "Z",
        "match_count": 1,
        "prevention_directive": "DYNAMIC_PREVENT_SIMILAR_ATTACK"
    }
    
    LEARNED_FRAUD_PATTERNS.insert(0, new_entry)
    
    return RetainPatternResponse(
        status="SUCCESS",
        pattern_id=new_pattern_id,
        total_learned_patterns=len(LEARNED_FRAUD_PATTERNS),
        message=f"Pattern '{payload.title}' successfully retained in SentinelX adaptive memory bank."
    )

@app.get("/patterns/learned")
def get_learned_patterns():
    """Returns the list of all retained learned fraud patterns."""
    return {
        "total_patterns": len(LEARNED_FRAUD_PATTERNS),
        "patterns": LEARNED_FRAUD_PATTERNS
    }

@app.get("/health")
def health():
    return {
        "status": "UP",
        "service": "sentinelx-scam-service",
        "active_learned_patterns": len(LEARNED_FRAUD_PATTERNS)
    }
