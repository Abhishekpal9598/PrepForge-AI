/**
 * PrepForge AI — Category 5: Recruiter Red Flags Checks (CHK-19 through CHK-22)
 *
 * Evaluates timeline credibility, collective attribution risk signals,
 * peer experience benchmarking (strictly NOT_EVALUATED unless reliable benchmark data provided),
 * and professional duration coherence.
 */

import { formatCheckResult } from '../utils/resultFormatter.js';
import { collectExperienceBullets } from './resumeContent.js';

/**
 * CHK-19: Resume Timeline Credibility
 */
export const checkTimelineCredibility = (resumeData) => {
  const checkId = 'CHK-19';
  const categoryId = 'CAT-05';
  const title = 'Resume Timeline Credibility';
  const description = 'Detect chronological contradictions, future employment dates, or inverted start/end dates.';

  const experience = resumeData?.parsedSections?.structured?.experience || [];
  const currentYear = new Date().getFullYear();
  const issues = [];

  for (const exp of experience) {
    const startYear = exp.dateRange?.startYear;
    const endYear = exp.dateRange?.isCurrent ? currentYear : exp.dateRange?.endYear;

    // Check for future start dates (> currentYear + 1)
    if (startYear && startYear > currentYear + 1) {
      issues.push(`Future start date detected for '${exp.title || 'Role'}': year ${startYear}`);
    }

    // Check for end date before start date
    if (startYear && endYear && endYear < startYear) {
      issues.push(`End date (${endYear}) precedes start date (${startYear}) for '${exp.title || 'Role'}'`);
    }
  }

  if (issues.length > 0) {
    return formatCheckResult({
      checkId,
      categoryId,
      title,
      status: 'FAIL',
      severity: 'high',
      description,
      evidence: issues,
      explanation: 'Timeline contradictions detected in work history. Inverted dates or future employment dates immediately trigger recruiter skepticism.',
      recommendation: 'Review and correct the dates for your work history entries to ensure strict chronological order.',
      confidence: 0.95,
      limitations: ['Dependent on parsed date intervals.'],
      source: 'deterministic',
    });
  }

  return formatCheckResult({
    checkId,
    categoryId,
    title,
    status: 'PASS',
    severity: 'info',
    description,
    evidence: [`Verified ${experience.length} work experience interval(s)`],
    explanation: 'Work history dates are chronological, valid, and free from timeline discrepancies.',
    recommendation: null,
    confidence: 0.95,
    limitations: [],
    source: 'deterministic',
  });
};

/**
 * CHK-20: Interview Risk Signals
 */
export const checkInterviewRiskSignals = (resumeData) => {
  const checkId = 'CHK-20';
  const categoryId = 'CAT-05';
  const title = 'Interview Risk Signals';
  const description = 'Detect vague scopes, collective attribution, or lack of personal accountability in experience descriptions.';

  const bullets = collectExperienceBullets(resumeData);

  if (bullets.length === 0) {
    return formatCheckResult({
      checkId,
      categoryId,
      title,
      status: 'PASS',
      severity: 'info',
      description,
      evidence: ['No bullets to evaluate'],
      explanation: 'No experience bullets found for attribution analysis.',
      recommendation: null,
      confidence: 0.8,
      limitations: [],
      source: 'deterministic',
    });
  }

  const collectivePatterns = [
    /\b(?:we|our team|the team|part of a team that|helped the team)\b/gi,
  ];

  let collectiveCount = 0;
  const flaggedBullets = [];

  for (const b of bullets) {
    for (const pat of collectivePatterns) {
      if (pat.test(b)) {
        collectiveCount++;
        flaggedBullets.push(b);
        break;
      }
    }
  }

  // If > 25% of bullets use collective "we/team" phrasing
  if (collectiveCount > 0 && collectiveCount / bullets.length >= 0.25) {
    return formatCheckResult({
      checkId,
      categoryId,
      title,
      status: 'WARNING',
      severity: 'medium',
      description,
      evidence: [`${collectiveCount} of ${bullets.length} bullets use collective attribution`, ...flaggedBullets.slice(0, 2)],
      explanation: 'Extensive use of collective phrasing ("we", "the team") obscures your individual contribution and ownership.',
      recommendation: "Clarify your individual scope using first-person active verbs (e.g., 'Engineered', 'Spearheaded') rather than generic team attributions.",
      confidence: 0.85,
      limitations: ['Recognizes that collaborative work is normal, but encourages highlighting individual ownership.'],
      source: 'deterministic',
    });
  }

  return formatCheckResult({
    checkId,
    categoryId,
    title,
    status: 'PASS',
    severity: 'info',
    description,
    evidence: [`${bullets.length} bullet(s) evaluated`, 'Individual accountability emphasized'],
    explanation: 'Experience bullets emphasize individual ownership, agency, and direct technical contribution.',
    recommendation: null,
    confidence: 0.9,
    limitations: [],
    source: 'deterministic',
  });
};

/**
 * CHK-21: Peer Experience Benchmarking
 *
 * MANDATORY REQUIREMENT: Must return NOT_EVALUATED unless reliable and relevant
 * benchmark data is genuinely available. Never invent peer benchmarks or career-tier statistics.
 */
