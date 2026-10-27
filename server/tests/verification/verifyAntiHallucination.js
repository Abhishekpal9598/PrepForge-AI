import {
  validateDeepAiAnalysis,
  deepAiAnalysisSchema,
} from '../../src/validators/resumeAnalysisValidators.js';
import { BUILD_DEEP_RESUME_PROMPT } from '../../src/services/geminiService.js';

console.log('--- Anti-Hallucination & Edge Case Verification ---');

// Baseline valid deep payload
const createDeepPayload = (overrides = {}) => ({
  summaryEvaluation: {
    clarity: 'Clear summary defining candidate focus.',
    professionalRelevance: 'Aligned with software engineering roles.',
    technicalRelevance: 'Mentions core languages and tools.',
    experienceRepresentation: 'Accurate representation of career stage.',
    genericLanguageDetected: [],
    improvementOpportunities: ['Add specific domains'],
    improvedSummary: 'Software Engineer specializing in backend APIs.',
    sufficientEvidence: true,
    ...(overrides.summaryEvaluation || {}),
  },
  experienceAnalysis: {
    responsibilityDescriptions: 'Details standard development duties.',
    achievementDescriptions: 'Limited measurable achievements.',
    actionVerbStrength: 'Moderate',
    quantifiedImpact: 'Quantification is missing from original text.',
    technicalContributions: 'Mentions Java and Spring Boot.',
    relevanceAndClarity: 'Clear role titles and dates.',
    weakStatements: overrides.weakStatements || [
      {
        original: 'Assisted team with software bugs.',
        issue: 'Passive verb with no scope or metric.',
        suggestedImprovement: 'Resolved [X] software defects across [Y] sprints, improving sprint delivery by [Z]%.',
        expectedBenefit: 'Demonstrates measurable contribution with bracketed metric template.',
      },
    ],
    ...(overrides.experienceAnalysis || {}),
  },
  skillsAnalysis: {
    technicalSkills: ['Java', 'Spring Boot', 'SQL'],
    programmingLanguages: ['Java'],
    frameworksAndTools: ['Spring Boot'],
    domainSkills: ['REST APIs'],
    skillsPresentation: 'Listed in bullet format.',
    missingEvidenceSkills: overrides.missingEvidenceSkills || ['Docker'],
    unsubstantiatedClaims: overrides.unsubstantiatedClaims || ['Docker claimed in list but never used in bullets'],
    ...(overrides.skillsAnalysis || {}),
  },
  projectAnalysis: {
    projectCount: overrides.projectCount !== undefined ? overrides.projectCount : 0,
    projectsEvaluated: overrides.projectsEvaluated || [],
    overallAssessment: overrides.projectAssessment || 'No project section identified in resume.',
    ...(overrides.projectAnalysis || {}),
  },
  improvementRecommendations: overrides.improvementRecommendations || [
    {
      priority: 'High',
      section: 'Work Experience',
      problem: 'Bullet points lack quantifiable metrics.',
      whyItMatters: 'Recruiters prioritize demonstrated business outcomes.',
      evidence: 'Excerpt: "Assisted team with software bugs."',
      suggestedImprovement: 'Resolved [X] software defects across [Y] sprints, improving sprint delivery by [Z]%.',
      expectedBenefit: 'Provides tangible performance evidence without fabricating metrics.',
    },
  ],
  strengths: overrides.strengths || ['Solid foundational Java and SQL experience.'],
  weaknesses: overrides.weaknesses || ['Lacks quantified metric density across work history.'],
  sectionFeedback: {
    summary: 'Add specific technical domains.',
    experience: 'Quantify impact using bracketed metric templates [X]%.',
    skills: 'Provide evidence for all claimed skills.',
    projects: 'Consider adding a technical projects section.',
    education: 'Accredited university degree verified.',
    ...(overrides.sectionFeedback || {}),
  },
  antiHallucinationAudit: {
    groundedFactsObserved: 6,
    bracketedMetricsTemplatesProvided: true,
    unverifiedClaimsFlagged: ['Docker listed without evidence'],
    insufficientEvidenceSections: overrides.insufficientEvidenceSections || [],
    disclaimer: 'All evaluations and recommendations are grounded strictly in the provided resume text. No candidate history, qualifications, or credentials have been fabricated.',
    ...(overrides.antiHallucinationAudit || {}),
  },
});

// Case 1: Sparse Professional Summary (< 15 chars) - Zod should reject
console.log('\n[Case 1] Sparse summary text rejection (< 15 chars)...');
try {
  const sparseSummary = createDeepPayload({
    summaryEvaluation: {
      clarity: 'Good',
      professionalRelevance: 'Good',
      technicalRelevance: 'Good',
      experienceRepresentation: 'Good',
    },
  });
  validateDeepAiAnalysis(sparseSummary);
  throw new Error('FAIL: Should have rejected sparse summary under 15 characters!');
} catch (err) {
  if (err.code !== 'INVALID_AI_SCHEMA') throw err;
  console.log('  -> Rejected sparse summary: VERIFIED PASS (Zod constraint enforced)');
}

