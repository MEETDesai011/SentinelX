import base64
import unittest
from fastapi.testclient import TestClient
from main import app

class TestCounterfeitDetectionService(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_decision_table_rule_1_no_image(self):
        """Rule 1: No image uploaded -> Request image"""
        payload = {
            "image_base64": "",
            "claimed_denomination": 500
        }
        response = self.client.post("/currency/detect", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("Rule 1", data["decision_rule"])
        self.assertFalse(data["image_uploaded"])
        self.assertEqual(data["classification"], "UNPROCESSED")
        self.assertIsNone(data["confidence"])
        self.assertIn("No banknote image was provided", data["brief_reason"])

    def test_decision_table_rule_2_genuine(self):
        """Rule 2: Genuine note -> Display genuine + confidence + explanation"""
        genuine_bytes = b"GENUINE_SAMPLE_INR_500_MAHATMA_GANDHI_SERIES_" + b"0" * 6000
        payload = {
            "image_base64": base64.b64encode(genuine_bytes).decode('utf-8'),
            "claimed_denomination": 500
        }
        response = self.client.post("/currency/detect", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("Rule 2", data["decision_rule"])
        self.assertTrue(data["image_uploaded"])
        self.assertFalse(data["is_counterfeit"])
        self.assertEqual(data["classification"], "GENUINE")
        self.assertIsNotNone(data["confidence"])
        self.assertGreater(data["confidence"], 0.85)
        self.assertIn("Genuine Indian banknote", data["brief_reason"])

    def test_decision_table_rule_3_counterfeit(self):
        """Rule 3: Counterfeit note -> Display counterfeit + confidence + explanation"""
        fake_bytes = b"COUNTERFEIT_FLAT_SCAN"
        payload = {
            "image_base64": base64.b64encode(fake_bytes).decode('utf-8'),
            "claimed_denomination": 500
        }
        response = self.client.post("/currency/detect", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("Rule 3", data["decision_rule"])
        self.assertTrue(data["image_uploaded"])
        self.assertTrue(data["is_counterfeit"])
        self.assertEqual(data["classification"], "COUNTERFEIT")
        self.assertIsNotNone(data["confidence"])
        self.assertIn("Counterfeit note detected", data["brief_reason"])

    def test_model_info_endpoint(self):
        """Verify multi-denomination dataset training info and accuracy >= 91%"""
        response = self.client.get("/currency/model-info")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertGreaterEqual(data["validation_accuracy"], 0.91)
        self.assertTrue(data["meets_minimum_accuracy_requirement"])
        self.assertIn("₹10", data["dataset_breakdown"]["denominations"])
        self.assertIn("₹500", data["dataset_breakdown"]["denominations"])

    def test_health(self):
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "UP")

    def test_ten_rupee_note_endpoint(self):
        """Verify that uploading a ₹10 note detects denomination as 10 (not 500) and genuine"""
        import os
        ten_path = os.path.join(os.path.dirname(__file__), "Data", "Validation", "10", "10_val_1.jpg")
        if os.path.exists(ten_path):
            with open(ten_path, "rb") as f:
                img_b64 = base64.b64encode(f.read()).decode('utf-8')
            
            # Send with default claimed_denomination = 500 to simulate frontend upload before correction
            payload = {
                "image_base64": img_b64,
                "claimed_denomination": 500
            }
            response = self.client.post("/currency/detect", json=payload)
            self.assertEqual(response.status_code, 200)
            data = response.json()
            self.assertEqual(data["detected_denomination"], 10)
            self.assertEqual(data["classification"], "GENUINE")
            self.assertFalse(data["is_counterfeit"])

if __name__ == '__main__':
    unittest.main()
