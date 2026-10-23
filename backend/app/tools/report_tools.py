import json
import random
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from app.database import db_session, log_audit_event
from app.models.schemas import ApprovalStatus, SeverityLevel

def generate_tracking_id() -> str:
    """Generates authentic sequential-style tracking IDs like SST-2026-4821."""
    suffix = random.randint(1000, 9999)
    return f"SST-2026-{suffix}"

def prepare_submission_preview(
    category: str,
    title: str,
    description: str,
    severity: str,
    location_data: Dict[str, Any],
    verifications: List[Dict[str, Any]],
    recommended_actions: List[str]
) -> Dict[str, Any]:
    """
    Creates a pre-dispatch submission preview allowing human inspection before
    any database commitment or civic dispatch.
    """
    return {
        "preview_id": f"PREV-{random.randint(100, 999)}",
        "category": category,
        "title": title,
        "description": description,
        "severity": severity,
        "location": {
            "name": location_data.get("display_name"),
            "latitude": location_data.get("latitude"),
            "longitude": location_data.get("longitude"),
            "verified": location_data.get("verified", False)
        },
        "verification_summary": {
            "total_items": len(verifications),
            "tool_verified_count": sum(1 for v in verifications if v.get("verification_type") == "TOOL_VERIFIED"),
            "user_provided_count": sum(1 for v in verifications if v.get("verification_type") == "USER_PROVIDED"),
            "ai_inferred_count": sum(1 for v in verifications if v.get("verification_type") == "AI_INFERRED"),
            "missing_count": sum(1 for v in verifications if v.get("verification_type") == "MISSING")
        },
        "recommended_actions": recommended_actions,
        "status": "AWAITING_USER_APPROVAL"
    }

def save_report(
    task_id: str,
    subtask_id: Optional[str],
    category: str,
    severity: str,
    title: str,
    description: str,
    location_name: Optional[str],
    latitude: Optional[float],
    longitude: Optional[float],
    location_verified: bool,
    evidence_data: List[str],
    missing_info: List[str],
    recommended_actions: List[str]
) -> Dict[str, Any]:
    """
    Persists an issue report record to SQLite with an authentic tracking ID.
    Enforces that reports start in 'PENDING_APPROVAL' state.
    """
    report_id = generate_tracking_id()
    now_iso = datetime.now(timezone.utc).isoformat()

    with db_session() as conn:
        cursor = conn.cursor()
        
        # Ensure parent task exists (creates stub task if called independently)
        cursor.execute("SELECT id FROM tasks WHERE id = ?", (task_id,))
        if not cursor.fetchone():
            cursor.execute("""
                INSERT INTO tasks (id, created_at, updated_at, raw_input, mode, status, missing_information, metadata)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                task_id, now_iso, now_iso, title, "DEMO_MODE", "COMPLETED", "[]", "{}"
            ))

        # Ensure unique report ID
        while True:
            cursor.execute("SELECT id FROM reports WHERE id = ?", (report_id,))
            if not cursor.fetchone():
                break
            report_id = generate_tracking_id()

        cursor.execute("""
            INSERT INTO reports (
                id, task_id, subtask_id, category, severity, title, description,
                location_name, latitude, longitude, location_verified,
                evidence_data, missing_info, recommended_actions,
                approval_status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            report_id,
            task_id,
            subtask_id,
            category,
            severity,
            title,
            description,
            location_name,
            latitude,
            longitude,
            1 if location_verified else 0,
            json.dumps(evidence_data),
            json.dumps(missing_info),
            json.dumps(recommended_actions),
            ApprovalStatus.PENDING_APPROVAL.value,
            now_iso,
            now_iso
        ))

        # Also create initial pending action approval record
        cursor.execute("""
            INSERT INTO action_approvals (
                id, report_id, action_name, requested_at, decision
            ) VALUES (?, ?, ?, ?, ?)
        """, (
            f"ACT-{report_id}",
            report_id,
            "Official Civic Dispatch & Field Work Order",
            now_iso,
            "PENDING"
        ))

    log_audit_event("report", report_id, "CREATED", {"title": title, "severity": severity, "category": category})

    return retrieve_report(report_id)

def retrieve_report(report_id: str) -> Optional[Dict[str, Any]]:
    """Fetches a full report record from SQLite."""
    with db_session() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM reports WHERE id = ?", (report_id,))
        row = cursor.fetchone()
        if not row:
            return None

        return {
            "id": row["id"],
            "task_id": row["task_id"],
            "subtask_id": row["subtask_id"],
            "category": row["category"],
            "severity": row["severity"],
            "title": row["title"],
            "description": row["description"],
            "location_name": row["location_name"],
            "latitude": row["latitude"],
            "longitude": row["longitude"],
            "location_verified": bool(row["location_verified"]),
            "evidence_data": json.loads(row["evidence_data"]) if row["evidence_data"] else [],
            "missing_info": json.loads(row["missing_info"]) if row["missing_info"] else [],
            "recommended_actions": json.loads(row["recommended_actions"]) if row["recommended_actions"] else [],
            "approval_status": row["approval_status"],
            "approved_at": row["approved_at"],
            "approved_by": row["approved_by"],
            "created_at": row["created_at"],
            "updated_at": row["updated_at"]
        }

def list_all_reports(
    status_filter: Optional[str] = None,
    category_filter: Optional[str] = None,
    search: Optional[str] = None
) -> List[Dict[str, Any]]:
    """Queries persistent reports with flexible search and filtering."""
    query = "SELECT * FROM reports WHERE 1=1"
    params = []

    if status_filter:
        query += " AND approval_status = ?"
        params.append(status_filter)

    if category_filter:
        query += " AND category = ?"
        params.append(category_filter)

    if search:
        query += " AND (title LIKE ? OR description LIKE ? OR location_name LIKE ? OR id LIKE ?)"
        term = f"%{search}%"
        params.extend([term, term, term, term])

    query += " ORDER BY created_at DESC"

    with db_session() as conn:
        cursor = conn.cursor()
        cursor.execute(query, params)
        rows = cursor.fetchall()
        
        results = []
        for r in rows:
            results.append({
                "id": r["id"],
                "task_id": r["task_id"],
                "subtask_id": r["subtask_id"],
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
                "created_at": r["created_at"],
                "updated_at": r["updated_at"]
            })
        return results
