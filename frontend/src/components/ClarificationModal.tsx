import React, { useState } from 'react';
import { HelpCircle, ArrowRight, MapPin, X } from 'lucide-react';

interface ClarificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: string;
  missingInformation: string[];
  clarificationPrompt?: string | null;
  onSubmitClarification: (taskId: string, clarifications: Record<string, string>) => void;
  isLoading?: boolean;
}

export const ClarificationModal: React.FC<ClarificationModalProps> = ({
  isOpen,
  onClose,
  taskId,
  missingInformation,
  clarificationPrompt,
  onSubmitClarification,
  isLoading = false
}) => {
  const [clarificationValue, setClarificationValue] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clarificationValue.trim()) return;

    onSubmitClarification(taskId, {
      location: clarificationValue.trim(),
      exact_street_or_landmark: clarificationValue.trim()
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/85 backdrop-blur-md">
      <div className="relative w-full max-w-lg rounded-2xl border border-amber-500/50 bg-navy-900 shadow-glow-amber overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-navy-800 bg-amber-500/10">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-300">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-100">
                Agent Awaiting Essential Clarification
              </h3>
              <p className="text-[11px] text-amber-300 font-mono">
                Truth Verification Gate &middot; Refusing to Hallucinate Location
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-3.5 rounded-xl border border-navy-700 bg-navy-850/90 text-xs text-slate-300 leading-relaxed">
            <p className="font-medium text-slate-200 mb-1">
              {clarificationPrompt || 'Essential dispatch information is missing from the citizen statement.'}
            </p>
            <p className="text-[11px] text-slate-400">
              SankatSetu AI enforces real-world truth verification. The agent extracted the issue but strictly requires a verified street or landmark before generating an official action plan.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center space-x-1.5">
              <MapPin className="w-3.5 h-3.5 text-cyan-accent" />
              <span>Provide Street Name, Landmark, or College / Institution:</span>
            </label>
            <input
              type="text"
              autoFocus
              value={clarificationValue}
              onChange={(e) => setClarificationValue(e.target.value)}
              placeholder="e.g. Near Modern College Main Gate, JM Road, Pune"
              className="w-full bg-navy-950 border border-navy-700 rounded-lg px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-accent"
              required
            />
          </div>

          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs text-slate-400 hover:text-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !clarificationValue.trim()}
              className="flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-400 text-white font-medium rounded-lg text-xs transition-all shadow-glow-primary disabled:opacity-50"
            >
              <span>{isLoading ? 'Resuming Agent...' : 'Submit & Resume Workflow'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
