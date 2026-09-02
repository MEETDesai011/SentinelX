import unittest
from main import (
    evaluate_decision_table, 
    DecisionTableEvaluateRequest, 
    retain_learned_pattern, 
    RetainPatternRequest,
    find_best_matching_pattern,
    LEARNED_FRAUD_PATTERNS
)

class TestAdaptiveFraudDecisionTable(unittest.TestCase):
    def test_decision_table_rule_1_normal(self):
        """Rule 1: No suspicious activity -> Allow normal processing"""
        req = DecisionTableEvaluateRequest(
            activity_text="Your salary credit of 50,000 INR has been deposited to account ending in 1234.",
            caller_id="HDFC-BANK",
            is_incident_resolved=False,
            force_suspicious=False
        )
        resp = evaluate_decision_table(req)
        self.assertEqual(resp.decision_rule, "Rule 1")
        self.assertFalse(resp.suspicious_detected)
        self.assertTrue(resp.action_allow_normal_processing)
        self.assertFalse(resp.action_flag_investigate)
        self.assertFalse(resp.action_record_learn_pattern)

    def test_decision_table_rule_2_unmatched_suspicious(self):
        """Rule 2: Suspicious activity detected, but NO match with known learned pattern -> Normal monitoring continues"""
        req = DecisionTableEvaluateRequest(
            activity_text="Unusual request to inspect your phone battery firmware update.",
            caller_id="+919876543210",
            is_incident_resolved=False,
            force_suspicious=True
        )
        resp = evaluate_decision_table(req)
        self.assertEqual(resp.decision_rule, "Rule 2")
        self.assertTrue(resp.suspicious_detected)
        self.assertFalse(resp.matches_known_pattern)
        self.assertTrue(resp.action_allow_normal_processing) # Rule 2 footnote: allow normal processing/monitoring
        self.assertFalse(resp.action_flag_investigate)
        self.assertFalse(resp.action_record_learn_pattern)

    def test_decision_table_rule_3_known_fraud_ongoing(self):
        """Rule 3: Suspicious activity matches known fraud pattern, incident ongoing -> Flag & Block"""
        req = DecisionTableEvaluateRequest(
            activity_text="This is CBI officer calling about narcotics money laundering digital arrest warrant.",
            caller_id="+91800123456",
            is_incident_resolved=False
        )
        resp = evaluate_decision_table(req)
        self.assertEqual(resp.decision_rule, "Rule 3")
        self.assertTrue(resp.suspicious_detected)
        self.assertTrue(resp.matches_known_pattern)
        self.assertFalse(resp.incident_resolved)
        self.assertFalse(resp.action_allow_normal_processing)
        self.assertTrue(resp.action_flag_investigate)
        self.assertFalse(resp.action_record_learn_pattern)
        self.assertIsNotNone(resp.matched_pattern_details)

    def test_decision_table_rule_4_incident_resolved_learn(self):
        """Rule 4: Suspicious activity matches known fraud pattern AND incident resolved -> Flag & Learn/Record Pattern"""
        req = DecisionTableEvaluateRequest(
            activity_text="This is CBI officer calling about narcotics money laundering digital arrest warrant.",
            caller_id="+91800123456",
            is_incident_resolved=True
        )
        resp = evaluate_decision_table(req)
        self.assertEqual(resp.decision_rule, "Rule 4")
        self.assertTrue(resp.suspicious_detected)
        self.assertTrue(resp.matches_known_pattern)
        self.assertTrue(resp.incident_resolved)
        self.assertFalse(resp.action_allow_normal_processing)
        self.assertTrue(resp.action_flag_investigate)
        self.assertTrue(resp.action_record_learn_pattern)

    def test_pattern_retention_and_repeat_detection(self):
        """Test Step 8, 9, 10, 11: Retaining pattern and using it to detect future repeat attack"""
        initial_count = len(LEARNED_FRAUD_PATTERNS)
        retain_req = RetainPatternRequest(
            incident_id="INC-9988",
            title="Aadhaar Biometric Freeze Threat",
            category="IDENTITY_EXTORTION",
            transcript_or_text="Your Aadhaar biometric is frozen by UIDAI. Pay unlock charge immediately.",
            keywords=["aadhaar biometric", "uidai freeze", "unlock charge", "biometric blocked"],
            caller_id="+91880998877",
            threat_signature="Claims biometric locked, demands instant unlock charge."
        )
        retain_resp = retain_learned_pattern(retain_req)
        self.assertEqual(retain_resp.status, "SUCCESS")
        self.assertEqual(len(LEARNED_FRAUD_PATTERNS), initial_count + 1)

        # Future incoming attack using similar words (Steps 10 & 11)
        repeat_text = "Urgent: UIDAI freeze on your Aadhaar biometric. Pay unlock charge now."
        pat, sim = find_best_matching_pattern(repeat_text, "+91880998877")
        self.assertIsNotNone(pat)
        self.assertGreater(sim, 0.50)
        self.assertIn("Aadhaar Biometric", pat["title"])

if __name__ == '__main__':
    unittest.main()
