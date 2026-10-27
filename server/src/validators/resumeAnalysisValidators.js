import { z } from 'zod';

/**
 * Bullet point improvement schema
 */
export const bulletPointEvaluationSchema = z.object({
  original: z.string().min(1, 'Original bullet point is required'),
  issue: z.string().min(1, 'Critique or issue description is required'),
  rewrite: z.string().min(1, 'Recommended rewrite is required'),
  impact: z.string().min(1, 'Impact explanation is required'),
});

/**
 * Improvement suggestion schema
 */
export const improvementSuggestionSchema = z.object({
  priority: z.enum(['High', 'Medium', 'Low']).default('Medium'),
  section: z.string().min(1, 'Section name is required'),
  suggestion: z.string().min(1, 'Suggestion description is required'),
  actionableExample: z.string().optional().default(''),
});

/**
 * Section-wise recommendation item schema
 */
export const sectionRecommendationItemSchema = z.object({
  sectionName: z.string().min(1),
  status: z.enum(['Good', 'Needs Improvement', 'Missing', 'Optional']).default('Good'),
  feedback: z.string().min(1),
});

/**
 * 5-Category sub-scores (0-100)
 */
export const categoryScoresSchema = z.object({
  impact: z.coerce.number().min(0).max(100),
  brevity: z.coerce.number().min(0).max(100),
  style: z.coerce.number().min(0).max(100),
  skills: z.coerce.number().min(0).max(100),
  atsReadability: z.coerce.number().min(0).max(100),
});

/**
 * Work experience analysis schema
 */
export const workExperienceAnalysisSchema = z.object({
  summary: z.string().min(5),
  bulletPointsEvaluated: z.array(bulletPointEvaluationSchema).default([]),
  actionVerbStrength: z.enum(['Strong', 'Moderate', 'Weak']).default('Moderate'),
  quantifiableResultsPresent: z.boolean().default(false),
});

/**
 * Education analysis schema
 */
export const educationAnalysisSchema = z.object({
  summary: z.string().min(5),
  degreesFound: z.array(z.string()).default([]),
  institutionFound: z.boolean().default(false),
  recommendations: z.array(z.string()).default([]),
});

/**
 * Keyword optimization schema
 */
export const keywordOptimizationSchema = z.object({
  summary: z.string().min(5),
  highValueKeywordsFound: z.array(z.string()).default([]),
  suggestedKeywordsToAdd: z.array(z.string()).default([]),
});

/**
 * Formatting feedback schema
 */
export const formattingFeedbackSchema = z.object({
  isAtsFriendly: z.boolean().default(true),
  fontAndLayoutAdvice: z.string().default(''),
  sectionsIdentified: z.array(z.string()).default([]),
  potentialParsingRisks: z.array(z.string()).default([]),
});

/**
 * Complete ATS Resume Analysis Zod Schema
 * Enforces all 13 evaluation components required by Step 3.
 */
export const atsResumeAnalysisSchema = z.object({
  overallScore: z.coerce.number().min(0).max(100),
  resumeSummary: z.string().min(15, 'Resume summary must be at least 15 characters'),
  categoryScores: categoryScoresSchema,
  technicalSkills: z.array(z.string()).default([]),
  softSkills: z.array(z.string()).default([]),
  workExperienceAnalysis: workExperienceAnalysisSchema,
  educationAnalysis: educationAnalysisSchema,
  strengths: z.array(z.string()).min(1, 'At least one strength is required'),
  weaknesses: z.array(z.string()).min(1, 'At least one weakness or area of growth is required'),
  missingSkills: z.array(z.string()).default([]),
  keywordOptimization: keywordOptimizationSchema,
  formattingFeedback: formattingFeedbackSchema,
  improvementSuggestions: z.array(improvementSuggestionSchema).default([]),
  sectionWiseRecommendations: z.array(sectionRecommendationItemSchema).default([]),
  disclaimer: z.string().default(
    'ATS compatibility score is an estimation based on standard keyword, formatting, and structural parsing criteria. Individual employer ATS platforms may utilize proprietary algorithms.'
  ),
});

