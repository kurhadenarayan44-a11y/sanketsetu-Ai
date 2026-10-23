import shutil
import uuid
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from app.models.schemas import AnalyzeRequest, ClarificationSubmitRequest
from app.agent.orchestrator import orchestrator
from app.config import settings
from app.database import db_session

router = APIRouter(prefix="/api/agent", tags=["agent"])

@router.post("/analyze")
async def analyze_input(
    text: str = Form(..., description="Messy natural language input"),
    location: Optional[str] = Form(None),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    audio_transcript: Optional[str] = Form(None),
    scenario: Optional[str] = Form(None),
    simulate_failure: Optional[bool] = Form(False),
    image: Optional[UploadFile] = File(None)
):
    """
    Main multimodal analysis endpoint.
    Processes text, optional voice transcript, optional image, optional location,
    and runs the 10-stage bounded agent.
    """
    saved_image_path = None
    if image and image.filename:
        # Validate format
        suffix = Path(image.filename).suffix.lower()
        if suffix not in [".jpg", ".jpeg", ".png", ".webp"]:
            raise HTTPException(status_code=400, detail="Invalid image format. Allowed: JPG, PNG, WEBP.")

        # Safe filename
        safe_name = f"{uuid.uuid4().hex[:12]}{suffix}"
        target_path = settings.UPLOAD_DIR / safe_name
        
        with open(target_path, "wb") as buffer:
            shutil.copyfileobj(image.file, buffer)
            
        saved_image_path = str(target_path)

    result = await orchestrator.execute(
        raw_text=text,
        user_location=location,
        latitude=latitude,
        longitude=longitude,
        image_path=saved_image_path,
        audio_transcript=audio_transcript,
        scenario=scenario,
        simulate_failure=bool(simulate_failure)
    )
    return result

@router.post("/clarify")
async def clarify_missing_details(request: ClarificationSubmitRequest):
    """
    Resumes an AWAITING_CLARIFICATION task once user submits missing details.
    """
    try:
        result = await orchestrator.resume_with_clarification(
            task_id=request.task_id,
            clarifications=request.clarifications
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to resume task: {str(e)}")

@router.get("/tasks/{task_id}")
async def get_task_details(task_id: str):
    """
    Retrieves full execution state, subtasks, reports, verifications and tool execution records.
    """
    import json
    with db_session() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM tasks WHERE id = ?", (task_id,))
        task_row = cursor.fetchone()
        if not task_row:
            raise HTTPException(status_code=404, detail=f"Task {task_id} not found.")

        cursor.execute("SELECT * FROM subtasks WHERE task_id = ?", (task_id,))
        subtasks = [dict(r) for r in cursor.fetchall()]

        cursor.execute("SELECT * FROM tool_executions WHERE task_id = ?", (task_id,))
        tools = [dict(r) for r in cursor.fetchall()]

        cursor.execute("SELECT * FROM verifications WHERE task_id = ?", (task_id,))
        verifs = [dict(r) for r in cursor.fetchall()]

        cursor.execute("SELECT * FROM reports WHERE task_id = ?", (task_id,))
        reports = []
        for r in cursor.fetchall():
            reports.append({
                "id": r["id"],
                "task_id": r["task_id"],
                "category": r["category"],
                "severity": r["severity"],
                "title": r["title"],
                "description": r["description"],
                "location_name": r["location_name"],
                "latitude": r["latitude"],
                "longitude": r["longitude"],
                "location_verified": bool(r["location_verified"]),
                "evidence_data": json.loads(r["evidence_data"]) if r["evidence_data"] else [],
                "missing_info": json.loads(r["missing_info"]) if r["missing_info"] else [],
                "recommended_actions": json.loads(r["recommended_actions"]) if r["recommended_actions"] else [],
                "approval_status": r["approval_status"],
                "approved_at": r["approved_at"],
                "approved_by": r["approved_by"],
                "created_at": r["created_at"]
            })

    return {
        "id": task_row["id"],
        "status": task_row["status"],
        "raw_input": task_row["raw_input"],
        "mode": task_row["mode"],
        "missing_information": json.loads(task_row["missing_information"]) if task_row["missing_information"] else [],
        "metadata": json.loads(task_row["metadata"]) if task_row["metadata"] else {},
        "created_at": task_row["created_at"],
        "subtasks": subtasks,
        "tools": tools,
        "verifications": verifs,
        "reports": reports
    }
