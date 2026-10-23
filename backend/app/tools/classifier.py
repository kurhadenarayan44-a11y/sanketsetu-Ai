from typing import Dict, Any, Tuple
from app.models.schemas import SeverityLevel

# Standard civic & hazard taxonomy
CIVIC_CATEGORIES = {
    "waterlogging": ["waterlog", "waterlogging", "flood", "drainage overflow", "submerged", "inundation"],
    "road_damage": ["pothole", "cave-in", "cracked road", "broken asphalt", "sinkhole", "crater"],
    "traffic_obstruction": ["traffic", "jam", "gridlock", "stranded vehicles", "blocked lane", "bottleneck"],
    "electrical_hazard": ["streetlight", "wire", "power line", "sparking", "transformer", "short circuit", "exposed cable", "blackout"],
    "sanitation": ["garbage", "trash pile", "open sewage", "filth", "dumping", "stench"],
    "structural_danger": ["falling debris", "wall collapse", "tree fall", "leaning pole", "weak bridge"],
    "fire_hazard": ["smoke", "burning", "fire", "gas leak", "chemical smell"]
}

def classify_issue(problem_text: str, context: Dict[str, Any] | None = None) -> Dict[str, Any]:
    """
    Classifies a problem description into a standard civic/emergency category.
    Returns: category, normalized_name, keywords_matched, confidence.
    """
    text_lower = problem_text.lower()
    matched_category = "general_civic_issue"
    best_match_count = 0
    matched_keywords = []

    for cat, keywords in CIVIC_CATEGORIES.items():
        matches = [kw for kw in keywords if kw in text_lower]
        if len(matches) > best_match_count:
            best_match_count = len(matches)
            matched_category = cat
            matched_keywords = matches

    confidence = min(0.95, 0.60 + (best_match_count * 0.15)) if best_match_count > 0 else 0.40

    return {
        "category": matched_category,
        "category_title": matched_category.replace("_", " ").title(),
        "confidence": confidence,
        "matched_keywords": matched_keywords,
        "context_applied": bool(context)
    }

def assess_severity(
    category: str,
    problem_text: str,
    has_image: bool = False,
    is_submerged: bool = False
) -> Dict[str, Any]:
    """
    Transparent and explainable severity rules:
    Low, Medium, High, Urgent.
    Evaluates hazard level, life-safety risk, and contextual amplifiers.
    """
    text_lower = problem_text.lower()
    level = SeverityLevel.MEDIUM
    reasons = []

    # High voltage, sparking wire, active fire, structural collapse -> URGENT
    if any(k in text_lower for k in ["sparking", "high voltage", "live wire", "collapse", "gas leak", "fire", "trapped"]):
        level = SeverityLevel.URGENT
        reasons.append("Immediate life-safety hazard detected (sparking electricity/structural risk/toxic fumes).")
    
    # Submerged pothole or waterlogged main arterial -> HIGH
    elif is_submerged or ("pothole" in text_lower and ("under" in text_lower or "water" in text_lower or "rain" in text_lower)):
        level = SeverityLevel.HIGH
        reasons.append("Hidden hazard: Pothole concealed under flood water poses severe risk of two-wheeler accidents and vehicle damage.")

    elif category in ["waterlogging", "road_damage"] and any(k in text_lower for k in ["college", "hospital", "school", "station", "junction"]):
        level = SeverityLevel.HIGH
        reasons.append("High footfall/vulnerable institutional zone (college/hospital/school/junction).")

    elif category == "electrical_hazard" and any(k in text_lower for k in ["dark", "night", "not working", "off"]):
        level = SeverityLevel.MEDIUM
        reasons.append("Pedestrian vulnerability and visibility impediment due to non-functional lighting.")

    elif category == "traffic_obstruction":
        level = SeverityLevel.MEDIUM
        reasons.append("Vehicular bottleneck impeding public mobility.")

    else:
        level = SeverityLevel.LOW
        reasons.append("Standard civic maintenance inquiry with no immediate physical peril.")

    return {
        "severity": level.value,
        "reason": " ".join(reasons),
        "life_safety_risk": level in [SeverityLevel.HIGH, SeverityLevel.URGENT],
        "requires_immediate_safety_guidance": level == SeverityLevel.URGENT
    }