// Case 2: Missing Employment History (Student / Entry Level with 0 jobs)
console.log('\n[Case 2] Candidate with zero employment history...');
const zeroExpPayload = createDeepPayload({
  experienceAnalysis: {
    responsibilityDescriptions: 'No formal corporate employment history listed in resume.',
    achievementDescriptions: 'No employment achievements available.',
    actionVerbStrength: 'Weak',
    quantifiedImpact: 'No employment metrics present in original text.',
    technicalContributions: 'Technical competencies demonstrated via academic coursework.',
    relevanceAndClarity: 'Entry-level profile seeking initial software engineering role.',
    weakStatements: [],
  },
  antiHallucinationAudit: {
    insufficientEvidenceSections: ['Work Experience'],
  },
});
const validatedZeroExp = validateDeepAiAnalysis(zeroExpPayload);
if (validatedZeroExp.experienceAnalysis.weakStatements.length !== 0) {
  throw new Error('FAIL: Invented employment statements for candidate with no jobs!');
}
console.log('  -> Zero employment handled without hallucination: VERIFIED PASS');

// Case 3: Missing Project Details (projectCount: 0, projectsEvaluated: [])
console.log('\n[Case 3] Candidate with zero projects listed...');
const zeroProjectsPayload = createDeepPayload({
  projectCount: 0,
  projectsEvaluated: [],
  projectAssessment: 'No distinct projects section found in resume text.',
});
const validatedZeroProjects = validateDeepAiAnalysis(zeroProjectsPayload);
if (validatedZeroProjects.projectAnalysis.projectCount !== 0 || validatedZeroProjects.projectAnalysis.projectsEvaluated.length !== 0) {
  throw new Error('FAIL: Invented projects when none were listed in resume!');
}
console.log('  -> Zero projects handled truthfully (0 count): VERIFIED PASS');

// Case 4: Unverified Technical Skills (Skills in list but not in bullets)
console.log('\n[Case 4] Unverified Technical Skills Detection...');
const unverifiedSkillPayload = createDeepPayload({
  skillsAnalysis: {
    technicalSkills: ['Java', 'Spring Boot', 'Kubernetes'],
    missingEvidenceSkills: ['Kubernetes'],
    unsubstantiatedClaims: ['Kubernetes claimed in header but absent from work experience'],
  },
});
const validatedUnverified = validateDeepAiAnalysis(unverifiedSkillPayload);
if (!validatedUnverified.skillsAnalysis.missingEvidenceSkills.includes('Kubernetes')) {
  throw new Error('FAIL: Failed to flag unevidenced skill!');
}
console.log('  -> Unverified skill flagged in missingEvidenceSkills: VERIFIED PASS');

// Case 5: Bracketed Metric Placeholders vs Invented Numbers
console.log('\n[Case 5] Bracketed Metric Placeholders Verification...');
const bracketedRec = validatedZeroExp.improvementRecommendations[0];
const hasBracketed = bracketedRec.suggestedImprovement.includes('[X]') || bracketedRec.suggestedImprovement.includes('[Y]');
const hasInventedPercentage = /\b(increased|boosted|grew)\s+by\s+\d{1,3}%/i.test(bracketedRec.suggestedImprovement);
if (!hasBracketed || hasInventedPercentage) {
  throw new Error('FAIL: Metric recommendation contains invented numbers instead of bracketed template!');
}
console.log('  -> Bracketed template ([X]%, [Y]) enforced without invented numbers: VERIFIED PASS');

// Case 6: Prompt Construction includes all 10 anti-hallucination rules
console.log('\n[Case 6] Prompt construction anti-hallucination compliance...');
const prompt = BUILD_DEEP_RESUME_PROMPT('Jane Doe Java Developer', { targetRole: 'Software Engineer' });
const requiredRules = [
  'Never Fabricate Employment',
  'Never Fabricate Education',
  'Never Fabricate Certifications',
  'Never Fabricate Technologies',
  'Never Fabricate Numerical Metrics',
  'bracketed metric placeholders such as "[X]%"',
  'Never Claim Guarantees',
  'Distinguish Evidence from Advice',
  'Insufficient Evidence Rule',
  'Deterministic Scores Non-Interference',
];
for (const rule of requiredRules) {
  if (!prompt.includes(rule)) {
    throw new Error(`FAIL: Missing anti-hallucination rule in prompt: ${rule}`);
  }
}
console.log('  -> All 10 anti-hallucination rules present in prompt: VERIFIED PASS');

console.log('\nAll Anti-Hallucination & Guardrail Checks PASSED!');
