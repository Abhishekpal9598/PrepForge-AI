import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { checkPeerBenchmarking } from '../../src/services/resumeChecks/categories/recruiterRedFlags.js';

describe('Suite: Peer Experience Benchmarking (CHK-21 — Condition 3)', () => {
  const sampleResume = {
    parsedSections: {
      structured: {
        experience: [
          {
            title: 'Senior Software Engineer',
            bullets: [
              'Architected cloud payment system.',
              'Mentored 4 junior engineers.',
              'Reduced infrastructure costs by 22%.',
            ],
          },
          {
            title: 'Software Engineer',
            bullets: [
              'Developed RESTful microservices in Node.js.',
              'Implemented automated testing pipeline.',
            ],
          },
        ],
      },
    },
  };

  it('1. Returns NOT_EVALUATED when benchmarkData is not provided', () => {
    const result = checkPeerBenchmarking(sampleResume, {});
    assert.equal(result.status, 'NOT_EVALUATED');
    assert.equal(result.checkId, 'CHK-21');
    assert.equal(result.categoryId, 'CAT-05');
    assert.ok(result.explanation.includes('Peer experience benchmarking requires verified industry and career-tier benchmark datasets'));
    assert.ok(result.explanation.includes('Check skipped to avoid fabricated comparisons'));
    assert.ok(result.limitations.some((l) => l.includes('Fabricated peer statistics or tier percentiles are strictly forbidden')));
  });

  it('2. Returns NOT_EVALUATED when benchmarkData is null or empty object', () => {
    const resNull = checkPeerBenchmarking(sampleResume, { benchmarkData: null });
    assert.equal(resNull.status, 'NOT_EVALUATED');

    const resEmpty = checkPeerBenchmarking(sampleResume, { benchmarkData: {} });
    assert.equal(resEmpty.status, 'NOT_EVALUATED');
  });

  it('3. Evaluates against benchmark data when verified data is provided (PASS case)', () => {
    const benchmarkData = { minBulletsPerRole: 2 };
    const result = checkPeerBenchmarking(sampleResume, { benchmarkData });

    assert.equal(result.status, 'PASS');
    assert.equal(result.checkId, 'CHK-21');
    assert.ok(result.evidence.some((e) => e.includes('meet benchmark bullet depth')));
  });

  it('4. Evaluates against benchmark data when verified data is provided (WARNING case)', () => {
    const benchmarkData = { minBulletsPerRole: 4 };
    const result = checkPeerBenchmarking(sampleResume, { benchmarkData });

    assert.equal(result.status, 'WARNING');
    assert.equal(result.checkId, 'CHK-21');
    assert.ok(result.evidence.some((e) => e.includes('expected >= 4')));
    assert.ok(result.recommendation.includes('meet the benchmark threshold of at least 4 bullets'));
  });
});
