import sqlite3
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Generator
from contextlib import contextmanager
from app.config import settings

def get_db_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(settings.DATABASE_PATH, timeout=20.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    conn.execute("PRAGMA journal_mode = WAL;")
    return conn

@contextmanager
def db_session() -> Generator[sqlite3.Connection, None, None]:
    conn = get_db_connection()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

def init_db() -> None:
    """Initialize database tables with full constraints and indexes."""
    with db_session() as conn:
        cursor = conn.cursor()
        
        # 1. Tasks table (top-level agent executions)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS tasks (
                id TEXT PRIMARY KEY,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                raw_input TEXT NOT NULL,
                mode TEXT NOT NULL, -- REAL_GEMINI or DEMO_MODE
                status TEXT NOT NULL, -- UNDERSTAND, PLANNING, EXECUTING, AWAITING_CLARIFICATION, COMPLETED, FAILED
                missing_information TEXT, -- JSON array of missing fields if clarification needed
                metadata TEXT -- JSON object with extra fields (image_path, audio_transcript, etc.)
            );
        """)

        # 2. Subtasks table (decomposed problems & dependencies)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS subtasks (
                id TEXT PRIMARY KEY,
                task_id TEXT NOT NULL,
                title TEXT NOT NULL,
                category TEXT NOT NULL,
                severity TEXT NOT NULL, -- Low, Medium, High, Urgent
                status TEXT NOT NULL, -- PENDING, IN_PROGRESS, COMPLETED, BLOCKED, FAILED
                dependencies TEXT, -- JSON array of subtask IDs
                assigned_tools TEXT, -- JSON array of tool names
                created_at TEXT NOT NULL,
                FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE CASCADE
            );
        """)

        # 3. Issue reports table (structured actionable reports with real tracking IDs)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS reports (
                id TEXT PRIMARY KEY, -- e.g. SST-2026-0814
                task_id TEXT NOT NULL,
                subtask_id TEXT,
                category TEXT NOT NULL,
                severity TEXT NOT NULL,
                title TEXT NOT NULL,
                description TEXT NOT NULL,
                location_name TEXT,
                latitude REAL,
                longitude REAL,
                location_verified INTEGER NOT NULL DEFAULT 0, -- 1=verified, 0=unverified
                evidence_data TEXT, -- JSON array of evidence items
                missing_info TEXT, -- JSON array of still missing info
                recommended_actions TEXT, -- JSON array of action items
                approval_status TEXT NOT NULL DEFAULT 'PENDING_APPROVAL', -- PENDING_APPROVAL, APPROVED, REJECTED, DISPATCHED, RESOLVED
                approved_at TEXT,
                approved_by TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE CASCADE
            );
        """)

        # 4. Tool execution records (real logged tool runs)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS tool_executions (
                id TEXT PRIMARY KEY,
                task_id TEXT NOT NULL,
                tool_name TEXT NOT NULL,
                parameters TEXT NOT NULL, -- JSON
                result TEXT, -- JSON
                error TEXT,
                status TEXT NOT NULL, -- SUCCESS, FAILED, RETRIED, RECOVERED
                started_at TEXT NOT NULL,
                duration_ms INTEGER NOT NULL DEFAULT 0,
                FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE CASCADE
            );
        """)

        # 5. Verification results (truth verification logs)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS verifications (
                id TEXT PRIMARY KEY,
                task_id TEXT NOT NULL,
                item_name TEXT NOT NULL,
                verification_type TEXT NOT NULL, -- USER_PROVIDED, AI_INFERRED, TOOL_VERIFIED, MISSING, FAILED_VERIFICATION
                confidence REAL NOT NULL DEFAULT 1.0,
                details TEXT,
                verified_by_tool TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE CASCADE
            );
        """)

        # 6. Action approval records (for high-consequence civic actions)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS action_approvals (
                id TEXT PRIMARY KEY,
                report_id TEXT NOT NULL,
                action_name TEXT NOT NULL,
                requested_at TEXT NOT NULL,
                decided_at TEXT,
                decision TEXT NOT NULL DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED
                operator_notes TEXT,
                FOREIGN KEY (report_id) REFERENCES reports (id) ON DELETE CASCADE
            );
        """)

        # 7. Status history / Audit logs
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS audit_logs (
                id TEXT PRIMARY KEY,
                entity_type TEXT NOT NULL, -- task, report, tool
                entity_id TEXT NOT NULL,
                action TEXT NOT NULL,
                details TEXT,
                timestamp TEXT NOT NULL
            );
        """)

        # Create indexes for fast lookup
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_subtasks_task ON subtasks (task_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_reports_task ON reports (task_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_reports_approval ON reports (approval_status);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_tool_task ON tool_executions (task_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_verifications_task ON verifications (task_id);")

def log_audit_event(entity_type: str, entity_id: str, action: str, details: dict[str, Any] | str | None = None) -> None:
    """Helper to log audit events into SQLite."""
    import uuid
    log_id = str(uuid.uuid4())
    now_iso = datetime.now(timezone.utc).isoformat()
    details_str = json.dumps(details) if isinstance(details, dict) else (details or "")
    with db_session() as conn:
        conn.execute(
            "INSERT INTO audit_logs (id, entity_type, entity_id, action, details, timestamp) VALUES (?, ?, ?, ?, ?, ?)",
            (log_id, entity_type, entity_id, action, details_str, now_iso)
        )
