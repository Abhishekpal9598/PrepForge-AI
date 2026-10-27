import { z } from 'zod';
import mongoose from 'mongoose';

/**
 * Validates request payload for POST /api/v1/jobs/analyze
 */
export const jobAnalysisInputSchema = z.object({
  resumeId: z.string().refine(
    (val) => mongoose.Types.ObjectId.isValid(val),
    'Valid resume ID is required'
  ),
  jobTitle: z.string().trim().min(2, 'Job title must be at least 2 characters').max(150, 'Job title cannot exceed 150 characters'),
  companyName: z.string().trim().max(150, 'Company name cannot exceed 150 characters').optional().default(''),
  location: z.string().trim().max(150, 'Location cannot exceed 150 characters').optional().default(''),
  jobDescription: z.string().trim().min(50, 'Job description must be at least 50 characters').max(50000, 'Job description cannot exceed 50,000 characters'),
});

/**
 * Experience assessment sub-schema
 */
export const experienceMatchSchema = z.object({
  status: z.enum(['Exceeds', 'Meets', 'Partially Meets', 'Below']).default('Meets'),
  candidateExperienceSummary: z.string().default(''),
  requiredExperienceSummary: z.string().default(''),
  assessment: z.string().min(1, 'Experience assessment is required'),
});

/**
 * Education assessment sub-schema
 */
export const educationMatchSchema = z.object({
  status: z.enum(['Meets', 'Partially Meets', 'Below']).default('Meets'),
  candidateEducation: z.string().default(''),
  requiredEducation: z.string().default(''),
  assessment: z.string().min(1, 'Education assessment is required'),
});

/**
 * Keyword overlap sub-schema
 */
export const keywordOverlapSchema = z.object({
  highValueKeywordsFound: z.array(z.string()).default([]),
  missingKeywords: z.array(z.string()).default([]),
  overlapPercentage: z.coerce.number().min(0).max(100).default(70),
});

/**
 * Relevant resume section sub-schema
 */
export const relevantResumeSectionSchema = z.object({
  sectionTitle: z.string().min(1),
  excerpt: z.string().min(1),
  relevance: z.string().min(1),
});

/**
 * Tailoring recommendation sub-schema
 */
export const tailoringRecommendationSchema = z.object({
  priority: z.enum(['High', 'Medium', 'Low']).default('Medium'),
  area: z.string().min(1),
  recommendation: z.string().min(1),
});

/**
 * Category match sub-scores (0-100)
 * Weighted: Skills 40%, Experience 30%, Education 15%, Scope/Keywords 15%
 */
export const matchCategoryScoresSchema = z.object({
  skillsMatch: z.coerce.number().min(0).max(100),
  experienceMatch: z.coerce.number().min(0).max(100),
  educationMatch: z.coerce.number().min(0).max(100),
  scopeAndKeywords: z.coerce.number().min(0).max(100),
});

/**
 * Extracted Job Description Requirements sub-schema (Step 3)
 */
export const extractedJobRequirementsSchema = z.object({
  seniorityLevel: z.string().default('Mid-Level'),
  requiredTechnicalSkills: z.array(z.string()).default([]),
  preferredTechnicalSkills: z.array(z.string()).default([]),
  softSkills: z.array(z.string()).default([]),
  requiredExperience: z.string().default(''),
  educationRequirements: z.string().default(''),
  keyResponsibilities: z.array(z.string()).default([]),
  importantKeywords: z.array(z.string()).default([]),
});

/**
 * Complete AI Job Description & Resume Match Output Schema (Step 3 & Step 4)
 */
export const aiJobMatchSchema = z.object({
  matchScore: z.coerce.number().min(0).max(100),
  matchSummary: z.string().min(15, 'Match summary must be at least 15 characters'),
  categoryScores: matchCategoryScoresSchema,
  jobRequirements: extractedJobRequirementsSchema,
  matchedSkills: z.array(z.string()).default([]),
  missingRequiredSkills: z.array(z.string()).default([]),
  missingPreferredSkills: z.array(z.string()).default([]),
  experienceAnalysis: experienceMatchSchema,
  educationAnalysis: educationMatchSchema,
  keywordOverlap: keywordOverlapSchema,
  relevantResumeSections: z.array(relevantResumeSectionSchema).default([]),
  strengthsForThisJob: z.array(z.string()).min(1, 'At least one role strength is required'),
  weaknessesAndGaps: z.array(z.string()).min(1, 'At least one gap or area of growth is required'),
  improvementRecommendations: z.array(tailoringRecommendationSchema).default([]),
  disclaimer: z.string().default(
    'This match score is an estimation based on semantic skill and experience alignment. It does not guarantee recruiter decisions or universal ATS screening outcomes.'
  ),
});

/**
 * Calculate deterministic overall job match score based on explicit evaluation criteria:
 * - Skills Match: 40%
 * - Experience Match: 30%
 * - Education Match: 15%
 * - Scope & Keyword Overlap: 15%
 *
 * @param {object} categoryScores
 * @returns {number} Score bounded between 0 and 100
 */
export const calculateJobMatchCompositeScore = (categoryScores) => {
  if (!categoryScores || typeof categoryScores !== 'object') {
    return 70;
  }

  const skills = Math.max(0, Math.min(100, Number(categoryScores.skillsMatch) || 0));
  const experience = Math.max(0, Math.min(100, Number(categoryScores.experienceMatch) || 0));
  const education = Math.max(0, Math.min(100, Number(categoryScores.educationMatch) || 0));
  const keywords = Math.max(0, Math.min(100, Number(categoryScores.scopeAndKeywords) || 0));

  const weighted =
    skills * 0.40 +
    experience * 0.30 +
    education * 0.15 +
    keywords * 0.15;

  return Math.round(Math.max(0, Math.min(100, weighted)));
};

/**
 * Validate and normalize AI Job Match output
 *
 * @param {unknown} rawData
 * @returns {object} Validated and normalized Job Match object
 */
export const validateAiJobMatch = (rawData) => {
  const result = aiJobMatchSchema.safeParse(rawData);

  if (!result.success) {
    const errorMessages = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    const err = new Error(`AI job match response validation failed: ${errorMessages}`);
    err.code = 'INVALID_AI_SCHEMA';
    err.issues = result.error.issues;
    throw err;
  }

  const matchData = result.data;

  // Re-verify mathematical consistency of overall score
  const computedScore = calculateJobMatchCompositeScore(matchData.categoryScores);
  if (Math.abs(matchData.matchScore - computedScore) > 10) {
    matchData.matchScore = computedScore;
  }

  return matchData;
};

export default {
  jobAnalysisInputSchema,
  aiJobMatchSchema,
  calculateJobMatchCompositeScore,
  validateAiJobMatch,
};
