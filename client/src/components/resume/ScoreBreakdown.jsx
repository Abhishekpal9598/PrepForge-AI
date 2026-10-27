import React from 'react';
import { 
  X, 
  HelpCircle, 
  Info, 
  ShieldCheck, 
  Layers, 
  FileText, 
  Briefcase, 
  Scale, 
  CheckCircle2,
  AlertTriangle,
  Lock
} from 'lucide-react';
import { Modal } from '../Modal';
import { Badge } from '../Badge';

/**
 * ScoreBreakdown Component
 * Displays explainable scoring formulas, weights, and transparent calculations.
 */
export const ScoreBreakdown = ({ isOpen, onClose, scoringBreakdown, subScores, overallScore }) => {
  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Explainable Scoring Engine & Mathematical Formulas"
      size="lg"
    >
      <div className="space-y-6 text-left max-h-[75vh] overflow-y-auto pr-1">
        {/* Intro Banner */}
        <div className="p-4 rounded-xl bg-[#7657FF]/10 border border-[#7657FF]/30 flex items-start gap-3">
          <Info className="w-5 h-5 text-[#B49DFF] flex-shrink-0 mt-0.5" />
          <div className="text-xs text-[#CBD5E1] space-y-1">
            <p className="font-semibold text-[#F8FAFC]">
              Transparent, Deterministic, and Auditable Architecture
            </p>
            <p>
              PrepForge AI calculates resume scores strictly from the 27 deterministic checks.
              AI analysis provides qualitative diagnostic feedback, but never recalculates or overrules these mathematical formulas.
            </p>
          </div>
        </div>

        {/* 1. Overall Resume Score Formula */}
        <div className="p-4 rounded-xl bg-[#0D1220] border border-[#334155] space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-[#F8FAFC] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#7657FF]" />
              <span>Overall Resume Score (0–100)</span>
            </h4>
            <span className="text-sm font-black text-[#7657FF]">
              {overallScore !== null && overallScore !== undefined ? `${overallScore}/100` : 'N/A'}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-[#182238] font-mono text-xs text-[#B49DFF] border border-[#334155]/60">
            Overall = round( 0.35 × ATS + 0.35 × Content + 0.30 × Structure )
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="p-2 rounded bg-[#121A2B] border border-[#334155]/60 text-center">
              <span className="text-[10px] text-[#94A3B8] block">ATS (35%)</span>
              <span className="font-bold text-[#F8FAFC]">{subScores?.atsScore ?? 'N/A'}</span>
            </div>
            <div className="p-2 rounded bg-[#121A2B] border border-[#334155]/60 text-center">
              <span className="text-[10px] text-[#94A3B8] block">Content (35%)</span>
              <span className="font-bold text-[#F8FAFC]">{subScores?.contentScore ?? 'N/A'}</span>
            </div>
            <div className="p-2 rounded bg-[#121A2B] border border-[#334155]/60 text-center">
              <span className="text-[10px] text-[#94A3B8] block">Structure (30%)</span>
              <span className="font-bold text-[#F8FAFC]">{subScores?.structureScore ?? 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* 2. Sub-Score Formulas */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider">
            Sub-Score Mathematical Formulas
          </h4>

          {/* ATS Score */}
          <div className="p-3.5 rounded-xl bg-[#0D1220] border border-[#334155]/80 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-[#F8FAFC]">
              <span className="flex items-center gap-1.5 text-[#3985FF]">
                <ShieldCheck className="w-4 h-4" /> ATS Compatibility Score
              </span>
              <span className="font-bold">{subScores?.atsScore ?? 'N/A'} / 100</span>
            </div>
            <div className="p-2 rounded bg-[#182238] font-mono text-[11px] text-[#94A3B8]">
              ATS = round( 0.50 × Cat1_Score + 0.30 × Cat2_Presence + 0.20 × CHK10_FileFormat )
            </div>
            <p className="text-[11px] text-[#94A3B8]">
              * If CHK-01 (Document Parsing) fails, ATS score is hard-capped at ≤ 40 to reflect critical parser rejection.
            </p>
          </div>

          {/* Content Quality Score */}
          <div className="p-3.5 rounded-xl bg-[#0D1220] border border-[#334155]/80 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-[#F8FAFC]">
              <span className="flex items-center gap-1.5 text-[#10B981]">
                <FileText className="w-4 h-4" /> Content Quality Score
              </span>
              <span className="font-bold">{subScores?.contentScore ?? 'N/A'} / 100</span>
            </div>
            <div className="p-2 rounded bg-[#182238] font-mono text-[11px] text-[#94A3B8]">
              Content = round( 0.60 × Cat3_Content + 0.40 × Cat7_SeniorityImpact )
            </div>
            <p className="text-[11px] text-[#94A3B8]">
              Evaluates metric quantification, action verb potency, and demonstrable career progression.
            </p>
          </div>

          {/* Structure Score */}
          <div className="p-3.5 rounded-xl bg-[#0D1220] border border-[#334155]/80 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-[#F8FAFC]">
              <span className="flex items-center gap-1.5 text-[#F59E0B]">
                <Layers className="w-4 h-4" /> Structure Score
              </span>
              <span className="font-bold">{subScores?.structureScore ?? 'N/A'} / 100</span>
            </div>
            <div className="p-2 rounded bg-[#182238] font-mono text-[11px] text-[#94A3B8]">
              Structure = round( 0.25 × CHK09_Ordering + 0.75 × Cat5_RedFlags )
            </div>
            <p className="text-[11px] text-[#94A3B8]">
              Verifies chronological coherence, absence of inverted dates, and standard section hierarchy.
            </p>
          </div>

          {/* Job Match Score */}
          <div className="p-3.5 rounded-xl bg-[#0D1220] border border-[#334155]/80 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-[#F8FAFC]">
              <span className="flex items-center gap-1.5 text-[#A78BFA]">
                <Briefcase className="w-4 h-4" /> Conditional Job Match Score
              </span>
              <span className="font-bold">
                {subScores?.jobMatchScore !== null && subScores?.jobMatchScore !== undefined
                  ? `${subScores.jobMatchScore} / 100`
                  : 'N/A'}
              </span>
            </div>
            <div className="p-2 rounded bg-[#182238] font-mono text-[11px] text-[#94A3B8]">
              JobMatch = round( 0.40 × HardSkills + 0.25 × SoftSkills + 0.20 × ActionVerbs + 0.15 × Title )
            </div>
            <p className="text-[11px] text-[#94A3B8]">
              * Evaluated strictly when a target job description is provided. Displays N/A when omitted.
            </p>
          </div>
        </div>

        {/* 3. Bias Prevention & Contact Guarantee */}
        <div className="p-4 rounded-xl bg-[#121A2B] border border-[#334155] space-y-2 text-xs">
          <div className="flex items-center gap-2 text-[#10B981] font-semibold">
            <Scale className="w-4 h-4" />
            <span>Ethical Standards & Zero-Weight Bias Guarantee</span>
          </div>
          <p className="text-[#94A3B8] leading-relaxed">
            <strong>Category 6 (Bias Prevention — CHK-23 & CHK-24):</strong> Strictly carries 0% weight in all score formulas. Age indicators (graduation years &gt; 15 years ago) and employment gaps are reported neutrally as informational items and <em>never</em> penalize candidate scores.
          </p>
          <p className="text-[#94A3B8] leading-relaxed">
            <strong>Contact Info (CHK-08):</strong> Localized deductions apply only once: missing email (-20 pts), missing phone (-5 pts). Physical address omission carries zero deduction.
          </p>
        </div>
      </div>
    </Modal>
  );
};

export default ScoreBreakdown;
