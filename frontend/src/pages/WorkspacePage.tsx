import React, { useState } from 'react';
import { 
  Send, 
  MapPin, 
  Upload, 
  Image as ImageIcon, 
  X, 
  Sparkles, 
  AlertCircle,
  FileText,
  Navigation
} from 'lucide-react';
import { VoiceInput } from '../components/VoiceInput';
import { LocationPickerModal } from '../components/LocationPickerModal';
import { ScenarioBar } from '../components/ScenarioBar';

interface WorkspacePageProps {
  onAnalyze: (data: {
    text: string;
    location?: string;
    latitude?: number;
    longitude?: number;
    imageFile?: File | null;
    audioTranscript?: string;
    scenario?: string;
    simulateFailure?: boolean;
  }) => void;
  isLoading: boolean;
  onSelectScenario: (scenarioKey: string, text: string, loc?: string, simFail?: boolean) => void;
  presetText?: string;
  presetLocation?: string;
  presetScenario?: string;
  presetSimulateFailure?: boolean;
}

export const WorkspacePage: React.FC<WorkspacePageProps> = ({
  onAnalyze,
  isLoading,
  onSelectScenario,
  presetText = '',
  presetLocation = '',
  presetScenario = '',
  presetSimulateFailure = false,
}) => {
  const [text, setText] = useState(presetText);
  const [location, setLocation] = useState(presetLocation);
  const [latitude, setLatitude] = useState<number | undefined>(undefined);
  const [longitude, setLongitude] = useState<number | undefined>(undefined);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [voiceTranscript, setVoiceTranscript] = useState<string>('');
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [activeScenario, setActiveScenario] = useState<string | undefined>(presetScenario || undefined);
  const [simulateFailure, setSimulateFailure] = useState<boolean>(presetSimulateFailure);

  // Sync when preset updates from ScenarioBar
  React.useEffect(() => {
    if (presetText) setText(presetText);
    if (presetLocation !== undefined) setLocation(presetLocation);
    if (presetScenario !== undefined) setActiveScenario(presetScenario);
    if (presetSimulateFailure !== undefined) setSimulateFailure(presetSimulateFailure);
  }, [presetText, presetLocation, presetScenario, presetSimulateFailure]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      const url = URL.createObjectURL(file);
      setImagePreview(url);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
  };

  const handleLocationPicked = (locName: string, lat?: number, lon?: number) => {
    setLocation(locName);
    setLatitude(lat);
    setLongitude(lon);
  };

  const handleBrowserGPS = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude);
        setLongitude(pos.coords.longitude);
        setLocation(`GPS Fix (${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)})`);
      },
      (err) => console.warn('GPS position error:', err),
      { timeout: 5000 }
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() && !voiceTranscript.trim()) return;

    onAnalyze({
      text: text.trim(),
      location: location.trim() || undefined,
      latitude,
      longitude,
      imageFile,
      audioTranscript: voiceTranscript.trim() || undefined,
      scenario: activeScenario,
      simulateFailure
    });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 py-4">
      {/* 1-Click Evaluator Scenarios */}
      <ScenarioBar
        onSelectScenario={(key, sText, sLoc, sFail) => {
          setText(sText);
          setLocation(sLoc || '');
          setActiveScenario(key);
          setSimulateFailure(Boolean(sFail));
          onSelectScenario(key, sText, sLoc, sFail);
        }}
      />

      {/* Main Multimodal Input Cockpit */}
      <div className="rounded-2xl border border-navy-700 bg-navy-850/90 shadow-glass overflow-hidden">
        {/* Cockpit Header */}
        <div className="px-6 py-4 border-b border-navy-700/80 bg-gradient-to-r from-navy-850 to-navy-800/80 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-cyan-accent radar-dot" />
            <h3 className="text-sm font-bold text-slate-100 tracking-wide">
              Incident Analysis & Intent Decomposition Terminal
            </h3>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            Multimodal: Text &middot; Speech &middot; Imagery &middot; Telemetry
          </span>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Main Natural Language Text Area */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-200 uppercase tracking-wider flex items-center space-x-1.5">
                <FileText className="w-3.5 h-3.5 text-cyan-accent" />
                <span>Messy Natural Language Incident Description</span>
              </label>
              <span className="text-[11px] text-slate-500 font-mono">
                Accepts multi-hazard & confusing statements
              </span>
            </div>

            <textarea
              rows={4}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Example: Heavy rain has caused waterlogging near my college. There is a large pothole hidden under the water, traffic is stuck, and the nearby streetlight is not working..."
              className="w-full bg-navy-950 border border-navy-700 rounded-xl p-4 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-accent focus:ring-1 focus:ring-cyan-accent transition-all font-sans leading-relaxed"
              required
            />
          </div>

          {/* Voice Input Section */}
          <VoiceInput
            onTranscriptReady={(t) => {
              setVoiceTranscript(t);
              if (!text.trim()) {
                setText(t);
              }
            }}
          />

          {/* Location and Image Upload Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Location Input with OpenStreetMap integration */}
            <div className="p-4 rounded-xl border border-navy-700/80 bg-navy-900/60 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-200 flex items-center space-x-1.5">
                  <MapPin className="w-3.5 h-3.5 text-cyan-accent" />
                  <span>Location / Landmark</span>
                </label>
                <span className="text-[10px] text-slate-400 font-mono">Optional Ground Truth</span>
              </div>

              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. MG Road Junction, Pune or Near Modern College"
                className="w-full bg-navy-950 border border-navy-700 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-accent"
              />

              <div className="flex items-center space-x-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsMapModalOpen(true)}
                  className="flex-1 flex items-center justify-center space-x-1.5 py-2 px-3 rounded-lg border border-cyan-accent/30 bg-cyan-accent/5 hover:bg-cyan-accent/15 text-cyan-accent text-xs font-medium transition-all"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Pin on OpenStreetMap</span>
                </button>
                <button
                  type="button"
                  onClick={handleBrowserGPS}
                  className="flex items-center justify-center space-x-1 py-2 px-3 rounded-lg border border-navy-700 bg-navy-800 hover:bg-navy-700 text-slate-300 text-xs font-medium transition-all"
                  title="Use Browser GPS"
                >
                  <Navigation className="w-3.5 h-3.5 text-emerald-accent" />
                  <span>GPS</span>
                </button>
              </div>

              {latitude && longitude && (
                <div className="text-[10px] font-mono text-emerald-400">
                  Fixed Coordinates: {latitude.toFixed(5)}, {longitude.toFixed(5)}
                </div>
              )}
            </div>

            {/* Image Upload Box */}
            <div className="p-4 rounded-xl border border-navy-700/80 bg-navy-900/60 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-slate-200 flex items-center space-x-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-cyan-accent" />
                    <span>Visual Evidence Photo</span>
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">JPG, PNG, WEBP</span>
                </div>

                {!imagePreview ? (
                  <label className="border-2 border-dashed border-navy-700 hover:border-cyan-accent/50 rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer transition-colors bg-navy-950/60">
                    <Upload className="w-6 h-6 text-slate-400 mb-1" />
                    <span className="text-xs text-slate-300 font-medium">Click to upload photo</span>
                    <span className="text-[10px] text-slate-500 mt-0.5">Maximum size: 10MB</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/jpg"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>
                ) : (
                  <div className="relative rounded-lg overflow-hidden border border-cyan-accent/40 bg-navy-950">
                    <img
                      src={imagePreview}
                      alt="Uploaded civic evidence preview"
                      className="w-full h-32 object-cover"
                    />
                    <button
                      type="button"
                      onClick={removeImage}
                      className="absolute top-2 right-2 p-1 rounded-full bg-navy-950/80 text-slate-200 hover:text-rose-400"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-navy-950/90 text-[10px] font-mono text-cyan-accent">
                      {imageFile?.name} ({(imageFile ? imageFile.size / 1024 : 0).toFixed(0)} KB)
                    </div>
                  </div>
                )}
              </div>

              <p className="text-[11px] text-slate-400 mt-2">
                Processed via Gemini Multimodal Inspection Engine or Local Heuristics.
              </p>
            </div>
          </div>

          {/* Action Row */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-navy-700/60">
            <div className="flex items-center space-x-2 text-xs text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-accent"></span>
              <span>Bounded 10-stage execution pipeline active</span>
            </div>

            <button
              type="submit"
              disabled={isLoading || (!text.trim() && !voiceTranscript.trim())}
              className="w-full sm:w-auto flex items-center justify-center space-x-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-400 text-slate-50 font-bold text-sm transition-all shadow-glow-primary hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isLoading ? 'Executing Bounded Agent...' : 'Decompose & Verify Intent'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* OpenStreetMap Modal */}
      <LocationPickerModal
        isOpen={isMapModalOpen}
        onClose={() => setIsMapModalOpen(false)}
        onSelectLocation={handleLocationPicked}
        currentLocationName={location}
      />
    </div>
  );
};
