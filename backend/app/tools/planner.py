from typing import List, Dict, Any
from app.models.schemas import SeverityLevel

AGENCY_ROUTING_MAP = {
    "waterlogging": {
        "agency": "Municipal Stormwater Drainage & Disaster Mitigation Cell",
        "standard_sop": "Dispatch dewatering pumps and suction tankers to clear arterial bottlenecks."
    },
    "road_damage": {
        "agency": "Public Works Department (PWD) / Municipal Roads Maintenance Wing",
        "standard_sop": "Erect high-visibility barricading around cave-in / pothole, deploy cold-mix asphalt patch team."
    },
    "traffic_obstruction": {
        "agency": "Traffic Management Division / Local Traffic Police Control",
        "standard_sop": "Deploy traffic marshals to divert heavy vehicles and alleviate choke points."
    },
    "electrical_hazard": {
        "agency": "State Power Distribution Corporation / Municipal Street Lighting Wing",
        "standard_sop": "Isolate feeder line for safety, test ground earthing, replace fused luminaires or reconnect cables."
    },
    "fire_hazard": {
        "agency": "Fire & Rescue Services / Emergency Operations Center",
        "standard_sop": "Dispatch first responder fire tenders and establish cordon perimeter."
    },
    "structural_danger": {
        "agency": "Building & Safety Inspection Wing",
        "standard_sop": "Perform structural stability assessment and evacuate immediate perimeter."
    },
    "general_civic_issue": {
        "agency": "Civic Grievance & Urban Services Redressal Directorate",
        "standard_sop": "Log citizen report and schedule field inspection."
    }
}

def generate_action_plan(
    subtasks: List[Dict[str, Any]],
    location_details: Dict[str, Any],
    weather_details: Dict[str, Any] | None = None
) -> Dict[str, Any]:
    """
    Synthesizes multiple decomposed issues into a prioritized multi-agency action plan.
    Prioritizes life-safety hazards first.
    Includes explicit SOPs, responsible agencies, and user-approval checkpoints.
    """
    # Sort subtasks by severity priority: Urgent > High > Medium > Low
    severity_order = {
        SeverityLevel.URGENT.value: 0,
        SeverityLevel.HIGH.value: 1,
        SeverityLevel.MEDIUM.value: 2,
        SeverityLevel.LOW.value: 3
    }
    
    sorted_subtasks = sorted(
        subtasks,
        key=lambda s: severity_order.get(s.get("severity", SeverityLevel.LOW.value), 4)
    )

    planned_actions = []
    immediate_safety_alerts = []
    has_urgent_danger = False

    for sub in sorted_subtasks:
        cat = sub.get("category", "general_civic_issue")
        sev = sub.get("severity", SeverityLevel.LOW.value)
        agency_info = AGENCY_ROUTING_MAP.get(cat, AGENCY_ROUTING_MAP["general_civic_issue"])
        
        # Immediate life safety warning check
        if sev == SeverityLevel.URGENT.value:
            has_urgent_danger = True
            immediate_safety_alerts.append(
                f"SAFETY ADVISORY: {sub.get('title')} is marked URGENT. Maintain a safe perimeter of at least 15 meters. Do not approach uninsulated wires or hazardous zones."
            )
        elif sub.get("is_submerged"):
            immediate_safety_alerts.append(
                f"CAUTION: Concealed road hazard under water ({sub.get('title')}). Alert pedestrians and two-wheelers to avoid driving through standing water."
            )

        action_item = {
            "subtask_id": sub.get("subtask_id"),
            "issue_title": sub.get("title"),
            "category": cat,
            "severity": sev,
            "target_agency": agency_info["agency"],
            "recommended_sop": agency_info["standard_sop"],
            "requires_user_approval": True, # Consequential action requires explicit human sign-off!
            "dependencies": sub.get("dependencies", []),
            "dispatch_readiness": "READY_FOR_OPERATOR_SIGN_OFF" if location_details.get("resolved") else "BLOCKED_ON_LOCATION"
        }
        planned_actions.append(action_item)

    return {
        "total_actions": len(planned_actions),
        "has_urgent_danger": has_urgent_danger,
        "immediate_safety_advisories": immediate_safety_alerts,
        "location_summary": location_details.get("display_name") or "Location Unspecified",
        "actions": planned_actions,
        "execution_strategy": "PARALLEL_MULTI_AGENCY_DISPATCH" if len(planned_actions) > 1 else "SINGLE_AGENCY_DISPATCH"
    }
