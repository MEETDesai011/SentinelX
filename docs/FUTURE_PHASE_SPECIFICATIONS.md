# SentinelX V7 Ultimate: Future-Phase Engineering Specifications
## Technical Integration Guide & Architecture Skeletals (Pillars 1-5 Expansion)

---

## 1. Telecom SIP Interceptor (Pillar 1)

### 1.1 Carrier Switch Architecture
To perform inline call screening without modifying consumer mobile baseband software, SentinelX integrates with cellular carriers (Jio, Airtel, Vi) at the **MSC (Mobile Switching Centre)** and **IMS (IP Multimedia Subsystem)** layer using standardized **SIP (Session Initiation Protocol)** proxy loops.

```
       [Carrier PSTN/SIP Trunk]
                  │
                  ▼
         [SIP Session Border Controller]
                  │
        (INVITE)  │  (302 Redirect / 183 Session Progress)
                  ▼
       [SentinelX SIP Interceptor] ◄──► [Scam Detection FastAPI WebSockets]
                  │
                  ▼ (If Threat Score < 0.70)
        [Target Citizen Handset]
```

### 1.2 SIP Anomaly Signaling Validation JSON Schema
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "SipAnomalySignalingPayload",
  "type": "object",
  "properties": {
    "call_id": { "type": "string" },
    "invite_headers": {
      "type": "object",
      "properties": {
        "from": { "type": "string" },
        "to": { "type": "string" },
        "via": { "type": "string" },
        "user_agent": { "type": "string" }
      },
      "required": ["from", "to", "via"]
    },
    "ss7_metadata": {
      "type": "object",
      "properties": {
        "msc_gt": { "type": "string", "description": "Global Title of MSC" },
        "hlr_lookup_status": { "type": "string", "enum": ["ACTIVE", "ROAMING", "SUSPENDED", "UNREGISTERED"] },
        "calling_party_category": { "type": "string" }
      },
      "required": ["msc_gt", "hlr_lookup_status"]
    }
  },
  "required": ["call_id", "invite_headers", "ss7_metadata"]
}
```

---

## 2. WhatsApp Business & IVR Gateways (Pillar 5)

### 2.1 WhatsApp Webhook Ingest Contract
SentinelX exposes a secure REST webhook matching Meta's Business API standard to receive screenshots, files, and chat transcripts for scanning.

* **Endpoint:** `POST /api/v1/gateways/whatsapp/webhook`
* **Request Schema:**
```json
{
  "object": "whatsapp_business_account",
  "entry": [{
    "id": "WABA_ID_98765",
    "changes": [{
      "value": {
        "messaging_product": "whatsapp",
        "metadata": {
          "display_phone_number": "16505553333",
          "phone_number_id": "27182818"
        },
        "messages": [{
          "from": "919811223344",
          "id": "wamid.HBgLOTE5ODExMjIzMzQ0FQIAERgSQjE4MkZEM0NBQzQ0RjcyMDNEAA==",
          "timestamp": "1772658600",
          "text": {
            "body": "I got a threat call from police claiming my account will be locked. Please help!"
          },
          "type": "text"
        }]
      },
      "field": "messages"
    }]
  }]
}
```

### 2.2 IVR Call Flow Integration Contract
For non-smartphone users, the IVR server routes incoming citizen calls to the SentinelX Speech-to-Text Flink stream.

* **Webhook Endpoint:** `POST /api/v1/gateways/ivr/event`
* **Request Schema:**
```json
{
  "session_id": "ivr_call_88221",
  "caller_number": "+919888777665",
  "dtmf_input": "9",
  "current_state": "REDIRECT_CYBER_DESK",
  "audio_rtp_stream_url": "rtp://10.45.2.1:5004"
}
```

---

## 3. NPCI Transaction Hold API (Pillar 3)

SentinelX interacts with NPCI's core interface to freeze transaction nodes dynamically across India's banking network when threat levels exceed 0.85.

* **Endpoint:** `POST /api/v1/npci/transaction/hold`
* **Security:** mTLS (TLS 1.3) + SHA256withRSA private signature header.
* **Request Schema:**
```json
{
  "npci_txn_ref": "NPCI-TXN-2026-9092",
  "source_account": "BA-SBI-1002",
  "target_account": "BA-HDFC-9921",
  "hold_amount": 250000.00,
  "hold_duration_hours": 2,
  "reason_code": "MULE_ACCOUNT_HOP_DETECTION",
  "evidence_package_hash": "4a9b2c3d8e9f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b"
}
```

---

## 4. Government Ledger Synchronizations (NCRB & MHA)

SentinelX updates sovereign national blacklists periodically to restrict identified offender profiles.

* **NCRB Portal Sync Webhook:** `POST /api/v1/sync/ncrb`
* **Request Schema:**
```json
{
  "timestamp": "2026-06-22T17:50:00Z",
  "records_count": 1,
  "cases": [{
    "case_id": "SX-2026-0041",
    "status": "UNDER_INVESTIGATION",
    "scammer_phone": "+919876500112",
    "mule_accounts": [
      { "bank": "HDFC", "account_id": "BA-HDFC-9921" },
      { "bank": "ICICI", "account_id": "BA-ICICI-8812" }
    ],
    "evidence_package_signed_url": "https://gov-portal.sentinelx.gov.in/evidence/download/SX-2026-0041"
  }]
}
```

---

## 5. Bhashini Translation API Bridge (Pillar 5)

* **Provider:** Bhashini National Language Translation Mission (NLTM).
* **Endpoint:** `POST /api/v1/bhashini/translate`
* **Payload Structure:**
```json
{
  "pipelineTasks": [
    {
      "taskType": "translation",
      "config": {
        "language": {
          "sourceLanguage": "hi",
          "targetLanguage": "en"
        }
      }
    }
  ],
  "inputData": {
    "input": [
      {
        "source": "मुझे पुलिस का फोन आया। क्या यह सच है?"
      }
    ]
  }
}
```

---

## 6. Infrastructure & Deployment Architecture

### 6.1 Multi-Region Deployment
To comply with sovereignty guidelines and ensure 99.999% availability, SentinelX utilizes two active-active deployments in India:
* **Region 1:** AWS Mumbai (ap-south-1) - Primary Enclave.
* **Region 2:** AWS Bengaluru (ap-south-2) - Active-Active replication endpoint.
* **DNS Routing:** Latency-based Route 53 routing policies with healthcheck failovers.

### 6.2 Kubernetes Deployment Manifest (Skeletal Helm Chart)
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: sentinelx-threat-fusion
  namespace: sentinelx-core
spec:
  replicas: 3
  selector:
    matchLabels:
      app: threat-fusion
  template:
    metadata:
      labels:
        app: threat-fusion
    spec:
      containers:
      - name: threat-fusion
        image: sentinelx/threat-fusion:v7.0.0
        ports:
        - containerPort: 8004
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: sentinelx-secrets
              key: database-url
        resources:
          limits:
            cpu: "2"
            memory: 4Gi
          requests:
            cpu: "500m"
            memory: 1Gi
        healthCheck:
          httpGet:
            path: /health
            port: 8004
          initialDelaySeconds: 15
          periodSeconds: 10
```
