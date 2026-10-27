import React, { useEffect, useState } from 'react';
import { 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  FileSearch, 
  Layers, 
  Calculator, 
  BrainCircuit,
  Lightbulb
} from 'lucide-react';

export const PROGRESS_STAGES = [
  { id: 1, label: 'Document Parsing & Structure', icon: FileSearch, detail: 'Normalizing text and segmenting headings' },
  { id: 2, label: '27-Point Rule Engine', icon: Layers, detail: 'Executing ATS, content, red flag, and bias checks' },
  { id: 3, label: 'Multi-Dimensional Scoring', icon: Calculator, detail: 'Computing ATS, Content, Structure & Overall composite scores' },
  { id: 4, label: 'Google Gemini AI Intelligence', icon: BrainCircuit, detail: 'Evaluating bullet action verbs, impact, and system architecture' },
  { id: 5, label: 'Synthesizing Recommendations', icon: Lightbulb, detail: 'Generating grounded rewrites with bracketed metric placeholders' },
];

/**
 * AnalysisProgress Component
 * Renders smooth animated multi-stage progress indicator.
 */
export const AnalysisProgress = ({ isAnalyzing, onCancel }) => {
  const [currentStage, setCurrentStage] = useState(0);
  const [progressPct, setProgressPct] = useState(15);

  useEffect(() => {
    if (!isAnalyzing) {
      setCurrentStage(0);
      setProgressPct(15);
      return;
    }

    const stageInterval = setInterval(() => {
      setCurrentStage((prev) => {
        if (prev < PROGRESS_STAGES.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 4500);

    const progressInterval = setInterval(() => {
      setProgressPct((prev) => {
        if (prev < 90) {
          return prev + Math.floor(Math.random() * 5 + 3);
        }
        return prev;
      });
    }, 1200);

    return () => {
      clearInterval(stageInterval);
      clearInterval(progressInterval);
    };
  }, [isAnalyzing]);

  if (!isAnalyzing) return null;

  return (
    <div className="p-6 rounded-2xl bg-[#0D1220] border border-[#7657FF]/40 shadow-2xl shadow-[#7657FF]/10 text-left space-y-5 animate-pulse-subtle">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#7657FF] to-[#3985FF] flex items-center justify-center text-white shadow-md shadow-[#7657FF]/30">
            <Sparkles className="w-5 h-5 animate-spin-slow" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-[#F8FAFC]">
              Deep Resume Intelligence in Progress...
            </h4>
            <p className="text-xs text-[#94A3B8]">
              {PROGRESS_STAGES[currentStage]?.detail}
            </p>
          </div>
        </div>

        <span className="text-xs font-mono font-bold text-[#B49DFF] bg-[#182238] px-2.5 py-1 rounded-lg border border-[#334155]">
          {progressPct}%
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2 bg-[#182238] rounded-full overflow-hidden border border-[#334155]/80">
        <div
          className="h-full bg-gradient-to-r from-[#7657FF] via-[#3985FF] to-[#10B981] transition-all duration-700 ease-out rounded-full"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Five Stage Indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 pt-2">
        {PROGRESS_STAGES.map((stg, idx) => {
          const isDone = idx < currentStage;
          const isCurrent = idx === currentStage;
          const Icon = stg.icon;

          return (
            <div
              key={stg.id}
              className={`p-2.5 rounded-xl border text-center transition-all ${
                isDone
                  ? 'bg-[#10B981]/10 border-[#10B981]/30 text-[#10B981]'
                  : isCurrent
                  ? 'bg-[#7657FF]/20 border-[#7657FF] text-[#F8FAFC] shadow-sm'
                  : 'bg-[#121A2B]/40 border-[#334155]/40 text-[#64748B]'
              }`}
            >
              <div className="flex items-center justify-center mb-1">
                {isDone ? (
                  <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                ) : (
                  <Icon className={`w-4 h-4 ${isCurrent ? 'text-[#B49DFF] animate-pulse' : ''}`} />
                )}
              </div>
              <span className="text-[10px] font-semibold block leading-tight truncate">
                {stg.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AnalysisProgress;
