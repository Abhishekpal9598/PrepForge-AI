/**
 * PrepForge AI — Multi-Dimensional Scoring Engine
 *
 * Implements deterministic, transparent, and explainable score calculation across:
 * 1. ATS Compatibility Score (0 - 100)
 * 2. Content Quality Score (0 - 100)
 * 3. Structure Score (0 - 100)
 * 4. Overall Resume Score (0 - 100)
 * 5. Conditional Job Match Score (0 - 100 or null)
 * 6. Dynamic Score Confidence & Audit Breakdown
 */

export const SCORING_VERSION = '1.0.0';

/**
 * Calculates localized CHK-08 contact score
 * Base score 100:
 * - Missing email: -20
 * - Missing phone: -5
 * - Missing physical address: 0 (strictly optional)
 * Expected scores: 100 (complete), 95 (no phone), 80 (no email), 75 (neither)
 *
 * @param {object} check08
 * @returns {number} 0 - 100
 */
export const calculateContactScore = (check08) => {
  if (!check08) return 100;
  if (check08.status === 'NOT_EVALUATED') return null;

  let score = 100;
  const evidenceStr = Array.isArray(check08.evidence) ? check08.evidence.join(' ').toLowerCase() : '';
  const explStr = (check08.explanation || '').toLowerCase();
  const combined = `${evidenceStr} ${explStr}`;

  const missingEmail =
    combined.includes('email is missing') ||
    combined.includes('no email') ||
    (Array.isArray(check08.evidence) && check08.evidence.some((e) => typeof e === 'string' && e.toLowerCase() === 'email'));

  const missingPhone =
    combined.includes('missing phone') ||
    combined.includes('no telephone') ||
    combined.includes('phone number is missing') ||
    (Array.isArray(check08.evidence) && check08.evidence.some((e) => typeof e === 'string' && e.toLowerCase().includes('missing phone')));

  if (check08.status === 'FAIL') {
    if (missingPhone || combined.includes('phone')) {
      score -= 25; // both email and phone missing
    } else {
      score -= 20; // email missing only
    }
  } else if (check08.status === 'WARNING') {
    score -= 5; // phone missing only
  }

  return Math.max(0, Math.min(100, score));
};

/**
 * Normalizes an individual CheckResult to a 0-100 numerical score or null
 *
 * Qualitative checks: PASS = 100, WARNING = 70, FAIL = 35
 * Quantitative checks retain their calculated continuous ratios
 * NOT_EVALUATED checks return null (excluded from averages)
 *
 * @param {object} check
 * @returns {number|null} Normalized score (0-100) or null
 */
