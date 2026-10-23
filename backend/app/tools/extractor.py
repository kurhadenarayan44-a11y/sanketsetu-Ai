import re
from typing import List, Dict, Any
from app.tools.classifier import classify_issue, assess_severity

def split_into_subtasks(raw_text: str) -> List[Dict[str, Any]]:
    """
    Decomposes a messy natural language input into separate, atomic problem statements.
    Ensures that compound problems (e.g. waterlogging + hidden pothole + traffic + broken streetlight)
    are treated as distinct subtasks with individual workflows.
    """
    # Look for compound clauses or bullet/comma splits
    clauses = []
    
    # Check for sentence delimiters (. ! ?)
    sentences = [s.strip() for s in re.split(r'[.!?\n]+', raw_text) if s.strip()]
    
    for sentence in sentences:
        # Check if sentence has multiple clauses joined by 'and', 'also', 'furthermore', or commas
        # If clauses mention different hazards, split them
        sub_parts = re.split(r',\s*(?:and\s+)?|\s+and\s+(?:the\s+)?|\s+also\s+', sentence, flags=re.IGNORECASE)
        sub_parts = [p.strip() for p in sub_parts if len(p.strip()) > 5]
        
        # If splitting resulted in meaningful parts, keep them; otherwise keep original sentence
        if len(sub_parts) > 1:
            for part in sub_parts:
                clauses.append(part)
        else:
            clauses.append(sentence)

    # Consolidate clauses into coherent issue candidates
    subtasks = []
    seen_categories = set()

    for idx, clause in enumerate(clauses):
        classification = classify_issue(clause)
        cat = classification["category"]
        
        # Generate clean title
        words = clause.split()
        short_title = " ".join(words[:7]) + ("..." if len(words) > 7 else "")
        
        # If this category has already been added with nearly identical meaning, append context
        if cat in seen_categories and cat != "general_civic_issue":
            short_title = f"{classification['category_title']} (Secondary observation: {short_title})"
            
        seen_categories.add(cat)
        
        # Assess severity
        is_submerged = "submerged" in clause.lower() or ("under" in clause.lower() and "water" in clause.lower())
        sev_info = assess_severity(cat, clause, is_submerged=is_submerged)
        
        subtasks.append({
            "subtask_id": f"subtask-{idx+1}",
            "title": short_title.capitalize(),
            "raw_clause": clause,
            "category": cat,
            "category_title": classification["category_title"],
            "severity": sev_info["severity"],
            "severity_reason": sev_info["reason"],
            "is_submerged": is_submerged,
            "assigned_tools": [
                "classify_issue",
                "assess_severity",
                "validate_required_information",
                "resolve_location",
                "prepare_submission_preview"
            ]
        })

    # Fallback if nothing was extracted
    if not subtasks:
        classification = classify_issue(raw_text)
        sev_info = assess_severity(classification["category"], raw_text)
        subtasks.append({
            "subtask_id": "subtask-1",
            "title": raw_text[:60] + ("..." if len(raw_text) > 60 else ""),
            "raw_clause": raw_text,
            "category": classification["category"],
            "category_title": classification["category_title"],
            "severity": sev_info["severity"],
            "severity_reason": sev_info["reason"],
            "is_submerged": False,
            "assigned_tools": ["classify_issue", "assess_severity", "resolve_location", "prepare_submission_preview"]
        })

    return subtasks

def extract_structured_details(text: str, location_hint: str | None = None) -> Dict[str, Any]:
    """
    Extracts structured operational entities from raw text:
    - Primary subjects
    - Identified landmarks or location hints
    - Temporal markers (e.g. today, during rain, last night)
    - Affected population / zone type (e.g. college, hospital, market)
    - Safety warnings needed
    """
    text_lower = text.lower()
    
    # 1. Location extraction heuristics
    extracted_locations = []
    location_patterns = [
        r'near\s+(?:the\s+)?([A-Za-z0-9\s]+?)(?:[.,;]|\s+and|\s+where|\s+traffic|\s+is|\s+has|$)',
        r'at\s+(?:the\s+)?([A-Za-z0-9\s]+?)(?:[.,;]|\s+and|\s+where|\s+traffic|\s+is|\s+has|$)',
        r'on\s+(?:the\s+)?([A-Za-z0-9\s]+?)(?:[.,;]|\s+and|\s+where|\s+traffic|\s+is|\s+has|$)',
        r'in\s+front\s+of\s+(?:the\s+)?([A-Za-z0-9\s]+?)(?:[.,;]|\s+and|\s+where|\s+traffic|\s+is|\s+has|$)'
    ]
    
    for pattern in location_patterns:
        matches = re.findall(pattern, text, flags=re.IGNORECASE)
        for m in matches:
            cleaned = m.strip()
            if len(cleaned) > 2 and len(cleaned.split()) <= 6:
                extracted_locations.append(cleaned)
                
    if location_hint and location_hint.strip():
        extracted_locations.insert(0, location_hint.strip())

    # 2. Zone type detection
    zone = "General Public Zone"
    if "college" in text_lower or "university" in text_lower:
        zone = "Educational Zone (College/University)"
    elif "school" in text_lower:
        zone = "Educational Zone (School)"
    elif "hospital" in text_lower or "clinic" in text_lower:
        zone = "Healthcare Zone"
    elif "market" in text_lower or "bazaar" in text_lower:
        zone = "Commercial Market Zone"
    elif "junction" in text_lower or "crossing" in text_lower:
        zone = "Major Traffic Intersection"

    # 3. Weather / temporal context
    weather_context = None
    if "rain" in text_lower or "monsoon" in text_lower or "storm" in text_lower:
        weather_context = "Heavy precipitation / Rainstorm reported"

    return {
        "extracted_locations": list(dict.fromkeys(extracted_locations)),
        "primary_location": extracted_locations[0] if extracted_locations else None,
        "zone_type": zone,
        "weather_context": weather_context,
        "urgency_triggers": [w for w in ["sparking", "fire", "live wire", "collapse", "gas"] if w in text_lower]
    }
