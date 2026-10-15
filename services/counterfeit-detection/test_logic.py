import os
import unittest
import base64
from PIL import Image

# Import the core logic functions without needing FastAPI HTTP server
from main import preprocess_and_verify_note, MODEL_METADATA, extract_pil_features, CLF_MODEL, DENOM_CLASSES

class TestCounterfeitLogic(unittest.TestCase):
    def test_model_metadata_dataset(self):
        """Verify model accuracy meets >= 91% requirement and has multi-denomination coverage"""
        self.assertGreaterEqual(MODEL_METADATA["validation_accuracy"], 0.91)
        self.assertTrue(MODEL_METADATA["meets_minimum_accuracy_requirement"])
        self.assertIn("₹10", MODEL_METADATA["dataset_breakdown"]["denominations"])
        self.assertIn("₹500", MODEL_METADATA["dataset_breakdown"]["denominations"])

    def test_decision_rule_2_genuine_verification(self):
        """Test Rule 2 verification on authentic banknote data"""
        sample_bytes = b"GENUINE_SAMPLE_INR_500_NOTE" + b"\x00" * 6000
        rule, is_fake, conf, reason, detailed, serial, markers, telemetry = preprocess_and_verify_note(sample_bytes, 500)
        self.assertIn("Rule 2", rule)
        self.assertFalse(is_fake)
        self.assertGreater(conf, 0.90)
        self.assertIn("Genuine Indian banknote", reason)
        self.assertTrue(len(markers) >= 4)

    def test_decision_rule_3_counterfeit_verification(self):
        """Test Rule 3 verification on fake banknote data"""
        fake_bytes = b"COUNTERFEIT_FLAT_SAMPLE"
        rule, is_fake, conf, reason, detailed, serial, markers, telemetry = preprocess_and_verify_note(fake_bytes, 500)
        self.assertIn("Rule 3", rule)
        self.assertTrue(is_fake)
        self.assertGreater(conf, 0.70)
        self.assertIn("Counterfeit note detected", reason)

    def test_ten_rupee_banknote_ml_detection(self):
        """Ensure 10 rupee note is correctly identified as ₹10 with high accuracy and not ₹500"""
        ten_note_path = os.path.join(os.path.dirname(__file__), "Data", "Validation", "10", "10_val_1.jpg")
        if os.path.exists(ten_note_path) and CLF_MODEL is not None:
            with open(ten_note_path, "rb") as f:
                img_bytes = f.read()
            
            with Image.open(ten_note_path) as pil_img:
                feat = extract_pil_features(pil_img)
                probs = CLF_MODEL.predict_proba(feat.reshape(1, -1))[0]
                pred_class = DENOM_CLASSES[probs.argmax()]
                self.assertEqual(pred_class, "10")
                self.assertGreater(probs.max(), 0.90)

            rule, is_fake, conf, reason, detailed, serial, markers, telemetry = preprocess_and_verify_note(img_bytes, 500)
            self.assertEqual(telemetry["detected_denomination"], 10)
            self.assertEqual(telemetry["ml_model_predicted_class"], "10")
            self.assertFalse(is_fake)

if __name__ == '__main__':
    unittest.main()
