/**
 * PrepForge AI — 27-Point Resume Check Runner & Orchestrator
 *
 * Coordinates execution of all 27 checks within isolated try/catch boundaries,
 * measures performance execution timing, and computes summary rollups.
 */

import { CHECK_DEFINITIONS, getCheckById, TOTAL_CHECKS_COUNT } from './checkRegistry.js';
import { formatCheckResult } from './utils/resultFormatter.js';

/**
 * Executes all 27 resume checks against candidate data
 *
 * @param {object} resumeData - Cleaned candidate resume data and parsedSections
 * @param {object} [options]
 * @param {string} [options.jobDescription] - Optional target job posting
 * @param {string} [options.targetRole] - Optional target position title
 * @param {object} [options.benchmarkData] - Optional verified peer benchmark statistics
 * @returns {object} Execution payload with check results, summary, and performance metrics
 */
export const runAllChecks = async (resumeData, options = {}) => {
  const startTime = performance.now();
  const evaluationTimestamp = new Date().toISOString();
  const checkResults = [];

  for (const checkDef of CHECK_DEFINITIONS) {
    try {
      const result = checkDef.handler(resumeData, options);
      // Ensure timestamp and basic invariants
      if (!result.evaluatedAt) {
        result.evaluatedAt = evaluationTimestamp;
      }
      checkResults.push(result);
    } catch (err) {
      // Fault tolerance: an error in a single check does not halt execution
      const fallbackResult = formatCheckResult({
        checkId: checkDef.id,
        categoryId: checkDef.categoryId,
        title: checkDef.title,
        status: 'WARNING',
        severity: checkDef.defaultSeverity || 'medium',
        description: checkDef.description,
        evidence: [`Handler execution error: ${err.message}`],
        explanation: `An unexpected error occurred while evaluating ${checkDef.id}: ${err.message}`,
        recommendation: 'Check could not be fully evaluated due to an unexpected parsing format.',
        confidence: 0.5,
        limitations: ['Check experienced runtime handler error.'],
        source: checkDef.source || 'deterministic',
        evaluatedAt: evaluationTimestamp,
      });
      checkResults.push(fallbackResult);
    }
  }

  const endTime = performance.now();
  const executionTimeMs = Math.round((endTime - startTime) * 100) / 100;

  // Compute rollups
  let passedCount = 0;
  let warningCount = 0;
  let failedCount = 0;
  let notEvaluatedCount = 0;

  for (const res of checkResults) {
    switch (res.status) {
      case 'PASS':
        passedCount++;
        break;
      case 'WARNING':
        warningCount++;
        break;
      case 'FAIL':
        failedCount++;
        break;
      case 'NOT_EVALUATED':
        notEvaluatedCount++;
        break;
      default:
        break;
    }
  }

  const checkSummary = {
    totalChecks: TOTAL_CHECKS_COUNT,
    passedCount,
    warningCount,
    failedCount,
    notEvaluatedCount,
  };

  return {
    engineVersion: '1.0.0',
    evaluatedAt: evaluationTimestamp,
    executionTimeMs,
    checkSummary,
    checks: checkResults,
  };
};

/**
 * Executes a single check by ID
 *
 * @param {string} checkId - e.g. 'CHK-01'
 * @param {object} resumeData
 * @param {object} [options]
 * @returns {object|null} CheckResult
 */
export const runSingleCheck = (checkId, resumeData, options = {}) => {
  const checkDef = getCheckById(checkId);
  if (!checkDef) {
    return null;
  }

  const evaluationTimestamp = new Date().toISOString();
  try {
    const result = checkDef.handler(resumeData, options);
    if (!result.evaluatedAt) {
      result.evaluatedAt = evaluationTimestamp;
    }
    return result;
  } catch (err) {
    return formatCheckResult({
      checkId: checkDef.id,
      categoryId: checkDef.categoryId,
      title: checkDef.title,
      status: 'WARNING',
      severity: checkDef.defaultSeverity || 'medium',
      description: checkDef.description,
      evidence: [`Handler error: ${err.message}`],
      explanation: `Execution error for ${checkDef.id}: ${err.message}`,
      recommendation: null,
      confidence: 0.5,
      limitations: ['Runtime handler failure.'],
      source: checkDef.source || 'deterministic',
      evaluatedAt: evaluationTimestamp,
    });
  }
};

export default {
  runAllChecks,
  runSingleCheck,
};
