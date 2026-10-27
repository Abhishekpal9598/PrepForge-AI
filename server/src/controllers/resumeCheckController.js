/**
 * PrepForge AI — Resume Checks Controller
 *
 * Implements endpoints for executing, retrieving, and rechecking the 27-point
 * resume intelligence engine.
 */

import mongoose from 'mongoose';
import { Resume } from '../models/Resume.js';
import { ResumeAnalysis } from '../models/ResumeAnalysis.js';
import { runAllChecks, runSingleCheck } from '../services/resumeChecks/checkRunner.js';
import { getCheckById } from '../services/resumeChecks/checkRegistry.js';
import { computeMultiDimensionalScores } from '../services/scoringEngine.js';
import { logger } from '../utils/logger.js';

/**
 * Helper to validate MongoDB ObjectId
 */
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

/**
 * POST /api/v1/resumes/:id/checks
 * Run the 27-point check engine on an owned resume
 */
export const runResumeChecks = async (req, res) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid resume ID format.',
    });
  }

  try {
    // IDOR Protection: Verify resume belongs to authenticated user
    const resume = await Resume.findOne({ _id: id, userId: req.userId });
    if (!resume) {
      return res.status(404).json({
        success: false,
        message: 'Resume not found or you do not have permission to access it.',
      });
    }

    const options = req.validatedBody || req.body || {};
    const executionResult = await runAllChecks(resume, options);

    // Phase 4 Multi-Dimensional Scoring
    const scoreResult = computeMultiDimensionalScores(executionResult.checks, options);

    // Persist to ResumeAnalysis document additively
    let analysis = await ResumeAnalysis.findOne({ resumeId: id, userId: req.userId }).sort({ createdAt: -1 });

    if (!analysis) {
      analysis = new ResumeAnalysis({
        userId: req.userId,
        resumeId: id,
        overallScore: scoreResult.overallScore ?? 75,
      });
    }

    analysis.detailedChecks = executionResult.checks;
    analysis.checkSummary = executionResult.checkSummary;
    analysis.checkVersion = executionResult.engineVersion;
    analysis.evaluatedAt = new Date(executionResult.evaluatedAt);

    // Phase 4 scoring fields
    analysis.overallScore = scoreResult.overallScore ?? analysis.overallScore ?? 0;
    analysis.subScores = scoreResult.subScores;
    analysis.scoringVersion = scoreResult.scoringVersion;
    analysis.scoreConfidence = scoreResult.scoreConfidence;
    analysis.scoredAt = new Date(scoreResult.scoredAt);
    analysis.scoringBreakdown = scoreResult.scoringBreakdown;

    await analysis.save();

    logger.info(`[ResumeChecks] Evaluated 27 checks for resume ${id} in ${executionResult.executionTimeMs}ms (Overall Score: ${analysis.overallScore})`);

    return res.status(200).json({
      success: true,
      message: 'Resume evaluated across all 27 checks successfully.',
      data: {
        resumeId: resume._id,
        overallScore: analysis.overallScore,
        subScores: analysis.subScores,
        scoreConfidence: analysis.scoreConfidence,
        scoringBreakdown: analysis.scoringBreakdown,
        scoredAt: analysis.scoredAt,
        scoringVersion: analysis.scoringVersion,
        checkSummary: executionResult.checkSummary,
        checks: executionResult.checks,
        evaluatedAt: executionResult.evaluatedAt,
        executionTimeMs: executionResult.executionTimeMs,
        engineVersion: executionResult.engineVersion,
      },
    });
  } catch (error) {
    logger.error(`[ResumeChecks] Execution error for resume ${id}: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while evaluating resume checks.',
      error: error.message,
    });
  }
};

/**
 * GET /api/v1/resumes/:id/checks
 * Retrieve cached check results for an owned resume with optional status/category filtering
 */
export const getResumeChecks = async (req, res) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid resume ID format.',
    });
  }

  try {
    // IDOR Protection: Verify resume ownership
    const resume = await Resume.findOne({ _id: id, userId: req.userId });
    if (!resume) {
      return res.status(404).json({
        success: false,
        message: 'Resume not found or unauthorized.',
      });
    }

    const analysis = await ResumeAnalysis.findOne({ resumeId: id, userId: req.userId }).sort({ createdAt: -1 });

    if (!analysis || !analysis.detailedChecks || analysis.detailedChecks.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No check evaluation records found for this resume. Please trigger checks first.',
      });
    }

    let checks = analysis.detailedChecks;
    const filterStatus = (req.query.status || '').toUpperCase();
    const filterCategory = (req.query.category || '').toUpperCase();

    if (filterStatus) {
      checks = checks.filter((c) => c.status === filterStatus);
    }
    if (filterCategory) {
      checks = checks.filter((c) => c.categoryId === filterCategory);
    }

    return res.status(200).json({
      success: true,
      data: {
        resumeId: id,
        checkSummary: analysis.checkSummary,
        checks,
        evaluatedAt: analysis.evaluatedAt,
        engineVersion: analysis.checkVersion || '1.0.0',
      },
    });
  } catch (error) {
    logger.error(`[ResumeChecks] Retrieval error for resume ${id}: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while retrieving check results.',
      error: error.message,
    });
  }
};

