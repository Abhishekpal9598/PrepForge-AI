import mongoose from 'mongoose';
import { Resume } from '../models/Resume.js';
import { JobAnalysis } from '../models/JobAnalysis.js';
import { analyzeJobMatchWithGemini, GeminiServiceError } from '../services/geminiService.js';
import { jobAnalysisInputSchema } from '../validators/jobAnalysisValidators.js';
import { logger } from '../utils/logger.js';

// In-memory concurrency lock tracking set
const activeJobAnalysisRequests = new Set();

// Simple in-memory rate limiter for AI operations: max 10 requests per user per minute
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
 * Format JobAnalysis document for API clients
 */
export const formatJobAnalysisResponse = (doc, resumeDoc = null) => {
  if (!doc) return null;

  const raw = doc.toObject ? doc.toObject() : doc;
  const resumeInfo = resumeDoc || (raw.resumeId && typeof raw.resumeId === 'object' ? raw.resumeId : null);

  const analysisResults = raw.analysisResults || {};

  return {
    id: raw._id,
    _id: raw._id,
    userId: raw.userId,
    resumeId: resumeInfo?._id || raw.resumeId,
    resumeFileName: resumeInfo?.originalFileName || 'Resume Document',
    fileType: resumeInfo?.fileType || resumeInfo?.fileFormat || 'pdf',
    jobTitle: raw.jobTitle,
    company: raw.company || raw.companyName || '',
    companyName: raw.companyName || raw.company || '',
    location: raw.location || '',
    jobDescription: raw.jobDescription,
    matchScore: raw.matchScore,
    matchSummary: analysisResults.matchSummary || '',
    categoryScores: analysisResults.categoryScores || {
      skillsMatch: 75,
      experienceMatch: 75,
      educationMatch: 75,
      scopeAndKeywords: 75,
    },
    jobRequirements: analysisResults.jobRequirements || {
      seniorityLevel: 'Mid-Level',
      requiredTechnicalSkills: [],
      preferredTechnicalSkills: [],
      softSkills: [],
      requiredExperience: '',
      educationRequirements: '',
      keyResponsibilities: [],
      importantKeywords: [],
    },
    matchedSkills: raw.matchedSkills || analysisResults.matchedSkills || [],
    missingRequiredSkills: raw.missingSkills || analysisResults.missingRequiredSkills || [],
    missingPreferredSkills: raw.unverifiedSkills || analysisResults.missingPreferredSkills || [],
    experienceAnalysis: analysisResults.experienceAnalysis || {
      status: 'Meets',
      candidateExperienceSummary: '',
      requiredExperienceSummary: '',
      assessment: '',
    },
    educationAnalysis: analysisResults.educationAnalysis || {
      status: 'Meets',
      candidateEducation: '',
      requiredEducation: '',
      assessment: '',
    },
    keywordOverlap: analysisResults.keywordOverlap || {
      highValueKeywordsFound: [],
      missingKeywords: [],
      overlapPercentage: 70,
    },
    relevantResumeSections: analysisResults.relevantResumeSections || [],
    strengthsForThisJob: analysisResults.strengthsForThisJob || [],
    weaknessesAndGaps: analysisResults.weaknessesAndGaps || [],
    improvementRecommendations: analysisResults.improvementRecommendations || raw.tailoringRecommendations || [],
    disclaimer: analysisResults.disclaimer || 'This match score is an estimation based on semantic skill and experience alignment.',
    analysisResults,
    modelUsed: raw.modelUsed || 'gemini-3.5-flash',
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
};

/**
 * POST /api/v1/jobs/analyze
 * Analyze job description requirements and match against authenticated user's resume
 */
export const analyzeJobDescription = async (req, res) => {
  // 1. Validate request payload with Zod
  const validationResult = jobAnalysisInputSchema.safeParse(req.body);
  if (!validationResult.success) {
    const errorMsg = validationResult.error.issues.map((i) => i.message).join('; ');
    return res.status(400).json({
      success: false,
      message: `Invalid input: ${errorMsg}`,
      code: 'VALIDATION_ERROR',
      details: validationResult.error.issues,
    });
  }

  const { resumeId, jobTitle, companyName, location, jobDescription } = validationResult.data;

  // 2. Check AI rate limit
  if (!checkAiRateLimit(req.userId)) {
    return res.status(429).json({
      success: false,
      message: 'Too many job analysis requests. Please wait a moment before trying again.',
      code: 'RATE_LIMIT_EXCEEDED',
    });
  }

  // 3. Prevent duplicate simultaneous analysis for same resume & user
  const lockKey = `${req.userId}_${resumeId}`;
  if (activeJobAnalysisRequests.has(lockKey)) {
    return res.status(409).json({
      success: false,
      message: 'A job match analysis for this resume is currently in progress. Please wait.',
      code: 'ANALYSIS_IN_PROGRESS',
    });
  }

  // Acquire lock synchronously before async calls
  activeJobAnalysisRequests.add(lockKey);

  try {
    // 4. Verify resume existence and user ownership
    const resume = await Resume.findOne({ _id: resumeId, userId: req.userId });
    if (!resume) {
      return res.status(404).json({
        success: false,
        message: 'Resume not found or you do not have permission to access it.',
        code: 'RESUME_NOT_FOUND',
      });
    }

    const resumeText = resume.extractedText || resume.rawText;
    if (!resumeText || resumeText.trim().length < 20) {
      return res.status(400).json({
        success: false,
        message: 'Selected resume has insufficient text for job matching (minimum 20 characters required).',
        code: 'INSUFFICIENT_TEXT',
      });
    }

    logger.info(`Starting Gemini Job Matching for Resume ${resume._id} and Job "${jobTitle}" (User: ${req.userId})`);

    // 5. Call Gemini AI Service
    const { match, modelUsed, durationMs } = await analyzeJobMatchWithGemini(
      {
        jobTitle,
        companyName,
        location,
        jobDescription,
      },
      resumeText
    );

    // 6. Persist to MongoDB
    const jobRecord = await JobAnalysis.create({
      userId: req.userId,
      resumeId: resume._id,
      jobTitle,
      company: companyName || '',
      companyName: companyName || '',
      location: location || '',
      jobDescription,
      matchScore: match.matchScore,
      matchedSkills: match.matchedSkills || [],
      missingSkills: match.missingRequiredSkills || [],
      unverifiedSkills: match.missingPreferredSkills || [],
      tailoringRecommendations: Array.isArray(match.improvementRecommendations)
        ? match.improvementRecommendations.map((r) => (typeof r === 'string' ? r : r.recommendation))
        : [],
      analysisResults: match,
      modelUsed,
    });

    return res.status(201).json({
      success: true,
      message: 'Job description analyzed and matched successfully.',
      durationMs,
      job: formatJobAnalysisResponse(jobRecord, resume),
    });
  } catch (error) {
    logger.error('Error during job match analysis:', error.message);

    const statusCode = error.statusCode || (error instanceof GeminiServiceError ? error.statusCode : 500);
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'An error occurred during job description analysis.',
      code: error.code || 'JOB_ANALYSIS_ERROR',
      details: error.details || null,
    });
  } finally {
    // Release concurrency lock
    activeJobAnalysisRequests.delete(lockKey);
  }
};

