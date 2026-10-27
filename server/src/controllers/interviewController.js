import mongoose from 'mongoose';
import InterviewSession from '../models/InterviewSession.js';
import Resume from '../models/Resume.js';
import JobAnalysis from '../models/JobAnalysis.js';
import {
  generateInterviewQuestionsWithGemini,
  evaluateInterviewAnswerWithGemini,
  generateFinalInterviewReportWithGemini,
  GeminiServiceError,
} from '../services/geminiService.js';
import {
  validateInterviewInput,
  validateSubmitAnswerInput,
} from '../validators/interviewValidators.js';
import { logger } from '../utils/logger.js';

// In-memory concurrency locks to prevent race conditions & double submissions
const activeInterviewCreations = new Set();
const activeAnswerSubmissions = new Set();

/**
 * Validate MongoDB ObjectId
 */
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id) && /^[0-9a-fA-F]{24}$/.test(id);

/**
 * @desc    Create a new mock interview session and generate AI questions
 * @route   POST /api/v1/interviews
 * @access  Private
 */
export const createInterviewSession = async (req, res, next) => {
  const userId = req.user._id.toString();
  const lockKey = `${userId}:${req.body.jobRole || 'default'}`;

  if (activeInterviewCreations.has(lockKey)) {
    return res.status(409).json({
      success: false,
      message: 'An interview session creation is already in progress. Please wait a moment.',
      code: 'CONCURRENT_REQUEST',
    });
  }

  activeInterviewCreations.add(lockKey);

  try {
    // 1. Validate request body with Zod
    const validatedInput = validateInterviewInput(req.body);

    let resumeText = '';
    let jobDescription = '';

    // 2. Validate Resume ownership if provided
    if (validatedInput.resumeId) {
      if (!isValidObjectId(validatedInput.resumeId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid Resume ID format',
          code: 'INVALID_ID_FORMAT',
        });
      }

      const resume = await Resume.findOne({
        _id: validatedInput.resumeId,
        userId: req.user._id,
      });

      if (!resume) {
        return res.status(404).json({
          success: false,
          message: 'Referenced resume not found or does not belong to your account',
          code: 'RESOURCE_NOT_FOUND',
        });
      }

      resumeText = resume.extractedText || resume.rawText || '';
    }

    // 3. Validate Job Analysis ownership if provided
    if (validatedInput.jobAnalysisId) {
      if (!isValidObjectId(validatedInput.jobAnalysisId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid Job Analysis ID format',
          code: 'INVALID_ID_FORMAT',
        });
      }

      const jobAnalysis = await JobAnalysis.findOne({
        _id: validatedInput.jobAnalysisId,
        userId: req.user._id,
      });

      if (!jobAnalysis) {
        return res.status(404).json({
          success: false,
          message: 'Referenced job analysis not found or does not belong to your account',
          code: 'RESOURCE_NOT_FOUND',
        });
      }

      jobDescription = jobAnalysis.jobDescription || '';
    }

    logger.info(
      `Generating mock interview questions for user ${userId} [Role: "${validatedInput.jobRole}", Level: ${validatedInput.experienceLevel}, Category: ${validatedInput.category}]`
    );

    // 4. Generate interview questions via Gemini
    const { questions, modelUsed } = await generateInterviewQuestionsWithGemini({
      jobRole: validatedInput.jobRole,
      experienceLevel: validatedInput.experienceLevel,
      category: validatedInput.category,
      difficulty: validatedInput.difficulty,
      numberOfQuestions: validatedInput.numberOfQuestions,
      resumeText,
      jobDescription,
      additionalInstructions: validatedInput.additionalInstructions,
    });

    // 5. Create InterviewSession record in database
    const title =
      validatedInput.interviewTitle ||
      `${validatedInput.jobRole} (${validatedInput.category}) Mock Interview`;

    const session = await InterviewSession.create({
      userId: req.user._id,
      resumeId: validatedInput.resumeId || null,
      jobAnalysisId: validatedInput.jobAnalysisId || null,
      interviewTitle: title,
      jobRole: validatedInput.jobRole,
      jobTitle: validatedInput.jobRole,
      experienceLevel: validatedInput.experienceLevel,
      category: validatedInput.category,
      difficulty: validatedInput.difficulty,
      totalQuestions: questions.length,
      currentQuestionIndex: 0,
      questions,
      status: 'pending',
      modelUsed,
      additionalInstructions: validatedInput.additionalInstructions || '',
    });

    return res.status(201).json({
      success: true,
      message: 'Mock interview session created successfully with AI generated questions',
      data: session,
    });
  } catch (err) {
    if (err.name === 'ZodError') {
      const issueList = err.issues || err.errors || [];
      return res.status(400).json({
        success: false,
        message: 'Invalid interview setup input parameters',
        errors: issueList.map((e) => ({
          field: (e.path || []).join('.'),
          message: e.message,
        })),
        code: 'VALIDATION_ERROR',
      });
    }

    if (err instanceof GeminiServiceError) {
      return res.status(err.statusCode || 502).json({
        success: false,
        message: err.message,
        code: err.code,
      });
    }

    next(err);
  } finally {
    activeInterviewCreations.delete(lockKey);
  }
};

