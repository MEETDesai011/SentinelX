# SentinelX currency module rebuild

## What this build does

- Trained a six-class denomination estimator for ₹10, ₹20, ₹50, ₹100, ₹200 and ₹500.
- Uses the 304 images supplied in `A.zip` (A=10, B=20, C=50, D=100, E=200, F=500).
- Keeps the existing API routes: `POST /currency/detect`, `POST /currency/detect/mobile`, `GET /currency/model-info`, and `GET /health`.
- Always returns `classification: UNVERIFIED`, `authenticity_status: NOT_CHECKED`, and `is_counterfeit: null`.

**Critical limitation:** your dataset contains denomination folders only. It has no non-banknote examples, no genuine/counterfeit labels, and no specimen labels. Therefore no honest model can learn to reject faces or identify specimen/counterfeit notes from these labels. The output is a *possible denomination estimate*, never proof that the image is a banknote or that a note is genuine. The frontend must not turn this response into a green “Genuine” badge.

## Training and evaluation

The supplied trained model was trained on all 304 readable images after a stratified 25% holdout comparison. The selected model was a Random Forest. On the held-out split (76 images), accuracy was **77.63%** and macro-F1 was **0.7742**. This is a small, mixed-quality dataset; results on new phones, lighting, note generations and backgrounds may be lower. Metrics are in `models/model_metadata.json`.

## Run locally

Python 3.10 or 3.11 recommended.

```bash
cd sentinelx_currency_rebuild
python -m venv .venv
# Windows PowerShell:
.venv\Scripts\Activate.ps1
# macOS/Linux:
# source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Open `http://localhost:8000/docs`. The API accepts the same JSON field `image_base64` as the old service. It also accepts a data URL such as `data:image/jpeg;base64,...`.

## Retrain later with the same data

Extract `A.zip` so the folders look like:

```text
dataset/
  A/  # ₹10 images
  B/  # ₹20 images
  C/  # ₹50 images
  D/  # ₹100 images
  E/  # ₹200 images
  F/  # ₹500 images
```

Then run:

```bash
python train_model.py --data dataset --out models
```

This re-trains denomination recognition only. It does not add authenticity detection.

## Integrate into your SentinelX GitHub project

1. In `MEETDesai011/SentinelX`, open the `services/` directory and locate the currency/counterfeit service — the service that currently has the old `main.py`, `model_engine.py`, `requirements.txt`, and exposes `/currency/detect`.
2. Back up that service folder. Replace its old `main.py`, `model_engine.py`, `requirements.txt`, and `Dockerfile` with the matching files from this package. Copy this package's `models/` directory into that same service directory. Keep the service folder name and its existing deployment configuration.
3. Do **not** replace the entire SentinelX repository. Only replace the currency microservice files.
4. If your Docker build context points to that service folder, rebuild/redeploy that service. Example:

```bash
docker build -t sentinelx-currency ./services/<your-current-currency-service-folder>
docker run -p 8000:8000 sentinelx-currency
```

5. Keep the frontend's current API URL if it already calls `/currency/detect`; the route is preserved. Confirm the deployed service's `/health` returns `model_loaded: true`.

### Frontend change required

Find the component that renders the currency API result (search the repo for `currency/detect`, `is_counterfeit`, or `classification`). Replace any logic that assumes `is_counterfeit === false` means genuine. This model returns `is_counterfeit: null` and `classification: "UNVERIFIED"` by design.

Suggested rendering logic:

```js
if (result.authenticity_status !== "VERIFIED") {
  // Show neutral UI: "Authenticity not checked"
  // If result.detected_denomination_label !== "UNKNOWN", show:
  // "Possible denomination: ₹..."
}
```

Never display “Genuine”, “Real note”, “Counterfeit”, or “Specimen” based on this model's denomination prediction.

## API response fields to use

- `detected_denomination_label`: `₹10`...`₹500` or `UNKNOWN` — a possible denomination only.
- `denomination_confidence`: model score for denomination classification, not authenticity confidence.
- `classification`: always `UNVERIFIED`.
- `authenticity_status`: always `NOT_CHECKED`.
- `is_counterfeit`: always `null`.
- `serial_number`: always `null`; this model does not read serial numbers.
- `security_markers`: empty; no physical security features are validated.

## Current known limitation / next data needed

To stop faces and other objects being mapped to one of six denomination classes, add a seventh `NON_BANKNOTE` class with varied faces, documents, products, screenshots, scenery and blank images. To distinguish genuine, counterfeit and specimen notes, collect separate independently verified labels for those classes. Do not treat stock-photo watermarks as counterfeit labels. Split by source/image identity (not random near-duplicate crops) before final evaluation.
