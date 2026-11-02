"""SentinelX six-denomination feature extraction. Not an authenticity verifier."""
import cv2
import numpy as np

FEATURE_VERSION = "sentinelx_hog_hsv_v1"

def extract_features_from_bgr(image):
    if image is None or image.size == 0:
        raise ValueError("Image could not be decoded")
    h0, w0 = image.shape[:2]
    if min(h0, w0) < 48 or h0 * w0 > 40_000_000:
        raise ValueError("Image dimensions are unsupported")
    # Rotate portrait-oriented captures to a consistent long-edge orientation.
    h, w = image.shape[:2]
    if h > w:
        image = cv2.rotate(image, cv2.ROTATE_90_CLOCKWISE)
    h, w = image.shape[:2]
    scale = min(320 / w, 180 / h)
    nw, nh = max(1, int(w * scale)), max(1, int(h * scale))
    resized = cv2.resize(image, (nw, nh), interpolation=cv2.INTER_AREA)
    canvas = np.zeros((180, 320, 3), np.uint8)
    y, x = (180 - nh) // 2, (320 - nw) // 2
    canvas[y:y+nh, x:x+nw] = resized
    chunks = []
    for region in (canvas, canvas[:, :160], canvas[:, 160:], canvas[:90, :], canvas[90:, :]):
        hsv = cv2.cvtColor(region, cv2.COLOR_BGR2HSV)
        hist = cv2.calcHist([hsv], [0, 1, 2], None, [12, 4, 4], [0, 180, 0, 256, 0, 256]).flatten()
        hist = hist / (hist.sum() + 1e-8)
        chunks.extend(hist)
    gray = cv2.cvtColor(canvas, cv2.COLOR_BGR2GRAY)
    hog = cv2.HOGDescriptor((320, 180), (80, 60), (40, 30), (10, 10), 9)
    hog_vec = hog.compute(gray).flatten()
    moments = []
    for channel in cv2.split(canvas):
        moments += [float(np.mean(channel)/255), float(np.std(channel)/255),
                    float(np.percentile(channel, 10)/255), float(np.percentile(channel, 50)/255),
                    float(np.percentile(channel, 90)/255)]
    edges = cv2.Canny(gray, 60, 150)
    moments += [float(np.mean(edges > 0)), float(np.std(gray)/255), float(w/(h+1e-6))]
    return np.concatenate([np.asarray(chunks, np.float32), hog_vec.astype(np.float32), np.asarray(moments, np.float32)])

def predict_denomination(image_bgr, bundle, min_confidence=0.55):
    feat = extract_features_from_bgr(image_bgr).reshape(1, -1)
    model = bundle["model"]
    probs = model.predict_proba(feat)[0]
    order = np.argsort(probs)[::-1]
    idx = int(order[0])
    confidence = float(probs[idx])
    margin = confidence - float(probs[int(order[1])])
    labels = bundle["labels"]
    if confidence < min_confidence or margin < 0.08:
        return {"denomination": None, "label": "UNKNOWN", "confidence": confidence,
                "margin": margin, "probabilities": {str(k): float(v) for k, v in zip(labels, probs)}}
    return {"denomination": int(labels[idx]), "label": f"₹{labels[idx]}", "confidence": confidence,
            "margin": margin, "probabilities": {str(k): float(v) for k, v in zip(labels, probs)}}
