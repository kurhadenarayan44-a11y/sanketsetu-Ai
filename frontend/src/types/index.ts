export type SeverityLevel = 'Low' | 'Medium' | 'High' | 'Urgent';

export type VerificationType = 
  | 'USER_PROVIDED' 
  | 'AI_INFERRED' 
  | 'TOOL_VERIFIED' 
  | 'MISSING' 
  | 'FAILED_VERIFICATION';

export type ApprovalStatus = 
  | 'PENDING_APPROVAL' 
  | 'APPROVED' 
  | 'REJECTED' 
  | 'DISPATCHED' 
  | 'RESOLVED';

export type TaskStage = 
  | 'UNDERSTAND'
  | 'DECOMPOSE'
  | 'PLAN'
  | 'VALIDATE'
  | 'SELECT_TOOLS'
  | 'EXECUTE'
  | 'VERIFY'
  | 'RECOVER_IF_NEEDED'
  | 'REQUEST_APPROVAL'
  | 'PRESENT_RESULTS'
  | 'AWAITING_CLARIFICATION'
  | 'COMPLETED'
  | 'FAILED';

export interface Subtask {
  id: string;
  task_id: string;
  title: string;
  category: string;
  severity: SeverityLevel;
  status: string;
  raw_clause?: string;
  is_submerged?: boolean;
  severity_reason?: string;
  dependencies?: string[];
  assigned_tools?: string[];
  created_at?: string;
}

export interface ToolExecution {
  id: string;
  task_id: string;
  tool_name: string;
  parameters: Record<string, any>;
  result?: Record<string, any> | null;
  error?: string | null;
  status: 'SUCCESS' | 'FAILED' | 'RETRIED' | 'RECOVERED';
  started_at: string;
  duration_ms: number;
}

export interface VerificationItem {
  id: string;
  task_id?: string;
  item_name: string;
  verification_type: VerificationType;
  confidence: number;
  details: string;
  verified_by_tool?: string | null;
  created_at?: string;
}

export interface ActionPlanItem {
  subtask_id: string;
  issue_title: string;
  category: string;
  severity: SeverityLevel;
  target_agency: string;
  recommended_sop: string;
  requires_user_approval: boolean;
  dependencies: string[];
  dispatch_readiness: string;
}

export interface ActionPlan {
  total_actions: number;
  has_urgent_danger: boolean;
  immediate_safety_advisories: string[];
  location_summary: string;
  actions: ActionPlanItem[];
  execution_strategy: string;
}

export interface Report {
  id: string;
  task_id: string;
  subtask_id?: string | null;
  category: string;
  severity: SeverityLevel;
  title: string;
  description: string;
  location_name?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  location_verified: boolean;
  evidence_data: string[];
  missing_info: string[];
  recommended_actions: string[];
  approval_status: ApprovalStatus;
  approved_at?: string | null;
  approved_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TraceStep {
  stage: string;
  status: string;
  message: string;
  duration_ms: number;
  [key: string]: any;
}

export interface AgentExecutionResult {
  task_id: string;
  status: string;
  current_stage: string;
  mode: 'REAL_GEMINI' | 'DEMO_MODE';
  clarification_prompt?: string | null;
  missing_information?: string[];
  recovery_engaged?: boolean;
  recovery_message?: string | null;
  subtasks: Subtask[];
  action_plan?: ActionPlan;
  reports: Report[];
  execution_trace: TraceStep[];
  verifications: VerificationItem[];
  tool_executions: ToolExecution[];
}

export interface IntegrationStatus {
  gemini_active: boolean;
  gemini_model: string;
  mode: string;
  database_connected: boolean;
  osm_geocoding_ready: boolean;
  weather_service_ready: boolean;
  total_saved_reports: number;
  pending_approvals: number;
  safety_rules_active: boolean;
  disclaimer: string;
}
