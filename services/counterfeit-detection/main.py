import base64
import logging
import io
import re
from typing import List, Optional
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
import numpy as np
import cv2
from PIL import Image

logging.basicConfig(level=logging.INFO, format="[%(asctime)s] [%(levelname)s] %(message)s")
logger = logging.getLogger("sentinelx-counterfeit-service")

app = FastAPI(title="SentinelX Counterfeit Currency Intelligence Service", version="1.0.0")

# ----------------------------------------------------
# DATA SCHEMAS
# ----------------------------------------------------

class CurrencyDetectRequest(BaseModel):
    image_base64: str = Field(..., description="Base64 encoded string of the note image")
    claimed_denomination: int = Field(500, description="Denomination to verify (e.g. 100, 200, 500)")
    device_metadata: Optional[str] = None

class FailedMarker(BaseModel):
    marker_name: str
    details: str

class CurrencyDetectResponse(BaseModel):
    is_counterfeit: bool
    confidence: float
    detected_denomination: int
    serial_number: str
    failed_markers: List[FailedMarker]
    cv_pipeline_telemetry: dict

# ----------------------------------------------------
# IMAGE PROCESSING PIPELINE MOCK
# ----------------------------------------------------

def preprocess_and_verify_note(image_bytes: bytes, claimed_denom: int) -> tuple[bool, float, str, List[FailedMarker], dict]:
    # Decode to OpenCV format
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    if img is None:
        raise ValueError("OpenCV failed to decode image array.")

    # 1. OpenCV Preprocessing
    height, width, channels = img.shape
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    edges = cv2.Canny(blurred, 50, 150)
    
    # Calculate edge density as a proxy for printing crispness
    # Counterfeits usually printed on inkjet have blurred/fuzzy boundaries, yielding lower edge density
    total_pixels = height * width
    edge_density = float(np.sum(edges > 0) / total_pixels)
    
    # 2. Simulated Segmentations & Comparisons
    # In a full production run, we locate coordinates using YOLOv8 bounding boxes
    # Watermark bounding box (typically right side of Indian notes)
    watermark_crop = gray[int(height*0.2):int(height*0.8), int(width*0.65):int(width*0.9)]
    # Security thread crop (typically middle vertical thread)
    thread_crop = img[0:height, int(width*0.45):int(width*0.55)]

    # Check color variance in thread to verify green-to-blue color shifting
    # Genuine notes have high Hue variance due to reflective optical ink. Fake printouts have zero variance.
    hsv_thread = cv2.cvtColor(thread_crop, cv2.COLOR_BGR2HSV)
    h_channel = hsv_thread[:, :, 0]
    hue_variance = float(np.var(h_channel))

    # Evaluate indicators
    failed_markers = []
    
    # We calibrate scores based on edge crispness and optical variance
    # Authentic target values: hue_variance > 10.0, edge_density > 0.03
    thread_authentic = hue_variance > 8.0
    edges_authentic = edge_density > 0.02
    
    if not thread_authentic:
        failed_markers.append(FailedMarker(
            marker_name="security_thread_variance",
            details=f"Optical shift check failed. Hue variance detected: {hue_variance:.2f} (Expected > 8.0)"
        ))
        
    if not edges_authentic:
        failed_markers.append(FailedMarker(
            marker_name="microprint_clarity",
            details=f"Blurred print signature detected. Edge index: {edge_density:.4f} (Expected > 0.02)"
        ))

    # Mock Serial Number OCR extraction
    # Simulated search for serial strings
    mock_serial = "5AC982341"
    
    is_counterfeit = len(failed_markers) > 0
    
    # Calibrate confidence
    if is_counterfeit:
        confidence = 0.94 if len(failed_markers) == 2 else 0.78
    else:
        confidence = 0.98

    telemetry = {
        "image_resolution": f"{width}x{height}",
        "computed_edge_density": edge_density,
        "thread_hue_variance": hue_variance,
    }

    return is_counterfeit, confidence, claimed_denom, mock_serial, failed_markers, telemetry

# ----------------------------------------------------
# API CONTROLLERS
# ----------------------------------------------------

@app.post("/currency/detect", response_model=CurrencyDetectResponse)
def detect_currency(payload: CurrencyDetectRequest):
    logger.info(f"Counterfeit check invoked for claimed denomination: {payload.claimed_denomination}")
    
    try:
        # Base64 decode
        header_regex = re.compile(r'^data:image/.+;base64,')
        clean_base64 = header_regex.sub('', payload.image_base64)
        image_bytes = base64.b64decode(clean_base64)
    except Exception as e:
        logger.error(f"Image decode failed: {str(e)}")
        raise HTTPException(status_code=400, detail="Invalid base64 image data payload.")
        
    try:
        is_counterfeit, confidence, denom, serial, failed, telemetry = preprocess_and_verify_note(
            image_bytes, payload.claimed_denomination
        )
    except Exception as e:
        logger.error(f"Preprocessing error: {str(e)}")
        # In case OpenCV fails (e.g. mock empty image), return fallback counterfeit flag
        return CurrencyDetectResponse(
            is_counterfeit=True,
            confidence=0.50,
            detected_denomination=payload.claimed_denomination,
            serial_number="UNKNOWN",
            failed_markers=[FailedMarker(marker_name="image_read_error", details=str(e))],
            cv_pipeline_telemetry={"error": str(e)}
        )
        
    return CurrencyDetectResponse(
        is_counterfeit=is_counterfeit,
        confidence=confidence,
        detected_denomination=denom,
        serial_number=serial,
        failed_markers=failed,
        cv_pipeline_telemetry=telemetry
    )

@app.post("/currency/detect/mobile", response_model=CurrencyDetectResponse)
def detect_currency_mobile(payload: CurrencyDetectRequest):
    # Route directly to detect pipeline for MVP
    return detect_currency(payload)

@app.get("/health")
def health():
    return {"status": "UP", "service": "sentinelx-counterfeit-service"}
