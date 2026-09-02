import unittest
import base64

# Import the core logic functions without needing FastAPI HTTP server
from main import preprocess_and_verify_note, MODEL_METADATA

class TestCounterfeitLogic(unittest.TestCase):
    def test_model_metadata_dataset(self):
        """Verify model training dataset is ~200 notes"""
        self.assertEqual(MODEL_METADATA["training_dataset_size"], 200)
        self.assertEqual(MODEL_METADATA["dataset_breakdown"]["genuine_samples"], 100)
        self.assertEqual(MODEL_METADATA["dataset_breakdown"]["counterfeit_samples"], 100)
        self.assertEqual(MODEL_METADATA["model_metrics"]["accuracy"], 0.975)

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

if __name__ == '__main__':
    unittest.main()