/**
 * @desc    Get paginated interview sessions history for authenticated user
 * @route   GET /api/v1/interviews
 * @access  Private
 */
export const getInterviewSessions = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const filter = { userId: req.user._id };
    if (req.query.status) {
      filter.status = req.query.status;
    }

    const [total, sessions] = await Promise.all([
      InterviewSession.countDocuments(filter),
      InterviewSession.find(filter)
        .populate('resumeId', 'originalFileName fileSize uploadedAt')
        .populate('jobAnalysisId', 'jobTitle companyName matchScore')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    return res.status(200).json({
      success: true,
      count: sessions.length,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit) || 1,
        limit,
      },
      data: sessions,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get a specific interview session details
 * @route   GET /api/v1/interviews/:id
 * @access  Private
 */
export const getInterviewSessionById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid interview session ID format',
        code: 'INVALID_ID_FORMAT',
      });
    }

    const session = await InterviewSession.findOne({
      _id: id,
      userId: req.user._id,
    })
      .populate('resumeId', 'originalFileName fileSize uploadedAt')
      .populate('jobAnalysisId', 'jobTitle companyName matchScore');

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Interview session not found or does not belong to your account',
        code: 'RESOURCE_NOT_FOUND',
      });
    }

    return res.status(200).json({
      success: true,
      data: session,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Start an interview session
 * @route   POST /api/v1/interviews/:id/start
 * @access  Private
 */
export const startInterviewSession = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid interview session ID format',
        code: 'INVALID_ID_FORMAT',
      });
    }

    const session = await InterviewSession.findOne({
      _id: id,
      userId: req.user._id,
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Interview session not found',
        code: 'RESOURCE_NOT_FOUND',
      });
    }

    if (session.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot restart an already completed interview session',
        code: 'SESSION_ALREADY_COMPLETED',
      });
    }

    if (session.status === 'pending') {
      session.status = 'in_progress';
      session.startedAt = session.startedAt || new Date();
      await session.save();
    }

    return res.status(200).json({
      success: true,
      message: 'Interview session is now in progress',
      data: session,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Submit an answer to an interview question and receive instant AI evaluation
 * @route   POST /api/v1/interviews/:id/answer
 * @access  Private
 */
export const submitInterviewAnswer = async (req, res, next) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid interview session ID format',
      code: 'INVALID_ID_FORMAT',
    });
  }

  let validatedInput;
  try {
    validatedInput = validateSubmitAnswerInput(req.body);
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.errors?.[0]?.message || 'Invalid answer payload submitted',
      code: 'VALIDATION_ERROR',
    });
  }

  const { questionId, answerText } = validatedInput;
  const lockKey = `${id}:${questionId}`;

  if (activeAnswerSubmissions.has(lockKey)) {
    return res.status(409).json({
      success: false,
      message: 'An evaluation for this question is currently processing. Please wait.',
      code: 'CONCURRENT_REQUEST',
    });
  }

  activeAnswerSubmissions.add(lockKey);

  try {
    const session = await InterviewSession.findOne({
      _id: id,
      userId: req.user._id,
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Interview session not found',
        code: 'RESOURCE_NOT_FOUND',
      });
    }

    if (session.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Interview session has already been completed. Answers cannot be modified.',
        code: 'SESSION_COMPLETED',
      });
    }

    // Find question inside session
    const question = session.questions.find(
      (q) => q.questionId === questionId || q._id.toString() === questionId
    );

    if (!question) {
      return res.status(400).json({
        success: false,
        message: `Question with ID "${questionId}" does not belong to this interview session`,
        code: 'QUESTION_NOT_FOUND',
      });
    }

    // Evaluate answer with Gemini AI
    logger.info(
      `Evaluating candidate response for Session ${id}, Question ${question.questionId} (${question.category})`
    );

    const { evaluation } = await evaluateInterviewAnswerWithGemini({
      questionText: question.questionText,
      category: question.category,
      difficulty: question.difficulty,
      questionType: question.questionType,
      expectedAnswerPoints: question.expectedAnswerPoints || question.sampleKeyPoints || [],
      userAnswer: answerText,
      jobRole: session.jobRole,
      experienceLevel: session.experienceLevel,
    });

    // Update question state
    question.userAnswer = answerText;
    question.submittedAt = new Date();
    question.evaluation = evaluation;

    // Transition session status to in_progress if still pending
    if (session.status === 'pending') {
      session.status = 'in_progress';
      session.startedAt = session.startedAt || new Date();
    }

    // Advance currentQuestionIndex if answering the active question
    const qIndex = session.questions.findIndex(
      (q) => q.questionId === questionId || q._id.toString() === questionId
    );
    if (qIndex === session.currentQuestionIndex && session.currentQuestionIndex < session.questions.length - 1) {
      session.currentQuestionIndex += 1;
    }

    const allAnswered = session.questions.every((q) => q.userAnswer && q.evaluation);

    await session.save();

    return res.status(200).json({
      success: true,
      message: 'Answer evaluated successfully',
      data: {
        questionId: question.questionId,
        questionIndex: qIndex,
        currentQuestionIndex: session.currentQuestionIndex,
        evaluation,
        allAnswered,
      },
    });
  } catch (err) {
    if (err instanceof GeminiServiceError) {
      return res.status(err.statusCode || 502).json({
        success: false,
        message: err.message,
        code: err.code,
      });
    }
    next(err);
  } finally {
    activeAnswerSubmissions.delete(lockKey);
  }
};

