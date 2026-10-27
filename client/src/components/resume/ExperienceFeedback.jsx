import React, { useState } from 'react';
import { 
  Briefcase, 
  TrendingUp, 
  Sparkles, 
  AlertCircle, 
  Check, 
  Copy, 
  ArrowRight,
  Flame,
  Award
} from 'lucide-react';
import { highlightBracketedPlaceholders } from './RecommendationCard';

/**
 * ExperienceFeedback Component
 * Evaluates work experience bullet points, verb strengths, metrics, and rewrites.
 */
export const ExperienceFeedback = ({ experienceAnalysis }) => {
  const [copiedIndex, setCopiedIndex] = useState(null);

  if (!experienceAnalysis) {
    return (
      <div className="p-6 text-center text-xs text-[#94A3B8] bg-[#0D1220] rounded-xl border border-[#334155]/60">
        Work experience analysis not available for this resume.
      </div>
    );
  }

  const {
    responsibilityDescriptions,
    achievementDescriptions,
    actionVerbStrength = 'Moderate',
    quantifiedImpact,
    technicalContributions,
    relevanceAndClarity,
    weakStatements = [],
  } = experienceAnalysis;

  const handleCopy = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const verbTone = 
    actionVerbStrength === 'Strong'
      ? { text: 'text-[#10B981]', bg: 'bg-[#10B981]/15', border: 'border-[#10B981]/30' }
      : actionVerbStrength === 'Moderate'
      ? { text: 'text-[#F59E0B]', bg: 'bg-[#F59E0B]/15', border: 'border-[#F59E0B]/30' }
      : { text: 'text-[#EF4444]', bg: 'bg-[#EF4444]/15', border: 'border-[#EF4444]/30' };

  return (
    <div className="space-y-6 text-left">
      {/* High-level Experience Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Action Verb Strength Card */}
        <div className="p-4 rounded-xl bg-[#0D1220] border border-[#334155] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#CBD5E1] flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-[#F59E0B]" /> Action Verb Potency
            </span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${verbTone.bg} ${verbTone.text} ${verbTone.border}`}>
              {actionVerbStrength}
            </span>
          </div>
          <p className="text-xs text-[#94A3B8] leading-relaxed">
            {responsibilityDescriptions || 'Evaluates leadership verbs versus passive phrasing.'}
          </p>
        </div>

        {/* Quantified Metrics Impact Card */}
        <div className="p-4 rounded-xl bg-[#0D1220] border border-[#334155] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#CBD5E1] flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-[#10B981]" /> Measurable Outcomes & Metrics
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30">
              Metric Density
            </span>
          </div>
          <p className="text-xs text-[#94A3B8] leading-relaxed">
            {quantifiedImpact || achievementDescriptions || 'Evaluates percentage, latency, and business scale metrics.'}
          </p>
        </div>
      </div>

      {/* Technical Contributions & Progression Note */}
      {technicalContributions && (
        <div className="p-4 rounded-xl bg-[#121A2B] border border-[#334155]/80 space-y-1 text-xs">
          <span className="font-semibold text-[#B49DFF] flex items-center gap-1.5">
            <Award className="w-4 h-4 text-[#7657FF]" /> Technical Stack & Execution Scope
          </span>
          <p className="text-[#94A3B8] leading-relaxed">
            {technicalContributions}
          </p>
        </div>
      )}

      {/* Weak Statement Bullet Rewrites */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-[#F8FAFC] flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#7657FF]" />
            <span>High-Impact Bullet Point Rewrites</span>
            <span className="text-[10px] bg-[#1E293B] text-[#94A3B8] px-2 py-0.5 rounded-full border border-[#334155]">
              {weakStatements.length}
            </span>
          </h4>
          <span className="text-[11px] text-[#94A3B8]">
            Placeholders highlighted in purple
          </span>
        </div>

        {weakStatements.length === 0 ? (
          <div className="p-4 rounded-xl bg-[#0D1220] border border-[#334155]/60 text-xs text-[#94A3B8] text-center">
            No weak bullet statements flagged. Your experience bullets demonstrate strong action verbs and metrics.
          </div>
        ) : (
          <div className="space-y-3">
            {weakStatements.map((item, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl bg-[#0D1220] border border-[#334155]/80 space-y-3 hover:border-[#7657FF]/40 transition-all"
              >
                {/* Original vs Issue */}
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between text-[11px] text-[#EF4444] font-semibold">
                    <span className="flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> Original Phrasing (Needs Improvement)
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#182238] border border-[#334155]/60 text-[#CBD5E1] font-mono text-[11px]">
                    "{item.original}"
                  </div>
                  {item.issue && (
                    <p className="text-[11px] text-[#94A3B8] italic pt-0.5">
                      <strong>Critique:</strong> {item.issue}
                    </p>
                  )}
                </div>

                {/* Suggested Improvement Rewrite */}
                <div className="space-y-1 text-xs pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-[#10B981] font-semibold flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-[#10B981]" /> Recommended High-Impact Rewrite
                    </span>
                    <button
                      onClick={() => handleCopy(item.suggestedImprovement, idx)}
                      className="text-[11px] font-medium text-[#94A3B8] hover:text-[#B49DFF] flex items-center gap-1 p-1 rounded hover:bg-[#1E293B]"
                      title="Copy rewrite"
                    >
                      {copiedIndex === idx ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-[#10B981]" />
                          <span className="text-[#10B981]">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="p-3 rounded-lg bg-[#7657FF]/10 border border-[#7657FF]/30 text-xs text-[#F8FAFC] leading-relaxed">
                    {highlightBracketedPlaceholders(item.suggestedImprovement)}
                  </div>

                  {item.expectedBenefit && (
                    <div className="flex items-start gap-1 text-[11px] text-[#10B981] pt-1">
                      <TrendingUp className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                      <span>{item.expectedBenefit}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ExperienceFeedback;
