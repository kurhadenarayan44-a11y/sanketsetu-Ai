import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Clock, 
  Terminal, 
  AlertTriangle, 
  ShieldCheck, 
  Layers, 
  Wrench,
  Search,
  Check,
  AlertOctagon,
  ArrowRight,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { AgentExecutionResult, VerificationType } from '../types';

interface ExecutionConsoleProps {
  result: AgentExecutionResult | null;
  isLoading: boolean;
}

const STAGES = [
  'UNDERSTAND',
  'DECOMPOSE',
  'PLAN',
  'VALIDATE',
  'SELECT_TOOLS',
  'EXECUTE',
  'VERIFY',
  'RECOVER_IF_NEEDED',
  'REQUEST_APPROVAL',
  'PRESENT_RESULTS'
];

export const ExecutionConsole: React.FC<ExecutionConsoleProps> = ({ result, isLoading }) => {
  const [activeTab, setActiveTab] = useState<'trace' | 'tools' | 'verifications' | 'subtasks'>('trace');
  const [expandedTools, setExpandedTools] = useState<Record<string, boolean>>({});

  const toggleToolExpand = (id: string) => {
    setExpandedTools(prev => ({ ...prev, [id]: !prev[id] }));
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 rounded-2xl border border-navy-700 bg-navy-850/60 text-center">
        <div className="relative flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 mb-4">
          <Layers className="w-8 h-8 text-cyan-accent animate-pulse" />
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-cyan-accent rounded-full radar-dot" />
        </div>
        <h3 className="text-lg font-bold text-slate-100">
          Agent Executing Bounded Workflow...
        </h3>
        <p className="text-xs text-slate-400 max-w-md mt-2 font-mono">
          Decomposing intent &middot; Resolving OpenStreetMap coordinates &middot; Querying live telemetry &middot; Verifying claims
        </p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center p-16 rounded-2xl border border-navy-800 bg-navy-900/40 text-center">
        <Terminal className="w-12 h-12 text-slate-600 mb-3" />
        <h4 className="text-sm font-semibold text-slate-300">Execution Console Idle</h4>
        <p className="text-xs text-slate-500 mt-1 max-w-sm">
          Submit an incident report or launch one of the 3 verification scenarios in the Agent Workspace to inspect the live execution trace.
        </p>
      </div>
    );
  }

  const getVerificationBadge = (type: VerificationType) => {
    switch (type) {
      case 'TOOL_VERIFIED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">TOOL VERIFIED</span>;
      case 'USER_PROVIDED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">USER PROVIDED</span>;
      case 'AI_INFERRED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">AI INFERRED</span>;
      case 'MISSING':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-amber-500/15 text-amber-300 border border-amber-500/30">MISSING INFO</span>;
      case 'FAILED_VERIFICATION':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-rose-500/15 text-rose-300 border border-rose-500/30">FAILED VERIFICATION</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Recovery Banner if engaged */}
      {result.recovery_engaged && (
        <div className="p-4 rounded-xl border border-rose-500/40 bg-rose-500/10 shadow-glow-rose flex items-start space-x-3">
          <AlertOctagon className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs">
            <span className="font-bold text-rose-300 uppercase tracking-wider block font-mono">
              Transparent Tool Failure Detected &mdash; Automatic Recovery Engaged
            </span>
            <p className="text-slate-300 mt-1 leading-relaxed">
              {result.recovery_message}
            </p>
          </div>
        </div>
      )}

      {/* 10-Stage Visual Timeline */}
      <div className="p-5 rounded-xl border border-navy-700 bg-navy-850/80 shadow-glass">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Agent Orchestration Sequence (Bounded 10-Stage Pipeline)
            </span>
          </div>
          <span className="text-[11px] font-mono text-cyan-accent">
            Task ID: {result.task_id}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2">
          {STAGES.map((st, idx) => {
            const isCompleted = true; // Completed in finalized results
            const isAwaitingClarification = result.status === 'AWAITING_CLARIFICATION' && idx >= 3;
            return (
              <div
                key={st}
                className={`flex flex-col items-center p-2 rounded-lg border text-center transition-all ${
                  isAwaitingClarification
                    ? 'border-amber-500/40 bg-amber-500/5 text-amber-300 opacity-60'
                    : 'border-cyan-accent/30 bg-navy-900/80 text-cyan-accent shadow-sm'
                }`}
              >
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold mb-1 bg-navy-800 border border-cyan-accent/40">
                  {idx + 1}
                </div>
                <span className="text-[10px] font-mono uppercase tracking-tight text-slate-200">
                  {st.replace(/_/g, ' ')}
                </span>
                <span className="text-[9px] text-slate-400 mt-0.5">
                  {isAwaitingClarification ? 'Paused' : 'Verified'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Console Sub-navigation Tabs */}
      <div className="flex border-b border-navy-700/80 space-x-4">
        {[
          { id: 'trace', label: `Execution Trace (${result.execution_trace?.length || 0})` },
          { id: 'tools', label: `Tool Executions (${result.tool_executions?.length || 0})` },
          { id: 'verifications', label: `Truth Verifications (${result.verifications?.length || 0})` },
          { id: 'subtasks', label: `Decomposed Subtasks (${result.subtasks?.length || 0})` },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            className={`pb-3 text-xs font-medium border-b-2 transition-all ${
              activeTab === t.id
                ? 'border-cyan-accent text-cyan-accent'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Trace */}
      {activeTab === 'trace' && (
        <div className="space-y-2.5">
          {result.execution_trace?.map((step, idx) => (
            <div
              key={idx}
              className="flex items-start space-x-3 p-3 rounded-lg border border-navy-700/60 bg-navy-850/60 font-mono text-xs"
            >
              <div className="mt-0.5 text-cyan-accent">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-200 tracking-wide">
                    [{step.stage}]
                  </span>
                  <span className="text-[11px] text-slate-400 flex items-center space-x-1">
                    <Clock className="w-3 h-3 text-slate-500" />
                    <span>{step.duration_ms}ms</span>
                  </span>
                </div>
                <p className="text-slate-300 mt-1 font-sans text-xs">
                  {step.message}
                </p>
                {step.engine && (
                  <div className="text-[11px] text-indigo-300 mt-1">
                    Engine: {step.engine}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 2: Tools */}
      {activeTab === 'tools' && (
        <div className="space-y-3">
          {result.tool_executions?.map(tool => {
            const isExp = expandedTools[tool.id];
            const isSuccess = tool.status === 'SUCCESS';
            const isRecovered = tool.status === 'RECOVERED';
            return (
              <div
                key={tool.id}
                className="rounded-xl border border-navy-700 bg-navy-850/80 overflow-hidden"
              >
                <div
                  className="flex items-center justify-between p-3.5 cursor-pointer hover:bg-navy-800 transition-colors"
                  onClick={() => toggleToolExpand(tool.id)}
                >
                  <div className="flex items-center space-x-3">
                    <Wrench className="w-4 h-4 text-cyan-accent" />
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-xs font-semibold text-slate-100">
                          {tool.tool_name}()
                        </span>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                          isSuccess
                            ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                            : isRecovered
                            ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                            : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                        }`}>
                          {tool.status}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        Execution: {tool.duration_ms}ms
                      </span>
                    </div>
                  </div>
                  {isExp ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                </div>

                {isExp && (
                  <div className="p-4 border-t border-navy-700/60 bg-navy-900/90 text-xs font-mono space-y-3">
                    <div>
                      <span className="text-[11px] text-slate-400 uppercase tracking-wider block mb-1">
                        Parameters:
                      </span>
                      <pre className="p-2.5 rounded bg-navy-950 border border-navy-800 text-slate-300 overflow-x-auto">
                        {JSON.stringify(tool.parameters, null, 2)}
                      </pre>
                    </div>

                    {tool.result && (
                      <div>
                        <span className="text-[11px] text-slate-400 uppercase tracking-wider block mb-1">
                          Result Payload:
                        </span>
                        <pre className="p-2.5 rounded bg-navy-950 border border-navy-800 text-slate-300 overflow-x-auto">
                          {JSON.stringify(tool.result, null, 2)}
                        </pre>
                      </div>
                    )}

                    {tool.error && (
                      <div>
                        <span className="text-[11px] text-rose-400 uppercase tracking-wider block mb-1">
                          Reported Error:
                        </span>
                        <div className="p-2.5 rounded bg-rose-500/10 border border-rose-500/30 text-rose-300">
                          {tool.error}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Tab 3: Verifications */}
      {activeTab === 'verifications' && (
        <div className="space-y-2.5">
          <div className="p-3 rounded-lg border border-navy-700 bg-navy-850/60 text-xs text-slate-400 mb-3">
            <span className="font-semibold text-slate-200">Truth Verification Protocol: </span>
            SankatSetu AI systematically audits all claims. AI inferences are never labelled as verified facts without independent ground truth tools.
          </div>

          {result.verifications?.map(v => (
            <div
              key={v.id}
              className="flex items-start justify-between p-3.5 rounded-xl border border-navy-700/70 bg-navy-850/70"
            >
              <div>
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-xs font-semibold text-slate-200">
                    {v.item_name}
                  </span>
                  {getVerificationBadge(v.verification_type)}
                </div>
                <p className="text-xs text-slate-400 leading-relaxed font-sans">
                  {v.details}
                </p>
                {v.verified_by_tool && (
                  <span className="text-[10px] text-cyan-accent/80 font-mono block mt-1">
                    Verified via Tool: {v.verified_by_tool}()
                  </span>
                )}
              </div>

              <div className="text-right flex-shrink-0 ml-4">
                <span className="text-[10px] font-mono text-slate-500 block">Confidence</span>
                <span className="text-xs font-mono font-bold text-slate-200">
                  {(v.confidence * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 4: Subtasks */}
      {activeTab === 'subtasks' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {result.subtasks?.map(sub => (
            <div
              key={sub.id}
              className="p-4 rounded-xl border border-navy-700 bg-navy-850/80 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
                    {sub.category.replace(/_/g, ' ').toUpperCase()}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-navy-800 text-slate-300">
                    Severity: {sub.severity}
                  </span>
                </div>
                <h5 className="text-sm font-semibold text-slate-100">
                  {sub.title}
                </h5>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  "{sub.raw_clause}"
                </p>
              </div>

              <div className="mt-4 pt-2.5 border-t border-navy-700/60 flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span>Status: <span className="text-emerald-accent">{sub.status}</span></span>
                <span className="text-cyan-accent">Subtask ID: {sub.id}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
