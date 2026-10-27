import {
  computeMultiDimensionalScores,
  calculateContactScore,
  normalizeCheckScore,
} from '../../src/services/scoringEngine.js';

console.log('--- Realistic Combination Stress Testing ---');

// Helper to generate base check set
const generateCheckSet = (preset = {}) => {
  const ids = [
    ['CHK-01', 'CAT-01'], ['CHK-02', 'CAT-01'], ['CHK-03', 'CAT-01'], ['CHK-04', 'CAT-01'], ['CHK-05', 'CAT-01'], ['CHK-06', 'CAT-01'],
    ['CHK-07', 'CAT-02'], ['CHK-08', 'CAT-02'], ['CHK-09', 'CAT-02'],
    ['CHK-10', 'CAT-03'], ['CHK-11', 'CAT-03'], ['CHK-12', 'CAT-03'], ['CHK-13', 'CAT-03'], ['CHK-14', 'CAT-03'],
    ['CHK-15', 'CAT-04'], ['CHK-16', 'CAT-04'], ['CHK-17', 'CAT-04'], ['CHK-18', 'CAT-04'],
    ['CHK-19', 'CAT-05'], ['CHK-20', 'CAT-05'], ['CHK-21', 'CAT-05'], ['CHK-22', 'CAT-05'],
    ['CHK-23', 'CAT-06'], ['CHK-24', 'CAT-06'],
    ['CHK-25', 'CAT-07'], ['CHK-26', 'CAT-07'], ['CHK-27', 'CAT-07'],
  ];

  return ids.map(([id, cat]) => {
    if (preset[id]) {
      return {
        checkId: id,
        categoryId: cat,
        status: preset[id].status || 'PASS',
        evidence: preset[id].evidence || [],
        explanation: preset[id].explanation || '',
      };
    }
    // Default pass
    return {
      checkId: id,
      categoryId: cat,
      status: 'PASS',
      evidence: ['Standard compliant'],
      explanation: 'All requirements met.',
    };
  });
};

// Test 1: Senior Candidate with 25 yrs experience (Graduation 1998, employment gap in 2020)
console.log('\n[Scenario 1] Senior Candidate with Old Degree & Gap (Ethical Non-Penalization)');
const seniorChecks = generateCheckSet({
  'CHK-21': { status: 'NOT_EVALUATED', explanation: 'No peer data' },
  'CHK-23': { status: 'WARNING', evidence: ['Graduation 1998 (>15 years ago). Informational.'] },
  'CHK-24': { status: 'WARNING', evidence: ['Employment gap of 14 months detected in 2020.'] },
});
const seniorResult = computeMultiDimensionalScores(seniorChecks, {});
console.log('SubScores:', JSON.stringify(seniorResult.subScores));
console.log('OverallScore:', seniorResult.overallScore);
console.log('Confidence:', seniorResult.scoreConfidence);
if (seniorResult.subScores.structureScore !== 100 || seniorResult.overallScore !== 100) {
  throw new Error('FAIL: Senior candidate was penalized for age/gap in Category 6!');
}

// Test 2: Incomplete Contact (Missing Phone, Physical Address Omitted)
console.log('\n[Scenario 2] Candidate with Missing Phone and Omitted Address');
const missingPhoneChecks = generateCheckSet({
  'CHK-08': { status: 'WARNING', evidence: ['phone number is missing', 'email present'] },
  'CHK-21': { status: 'NOT_EVALUATED' },
});
const phoneResult = computeMultiDimensionalScores(missingPhoneChecks, {});
console.log('CHK-08 Score:', normalizeCheckScore(missingPhoneChecks.find(c => c.checkId === 'CHK-08')));
console.log('ATS Score:', phoneResult.subScores.atsScore);
console.log('Structure Score:', phoneResult.subScores.structureScore);
console.log('Content Score:', phoneResult.subScores.contentScore);
if (normalizeCheckScore(missingPhoneChecks.find(c => c.checkId === 'CHK-08')) !== 95) {
  throw new Error('FAIL: Missing phone score should be exactly 95!');
}
if (phoneResult.subScores.structureScore !== 100 || phoneResult.subScores.contentScore !== 100) {
  throw new Error('FAIL: Contact deduction duplicated in Structure or Content!');
}

