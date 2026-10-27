import React, { useState } from 'react';
import { 
  FileText, 
  User, 
  Briefcase, 
  GraduationCap, 
  Code, 
  FolderGit2, 
  Award, 
  Copy, 
  Check, 
  Layers,
  Search
} from 'lucide-react';

/**
 * ParsedSectionsView Component
 * Renders the Phase 2 segmented resume sections and raw text view.
 */
export const ParsedSectionsView = ({ resume }) => {
  const [copied, setCopied] = useState(false);
  const [activeSectionTab, setActiveSectionTab] = useState('sections');
  const [filterQuery, setFilterQuery] = useState('');

  if (!resume) return null;

  const parsedSections = resume.parsedSections || {};
  const rawText = resume.extractedText || resume.rawText || '';

  const handleCopyRaw = () => {
    navigator.clipboard.writeText(rawText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sectionsList = [
    { key: 'summary', title: 'Professional Summary', icon: User, content: parsedSections.summary },
    { key: 'experience', title: 'Work Experience', icon: Briefcase, content: parsedSections.experience },
    { key: 'skills', title: 'Skills & Competencies', icon: Code, content: parsedSections.skills },
    { key: 'education', title: 'Education & Credentials', icon: GraduationCap, content: parsedSections.education },
    { key: 'projects', title: 'Technical Projects', icon: FolderGit2, content: parsedSections.projects },
    { key: 'certifications', title: 'Certifications', icon: Award, content: parsedSections.certifications },
  ];

  const presentSections = sectionsList.filter(s => !!s.content && s.content.trim().length > 0);

  return (
    <div className="space-y-4 text-left">
      {/* Top Toggle: Formatted Sections vs Raw Extracted Text */}
      <div className="flex items-center justify-between border-b border-[#334155]/60 pb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSectionTab('sections')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeSectionTab === 'sections'
                ? 'bg-[#7657FF]/20 text-[#B49DFF] border border-[#7657FF]/40'
                : 'text-[#94A3B8] hover:text-[#F8FAFC]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Structured Sections ({presentSections.length})</span>
          </button>

          <button
            onClick={() => setActiveSectionTab('raw')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeSectionTab === 'raw'
                ? 'bg-[#7657FF]/20 text-[#B49DFF] border border-[#7657FF]/40'
                : 'text-[#94A3B8] hover:text-[#F8FAFC]'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Raw Extracted Text</span>
          </button>
        </div>

        <button
          onClick={handleCopyRaw}
          className="text-xs text-[#94A3B8] hover:text-[#F8FAFC] flex items-center gap-1 px-2.5 py-1 rounded bg-[#1E293B] border border-[#334155]"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-[#10B981]" />
              <span className="text-[#10B981]">Copied Text</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy Full Text</span>
            </>
          )}
        </button>
      </div>

      {/* Structured Sections View */}
      {activeSectionTab === 'sections' && (
        <div className="space-y-4">
          {presentSections.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#94A3B8] bg-[#0D1220] rounded-xl border border-[#334155]/60 space-y-2">
              <p>No discrete section headings recognized yet.</p>
              <p className="text-[11px] text-[#64748B]">
                View "Raw Extracted Text" tab to review document content parsed by the text extraction engine.
              </p>
            </div>
          ) : (
            presentSections.map((sec) => {
              const Icon = sec.icon;
              return (
                <div
                  key={sec.key}
                  className="p-4 rounded-xl bg-[#0D1220] border border-[#334155]/80 space-y-2 hover:border-[#475569] transition-all"
                >
                  <div className="flex items-center gap-2 pb-2 border-b border-[#334155]/40">
                    <div className="p-1.5 rounded-lg bg-[#7657FF]/15 text-[#B49DFF]">
                      <Icon className="w-4 h-4" />
                    </div>
                    <h4 className="text-xs font-bold text-[#F8FAFC]">
                      {sec.title}
                    </h4>
                  </div>
                  <div className="text-xs text-[#CBD5E1] whitespace-pre-wrap leading-relaxed font-sans pl-1">
                    {sec.content}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Raw Extracted Text View */}
      {activeSectionTab === 'raw' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] text-[#94A3B8]">
            <span>Clean normalized UTF-8 text extracted from {resume.originalFileName}</span>
            <span>{rawText.length} characters</span>
          </div>
          <pre className="p-4 rounded-xl bg-[#080B14] border border-[#334155] text-xs text-[#CBD5E1] whitespace-pre-wrap font-mono leading-relaxed max-h-[550px] overflow-y-auto">
            {rawText || 'No text extracted from document.'}
          </pre>
        </div>
      )}
    </div>
  );
};

export default ParsedSectionsView;