/**
 * GET /api/v1/resumes/:id/checks/:checkId
 * Retrieve detailed diagnostic for a single check by ID (e.g. CHK-01)
 */
export const getSingleCheckDetail = async (req, res) => {
  const { id, checkId } = req.params;

  if (!isValidObjectId(id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid resume ID format.',
    });
  }

  const normalizedCheckId = (checkId || '').toUpperCase();
  const checkDef = getCheckById(normalizedCheckId);

  if (!checkDef) {
    return res.status(404).json({
      success: false,
      message: `Check ID '${checkId}' is not recognized in the 27-check registry.`,
    });
  }

  try {
    // IDOR Protection: Verify resume ownership
    const resume = await Resume.findOne({ _id: id, userId: req.userId });
    if (!resume) {
      return res.status(404).json({
        success: false,
        message: 'Resume not found or unauthorized.',
      });
    }

    const analysis = await ResumeAnalysis.findOne({ resumeId: id, userId: req.userId }).sort({ createdAt: -1 });

    if (analysis && analysis.detailedChecks && analysis.detailedChecks.length > 0) {
      const existing = analysis.detailedChecks.find((c) => c.checkId === normalizedCheckId);
      if (existing) {
        return res.status(200).json({
          success: true,
          data: existing,
        });
      }
    }

    // If not found in cached analysis, run check on the fly
    const dynamicResult = runSingleCheck(normalizedCheckId, resume);
    return res.status(200).json({
      success: true,
      data: dynamicResult,
    });
  } catch (error) {
    logger.error(`[ResumeChecks] Single check error for ${checkId} on resume ${id}: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while evaluating single check detail.',
      error: error.message,
    });
  }
};

/**
 * POST /api/v1/resumes/:id/recheck
 * Forces re-evaluation of all 27 checks, updating cache
 */
export const recheckResume = async (req, res) => {
  return runResumeChecks(req, res);
};

/**
 * GET /api/v1/resumes/:id/scores
 * Retrieve cached multi-dimensional scores for an owned resume
 */
export const getResumeScores = async (req, res) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid resume ID format.',
    });
  }

  try {
    // IDOR Protection: Verify resume ownership
    const resume = await Resume.findOne({ _id: id, userId: req.userId });
    if (!resume) {
      return res.status(404).json({
        success: false,
        message: 'Resume not found or unauthorized.',
      });
    }

    const analysis = await ResumeAnalysis.findOne({ resumeId: id, userId: req.userId }).sort({ createdAt: -1 });

    if (!analysis || analysis.scoreConfidence === null || !analysis.scoredAt) {
      return res.status(404).json({
        success: false,
        message: 'No score evaluation records found for this resume. Please trigger checks or analysis first.',
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        resumeId: id,
        overallScore: analysis.overallScore,
        subScores: analysis.subScores,
        scoreConfidence: analysis.scoreConfidence,
        scoringBreakdown: analysis.scoringBreakdown,
        scoredAt: analysis.scoredAt,
        scoringVersion: analysis.scoringVersion,
      },
    });
  } catch (error) {
    logger.error(`[ResumeScores] Retrieval error for resume ${id}: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while retrieving resume scores.',
      error: error.message,
    });
  }
};

export default {
  runResumeChecks,
  getResumeChecks,
  getSingleCheckDetail,
  recheckResume,
  getResumeScores,
};
