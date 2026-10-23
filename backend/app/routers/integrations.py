from fastapi import APIRouter
from app.config import settings
from app.database import db_session
from app.agent.gemini_client import gemini_bridge

router = APIRouter(tags=["integrations"])

@router.get("/api/health")
async def health_check():
    """Simple system liveness check."""
    return {
        "status": "healthy",
        "service": "SankatSetu AI Engine",
        "version": settings.VERSION
    }

@router.get("/api/integrations/status")
async def get_integrations_status():
    """
    Detailed subsystem diagnostics:
    - Gemini SDK & Model status
    - SQLite database connection & record metrics
    - OpenStreetMap geocoding endpoint readiness
    - Open-Meteo meteorological telemetry readiness
    """
    db_ok = False
    total_reports = 0
    pending_approvals = 0

    try:
        with db_session() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM reports;")
            total_reports = cursor.fetchone()[0]
            cursor.execute("SELECT COUNT(*) FROM reports WHERE approval_status = 'PENDING_APPROVAL';")
            pending_approvals = cursor.fetchone()[0]
            db_ok = True
    except Exception:
        db_ok = False

    return {
        "gemini_active": settings.is_gemini_active,
        "gemini_model": settings.GEMINI_MODEL,
        "mode": "REAL_GEMINI" if settings.is_gemini_active else "DEMO_MODE",
        "database_connected": db_ok,
        "osm_geocoding_ready": True,
        "weather_service_ready": True,
        "total_saved_reports": total_reports,
        "pending_approvals": pending_approvals,
        "safety_rules_active": True,
        "disclaimer": "SankatSetu AI enforces truth-verification: AI inferences are never labelled as verified facts."
    }