export const normalizeCheckScore = (check) => {
  if (!check || check.status === 'NOT_EVALUATED') {
    return null;
  }

  const { checkId, status, evidence } = check;

  // 1. CHK-01 (File Format & Critical Parsing)
  if (checkId === 'CHK-01') {
    return status === 'FAIL' ? 0 : 100;
  }

  // 2. CHK-08 (Contact Information Completeness)
  if (checkId === 'CHK-08') {
    return calculateContactScore(check);
  }

  // 3. CHK-10 (ATS Parse Rate Ratio)
  if (checkId === 'CHK-10') {
    const evidenceStr = Array.isArray(evidence) ? evidence.join(' ') : String(evidence || '');
    const match = evidenceStr.match(/parse\s*rate:\s*(\d{1,3})%/i);
    if (match) {
      return Math.max(0, Math.min(100, parseInt(match[1], 10)));
    }
    return status === 'PASS' ? 100 : status === 'WARNING' ? 75 : 45;
  }

  // 4. CHK-11 (Quantified Achievements STAR Ratio)
  if (checkId === 'CHK-11') {
    const evidenceStr = Array.isArray(evidence) ? evidence.join(' ') : String(evidence || '');
    const match = evidenceStr.match(/quantified\s*ratio:\s*(\d{1,3})%/i);
    if (match) {
      return Math.max(0, Math.min(100, parseInt(match[1], 10)));
    }
    return status === 'PASS' ? 100 : status === 'WARNING' ? 70 : 40;
  }

  // 5. CHK-15 (Hard Technical Skills Overlap Ratio)
  if (checkId === 'CHK-15') {
    const evidenceStr = Array.isArray(evidence) ? evidence.join(' ') : String(evidence || '');
    const match = evidenceStr.match(/(?:\(|\b)(\d{1,3})%/);
    if (match) {
      return Math.max(0, Math.min(100, parseInt(match[1], 10)));
    }
    return status === 'PASS' ? 100 : status === 'WARNING' ? 65 : 35;
  }

  // 6. CHK-26 (Skills Demonstrated in Bullets Ratio)
  if (checkId === 'CHK-26') {
    const evidenceStr = Array.isArray(evidence) ? evidence.join(' ') : String(evidence || '');
    const match = evidenceStr.match(/substantiated:\s*(\d{1,3})%/i);
    if (match) {
      return Math.max(0, Math.min(100, parseInt(match[1], 10)));
    }
    return status === 'PASS' ? 100 : status === 'WARNING' ? 60 : 35;
  }

  // 7. Qualitative Checks Baseline
  switch (status) {
    case 'PASS':
      return 100;
    case 'WARNING':
      return 70;
    case 'FAIL':
      return 35;
    default:
      return null;
  }
};

/**
 * Computes arithmetic mean of an array of scores, excluding null / NOT_EVALUATED.
 * Returns null if all items are null (component completely unevaluated).
 *
 * @param {Array<number|null>} scores
 * @returns {number|null}
 */
export const calculateComponentAverage = (scores) => {
  const validScores = (scores || []).filter((s) => typeof s === 'number' && !Number.isNaN(s));
  if (validScores.length === 0) {
    return null;
  }
  const sum = validScores.reduce((acc, curr) => acc + curr, 0);
  return Math.round((sum / validScores.length) * 100) / 100;
};

/**
 * Calculates ATS Compatibility Score:
 * ATS = round(0.50 * Cat1 + 0.30 * Cat2Presence + 0.20 * CHK10)
 * Hard-cap: ATS <= 40 if CHK-01 is critical parsing failure
 *
 * @param {Map<string, number|null>} checkScoresMap
 * @param {object} check01
 * @returns {{ score: number|null, breakdown: object }}
 */
export const calculateAtsScore = (checkScoresMap, check01) => {
  // Cat 1: CHK-01 to CHK-06
  const cat1Scores = [
    checkScoresMap.get('CHK-01'),
    checkScoresMap.get('CHK-02'),
    checkScoresMap.get('CHK-03'),
    checkScoresMap.get('CHK-04'),
    checkScoresMap.get('CHK-05'),
    checkScoresMap.get('CHK-06'),
  ];
  const cat1Score = calculateComponentAverage(cat1Scores);

  // Cat 2 Presence: CHK-07 (60%) + CHK-08 (40%)
  const chk07Score = checkScoresMap.get('CHK-07');
  const chk08Score = checkScoresMap.get('CHK-08');

  let presenceScore = null;
  if (chk07Score !== null && chk08Score !== null) {
    presenceScore = Math.round((0.60 * chk07Score + 0.40 * chk08Score) * 100) / 100;
  } else if (chk07Score !== null) {
    presenceScore = chk07Score;
  } else if (chk08Score !== null) {
    presenceScore = chk08Score;
  }

  // CHK-10: Technical Parse Rate
  const chk10Score = checkScoresMap.get('CHK-10');

  // If any required top-level ATS component is null, return null (never silently redistribute weights)
  if (cat1Score === null || presenceScore === null || chk10Score === null) {
    return {
      score: null,
      breakdown: {
        cat1Score,
        presenceScore,
        chk10Score,
        hardCapApplied: false,
      },
    };
  }

  let rawAts = 0.50 * cat1Score + 0.30 * presenceScore + 0.20 * chk10Score;
  let hardCapApplied = false;

  // CHK-01 Hard-cap check
  if (check01 && check01.status === 'FAIL') {
    rawAts = Math.min(40, rawAts);
    hardCapApplied = true;
  }

  const finalScore = Math.max(0, Math.min(100, Math.round(rawAts)));

  return {
    score: finalScore,
    breakdown: {
      cat1Score,
      presenceScore,
      chk10Score,
      rawAts: Math.round(rawAts * 100) / 100,
      hardCapApplied,
      capLimit: hardCapApplied ? 40 : null,
    },
  };
};

/**
 * Calculates Content Quality Score:
 * Content = round(0.60 * Cat3Quality + 0.40 * Cat7Seniority)
 *
 * @param {Map<string, number|null>} checkScoresMap
 * @returns {{ score: number|null, breakdown: object }}
 */
export const calculateContentScore = (checkScoresMap) => {
  // Cat 3 Quality: CHK-11, CHK-12, CHK-13, CHK-14 (CHK-10 belongs to ATS Score)
  const cat3Scores = [
    checkScoresMap.get('CHK-11'),
    checkScoresMap.get('CHK-12'),
    checkScoresMap.get('CHK-13'),
    checkScoresMap.get('CHK-14'),
  ];
  const cat3Score = calculateComponentAverage(cat3Scores);

  // Cat 7 Seniority & Demonstrated Skills: CHK-25, CHK-26, CHK-27
  const cat7Scores = [
    checkScoresMap.get('CHK-25'),
    checkScoresMap.get('CHK-26'),
    checkScoresMap.get('CHK-27'),
  ];
  const cat7Score = calculateComponentAverage(cat7Scores);

  if (cat3Score === null || cat7Score === null) {
    return {
      score: null,
      breakdown: { cat3Score, cat7Score },
    };
  }

  const rawContent = 0.60 * cat3Score + 0.40 * cat7Score;
  const finalScore = Math.max(0, Math.min(100, Math.round(rawContent)));

  return {
    score: finalScore,
    breakdown: {
      cat3Score,
      cat7Score,
      rawContent: Math.round(rawContent * 100) / 100,
    },
  };
};

/**
 * Calculates Structure Score:
 * Structure = round(0.25 * CHK09 + 0.75 * Cat5RedFlags)
 * Category 6 (CHK-23, CHK-24) carries strictly zero weight (w_Cat6 = 0)
 *
 * @param {Map<string, number|null>} checkScoresMap
 * @returns {{ score: number|null, breakdown: object }}
 */
export const calculateStructureScore = (checkScoresMap) => {
  // CHK-09: Section Structural Flow
  const chk09Score = checkScoresMap.get('CHK-09');

  // Cat 5: CHK-19, CHK-20, CHK-21, CHK-22 (CHK-21 omitted without penalty if NOT_EVALUATED)
  const cat5Scores = [
    checkScoresMap.get('CHK-19'),
    checkScoresMap.get('CHK-20'),
    checkScoresMap.get('CHK-21'),
    checkScoresMap.get('CHK-22'),
  ];
  const cat5Score = calculateComponentAverage(cat5Scores);

  if (chk09Score === null || cat5Score === null) {
    return {
      score: null,
      breakdown: { chk09Score, cat5Score, cat6Weight: 0 },
    };
  }

  const rawStructure = 0.25 * chk09Score + 0.75 * cat5Score;
  const finalScore = Math.max(0, Math.min(100, Math.round(rawStructure)));

  return {
    score: finalScore,
    breakdown: {
      chk09Score,
      cat5Score,
      cat6Weight: 0,
      rawStructure: Math.round(rawStructure * 100) / 100,
    },
  };
};

/**
 * Calculates Conditional Job Match Score:
 * JobMatch = round(0.40 * CHK15 + 0.25 * CHK16 + 0.20 * CHK17 + 0.15 * CHK18)
 * Strictly null if no target job description is provided
 *
 * @param {Map<string, number|null>} checkScoresMap
 * @param {boolean} hasValidJobDescription
 * @returns {{ score: number|null, breakdown: object|null }}
 */
export const calculateJobMatchScore = (checkScoresMap, hasValidJobDescription) => {
  if (!hasValidJobDescription) {
    return {
      score: null,
      breakdown: null,
    };
  }

  const chk15 = checkScoresMap.get('CHK-15');
  const chk16 = checkScoresMap.get('CHK-16');
  const chk17 = checkScoresMap.get('CHK-17');
  const chk18 = checkScoresMap.get('CHK-18');

  // If all 4 checks in this component are NOT_EVALUATED, return null
  if (chk15 === null && chk16 === null && chk17 === null && chk18 === null) {
    return {
      score: null,
      breakdown: null,
    };
  }

  // Use available checks or defaults for evaluated
  const s15 = chk15 ?? 35;
  const s16 = chk16 ?? 70;
  const s17 = chk17 ?? 70;
  const s18 = chk18 ?? 70;

  const rawJobMatch = 0.40 * s15 + 0.25 * s16 + 0.20 * s17 + 0.15 * s18;
  const finalScore = Math.max(0, Math.min(100, Math.round(rawJobMatch)));

  return {
    score: finalScore,
    breakdown: {
      hardSkillsScore: s15,
      softSkillsScore: s16,
      actionVerbsScore: s17,
      titleAlignmentScore: s18,
      rawJobMatch: Math.round(rawJobMatch * 100) / 100,
    },
  };
};

/**
 * Calculates Overall Resume Score:
 * Overall = round(0.35 * ATS + 0.35 * Content + 0.30 * Structure)
 * If any required top-level component is null, Overall Score returns null (no silent redistribution)
 *
 * @param {number|null} atsScore
 * @param {number|null} contentScore
 * @param {number|null} structureScore
 * @returns {number|null}
 */
export const calculateOverallScore = (atsScore, contentScore, structureScore) => {
  if (atsScore === null || contentScore === null || structureScore === null) {
    return null;
  }

  const rawOverall = 0.35 * atsScore + 0.35 * contentScore + 0.30 * structureScore;
  return Math.max(0, Math.min(100, Math.round(rawOverall)));
};

/**
 * Calculates dynamic score confidence based on actual applicable checks.
 * Never assigns an arbitrary default or hardcoded ratio.
 *
 * Excludes:
 * 1. Bias prevention checks CHK-23 and CHK-24 (strictly zero scoring impact)
 * 2. CHK-15 to CHK-18 when no valid JD is supplied
 * 3. CHK-21 when benchmark data is legitimately unsupplied
 *
 * @param {Array<object>} detailedChecks
 * @param {boolean} hasValidJobDescription
 * @returns {{ confidence: number|null, metrics: object }}
 */
export const computeScoreConfidence = (detailedChecks, hasValidJobDescription) => {
  if (!Array.isArray(detailedChecks) || detailedChecks.length === 0) {
    return { confidence: null, metrics: null };
  }

  const checkMap = new Map();
  for (const c of detailedChecks) {
    checkMap.set(c.checkId, c);
  }

  const excludedCheckIds = ['CHK-23', 'CHK-24']; // Rule 1: Always exclude bias checks

  // Rule 2: Exclude JD-dependent checks if no JD supplied
  if (!hasValidJobDescription) {
    excludedCheckIds.push('CHK-15', 'CHK-16', 'CHK-17', 'CHK-18');
  }

  // Rule 3: Exclude CHK-21 if benchmark data is legitimately unavailable
  const chk21 = checkMap.get('CHK-21');
  if (chk21 && chk21.status === 'NOT_EVALUATED') {
    excludedCheckIds.push('CHK-21');
  }

  // Applicable checks are all checks not in excluded list
  const applicableChecks = detailedChecks.filter((c) => !excludedCheckIds.includes(c.checkId));

  if (applicableChecks.length === 0) {
    return {
      confidence: null,
      metrics: {
        totalChecks: detailedChecks.length,
        applicableCount: 0,
        evaluatedCount: 0,
        excludedCount: excludedCheckIds.length,
        excludedCheckIds,
      },
    };
  }

  // Rule 4: Evaluated applicable checks are those with status !== 'NOT_EVALUATED'
  const evaluatedApplicable = applicableChecks.filter((c) => c.status !== 'NOT_EVALUATED');
  const confidence = Math.round((evaluatedApplicable.length / applicableChecks.length) * 100) / 100;

  return {
    confidence: Math.max(0, Math.min(1, confidence)),
    metrics: {
      totalChecks: detailedChecks.length,
      applicableCount: applicableChecks.length,
      evaluatedCount: evaluatedApplicable.length,
      excludedCount: excludedCheckIds.length,
      excludedCheckIds,
    },
  };
};

/**
 * Master multi-dimensional scoring orchestrator
 *
 * @param {Array<object>} detailedChecks - Array of 27 CheckResult objects
 * @param {object} [options]
 * @param {string} [options.jobDescription] - Target job description text
 * @returns {object} Calculated scores, confidence, breakdown, and execution metadata
 */
export const computeMultiDimensionalScores = (detailedChecks, options = {}) => {
  const scoredAt = new Date().toISOString();

  if (!Array.isArray(detailedChecks) || detailedChecks.length === 0) {
    return {
      overallScore: null,
      subScores: {
        atsScore: null,
        contentScore: null,
        structureScore: null,
        jobMatchScore: null,
      },
      scoreConfidence: null,
      scoringVersion: SCORING_VERSION,
      scoredAt,
      scoringBreakdown: null,
    };
  }

  const jdText = options?.jobDescription;
  const hasValidJobDescription = Boolean(jdText && typeof jdText === 'string' && jdText.trim().length > 0);

  // Normalize all checks and populate lookup map
  const checkScoresMap = new Map();
  const individualScores = {};
  const omittedChecks = [];

  for (const check of detailedChecks) {
    const score = normalizeCheckScore(check);
    checkScoresMap.set(check.checkId, score);
    individualScores[check.checkId] = score;

    if (check.status === 'NOT_EVALUATED') {
      omittedChecks.push({
        checkId: check.checkId,
        category: check.categoryName || check.categoryId,
        reason: check.explanation || 'Check not evaluated for this document.',
      });
    }
  }

  const check01 = detailedChecks.find((c) => c.checkId === 'CHK-01');

  // Compute Dimensional Sub-Scores
  const atsResult = calculateAtsScore(checkScoresMap, check01);
  const contentResult = calculateContentScore(checkScoresMap);
  const structureResult = calculateStructureScore(checkScoresMap);
  const jobMatchResult = calculateJobMatchScore(checkScoresMap, hasValidJobDescription);

  // Compute Overall Score (returns null if any required top-level component is null)
  const overallScore = calculateOverallScore(
    atsResult.score,
    contentResult.score,
    structureResult.score
  );

  // Compute Score Confidence without fabrication
  const { confidence, metrics } = computeScoreConfidence(detailedChecks, hasValidJobDescription);

  const scoringBreakdown = {
    scoringVersion: SCORING_VERSION,
    scoredAt,
    weights: {
      overall: { ats: 0.35, content: 0.35, structure: 0.30 },
      ats: { cat1: 0.50, cat2Presence: 0.30, chk10: 0.20 },
      content: { cat3Quality: 0.60, cat7Seniority: 0.40 },
      structure: { chk09Flow: 0.25, cat5RedFlags: 0.75, cat6Weight: 0.00 },
      jobMatch: hasValidJobDescription ? { hardSkills: 0.40, softSkills: 0.25, actionVerbs: 0.20, title: 0.15 } : null,
    },
    components: {
      ats: atsResult.breakdown,
      content: contentResult.breakdown,
      structure: structureResult.breakdown,
      jobMatch: jobMatchResult.breakdown,
    },
    individualScores,
    omittedChecks,
    confidenceMetrics: metrics,
    criticalCapInfo: {
      applied: atsResult.breakdown.hardCapApplied,
      capValue: atsResult.breakdown.capLimit,
      trigger: atsResult.breakdown.hardCapApplied ? 'CHK-01 critical parsing failure' : null,
    },
  };

  return {
    overallScore,
    subScores: {
      atsScore: atsResult.score,
      contentScore: contentResult.score,
      structureScore: structureResult.score,
      jobMatchScore: jobMatchResult.score,
    },
    scoreConfidence: confidence,
    scoringVersion: SCORING_VERSION,
    scoredAt,
    scoringBreakdown,
  };
};

export default {
  SCORING_VERSION,
  calculateContactScore,
  normalizeCheckScore,
  calculateComponentAverage,
  calculateAtsScore,
  calculateContentScore,
  calculateStructureScore,
  calculateJobMatchScore,
  calculateOverallScore,
  computeScoreConfidence,
  computeMultiDimensionalScores,
};
