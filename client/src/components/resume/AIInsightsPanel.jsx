import React, { useState } from 'react';
import { 
  Sparkles, 
  ShieldCheck, 
  Award, 
  AlertTriangle, 
  CheckCircle2, 
  FileText, 
  Briefcase, 
  Terminal, 
  FolderGit2, 
  Lightbulb, 
  Info,
  Scale
} from 'lucide-react';
import { RecommendationCard } from './RecommendationCard';
import { ExperienceFeedback } from './ExperienceFeedback';
import { SkillsFeedback } from './SkillsFeedback';
import { ProjectFeedback } from './ProjectFeedback';

/**
 * AIInsightsPanel Component
 * Comprehensive AI Deep Intelligence Hub presenting grounded evaluations.
 */
export const AIInsightsPanel = ({ aiAnalysis, resumeFileName, onTriggerAnalysis, isAnalyzing }) => {
  const [subTab, setSubTab] = useState('recommendations');

  if (!aiAnalysis) {
    return (
      <div className="p-8 rounded-2xl bg-[#0D1220] border border-[#334155] text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-[#7657FF]/15 text-[#B49DFF] border border-[#7657FF]/30 flex items-center justify-center mx-auto">
          <Sparkles className="w-6 h-6" />
        </div>
        <div className="space-y-1 max-w-md mx-auto">
          <h4 className="text-base font-bold text-[#F8FAFC]">
            AI Deep Resume Intelligence Ready
          </h4>
          <p className="text-xs text-[#94A3B8]">
            Trigger Google Gemini to receive grounded bullet rewrites, anti-hallucination metric templates, and prioritized recommendations.
          </p>
        </div>
        {onTriggerAnalysis && (
          <button
            onClick={onTriggerAnalysis}
            disabled={isAnalyzing}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-[#7657FF] to-[#3985FF] text-white hover:opacity-95 shadow-lg shadow-[#7657FF]/25 transition-all inline-flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>{isAnalyzing ? 'Analyzing with AI...' : 'Run Deep AI Analysis'}</span>
          </button>
        )}
      </div>
    );
  }

  const {
    summaryEvaluation,
    experienceAnalysis,
    skillsAnalysis,
    projectAnalysis,
    improvementRecommendations = [],
    strengths = [],
    weaknesses = [],
    sectionFeedback,
    antiHallucinationAudit,
  } = aiAnalysis;

  const disclaimer = antiHallucinationAudit?.disclaimer || 
    'All evaluations and recommendations are grounded strictly in the provided resume text. No candidate history, qualifications, or credentials have been fabricated.';

  return (
    <div className="space-y-6 text-left">
      {/* 1. Anti-Hallucination & Ethical Audit Banner */}
      <div className="p-4 rounded-xl bg-[#10B981]/10 border border-[#10B981]/30 flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-[#10B981] flex-shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs text-[#CBD5E1]">
            <div className="flex items-center gap-2">
              <span className="font-bold text-[#F8FAFC]">
                Anti-Hallucination Guardrails Enforced
              </span>
              <span className="text-[10px] font-mono bg-[#10B981]/20 text-[#10B981] px-2 py-0.2 rounded-full border border-[#10B981]/30 font-semibold">
                Grounded Heuristics
              </span>
            </div>
            <p className="leading-relaxed text-[#94A3B8]">
              {disclaimer}
            </p>
          </div>
        </div>

        {antiHallucinationAudit && (
          <div className="flex items-center gap-2 text-xs text-[#CBD5E1]">
            <span className="px-2.5 py-1 rounded-lg bg-[#182238] border border-[#334155] font-mono">
              <strong className="text-[#10B981]">{antiHallucinationAudit.groundedFactsObserved || 0}</strong> Verified Facts
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-[#182238] border border-[#334155] font-mono">
              <strong className="text-[#7657FF]">[X]%</strong> Metric Templates
            </span>
          </div>
        )}
      </div>

      {/* 2. Strengths & Growth Areas Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Verified Strengths */}
        <div className="p-4 rounded-xl bg-[#0D1220] border border-[#334155] space-y-2">
          <h4 className="text-xs font-bold text-[#10B981] flex items-center gap-1.5 uppercase tracking-wider">
            <CheckCircle2 className="w-4 h-4" /> Observed Competitive Strengths ({strengths.length})
          </h4>
          <ul className="space-y-1.5 text-xs text-[#CBD5E1]">
            {strengths.map((s, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-[#10B981] mt-0.5">•</span>
                <span className="leading-relaxed">{s}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Growth Areas */}
        <div className="p-4 rounded-xl bg-[#0D1220] border border-[#334155] space-y-2">
          <h4 className="text-xs font-bold text-[#F59E0B] flex items-center gap-1.5 uppercase tracking-wider">
            <AlertTriangle className="w-4 h-4" /> Targeted Growth Areas ({weaknesses.length})
          </h4>
          <ul className="space-y-1.5 text-xs text-[#CBD5E1]">
            {weaknesses.map((w, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-[#F59E0B] mt-0.5">•</span>
                <span className="leading-relaxed">{w}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* 3. Sub-Navigation Tabs */}
      <div className="flex items-center gap-1.5 border-b border-[#334155]/80 pb-2 overflow-x-auto">
        <button
          onClick={() => setSubTab('recommendations')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
            subTab === 'recommendations'
              ? 'bg-[#7657FF]/20 text-[#B49DFF] border border-[#7657FF]/40'
              : 'text-[#94A3B8] hover:text-[#F8FAFC]'
          }`}
        >
          <Lightbulb className="w-3.5 h-3.5" />
          <span>Prioritized Recommendations</span>
          <span className="text-[10px] bg-[#1E293B] px-1.5 py-0.2 rounded-full border border-[#334155]">
            {improvementRecommendations.length}
          </span>
        </button>

        <button
          onClick={() => setSubTab('experience')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
            subTab === 'experience'
              ? 'bg-[#7657FF]/20 text-[#B49DFF] border border-[#7657FF]/40'
              : 'text-[#94A3B8] hover:text-[#F8FAFC]'
          }`}
        >
          <Briefcase className="w-3.5 h-3.5" />
          <span>Work Experience & Bullets</span>
        </button>

        <button
          onClick={() => setSubTab('skills')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
            subTab === 'skills'
              ? 'bg-[#7657FF]/20 text-[#B49DFF] border border-[#7657FF]/40'
              : 'text-[#94A3B8] hover:text-[#F8FAFC]'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>Skills Analysis</span>
        </button>

        <button
          onClick={() => setSubTab('projects')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
            subTab === 'projects'
              ? 'bg-[#7657FF]/20 text-[#B49DFF] border border-[#7657FF]/40'
              : 'text-[#94A3B8] hover:text-[#F8FAFC]'
          }`}
        >
          <FolderGit2 className="w-3.5 h-3.5" />
          <span>Projects</span>
        </button>

        <button
          onClick={() => setSubTab('summary')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
            subTab === 'summary'
              ? 'bg-[#7657FF]/20 text-[#B49DFF] border border-[#7657FF]/40'
              : 'text-[#94A3B8] hover:text-[#F8FAFC]'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Executive Summary</span>
        </button>
      </div>

      {/* 4. Active Sub-Tab View */}
      {subTab === 'recommendations' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-[#94A3B8]">
            <span>Ranked by severity and recruiter ATS scanning impact</span>
            <span>{improvementRecommendations.length} Recommendations</span>
          </div>

          {improvementRecommendations.length === 0 ? (
            <div className="p-6 text-center text-xs text-[#94A3B8] bg-[#0D1220] rounded-xl border border-[#334155]/60">
              No critical improvement recommendations flagged. Your resume demonstrates strong executive presentation.
            </div>
          ) : (
            <div className="space-y-3">
              {improvementRecommendations.map((rec, idx) => (
                <RecommendationCard key={idx} recommendation={rec} index={idx} />
              ))}
            </div>
          )}
        </div>
      )}

      {subTab === 'experience' && (
        <ExperienceFeedback experienceAnalysis={experienceAnalysis} />
      )}

      {subTab === 'skills' && (
        <SkillsFeedback skillsAnalysis={skillsAnalysis} />
      )}

      {subTab === 'projects' && (
        <ProjectFeedback projectAnalysis={projectAnalysis} />
      )}

      {subTab === 'summary' && summaryEvaluation && (
        <div className="space-y-4 text-xs">
          {/* Summary Evaluation Card */}
          <div className="p-5 rounded-xl bg-[#0D1220] border border-[#334155] space-y-3">
            <h4 className="font-bold text-[#F8FAFC] text-sm flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#7657FF]" />
              <span>Professional Summary Evaluation</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
              <div className="p-3 rounded-lg bg-[#121A2B] border border-[#334155]/60">
                <span className="text-[10px] font-bold text-[#94A3B8] uppercase block">Clarity & Focus</span>
                <p className="text-[#CBD5E1] mt-1">{summaryEvaluation.clarity}</p>
              </div>
              <div className="p-3 rounded-lg bg-[#121A2B] border border-[#334155]/60">
                <span className="text-[10px] font-bold text-[#94A3B8] uppercase block">Professional Relevance</span>
                <p className="text-[#CBD5E1] mt-1">{summaryEvaluation.professionalRelevance}</p>
              </div>
              <div className="p-3 rounded-lg bg-[#121A2B] border border-[#334155]/60">
                <span className="text-[10px] font-bold text-[#94A3B8] uppercase block">Technical Relevance</span>
                <p className="text-[#CBD5E1] mt-1">{summaryEvaluation.technicalRelevance}</p>
              </div>
              <div className="p-3 rounded-lg bg-[#121A2B] border border-[#334155]/60">
                <span className="text-[10px] font-bold text-[#94A3B8] uppercase block">Career Representation</span>
                <p className="text-[#CBD5E1] mt-1">{summaryEvaluation.experienceRepresentation}</p>
              </div>
            </div>

            {/* Generic Language Detected */}
            {summaryEvaluation.genericLanguageDetected?.length > 0 && (
              <div className="p-3 rounded-lg bg-[#F59E0B]/10 border border-[#F59E0B]/30 space-y-1">
                <span className="text-[10px] font-bold text-[#F59E0B] uppercase block">
                  Generic Clichés / Buzzwords Flagged:
                </span>
                <div className="flex flex-wrap gap-1">
                  {summaryEvaluation.genericLanguageDetected.map((w, idx) => (
                    <span key={idx} className="px-2 py-0.5 rounded bg-[#F59E0B]/20 text-[#FDE68A] text-[11px] font-mono">
                      "{w}"
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Improved Grounded Summary Rewrite */}
            {summaryEvaluation.improvedSummary && (
              <div className="p-4 rounded-lg bg-[#7657FF]/10 border border-[#7657FF]/30 space-y-1.5 pt-2">
                <span className="text-[10px] font-bold text-[#B49DFF] uppercase flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-[#7657FF]" /> Grounded Executive Summary Rewrite:
                </span>
                <p className="text-xs text-[#F8FAFC] leading-relaxed italic font-sans">
                  "{summaryEvaluation.improvedSummary}"
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AIInsightsPanel;
