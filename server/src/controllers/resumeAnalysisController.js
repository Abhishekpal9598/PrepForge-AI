import mongoose from 'mongoose';
import { Resume } from '../models/Resume.js';
import { ResumeAnalysis } from '../models/ResumeAnalysis.js';
import { analyzeResumeWithGemini, GeminiServiceError } from '../services/geminiService.js';
import { runAllChecks } from '../services/resumeChecks/checkRunner.js';
import { computeMultiDimensionalScores } from '../services/scoringEngine.js';
import { logger } from '../utils/logger.js';

// Concurrency tracking set to prevent duplicate simultaneous analyses on the same resume
const activeAnalysisRequests = new Set();

// Simple in-memory rate limiter for AI operations: max 10 analysis requests per user per minute
const userRateLimitTracker = new Map();

const checkAiRateLimit = (userId) => {
  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxRequests = 10;

  const userKey = userId.toString();
  const timestamps = userRateLimitTracker.get(userKey) || [];
  const recentTimestamps = timestamps.filter((t) => now - t < windowMs);

  if (recentTimestamps.length >= maxRequests) {
    return false;
  }

  recentTimestamps.push(now);
  userRateLimitTracker.set(userKey, recentTimestamps);
  return true;
};

/**
 * Cleanly format ResumeAnalysis document for API clients
 */
