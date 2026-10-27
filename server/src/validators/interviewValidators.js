import { z } from 'zod';

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

/**
 * Zod Input Schema for Interview Creation
 */
export const interviewInputSchema = z.object({
  interviewTitle: z
    .string({ required_error: 'Interview title is required' })
    .trim()
    .min(3, 'Interview title must be at least 3 characters')
    .max(180, 'Interview title cannot exceed 180 characters')
    .optional(),
  jobRole: z
    .string({ required_error: 'Job role is required' })
    .trim()
    .min(2, 'Job role must be at least 2 characters')
    .max(150, 'Job role cannot exceed 150 characters'),
  experienceLevel: z
    .enum(['Fresher', 'Junior', 'Mid-Level', 'Senior', 'Lead'], {
      errorMap: () => ({ message: 'Invalid experience level selected' }),
    })
    .default('Mid-Level'),
  category: z
    .enum(['Technical', 'HR', 'Behavioral', 'Role-Based', 'General'], {
      errorMap: () => ({ message: 'Invalid interview category selected' }),
    })
    .default('Technical'),
  difficulty: z
    .enum(['Easy', 'Medium', 'Hard'], {
      errorMap: () => ({ message: 'Invalid difficulty tier selected' }),
    })
    .default('Medium'),
  numberOfQuestions: z
    .union([z.number(), z.string()])
    .transform((val) => Number(val))
    .refine((n) => [5, 10, 15].includes(n), {
      message: 'Number of questions must be 5, 10, or 15',
    })
    .default(5),
  resumeId: z
    .string()
    .nullable()
    .optional()
    .transform((val) => (!val || val.trim() === '' ? null : val.trim()))
    .refine((val) => val === null || OBJECT_ID_REGEX.test(val), {
      message: 'Invalid Resume ID format. Must be a 24-character hexadecimal ObjectId',
    }),
  jobAnalysisId: z
    .string()
    .nullable()
    .optional()
    .transform((val) => (!val || val.trim() === '' ? null : val.trim()))
    .refine((val) => val === null || OBJECT_ID_REGEX.test(val), {
      message: 'Invalid Job Analysis ID format. Must be a 24-character hexadecimal ObjectId',
    }),
  additionalInstructions: z
    .string()
    .max(1000, 'Additional instructions cannot exceed 1000 characters')
    .optional()
    .default(''),
});

/**
 * Zod Input Schema for Answer Submission
 */
export const submitAnswerInputSchema = z
  .object({
    questionId: z
      .string({ required_error: 'Question ID is required' })
      .trim()
      .min(1, 'Question ID cannot be empty')
      .max(100, 'Question ID is too long'),
    answerText: z.string().trim().optional(),
    userAnswer: z.string().trim().optional(),
  })
  .refine(
    (data) => {
      const text = data.answerText || data.userAnswer;
      return typeof text === 'string' && text.trim().length >= 2;
    },
    {
      message: 'Answer text must be at least 2 characters long',
      path: ['answerText'],
    }
  )
  .transform((data) => ({
    questionId: data.questionId,
    answerText: (data.answerText || data.userAnswer || '').trim(),
  }));

/**
 * AI Generated Question Schema
 */
export const aiQuestionSchema = z.object({
  questionId: z.string().default(() => `q_${Math.random().toString(36).substring(2, 9)}`),
  questionText: z.string().min(10, 'Question text must be at least 10 characters'),
  category: z.string().default('Technical'),
  difficulty: z.string().default('Medium'),
  questionType: z.enum(['Technical', 'Conceptual', 'Behavioral', 'Situational']).default('Technical'),
  expectedAnswerPoints: z.array(z.string()).min(1, 'At least 1 expected key point is required'),
});

/**
 * AI Generated Question List Schema
 */
export const aiQuestionListSchema = z.object({
  questions: z.array(aiQuestionSchema).min(1, 'AI must return at least 1 question'),
});

/**
 * AI Answer Evaluation Schema
 */