export const checkPeerBenchmarking = (resumeData, options = {}) => {
  const checkId = 'CHK-21';
  const categoryId = 'CAT-05';
  const title = 'Peer Experience Benchmarking';
  const description = 'Verify depth and bullet density match expectations for stated career level tier without fabricating peer statistics.';

  const benchmarkData = options?.benchmarkData;

  // STRICT RULE: If benchmark data is not provided or null/undefined, return NOT_EVALUATED
  if (!benchmarkData || typeof benchmarkData !== 'object' || Object.keys(benchmarkData).length === 0) {
    return formatCheckResult({
      checkId,
      categoryId,
      title,
      status: 'NOT_EVALUATED',
      severity: 'info',
      description,
      evidence: ['Peer benchmark dataset not provided'],
      explanation: 'Peer experience benchmarking requires verified industry and career-tier benchmark datasets which are not configured. Check skipped to avoid fabricated comparisons.',
      recommendation: 'Configure verified industry benchmark parameters to evaluate comparative role depth.',
      confidence: 1.0,
      limitations: ['Ethical guardrail: Fabricated peer statistics or tier percentiles are strictly forbidden.'],
      source: 'deterministic',
    });
  }

  // If verified benchmark data is supplied:
  const requiredMinBullets = benchmarkData.minBulletsPerRole || 3;
  const experience = resumeData?.parsedSections?.structured?.experience || [];

  const thinRoles = [];
  for (const exp of experience) {
    const bulletCount = Array.isArray(exp.bullets) ? exp.bullets.length : 0;
    if (bulletCount < requiredMinBullets) {
      thinRoles.push({ role: exp.title || 'Role', count: bulletCount });
    }
  }

  if (thinRoles.length > 0) {
    return formatCheckResult({
      checkId,
      categoryId,
      title,
      status: 'WARNING',
      severity: 'medium',
      description,
      evidence: thinRoles.map((r) => `'${r.role}': ${r.count} bullets (expected >= ${requiredMinBullets})`),
      explanation: `Several roles contain fewer bullets than expected for verified peer benchmarks (${requiredMinBullets} bullets/role).`,
      recommendation: `Expand bullet points for your key roles to meet the benchmark threshold of at least ${requiredMinBullets} bullets.`,
      confidence: 0.9,
      limitations: ['Based on user-supplied peer benchmark parameters.'],
      source: 'deterministic',
    });
  }

  return formatCheckResult({
    checkId,
    categoryId,
    title,
    status: 'PASS',
    severity: 'info',
    description,
    evidence: [`All ${experience.length} role(s) meet benchmark bullet depth (>= ${requiredMinBullets})`],
    explanation: 'Bullet density and role depth meet or exceed verified peer benchmark requirements.',
    recommendation: null,
    confidence: 0.9,
    limitations: [],
    source: 'deterministic',
  });
};

/**
 * CHK-22: Professional Presence Match
 */
export const checkProfessionalPresenceMatch = (resumeData) => {
  const checkId = 'CHK-22';
  const categoryId = 'CAT-05';
  const title = 'Professional Presence Match';
  const description = 'Validate coherence between summary headline claims and documented job history durations.';

  const summary = (resumeData?.parsedSections?.rawSections?.summary || '').toLowerCase();
  const timeline = resumeData?.parsedSections?.structured?.timeline;
  const totalYears = timeline?.totalExperienceYears || 0;

  // Search for claims like "X+ years", "over X years", "X years of experience"
  const claimedMatch = summary.match(/\b(?:(\d{1,2})\+?|\b(five|ten|fifteen|twenty))\s+years\b/i);

  if (!claimedMatch) {
    return formatCheckResult({
      checkId,
      categoryId,
      title,
      status: 'PASS',
      severity: 'info',
      description,
      evidence: [`Documented experience: ~${totalYears} years`, 'No explicit numeric experience claim in summary'],
      explanation: 'No explicit numeric years-of-experience claims found in summary that contradict documented timeline.',
      recommendation: null,
      confidence: 0.85,
      limitations: [],
      source: 'deterministic',
    });
  }

  const wordToNum = { five: 5, ten: 10, fifteen: 15, twenty: 20 };
  const claimedYears = claimedMatch[1] ? parseInt(claimedMatch[1], 10) : wordToNum[claimedMatch[2]?.toLowerCase()] || 0;

  // If claimed years exceeds documented years by more than 2 years
  if (claimedYears > totalYears + 2 && totalYears > 0) {
    return formatCheckResult({
      checkId,
      categoryId,
      title,
      status: 'WARNING',
      severity: 'low',
      description,
      evidence: [`Claimed experience: ${claimedYears} years`, `Documented timeline: ~${totalYears} years`],
      explanation: `Summary claims '${claimedMatch[0]}' but documented work history accounts for ~${totalYears} years. Large discrepancies can raise credibility questions during recruiter screening.`,
      recommendation: 'Align claimed years of experience in your summary with your documented work history.',
      confidence: 0.85,
      limitations: ['Cannot account for unlisted freelance, contract, or non-technical work.'],
      source: 'deterministic',
    });
  }

  return formatCheckResult({
    checkId,
    categoryId,
    title,
    status: 'PASS',
    severity: 'info',
    description,
    evidence: [`Claimed: ${claimedYears} years`, `Documented: ~${totalYears} years`],
    explanation: 'Claimed years of experience in professional summary align with documented work history.',
    recommendation: null,
    confidence: 0.9,
    limitations: [],
    source: 'deterministic',
  });
};

export default {
  checkTimelineCredibility,
  checkInterviewRiskSignals,
  checkPeerBenchmarking,
  checkProfessionalPresenceMatch,
};
