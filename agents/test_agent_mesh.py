import os
import pytest
from agent_mesh import (
    ScamPatternAgent, ScamPatternInput,
    ThreatFusionAgent, ThreatFusionInput,
    OrchestratorAgent
)

def test_scam_pattern_agent_mock():
    agent = ScamPatternAgent()
    payload = ScamPatternInput(
        correlation_id="test-corr-1",
        transcript_text="CBI officer calling. You are under arrest.",
        metadata={"caller_number": "+919876500112"}
    )
    out = agent.run(payload)
    assert out.scam_score > 0.70
    assert out.alert_triggered == True

def test_threat_fusion_agent_mock():
    agent = ThreatFusionAgent()
    payload = ThreatFusionInput(
        correlation_id="test-corr-2",
        scam_score=0.90,
        deepfake_score=0.85,
        graph_risk=0.95,
        currency_risk=0.0,
        cli_spoofed=True
    )
    out = agent.run(payload)
    assert out.composite_score > 0.80
    assert "LOCK_BANK_APPS" in out.directives

def test_orchestrator_call_flow():
    orchestrator = OrchestratorAgent()
    res = orchestrator.run_call_analysis_flow(
        correlation_id="test-corr-3",
        transcript="This is a test transcript for a digital arrest scenario. You must confirm your account verification numbers.",
        caller_number="+919876500112"
    )
    assert res["correlation_id"] == "test-corr-3"
    assert "mule_nodes_flagged" in res
    assert res["action_taken"] == "NPCI_MULE_ACCOUNTS_HOLD_INITIATED"
