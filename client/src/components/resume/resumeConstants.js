/**
 * PrepForge AI — Resume Intelligence Frontend Constants & Formatters
 */

/**
 * Score color mapping & tone helper
 */
export const getScoreTone = (score) => {
  if (score === null || score === undefined || typeof score !== 'number' || isNaN(score)) {
    return {
      text: 'text-[#94A3B8]',
      bg: 'bg-[#64748B]/10',
      border: 'border-[#64748B]/30',
      fill: '#64748B',
      label: 'Not Evaluated',
    };
  }
  if (score >= 80) {
    return {
      text: 'text-[#10B981]',
      bg: 'bg-[#10B981]/10',
      border: 'border-[#10B981]/30',
      fill: '#10B981',
      label: 'Strong',
    };
  }
  if (score >= 65) {
    return {
      text: 'text-[#F59E0B]',
      bg: 'bg-[#F59E0B]/10',
      border: 'border-[#F59E0B]/30',
      fill: '#F59E0B',
      label: 'Moderate',
    };
  }
  return {
    text: 'text-[#EF4444]',
    bg: 'bg-[#EF4444]/10',
    border: 'border-[#EF4444]/30',
    fill: '#EF4444',
    label: 'Needs Work',
  };
};

/**
 * Check Status Configuration Helper
 */
export const getStatusConfig = (status) => {
  switch (status) {
    case 'PASS':
      return {
        label: 'Passed',
        badgeClass: 'bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30',
        textClass: 'text-[#10B981]',
        bgClass: 'bg-[#10B981]/5',
        borderClass: 'border-[#10B981]/25',
      };
    case 'WARNING':
      return {
        label: 'Warning',
        badgeClass: 'bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/30',
        textClass: 'text-[#F59E0B]',
        bgClass: 'bg-[#F59E0B]/5',
        borderClass: 'border-[#F59E0B]/25',
      };
    case 'FAIL':
      return {
        label: 'Failed',
        badgeClass: 'bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/30',
        textClass: 'text-[#EF4444]',
        bgClass: 'bg-[#EF4444]/5',
        borderClass: 'border-[#EF4444]/25',
      };
    case 'NOT_EVALUATED':
    default:
      return {
        label: 'Not Evaluated',
        badgeClass: 'bg-[#64748B]/15 text-[#94A3B8] border-[#64748B]/30',
        textClass: 'text-[#94A3B8]',
        bgClass: 'bg-[#64748B]/5',
        borderClass: 'border-[#64748B]/25',
      };
  }
};

/**
 * Check Severity Badge Helper
 */
export const getSeverityBadge = (severity) => {
  const map = {
    critical: 'bg-[#EF4444]/15 text-[#F87171] border-[#EF4444]/30',
    high: 'bg-[#F97316]/15 text-[#FB923C] border-[#F97316]/30',
    medium: 'bg-[#F59E0B]/15 text-[#FBBF24] border-[#F59E0B]/30',
    low: 'bg-[#3B82F6]/15 text-[#60A5FA] border-[#3B82F6]/30',
    info: 'bg-[#6366F1]/15 text-[#A5B4FC] border-[#6366F1]/30',
  };
  return map[severity?.toLowerCase()] || map.info;
};

/**
 * Parse bracketed placeholders ($[Y], [X]%, [Z] users) into discrete token objects
 */
export const parseBracketedTokens = (text) => {
  if (!text || typeof text !== 'string') return [];

  const parts = text.split(/(\$*\[[A-Za-z0-9_%$\s]+\]%*)/g);
  return parts.filter(Boolean).map((part) => ({
    text: part,
    isPlaceholder: part.includes('[') && part.includes(']'),
  }));
};

/**
 * Seven Category Metadata
 */
export const CATEGORY_META = {
  'CAT-01': {
    name: 'ATS Essentials',
    color: '#3985FF',
    description: 'Document parseability, file format, word count, and contact completeness',
  },
  'CAT-02': {
    name: 'Resume Sections',
    color: '#7657FF',
    description: 'Heading recognition, section presence, and standard ordering',
  },
  'CAT-03': {
    name: 'Resume Content',
    color: '#10B981',
    description: 'Measurable metrics, action verb density, bullet length, and repetition',
  },
  'CAT-04': {
    name: 'Job Tailoring',
    color: '#F59E0B',
    description: 'Hard skills match, soft skills context, and target role alignment',
  },
  'CAT-05': {
    name: 'Recruiter Red Flags',
    color: '#EF4444',
    description: 'Timeline discrepancies, excessive passive attribution, and claims coherence',
  },
  'CAT-06': {
    name: 'Bias Prevention',
    color: '#6366F1',
    description: 'Neutral age indicators and career gap review (0% score weight guarantee)',
  },
  'CAT-07': {
    name: 'Seniority & Impact',
    color: '#EC4899',
    description: 'Career progression, technical bullet demonstration, and leadership markers',
  },
};

/**
 * 5 Sequential Stages of Analysis Progress
 */
export const PROGRESS_STAGES = [
  { id: 1, label: 'Document Parsing & Structure', detail: 'Normalizing text and segmenting headings' },
  { id: 2, label: '27-Point Rule Engine', detail: 'Executing ATS, content, red flag, and bias checks' },
  { id: 3, label: 'Multi-Dimensional Scoring', detail: 'Computing ATS, Content, Structure & Overall composite scores' },
  { id: 4, label: 'Google Gemini AI Intelligence', detail: 'Evaluating bullet action verbs, impact, and system architecture' },
  { id: 5, label: 'Synthesizing Recommendations', detail: 'Generating grounded rewrites with bracketed metric placeholders' },
];

export default {
  getScoreTone,
  getStatusConfig,
  getSeverityBadge,
  parseBracketedTokens,
  CATEGORY_META,
  PROGRESS_STAGES,
};
