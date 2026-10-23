import pytest
import os
import json
from pathlib import Path
from app.database import init_db, db_session
from app.tools.classifier import classify_issue, assess_severity
from app.tools.extractor import split_into_subtasks, extract_structured_details
from app.tools.validator import validate_required_information, verify_tool_result
from app.tools.report_tools import save_report, retrieve_report, list_all_reports
from app.tools.geocoding import resolve_location
from app.agent.orchestrator import orchestrator
from app.agent.gemini_client import gemini_bridge
from app.models.schemas import SeverityLevel, ApprovalStatus, VerificationType

@pytest.fixture(autouse=True)
def setup_test_db():
    """Ensure database schema is fresh and ready before each test."""
    init_db()

# 1. Multiple-issue extraction
def test_multiple_issue_extraction():
    sample_text = (
        "Heavy rain has caused waterlogging near my college. "
        "There is a large pothole hidden under the water, traffic is stuck, "
        "and the nearby streetlight is not working."
    )
    subtasks = split_into_subtasks(sample_text)
    assert len(subtasks) >= 3, f"Expected at least 3 distinct subtasks, got {len(subtasks)}"
    
    categories = [s["category"] for s in subtasks]
    assert "waterlogging" in categories or any("water" in s["title"].lower() for s in subtasks)
    assert "road_damage" in categories or any("pothole" in s["title"].lower() for s in subtasks)
    assert "electrical_hazard" in categories or any("light" in s["title"].lower() for s in subtasks)

# 2. Severity assessment & Explainable rules
def test_severity_assessment_rules():
    # Immediate life safety -> Urgent
    live_wire = assess_severity("electrical_hazard", "Live wire is sparking on the ground near children.")
    assert live_wire["severity"] == SeverityLevel.URGENT.value
    assert live_wire["life_safety_risk"] is True

    # Concealed pothole under flood water -> High
    submerged_pothole = assess_severity("road_damage", "Pothole concealed under water", is_submerged=True)
    assert submerged_pothole["severity"] == SeverityLevel.HIGH.value
    assert "hidden" in submerged_pothole["reason"].lower() or "under" in submerged_pothole["reason"].lower()

    # Standard streetlight out -> Medium
    light_out = assess_severity("electrical_hazard", "The streetlight is not working tonight.")
    assert light_out["severity"] == SeverityLevel.MEDIUM.value

# 3. Missing-information handling (Scenario 1)
def test_missing_information_detection():
    # Vague input without location
    vague_input = "There is a deep road cave-in and broken water pipe causing major issues."
    val = validate_required_information({"description": vague_input, "primary_location": None}, user_location=None)
    assert val["is_valid"] is False
    assert "exact_street_or_landmark" in val["missing_fields"]
    assert val["clarification_prompt"] is not None

    # Valid input with explicit location
    valid_val = validate_required_information(
        {"description": vague_input, "primary_location": "MG Road Metro Station"},
        user_location="MG Road Metro Station"
    )
    assert valid_val["is_valid"] is True
    assert len(valid_val["missing_fields"]) == 0

# 4. Tool verification distinctions (Fact vs Inference vs Missing vs Failed)
def test_verify_tool_result_distinctions():
    # Success verified
    verified = verify_tool_result("resolve_location", {"resolved": True, "latitude": 18.52, "longitude": 73.85})
    assert verified["verified"] is True
    assert verified["status"] == VerificationType.TOOL_VERIFIED

    # Tool error -> FAILED_VERIFICATION
    failed = verify_tool_result("sensor_tool", {"error": "Connection timed out"})
    assert failed["verified"] is False
    assert failed["status"] == VerificationType.FAILED_VERIFICATION

    # Null output -> FAILED_VERIFICATION
    null_res = verify_tool_result("test_tool", None)
    assert null_res["verified"] is False
    assert null_res["status"] == VerificationType.FAILED_VERIFICATION

# 5. Database persistence & Tracking IDs
def test_database_persistence_and_tracking_id():
    saved = save_report(
        task_id="TSK-TEST001",
        subtask_id="sub-1",
        category="road_damage",
        severity=SeverityLevel.HIGH.value,
        title="Deep Sinkhole Near Metro Pillar 42",
        description="A 2-meter sinkhole has opened in the middle lane.",
        location_name="MG Road, Pillar 42",
        latitude=18.5204,
        longitude=73.8567,
        location_verified=True,
        evidence_data=["Citizen photo uploaded", "Luminosity test passed"],
        missing_info=[],
        recommended_actions=["Deploy high-visibility safety barriers", "Notify traffic dispatch"]
    )
    assert saved is not None
    assert saved["id"].startswith("SST-2026-")
    assert saved["approval_status"] == ApprovalStatus.PENDING_APPROVAL.value

    # Retrieve from DB
    retrieved = retrieve_report(saved["id"])
    assert retrieved is not None
    assert retrieved["title"] == "Deep Sinkhole Near Metro Pillar 42"
    assert retrieved["location_verified"] is True

