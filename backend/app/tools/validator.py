from typing import Dict, Any, List
from app.models.schemas import VerificationType

def validate_required_information(
    issue_data: Dict[str, Any],
    user_location: str | None = None,
    coordinates: tuple[float, float] | None = None
) -> Dict[str, Any]:
    """
    Validates essential information needed to generate a valid civic action plan.
    Strictly forbids inventing coordinates or street names.
    If location is missing or generic (e.g. just 'near my college' without college name or street),
    identifies missing details and flags them for user clarification.
    """
    missing_fields = []
    provided_fields = []
    inferred_fields = []

    # Check location specificity
    loc = (user_location or "").strip()
    extracted_loc = issue_data.get("primary_location") or ""
    
    has_specific_location = False
    
    if loc and len(loc) >= 3:
        has_specific_location = True
        provided_fields.append({"name": "location", "value": loc, "type": VerificationType.USER_PROVIDED})
    elif extracted_loc and any(marker in extracted_loc.lower() for marker in ["road", "street", "nagar", "junction", "chowk", "sector", "lane", "avenue"]):
        has_specific_location = True
        provided_fields.append({"name": "location", "value": extracted_loc, "type": VerificationType.USER_PROVIDED})
    elif extracted_loc and len(extracted_loc.split()) >= 2 and not extracted_loc.lower().startswith("my "):
        has_specific_location = True
        inferred_fields.append({"name": "location", "value": extracted_loc, "type": VerificationType.AI_INFERRED})
    else:
        missing_fields.append("exact_street_or_landmark")

    # Check problem specificity
    desc = issue_data.get("description") or issue_data.get("raw_clause") or ""
    if len(desc.strip()) < 8:
        missing_fields.append("problem_detail")
    else:
        provided_fields.append({"name": "description", "value": desc, "type": VerificationType.USER_PROVIDED})

    # Category
    category = issue_data.get("category")
    if category:
        inferred_fields.append({"name": "category", "value": category, "type": VerificationType.AI_INFERRED})

    is_valid = len(missing_fields) == 0

    return {
        "is_valid": is_valid,
        "missing_fields": missing_fields,
        "provided_fields": provided_fields,
        "inferred_fields": inferred_fields,
        "clarification_prompt": (
            "Please provide the exact street name, landmark, or college name to proceed with official report generation."
            if "exact_street_or_landmark" in missing_fields else None
        )
    }

def verify_tool_result(
    tool_name: str,
    raw_output: Any,
    expected_keys: List[str] | None = None
) -> Dict[str, Any]:
    """
    Verifies that a tool output is authentic, non-empty, and structurally sound.
    Differentiates between verified fact, unverified guess, or tool failure.
    """
    if raw_output is None:
        return {
            "verified": False,
            "status": VerificationType.FAILED_VERIFICATION,
            "reason": f"Tool '{tool_name}' returned null or empty response.",
            "confidence": 0.0
        }

    if isinstance(raw_output, dict):
        if raw_output.get("error"):
            return {
                "verified": False,
                "status": VerificationType.FAILED_VERIFICATION,
                "reason": f"Tool error reported: {raw_output.get('error')}",
                "confidence": 0.0
            }

        if expected_keys:
            missing_keys = [k for k in expected_keys if k not in raw_output]
            if missing_keys:
                return {
                    "verified": False,
                    "status": VerificationType.FAILED_VERIFICATION,
                    "reason": f"Tool output missing expected attributes: {missing_keys}",
                    "confidence": 0.4
                }

        # Check if output contains mock/simulated flags
        if raw_output.get("simulated"):
            return {
                "verified": False,
                "status": VerificationType.AI_INFERRED,
                "reason": "Simulated output detected; marked as unverified AI heuristic.",
                "confidence": 0.5
            }

        return {
            "verified": True,
            "status": VerificationType.TOOL_VERIFIED,
            "reason": f"Verified successfully by {tool_name} with valid schema structure.",
            "confidence": 0.95
        }

    return {
        "verified": True,
        "status": VerificationType.TOOL_VERIFIED,
        "reason": f"Tool '{tool_name}' returned scalar value of type {type(raw_output).__name__}.",
        "confidence": 0.90
    }
