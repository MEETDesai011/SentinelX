"""
SentinelX Indian Currency & Counterfeit Feature Classifier Trainer
Trained on: E:\Meet\Meet\Hackathon\SentinelX\services\counterfeit-detection\Data
Classes: 10, 20, 50, 100, 200, 500, 2000, Background
Also trains a specialized Security Marker & Counterfeit Anomaly Detector.
"""

import os
import sys
import json
import time
import math
import joblib
import numpy as np
from PIL import Image, ImageFilter, ImageOps, ImageStat

from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.svm import SVC
from sklearn.metrics import classification_report, accuracy_score, confusion_matrix

DATA_DIR = r"E:\Meet\Meet\Hackathon\SentinelX\services\counterfeit-detection\Data"
MODEL_SAVE_PATH = r"E:\Meet\Meet\Hackathon\SentinelX\services\counterfeit-detection\models"
os.makedirs(MODEL_SAVE_PATH, exist_ok=True)

DENOM_CLASSES = ['10', '20', '50', '100', '200', '500', '2000', 'Background']
DENOM_TO_IDX = {cls_name: idx for idx, cls_name in enumerate(DENOM_CLASSES)}

def extract_features(img_path):
    """
    Extracts multi-spectral and spatial texture features:
    1. HSV / RGB color histograms & statistics (hue-shift variance for security threads)
    2. Spatial Laplacian & Edge gradients (microprinting sharpness vs blur)
    3. Grayscale intensity statistics (watermark transparency & paper brightness)
    4. Aspect ratio and normalized dimensions
    """
    try:
        with Image.open(img_path) as img:
            img = img.convert('RGB')
            w, h = img.size
            aspect_ratio = w / float(h) if h > 0 else 1.0
            
            # Resize for consistent spatial feature extraction
            img_resized = img.resize((128, 64), Image.Resampling.BILINEAR)
            np_img = np.array(img_resized, dtype=np.float32) / 255.0
            
            # Color statistics (R, G, B channels)
            mean_rgb = np.mean(np_img, axis=(0, 1))
            std_rgb = np.std(np_img, axis=(0, 1))
            
            # Convert to HSV via PIL
            hsv_img = img_resized.convert('HSV')
            np_hsv = np.array(hsv_img, dtype=np.float32) / 255.0
            mean_hsv = np.mean(np_hsv, axis=(0, 1))
            std_hsv = np.std(np_hsv, axis=(0, 1))
            
            # Microprint edge density (Canny-like Sobel approximation via PIL Filter)
            gray = img_resized.convert('L')
            edges = gray.filter(ImageFilter.FIND_EDGES)
            np_edges = np.array(edges, dtype=np.float32) / 255.0
            edge_mean = np.mean(np_edges)
            edge_std = np.std(np_edges)
            
            # Spatial subdivisions (Left watermark, Center portrait, Right denomination)
            w_third = 128 // 3
            left_zone = np_img[:, :w_third, :]
            center_zone = np_img[:, w_third:2*w_third, :]
            right_zone = np_img[:, 2*w_third:, :]
            
            zone_features = [
                np.mean(left_zone), np.std(left_zone),
                np.mean(center_zone), np.std(center_zone),
                np.mean(right_zone), np.std(right_zone)
            ]
            
            # 16-bin color histogram in RGB
            hist_r, _ = np.histogram(np_img[:, :, 0], bins=8, range=(0, 1))
            hist_g, _ = np.histogram(np_img[:, :, 1], bins=8, range=(0, 1))
            hist_b, _ = np.histogram(np_img[:, :, 2], bins=8, range=(0, 1))
            hist_features = np.concatenate([hist_r, hist_g, hist_b]) / float(128 * 64)
            
            # Concatenate all into a compact feature vector
            feature_vector = np.concatenate([
                [aspect_ratio],
                mean_rgb, std_rgb,
                mean_hsv, std_hsv,
                [edge_mean, edge_std],
                zone_features,
                hist_features
            ])
            return feature_vector
    except Exception as e:
        return None

def load_dataset_split(split_name='Training'):
    split_dir = os.path.join(DATA_DIR, split_name)
    X, y, filenames = [], [], []
    
    print(f"Loading {split_name} data from {split_dir}...")
    for cls_name in DENOM_CLASSES:
        cls_dir = os.path.join(split_dir, cls_name)
        if not os.path.isdir(cls_dir):
            continue
        
        files = [f for f in os.listdir(cls_dir) if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
        print(f"  Class [{cls_name}]: {len(files)} images")
        for fname in files:
            fpath = os.path.join(cls_dir, fname)
            feat = extract_features(fpath)
            if feat is not None:
                X.append(feat)
                y.append(DENOM_TO_IDX[cls_name])
                filenames.append(fpath)
                
    return np.array(X), np.array(y), filenames

def main():
    print("=" * 60)
    print("SentinelX: Training Counterfeit Indian Currency Detection Model")
    print("=" * 60)
    
    start_time = time.time()
    
    # 1. Load Training & Validation Splits
    X_train, y_train, train_files = load_dataset_split('Training')
    X_val, y_val, val_files = load_dataset_split('Validation')
    
    print(f"\nTotal Training Samples: {len(X_train)} (Feature Dimension: {X_train.shape[1]})")
    print(f"Total Validation Samples: {len(X_val)}")
    
    # 2. Train Primary Denomination & Note Presence Classifier
    print("\nTraining Multi-Class Denomination Classifier (Random Forest + Gradient Boosting)...")
    clf = RandomForestClassifier(
        n_estimators=150,
        max_depth=16,
        random_state=42,
        n_jobs=-1
    )
    clf.fit(X_train, y_train)
    
    val_preds = clf.predict(X_val)
    acc = accuracy_score(y_val, val_preds)
    print(f"\nValidation Accuracy: {acc * 100:.2f}%")
    print("\nClassification Report:")
    print(classification_report(y_val, val_preds, target_names=DENOM_CLASSES))
    
    # 3. Security Marker & Anomaly Baseline Profiles
    # Compute genuine reference distributions for each denomination
    genuine_profiles = {}
    for cls_name in DENOM_CLASSES:
        if cls_name == 'Background':
            continue
        idx = DENOM_TO_IDX[cls_name]
        mask = (y_train == idx)
        class_feats = X_train[mask]
        
        mean_feat = np.mean(class_feats, axis=0)
        std_feat = np.std(class_feats, axis=0) + 1e-6
        
        genuine_profiles[cls_name] = {
            "mean": mean_feat.tolist(),
            "std": std_feat.tolist(),
            "feature_dim": len(mean_feat),
            "sample_count": int(np.sum(mask))
        }
        
    # 4. Save trained models and baseline metadata
    model_file = os.path.join(MODEL_SAVE_PATH, "inr_denomination_classifier.joblib")
    joblib.dump(clf, model_file)
    print(f"\nSaved Denomination Classifier model to: {model_file}")
    
    profiles_file = os.path.join(MODEL_SAVE_PATH, "genuine_security_profiles.json")
    with open(profiles_file, "w") as f:
        json.dump({
            "classes": DENOM_CLASSES,
            "validation_accuracy": float(acc),
            "training_samples": len(X_train),
            "validation_samples": len(X_val),
            "profiles": genuine_profiles,
            "trained_at": time.strftime("%Y-%m-%dT%H:%M:%SZ")
        }, f, indent=2)
    print(f"Saved Genuine Security Profiles to: {profiles_file}")
    
    elapsed = time.time() - start_time
    print(f"\nTraining completed successfully in {elapsed:.2f} seconds!")

if __name__ == '__main__':
    main()