/**
 * @desc    Complete interview session and generate final comprehensive evaluation report
 * @route   POST /api/v1/interviews/:id/complete
 * @access  Private
 */
export const completeInterviewSession = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid interview session ID format',
        code: 'INVALID_ID_FORMAT',
      });
    }

    const session = await InterviewSession.findOne({
      _id: id,
      userId: req.user._id,
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Interview session not found',
        code: 'RESOURCE_NOT_FOUND',
      });
    }

    // Idempotent completion: if already completed and has final evaluation, return directly
    if (session.status === 'completed' && session.finalEvaluation?.overallScore !== undefined) {
      return res.status(200).json({
        success: true,
        message: 'Interview session already completed',
        data: session,
      });
    }

    // Check answered questions
    const answeredQuestions = session.questions.filter((q) => q.userAnswer && q.evaluation);

    if (answeredQuestions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot complete an interview session before answering at least one question.',
        code: 'NO_QUESTIONS_ANSWERED',
      });
    }

    logger.info(
      `Generating final comprehensive interview report for Session ${id} (${answeredQuestions.length}/${session.questions.length} answered)`
    );

    const { finalEvaluation, overallScore, modelUsed } =
      await generateFinalInterviewReportWithGemini({
        session,
        answeredQuestions,
      });

    session.status = 'completed';
    session.completedAt = new Date();
    session.overallScore = overallScore;
    session.finalEvaluation = finalEvaluation;
    session.modelUsed = modelUsed;

    // Synchronize top-level convenience arrays
    session.answers = session.questions.map((q) => ({
      questionId: q.questionId,
      questionText: q.questionText,
      userAnswer: q.userAnswer,
      score: q.evaluation?.score ?? q.evaluation?.overallScore,
    }));
    session.evaluations = session.questions.map((q) => q.evaluation).filter(Boolean);

    await session.save();

    return res.status(200).json({
      success: true,
      message: 'Interview session completed successfully',
      data: session,
    });
  } catch (err) {
    if (err instanceof GeminiServiceError) {
      return res.status(err.statusCode || 502).json({
        success: false,
        message: err.message,
        code: err.code,
      });
    }
    next(err);
  }
};

/**
 * @desc    Delete an interview session owned by the authenticated user
 * @route   DELETE /api/v1/interviews/:id
 * @access  Private
 */
export const deleteInterviewSession = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid interview session ID format',
        code: 'INVALID_ID_FORMAT',
      });
    }

    const session = await InterviewSession.findOneAndDelete({
      _id: id,
      userId: req.user._id,
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Interview session not found or does not belong to your account',
        code: 'RESOURCE_NOT_FOUND',
      });
    }

    logger.info(`Deleted interview session ${id} for user ${req.user._id}`);

    return res.status(200).json({
      success: true,
      message: 'Interview session deleted successfully',
    });
  } catch (err) {
    next(err);
  }
};

export default {
  createInterviewSession,
  getInterviewSessions,
  getInterviewSessionById,
  startInterviewSession,
  submitInterviewAnswer,
  completeInterviewSession,
  deleteInterviewSession,
};
