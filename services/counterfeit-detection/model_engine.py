import os
import sys
import cv2
import numpy as np
import joblib
from PIL import Image, ImageOps, ImageFilter

DENOM_CLASSES = ['10', '20', '50', '100', '200', '500', '2000', 'Background']
DENOM_TO_IDX = {cls: i for i, cls in enumerate(DENOM_CLASSES)}

def extract_v2_features(pil_img):
    """142-dimensional multi-spectral feature vector."""
    try:
        img_rgb = pil_img.convert('RGB')
        w, h = img_rgb.size
        if w <= 0 or h <= 0:
            return None
        aspect_ratio = float(w) / float(h)
        
        img_resized = img_rgb.resize((128, 64), Image.Resampling.BILINEAR)
        np_img = np.array(img_resized, dtype=np.float32) / 255.0
        
        np_u8 = np.array(img_resized, dtype=np.uint8)
        hsv_u8 = cv2.cvtColor(np_u8, cv2.COLOR_RGB2HSV)
        lab_u8 = cv2.cvtColor(np_u8, cv2.COLOR_RGB2Lab)
        
        np_hsv = hsv_u8.astype(np.float32) / 255.0
        np_lab = lab_u8.astype(np.float32) / 255.0
        
        mean_rgb = np.mean(np_img, axis=(0, 1))
        std_rgb = np.std(np_img, axis=(0, 1))
        mean_hsv = np.mean(np_hsv, axis=(0, 1))
        std_hsv = np.std(np_hsv, axis=(0, 1))
        mean_lab = np.mean(np_lab, axis=(0, 1))
        std_lab = np.std(np_lab, axis=(0, 1))
        
        y1, y2 = int(64 * 0.20), int(64 * 0.80)
        x1, x2 = int(128 * 0.20), int(128 * 0.80)
        center_rgb = np_img[y1:y2, x1:x2, :]
        center_hsv = np_hsv[y1:y2, x1:x2, :]
        center_lab = np_lab[y1:y2, x1:x2, :]
        
        c_mean_rgb = np.mean(center_rgb, axis=(0, 1))
        c_std_rgb = np.std(center_rgb, axis=(0, 1))
        c_mean_hsv = np.mean(center_hsv, axis=(0, 1))
        c_std_hsv = np.std(center_hsv, axis=(0, 1))
        c_mean_lab = np.mean(center_lab, axis=(0, 1))
        c_std_lab = np.std(center_lab, axis=(0, 1))
        
        delta_rgb = c_mean_rgb - mean_rgb
        
        hist_h_glob, _ = np.histogram(np_hsv[:, :, 0], bins=16, range=(0, 1))
        hist_h_glob = hist_h_glob / float(128 * 64)
        
        hist_h_cent, _ = np.histogram(center_hsv[:, :, 0], bins=16, range=(0, 1))
        hist_h_cent = hist_h_cent / float((y2 - y1) * (x2 - x1))
        
        hist_s_cent, _ = np.histogram(center_hsv[:, :, 1], bins=8, range=(0, 1))
        hist_s_cent = hist_s_cent / float((y2 - y1) * (x2 - x1))
        
        hist_v_cent, _ = np.histogram(center_hsv[:, :, 2], bins=8, range=(0, 1))
        hist_v_cent = hist_v_cent / float((y2 - y1) * (x2 - x1))
        
        hist_a_cent, _ = np.histogram(center_lab[:, :, 1], bins=8, range=(0, 1))
        hist_a_cent = hist_a_cent / float((y2 - y1) * (x2 - x1))
        
        hist_b_cent, _ = np.histogram(center_lab[:, :, 2], bins=8, range=(0, 1))
        hist_b_cent = hist_b_cent / float((y2 - y1) * (x2 - x1))
        
        w_third = 128 // 3
        left_z = np_img[:, :w_third, :]
        center_z = np_img[:, w_third:2*w_third, :]
        right_z = np_img[:, 2*w_third:, :]
        spatial_3z = [
            np.mean(left_z), np.std(left_z),
            np.mean(center_z), np.std(center_z),
            np.mean(right_z), np.std(right_z)
        ]
        
        top_h = np_img[:32, :, :]
        bot_h = np_img[32:, :, :]
        vert_2h = [
            np.mean(top_h), np.std(top_h),
            np.mean(bot_h), np.std(bot_h)
        ]
        
        gray = img_resized.convert('L')
        edges = gray.filter(ImageFilter.FIND_EDGES)
        np_edges = np.array(edges, dtype=np.float32) / 255.0
        edge_glob_mean = float(np.mean(np_edges))
        edge_glob_std = float(np.std(np_edges))
        
        center_edges = np_edges[y1:y2, x1:x2]
        edge_cent_mean = float(np.mean(center_edges))
        edge_cent_std = float(np.std(center_edges))
        
        hist_r, _ = np.histogram(center_rgb[:, :, 0], bins=8, range=(0, 1))
        hist_g, _ = np.histogram(center_rgb[:, :, 1], bins=8, range=(0, 1))
        hist_b, _ = np.histogram(center_rgb[:, :, 2], bins=8, range=(0, 1))
        hist_rgb_cent = np.concatenate([hist_r, hist_g, hist_b]) / float((y2 - y1) * (x2 - x1))

        features = np.concatenate([
            [aspect_ratio],
            mean_rgb, std_rgb,
            mean_hsv, std_hsv,
            mean_lab, std_lab,
            c_mean_rgb, c_std_rgb,
            c_mean_hsv, c_std_hsv,
            c_mean_lab, c_std_lab,
            delta_rgb,
            hist_h_glob,
            hist_h_cent,
            hist_s_cent,
            hist_v_cent,
            hist_a_cent,
            hist_b_cent,
            spatial_3z,
            vert_2h,
            [edge_glob_mean, edge_glob_std, edge_cent_mean, edge_cent_std],
            hist_rgb_cent
        ])
        return features
    except Exception:
        return None

