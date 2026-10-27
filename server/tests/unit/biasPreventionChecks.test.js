import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  checkAgeAndDateBias,
  checkEmploymentGaps,
} from '../../src/services/resumeChecks/categories/biasPrevention.js';

describe('Suite: Bias and Discrimination Prevention Checks (CHK-23 & CHK-24)', () => {
  it('1. CHK-23: Graduation year > 15 years ago returns PASS with advisory info (non-penalizing)', () => {
    const resumeWithOldGrad = {
      extractedText: 'Alex Smith, B.S. Computer Science 1998',
      parsedSections: {
        structured: {
          education: [
            {
              degree: 'Bachelor of Science in Computer Science',
              dateRange: { startYear: 1994, endYear: 1998 },
            },
          ],
        },
      },
    };

    const result = checkAgeAndDateBias(resumeWithOldGrad);
    assert.equal(result.status, 'PASS', 'Status must be PASS (non-punitive)');
    assert.equal(result.severity, 'info', 'Severity must be info');
    assert.equal(result.checkId, 'CHK-23');
    assert.equal(result.categoryId, 'CAT-06');
    assert.ok(result.evidence.some((e) => e.includes('1998')));
    assert.ok(result.recommendation.includes('older than 15 years'));
    assert.ok(result.limitations.some((l) => l.toLowerCase().includes('zero scoring')));
  });

  it('2. CHK-23: Recent graduation returns PASS with zero advisory remarks', () => {
    const currentYear = new Date().getFullYear();
    const resumeWithRecentGrad = {
      extractedText: 'Alex Smith, B.S. Computer Science 2022',
      parsedSections: {
        structured: {
          education: [
            {
              degree: 'Bachelor of Science in Computer Science',
              dateRange: { startYear: 2018, endYear: currentYear - 2 },
            },
          ],
        },
      },
    };

    const result = checkAgeAndDateBias(resumeWithRecentGrad);
    assert.equal(result.status, 'PASS');
    assert.equal(result.severity, 'info');
    assert.equal(result.recommendation, null);
  });

  it('3. CHK-23: Detects personal demographic disclosure (marital status) advisably without penalizing', () => {
    const resumeWithDemographics = {
      extractedText: 'Alex Smith, Marital Status: Married, Nationality: Canadian',
      parsedSections: {
        structured: { education: [] },
      },
    };

    const result = checkAgeAndDateBias(resumeWithDemographics);
    assert.equal(result.status, 'PASS', 'Demographic marker should not fail candidate');
    assert.equal(result.severity, 'info');
    assert.ok(result.evidence.some((e) => e.includes('marital status')));
  });

  it('4. CHK-24: Employment gap > 6 months returns PASS with neutral info (non-penalizing)', () => {
    const resumeWithGap = {
      parsedSections: {
        structured: {
          timeline: {
            hasGaps: true,
            gaps: [
              {
                startYear: 2022,
                endYear: 2023,
                durationMonths: 14,
              },
            ],
          },
        },
      },
    };

    const result = checkEmploymentGaps(resumeWithGap);
    assert.equal(result.status, 'PASS', 'Status must be PASS (never fail or warning)');
    assert.equal(result.severity, 'info', 'Severity must be info');
    assert.equal(result.checkId, 'CHK-24');
    assert.equal(result.categoryId, 'CAT-06');
    assert.ok(result.evidence.some((e) => e.includes('14 months')));
    assert.ok(result.explanation.includes('natural'));
    assert.ok(result.limitations.some((l) => l.toLowerCase().includes('zero scoring')));
  });

  it('5. CHK-24: Continuous employment returns PASS with zero gap notes', () => {
    const continuousResume = {
      parsedSections: {
        structured: {
          timeline: {
            hasGaps: false,
            gaps: [],
          },
        },
      },
    };

    const result = checkEmploymentGaps(continuousResume);
    assert.equal(result.status, 'PASS');
    assert.equal(result.severity, 'info');
    assert.equal(result.recommendation, null);
  });
});
