"""SentinelX currency service: denomination estimate only; never authenticates a note."""
import os, base64, logging
import cv2, numpy as np, joblib
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Any
from model_engine import predict_denomination

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("sentinelx-currency")
ROOT = os.path.dirname(__file__)
MODEL_PATH = os.path.join(ROOT, "models", "sentinelx_denomination_model.joblib")
BUNDLE = joblib.load(MODEL_PATH) if os.path.exists(MODEL_PATH) else None
META_PATH = os.path.join(ROOT, "models", "model_metadata.json")
import json
with open(META_PATH, encoding="utf-8") as f: MODEL_INFO = json.load(f)

app = FastAPI(title="SentinelX Currency Denomination Service", version="1.0.0",
              description="Six-class INR denomination estimator. Authenticity is NOT determined.")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True,
                   allow_methods=["*"], allow_headers=["*"])

class DetectRequest(BaseModel):
    image_base64: Optional[str] = None
    claimed_denomination: Optional[Any] = None
    device_metadata: Optional[str] = None

@app.get("/health")
def health():
    return {"status":"UP", "service":"sentinelx-currency-denomination", "model_loaded":BUNDLE is not None,
            "task":"denomination_only", "authenticity_detection_supported":False}

@app.get("/currency/model-info")
def model_info():
    return MODEL_INFO

@app.post("/currency/detect")
@app.post("/currency/detect/mobile")
def detect(payload: DetectRequest):
    if not payload.image_base64:
        return {"decision_rule":"Rule 1: Request Image", "image_uploaded":False,
                "is_counterfeit":None, "classification":"UNVERIFIED", "authenticity_status":"NOT_CHECKED",
                "confidence":None, "denomination_confidence":None, "brief_reason":"Upload an image to estimate its denomination. Authenticity cannot be checked by this model.",
                "detailed_explanations":[], "detected_denomination":0, "detected_denomination_label":"UNKNOWN",
                "serial_number":None, "security_markers":[], "cv_pipeline_telemetry":{"status":"AWAITING_IMAGE"}, "model_info":MODEL_INFO}
    if BUNDLE is None:
        raise HTTPException(503, "Denomination model is missing. Run the setup instructions in README_REBUILD.md.")
    raw = payload.image_base64.strip()
    if "," in raw and raw.lower().startswith("data:image/"):
        raw = raw.split(",", 1)[1]
    try:
        image_bytes = base64.b64decode(raw, validate=True)
    except Exception:
        raise HTTPException(400, "Invalid base64 image data")
    if len(image_bytes) > 12 * 1024 * 1024:
        raise HTTPException(413, "Image exceeds 12 MB limit")
    arr = np.frombuffer(image_bytes, np.uint8)
    image = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if image is None:
        raise HTTPException(400, "Unsupported or corrupt image")
    try:
        pred = predict_denomination(image, BUNDLE)
    except ValueError as e:
        raise HTTPException(422, str(e))
    denom = pred["denomination"] or 0
    # Critical safety contract: this dataset has no authenticity labels.
    return {"decision_rule":"Denomination estimate only; authenticity not evaluated", "image_uploaded":True,
            "is_counterfeit":None, "classification":"UNVERIFIED", "authenticity_status":"NOT_CHECKED",
            "confidence":None, "denomination_confidence":round(pred["confidence"],4),
            "brief_reason":("Possible denomination estimate only. This model cannot determine whether the image is a real banknote, specimen, or counterfeit." if denom else
                            "The model could not confidently estimate a denomination. This is not a counterfeit finding."),
            "detailed_explanations":["No genuine/counterfeit/specimen labels were supplied in the training data.",
                                     "Do not use this result to accept, reject, or authenticate currency."],
            "detected_denomination":denom, "detected_denomination_label":pred["label"],
            "serial_number":None, "security_markers":[],
            "cv_pipeline_telemetry":{"model_task":"six-denomination classification", "top_class_margin":round(pred["margin"],4),
                                     "class_probabilities":pred["probabilities"]}, "model_info":MODEL_INFO}
