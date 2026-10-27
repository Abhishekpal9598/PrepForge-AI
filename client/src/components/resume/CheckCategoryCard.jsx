import React from 'react';
import { 
  ShieldCheck, 
  Layers, 
  FileText, 
  Briefcase, 
  AlertTriangle, 
  Scale, 
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import { getScoreTone, CATEGORY_META } from './resumeConstants.js';
export { CATEGORY_META };

const CATEGORY_ICONS = {
  'CAT-01': ShieldCheck,
  'CAT-02': Layers,
  'CAT-03': FileText,
  'CAT-04': Briefcase,
  'CAT-05': AlertTriangle,
  'CAT-06': Scale,
  'CAT-07': TrendingUp,
};

/**
 * CheckCategoryCard Component
 * Displays category summary, score, check counts, and interactive filter toggle.
 */
export const CheckCategoryCard = ({
  categoryId,
  categoryName,
  totalChecks = 0,
  passed = 0,
  warning = 0,
  failed = 0,
  notEvaluated = 0,
  score,
  isSelected = false,
  onClick,
}) => {
  const meta = CATEGORY_META[categoryId] || {
    name: categoryName || categoryId,
    icon: Layers,
    color: '#7657FF',
    description: '',
  };

  const Icon = CATEGORY_ICONS[categoryId] || Layers;
  const isBiasCategory = categoryId === 'CAT-06';
  const validScore = isBiasCategory ? null : (typeof score === 'number' && !isNaN(score) ? score : null);
  const tone = getScoreTone(validScore);

  return (
    <div
      onClick={onClick}
      className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer text-left space-y-3 ${
        isSelected
          ? 'bg-[#182238] border-[#7657FF] shadow-lg shadow-[#7657FF]/15 ring-2 ring-[#7657FF]/30'
          : 'bg-[#0D1220] border-[#334155]/80 hover:bg-[#151D2E] hover:border-[#475569]'
      }`}
    >
      {/* Category Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div
            className="p-2 rounded-lg border flex-shrink-0"
            style={{
              backgroundColor: `${meta.color}15`,
              borderColor: `${meta.color}40`,
              color: meta.color,
            }}
          >
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-[#F8FAFC] leading-tight">
              {meta.name}
            </h4>
            <span className="text-[10px] text-[#94A3B8] font-mono">
              {categoryId} • {totalChecks} {totalChecks === 1 ? 'Check' : 'Checks'}
            </span>
          </div>
        </div>

        {/* Score or Bias Neutral Badge */}
        {isBiasCategory ? (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#6366F1]/15 text-[#A5B4FC] border border-[#6366F1]/30">
            Advisory (0%)
          </span>
        ) : (
          <div className="text-right">
            <span className={`text-sm font-black ${tone.text}`}>
              {validScore !== null ? validScore : 'N/A'}
            </span>
            {validScore !== null && (
              <span className="text-[10px] text-[#94A3B8]">/100</span>
            )}
          </div>
        )}
      </div>

      {/* Check Status Counter Pills */}
      <div className="grid grid-cols-4 gap-1 pt-1 text-[10px] text-center font-semibold">
        <span className="px-1 py-0.5 rounded bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20">
          {passed} Pass
        </span>
        <span className="px-1 py-0.5 rounded bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/20">
          {warning} Warn
        </span>
        <span className="px-1 py-0.5 rounded bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/20">
          {failed} Fail
        </span>
        <span className="px-1 py-0.5 rounded bg-[#64748B]/10 text-[#94A3B8] border border-[#64748B]/20">
          {notEvaluated} N/E
        </span>
      </div>

      {/* Progress Bar */}
      {!isBiasCategory && (
        <div className="w-full h-1 bg-[#1E293B] rounded-full overflow-hidden border border-[#334155]">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${validScore !== null ? validScore : 0}%`,
              backgroundColor: tone.fill,
            }}
          />
        </div>
      )}
    </div>
  );
};

export default CheckCategoryCard;
