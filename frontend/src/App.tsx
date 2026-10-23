import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { LandingPage } from './pages/LandingPage';
import { WorkspacePage } from './pages/WorkspacePage';
import { ExecutionConsole } from './components/ExecutionConsole';
import { ResultsPage } from './pages/ResultsPage';
import { HistoryPage } from './pages/HistoryPage';
import { SystemStatusPage } from './pages/SystemStatusPage';
import { ClarificationModal } from './components/ClarificationModal';
import { AgentExecutionResult, Report } from './types';
import { analyzeInput, submitClarification, fetchIntegrationsStatus } from './services/api';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('landing');
  const [executionResult, setExecutionResult] = useState<AgentExecutionResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isClarificationOpen, setIsClarificationOpen] = useState<boolean>(false);
  const [geminiMode, setGeminiMode] = useState<string>('DEMO_MODE');
  const [pendingCount, setPendingCount] = useState<number>(0);

  // Preset values for workspace when clicking scenarios from Landing or ScenarioBar
  const [presetText, setPresetText] = useState<string>('');
  const [presetLocation, setPresetLocation] = useState<string>('');
  const [presetScenario, setPresetScenario] = useState<string>('');
  const [presetSimulateFailure, setPresetSimulateFailure] = useState<boolean>(false);

  // Fetch integration diagnostics on mount
  const checkStatus = async () => {
    try {
      const diag = await fetchIntegrationsStatus();
      setGeminiMode(diag.mode);
      setPendingCount(diag.pending_approvals);
    } catch {
      // Backend might still be starting up
    }
  };

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleAnalyze = async (data: {
    text: string;
    location?: string;
    latitude?: number;
    longitude?: number;
    imageFile?: File | null;
    audioTranscript?: string;
    scenario?: string;
    simulateFailure?: boolean;
  }) => {
    setIsLoading(true);
    setActiveTab('console'); // Move to console to show live execution steps
    try {
      const formData = new FormData();
      formData.append('text', data.text);
      if (data.location) formData.append('location', data.location);
      if (data.latitude) formData.append('latitude', String(data.latitude));
      if (data.longitude) formData.append('longitude', String(data.longitude));
      if (data.audioTranscript) formData.append('audio_transcript', data.audioTranscript);
      if (data.scenario) formData.append('scenario', data.scenario);
      if (data.simulateFailure !== undefined) formData.append('simulate_failure', String(data.simulateFailure));
      if (data.imageFile) formData.append('image', data.imageFile);

      const res = await analyzeInput(formData);
      setExecutionResult(res);

      if (res.status === 'AWAITING_CLARIFICATION') {
        setIsClarificationOpen(true);
      } else {
        // Automatically switch to Results page after brief console view
        setTimeout(() => {
          setActiveTab('results');
        }, 800);
      }
      checkStatus();
    } catch (err: any) {
      alert(`Execution Error: ${err.message || 'Unknown failure'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitClarification = async (taskId: string, clarifications: Record<string, string>) => {
    setIsLoading(true);
    try {
      const res = await submitClarification(taskId, clarifications);
      setExecutionResult(res);
      setIsClarificationOpen(false);
      setActiveTab('results');
      checkStatus();
    } catch (err: any) {
      alert(`Clarification Error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectScenario = (key: string, text: string, loc?: string, simFail?: boolean) => {
    setPresetText(text);
    setPresetLocation(loc || '');
    setPresetScenario(key);
    setPresetSimulateFailure(Boolean(simFail));
    setActiveTab('workspace');
  };

  const handleReportUpdated = (updated: Report) => {
    if (executionResult) {
      setExecutionResult({
        ...executionResult,
        reports: executionResult.reports.map(r => r.id === updated.id ? updated : r)
      });
    }
    checkStatus();
  };

  return (
    <div className="min-h-screen bg-navy-900 text-slate-50 cyber-grid flex flex-col justify-between">
      <div>
        {/* Navigation Header */}
        <Navbar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          geminiMode={geminiMode}
          pendingApprovalsCount={pendingCount}
        />

        {/* Page Content Body */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {activeTab === 'landing' && (
            <LandingPage
              onStartAnalysis={() => setActiveTab('workspace')}
              onSelectScenario={handleSelectScenario}
            />
          )}

          {activeTab === 'workspace' && (
            <WorkspacePage
              onAnalyze={handleAnalyze}
              isLoading={isLoading}
              onSelectScenario={handleSelectScenario}
              presetText={presetText}
              presetLocation={presetLocation}
              presetScenario={presetScenario}
              presetSimulateFailure={presetSimulateFailure}
            />
          )}

          {activeTab === 'console' && (
            <div className="max-w-5xl mx-auto py-4">
              <ExecutionConsole
                result={executionResult}
                isLoading={isLoading}
              />
            </div>
          )}

          {activeTab === 'results' && (
            <ResultsPage
              result={executionResult}
              onNavigateToHistory={() => setActiveTab('history')}
              onNavigateToWorkspace={() => setActiveTab('workspace')}
              onReportUpdated={handleReportUpdated}
            />
          )}

          {activeTab === 'history' && (
            <HistoryPage />
          )}

          {activeTab === 'status' && (
            <SystemStatusPage />
          )}
        </main>
      </div>

      {/* Clarification Modal for Scenario 1 */}
      {executionResult && (
        <ClarificationModal
          isOpen={isClarificationOpen}
          onClose={() => setIsClarificationOpen(false)}
          taskId={executionResult.task_id}
          missingInformation={executionResult.missing_information || []}
          clarificationPrompt={executionResult.clarification_prompt}
          onSubmitClarification={handleSubmitClarification}
          isLoading={isLoading}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-navy-800 bg-navy-950/80 py-6 mt-12 text-center text-xs text-slate-500 font-mono">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            <span className="font-bold text-slate-300">SankatSetu AI</span> &mdash; Turning Human Intent into Verified Action
          </div>
          <div className="flex items-center space-x-3">
            <span>Official Google Gen AI SDK</span>
            <span>&middot;</span>
            <span>OpenStreetMap</span>
            <span>&middot;</span>
            <span>Open-Meteo Telemetry</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
