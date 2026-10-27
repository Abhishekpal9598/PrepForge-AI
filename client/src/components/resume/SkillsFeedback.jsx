import React from 'react';
import { 
  Code2, 
  Terminal, 
  Layers, 
  Cpu, 
  AlertTriangle, 
  CheckCircle2,
  HelpCircle,
  ShieldCheck
} from 'lucide-react';

/**
 * SkillsFeedback Component
 * Evaluates skill categories and highlights unevidenced skills.
 */
export const SkillsFeedback = ({ skillsAnalysis }) => {
  if (!skillsAnalysis) {
    return (
      <div className="p-6 text-center text-xs text-[#94A3B8] bg-[#0D1220] rounded-xl border border-[#334155]/60">
        Skills analysis not available for this resume.
      </div>
    );
  }

  const {
    technicalSkills = [],
    programmingLanguages = [],
    frameworksAndTools = [],
    domainSkills = [],
    skillsPresentation,
    missingEvidenceSkills = [],
    unsubstantiatedClaims = [],
  } = skillsAnalysis;

  // Render skill pills
  const renderSkillPills = (skills, colorClass = 'bg-[#1E293B] text-[#CBD5E1] border-[#334155]') => {
    if (!skills || skills.length === 0) {
      return <span className="text-xs text-[#64748B] italic">None identified</span>;
    }

    return (
      <div className="flex flex-wrap gap-1.5">
        {skills.map((skill, idx) => (
          <span
            key={idx}
            className={`text-xs px-2.5 py-1 rounded-lg border font-medium ${colorClass}`}
          >
            {skill}
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6 text-left">
      {/* Skills Presentation Overview */}
      {skillsPresentation && (
        <div className="p-4 rounded-xl bg-[#0D1220] border border-[#334155] space-y-1">
          <span className="text-xs font-semibold text-[#CBD5E1] flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#10B981]" /> Skills Organization & ATS Readability
          </span>
          <p className="text-xs text-[#94A3B8] leading-relaxed">
            {skillsPresentation}
          </p>
        </div>
      )}

      {/* Categorized Skills Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Programming Languages */}
        <div className="p-4 rounded-xl bg-[#0D1220] border border-[#334155] space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#F8FAFC] flex items-center gap-1.5">
              <Terminal className="w-4 h-4 text-[#7657FF]" /> Programming Languages
            </span>
            <span className="text-[10px] text-[#94A3B8] font-mono">
              {programmingLanguages.length}
            </span>
          </div>
          {renderSkillPills(programmingLanguages, 'bg-[#7657FF]/10 text-[#B49DFF] border-[#7657FF]/30')}
        </div>

        {/* Frameworks & Tools */}
        <div className="p-4 rounded-xl bg-[#0D1220] border border-[#334155] space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#F8FAFC] flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-[#3985FF]" /> Frameworks & Developer Tools
            </span>
            <span className="text-[10px] text-[#94A3B8] font-mono">
              {frameworksAndTools.length}
            </span>
          </div>
          {renderSkillPills(frameworksAndTools, 'bg-[#3985FF]/10 text-[#60A5FA] border-[#3985FF]/30')}
        </div>

        {/* Domain & Architecture */}
        <div className="p-4 rounded-xl bg-[#0D1220] border border-[#334155] space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#F8FAFC] flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-[#10B981]" /> Domain & System Architecture
            </span>
            <span className="text-[10px] text-[#94A3B8] font-mono">
              {domainSkills.length}
            </span>
          </div>
          {renderSkillPills(domainSkills, 'bg-[#10B981]/10 text-[#34D399] border-[#10B981]/30')}
        </div>

        {/* All Technical Skills */}
        <div className="p-4 rounded-xl bg-[#0D1220] border border-[#334155] space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#F8FAFC] flex items-center gap-1.5">
              <Code2 className="w-4 h-4 text-[#A78BFA]" /> All Extracted Technical Skills
            </span>
            <span className="text-[10px] text-[#94A3B8] font-mono">
              {technicalSkills.length}
            </span>
          </div>
          {renderSkillPills(technicalSkills, 'bg-[#1E293B] text-[#CBD5E1] border-[#334155]')}
        </div>
      </div>

      {/* Critical Verification Audit: Missing Evidence Skills */}
      {missingEvidenceSkills.length > 0 && (
        <div className="p-4 rounded-xl bg-[#F59E0B]/10 border border-[#F59E0B]/30 space-y-2 text-xs">
          <div className="flex items-center gap-2 text-[#F59E0B] font-bold">
            <AlertTriangle className="w-4 h-4" />
            <span>Unevidenced Skills Flagged ({missingEvidenceSkills.length})</span>
          </div>
          <p className="text-[#CBD5E1] leading-relaxed">
            These skills are explicitly listed in your skills section, but lack supporting context or proof in your work experience bullet points. Recruiters discount unproven buzzwords:
          </p>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {missingEvidenceSkills.map((skill, idx) => (
              <span
                key={idx}
                className="text-xs px-2.5 py-1 rounded-lg bg-[#F59E0B]/20 text-[#FDE68A] border border-[#F59E0B]/40 font-semibold"
              >
                ⚠️ {skill}
              </span>
            ))}
          </div>
          <p className="text-[11px] text-[#94A3B8] pt-1">
            <strong>Remedy:</strong> Integrate these tools directly into your employment bullet points to demonstrate production achievements.
          </p>
        </div>
      )}

      {/* Unsubstantiated Claims */}
      {unsubstantiatedClaims.length > 0 && (
        <div className="p-4 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/30 space-y-1.5 text-xs">
          <span className="font-bold text-[#F87171] flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4" /> Unsubstantiated Claims Detected
          </span>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {unsubstantiatedClaims.map((claim, idx) => (
              <span
                key={idx}
                className="text-xs px-2.5 py-1 rounded-lg bg-[#EF4444]/20 text-[#FECACA] border border-[#EF4444]/40"
              >
                {claim}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SkillsFeedback;