/**
 * Calculate deterministic overall ATS score based on explicit evaluation criteria:
 * - Impact: 25%
 * - Brevity: 20%
 * - Style: 15%
 * - Skills: 20%
 * - ATS Readability: 20%
 *
 * @param {object} categoryScores
 * @returns {number} Score bounded between 0 and 100
 */
export const calculateAtsCompositeScore = (categoryScores) => {
  if (!categoryScores || typeof categoryScores !== 'object') {
    return 70;
  }

  const impact = Math.max(0, Math.min(100, Number(categoryScores.impact) || 0));
  const brevity = Math.max(0, Math.min(100, Number(categoryScores.brevity) || 0));
  const style = Math.max(0, Math.min(100, Number(categoryScores.style) || 0));
  const skills = Math.max(0, Math.min(100, Number(categoryScores.skills) || 0));
  const atsReadability = Math.max(0, Math.min(100, Number(categoryScores.atsReadability) || 0));

  const weighted =
    impact * 0.25 +
    brevity * 0.20 +
    style * 0.15 +
    skills * 0.20 +
    atsReadability * 0.20;

  return Math.round(Math.max(0, Math.min(100, weighted)));
};

/**
 * Validate and normalize AI output
 *
 * @param {unknown} rawData
 * @returns {object} Validated and normalized ATS analysis object
 */
export const validateAtsAnalysis = (rawData) => {
  // Safe parse with Zod
  const result = atsResumeAnalysisSchema.safeParse(rawData);

  if (!result.success) {
    const errorMessages = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    const err = new Error(`AI response validation failed: ${errorMessages}`);
    err.code = 'INVALID_AI_SCHEMA';
    err.issues = result.error.issues;
    throw err;
  }

  const analysis = result.data;

  // Re-verify mathematical consistency of overall score
  const computedScore = calculateAtsCompositeScore(analysis.categoryScores);
  if (Math.abs(analysis.overallScore - computedScore) > 10) {
    analysis.overallScore = computedScore;
  }

  return analysis;
};

/**
 * Safe preprocessor for optional string array fields returned by AI models.
 * LLMs frequently return a single string (e.g. "Item") instead of a single-element array (["Item"])
 * when only one item applies.
 *
 * Rules:
 * - Missing (undefined) or null -> returns [] (preserving default empty array behavior)
 * - Single string -> converts to [trimmedString] (or [] if blank)
 * - Array -> preserved as-is for element-by-element string validation
 * - Unsupported types (numbers, objects, booleans) -> passed unchanged to z.array(z.string()) to fail with schema error
 */
export const safeStringListSchema = z.preprocess((val) => {
  if (val === undefined || val === null) {
    return [];
  }
  if (typeof val === 'string') {
    const trimmed = val.trim();
    return trimmed.length > 0 ? [trimmed] : [];
  }
  return val;
}, z.array(z.string()).default([]));

/**
 * Phase 5 Deep AI Analysis Schemas
 */
export const summaryEvaluationSchema = z.object({
  clarity: z.string().min(5),
  professionalRelevance: z.string().min(5),
  technicalRelevance: z.string().min(5),
  experienceRepresentation: z.string().min(5),
  genericLanguageDetected: safeStringListSchema,
  improvementOpportunities: safeStringListSchema,
  improvedSummary: z.string().nullable().default(null),
  sufficientEvidence: z.boolean().default(true),
});

export const weakStatementSchema = z.object({
  original: z.string().min(1, 'Original statement excerpt is required'),
  issue: z.string().min(1, 'Issue description is required'),
  suggestedImprovement: z.string().min(1, 'Suggested improvement with bracketed metrics is required'),
  expectedBenefit: z.string().min(1, 'Expected benefit explanation is required'),
});

export const experienceAnalysisSchema = z.object({
  responsibilityDescriptions: z.string().min(5),
  achievementDescriptions: z.string().min(5),
  actionVerbStrength: z.enum(['Strong', 'Moderate', 'Weak']).default('Moderate'),
  quantifiedImpact: z.string().min(5),
  technicalContributions: z.string().min(5),
  relevanceAndClarity: z.string().min(5),
  weakStatements: z.array(weakStatementSchema).default([]),
});

