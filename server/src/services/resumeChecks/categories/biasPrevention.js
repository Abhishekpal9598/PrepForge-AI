/**
 * PrepForge AI — Category 6: Bias and Discrimination Prevention Checks (CHK-23 & CHK-24)
 *
 * Strictly non-penalizing advisory checks designed to protect candidates against
 * unconscious hiring bias, ageism, and gap penalization.
 *
 * MANDATORY ETHICAL GUARDRAILS:
 * 1. CHK-23: Never infers candidate age; treats old graduation dates neutrally as informational advisory.
 * 2. CHK-24: Detects employment gaps neutrally without assuming they are problematic or penalizing.
 * 3. Status is strictly non-punitive (PASS with severity: 'info').
 */

import { formatCheckResult } from '../utils/resultFormatter.js';

/**
 * CHK-23: Age & Date Bias Mitigation
 */
export const checkAgeAndDateBias = (resumeData) => {
  const checkId = 'CHK-23';
  const categoryId = 'CAT-06';
  const title = 'Age & Date Bias Mitigation';
  const description = 'Protect candidates against unconscious age bias and identify unneeded demographic markers.';

  const currentYear = new Date().getFullYear();
  const education = resumeData?.parsedSections?.structured?.education || [];
  const fullText = (resumeData?.extractedText || resumeData?.rawText || '').toLowerCase();

  const advisoryNotes = [];
  const evidence = [];

  // Check for graduation dates > 15 years ago
  for (const edu of education) {
    const endYear = edu.dateRange?.endYear || edu.dateRange?.startYear;
    if (endYear && currentYear - endYear > 15) {
      evidence.push(`Graduation year: ${endYear} (>15 years ago)`);
      advisoryNotes.push('Graduation year is older than 15 years.');
    }
  }

  // Check for unnecessary personal demographic disclosures
  const demographicKeywords = ['marital status', 'married', 'single', 'religion', 'nationality', 'date of birth', 'dob', 'photo attached'];
  for (const kw of demographicKeywords) {
    if (new RegExp(`\\b${kw}\\b`, 'i').test(fullText)) {
      evidence.push(`Demographic marker detected: '${kw}'`);
      advisoryNotes.push(`Contains personal demographic detail: '${kw}'.`);
    }
  }

  if (evidence.length > 0) {
    return formatCheckResult({
      checkId,
      categoryId,
      title,
      status: 'PASS',
      severity: 'info',
      description,
      evidence,
      explanation: 'Informational advisory: Resume includes graduation dates or personal details that some career advisors recommend omitting to mitigate unconscious recruiter bias.',
      recommendation: 'Consider removing graduation years older than 15 years and personal demographic markers (marital status, DOB) to focus recruiters strictly on your qualifications.',
      confidence: 1.0,
      limitations: ['Strictly advisory and non-penalizing. Zero scoring penalty.'],
      source: 'deterministic',
    });
  }

  return formatCheckResult({
    checkId,
    categoryId,
    title,
    status: 'PASS',
    severity: 'info',
    description,
    evidence: ['No unneeded demographic markers or older graduation dates detected'],
    explanation: 'Document is free of personal demographic disclosures and older graduation markers.',
    recommendation: null,
    confidence: 1.0,
    limitations: ['Zero scoring penalty.'],
    source: 'deterministic',
  });
};

/**
 * CHK-24: Employment Gap Analysis
 */
export const checkEmploymentGaps = (resumeData) => {
  const checkId = 'CHK-24';
  const categoryId = 'CAT-06';
  const title = 'Employment Gap Analysis';
  const description = 'Identify unannotated employment gaps neutrally to suggest constructive framing.';

  const timeline = resumeData?.parsedSections?.structured?.timeline;
  const gaps = timeline?.gaps || [];

  if (gaps.length > 0) {
    const evidence = gaps.map(
      (g) => `Gap: ${g.startYear || 'N/A'} to ${g.endYear || 'N/A'} (~${g.durationMonths || '6+'} months)`
    );

    return formatCheckResult({
      checkId,
      categoryId,
      title,
      status: 'PASS',
      severity: 'info',
      description,
      evidence,
      explanation: 'A neutral career gap of >6 months was observed in your work chronology. Career gaps are common and natural (e.g., sabbatical, caregiving, relocation, continuing education).',
      recommendation: 'Consider adding a brief neutral one-line note (e.g., "Professional development sabbatical" or "Family leave") to clarify the timeline for human recruiters.',
      confidence: 1.0,
      limitations: ['Strictly neutral and non-penalizing. Zero scoring penalty.'],
      source: 'deterministic',
    });
  }

  return formatCheckResult({
    checkId,
    categoryId,
    title,
    status: 'PASS',
    severity: 'info',
    description,
    evidence: ['Continuous work history without unannotated intervals exceeding 6 months'],
    explanation: 'Work timeline is continuous without significant unannotated gaps.',
    recommendation: null,
    confidence: 0.95,
    limitations: ['Zero scoring deduction.'],
    source: 'deterministic',
  });
};

export default {
  checkAgeAndDateBias,
  checkEmploymentGaps,
};
