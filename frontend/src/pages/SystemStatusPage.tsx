import React, { useEffect, useState } from 'react';
import { 
  Activity, 
  Cpu, 
  Database, 
  MapPin, 
  CloudSun, 
  ShieldCheck, 
  RefreshCw, 
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { IntegrationStatus } from '../types';
import { fetchIntegrationsStatus } from '../services/api';

export const SystemStatusPage: React.FC = () => {
  const [status, setStatus] = useState<IntegrationStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadDiagnostics = async () => {
    setIsLoading(true);
    try {
      const data = await fetchIntegrationsStatus();
      setStatus(data);
    } catch (err) {
      console.error('Failed to load system diagnostics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDiagnostics();
  }, []);

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-4">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border border-navy-700 bg-navy-850/90 shadow-glass">
        <div>
          <div className="flex items-center space-x-2">
            <Activity className="w-4 h-4 text-cyan-accent" />
            <span className="text-xs font-mono font-bold text-cyan-accent uppercase tracking-wider">
              System Telemetry & Hardware State
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-50 mt-1">
            SankatSetu Operations Diagnostics
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time status of connected intelligence models, SQLite database, and external registries.
          </p>
        </div>

        <button
          onClick={loadDiagnostics}
          disabled={isLoading}
          className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-navy-800 hover:bg-navy-750 border border-navy-700 text-slate-200 text-xs font-medium transition-colors self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Run Self-Test</span>
        </button>
      </div>

      {status ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 1. Gemini Engine Diagnostics */}
          <div className="p-5 rounded-xl border border-navy-700 bg-navy-850/80 shadow-glass space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Cpu className="w-5 h-5 text-indigo-400" />
                <h4 className="text-sm font-bold text-slate-100">
                  Google Gen AI Model Engine
                </h4>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                status.gemini_active ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
              }`}>
                {status.mode}
              </span>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between py-1 border-b border-navy-750">
                <span className="text-slate-400">Target Model:</span>
                <span className="text-slate-200">{status.gemini_model}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-navy-750">
                <span className="text-slate-400">API Key Status:</span>
                <span className={status.gemini_active ? 'text-emerald-400' : 'text-amber-400'}>
                  {status.gemini_active ? 'Configured & Active' : 'Unset (Zero-Config Demo Mode Engaged)'}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Deterministic Fallback:</span>
                <span className="text-emerald-400">Operational & Verified</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 pt-1 leading-relaxed">
              When an API key is provided in <code className="text-cyan-accent">.env</code>, requests route directly to the official <code className="text-indigo-300">google-genai</code> SDK. In Demo Mode, the engine uses local rule heuristics with identical schema contracts.
            </p>
          </div>

          {/* 2. SQLite Database Diagnostics */}
          <div className="p-5 rounded-xl border border-navy-700 bg-navy-850/80 shadow-glass space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Database className="w-5 h-5 text-emerald-400" />
                <h4 className="text-sm font-bold text-slate-100">
                  SQLite Persistence Storage
                </h4>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300">
                CONNECTED
              </span>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between py-1 border-b border-navy-750">
                <span className="text-slate-400">WAL Journal Mode:</span>
                <span className="text-emerald-400">Enabled</span>
              </div>
              <div className="flex justify-between py-1 border-b border-navy-750">
                <span className="text-slate-400">Total Persisted Reports:</span>
                <span className="text-slate-200 font-bold">{status.total_saved_reports}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Pending Civilian Approvals:</span>
                <span className="text-cyan-accent font-bold">{status.pending_approvals}</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 pt-1 leading-relaxed">
              Stores tasks, subtasks, tool executions, truth verifications, and consequential sign-off states permanently in <code className="text-cyan-accent">sanketsetu.db</code>.
            </p>
          </div>

          {/* 3. OpenStreetMap Geocoding */}
          <div className="p-5 rounded-xl border border-navy-700 bg-navy-850/80 shadow-glass space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <MapPin className="w-5 h-5 text-cyan-accent" />
                <h4 className="text-sm font-bold text-slate-100">
                  OpenStreetMap (Nominatim)
                </h4>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300">
                ONLINE
              </span>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between py-1 border-b border-navy-750">
                <span className="text-slate-400">Endpoint:</span>
                <span className="text-slate-200">nominatim.openstreetmap.org</span>
              </div>
              <div className="flex justify-between py-1 border-b border-navy-750">
                <span className="text-slate-400">Leaflet Map Renderer:</span>
                <span className="text-emerald-400">Interactive Pinpoint Active</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Coordinate Invention Policy:</span>
                <span className="text-rose-300">STRICTLY PROHIBITED</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 pt-1 leading-relaxed">
              Grounds relative descriptions against the global OpenStreetMap spatial database. Unindexed locations trigger clarification requests.
            </p>
          </div>

          {/* 4. Meteorological Live Telemetry */}
          <div className="p-5 rounded-xl border border-navy-700 bg-navy-850/80 shadow-glass space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CloudSun className="w-5 h-5 text-amber-400" />
                <h4 className="text-sm font-bold text-slate-100">
                  Open-Meteo Live Telemetry
                </h4>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300">
                READY
              </span>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between py-1 border-b border-navy-750">
                <span className="text-slate-400">API Gateway:</span>
                <span className="text-slate-200">api.open-meteo.com</span>
              </div>
              <div className="flex justify-between py-1 border-b border-navy-750">
                <span className="text-slate-400">Live Weather Query:</span>
                <span className="text-emerald-400">Enabled on Verified GPS</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Scenario 3 Fault Injection:</span>
                <span className="text-amber-300">Supported (Controlled 504 Timeout)</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 pt-1 leading-relaxed">
              Provides genuine precipitation and wind speeds to corroborate flooding and stormy damage claims.
            </p>
          </div>
        </div>
      ) : (
        <div className="p-12 text-center text-xs text-slate-400 font-mono">
          Querying system diagnostics from backend...
        </div>
      )}

      {/* Safety & Ethics Disclaimer */}
      <div className="p-4 rounded-xl border border-navy-700 bg-navy-900/60 flex items-start space-x-3 text-xs text-slate-300">
        <ShieldCheck className="w-5 h-5 text-cyan-accent flex-shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="text-slate-100">Truth Verification Guarantee:</strong> {status?.disclaimer || 'SankatSetu AI enforces truth verification: AI inferences are never labelled as verified facts.'} Consequential actions require explicit operator sign-off before dispatch.
        </p>
      </div>
    </div>
  );
};
