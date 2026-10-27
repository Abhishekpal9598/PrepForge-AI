/**
 * PrepForge AI — Standardized Check Result Formatter
 *
 * Enforces schema uniformity across all 27 checks.
 * Valid statuses: PASS | WARNING | FAIL | NOT_EVALUATED
 * Valid severities: critical | high | medium | low | info
 */

export const VALID_STATUSES = ['PASS', 'WARNING', 'FAIL', 'NOT_EVALUATED'];
export const VALID_SEVERITIES = ['critical', 'high', 'medium', 'low', 'info'];

export const CATEGORY_METADATA = {
  'CAT-01': { id: 'CAT-01', name: 'ATS Essentials' },
  'CAT-02': { id: 'CAT-02', name: 'Resume Sections' },
  'CAT-03': { id: 'CAT-03', name: 'Resume Content' },
  'CAT-04': { id: 'CAT-04', name: 'Job Tailoring' },
  'CAT-05': { id: 'CAT-05', name: 'Recruiter Red Flags' },
  'CAT-06': { id: 'CAT-06', name: 'Bias and Discrimination' },
  'CAT-07': { id: 'CAT-07', name: 'Seniority and Impact' },
};

/**
 * Builds an immutable, normalized CheckResult object
 *
 * @param {object} params
 * @param {string} params.checkId - e.g. 'CHK-01'
 * @param {string} params.categoryId - e.g. 'CAT-01'
 * @param {string} params.title - Human-readable check title
 * @param {'PASS' | 'WARNING' | 'FAIL' | 'NOT_EVALUATED'} params.status - Standard evaluation status
 * @param {'critical' | 'high' | 'medium' | 'low' | 'info'} [params.severity] - Impact severity
 * @param {string} [params.description] - What this check evaluates
 * @param {Array<any>} [params.evidence] - Verbatim tokens, line items, numbers
 * @param {string} params.explanation - Grounded analysis based on candidate data
 * @param {string} [params.recommendation] - Actionable remediation text
 * @param {number} [params.confidence] - Confidence score (0.0 to 1.0)
 * @param {Array<string>} [params.limitations] - Explicit scope boundaries
 * @param {'deterministic' | 'hybrid' | 'semantic'} [params.source] - Execution method
 * @param {string} [params.ruleVersion] - e.g. '1.0'
 * @param {string} [params.evaluatedAt] - ISO timestamp of actual evaluation
 * @returns {object} Formatted CheckResult
 */
export const formatCheckResult = ({
  checkId,
  categoryId,
  title,
  status,
  severity = 'info',
  description = '',
  evidence = [],
  explanation,
  recommendation = null,
  confidence = 1.0,
  limitations = [],
  source = 'deterministic',
  ruleVersion = '1.0',
  evaluatedAt = new Date().toISOString(),
}) => {
  if (!VALID_STATUSES.includes(status)) {
    throw new Error(`Invalid check status '${status}' for ${checkId}. Allowed: ${VALID_STATUSES.join(', ')}`);
  }

  const categoryMeta = CATEGORY_METADATA[categoryId] || { id: categoryId, name: 'General' };

  return {
    checkId,
    categoryId,
    categoryName: categoryMeta.name,
    title,
    status,
    severity: VALID_SEVERITIES.includes(severity) ? severity : 'info',
    description,
    evidence: Array.isArray(evidence) ? evidence : [evidence],
    explanation: explanation || 'Check evaluation completed.',
    recommendation,
    confidence: Math.max(0, Math.min(1.0, Number(confidence) || 1.0)),
    limitations: Array.isArray(limitations) ? limitations : [],
    source,
    ruleVersion,
    evaluatedAt,
  };
};

export default {
  VALID_STATUSES,
  VALID_SEVERITIES,
  CATEGORY_METADATA,
  formatCheckResult,
};
