import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Check, X, Volume2 } from 'lucide-react';

interface VoiceInputProps {
  onTranscriptReady: (transcript: string) => void;
  initialTranscript?: string;
}

export const VoiceInput: React.FC<VoiceInputProps> = ({ onTranscriptReady, initialTranscript = '' }) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState(initialTranscript);
  const [isSupported, setIsSupported] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Check Web Speech API availability
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let currentText = '';
        for (let i = 0; i < event.results.length; i++) {
          currentText += event.results[i][0].transcript + ' ';
        }
        setTranscript(currentText.trim());
        setShowEditor(true);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    } catch (err) {
      setIsSupported(false);
    }
  }, []);

  const toggleListening = () => {
    if (!isSupported || !recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
        setShowEditor(true);
      } catch (e) {
        console.error('Failed to start speech recognition', e);
      }
    }
  };

  const handleApply = () => {
    onTranscriptReady(transcript);
    setShowEditor(false);
  };

  const handleClear = () => {
    setTranscript('');
    onTranscriptReady('');
    setShowEditor(false);
  };

  if (!isSupported) {
    return (
      <div className="flex items-center space-x-1.5 text-[11px] text-slate-500 font-mono py-1">
        <MicOff className="w-3.5 h-3.5 text-slate-500" />
        <span>Voice speech recognition not supported in this browser (Text input fully active)</span>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-center space-x-2">
        <button
          type="button"
          onClick={toggleListening}
          className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            isListening
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-glow-rose animate-pulse'
              : 'bg-navy-800 text-slate-300 hover:text-cyan-accent border border-navy-700 hover:border-cyan-accent/40'
          }`}
        >
          {isListening ? (
            <>
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              <MicOff className="w-3.5 h-3.5" />
              <span>Stop Recording</span>
            </>
          ) : (
            <>
              <Mic className="w-3.5 h-3.5 text-cyan-accent" />
              <span>Voice Dictation</span>
            </>
          )}
        </button>

        {isListening && (
          <div className="flex items-center space-x-1.5 text-xs text-rose-300 font-mono animate-pulse">
            <Volume2 className="w-3.5 h-3.5" />
            <span>Listening... Speak clearly</span>
          </div>
        )}
      </div>

      {showEditor && (
        <div className="mt-2.5 p-3 rounded-lg border border-cyan-accent/30 bg-navy-850/90 shadow-glass">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center space-x-1.5 text-xs font-semibold text-cyan-accent">
              <Mic className="w-3.5 h-3.5" />
              <span>Speech Transcript (Review and Edit before Analysis)</span>
            </div>
            <div className="flex items-center space-x-1">
              <button
                type="button"
                onClick={handleApply}
                className="flex items-center space-x-1 px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] hover:bg-emerald-500/30"
              >
                <Check className="w-3 h-3" />
                <span>Insert into Report</span>
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="p-1 text-slate-400 hover:text-slate-200"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>

          <textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            rows={2}
            className="w-full text-xs bg-navy-900 border border-navy-700 rounded p-2 text-slate-200 focus:outline-none focus:border-cyan-accent font-mono"
            placeholder="Live speech transcript will appear here. You can freely edit or augment it..."
          />
        </div>
      )}
    </div>
  );
};
