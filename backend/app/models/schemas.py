from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from enum import Enum

class SeverityLevel(str, Enum):
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"
    URGENT = "Urgent"

class VerificationType(str, Enum):
    USER_PROVIDED = "USER_PROVIDED"
    AI_INFERRED = "AI_INFERRED"
    TOOL_VERIFIED = "TOOL_VERIFIED"
    MISSING = "MISSING"
    FAILED_VERIFICATION = "FAILED_VERIFICATION"

class ApprovalStatus(str, Enum):
    PENDING_APPROVAL = "PENDING_APPROVAL"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    DISPATCHED = "DISPATCHED"
    RESOLVED = "RESOLVED"

class TaskWorkflowStage(str, Enum):
    UNDERSTAND = "UNDERSTAND"
    DECOMPOSE = "DECOMPOSE"
    PLAN = "PLAN"
    VALIDATE = "VALIDATE"
    SELECT_TOOLS = "SELECT_TOOLS"
    EXECUTE = "EXECUTE"
    VERIFY = "VERIFY"
    RECOVER_IF_NEEDED = "RECOVER_IF_NEEDED"
    REQUEST_APPROVAL = "REQUEST_APPROVAL"
    PRESENT_RESULTS = "PRESENT_RESULTS"
    AWAITING_CLARIFICATION = "AWAITING_CLARIFICATION"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"

# Request Schemas
class AnalyzeRequest(BaseModel):
    text: str = Field(..., description="Messy natural language input from the user")
    location: Optional[str] = Field(None, description="Optional user-supplied landmark, street or city")
    latitude: Optional[float] = Field(None, description="Optional GPS latitude")
    longitude: Optional[float] = Field(None, description="Optional GPS longitude")
    audio_transcript: Optional[str] = Field(None, description="Optional transcript from browser speech recognition")
    scenario: Optional[str] = Field(None, description="Pre-configured scenario key (e.g. scenario_1, scenario_2, scenario_3)")
    simulate_failure: Optional[bool] = Field(False, description="Controlled tool failure flag for scenario 3 testing")

class ClarificationSubmitRequest(BaseModel):
    task_id: str
    clarifications: Dict[str, str] = Field(..., description="Key-value mapping of clarified missing fields (e.g. {'location': 'MG Road Metro Station'})")

class ReportStatusUpdateRequest(BaseModel):
    status: ApprovalStatus
    notes: Optional[str] = None

class ReportApprovalRequest(BaseModel):
    decision: str = Field(..., description="'APPROVED' or 'REJECTED'")
    operator_name: Optional[str] = "Civilian Ops Supervisor"
    notes: Optional[str] = None

# Component models
class SubtaskModel(BaseModel):
    id: str
    task_id: str
    title: str
    category: str
    severity: SeverityLevel
    status: str
    dependencies: List[str] = []
    assigned_tools: List[str] = []
    created_at: str

class ToolExecutionModel(BaseModel):
    id: str
    task_id: str
    tool_name: str
    parameters: Dict[str, Any]
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    status: str # SUCCESS, FAILED, RETRIED, RECOVERED
    started_at: str
    duration_ms: int

class VerificationItem(BaseModel):
    id: str
    task_id: str
    item_name: str
    verification_type: VerificationType
    confidence: float
    details: str
    verified_by_tool: Optional[str] = None
    created_at: str

class ReportModel(BaseModel):
    id: str
    task_id: str
    subtask_id: Optional[str] = None
    category: str
    severity: SeverityLevel
    title: str
    description: str
    location_name: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_verified: bool
    evidence_data: List[str] = []
    missing_info: List[str] = []
    recommended_actions: List[str] = []
    approval_status: ApprovalStatus
    approved_at: Optional[str] = None
    approved_by: Optional[str] = None
    created_at: str
    updated_at: str

class TaskDetailResponse(BaseModel):
    id: str
    created_at: str
    updated_at: str
    raw_input: str
    mode: str
    status: str
    current_stage: TaskWorkflowStage
    missing_information: List[str] = []
    metadata: Dict[str, Any] = {}
    subtasks: List[SubtaskModel] = []
    reports: List[ReportModel] = []
    tool_executions: List[ToolExecutionModel] = []
    verifications: List[VerificationItem] = []
    execution_trace: List[Dict[str, Any]] = []

class IntegrationStatus(BaseModel):
    gemini_active: bool
    gemini_model: str
    mode: str # REAL_GEMINI or DEMO_MODE
    database_connected: bool
    osm_geocoding_ready: bool
    weather_service_ready: bool
    total_saved_reports: int
    pending_approvals: int
