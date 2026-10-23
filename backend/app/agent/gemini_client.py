import json
import logging
from typing import Dict, Any, Optional
from app.config import settings

logger = logging.getLogger("sanketsetu.gemini")

class GeminiAgentBridge:
    def __init__(self):
        self.client = None
        self.active_mode = "DEMO_MODE"
        self._init_sdk()

    def _init_sdk(self):
        """Initializes the official google-genai Client if an API key is available."""
        if settings.is_gemini_active:
            try:
                from google import genai
                self.client = genai.Client(api_key=settings.GEMINI_API_KEY)
                self.active_mode = "REAL_GEMINI"
                logger.info(f"Initialized official Google GenAI Client with model: {settings.GEMINI_MODEL}")
            except Exception as e:
                logger.warning(f"Failed to initialize Google GenAI SDK: {e}. Falling back to DEMO_MODE.")
                self.client = None
                self.active_mode = "DEMO_MODE"
        else:
            self.client = None
            self.active_mode = "DEMO_MODE"

    @property
    def is_real(self) -> bool:
        return self.active_mode == "REAL_GEMINI" and self.client is not None

    async def decompose_and_structure_intent(self, text: str, location_hint: Optional[str] = None) -> Dict[str, Any]:
        """
        Uses Gemini to interpret messy multi-issue text into structured JSON subtasks.
        If in DEMO_MODE or if the API call fails/times out, seamlessly delegates to deterministic
        local Python extraction and explicitly reports DEMO_MODE.
        """
        if self.is_real:
            try:
                prompt = f"""
You are the intent decomposition engine of SankatSetu AI, a societal-benefit agent.
Analyze this messy real-world citizen report:
\"\"\"{text}\"\"\"

User location hint: \"{location_hint or 'None'}\"

Rules:
1. Decompose into ALL atomic civic/hazard issues mentioned (e.g. waterlogging, hidden pothole, traffic obstruction, streetlight failure, live wire, cave-in).
2. For each issue, determine:
   - title (short, crisp)
   - category (waterlogging, road_damage, traffic_obstruction, electrical_hazard, fire_hazard, structural_danger, sanitation, or general_civic_issue)
   - severity (Low, Medium, High, Urgent)
   - severity_reason (why this level was chosen)
   - is_submerged (true if hazard is underwater/concealed)
   - affected_zone (college, hospital, junction, residential, etc.)
3. Identify any missing information critical to dispatch (such as exact street, landmark, or college name).

Return ONLY valid JSON matching this schema:
{{
  "issues": [
    {{
      "title": "string",
      "category": "string",
      "severity": "string",
      "severity_reason": "string",
      "is_submerged": false,
      "raw_clause": "string"
    }}
  ],
  "extracted_location": "string or null",
  "missing_details": ["string"],
  "zone_type": "string"
}}
"""
                response = self.client.models.generate_content(
                    model=settings.GEMINI_MODEL,
                    contents=prompt
                )
                
                raw_text = response.text if hasattr(response, 'text') else str(response)
                # Strip any markdown code fences if present
                clean_json = raw_text.strip()
                if clean_json.startswith("```json"):
                    clean_json = clean_json[7:]
                if clean_json.startswith("```"):
                    clean_json = clean_json[3:]
                if clean_json.endswith("```"):
                    clean_json = clean_json[:-3]
                clean_json = clean_json.strip()

                parsed = json.loads(clean_json)
                return {
                    "source": "REAL_GEMINI_API",
                    "model": settings.GEMINI_MODEL,
                    "data": parsed,
                    "success": True
                }
            except Exception as e:
                logger.error(f"Gemini API invocation error: {e}. Falling back to deterministic demo mode.")

        # Deterministic Demo Mode (Local Python extraction)
        from app.tools.extractor import split_into_subtasks, extract_structured_details
        from app.tools.validator import validate_required_information

        subtasks = split_into_subtasks(text)
        details = extract_structured_details(text, location_hint)
        val = validate_required_information({"description": text, "primary_location": details.get("primary_location")}, location_hint)

        return {
            "source": "DETERMINISTIC_DEMO_ENGINE",
            "model": "Python Heuristic Rule Engine (Zero API Key Mode)",
            "data": {
                "issues": [
                    {
                        "title": s["title"],
                        "category": s["category"],
                        "severity": s["severity"],
                        "severity_reason": s["severity_reason"],
                        "is_submerged": s["is_submerged"],
                        "raw_clause": s["raw_clause"]
                    }
                    for s in subtasks
                ],
                "extracted_location": details.get("primary_location"),
                "missing_details": val["missing_fields"],
                "zone_type": details.get("zone_type")
            },
            "success": True
        }

gemini_bridge = GeminiAgentBridge()
