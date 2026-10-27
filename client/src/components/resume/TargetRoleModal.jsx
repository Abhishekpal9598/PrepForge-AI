import React, { useState } from 'react';
import { Briefcase, FileText, Sparkles, X, Check } from 'lucide-react';
import { Modal } from '../Modal';
import { Button } from '../Button';

/**
 * TargetRoleModal Component
 * Modal allowing candidates to enter a target role or paste a job description.
 */
export const TargetRoleModal = ({
  isOpen,
  onClose,
  initialTargetRole = '',
  initialJobDescription = '',
  onSubmit,
  isLoading = false,
}) => {
  const [targetRole, setTargetRole] = useState(initialTargetRole);
  const [jobDescription, setJobDescription] = useState(initialJobDescription);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      targetRole: targetRole.trim() || undefined,
      jobDescription: jobDescription.trim() || undefined,
    });
  };

  const handleClear = () => {
    setTargetRole('');
    setJobDescription('');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Target Role & Job Description Alignment"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-left">
        <p className="text-xs text-[#94A3B8] leading-relaxed">
          Provide your target job title and paste the job posting to calculate your targeted <strong>Job Match Score</strong> and evaluate Category 4 tailoring checks (hard skills, soft skills, and keyword alignment).
        </p>

        {/* Target Job Title Input */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[#F8FAFC] flex items-center gap-1.5">
            <Briefcase className="w-3.5 h-3.5 text-[#7657FF]" />
            <span>Target Job Title</span>
          </label>
          <input
            type="text"
            placeholder="e.g. Senior Backend Engineer, Staff Architect"
            value={targetRole}
            onChange={(e) => setTargetRole(e.target.value)}
            className="w-full px-3.5 py-2 rounded-xl bg-[#0D1220] border border-[#334155] text-xs text-[#F8FAFC] placeholder:text-[#64748B] focus:border-[#7657FF] outline-none"
          />
        </div>

        {/* Job Description Textarea */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[#F8FAFC] flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-[#3985FF]" />
            <span>Target Job Description (JD)</span>
          </label>
          <textarea
            rows={6}
            placeholder="Paste requirements, responsibilities, and qualifications from the target job posting..."
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#0D1220] border border-[#334155] text-xs text-[#F8FAFC] placeholder:text-[#64748B] focus:border-[#7657FF] outline-none resize-y"
          />
          <div className="flex justify-between text-[11px] text-[#64748B]">
            <span>Leave empty to evaluate general ATS standards only.</span>
            <span>{jobDescription.length} characters</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-3 border-t border-[#334155]">
          <button
            type="button"
            onClick={handleClear}
            className="text-xs text-[#94A3B8] hover:text-[#EF4444] transition-colors"
          >
            Clear Inputs
          </button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isLoading}
              className="bg-gradient-to-r from-[#7657FF] to-[#3985FF] text-white font-semibold"
            >
              {isLoading ? 'Evaluating...' : 'Apply & Evaluate'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default TargetRoleModal;