export const skillsAnalysisSchema = z.object({
  technicalSkills: z.array(z.string()).default([]),
  programmingLanguages: z.array(z.string()).default([]),
  frameworksAndTools: z.array(z.string()).default([]),
  domainSkills: z.array(z.string()).default([]),
  skillsPresentation: z.string().min(5),
  missingEvidenceSkills: safeStringListSchema,
  unsubstantiatedClaims: safeStringListSchema,
});

export const projectEvaluationItemSchema = z.object({
  title: z.string().min(1),
  technologiesUsed: safeStringListSchema,
  problemSolved: z.string().default('Not explicitly stated in resume project description'),
  implementationDetails: z.string().default('Implementation details omitted or brief'),
  outcomesAndImpact: z.string().default('Outcomes not quantified in original text'),
  missingTechnicalContext: z.string().default(''),
  suggestions: safeStringListSchema,
});

export const projectAnalysisSchema = z.object({
  projectCount: z.number().default(0),
  projectsEvaluated: z.array(projectEvaluationItemSchema).default([]),
  overallAssessment: z.string().min(5),
});

export const prioritizedRecommendationSchema = z.object({
  priority: z.enum(['Critical', 'High', 'Medium', 'Low']),
  section: z.string().min(1, 'Target section name is required'),
  problem: z.string().min(1, 'Problem description is required'),
  whyItMatters: z.string().min(1, 'Explanation of why it matters is required'),
  evidence: z.string().min(1, 'Exact supporting resume evidence is required'),
  suggestedImprovement: z.string().min(1, 'Suggested improvement is required'),
  expectedBenefit: z.string().min(1, 'Expected benefit is required'),
});

export const sectionFeedbackSchema = z.object({
  summary: z.string().default(''),
  experience: z.string().default(''),
  skills: z.string().default(''),
  projects: z.string().default(''),
  education: z.string().default(''),
});

export const antiHallucinationAuditSchema = z.object({
  groundedFactsObserved: z.number().default(0),
  bracketedMetricsTemplatesProvided: z.boolean().default(true),
  unverifiedClaimsFlagged: safeStringListSchema,
  insufficientEvidenceSections: safeStringListSchema,
  disclaimer: z.string().default(
    'All evaluations and recommendations are grounded strictly in the provided resume text. No candidate history, qualifications, or credentials have been fabricated.'
  ),
});

export const deepAiAnalysisSchema = z.object({
  summaryEvaluation: summaryEvaluationSchema,
  experienceAnalysis: experienceAnalysisSchema,
  skillsAnalysis: skillsAnalysisSchema,
  projectAnalysis: projectAnalysisSchema,
  improvementRecommendations: z.array(prioritizedRecommendationSchema).min(1, 'At least one recommendation is required'),
  strengths: z.array(z.string()).min(1, 'At least one strength is required'),
  weaknesses: z.array(z.string()).min(1, 'At least one weakness is required'),
  sectionFeedback: sectionFeedbackSchema,
  antiHallucinationAudit: antiHallucinationAuditSchema,
});

/**
 * Validate and normalize Phase 5 Deep AI Analysis response
 *
 * @param {unknown} rawData
 * @returns {object} Validated Deep AI Analysis object
 */
export const validateDeepAiAnalysis = (rawData) => {
  const result = deepAiAnalysisSchema.safeParse(rawData);

  if (!result.success) {
    const errorMessages = (result.error.issues || result.error.errors || [])
      .map((i) => `${(i.path || []).join('.')}: ${i.message}`)
      .join('; ');
    const err = new Error(`AI deep analysis validation failed: ${errorMessages}`);
    err.code = 'INVALID_AI_SCHEMA';
    err.issues = result.error.issues;
    throw err;
  }

  return result.data;
};

export default {
  atsResumeAnalysisSchema,
  calculateAtsCompositeScore,
  validateAtsAnalysis,
  safeStringListSchema,
  deepAiAnalysisSchema,
  validateDeepAiAnalysis,
};