def extract_v4_features(pil_img):
    """181-dimensional robust percentile & gradient feature vector."""
    try:
        pil_img = ImageOps.exif_transpose(pil_img)
        img_rgb = pil_img.convert('RGB')
        w, h = img_rgb.size
        if w <= 0 or h <= 0:
            return None
        
        raw_ar = float(w) / float(h)
        norm_ar = float(max(w, h)) / float(min(w, h))
        
        img_resized = img_rgb.resize((128, 64), Image.Resampling.BILINEAR)
        np_u8 = np.array(img_resized, dtype=np.uint8)
        np_f32 = np_u8.astype(np.float32) / 255.0
        
        hsv_u8 = cv2.cvtColor(np_u8, cv2.COLOR_RGB2HSV)
        lab_u8 = cv2.cvtColor(np_u8, cv2.COLOR_RGB2Lab)
        
        np_hsv = hsv_u8.astype(np.float32) / 255.0
        np_lab = lab_u8.astype(np.float32) / 255.0
        
        y1, y2 = int(64 * 0.20), int(64 * 0.80)
        x1, x2 = int(128 * 0.20), int(128 * 0.80)
        c_rgb = np_f32[y1:y2, x1:x2, :]
        c_hsv = np_hsv[y1:y2, x1:x2, :]
        c_lab = np_lab[y1:y2, x1:x2, :]
        
        mean_rgb = np.mean(np_f32, axis=(0, 1))
        std_rgb = np.std(np_f32, axis=(0, 1))
        p25_rgb = np.percentile(np_f32, 25, axis=(0, 1))
        p50_rgb = np.percentile(np_f32, 50, axis=(0, 1))
        p75_rgb = np.percentile(np_f32, 75, axis=(0, 1))
        
        c_mean_rgb = np.mean(c_rgb, axis=(0, 1))
        c_std_rgb = np.std(c_rgb, axis=(0, 1))
        c_p25_rgb = np.percentile(c_rgb, 25, axis=(0, 1))
        c_p50_rgb = np.percentile(c_rgb, 50, axis=(0, 1))
        c_p75_rgb = np.percentile(c_rgb, 75, axis=(0, 1))
        
        mean_hsv = np.mean(np_hsv, axis=(0, 1))
        std_hsv = np.std(np_hsv, axis=(0, 1))
        c_mean_hsv = np.mean(c_hsv, axis=(0, 1))
        c_std_hsv = np.std(c_hsv, axis=(0, 1))
        c_p50_hsv = np.percentile(c_hsv, 50, axis=(0, 1))
        
        mean_lab = np.mean(np_lab, axis=(0, 1))
        std_lab = np.std(np_lab, axis=(0, 1))
        c_mean_lab = np.mean(c_lab, axis=(0, 1))
        c_std_lab = np.std(c_lab, axis=(0, 1))
        c_p50_lab = np.percentile(c_lab, 50, axis=(0, 1))
        
        rg_diff = c_mean_rgb[0] - c_mean_rgb[1]
        gb_diff = c_mean_rgb[1] - c_mean_rgb[2]
        rb_diff = c_mean_rgb[0] - c_mean_rgb[2]
        
        delta_rgb = c_mean_rgb - mean_rgb
        delta_hsv = c_mean_hsv - mean_hsv
        
        hist_h_glob, _ = np.histogram(np_hsv[:, :, 0], bins=16, range=(0, 1))
        hist_h_glob = hist_h_glob / float(128 * 64)
        hist_h_cent, _ = np.histogram(c_hsv[:, :, 0], bins=16, range=(0, 1))
        hist_h_cent = hist_h_cent / float((y2 - y1) * (x2 - x1))
        
        hist_s_cent, _ = np.histogram(c_hsv[:, :, 1], bins=8, range=(0, 1))
        hist_s_cent = hist_s_cent / float((y2 - y1) * (x2 - x1))
        hist_v_cent, _ = np.histogram(c_hsv[:, :, 2], bins=8, range=(0, 1))
        hist_v_cent = hist_v_cent / float((y2 - y1) * (x2 - x1))
        
        hist_a_cent, _ = np.histogram(c_lab[:, :, 1], bins=8, range=(0, 1))
        hist_a_cent = hist_a_cent / float((y2 - y1) * (x2 - x1))
        hist_b_cent, _ = np.histogram(c_lab[:, :, 2], bins=8, range=(0, 1))
        hist_b_cent = hist_b_cent / float((y2 - y1) * (x2 - x1))
        
        hist_r, _ = np.histogram(c_rgb[:, :, 0], bins=8, range=(0, 1))
        hist_g, _ = np.histogram(c_rgb[:, :, 1], bins=8, range=(0, 1))
        hist_b, _ = np.histogram(c_rgb[:, :, 2], bins=8, range=(0, 1))
        hist_rgb_cent = np.concatenate([hist_r, hist_g, hist_b]) / float((y2 - y1) * (x2 - x1))
        
        w_third = 128 // 3
        left_z = np_f32[:, :w_third, :]
        center_z = np_f32[:, w_third:2*w_third, :]
        right_z = np_f32[:, 2*w_third:, :]
        spatial_3z = [
            np.mean(left_z), np.std(left_z),
            np.mean(center_z), np.std(center_z),
            np.mean(right_z), np.std(right_z)
        ]
        
        top_h = np_f32[:32, :, :]
        bot_h = np_f32[32:, :, :]
        vert_2h = [
            np.mean(top_h), np.std(top_h),
            np.mean(bot_h), np.std(bot_h)
        ]
        
        gray = cv2.cvtColor(np_u8, cv2.COLOR_RGB2GRAY)
        grad_x = cv2.Sobel(gray, cv2.CV_32F, 1, 0, ksize=3)
        grad_y = cv2.Sobel(gray, cv2.CV_32F, 0, 1, ksize=3)
        grad_mag = np.sqrt(grad_x**2 + grad_y**2) / 255.0
        
        edge_glob_mean = float(np.mean(grad_mag))
        edge_glob_std = float(np.std(grad_mag))
        c_grad = grad_mag[y1:y2, x1:x2]
        edge_cent_mean = float(np.mean(c_grad))
        edge_cent_std = float(np.std(c_grad))
        
        angles = (np.arctan2(grad_y, grad_x) + np.pi) / (2 * np.pi)
        hist_grad_dir, _ = np.histogram(angles, bins=8, range=(0, 1), weights=grad_mag)
        hist_grad_dir = hist_grad_dir / (np.sum(hist_grad_dir) + 1e-6)
        
        features = np.concatenate([
            [raw_ar, norm_ar],
            mean_rgb, std_rgb, p25_rgb, p50_rgb, p75_rgb,
            c_mean_rgb, c_std_rgb, c_p25_rgb, c_p50_rgb, c_p75_rgb,
            mean_hsv, std_hsv, c_mean_hsv, c_std_hsv, c_p50_hsv,
            mean_lab, std_lab, c_mean_lab, c_std_lab, c_p50_lab,
            [rg_diff, gb_diff, rb_diff],
            delta_rgb, delta_hsv,
            hist_h_glob, hist_h_cent,
            hist_s_cent, hist_v_cent,
            hist_a_cent, hist_b_cent,
            hist_rgb_cent,
            spatial_3z, vert_2h,
            [edge_glob_mean, edge_glob_std, edge_cent_mean, edge_cent_std],
            hist_grad_dir
        ])
        return features
    except Exception:
        return None

