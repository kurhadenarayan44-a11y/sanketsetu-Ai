from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from app.models.schemas import ReportStatusUpdateRequest, ReportApprovalRequest, ApprovalStatus
from app.tools.report_tools import list_all_reports, retrieve_report, save_report
from app.database import db_session, log_audit_event

router = APIRouter(prefix="/api/reports", tags=["reports"])

@router.get("")
async def get_reports(
    status: Optional[str] = Query(None, description="Filter by approval status"),
    category: Optional[str] = Query(None, description="Filter by category"),
    search: Optional[str] = Query(None, description="Search keyword")
):
    """Lists all persistent reports with optional filters and keyword search."""
    return list_all_reports(status_filter=status, category_filter=category, search=search)

@router.get("/{report_id}")
async def get_report_by_id(report_id: str):
    """Retrieves a single report by tracking ID."""
    report = retrieve_report(report_id)
    if not report:
        raise HTTPException(status_code=404, detail=f"Report {report_id} not found.")
    return report

@router.patch("/{report_id}/status")
async def update_report_status(report_id: str, payload: ReportStatusUpdateRequest):
    """Updates the status of a report (e.g. DISPATCHED, RESOLVED, REJECTED)."""
    report = retrieve_report(report_id)
    if not report:
        raise HTTPException(status_code=404, detail=f"Report {report_id} not found.")

    now_iso = datetime.now(timezone.utc).isoformat()
    with db_session() as conn:
        conn.execute("""
            UPDATE reports
            SET approval_status = ?, updated_at = ?
            WHERE id = ?
        """, (payload.status.value, now_iso, report_id))

    log_audit_event("report", report_id, "STATUS_UPDATED", {"new_status": payload.status.value, "notes": payload.notes})
    return retrieve_report(report_id)

@router.post("/{report_id}/approve")
async def approve_consequential_action(report_id: str, payload: ReportApprovalRequest):
    """
    Operator / Civilian sign-off checkpoint for consequential external dispatch.
    Moves status from PENDING_APPROVAL to APPROVED or REJECTED.
    """
    report = retrieve_report(report_id)
    if not report:
        raise HTTPException(status_code=404, detail=f"Report {report_id} not found.")

    decision_status = ApprovalStatus.APPROVED if payload.decision.upper() == "APPROVED" else ApprovalStatus.REJECTED
    now_iso = datetime.now(timezone.utc).isoformat()
    operator = payload.operator_name or "Authorized Citizen Operator"

    with db_session() as conn:
        conn.execute("""
            UPDATE reports
            SET approval_status = ?, approved_at = ?, approved_by = ?, updated_at = ?
            WHERE id = ?
        """, (
            decision_status.value,
            now_iso if decision_status == ApprovalStatus.APPROVED else None,
            operator,
            now_iso,
            report_id
        ))

        # Update action_approvals record
        conn.execute("""
            UPDATE action_approvals
            SET decision = ?, decided_at = ?, operator_notes = ?
            WHERE report_id = ?
        """, (decision_status.value, now_iso, payload.notes, report_id))

    log_audit_event("report", report_id, f"ACTION_{decision_status.value}", {
        "operator": operator,
        "notes": payload.notes
    })

    return retrieve_report(report_id)
