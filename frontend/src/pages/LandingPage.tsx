import React from 'react';
import { 
  ShieldAlert, 
  Sparkles, 
  ArrowRight, 
  Cpu, 
  MapPin, 
  CheckCircle2, 
  AlertTriangle, 
  FileCheck,
  Layers,
  Wrench,
  Search,
  Activity
} from 'lucide-react';

interface LandingPageProps {
  onStartAnalysis: () => void;
  onSelectScenario: (key: string, text: string, loc?: string, fail?: boolean) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onStartAnalysis, onSelectScenario }) => {
  const steps = [
    { title: '1. UNDERSTAND', desc: 'Ingests messy voice, images, text, and environmental context.' },
    { title: '2. DECOMPOSE', desc: 'Separates compound problems into atomic issue subtasks.' },
    { title: '3. PLAN', desc: 'Dynamically orchestrates prioritized tool chains & dependencies.' },
    { title: '4. VALIDATE', desc: 'Strict truth verification; pauses for user clarification if location is missing.' },
    { title: '5. SELECT TOOLS', desc: 'Binds geocoding, computer vision, and meteorological APIs.' },
    { title: '6. EXECUTE', desc: 'Performs bounded runs, recording parameter inputs and latency.' },
    { title: '7. VERIFY', desc: 'Classifies claims as Tool-Verified, User-Provided, AI-Inferred, or Missing.' },
    { title: '8. RECOVER', desc: 'Self-heals on tool failure, activating emergency fallback advisories.' },
    { title: '9. APPROVAL', desc: 'Enforces human authorization before any consequential dispatch.' },
    { title: '10. ACT & TRACK', desc: 'Generates persistent SQLite reports with official tracking IDs.' },
  ];

  return (
    <div className="space-y-16 py-8">
      {/* Hero Section */}
      <section className="relative text-center max-w-4xl mx-auto px-4">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full border border-cyan-accent/30 bg-cyan-accent/10 text-cyan-accent text-xs font-mono mb-6 shadow-glow-cyan">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Gemini Multimodal Societal-Benefit Operations Dashboard</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-50 leading-tight">
          Turning Messy Human Intent into <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-accent via-indigo-400 to-cyan-300">Verified Action</span>
        </h1>

        <p className="mt-6 text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl mx-auto">
          When crisis strikes, citizens report chaotic, multi-issue messages. 
          <strong className="text-slate-100"> SankatSetu AI</strong> bridges human panic and public services: decomposing compound hazards, verifying ground truth, and routing actionable dispatches with human sign-off.
        </p>

        {/* CTA Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={onStartAnalysis}
            className="flex items-center space-x-2.5 px-7 py-3.5 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-400 text-slate-50 font-bold text-sm transition-all shadow-glow-primary hover:scale-[1.02]"
          >
            <span>Launch Agent Workspace</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => onSelectScenario(
              'scenario_2',
              'Heavy rain has caused waterlogging near my college at MG Road Junction. There is a large pothole hidden under the water, traffic is stuck, and the nearby streetlight is not working.',
              'MG Road Junction, Pune',
              false
            )}
            className="flex items-center space-x-2 px-6 py-3.5 rounded-xl bg-navy-850 hover:bg-navy-800 border border-navy-700 text-slate-200 text-sm font-medium transition-all"
          >
            <Activity className="w-4 h-4 text-cyan-accent" />
            <span>Run Multi-Issue Scenario &rarr;</span>
          </button>
        </div>

        {/* Core Pillars */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12 text-left">
          <div className="p-4 rounded-xl border border-navy-700/80 bg-navy-850/60">
            <Layers className="w-5 h-5 text-indigo-400 mb-2" />
            <div className="font-bold text-sm text-slate-100">Multi-Hazard Split</div>
            <div className="text-xs text-slate-400 mt-1">1 messy input decomposed into atomic problem subtasks.</div>
          </div>
          <div className="p-4 rounded-xl border border-navy-700/80 bg-navy-850/60">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 mb-2" />
            <div className="font-bold text-sm text-slate-100">Zero Hallucinations</div>
            <div className="text-xs text-slate-400 mt-1">AI inferences strictly separated from verified facts.</div>
          </div>
          <div className="p-4 rounded-xl border border-navy-700/80 bg-navy-850/60">
            <Wrench className="w-5 h-5 text-cyan-accent mb-2" />
            <div className="font-bold text-sm text-slate-100">Real Tool Execution</div>
            <div className="text-xs text-slate-400 mt-1">OpenStreetMap & live meteorological telemetry.</div>
          </div>
          <div className="p-4 rounded-xl border border-navy-700/80 bg-navy-850/60">
            <FileCheck className="w-5 h-5 text-amber-400 mb-2" />
            <div className="font-bold text-sm text-slate-100">Consequential Gate</div>
            <div className="text-xs text-slate-400 mt-1">Human approval required prior to any civic dispatch.</div>
          </div>
        </div>
      </section>

      {/* Visual Workflow Section */}
      <section className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-slate-100">
            The 10-Stage Verified Operations Pipeline
          </h2>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Deterministic, bounded AI orchestration with audit trails
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {steps.map((st, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-xl border border-navy-700 bg-navy-850/80 flex flex-col justify-between"
            >
              <div>
                <span className="text-[10px] font-mono text-cyan-accent font-bold block mb-1">
                  STAGE {idx + 1}
                </span>
                <h4 className="text-xs font-bold text-slate-100 uppercase tracking-tight">
                  {st.title.replace(/^\d+\.\s*/, '')}
                </h4>
                <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                  {st.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Comparison: Chatbot vs SankatSetu AI */}
      <section className="max-w-5xl mx-auto px-4">
        <div className="p-6 rounded-2xl border border-navy-700 bg-navy-850/80 shadow-glass">
          <div className="text-center mb-6">
            <h3 className="text-lg font-bold text-slate-100">
              Why SankatSetu AI is Not Just Another Chatbot
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Architected specifically to solve societal crises without hallucination risks
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            {/* Generic Chatbot */}
            <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/5 space-y-3">
              <div className="flex items-center space-x-2 text-rose-300 font-bold font-mono">
                <AlertTriangle className="w-4 h-4" />
                <span>GENERIC AI CHATBOT</span>
              </div>
              <ul className="space-y-2 text-slate-400">
                <li>&bull; Lumps multiple disasters into a single generic text response</li>
                <li>&bull; Hallucinates fake GPS coordinates, police numbers, or repair ETA</li>
                <li>&bull; Claims to submit complaints to government when nothing actually ran</li>
                <li>&bull; No real tool execution or database persistence</li>
                <li>&bull; Dispatches unverified claims without human verification gates</li>
              </ul>
            </div>

            {/* SankatSetu AI */}
            <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-3">
              <div className="flex items-center space-x-2 text-emerald-300 font-bold font-mono">
                <CheckCircle2 className="w-4 h-4" />
                <span>SANKATSETU AI OPERATIONS ENGINE</span>
              </div>
              <ul className="space-y-2 text-slate-300">
                <li>&bull; Decomposes compound reports into atomic, categorized issue cards</li>
                <li>&bull; Explicitly flags missing landmarks instead of guessing coordinates</li>
                <li>&bull; Queries real OpenStreetMap geocoding & live weather telemetry</li>
                <li>&bull; Auditable SQLite database with authentic tracking IDs (<code className="text-cyan-accent">SST-2026-XXXX</code>)</li>
                <li>&bull; Strict consequential action gate: human authorization required to dispatch</li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
