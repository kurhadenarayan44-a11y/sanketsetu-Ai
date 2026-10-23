import React, { useEffect, useState } from 'react';
import { 
  History, 
  Search, 
  Filter, 
  MapPin, 
  Calendar, 
  RefreshCw, 
  ShieldCheck, 
  Eye, 
  CheckCircle,
  Send,
  X
} from 'lucide-react';
import { Report, ApprovalStatus } from '../types';
import { fetchReports, updateReportStatus, approveReportAction } from '../services/api';

export const HistoryPage: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [activeReport, setActiveReport] = useState<Report | null>(null);

  const loadReports = async () => {
    setIsLoading(true);
    try {
      const data = await fetchReports(selectedStatus || undefined, selectedCategory || undefined, searchTerm || undefined);
      setReports(data);
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [selectedStatus, selectedCategory]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadReports();
  };

  const handleQuickStatusChange = async (reportId: string, newStatus: ApprovalStatus) => {
    try {
      const updated = await updateReportStatus(reportId, newStatus);
      setReports(prev => prev.map(r => r.id === reportId ? updated : r));
      if (activeReport?.id === reportId) setActiveReport(updated);
    } catch (err) {
      console.error('Status update failed:', err);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto py-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border border-navy-700 bg-navy-850/90 shadow-glass">
        <div>
          <div className="flex items-center space-x-2">
            <History className="w-4 h-4 text-cyan-accent" />
            <span className="text-xs font-mono font-bold text-cyan-accent uppercase tracking-wider">
              Persistent SQLite Archive
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-50 mt-1">
            Civilian Incident Reports & Operational Audit Log
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            All records persist across server restarts with verifiable tracking IDs.
          </p>
        </div>

        <button
          onClick={loadReports}
          disabled={isLoading}
          className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-navy-800 hover:bg-navy-750 border border-navy-700 text-slate-200 text-xs font-medium transition-colors self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl border border-navy-700 bg-navy-850/60 flex flex-col md:flex-row gap-3">
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by Tracking ID (SST-2026-...), title, or location..."
            className="w-full bg-navy-900 border border-navy-700 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-accent"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </form>

        <div className="flex items-center space-x-2">
          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-navy-900 border border-navy-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-accent font-mono"
          >
            <option value="">All Statuses</option>
            <option value="PENDING_APPROVAL">Pending Approval</option>
            <option value="APPROVED">Approved</option>
            <option value="DISPATCHED">Dispatched</option>
            <option value="RESOLVED">Resolved</option>
            <option value="REJECTED">Rejected</option>
          </select>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-navy-900 border border-navy-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-accent font-mono"
          >
            <option value="">All Categories</option>
            <option value="waterlogging">Waterlogging</option>
            <option value="road_damage">Road Damage</option>
            <option value="traffic_obstruction">Traffic Obstruction</option>
            <option value="electrical_hazard">Electrical Hazard</option>
            <option value="structural_danger">Structural Danger</option>
            <option value="fire_hazard">Fire Hazard</option>
          </select>
        </div>
      </div>

      {/* Reports Table */}
      <div className="rounded-2xl border border-navy-700 bg-navy-850/80 shadow-glass overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-400 font-mono">
            Loading persistent records from SQLite...
          </div>
        ) : reports.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            No incident reports found matching the specified criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-navy-700 bg-navy-900/60 font-mono text-[11px] text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Tracking ID</th>
                  <th className="py-3 px-4">Category & Severity</th>
                  <th className="py-3 px-4">Incident Title</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-750">
                {reports.map((rep) => (
                  <tr key={rep.id} className="hover:bg-navy-800/50 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-cyan-accent whitespace-nowrap">
                      {rep.id}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center space-x-1.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                          rep.severity === 'Urgent' ? 'bg-rose-500/20 text-rose-300' :
                          rep.severity === 'High' ? 'bg-amber-500/20 text-amber-300' :
                          'bg-indigo-500/20 text-indigo-300'
                        }`}>
                          {rep.severity}
                        </span>
                        <span className="text-slate-400 font-mono text-[11px]">
                          {rep.category.replace(/_/g, ' ')}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 max-w-xs truncate text-slate-200 font-medium">
                      {rep.title}
                    </td>
                    <td className="py-3.5 px-4 max-w-xs truncate text-slate-400">
                      <div className="flex items-center space-x-1">
                        <MapPin className="w-3 h-3 text-cyan-accent flex-shrink-0" />
                        <span className="truncate">{rep.location_name || 'Unspecified'}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium ${
                        rep.approval_status === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                        rep.approval_status === 'DISPATCHED' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' :
                        rep.approval_status === 'RESOLVED' ? 'bg-slate-500/20 text-slate-300 border border-slate-500/30' :
                        rep.approval_status === 'REJECTED' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                        'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}>
                        {rep.approval_status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap space-x-1">
                      <button
                        onClick={() => setActiveReport(rep)}
                        className="px-2.5 py-1 rounded bg-navy-800 hover:bg-navy-700 text-cyan-accent text-[11px] font-medium transition-colors"
                      >
                        Inspect
                      </button>
                      {rep.approval_status === 'PENDING_APPROVAL' && (
                        <button
                          onClick={() => handleQuickStatusChange(rep.id, 'APPROVED')}
                          className="px-2.5 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-[11px] font-medium transition-colors"
                        >
                          Approve
                        </button>
                      )}
                      {rep.approval_status === 'APPROVED' && (
                        <button
                          onClick={() => handleQuickStatusChange(rep.id, 'DISPATCHED')}
                          className="px-2.5 py-1 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-[11px] font-medium transition-colors"
                        >
                          Dispatch
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Report Detail Modal */}
      {activeReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/85 backdrop-blur-md">
          <div className="relative w-full max-w-2xl rounded-2xl border border-navy-700 bg-navy-900 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between p-5 border-b border-navy-800">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-mono font-bold text-cyan-accent">
                  {activeReport.id}
                </span>
                <span className="text-slate-600">&middot;</span>
                <span className="text-xs text-slate-300 font-mono uppercase">
                  {activeReport.category.replace(/_/g, ' ')}
                </span>
              </div>
              <button
                onClick={() => setActiveReport(null)}
                className="text-slate-400 hover:text-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto text-xs">
              <div>
                <h3 className="text-base font-bold text-slate-100">
                  {activeReport.title}
                </h3>
                <p className="text-slate-300 mt-2 bg-navy-950 p-3 rounded-lg border border-navy-800 leading-relaxed font-sans">
                  "{activeReport.description}"
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-[11px] font-mono">
                <div className="p-2.5 rounded bg-navy-850 border border-navy-800">
                  <span className="text-slate-500 block">Location:</span>
                  <span className="text-slate-200">{activeReport.location_name || 'Unspecified'}</span>
                </div>
                <div className="p-2.5 rounded bg-navy-850 border border-navy-800">
                  <span className="text-slate-500 block">Created At:</span>
                  <span className="text-slate-200">{new Date(activeReport.created_at).toLocaleString()}</span>
                </div>
              </div>

              {activeReport.evidence_data && activeReport.evidence_data.length > 0 && (
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                    Supporting Telemetry & Evidence:
                  </span>
                  <ul className="space-y-1">
                    {activeReport.evidence_data.map((ev, i) => (
                      <li key={i} className="text-slate-300 flex items-start space-x-1.5">
                        <span className="text-cyan-accent">&bull;</span>
                        <span>{ev}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {activeReport.recommended_actions && activeReport.recommended_actions.length > 0 && (
                <div className="p-3 rounded-xl border border-indigo-500/30 bg-indigo-500/5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-300 block mb-1">
                    Action Plan:
                  </span>
                  <ul className="space-y-1">
                    {activeReport.recommended_actions.map((act, i) => (
                      <li key={i} className="text-slate-200 flex items-start space-x-1.5">
                        <span className="text-cyan-accent">&bull;</span>
                        <span>{act}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="p-4 bg-navy-850 border-t border-navy-800 flex items-center justify-between">
              <div className="text-[11px] font-mono text-slate-400">
                Status: <span className="text-cyan-accent">{activeReport.approval_status}</span>
              </div>
              <div className="flex items-center space-x-2">
                {activeReport.approval_status !== 'RESOLVED' && (
                  <button
                    onClick={() => handleQuickStatusChange(activeReport.id, 'RESOLVED')}
                    className="px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium"
                  >
                    Mark Resolved
                  </button>
                )}
                <button
                  onClick={() => setActiveReport(null)}
                  className="px-4 py-1.5 rounded bg-navy-700 text-slate-200 text-xs font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
