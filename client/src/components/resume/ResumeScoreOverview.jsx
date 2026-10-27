import React from 'react';
import { 
  Award, 
  ShieldCheck, 
  FileText, 
  Layers, 
  Briefcase, 
  Clock, 
  HelpCircle,
  CheckCircle2,
  AlertTriangle,
  AlertCircle
} from 'lucide-react';
import { Badge } from '../Badge';
import { getScoreTone } from './resumeConstants.js';
export { getScoreTone };

/**
 * Circular Score Gauge Component
 */
const CircularScoreGauge = ({ score, size = 120, strokeWidth = 10, label = 'Overall Score' }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const validScore = typeof score === 'number' && !isNaN(score) ? Math.max(0, Math.min(100, score)) : null;
  const strokeDashoffset = validScore !== null ? circumference - (validScore / 100) * circumference : circumference;
  const tone = getScoreTone(validScore);

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="w-full h-full transform -rotate-90" viewBox={`0 0 ${size} ${size}`}>
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-[#1E293B] dark:text-[#182238]"
            fill="transparent"
          />
          {/* Foreground progress */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={tone.fill}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
            fill="transparent"
          />
        </svg>

        {/* Inner Label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className={`text-3xl font-extrabold tracking-tight ${tone.text}`}>
            {validScore !== null ? validScore : 'N/A'}
          </span>
          {validScore !== null && (
            <span className="text-[10px] uppercase font-semibold text-[#94A3B8] tracking-wider">
              / 100
            </span>
          )}
        </div>
      </div>
      <span className="mt-2 text-xs font-semibold text-[#F8FAFC]">{label}</span>
      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full mt-1 ${tone.bg} ${tone.text} border ${tone.border}`}>
        {tone.label}
      </span>
    </div>
  );
};

/**
 * Sub-score Card Component
 */
const SubScoreCard = ({ title, score, icon: Icon, weight, description }) => {
  const validScore = typeof score === 'number' && !isNaN(score) ? score : null;
  const tone = getScoreTone(validScore);

  return (
    <div className="p-4 rounded-xl bg-[#0D1220] border border-[#334155]/80 hover:border-[#475569] transition-all space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-[#7657FF]/15 text-[#B49DFF] border border-[#7657FF]/30">
            <Icon className="w-4 h-4" />
          </div>
          <span className="text-xs font-semibold text-[#F8FAFC]">{title}</span>
        </div>
        {weight && (
          <span className="text-[10px] font-medium text-[#94A3B8] bg-[#1E293B] px-1.5 py-0.5 rounded border border-[#334155]">
            Weight {weight}
          </span>
        )}
      </div>

      <div className="flex items-baseline justify-between pt-1">
        <div className="flex items-baseline gap-1">
          <span className={`text-2xl font-black ${tone.text}`}>
            {validScore !== null ? validScore : 'N/A'}
          </span>
          {validScore !== null && (
            <span className="text-[10px] font-semibold text-[#94A3B8]">/100</span>
          )}
        </div>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${tone.bg} ${tone.text} border ${tone.border}`}>
          {tone.label}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-1.5 bg-[#1E293B] rounded-full overflow-hidden border border-[#334155]">
        <div
          className="h-full transition-all duration-700 rounded-full"
          style={{
            width: `${validScore !== null ? validScore : 0}%`,
            backgroundColor: tone.fill,
          }}
        />
      </div>

      {description && (
        <p className="text-[11px] text-[#94A3B8] leading-tight pt-0.5">
          {description}
        </p>
      )}
    </div>
  );
};

/**
 * ResumeScoreOverview Component
 * Renders composite overall score, sub-scores, confidence, and timestamp.
 */
export const ResumeScoreOverview = ({
  overallScore,
  subScores,
  scoreConfidence,
  checkSummary,
  timestamp,
  modelUsed,
  onOpenBreakdown,
}) => {
  const ats = subScores?.atsScore;
  const content = subScores?.contentScore;
  const structure = subScores?.structureScore;
  const jobMatch = subScores?.jobMatchScore;

  const formattedDate = timestamp
    ? new Date(timestamp).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Not yet evaluated';

  const confidencePct =
    typeof scoreConfidence === 'number'
      ? Math.round(scoreConfidence * 100)
      : null;

  return (
    <div className="p-6 rounded-2xl bg-[#121A2B] border border-[#334155] shadow-xl space-y-6">
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#334155]/80">
        <div>
          <h2 className="text-base font-bold text-[#F8FAFC] flex items-center gap-2">
            <Award className="w-5 h-5 text-[#7657FF]" />
            <span>Multi-Dimensional Resume Intelligence</span>
          </h2>
          <div className="flex items-center gap-2 text-xs text-[#94A3B8] mt-0.5">
            <Clock className="w-3.5 h-3.5" />
            <span>Evaluated: {formattedDate}</span>
            {modelUsed && (
              <>
                <span>•</span>
                <span className="text-[#B49DFF] font-medium">{modelUsed}</span>
              </>
            )}
          </div>
        </div>

        {/* Confidence & Explainable Breakdown Trigger */}
        <div className="flex items-center gap-3">
          {confidencePct !== null && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#1E293B] border border-[#334155] text-xs">
              <ShieldCheck className="w-4 h-4 text-[#10B981]" />
              <span className="text-[#94A3B8]">Confidence:</span>
              <span className="font-bold text-[#F8FAFC]">{confidencePct}%</span>
            </div>
          )}

          {onOpenBreakdown && (
            <button
              onClick={onOpenBreakdown}
              className="px-3 py-1 text-xs font-semibold text-[#B49DFF] bg-[#7657FF]/15 border border-[#7657FF]/35 rounded-xl hover:bg-[#7657FF]/25 transition-colors flex items-center gap-1.5"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Score Breakdown</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Scoring Grid: Overall Gauge + 4 Sub-Scores */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        {/* Left: Overall Circular Score */}
        <div className="md:col-span-4 flex flex-col items-center justify-center p-4 rounded-xl bg-[#0D1220]/80 border border-[#334155]/60">
          <CircularScoreGauge score={overallScore} label="Overall Resume Score" />

          {/* Quick Check Summary Badges */}
          {checkSummary && (
            <div className="grid grid-cols-2 gap-2 w-full mt-4 pt-4 border-t border-[#334155]/60 text-[11px]">
              <div className="flex items-center justify-between px-2 py-1 rounded bg-[#10B981]/10 border border-[#10B981]/20 text-[#10B981]">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Pass
                </span>
                <span className="font-bold">{checkSummary.passedCount || 0}</span>
              </div>
              <div className="flex items-center justify-between px-2 py-1 rounded bg-[#F59E0B]/10 border border-[#F59E0B]/20 text-[#F59E0B]">
                <span className="flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Warn
                </span>
                <span className="font-bold">{checkSummary.warningCount || 0}</span>
              </div>
              <div className="flex items-center justify-between px-2 py-1 rounded bg-[#EF4444]/10 border border-[#EF4444]/20 text-[#EF4444]">
                <span className="flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Fail
                </span>
                <span className="font-bold">{checkSummary.failedCount || 0}</span>
              </div>
              <div className="flex items-center justify-between px-2 py-1 rounded bg-[#64748B]/10 border border-[#64748B]/20 text-[#94A3B8]">
                <span className="flex items-center gap-1">
                  <HelpCircle className="w-3 h-3" /> N/E
                </span>
                <span className="font-bold">{checkSummary.notEvaluatedCount || 0}</span>
              </div>
            </div>
          )}
        </div>

        {/* Right: 4 Sub-Scores Grid */}
        <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <SubScoreCard
            title="ATS Compatibility"
            score={ats}
            icon={ShieldCheck}
            weight="35%"
            description="Format, layout, core headings, and keyword readability"
          />

          <SubScoreCard
            title="Content Quality"
            score={content}
            icon={FileText}
            weight="35%"
            description="Bullet point strength, metrics, action verbs, and impact"
          />

          <SubScoreCard
            title="Structure Score"
            score={structure}
            icon={Layers}
            weight="30%"
            description="Logical ordering, contact presence, and recruiter red flags"
          />

          <SubScoreCard
            title="Job Match Score"
            score={jobMatch}
            icon={Briefcase}
            weight="Targeted"
            description={
              jobMatch !== null && jobMatch !== undefined
                ? "Skills, experience & title alignment with target job description"
                : "Enter a job description to calculate targeted keyword match"
            }
          />
        </div>
      </div>
    </div>
  );
};

export default ResumeScoreOverview;
