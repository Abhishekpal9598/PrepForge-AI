import React from 'react';
import { 
  Sparkles, 
  AlertCircle, 
  ArrowRight, 
  Check, 
  Copy, 
  HelpCircle, 
  TrendingUp,
  Tag
} from 'lucide-react';

/**
 * Highlight bracketed placeholders like [X]%, $[Y], [Z] users
 */
export const highlightBracketedPlaceholders = (text) => {
  if (!text || typeof text !== 'string') return text;

  const parts = text.split(/(\$*\[[A-Za-z0-9_%$\s]+\]%*)/g);
  return parts.filter(Boolean).map((part, index) => {
    if (part.includes('[') && part.includes(']')) {
      return (
        <span
          key={index}
          className="inline-block px-1.5 py-0.2 mx-0.5 rounded font-mono font-bold text-[#F8FAFC] bg-[#7657FF] border border-[#B49DFF]/60 shadow-sm text-[11px]"
          title="Customizable metric placeholder: replace with your real accomplishment metric"
        >
          {part}
        </span>
      );
    }
    return part;
  });
};

/**
 * Priority badge helper
 */
const getPriorityBadge = (priority) => {
  switch (priority?.toLowerCase()) {
    case 'critical':
      return {
        bg: 'bg-[#EF4444]/15',
        text: 'text-[#F87171]',
        border: 'border-[#EF4444]/40',
        label: 'Critical Priority',
      };
    case 'high':
      return {
        bg: 'bg-[#F97316]/15',
        text: 'text-[#FB923C]',
        border: 'border-[#F97316]/40',
        label: 'High Priority',
      };
    case 'medium':
      return {
        bg: 'bg-[#F59E0B]/15',
        text: 'text-[#FBBF24]',
        border: 'border-[#F59E0B]/40',
        label: 'Medium Priority',
      };
    case 'low':
    default:
      return {
        bg: 'bg-[#3B82F6]/15',
        text: 'text-[#60A5FA]',
        border: 'border-[#3B82F6]/40',
        label: 'Low Priority',
      };
  }
};

/**
 * RecommendationCard Component
 * Displays AI-generated, prioritized, grounded resume improvements.
 */
export const RecommendationCard = ({ recommendation, index }) => {
  const [copied, setCopied] = React.useState(false);

  if (!recommendation) return null;

  const {
    priority = 'Medium',
    section = 'General',
    problem,
    whyItMatters,
    evidence,
    suggestedImprovement,
    expectedBenefit,
  } = recommendation;

  const priorityStyle = getPriorityBadge(priority);

  const handleCopyRewrite = () => {
    if (!suggestedImprovement) return;
    navigator.clipboard.writeText(suggestedImprovement);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-4 rounded-xl bg-[#0D1220] border border-[#334155]/80 hover:border-[#7657FF]/50 transition-all space-y-3.5 text-left">
      {/* Header Row: Priority Badge + Section Tag */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${priorityStyle.bg} ${priorityStyle.text} ${priorityStyle.border}`}>
            {priorityStyle.label}
          </span>
          <span className="text-[11px] font-medium text-[#CBD5E1] bg-[#1E293B] px-2 py-0.5 rounded-md border border-[#334155] flex items-center gap-1">
            <Tag className="w-3 h-3 text-[#7657FF]" />
            {section}
          </span>
        </div>

        {suggestedImprovement && (
          <button
            onClick={handleCopyRewrite}
            className="text-[11px] font-medium text-[#94A3B8] hover:text-[#B49DFF] transition-colors flex items-center gap-1 p-1 rounded hover:bg-[#1E293B]"
            title="Copy suggested rewrite"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-[#10B981]" />
                <span className="text-[#10B981]">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Rewrite</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Problem Title & Recruiter Context */}
      <div className="space-y-1">
        <h5 className="text-xs font-bold text-[#F8FAFC]">
          {problem}
        </h5>
        {whyItMatters && (
          <p className="text-[11px] text-[#94A3B8] leading-relaxed">
            <strong className="text-[#CBD5E1]">Why this matters:</strong> {whyItMatters}
          </p>
        )}
      </div>

      {/* Evidence Excerpt */}
      {evidence && (
        <div className="p-2.5 rounded-lg bg-[#182238]/80 border border-[#334155]/60 text-[11px] text-[#94A3B8]">
          <span className="text-[10px] font-bold uppercase text-[#CBD5E1] block mb-0.5">
            Original Resume Evidence:
          </span>
          <span className="italic font-mono">"{evidence}"</span>
        </div>
      )}

      {/* Suggested Improvement with Highlighted Placeholders */}
      {suggestedImprovement && (
        <div className="p-3 rounded-lg bg-[#7657FF]/10 border border-[#7657FF]/30 space-y-1">
          <span className="text-[10px] font-bold uppercase text-[#B49DFF] flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-[#7657FF]" /> Grounded AI Rewrite Recommendation:
          </span>
          <div className="text-xs text-[#F8FAFC] leading-relaxed font-sans">
            {highlightBracketedPlaceholders(suggestedImprovement)}
          </div>
        </div>
      )}

      {/* Expected Benefit */}
      {expectedBenefit && (
        <div className="flex items-start gap-1.5 text-[11px] text-[#10B981]">
          <TrendingUp className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <span>
            <strong>Impact:</strong> {expectedBenefit}
          </span>
        </div>
      )}
    </div>
  );
};

export default RecommendationCard;