class ProductionEnsemble:
    def __init__(self, bundle_dict):
        self.m_lgb4 = bundle_dict['m_lgb4']
        self.m_xgb4 = bundle_dict['m_xgb4']
        self.m_hgb2 = bundle_dict['m_hgb2']
        self.m_lgb2 = bundle_dict['m_lgb2']
        self.m_et4  = bundle_dict['m_et4']
        self.weights = bundle_dict.get('weights', [3, 2, 2, 1, 1])
        self.multipliers = bundle_dict.get('multipliers', {0: 1.4, 2: 0.65, 4: 0.65, 5: 0.8, 7: 0.4})
        self.classes_ = np.array(DENOM_CLASSES)

    def predict_proba(self, X2, X4=None):
        if X4 is None:
            X = np.asarray(X2, dtype=np.float32)
            if X.ndim == 1:
                X = X.reshape(1, -1)
            if X.shape[1] == 323:
                X2_sub = X[:, :142]
                X4_sub = X[:, 142:]
                return self.predict_proba(X2_sub, X4_sub)
            elif X.shape[1] == 181:
                p1 = self.m_lgb4.predict_proba(X)
                p2 = self.m_xgb4.predict_proba(X)
                p5 = self.m_et4.predict_proba(X)
                P = 3 * p1 + 2 * p2 + 1 * p5
                for idx, mult in self.multipliers.items():
                    P[:, idx] *= mult
                row_sums = np.sum(P, axis=1, keepdims=True)
                row_sums[row_sums == 0] = 1.0
                return P / row_sums
            elif X.shape[1] == 142:
                p3 = self.m_hgb2.predict_proba(X)
                p4 = self.m_lgb2.predict_proba(X)
                P = 2 * p3 + 1 * p4
                for idx, mult in self.multipliers.items():
                    P[:, idx] *= mult
                row_sums = np.sum(P, axis=1, keepdims=True)
                row_sums[row_sums == 0] = 1.0
                return P / row_sums
                
        p1 = self.m_lgb4.predict_proba(X4)
        p2 = self.m_xgb4.predict_proba(X4)
        p3 = self.m_hgb2.predict_proba(X2)
        p4 = self.m_lgb2.predict_proba(X2)
        p5 = self.m_et4.predict_proba(X4)
        
        P = 3 * p1 + 2 * p2 + 2 * p3 + 1 * p4 + 1 * p5
        for idx, mult in self.multipliers.items():
            P[:, idx] *= mult
            
        row_sums = np.sum(P, axis=1, keepdims=True)
        row_sums[row_sums == 0] = 1.0
        return P / row_sums

    def predict_image(self, pil_img):
        feat_v2 = extract_v2_features(pil_img)
        feat_v4 = extract_v4_features(pil_img)
        if feat_v2 is None or feat_v4 is None:
            return '500', 0.5, {}
            
        X2 = np.array([feat_v2], dtype=np.float32)
        X4 = np.array([feat_v4], dtype=np.float32)
        
        probs = self.predict_proba(X2, X4)[0]
        pred_idx = int(np.argmax(probs))
        pred_class = DENOM_CLASSES[pred_idx]
        confidence = float(probs[pred_idx])
        
        prob_dict = {DENOM_CLASSES[i]: float(probs[i]) for i in range(len(DENOM_CLASSES))}
        return pred_class, confidence, prob_dict
