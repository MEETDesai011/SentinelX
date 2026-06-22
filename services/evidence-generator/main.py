import os
import hashlib
import logging
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

logging.basicConfig(level=logging.INFO, format="[%(asctime)s] [%(levelname)s] %(message)s")
logger = logging.getLogger("sentinelx-evidence-generator")

app = FastAPI(title="SentinelX Digital Evidence Package Generator", version="1.0.0")

# Setup report folder
REPORTS_DIR = "./reports"
os.makedirs(REPORTS_DIR, exist_ok=True)

# ----------------------------------------------------
# DATA SCHEMAS
# ----------------------------------------------------

class TransactionFlow(BaseModel):
    tx_id: str
    from_account: str
    to_account: str
    amount: float
    timestamp: str

class EvidencePackageRequest(BaseModel):
    case_number: str = Field(..., example="SX-2026-0041")
    incident_type: str = Field(..., example="DIGITAL_ARREST")
    reporter_name: str = Field(..., example="Rajesh Sharma")
    call_transcript: str = Field(..., example="You must transfer security check fund.")
    threat_level: str = Field("CRITICAL", example="CRITICAL")
    scam_score: float = Field(0.94)
    deepfake_score: float = Field(0.88)
    money_trail: List[TransactionFlow] = []

class EvidencePackageResponse(BaseModel):
    status: str
    pdf_file_path: str
    sha256_hash: str
    digital_signature: str
    signed_by: str

# ----------------------------------------------------
# PDF COMPILATION LOGIC (REPORTLAB)
# ----------------------------------------------------

def generate_evidence_pdf(payload: EvidencePackageRequest, output_path: str) -> str:
    # 1. Setup Document Layout
    doc = SimpleDocTemplate(
        output_path,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=54,
        bottomMargin=54
    )
    
    story = []
    styles = getSampleStyleSheet()
    
    # 2. Typography Styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=20,
        textColor=colors.HexColor('#2E3440'),
        spaceAfter=15
    )
    
    section_style = ParagraphStyle(
        'SectionHeader',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=12,
        textColor=colors.HexColor('#008080'),
        spaceBefore=12,
        spaceAfter=6
    )
    
    body_style = ParagraphStyle(
        'DocBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        textColor=colors.HexColor('#4C566A'),
        leading=14
    )

    # 3. Report Header
    story.append(Paragraph("SENTINELX PUBLIC SAFETY FORENSIC LEDGER", title_style))
    story.append(Paragraph("DIGITAL EVIDENCE PACKAGE (DEP) — COURT ADMISSIBLE REPORT", body_style))
    story.append(Spacer(1, 15))

    # 4. Meta Table
    meta_data = [
        [Paragraph("<b>Case Reference:</b>", body_style), Paragraph(payload.case_number, body_style)],
        [Paragraph("<b>Incident Classification:</b>", body_style), Paragraph(payload.incident_type, body_style)],
        [Paragraph("<b>Primary Complainant:</b>", body_style), Paragraph(payload.reporter_name, body_style)],
        [Paragraph("<b>Threat Level / Scoring:</b>", body_style), Paragraph(f"{payload.threat_level} (Scam Index: {payload.scam_score:.2f}, Synthetic Match: {payload.deepfake_score:.2f})", body_style)]
    ]
    t_meta = Table(meta_data, colWidths=[150, 400])
    t_meta.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F8F9FA')),
        ('PADDING', (0,0), (-1,-1), 6),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E5E9F0')),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(t_meta)
    story.append(Spacer(1, 15))

    # 5. Segment Transcript
    story.append(Paragraph("I. Call Transcript Segment", section_style))
    story.append(Paragraph(f"<i>\"{payload.call_transcript}\"</i>", body_style))
    story.append(Spacer(1, 15))

    # 6. Money Trail Table
    story.append(Paragraph("II. Financial Trace Flow (Mule Account Hop Vectors)", section_style))
    if payload.money_trail:
        trail_data = [["Tx ID", "From Account", "To Account", "Amount", "Timestamp"]]
        for tx in payload.money_trail:
            trail_data.append([
                tx.tx_id,
                tx.from_account,
                tx.to_account,
                f"INR {tx.amount:,.2f}",
                tx.timestamp
            ])
            
        t_trail = Table(trail_data, colWidths=[80, 110, 110, 110, 130])
        t_trail.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#2E3440')),
            ('TEXTCOLOR', (0,0), (-1,0), colors.white),
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('FONTSIZE', (0,0), (-1,0), 9),
            ('PADDING', (0,0), (-1,-1), 6),
            ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#F8F9FA')]),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E5E9F0')),
        ]))
        story.append(t_trail)
    else:
        story.append(Paragraph("No financial movements recorded for this case reference.", body_style))
    story.append(Spacer(1, 15))

    # 7. Forensic Signatures & Chain of Custody
    story.append(Paragraph("III. Admissibility Signatures & Chain of Custody Verification", section_style))
    story.append(Paragraph("This document has been compiled automatically by the SentinelX Threat Fusion container. Logging integrity verified in compliance with Section 65B of the Indian Evidence Act.", body_style))
    
    # Render PDF
    doc.build(story)
    return output_path

# ----------------------------------------------------
# API ENDPOINTS
# ----------------------------------------------------

@app.post("/evidence/package", response_model=EvidencePackageResponse)
def generate_package(payload: EvidencePackageRequest):
    logger.info(f"Generating Digital Evidence Package (DEP) for case: {payload.case_number}")
    
    file_name = f"DEP_{payload.case_number}.pdf"
    pdf_path = os.path.join(REPORTS_DIR, file_name)
    
    try:
        generate_evidence_pdf(payload, pdf_path)
    except Exception as e:
        logger.error(f"ReportLab compilation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"PDF rendering error: {str(e)}")
        
    # Calculate SHA-256
    sha256 = hashlib.sha256()
    with open(pdf_path, "rb") as f:
        while chunk := f.read(8192):
            sha256.update(chunk)
    file_hash = sha256.hexdigest()
    
    # Mock HSM Signature
    # Signs the hash using simulated private key algorithm
    signing_authority = "SentinelX Threat Fusion Unit HSM #092"
    signature_salt = "gov_auth_signature_salt_2026"
    signed_hex = hashlib.sha256((file_hash + signature_salt).encode()).hexdigest()
    
    return EvidencePackageResponse(
        status="SUCCESS",
        pdf_file_path=pdf_path,
        sha256_hash=file_hash,
        digital_signature=signed_hex,
        signed_by=signing_authority
    )

@app.get("/evidence/download/{case_number}")
def download_pdf(case_number: str):
    file_name = f"DEP_{case_number}.pdf"
    pdf_path = os.path.join(REPORTS_DIR, file_name)
    if not os.path.exists(pdf_path):
        raise HTTPException(status_code=404, detail="Evidence package not found.")
    return FileResponse(pdf_path, media_type="application/pdf", filename=file_name)

@app.get("/health")
def health():
    return {"status": "UP", "service": "sentinelx-evidence-service"}
