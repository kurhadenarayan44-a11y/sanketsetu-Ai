import React from 'react';
import { AlertCircle, Layers, ShieldCheck, Play } from 'lucide-react';

interface ScenarioBarProps {
  onSelectScenario: (scenarioKey: string, text: string, location?: string, simulateFailure?: boolean) => void;
}

export const ScenarioBar: React.FC<ScenarioBarProps> = ({ onSelectScenario }) => {
  const scenarios = [
    {
      id: 'scenario_1',
      title: 'Scenario 1: Incomplete Input',
      badge: 'Missing Details Test',
      badgeColor: 'border-amber-500/40 text-amber-300 bg-amber-500/10',
      icon: AlertCircle,
      description: 'Report road cave-in without a location. Agent identifies missing details and pauses for user clarification.',
      text: "There is a deep road cave-in and broken water pipe causing major issues, but I'm rushing and didn't mention where.",
      location: '',
      simulateFailure: false
    },
    {
      id: 'scenario_2',
      title: 'Scenario 2: Multiple Problems',
      badge: 'Multimodal Compound Test',
      badgeColor: 'border-cyan-accent/40 text-cyan-accent bg-cyan-accent/10',
      icon: Layers,
      description: 'Compound message with waterlogging, submerged pothole, traffic gridlock, and broken streetlight. Decomposes into 4 subtasks.',
      text: "Heavy rain has caused waterlogging near my college at MG Road Junction. There is a large pothole hidden under the water, traffic is stuck, and the nearby streetlight is not working.",
      location: 'MG Road Junction, Pune',
      simulateFailure: false
    },
    {
      id: 'scenario_3',
      title: 'Scenario 3: Controlled Tool Failure',
      badge: 'Self-Healing Resilience Test',
      badgeColor: 'border-rose-500/40 text-rose-300 bg-rose-500/10',
      icon: ShieldCheck,
      description: 'High voltage sparking wire with simulated municipal telemetry failure. Agent detects error and engages emergency safety fallback.',
      text: "High voltage power line sparking near municipal school at Shivaji Nagar.",
      location: 'Shivaji Nagar, Pune',
      simulateFailure: true
    }
  ];

  return (
    <div className="w-full mb-8">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <span className="flex h-2 w-2 rounded-full bg-cyan-accent"></span>
          <h3 className="text-xs font-semibold tracking-wider uppercase text-slate-300">
            Hackathon Verification Suite — One-Click Evaluator Scenarios
          </h3>
        </div>
        <span className="text-[11px] text-slate-400 font-mono">
          Deterministic execution &middot; Zero API key required
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {scenarios.map((sc) => {
          const Icon = sc.icon;
          return (
            <div
              key={sc.id}
              className="group relative flex flex-col justify-between p-4 rounded-xl border border-navy-700/80 bg-navy-850/80 hover:bg-navy-800 hover:border-cyan-accent/50 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-glow-cyan"
              onClick={() => onSelectScenario(sc.id, sc.text, sc.location, sc.simulateFailure)}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${sc.badgeColor}`}>
                    {sc.badge}
                  </span>
                  <button className="flex items-center space-x-1 text-[11px] text-cyan-accent font-medium group-hover:translate-x-0.5 transition-transform">
                    <span>Load</span>
                    <Play className="w-3 h-3 fill-cyan-accent" />
                  </button>
                </div>
                <h4 className="text-sm font-semibold text-slate-100 group-hover:text-cyan-accent transition-colors">
                  {sc.title}
                </h4>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed line-clamp-3">
                  {sc.description}
                </p>
              </div>

              <div className="mt-3 pt-2.5 border-t border-navy-700/50 flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span className="truncate max-w-[200px]">"{sc.text.slice(0, 32)}..."</span>
                <span className="text-indigo-400">Run &rarr;</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
