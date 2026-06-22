import logging
from typing import List, Optional
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

logging.basicConfig(level=logging.INFO, format="[%(asctime)s] [%(levelname)s] %(message)s")
logger = logging.getLogger("sentinelx-citizen-shield")

app = FastAPI(title="SentinelX Citizen Shield Service", version="1.0.0")

# ----------------------------------------------------
# DATA SCHEMAS
# ----------------------------------------------------

class AssessScamRequest(BaseModel):
    message_text: str = Field(..., example="I got a call claiming to be CBI and they asked for 50000 rupees.")
    language: str = Field("en", example="en, hi, gu")

class AssessScamResponse(BaseModel):
    scam_risk: str
    risk_score: float
    guidance_message: str
    action_steps: List[str]
    detected_language: str

class SubmitReportRequest(BaseModel):
    reporter_name: str
    reporter_phone: str
    details: str
    location: Optional[str] = None

class SubmitReportResponse(BaseModel):
    status: str
    case_ref_id: str
    acknowledgement: str

# ----------------------------------------------------
# MULTILINGUAL KNOWLEDGE DICTIONARY
# ----------------------------------------------------

GUIDANCE_KNOWLEDGE = {
    "en": {
        "SCAM_FOUND": "WARNING: This matches a standard Digital Arrest scam layout. Do NOT send money. Police or CBI will never ask you to stay on a video call or demand verification transfers.",
        "SCAM_NOT_FOUND": "This message appears clear, but always verify details before sending any money. Do not share OTPs.",
        "steps": [
            "Hang up the call immediately.",
            "Block the sender number on your device and WhatsApp.",
            "Report the call details using the Citizen Shield portal.",
            "Inform your local Cyber Cell by calling 1930."
        ]
    },
    "hi": {
        "SCAM_FOUND": "चेतावनी: यह संदेश एक डिजिटल अरेस्ट घोटाले (Digital Arrest Scam) से मेल खाता है। कोई पैसा न भेजें। पुलिस या सीबीआई कभी भी वीडियो कॉल पर रहने या सत्यापन ट्रांसफर की मांग नहीं करती है।",
        "SCAM_NOT_FOUND": "यह संदेश सामान्य लग रहा है, लेकिन कोई भी पैसा भेजने से पहले हमेशा विवरण सत्यापित करें। कभी भी ओटीपी साझा न करें।",
        "steps": [
            "कॉल तुरंत काट दें।",
            "अपने डिवाइस और व्हाट्सएप पर भेजने वाले का नंबर ब्लॉक करें।",
            "सिटीजन शील्ड पोर्टल का उपयोग करके कॉल का विवरण दर्ज करें।",
            "1930 पर कॉल करके अपने स्थानीय साइबर सेल को सूचित करें।"
        ]
    },
    "gu": {
        "SCAM_FOUND": "ચેતવણી: આ સંદેશ ડિજિટલ અરેસ્ટ સ્કેમ (Digital Arrest Scam) જેવો છે. કોઈ પૈસા મોકલશો નહીં. પોલીસ અથવા સીબીઆઈ ક્યારેય વીડિયો કોલ પર રહેવા અથવા વેરિફિકેશન ટ્રાન્સફરની માંગણી કરતી નથી.",
        "SCAM_NOT_FOUND": "આ સંદેશ સામાન્ય લાગે છે, પરંતુ પૈસા મોકલતા પહેલા હંમેશા વિગતો ચકાસો. કોઈની સાથે ઓટીપી શેર કરશો નહીં.",
        "steps": [
            "કોલ તરત જ કાપી નાખો.",
            "તમારા ઉપકરણ અને વોટ્સએપ પર મોકલનારનો નંબર બ્લોક કરો.",
            "સિટીઝન શીલ્ડ પોર્ટલનો ઉપયોગ કરીને કોલની વિગતો નોંધો.",
            "૧૯૩૦ પર કોલ કરીને તમારી સ્થાનિક સાયબર સેલને જાણ કરો."
        ]
    }
}

# ----------------------------------------------------
# LANGUAGE EXTENSION REGISTRATION ROUTINES
# ----------------------------------------------------
# Future-Phase Expansion Points for other 9+ regional languages (e.g. Marathi, Telugu, Tamil, Kannada, Bengali)
# To register a new language:
# 1. Translate the SCAM_FOUND, SCAM_NOT_FOUND, and steps strings.
# 2. Add them to GUIDANCE_KNOWLEDGE dictionary using standard ISO 639-1 code as key.
# 3. Add language mapping support inside Bhashini Translation API integration hooks.

# ----------------------------------------------------
# API ENDPOINTS
# ----------------------------------------------------

@app.post("/citizen/assess", response_model=AssessScamResponse)
def assess_incident(payload: AssessScamRequest):
    logger.info(f"Evaluating citizen report in language: {payload.language}")
    
    lang = payload.language.lower()
    if lang not in GUIDANCE_KNOWLEDGE:
        logger.warn(f"Requested language '{lang}' not fully supported. Falling back to English.")
        lang = "en"
        
    text_lower = payload.message_text.lower()
    
    # Simple trigger keywords density check for risk scoring (including common transliterated/local language synonyms)
    scam_keywords = [
        "cbi", "arrest", "narcotics", "customs", "police", "money laundering", "court", "parcel", "jail",
        "सीबीआई", "अरेस्ट", "पुलिस", "जेल", "पार्सल", "कस्टम", "कोर्ट", "गिरफ्तार", "पैसे",
        "સીબીઆઈ", "અરેસ્ટ", "પોલીસ", "જેલ", "પાર્સલ"
    ]
    hits = sum(1 for kw in scam_keywords if kw in text_lower)
    
    risk_score = min(hits / 3.0, 1.0)
    risk_level = "CRITICAL" if risk_score > 0.8 else "HIGH" if risk_score > 0.5 else "MEDIUM" if risk_score > 0.2 else "LOW"
    
    knowledge = GUIDANCE_KNOWLEDGE[lang]
    if risk_score > 0.3:
        guidance = knowledge["SCAM_FOUND"]
        steps = knowledge["steps"]
    else:
        guidance = knowledge["SCAM_NOT_FOUND"]
        steps = [knowledge["steps"][2]] if len(knowledge["steps"]) > 2 else []
        
    return AssessScamResponse(
        scam_risk=risk_level,
        risk_score=risk_score,
        guidance_message=guidance,
        action_steps=steps,
        detected_language=lang
    )

@app.post("/citizen/report", response_model=SubmitReportResponse)
def submit_report(payload: SubmitReportRequest):
    logger.info(f"Submitting cyber crime report for citizen: {payload.reporter_name}")
    # Generate mock reference ticket details
    mock_ticket = "REF-SX-2026-9811"
    
    return SubmitReportResponse(
        status="SUCCESS",
        case_ref_id=mock_ticket,
        acknowledgement=f"Your complaint has been successfully registered. Case Reference: {mock_ticket}. An investigator from your local cyber cell will contact you if further evidence is required."
    )

@app.get("/health")
def health():
    return {"status": "UP", "service": "sentinelx-citizen-shield"}
