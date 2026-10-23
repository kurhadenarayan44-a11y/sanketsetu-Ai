import React from 'react';
import { 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle, 
  Layers, 
  ArrowRight, 
  FileText,
  Activity,
  Printer
} from 'lucide-react';
import { AgentExecutionResult, Report } from '../types';
import { IssueCard } from '../components/IssueCard';

interface ResultsPageProps {
  result: AgentExecutionResult | null;
  onNavigateToHistory: () => void;
  onNavigateToWorkspace: () => void;
  onReportUpdated?: (updated: Report) => void;
}

export const ResultsPage: React.FC<ResultsPageProps> = ({
  result,
  onNavigateToHistory,
  onNavigateToWorkspace,
  onReportUpdated
}) => {
  if (!result || !result.reports || result.reports.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-16 rounded-2xl border border-navy-800 bg-navy-900/40 text-center max-w-2xl mx-auto my-12">
        <ShieldAlert className="w-12 h-12 text-slate-600 mb-3" />
        <h4 className="text-base font-semibold text-slate-200">No Action Plans Generated Yet</h4>
        <p className="text-xs text-slate-400 mt-1 max-w-md">
          Execute an incident decomposition in the Agent Workspace to review structured issue cards, verified telemetry, and consequential approval actions.
        </p>
        <button
          onClick={onNavigateToWorkspace}
          className="mt-6 flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all shadow-glow-primary"
        >
          <span>Open Agent Workspace</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  const reports = result.reports;
  const urgentCount = reports.filter(r => r.severity === 'Urgent').length;
  const highCount = reports.filter(r => r.severity === 'High').length;
  const pendingApprovals = reports.filter(r => r.approval_status === 'PENDING_APPROVAL').length;

  return (
    <div className="space-y-8 max-w-6xl mx-auto py-4">
      {/* Overview Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border border-navy-700 bg-navy-850/90 shadow-glass">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-mono font-bold text-cyan-accent uppercase tracking-wider">
              Task Reference: {result.task_id}
            </span>
            <span className="text-slate-600">&middot;</span>
            <span className="text-xs font-mono text-emerald-400">
              {reports.length} Distinct Issues Identified
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-50 mt-1">
            Verified Action & Multi-Agency Dispatch Dashboard
          </h2>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => window.print()}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-lg border border-navy-700 bg-navy-800 text-slate-300 hover:text-slate-100 text-xs font-medium transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Orders</span>
          </button>
          <button
            onClick={onNavigateToHistory}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all shadow-glow-primary"
          >
            <span>View Persistent Archive</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Immediate Life Safety Advisory Banner */}
      {result.action_plan?.immediate_safety_advisories && result.action_plan.immediate_safety_advisories.length > 0 && (
        <div className="p-4 rounded-xl border border-rose-500/40 bg-rose-500/10 shadow-glow-rose space-y-2">
          <div className="flex items-center space-x-2 text-rose-300 text-xs font-bold font-mono uppercase tracking-wider">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <span>Emergency Life-Safety Advisories Active</span>
          </div>
          <ul className="space-y-1 text-xs text-slate-200">
            {result.action_plan.immediate_safety_advisories.map((adv, idx) => (
              <li key={idx} className="flex items-start space-x-2">
                <span className="text-rose-400 font-bold">&bull;</span>
                <span>{adv}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Metrics Counter */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl border border-navy-700 bg-navy-850/60">
          <span className="text-[10px] font-mono text-slate-400 uppercase block">Total Issues</span>
          <span className="text-2xl font-mono font-bold text-slate-100">{reports.length}</span>
        </div>
        <div className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/5">
          <span className="text-[10px] font-mono text-rose-400 uppercase block">Urgent Perils</span>
          <span className="text-2xl font-mono font-bold text-rose-300">{urgentCount}</span>
        </div>
        <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/5">
          <span className="text-[10px] font-mono text-amber-400 uppercase block">High Priority</span>
          <span className="text-2xl font-mono font-bold text-amber-300">{highCount}</span>
        </div>
        <div className="p-3.5 rounded-xl border border-cyan-accent/30 bg-cyan-accent/5">
          <span className="text-[10px] font-mono text-cyan-accent uppercase block">Pending Sign-off</span>
          <span className="text-2xl font-mono font-bold text-cyan-accent">{pendingApprovals}</span>
        </div>
      </div>

      {/* Multi-Agency Action Plan Summary */}
      {result.action_plan && (
        <div className="p-5 rounded-2xl border border-indigo-500/30 bg-navy-850/70 shadow-glass">
          <h3 className="text-xs font-bold text-indigo-300 uppercase tracking-wider mb-2 flex items-center space-x-2">
            <Layers className="w-4 h-4 text-indigo-400" />
            <span>Multi-Agency Routing & Dispatch Strategy</span>
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            Strategy: <span className="font-mono text-cyan-accent">{result.action_plan.execution_strategy}</span> &middot; Target Location: <span className="text-slate-100">{result.action_plan.location_summary}</span>
          </p>
        </div>
      )}

      {/* Separate Issue Cards Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
            Decomposed Incident Work Orders ({reports.length})
          </h3>
          <span className="text-[11px] text-slate-400 font-mono">
            Consequential human sign-off required for civic action
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {reports.map((report) => (
            <IssueCard
              key={report.id}
              report={report}
              onReportUpdated={onReportUpdated}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
