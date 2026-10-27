/**
 * PrepForge AI — Category 2: Resume Sections Checks (CHK-07 through CHK-09)
 *
 * Evaluates core section presence, contact channel completeness,
 * and standard recruiter scanning hierarchy.
 */

import { formatCheckResult } from '../utils/resultFormatter.js';

/**
 * CHK-07: Essential Section Presence
 */
export const checkEssentialSections = (resumeData) => {
  const checkId = 'CHK-07';
  const categoryId = 'CAT-02';
  const title = 'Essential Section Presence';
  const description = 'Verify presence of the four foundational resume pillars: Contact, Experience, Education, and Skills.';

  const missingCore = resumeData?.parsedSections?.missingCoreSections || [];
  const detected = resumeData?.parsedSections?.detectedSections || [];
  const detectedKeys = detected.map((s) => s.canonicalKey);

  // Consider technicalSkills or softSkills as fulfilling skills
  const hasSkills = detectedKeys.includes('technicalSkills') || detectedKeys.includes('softSkills') || detectedKeys.includes('skills');
  const missing = missingCore.filter((sec) => !(sec === 'technicalSkills' && hasSkills));

  if (missing.length > 0) {
    return formatCheckResult({
      checkId,
      categoryId,
      title,
      status: 'FAIL',
      severity: 'critical',
      description,
      evidence: missing.map((s) => `Missing required section: ${s}`),
      explanation: `Resume is missing foundational structural sections: ${missing.join(', ')}. ATS systems expect explicit headings to index candidate qualifications.`,
      recommendation: 'Add clear standard headings: Professional Experience, Education, and Skills.',
      confidence: 1.0,
      limitations: ['Recognizes industry-standard section headings.'],
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
    evidence: detectedKeys,
    explanation: 'All foundational pillars (Contact, Experience, Education, and Skills) are clearly represented.',
    recommendation: null,
    confidence: 1.0,
    limitations: [],
    source: 'deterministic',
  });
};

/**
 * CHK-08: Contact Information Completeness
 */
export const checkContactCompleteness = (resumeData) => {
  const checkId = 'CHK-08';
  const categoryId = 'CAT-02';
  const title = 'Contact Information Completeness';
  const description = 'Ensure recruiters have primary and secondary channels to contact the candidate.';

  const contact = resumeData?.parsedSections?.structured?.contact || {};
  const hasEmail = Boolean(contact.email && contact.email.trim());
  const hasPhone = Boolean(contact.phone && contact.phone.trim());
  const location = contact.location || null;

  const missing = [];
  const found = [];

  if (hasEmail) found.push(`Email: ${contact.email}`);
  else missing.push('Email');

  if (hasPhone) found.push(`Phone: ${contact.phone}`);
  else missing.push('Phone number');

  if (location) found.push(`Location: ${location}`);

  // Missing email is a critical contact failure
  if (!hasEmail) {
    return formatCheckResult({
      checkId,
      categoryId,
      title,
      status: 'FAIL',
      severity: 'high',
      description,
      evidence: missing,
      explanation: 'Primary contact email is missing. Recruiters cannot reach out without a valid email address.',
      recommendation: 'Add your email address prominently in the header section.',
      confidence: 1.0,
      limitations: ['Physical street address is strictly optional and not required.'],
      source: 'deterministic',
    });
  }

  // Missing phone is secondary: triggers warning, never global ATS hard-cap
  if (!hasPhone) {
    return formatCheckResult({
      checkId,
      categoryId,
      title,
      status: 'WARNING',
      severity: 'high',
      description,
      evidence: ['Missing phone number', ...found],
      explanation: 'No telephone number was found in the header. While email is present, recruiters frequently schedule phone screens via direct call or SMS.',
      recommendation: 'Include a direct mobile phone number in your header.',
      confidence: 1.0,
      limitations: ['Physical street address is strictly optional and not required.'],
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
    evidence: found,
    explanation: 'Complete contact channels (email and phone) are present. Physical address is properly treated as optional.',
    recommendation: null,
    confidence: 1.0,
    limitations: [],
    source: 'deterministic',
  });
};

/**
 * CHK-09: Section Structural Ordering
 */
export const checkSectionOrdering = (resumeData) => {
  const checkId = 'CHK-09';
  const categoryId = 'CAT-02';
  const title = 'Section Structural Ordering';
  const description = 'Verify resume content follows traditional recruiter scanning hierarchy.';

  const sectionOrder = resumeData?.parsedSections?.sectionOrder || [];

  if (sectionOrder.length < 2) {
    return formatCheckResult({
      checkId,
      categoryId,
      title,
      status: 'PASS',
      severity: 'info',
      description,
      evidence: sectionOrder,
      explanation: 'Minimal section structure detected.',
      recommendation: null,
      confidence: 0.8,
      limitations: [],
      source: 'deterministic',
    });
  }

  const contactIdx = sectionOrder.indexOf('contact');
  const expIdx = sectionOrder.indexOf('experience');
  const eduIdx = sectionOrder.indexOf('education');
  const skillsIdx = sectionOrder.findIndex((s) => s.includes('skills') || s === 'technicalSkills');

  const issues = [];

  // Contact should not be placed at the very end
  if (contactIdx > 0 && contactIdx === sectionOrder.length - 1) {
    issues.push('Contact info is placed at the bottom of the document');
  }

  // If experience and education both exist, skills placed before contact is unusual
  if (contactIdx > 0 && skillsIdx >= 0 && skillsIdx < contactIdx) {
    issues.push('Skills section appears before header contact info');
  }

  if (issues.length > 0) {
    return formatCheckResult({
      checkId,
      categoryId,
      title,
      status: 'WARNING',
      severity: 'low',
      description,
      evidence: issues,
      explanation: 'Section sequence deviates from standard recruiter scanning hierarchy.',
      recommendation: 'Organize sections in traditional order: Header / Contact -> Summary -> Experience -> Education -> Skills.',
      confidence: 0.85,
      limitations: ['Permits student/entry-level layouts where Education precedes Experience.'],
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
    evidence: [`Sequence: ${sectionOrder.join(' -> ')}`],
    explanation: 'Section sequence adheres to conventional recruiter scanning hierarchy.',
    recommendation: null,
    confidence: 0.95,
    limitations: [],
    source: 'deterministic',
  });
};

export default {
  checkEssentialSections,
  checkContactCompleteness,
  checkSectionOrdering,
};