// Test 3: Critical Parsing Failure Hard-Cap
console.log('\n[Scenario 3] Corrupted Document Parsing Failure');
const corruptedChecks = generateCheckSet({
  'CHK-01': { status: 'FAIL', evidence: ['Critical unparseable PDF stream'] },
});
const corruptedResult = computeMultiDimensionalScores(corruptedChecks, { jobDescription: 'DevOps' });
console.log('ATS Score (Hard-Capped):', corruptedResult.subScores.atsScore);
console.log('Hard-Cap Info:', JSON.stringify(corruptedResult.scoringBreakdown.criticalCapInfo));
if (corruptedResult.subScores.atsScore > 40) {
  throw new Error('FAIL: ATS score was not capped at <= 40 on critical parsing failure!');
}

// Test 4: Realistic Junior Candidate with Mixed Findings & Job Description
console.log('\n[Scenario 4] Junior Engineer with Mixed Findings & Target JD');
const juniorChecks = generateCheckSet({
  'CHK-08': { status: 'FAIL', evidence: ['email is missing'] }, // CHK-08 = 80
  'CHK-10': { status: 'PASS', evidence: ['Technical parse rate: 78%'] }, // CHK-10 = 78
  'CHK-11': { status: 'WARNING', evidence: ['Quantified ratio: 25%'] }, // CHK-11 = 25
  'CHK-12': { status: 'WARNING', evidence: ['Weak passive verbs'] }, // 70
  'CHK-15': { status: 'WARNING', evidence: ['Matched 3/7 required skills (42%)'] }, // 42
  'CHK-16': { status: 'PASS' }, // 100
  'CHK-17': { status: 'WARNING' }, // 70
  'CHK-18': { status: 'FAIL' }, // 35
  'CHK-21': { status: 'NOT_EVALUATED' },
});
const juniorResult = computeMultiDimensionalScores(juniorChecks, { jobDescription: 'Junior React Dev' });
console.log('Junior SubScores:', JSON.stringify(juniorResult.subScores));
console.log('Junior Overall:', juniorResult.overallScore);
console.log('Junior Confidence:', juniorResult.scoreConfidence);
console.log('Job Match Score:', juniorResult.subScores.jobMatchScore);
// JM = 0.40 * 42 + 0.25 * 100 + 0.20 * 70 + 0.15 * 35 = 16.8 + 25 + 14 + 5.25 = 61.05 -> 61
if (juniorResult.subScores.jobMatchScore !== 61) {
  throw new Error(`FAIL: Job match score expected 61, got ${juniorResult.subScores.jobMatchScore}`);
}

// Test 5: Missing Category Component yields Overall = null (no silent redistribution)
console.log('\n[Scenario 5] Missing Entire Category 1 yields Overall = null');
const missingCat1Checks = generateCheckSet({
  'CHK-01': { status: 'NOT_EVALUATED' },
  'CHK-02': { status: 'NOT_EVALUATED' },
  'CHK-03': { status: 'NOT_EVALUATED' },
  'CHK-04': { status: 'NOT_EVALUATED' },
  'CHK-05': { status: 'NOT_EVALUATED' },
  'CHK-06': { status: 'NOT_EVALUATED' },
});
const missingCat1Result = computeMultiDimensionalScores(missingCat1Checks, {});
console.log('ATS Score:', missingCat1Result.subScores.atsScore);
console.log('Overall Score:', missingCat1Result.overallScore);
if (missingCat1Result.subScores.atsScore !== null || missingCat1Result.overallScore !== null) {
  throw new Error('FAIL: Silent weight redistribution occurred when Cat 1 was missing!');
}

console.log('\nAll 5 Realistic Combination Scenarios PASSED with 100% mathematical fidelity!');
