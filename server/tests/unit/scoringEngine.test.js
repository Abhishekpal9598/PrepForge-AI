import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
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
} from '../../src/services/scoringEngine.js';

/**
 * Creates a standard mock array of 27 checks (all passing by default).
 * Allows overriding individual checks by checkId.
 */
const createMockChecks = (overrides = {}) => {
  const allCheckIds = [
    { id: 'CHK-01', cat: 'CAT-01', name: 'File Format & Technical Readability' },
    { id: 'CHK-02', cat: 'CAT-01', name: 'File Size Validation' },
    { id: 'CHK-03', cat: 'CAT-01', name: 'Text Extractability & OCR Artifacts' },
    { id: 'CHK-04', cat: 'CAT-01', name: 'Multi-Column Layout Disruption' },
    { id: 'CHK-05', cat: 'CAT-01', name: 'Table / Graphic / Header / Footer Traps' },
    { id: 'CHK-06', cat: 'CAT-01', name: 'Font Compatibility & Encoding Anomalies' },
    { id: 'CHK-07', cat: 'CAT-02', name: 'Core Essential Sections Presence' },
    { id: 'CHK-08', cat: 'CAT-02', name: 'Contact Information Completeness' },
    { id: 'CHK-09', cat: 'CAT-02', name: 'Section Heading Conventions & Flow' },
    { id: 'CHK-10', cat: 'CAT-03', name: 'Parse Rate / Technical Parsing Completeness' },
    { id: 'CHK-11', cat: 'CAT-03', name: 'Quantified Impact & Metric Density' },
    { id: 'CHK-12', cat: 'CAT-03', name: 'Action Verb Diversity & Strength' },
    { id: 'CHK-13', cat: 'CAT-03', name: 'Repetition & Buzzword Detection' },
    { id: 'CHK-14', cat: 'CAT-03', name: 'Spelling, Grammar & Typo Detection' },
    { id: 'CHK-15', cat: 'CAT-04', name: 'Hard Skill Match vs Job Description' },
    { id: 'CHK-16', cat: 'CAT-04', name: 'Soft Skill Match vs Job Description' },
    { id: 'CHK-17', cat: 'CAT-04', name: 'Action Verb Alignment vs Job Description' },
    { id: 'CHK-18', cat: 'CAT-04', name: 'Job Title Alignment vs Target Role' },
    { id: 'CHK-19', cat: 'CAT-05', name: 'Total Resume Length vs Experience Level' },
    { id: 'CHK-20', cat: 'CAT-05', name: 'Bullet Point Length & Density Consistency' },
    { id: 'CHK-21', cat: 'CAT-05', name: 'Peer Comparison Benchmarking' },
    { id: 'CHK-22', cat: 'CAT-05', name: 'Personal Pronoun Usage' },
    { id: 'CHK-23', cat: 'CAT-06', name: 'Age-Indicating Graduation Dates Detection' },
    { id: 'CHK-24', cat: 'CAT-06', name: 'Employment Gap Detection' },
    { id: 'CHK-25', cat: 'CAT-07', name: 'Leadership & Initiative Indicators' },
    { id: 'CHK-26', cat: 'CAT-07', name: 'Skills Demonstrated in Bullet Context' },
    { id: 'CHK-27', cat: 'CAT-07', name: 'Summary Section Quality & Impact' },
  ];

  return allCheckIds.map(({ id, cat, name }) => {
    const override = overrides[id] || {};
    return {
      checkId: id,
      categoryId: cat,
      categoryName: name,
      title: name,
      status: override.status || 'PASS',
      severity: override.severity || 'low',
      evidence: override.evidence !== undefined ? override.evidence : ['Satisfies check criteria.'],
      explanation: override.explanation || `${name} evaluated successfully.`,
      recommendation: override.recommendation || null,
      confidence: override.confidence !== undefined ? override.confidence : 1.0,
      limitations: override.limitations || [],
      source: 'deterministic',
      ruleVersion: '1.0',
      evaluatedAt: new Date().toISOString(),
    };
  });
};