export const formatAnalysisResponse = (doc, resumeDoc = null) => {
  if (!doc) return null;

  const raw = doc.toObject ? doc.toObject() : doc;
  const resumeInfo = resumeDoc || (raw.resumeId && typeof raw.resumeId === 'object' ? raw.resumeId : null);

  return {
    id: raw._id,
    _id: raw._id,
    userId: raw.userId,
    resumeId: resumeInfo?._id || raw.resumeId,
    resumeFileName: resumeInfo?.originalFileName || 'Resume Document',
    fileType: resumeInfo?.fileType || resumeInfo?.fileFormat || 'pdf',
    overallScore: raw.overallScore,
    categoryScores: raw.categoryScores || raw.analysisResults?.categoryScores || {
      impact: 75,
      brevity: 75,
      style: 75,
      skills: 75,
      atsReadability: 75,
    },
    summaryFeedback: raw.summaryFeedback || raw.analysisResults?.resumeSummary || '',
    strengths: raw.strengths || raw.analysisResults?.strengths || [],
    weaknesses: raw.weaknesses || raw.analysisResults?.weaknesses || [],
    technicalSkills: raw.analysisResults?.technicalSkills || raw.identifiedSkills?.technical || [],
    softSkills: raw.analysisResults?.softSkills || raw.identifiedSkills?.soft || [],
    missingSkills: raw.analysisResults?.missingSkills || [],
    workExperienceAnalysis: raw.analysisResults?.workExperienceAnalysis || {
      summary: '',
      bulletPointsEvaluated: [],
      actionVerbStrength: 'Moderate',
      quantifiableResultsPresent: false,
    },
    educationAnalysis: raw.analysisResults?.educationAnalysis || {
      summary: '',
      degreesFound: [],
      institutionFound: false,
      recommendations: [],
    },
    keywordOptimization: raw.analysisResults?.keywordOptimization || {
      summary: '',
      highValueKeywordsFound: [],
      suggestedKeywordsToAdd: [],
    },
    formattingFeedback: raw.analysisResults?.formattingFeedback || {
      isAtsFriendly: true,
      fontAndLayoutAdvice: '',
      sectionsIdentified: [],
      potentialParsingRisks: [],
    },
    improvementSuggestions: raw.analysisResults?.improvementSuggestions || [],
    sectionWiseRecommendations: raw.analysisResults?.sectionWiseRecommendations || [],
    disclaimer: raw.analysisResults?.disclaimer || 'ATS compatibility score is an estimation based on standard parsing criteria.',
    analysisResults: raw.analysisResults || {},
    aiAnalysis: raw.aiAnalysis || raw.analysisResults?.aiDeepAnalysis || null,
    subScores: raw.subScores || null,
    scoreConfidence: raw.scoreConfidence || null,
    scoringBreakdown: raw.scoringBreakdown || null,
    checkSummary: raw.checkSummary || null,
    modelUsed: raw.modelUsed || 'gemini-3.5-flash',
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
};

/**
 * POST /api/v1/resumes/:id/analyze
 * Trigger real Gemini ATS analysis on an owned resume
 */
export const analyzeResume = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid resume ID format.',
      code: 'INVALID_ID',
    });
  }

  // Check AI rate limit for authenticated user
  if (!checkAiRateLimit(req.userId)) {
    return res.status(429).json({
      success: false,
      message: 'Too many analysis requests. Please wait a moment before analyzing again.',
      code: 'RATE_LIMIT_EXCEEDED',
    });
  }

  // Prevent simultaneous duplicate analyses for the same resume
  const resumeKey = id.toString();
  if (activeAnalysisRequests.has(resumeKey)) {
    return res.status(409).json({
      success: false,
      message: 'An AI analysis for this resume is currently in progress. Please wait.',
      code: 'ANALYSIS_IN_PROGRESS',
    });
  }

  // Acquire lock immediately to protect against async race conditions
  activeAnalysisRequests.add(resumeKey);

  try {
    // 1. Verify resume existence and user ownership
    const resume = await Resume.findOne({ _id: id, userId: req.userId });

    if (!resume) {
      return res.status(404).json({
        success: false,
        message: 'Resume not found or you do not have permission to access it.',
        code: 'RESUME_NOT_FOUND',
      });
    }

    const textToAnalyze = resume.extractedText || resume.rawText;
    if (!textToAnalyze || textToAnalyze.trim().length < 20) {
      return res.status(400).json({
        success: false,
        message: 'This resume contains insufficient text for ATS analysis (at least 20 characters required).',
        code: 'INSUFFICIENT_TEXT',
      });
    }

    logger.info(`Starting Gemini analysis for resume ${resume._id} (User: ${req.userId})`);


    // 2. Ensure Deterministic Checks & Phase 4 Scores are Present & Authoritative
    let analysisDoc = await ResumeAnalysis.findOne({ resumeId: id, userId: req.userId }).sort({ createdAt: -1 });

    if (!analysisDoc || !analysisDoc.detailedChecks || analysisDoc.detailedChecks.length === 0) {
      const checkExecution = await runAllChecks(resume, req.body || {});
      const scoreExecution = computeMultiDimensionalScores(checkExecution.checks, req.body || {});

      if (!analysisDoc) {
        analysisDoc = new ResumeAnalysis({
          userId: req.userId,
          resumeId: resume._id,
        });
      }

      analysisDoc.detailedChecks = checkExecution.checks;
      analysisDoc.checkSummary = checkExecution.checkSummary;
      analysisDoc.checkVersion = checkExecution.engineVersion;
      analysisDoc.evaluatedAt = new Date(checkExecution.evaluatedAt);
      analysisDoc.overallScore = scoreExecution.overallScore ?? 75;
      analysisDoc.subScores = scoreExecution.subScores;
      analysisDoc.scoringVersion = scoreExecution.scoringVersion;
      analysisDoc.scoreConfidence = scoreExecution.scoreConfidence;
      analysisDoc.scoredAt = new Date(scoreExecution.scoredAt);
      analysisDoc.scoringBreakdown = scoreExecution.scoringBreakdown;
    }

    // 3. Call Gemini Deep AI Service (AI does NOT overwrite deterministic scores)
    const { analysis: legacyAnalysis, deepAnalysis, modelUsed, durationMs } = await analyzeResumeWithGemini(
      textToAnalyze,
      {
        targetRole: req.body?.targetRole || resume.targetRole,
        jobDescription: req.body?.jobDescription,
        checkSummary: analysisDoc.checkSummary,
        deterministicOverallScore: analysisDoc.overallScore,
        metadata: {
          fileName: resume.originalFileName,
          fileFormat: resume.fileFormat,
        },
      }
    );

    // 4. Persist AI analysis additively to database
    analysisDoc.aiAnalysis = deepAnalysis;
    analysisDoc.analysisResults = legacyAnalysis;
    analysisDoc.modelUsed = modelUsed;
    analysisDoc.summaryFeedback =
      deepAnalysis.summaryEvaluation?.improvedSummary ||
      deepAnalysis.summaryEvaluation?.clarity ||
      analysisDoc.summaryFeedback;
    analysisDoc.strengths = deepAnalysis.strengths;
    analysisDoc.weaknesses = deepAnalysis.weaknesses;
    analysisDoc.bulletImprovements = (deepAnalysis.experienceAnalysis?.weakStatements || []).map((w) => ({
      original: w.original,
      issue: w.issue,
      rewrite: w.suggestedImprovement,
      impact: w.expectedBenefit,
    }));
    analysisDoc.identifiedSkills = {
      technical: deepAnalysis.skillsAnalysis?.technicalSkills || [],
      soft: deepAnalysis.skillsAnalysis?.domainSkills || [],
      tools: deepAnalysis.skillsAnalysis?.frameworksAndTools || [],
    };

    await analysisDoc.save();

    return res.status(201).json({
      success: true,
      message: 'Resume analyzed successfully.',
      durationMs,
      analysis: formatAnalysisResponse(analysisDoc, resume),
    });
  } catch (error) {
    logger.error(`Error during resume analysis for ${id}:`, error.message);

    const statusCode = error.statusCode || (error instanceof GeminiServiceError ? error.statusCode : 500);
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'An unexpected error occurred during resume analysis.',
      code: error.code || 'ANALYSIS_ERROR',
      details: error.details || null,
    });
  } finally {
    // Release concurrency lock
    activeAnalysisRequests.delete(resumeKey);
  }
};

