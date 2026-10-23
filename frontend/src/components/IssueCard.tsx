import React, { useState } from 'react';
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  MapPin, 
  Shield, 
  Send, 
  FileText,
  Clock,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { Report, SeverityLevel } from '../types';
import { approveReportAction, updateReportStatus } from '../services/api';

interface IssueCardProps {
  report: Report;
  onReportUpdated?: (updated: Report) => void;
}

export const IssueCard: React.FC<IssueCardProps> = ({ report, onReportUpdated }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentReport, setCurrentReport] = useState<Report>(report);

  const getSeverityStyle = (sev: SeverityLevel) => {
    switch (sev) {
      case 'Urgent':
        return 'bg-rose-500/15 text-rose-300 border-rose-500/40 shadow-glow-rose';
      case 'High':
        return 'bg-amber-500/15 text-amber-300 border-amber-500/40 shadow-glow-amber';
      case 'Medium':
        return 'bg-indigo-500/15 text-indigo-300 border-indigo-500/40 shadow-glow-primary';
      case 'Low':
      default:
        return 'bg-slate-500/15 text-slate-300 border-slate-500/40';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">APPROVED</span>;
      case 'DISPATCHED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">DISPATCHED</span>;
      case 'RESOLVED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-slate-500/20 text-slate-300 border border-slate-500/40">RESOLVED</span>;
      case 'REJECTED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-rose-500/20 text-rose-300 border border-rose-500/40">REJECTED</span>;
      case 'PENDING_APPROVAL':
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-amber-500/20 text-amber-300 border border-amber-500/40">PENDING APPROVAL</span>;
    }
  };

  const handleApprove = async () => {
    setIsProcessing(true);
    try {
      const updated = await approveReportAction(currentReport.id, 'APPROVED', 'Authorized citizen operator confirmed dispatch order.');
      setCurrentReport(updated);
      if (onReportUpdated) onReportUpdated(updated);
    } catch (err) {
      console.error('Approval failed:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    setIsProcessing(true);
    try {
      const updated = await approveReportAction(currentReport.id, 'REJECTED', 'Operator cancelled action.');
      setCurrentReport(updated);
      if (onReportUpdated) onReportUpdated(updated);
    } catch (err) {
      console.error('Rejection failed:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDispatch = async () => {
    setIsProcessing(true);
    try {
      const updated = await updateReportStatus(currentReport.id, 'DISPATCHED', 'Field crew deployed to site.');
      setCurrentReport(updated);
      if (onReportUpdated) onReportUpdated(updated);
    } catch (err) {
      console.error('Dispatch update failed:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="rounded-2xl border border-navy-700 bg-navy-850/90 shadow-glass overflow-hidden flex flex-col justify-between hover:border-cyan-accent/40 transition-all duration-200">
      {/* Header */}
      <div className="p-5 border-b border-navy-700/60 bg-gradient-to-r from-navy-850 to-navy-800/80">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-mono font-bold text-cyan-accent tracking-wider">
              {currentReport.id}
            </span>
            <span className="text-slate-600">&middot;</span>
            <span className="text-[11px] font-mono text-indigo-300 uppercase tracking-tight">
              {currentReport.category.replace(/_/g, ' ')}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border ${getSeverityStyle(currentReport.severity)}`}>
              {currentReport.severity.toUpperCase()} PRIORITY
            </span>
            {getStatusBadge(currentReport.approval_status)}
          </div>
        </div>

        <h4 className="text-base font-bold text-slate-50 mt-1">
          {currentReport.title}
        </h4>

        {/* Location line */}
        <div className="flex items-center space-x-1.5 mt-2 text-xs text-slate-300">
          <MapPin className="w-3.5 h-3.5 text-cyan-accent flex-shrink-0" />
          <span className="truncate">
            {currentReport.location_name || 'Location unverified'}
          </span>
          {currentReport.location_verified ? (
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
              Verified Map Pin
            </span>
          ) : (
            <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20">
              Awaiting Map Fix
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-5 space-y-4 text-xs">
        {/* Description */}
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
            Citizen Observation Statement
          </span>
          <p className="text-slate-200 leading-relaxed bg-navy-900/60 p-3 rounded-lg border border-navy-800">
            "{currentReport.description}"
          </p>
        </div>

        {/* Supporting Evidence */}
        {currentReport.evidence_data && currentReport.evidence_data.length > 0 && (
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">
              Verified Supporting Evidence & Telemetry
            </span>
            <ul className="space-y-1">
              {currentReport.evidence_data.map((ev, idx) => (
                <li key={idx} className="flex items-start space-x-2 text-slate-300 font-sans text-[11px]">
                  <span className="text-cyan-accent mt-0.5">&bull;</span>
                  <span>{ev}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Recommended Actions */}
        {currentReport.recommended_actions && currentReport.recommended_actions.length > 0 && (
          <div className="p-3 rounded-xl border border-indigo-500/30 bg-indigo-500/5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-300 block mb-1">
              Multi-Agency Action Plan
            </span>
            <ul className="space-y-1">
              {currentReport.recommended_actions.map((act, idx) => (
                <li key={idx} className="flex items-start space-x-1.5 text-slate-200 text-[11px]">
                  <ChevronRight className="w-3.5 h-3.5 text-cyan-accent flex-shrink-0 mt-0.5" />
                  <span>{act}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Missing information warning */}
        {currentReport.missing_info && currentReport.missing_info.length > 0 && (
          <div className="p-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-300 text-[11px]">
            <span className="font-semibold">Notice: </span>
            {currentReport.missing_info.join(', ')}
          </div>
        )}
      </div>

      {/* Consequential Action Approval Controls */}
      <div className="p-4 bg-navy-900/90 border-t border-navy-800 flex items-center justify-between gap-2">
        <div className="text-[11px] font-mono text-slate-400">
          {currentReport.approved_at ? (
            <span className="text-emerald-400 flex items-center space-x-1">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Signed by {currentReport.approved_by || 'Operator'}</span>
            </span>
          ) : (
            <span className="text-amber-400 flex items-center space-x-1">
              <Clock className="w-3.5 h-3.5" />
              <span>Consequential Action Gate Active</span>
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {currentReport.approval_status === 'PENDING_APPROVAL' && (
            <>
              <button
                onClick={handleReject}
                disabled={isProcessing}
                className="px-3 py-1.5 rounded-lg border border-navy-700 hover:border-rose-500/40 text-slate-400 hover:text-rose-300 text-xs font-medium transition-colors"
              >
                Reject
              </button>
              <button
                onClick={handleApprove}
                disabled={isProcessing}
                className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-navy-950 font-bold text-xs transition-colors shadow-glow-emerald"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Approve Action</span>
              </button>
            </>
          )}

          {currentReport.approval_status === 'APPROVED' && (
            <button
              onClick={handleDispatch}
              disabled={isProcessing}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-navy-950 font-bold text-xs transition-colors shadow-glow-cyan"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Mark Dispatched</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