describe('Suite: Multi-Dimensional Scoring Engine (Phase 4 Unit Tests)', () => {
  // TC-SC-01: Perfect score baseline
  it('TC-SC-01: Calculates perfect scores (100) when all checks pass and JD is provided', () => {
    const checks = createMockChecks();
    const result = computeMultiDimensionalScores(checks, { jobDescription: 'Senior Software Engineer' });

    assert.equal(result.subScores.atsScore, 100);
    assert.equal(result.subScores.contentScore, 100);
    assert.equal(result.subScores.structureScore, 100);
    assert.equal(result.subScores.jobMatchScore, 100);
    assert.equal(result.overallScore, 100);
    assert.equal(result.scoreConfidence, 1.0);
    assert.equal(result.scoringVersion, SCORING_VERSION);
    assert.ok(result.scoredAt);
  });

  // TC-SC-02: Missing Email deduction
  it('TC-SC-02: Applies localized deduction of -20 for missing email (CHK-08 score = 80)', () => {
    const check08 = {
      checkId: 'CHK-08',
      status: 'FAIL',
      evidence: ['Email is missing from resume header.'],
      explanation: 'No email address found in resume header.',
    };
    const score = calculateContactScore(check08);
    assert.equal(score, 80);

    // Verify when plugged into overall scoring, Structure and Content remain 100
    const checks = createMockChecks({ 'CHK-08': check08 });
    const result = computeMultiDimensionalScores(checks, { jobDescription: 'Engineer' });
    assert.equal(result.subScores.contentScore, 100, 'Content score must not be deducted for contact info');
    assert.equal(result.subScores.structureScore, 100, 'Structure score must not be deducted for contact info');
    // ATS: Cat1=100 (50%), Cat2Presence = 0.60*100 + 0.40*80 = 92 (30%), CHK10=100 (20%)
    // ATS = 50 + 27.6 + 20 = 97.6 -> round = 98
    assert.equal(result.subScores.atsScore, 98);
  });

  // TC-SC-03: Missing Phone deduction
  it('TC-SC-03: Applies localized deduction of -5 for missing phone (CHK-08 score = 95)', () => {
    const check08 = {
      checkId: 'CHK-08',
      status: 'WARNING',
      evidence: ['Missing phone number in contact header.'],
      explanation: 'No telephone number provided.',
    };
    const score = calculateContactScore(check08);
    assert.equal(score, 95);
  });

  // TC-SC-04: Missing Both Email and Phone deduction
  it('TC-SC-04: Applies total deduction of -25 for missing both email and phone (CHK-08 score = 75)', () => {
    const check08 = {
      checkId: 'CHK-08',
      status: 'FAIL',
      evidence: ['Email is missing', 'Missing phone number'],
      explanation: 'Both email and phone number are missing from contact details.',
    };
    const score = calculateContactScore(check08);
    assert.equal(score, 75);
  });

  // TC-SC-05: Optional Physical Address missing
  it('TC-SC-05: Missing physical address incurs NO deduction (CHK-08 score = 100)', () => {
    const check08 = {
      checkId: 'CHK-08',
      status: 'PASS',
      evidence: ['email: test@example.com', 'phone: +1-555-0100', 'Address omitted (optional)'],
      explanation: 'Contact information contains email and phone number. Physical address is optional.',
    };
    const score = calculateContactScore(check08);
    assert.equal(score, 100);
  });

  // TC-SC-06: Orthogonality: CHK-09 section ordering affects only Structure Score
  it('TC-SC-06: Section ordering failure (CHK-09) reduces Structure Score (25% weight) without affecting ATS Score', () => {
    const checks = createMockChecks({
      'CHK-09': {
        status: 'FAIL',
        evidence: ['Sections in unconventional order: Education precedes Experience'],
      },
    });
    const result = computeMultiDimensionalScores(checks, { jobDescription: 'Engineer' });

    assert.equal(result.subScores.atsScore, 100, 'ATS Score must be completely unaffected by section order (CHK-09)');
    // Structure: 0.25 * 35 (CHK09 FAIL=35) + 0.75 * 100 (Cat5=100) = 8.75 + 75 = 83.75 -> round = 84
    assert.equal(result.subScores.structureScore, 84);
  });

  // TC-SC-07: Orthogonality: CHK-07 section presence affects ATS Score, not Structure
  it('TC-SC-07: Section presence warning (CHK-07) reduces ATS Score without affecting Structure Score', () => {
    const checks = createMockChecks({
      'CHK-07': {
        status: 'WARNING',
        evidence: ['Missing optional sections: summary'],
      },
    });
    const result = computeMultiDimensionalScores(checks, { jobDescription: 'Engineer' });

    assert.equal(result.subScores.structureScore, 100, 'Structure Score must be completely unaffected by section presence (CHK-07)');
    // Presence: 0.60 * 70 (CHK07 WARNING) + 0.40 * 100 = 42 + 40 = 82
    // ATS: 0.50 * 100 + 0.30 * 82 + 0.20 * 100 = 50 + 24.6 + 20 = 94.6 -> round = 95
    assert.equal(result.subScores.atsScore, 95);
  });

  // TC-SC-08: Ethical non-penalization: CHK-23 graduation dates have ZERO impact
  it('TC-SC-08: Age-indicating graduation dates (CHK-23) carry strictly 0% weight in Structure and Overall Scores', () => {
    const checks = createMockChecks({
      'CHK-23': {
        status: 'WARNING',
        evidence: ['Graduation date 1998 detected (>15 years ago). Informational finding only.'],
        explanation: 'Candidate has graduation date over 15 years ago.',
      },
    });
    const result = computeMultiDimensionalScores(checks, { jobDescription: 'Engineer' });

    assert.equal(result.subScores.structureScore, 100, 'CHK-23 must have zero impact on Structure score');
    assert.equal(result.overallScore, 100, 'CHK-23 must have zero impact on Overall score');
    assert.equal(result.scoringBreakdown.weights.structure.cat6Weight, 0, 'Cat 6 weight must explicitly be 0.00');
  });

  // TC-SC-09: Ethical non-penalization: CHK-24 employment gaps have ZERO impact
  it('TC-SC-09: Employment gap detection (CHK-24) carries strictly 0% weight in Structure and Overall Scores', () => {
    const checks = createMockChecks({
      'CHK-24': {
        status: 'WARNING',
        evidence: ['Gap of 8 months between 2021 and 2022 detected.'],
        explanation: 'Employment gap detected neutrally.',
      },
    });
    const result = computeMultiDimensionalScores(checks, { jobDescription: 'Engineer' });

    assert.equal(result.subScores.structureScore, 100, 'CHK-24 must have zero impact on Structure score');
    assert.equal(result.overallScore, 100, 'CHK-24 must have zero impact on Overall score');
  });

  // TC-SC-10: Critical Parsing Failure ATS hard-cap (<= 40)
  it('TC-SC-10: Critical parsing failure (CHK-01 FAIL) hard-caps ATS score at <= 40', () => {
    const checks = createMockChecks({
      'CHK-01': {
        status: 'FAIL',
        evidence: ['Corrupted PDF or critical parse failure.'],
      },
    });
    const result = computeMultiDimensionalScores(checks, { jobDescription: 'Engineer' });

    assert.ok(result.subScores.atsScore <= 40, `ATS Score (${result.subScores.atsScore}) must be <= 40`);
    assert.equal(result.subScores.atsScore, 40);
    assert.equal(result.scoringBreakdown.criticalCapInfo.applied, true);
    assert.equal(result.scoringBreakdown.criticalCapInfo.capValue, 40);
  });

  // TC-SC-11: Job Match Without Job Description is strictly null
  it('TC-SC-11: Job Match Score is strictly null when no job description is provided', () => {
    const checks = createMockChecks();
    const result = computeMultiDimensionalScores(checks, {}); // No job description

    assert.equal(result.subScores.jobMatchScore, null);
    assert.equal(result.scoringBreakdown.components.jobMatch, null);
    assert.equal(result.scoringBreakdown.weights.jobMatch, null);
  });

  // TC-SC-12: Job Match With Job Description computes weighted score
  it('TC-SC-12: Job Match Score computes weighted formula (0.40/0.25/0.20/0.15) when JD is provided', () => {
    const checks = createMockChecks({
      'CHK-15': { status: 'WARNING', evidence: ['Hard skill match: 60%'] }, // ratio = 60
      'CHK-16': { status: 'PASS', evidence: ['Soft skills matched'] }, // 100
      'CHK-17': { status: 'PASS', evidence: ['Action verbs aligned'] }, // 100
      'CHK-18': { status: 'WARNING', evidence: ['Title alignment partial'] }, // 70
    });
    const result = computeMultiDimensionalScores(checks, { jobDescription: 'Software Architect' });

    // JobMatch = 0.40*60 + 0.25*100 + 0.20*100 + 0.15*70 = 24 + 25 + 20 + 10.5 = 79.5 -> round = 80
    assert.equal(result.subScores.jobMatchScore, 80);
    assert.ok(result.scoringBreakdown.components.jobMatch);
  });

  // TC-SC-13: Dynamic Score Confidence without JD or Benchmark
  it('TC-SC-13: Dynamic score confidence excludes bias checks, JD checks (when no JD), and unconfigured benchmarks', () => {
    const checks = createMockChecks({
      'CHK-21': { status: 'NOT_EVALUATED', explanation: 'No benchmark configured' },
    });
    // Total 27 checks.
    // Excluded: CHK-23, CHK-24 (bias), CHK-15..18 (no JD), CHK-21 (not evaluated benchmark) -> 7 excluded.
    // Applicable: 20 checks. All 20 evaluated -> confidence = 20 / 20 = 1.0.
    const result = computeMultiDimensionalScores(checks, {}); // No JD

    assert.equal(result.scoreConfidence, 1.0);
    assert.equal(result.scoringBreakdown.confidenceMetrics.applicableCount, 20);
    assert.equal(result.scoringBreakdown.confidenceMetrics.evaluatedCount, 20);
  });

  // TC-SC-14: Score Confidence Partial Evaluation
  it('TC-SC-14: Score confidence accurately reflects partial check evaluation ratio', () => {
    const overrides = {
      'CHK-21': { status: 'NOT_EVALUATED' },
      'CHK-03': { status: 'NOT_EVALUATED' },
      'CHK-04': { status: 'NOT_EVALUATED' },
      'CHK-05': { status: 'NOT_EVALUATED' },
      'CHK-06': { status: 'NOT_EVALUATED' },
      'CHK-12': { status: 'NOT_EVALUATED' },
    };
    // 20 applicable checks. 5 are NOT_EVALUATED -> 15 evaluated.
    // Confidence = 15 / 20 = 0.75
    const checks = createMockChecks(overrides);
    const result = computeMultiDimensionalScores(checks, {});

    assert.equal(result.scoreConfidence, 0.75);
    assert.equal(result.scoringBreakdown.confidenceMetrics.applicableCount, 20);
    assert.equal(result.scoringBreakdown.confidenceMetrics.evaluatedCount, 15);
  });

  // TC-SC-15: Completely Unevaluated Document returns all null scores
  it('TC-SC-15: Completely unevaluated document returns null for all sub-scores and overall score', () => {
    const unevaluatedChecks = createMockChecks().map((c) => ({
      ...c,
      status: 'NOT_EVALUATED',
      evidence: [],
      explanation: 'Not evaluated',
    }));

    const result = computeMultiDimensionalScores(unevaluatedChecks, { jobDescription: 'Engineer' });

    assert.equal(result.subScores.atsScore, null);
    assert.equal(result.subScores.contentScore, null);
    assert.equal(result.subScores.structureScore, null);
    assert.equal(result.subScores.jobMatchScore, null);
    assert.equal(result.overallScore, null);
    assert.equal(result.scoreConfidence, 0.0);
  });

  // TC-SC-16: Component Unevaluated -> Overall Score is null (no silent weight redistribution)
  it('TC-SC-16: When a required top-level component cannot be calculated, Overall Score returns null', () => {
    // If all Cat 1 checks are NOT_EVALUATED, ATS Score cannot be calculated -> ATS = null -> Overall = null
    const overrides = {
      'CHK-01': { status: 'NOT_EVALUATED' },
      'CHK-02': { status: 'NOT_EVALUATED' },
      'CHK-03': { status: 'NOT_EVALUATED' },
      'CHK-04': { status: 'NOT_EVALUATED' },
      'CHK-05': { status: 'NOT_EVALUATED' },
      'CHK-06': { status: 'NOT_EVALUATED' },
    };
    const checks = createMockChecks(overrides);
    const result = computeMultiDimensionalScores(checks, { jobDescription: 'Engineer' });

    assert.equal(result.subScores.atsScore, null);
    assert.notEqual(result.subScores.contentScore, null);
    assert.notEqual(result.subScores.structureScore, null);
    assert.equal(result.overallScore, null, 'Overall score must be null if ATS is null');
  });

  // TC-SC-17: Quantitative continuous ratio normalization
  it('TC-SC-17: Correctly parses and normalizes continuous percentage ratios for quantitative checks', () => {
    const chk10 = { checkId: 'CHK-10', status: 'PASS', evidence: ['Technical parse rate: 85%'] };
    const chk11 = { checkId: 'CHK-11', status: 'PASS', evidence: ['Quantified ratio: 62%'] };
    const chk15 = { checkId: 'CHK-15', status: 'WARNING', evidence: ['Matched 4/9 hard skills (44%)'] };
    const chk26 = { checkId: 'CHK-26', status: 'PASS', evidence: ['Substantiated: 58% of skills in bullets'] };

    assert.equal(normalizeCheckScore(chk10), 85);
    assert.equal(normalizeCheckScore(chk11), 62);
    assert.equal(normalizeCheckScore(chk15), 44);
    assert.equal(normalizeCheckScore(chk26), 58);
  });

  // TC-SC-18: Qualitative normalization (PASS=100, WARNING=70, FAIL=35)
  it('TC-SC-18: Normalizes qualitative checks to standard baseline (PASS=100, WARNING=70, FAIL=35)', () => {
    const chkPass = { checkId: 'CHK-02', status: 'PASS' };
    const chkWarn = { checkId: 'CHK-02', status: 'WARNING' };
    const chkFail = { checkId: 'CHK-02', status: 'FAIL' };
    const chkNotEval = { checkId: 'CHK-02', status: 'NOT_EVALUATED' };

    assert.equal(normalizeCheckScore(chkPass), 100);
    assert.equal(normalizeCheckScore(chkWarn), 70);
    assert.equal(normalizeCheckScore(chkFail), 35);
    assert.equal(normalizeCheckScore(chkNotEval), null);
  });

  // TC-SC-19: Boundary Clamping
  it('TC-SC-19: Clamps calculated scores to [0, 100] and confidence to [0, 1]', () => {
    assert.equal(calculateOverallScore(-20, 150, 80), 70); // raw = 0.35*(-20) + 0.35*(150) + 0.30*(80) = -7 + 52.5 + 24 = 69.5 -> 70
    assert.equal(calculateOverallScore(150, 150, 150), 100);
    assert.equal(calculateOverallScore(-50, -50, -50), 0);
  });

  // TC-SC-20: Explainable Breakdown audit trail completeness
  it('TC-SC-20: Produces a complete explainable scoring audit breakdown with weights and metrics', () => {
    const checks = createMockChecks({
      'CHK-21': { status: 'NOT_EVALUATED', explanation: 'No peer benchmark data' },
    });
    const result = computeMultiDimensionalScores(checks, { jobDescription: 'DevOps Engineer' });

    const breakdown = result.scoringBreakdown;
    assert.ok(breakdown, 'Scoring breakdown must be populated');
    assert.equal(breakdown.scoringVersion, SCORING_VERSION);
    assert.ok(breakdown.weights.overall);
    assert.ok(breakdown.weights.ats);
    assert.ok(breakdown.weights.content);
    assert.ok(breakdown.weights.structure);
    assert.ok(breakdown.weights.jobMatch);
    assert.ok(breakdown.components.ats);
    assert.ok(breakdown.components.content);
    assert.ok(breakdown.components.structure);
    assert.ok(breakdown.components.jobMatch);
    assert.equal(typeof breakdown.individualScores['CHK-01'], 'number');
    assert.ok(Array.isArray(breakdown.omittedChecks));
    assert.equal(breakdown.omittedChecks.length, 1);
    assert.equal(breakdown.omittedChecks[0].checkId, 'CHK-21');
    assert.ok(breakdown.confidenceMetrics);
    assert.ok(breakdown.criticalCapInfo);
    assert.equal(breakdown.criticalCapInfo.applied, false);
  });
});