/**
 * GET /api/v1/resumes/:id/analysis
 * Retrieve latest ATS analysis for a specific owned resume
 */
export const getLatestAnalysisForResume = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid resume ID format.',
      code: 'INVALID_ID',
    });
  }

  try {
    const resume = await Resume.findOne({ _id: id, userId: req.userId });

    if (!resume) {
      return res.status(404).json({
        success: false,
        message: 'Resume not found.',
        code: 'RESUME_NOT_FOUND',
      });
    }

    const latestAnalysis = await ResumeAnalysis.findOne({
      resumeId: id,
      userId: req.userId,
    }).sort({ createdAt: -1 });

    if (!latestAnalysis) {
      return res.status(404).json({
        success: false,
        message: 'No analysis found for this resume. Click "Analyze with AI" to generate an evaluation.',
        code: 'ANALYSIS_NOT_FOUND',
      });
    }

    return res.status(200).json({
      success: true,
      analysis: formatAnalysisResponse(latestAnalysis, resume),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve resume analysis.',
      error: error.message,
    });
  }
};

/**
 * GET /api/v1/resume-analyses
 * Paginated list of all analysis history belonging to the authenticated user
 */
export const getResumeAnalyses = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const query = { userId: req.userId };

    if (req.query.resumeId && mongoose.Types.ObjectId.isValid(req.query.resumeId)) {
      query.resumeId = req.query.resumeId;
    }

    const [total, records] = await Promise.all([
      ResumeAnalysis.countDocuments(query),
      ResumeAnalysis.find(query)
        .populate('resumeId', 'originalFileName fileType fileFormat fileSize')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    const formattedRecords = records.map((doc) => formatAnalysisResponse(doc));

    return res.status(200).json({
      success: true,
      count: formattedRecords.length,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
      data: formattedRecords,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve analysis history.',
      error: error.message,
    });
  }
};

/**
 * GET /api/v1/resume-analyses/:analysisId
 * Retrieve specific analysis by ID (enforcing user ownership)
 */
export const getResumeAnalysisById = async (req, res) => {
  const { analysisId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(analysisId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid analysis ID format.',
      code: 'INVALID_ID',
    });
  }

  try {
    const record = await ResumeAnalysis.findOne({
      _id: analysisId,
      userId: req.userId,
    }).populate('resumeId', 'originalFileName fileType fileFormat fileSize');

    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Resume analysis not found.',
        code: 'ANALYSIS_NOT_FOUND',
      });
    }

    return res.status(200).json({
      success: true,
      analysis: formatAnalysisResponse(record),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve resume analysis.',
      error: error.message,
    });
  }
};

/**
 * DELETE /api/v1/resume-analyses/:analysisId
 * Delete a specific analysis (enforcing user ownership)
 */
export const deleteResumeAnalysis = async (req, res) => {
  const { analysisId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(analysisId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid analysis ID format.',
      code: 'INVALID_ID',
    });
  }

  try {
    const record = await ResumeAnalysis.findOneAndDelete({
      _id: analysisId,
      userId: req.userId,
    });

    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Resume analysis not found.',
        code: 'ANALYSIS_NOT_FOUND',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Resume analysis deleted successfully.',
      id: analysisId,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to delete resume analysis.',
      error: error.message,
    });
  }
};

export default {
  analyzeResume,
  getLatestAnalysisForResume,
  getResumeAnalyses,
  getResumeAnalysisById,
  deleteResumeAnalysis,
};
