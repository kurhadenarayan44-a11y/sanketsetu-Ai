import React from 'react';
import { 
  ShieldAlert, 
  Terminal, 
  Sparkles, 
  History, 
  Activity, 
  Layers,
  Cpu
} from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  geminiMode?: string;
  pendingApprovalsCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  geminiMode = 'DEMO_MODE',
  pendingApprovalsCount = 0
}) => {
  const isReal = geminiMode === 'REAL_GEMINI';

  const navItems = [
    { id: 'landing', label: 'Mission & Overview', icon: Sparkles },
    { id: 'workspace', label: 'Agent Workspace', icon: Terminal },
    { id: 'console', label: 'Execution Console', icon: Layers },
    { id: 'results', label: 'Results & Action Plan', icon: ShieldAlert },
    { id: 'history', label: 'Report History', icon: History, badge: pendingApprovalsCount },
    { id: 'status', label: 'System Diagnostics', icon: Activity },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-navy-700/60 bg-navy-900/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Tagline */}
          <div 
            className="flex items-center space-x-3 cursor-pointer group"
            onClick={() => setActiveTab('landing')}
          >
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 shadow-glow-primary">
              <ShieldAlert className="w-6 h-6 text-slate-50" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-cyan-accent rounded-full radar-dot" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-lg tracking-wider text-slate-50 group-hover:text-cyan-accent transition-colors">
                  SANKATSETU<span className="text-cyan-accent">.AI</span>
                </span>
                <span className="px-1.5 py-0.5 text-[10px] font-semibold tracking-wider uppercase rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Operations
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono hidden sm:block">
                Turning Human Intent into Verified Action
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`relative flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'text-cyan-accent bg-navy-800 shadow-sm border border-cyan-accent/30'
                      : 'text-slate-300 hover:text-slate-50 hover:bg-navy-850'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-accent' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="ml-1 px-1.5 py-0.2 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-full text-[10px] font-mono">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Engine Mode Badge */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full border border-navy-700 bg-navy-850 text-xs">
              <Cpu className={`w-3.5 h-3.5 ${isReal ? 'text-emerald-accent' : 'text-amber-accent'}`} />
              <div className="flex items-center space-x-1.5">
                <span className={`w-2 h-2 rounded-full ${isReal ? 'bg-emerald-accent animate-pulse' : 'bg-amber-accent'}`} />
                <span className="font-mono text-[11px] text-slate-300">
                  {isReal ? 'GEMINI 3.8 FLASH' : 'DEMO MODE (LOCAL)'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Mobile nav bar */}
      <div className="md:hidden flex overflow-x-auto py-2 px-4 border-t border-navy-800 space-x-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`whitespace-nowrap px-3 py-1 rounded text-xs font-medium ${
              activeTab === item.id ? 'bg-indigo-600 text-white' : 'text-slate-400 bg-navy-800'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
    </header>
  );
};
