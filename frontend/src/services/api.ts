import { AgentExecutionResult, Report, IntegrationStatus, ApprovalStatus } from '../types';

const API_BASE = 'http://127.0.0.1:8000';

export async function analyzeInput(formData: FormData): Promise<AgentExecutionResult> {
  const response = await fetch(`${API_BASE}/api/agent/analyze`, {
    method: 'POST',
    body: formData,
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: 'Analysis failed' }));
    throw new Error(err.detail || 'Analysis request failed');
  }
  return response.json();
}

export async function submitClarification(taskId: string, clarifications: Record<string, string>): Promise<AgentExecutionResult> {
  const response = await fetch(`${API_BASE}/api/agent/clarify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ task_id: taskId, clarifications }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: 'Clarification failed' }));
    throw new Error(err.detail || 'Clarification request failed');
  }
  return response.json();
}

export async function fetchTaskDetails(taskId: string): Promise<any> {
  const response = await fetch(`${API_BASE}/api/agent/tasks/${taskId}`);
  if (!response.ok) throw new Error('Failed to fetch task');
  return response.json();
}

export async function fetchReports(status?: string, category?: string, search?: string): Promise<Report[]> {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  if (category) params.append('category', category);
  if (search) params.append('search', search);

  const response = await fetch(`${API_BASE}/api/reports?${params.toString()}`);
  if (!response.ok) throw new Error('Failed to fetch reports');
  return response.json();
}

export async function fetchReportById(reportId: string): Promise<Report> {
  const response = await fetch(`${API_BASE}/api/reports/${reportId}`);
  if (!response.ok) throw new Error('Report not found');
  return response.json();
}

export async function updateReportStatus(reportId: string, status: ApprovalStatus, notes?: string): Promise<Report> {
  const response = await fetch(`${API_BASE}/api/reports/${reportId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, notes }),
  });
  if (!response.ok) throw new Error('Failed to update status');
  return response.json();
}

export async function approveReportAction(reportId: string, decision: 'APPROVED' | 'REJECTED', notes?: string, operatorName?: string): Promise<Report> {
  const response = await fetch(`${API_BASE}/api/reports/${reportId}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      decision,
      notes: notes || 'Operator authorization confirmed via Dashboard Console',
      operator_name: operatorName || 'Civilian Operations Supervisor'
    }),
  });
  if (!response.ok) throw new Error('Approval action failed');
  return response.json();
}

export async function fetchIntegrationsStatus(): Promise<IntegrationStatus> {
  const response = await fetch(`${API_BASE}/api/integrations/status`);
  if (!response.ok) throw new Error('Failed to fetch integration diagnostics');
  return response.json();
}