export const aiAnswerEvaluationSchema = z.object({
  technicalAccuracy: z.number().min(0).max(100).default(70),
  relevance: z.number().min(0).max(100).default(70),
  completeness: z.number().min(0).max(100).default(70),
  clarity: z.number().min(0).max(100).default(70),
  communicationQuality: z.number().min(0).max(100).default(70),
  overallScore: z.number().min(0).max(100).optional(),
  correctPoints: z.array(z.string()).default([]),
  missingPoints: z.array(z.string()).default([]),
  incorrectStatements: z.array(z.string()).default([]),
  strengths: z.array(z.string()).default([]),
  weaknesses: z.array(z.string()).default([]),
  suggestions: z.array(z.string()).default([]),
  exampleImprovedAnswer: z.string().default(''),
});

/**
 * Deterministic Answer Composite Score Calculator
 * Technical Accuracy: 30%
 * Relevance: 25%
 * Completeness: 20%
 * Clarity: 15%
 * Communication Quality: 10%
 */
export const calculateAnswerCompositeScore = (scores = {}) => {
  const {
    technicalAccuracy = 70,
    relevance = 70,
    completeness = 70,
    clarity = 70,
    communicationQuality = 70,
  } = scores;

  const composite =
    technicalAccuracy * 0.3 +
    relevance * 0.25 +
    completeness * 0.2 +
    clarity * 0.15 +
    communicationQuality * 0.1;

  return Math.min(100, Math.max(0, Math.round(composite)));
};

/**
 * Determine Final Assessment Label
 */
export const determineFinalAssessmentLabel = (score) => {
  if (score >= 85) return 'Excellent';
  if (score >= 70) return 'Strong';
  if (score >= 50) return 'Good';
  return 'Needs Improvement';
};

/**
 * AI Final Evaluation Schema
 */
export const aiFinalEvaluationSchema = z.object({
  overallScore: z.number().min(0).max(100),
  categoryScores: z.record(z.string(), z.number()).default({}),
  technicalAssessment: z.string().default(''),
  communicationAssessment: z.string().default(''),
  strongestAnswers: z
    .array(
      z.object({
        questionText: z.string().optional().default(''),
        score: z.number().optional().default(0),
        highlight: z.string().optional().default(''),
      })
    )
    .default([]),
  weakestAnswers: z
    .array(
      z.object({
        questionText: z.string().optional().default(''),
        score: z.number().optional().default(0),
        gap: z.string().optional().default(''),
      })
    )
    .default([]),
  improvementRecommendations: z.array(z.string()).default([]),
  suggestedTopics: z.array(z.string()).default([]),
  finalAssessmentLabel: z.enum(['Excellent', 'Strong', 'Good', 'Needs Improvement']).default('Good'),
  aiDisclaimer: z
    .string()
    .default(
      'AI-generated evaluation for interview preparation purposes. This does not represent an actual hiring decision or employment guarantee.'
    ),
});

/**
 * Validate functions with friendly throw
 */
export const validateInterviewInput = (data) => interviewInputSchema.parse(data);
export const validateSubmitAnswerInput = (data) => submitAnswerInputSchema.parse(data);
export const validateAiQuestionList = (data) => aiQuestionListSchema.parse(data);
export const validateAiAnswerEvaluation = (data) => {
  const parsed = aiAnswerEvaluationSchema.parse(data);
  parsed.overallScore = calculateAnswerCompositeScore(parsed);
  return parsed;
};
export const validateAiFinalEvaluation = (data) => aiFinalEvaluationSchema.parse(data);

export default {
  interviewInputSchema,
  submitAnswerInputSchema,
  aiQuestionSchema,
  aiQuestionListSchema,
  aiAnswerEvaluationSchema,
  aiFinalEvaluationSchema,
  calculateAnswerCompositeScore,
  determineFinalAssessmentLabel,
  validateInterviewInput,
  validateSubmitAnswerInput,
  validateAiQuestionList,
  validateAiAnswerEvaluation,
  validateAiFinalEvaluation,
};