/**
 * GET /api/v1/jobs & GET /api/v1/jobs/history
 * Paginated list of job analyses belonging to authenticated user
 */
export const getJobAnalyses = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const query = { userId: req.userId };

    if (req.query.resumeId && mongoose.Types.ObjectId.isValid(req.query.resumeId)) {
      query.resumeId = req.query.resumeId;
    }

    const [total, records] = await Promise.all([
      JobAnalysis.countDocuments(query),
      JobAnalysis.find(query)
        .populate('resumeId', 'originalFileName fileType fileFormat fileSize')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    const formattedRecords = records.map((doc) => formatJobAnalysisResponse(doc));

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
      message: 'Failed to retrieve job analysis history.',
      error: error.message,
    });
  }
};

/**
 * GET /api/v1/jobs/:id
 * Retrieve specific job match analysis by ID
 */
export const getJobAnalysisById = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid job analysis ID format.',
      code: 'INVALID_ID',
    });
  }

  try {
    const record = await JobAnalysis.findOne({
      _id: id,
      userId: req.userId,
    }).populate('resumeId', 'originalFileName fileType fileFormat fileSize');

    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Job analysis not found.',
        code: 'JOB_ANALYSIS_NOT_FOUND',
      });
    }

    return res.status(200).json({
      success: true,
      job: formatJobAnalysisResponse(record),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve job analysis.',
      error: error.message,
    });
  }
};

/**
 * DELETE /api/v1/jobs/:id
 * Delete specific job match record
 */
export const deleteJobAnalysis = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid job analysis ID format.',
      code: 'INVALID_ID',
    });
  }

  try {
    const record = await JobAnalysis.findOneAndDelete({
      _id: id,
      userId: req.userId,
    });

    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Job analysis not found.',
        code: 'JOB_ANALYSIS_NOT_FOUND',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Job analysis deleted successfully.',
      id,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to delete job analysis.',
      error: error.message,
    });
  }
};

export default {
  analyzeJobDescription,
  getJobAnalyses,
  getJobAnalysisById,
  deleteJobAnalysis,
};
