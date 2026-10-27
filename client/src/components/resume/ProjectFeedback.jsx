import React from 'react';
import { 
  FolderGit2, 
  Lightbulb, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight,
  Code,
  TrendingUp,
  Cpu
} from 'lucide-react';

/**
 * ProjectFeedback Component
 * Evaluates technical projects, problem framing, architecture, and suggested enhancements.
 */
export const ProjectFeedback = ({ projectAnalysis }) => {
  if (!projectAnalysis) {
    return (
      <div className="p-6 text-center text-xs text-[#94A3B8] bg-[#0D1220] rounded-xl border border-[#334155]/60">
        Project evaluation not available for this resume.
      </div>
    );
  }

  const {
    projectCount = 0,
    projectsEvaluated = [],
    overallAssessment,
  } = projectAnalysis;

  return (
    <div className="space-y-6 text-left">
      {/* Overall Assessment Header Card */}
      {overallAssessment && (
        <div className="p-4 rounded-xl bg-[#0D1220] border border-[#334155] space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#F8FAFC] flex items-center gap-1.5">
              <FolderGit2 className="w-4 h-4 text-[#7657FF]" /> Technical Project Portfolio Audit
            </span>
            <span className="text-xs font-mono font-semibold text-[#B49DFF] bg-[#1E293B] px-2 py-0.5 rounded border border-[#334155]">
              {projectCount} {projectCount === 1 ? 'Project' : 'Projects'} Identified
            </span>
          </div>
          <p className="text-xs text-[#94A3B8] leading-relaxed">
            {overallAssessment}
          </p>
        </div>
      )}

      {/* Projects List */}
      {projectsEvaluated.length === 0 ? (
        <div className="p-6 text-center text-xs text-[#94A3B8] bg-[#0D1220] rounded-xl border border-[#334155]/60">
          No distinct project descriptions identified in resume text. Adding technical projects with GitHub links significantly improves recruiter engagement.
        </div>
      ) : (
        <div className="space-y-4">
          {projectsEvaluated.map((proj, idx) => {
            const rawTech = proj.technologiesUsed;
            const techList = Array.isArray(rawTech) ? rawTech : (rawTech ? [String(rawTech)] : []);
            const rawSuggestions = proj.suggestions;
            const suggestionList = Array.isArray(rawSuggestions) ? rawSuggestions : (rawSuggestions ? [String(rawSuggestions)] : []);

            return (
              <div
                key={idx}
                className="p-5 rounded-xl bg-[#0D1220] border border-[#334155]/80 space-y-4 hover:border-[#7657FF]/40 transition-all"
              >
                {/* Project Title & Technologies */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#334155]/60">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-[#7657FF]/15 text-[#B49DFF] border border-[#7657FF]/30">
                      <FolderGit2 className="w-4 h-4" />
                    </div>
                    <h4 className="text-sm font-bold text-[#F8FAFC]">
                      {proj.title || `Project ${idx + 1}`}
                    </h4>
                  </div>

                  {techList.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {techList.map((t, tIdx) => (
                        <span
                          key={tIdx}
                          className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#182238] text-[#CBD5E1] border border-[#334155]"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Problem Solved & Implementation Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  {proj.problemSolved && (
                    <div className="p-3 rounded-lg bg-[#121A2B] border border-[#334155]/60 space-y-1">
                      <span className="text-[10px] font-bold uppercase text-[#94A3B8] block">
                        Problem Solved:
                      </span>
                      <p className="text-[#CBD5E1] leading-relaxed">
                        {proj.problemSolved}
                      </p>
                    </div>
                  )}

                  {proj.implementationDetails && (
                    <div className="p-3 rounded-lg bg-[#121A2B] border border-[#334155]/60 space-y-1">
                      <span className="text-[10px] font-bold uppercase text-[#94A3B8] block">
                        Architecture & Implementation:
                      </span>
                      <p className="text-[#CBD5E1] leading-relaxed">
                        {proj.implementationDetails}
                      </p>
                    </div>
                  )}
                </div>

                {/* Outcomes & Missing Context */}
                <div className="space-y-2 text-xs">
                  {proj.outcomesAndImpact && (
                    <div className="flex items-start gap-1.5 text-[#10B981]">
                      <TrendingUp className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>
                        <strong>Demonstrated Impact:</strong> {proj.outcomesAndImpact}
                      </span>
                    </div>
                  )}

                  {proj.missingTechnicalContext && (
                    <div className="flex items-start gap-1.5 text-[#F59E0B]">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>
                        <strong>Omitted Technical Context:</strong> {proj.missingTechnicalContext}
                      </span>
                    </div>
                  )}
                </div>

                {/* Suggestions */}
                {suggestionList.length > 0 && (
                  <div className="p-3 rounded-lg bg-[#7657FF]/10 border border-[#7657FF]/30 space-y-1.5 text-xs">
                    <span className="font-bold text-[#B49DFF] flex items-center gap-1.5">
                      <Lightbulb className="w-3.5 h-3.5 text-[#7657FF]" /> Suggestions for Improvement:
                    </span>
                    <ul className="list-disc list-inside space-y-1 text-[#CBD5E1]">
                      {suggestionList.map((s, sIdx) => (
                        <li key={sIdx} className="leading-relaxed">{s}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ProjectFeedback;