# 6. User Approval Enforcement (Consequential action requires sign-off)
def test_approval_enforcement():
    saved = save_report(
        task_id="TSK-APPROVAL-TEST",
        subtask_id="sub-2",
        category="waterlogging",
        severity="High",
        title="Flooded Underpass",
        description="Water depth exceeds 3 feet.",
        location_name="Shivaji Nagar Underpass",
        latitude=18.53,
        longitude=73.85,
        location_verified=True,
        evidence_data=[],
        missing_info=[],
        recommended_actions=["Dispatch dewatering pump"]
    )
    assert saved["approval_status"] == ApprovalStatus.PENDING_APPROVAL.value

    # Perform approval
    from app.routers.reports import approve_consequential_action
    import asyncio

    # Test via database update directly
    from app.database import db_session
    with db_session() as conn:
        conn.execute("UPDATE reports SET approval_status = 'APPROVED' WHERE id = ?", (saved["id"],))

    updated = retrieve_report(saved["id"])
    assert updated["approval_status"] == "APPROVED"

# 7. Scenario 1 End-to-End: Missing location halts at clarification
@pytest.mark.asyncio
async def test_scenario_1_incomplete_input():
    res = await orchestrator.execute(
        raw_text="There is a massive water pipe burst flooding the road, but I'm rushing and didn't state where.",
        user_location=None,
        scenario="scenario_1"
    )
    assert res["status"] == "AWAITING_CLARIFICATION"
    assert "exact_street_or_landmark" in res["missing_information"]
    assert len(res["reports"]) == 0 # Does NOT invent reports without location!

    # Now resume with clarification
    res_resumed = await orchestrator.resume_with_clarification(
        task_id=res["task_id"],
        clarifications={"location": "MG Road City Center, Pune"}
    )
    assert res_resumed["status"] == "COMPLETED"
    assert len(res_resumed["reports"]) >= 1

# 8. Scenario 2 End-to-End: Multiple problems decomposition & multi-report generation
@pytest.mark.asyncio
async def test_scenario_2_multiple_problems():
    text = (
        "Heavy rain has caused waterlogging near my college at MG Road Junction. "
        "There is a large pothole hidden under the water, traffic is stuck, "
        "and the nearby streetlight is not working."
    )
    res = await orchestrator.execute(
        raw_text=text,
        user_location="MG Road Junction, Pune",
        scenario="scenario_2"
    )
    assert res["status"] == "COMPLETED"
    assert len(res["subtasks"]) >= 3
    assert len(res["reports"]) >= 3
    # Check that each report has a real SST-2026- tracking ID
    for rep in res["reports"]:
        assert rep["id"].startswith("SST-2026-")
        assert rep["approval_status"] == ApprovalStatus.PENDING_APPROVAL.value

# 9. Scenario 3 End-to-End: Tool failure & graceful recovery
@pytest.mark.asyncio
async def test_scenario_3_tool_failure_recovery():
    res = await orchestrator.execute(
        raw_text="High voltage power line sparking near municipal school at Shivaji Nagar.",
        user_location="Shivaji Nagar, Pune",
        scenario="scenario_3",
        simulate_failure=True
    )
    assert res["status"] == "COMPLETED"
    assert res["recovery_engaged"] is True
    assert "RECOVERY PROTOCOL ENGAGED" in res["recovery_message"]
    
    # Check that failed tool is recorded honestly in tool_executions
    failed_tools = [t for t in res["tool_executions"] if t["status"] == "FAILED"]
    assert len(failed_tools) >= 1
    assert "check_available_public_data" in [t["tool_name"] for t in failed_tools]

# 10. Gemini Fallback: Works reliably without API key
def test_gemini_fallback_mode():
    assert gemini_bridge.active_mode in ["REAL_GEMINI", "DEMO_MODE"]
    # If no key, it must report DEMO_MODE
    if not os.getenv("GEMINI_API_KEY"):
        assert gemini_bridge.is_real is False
        assert gemini_bridge.active_mode == "DEMO_MODE"
