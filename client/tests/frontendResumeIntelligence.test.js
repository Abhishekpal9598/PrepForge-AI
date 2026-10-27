import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  getScoreTone,
  getStatusConfig,
  getSeverityBadge,
  parseBracketedTokens,
  CATEGORY_META,
  PROGRESS_STAGES,
} from '../src/components/resume/resumeConstants.js';

import {
  getStoredTheme,
  applyTheme,
} from '../src/utils/theme.js';

import * as api from '../src/services/api.js';

describe('Suite: Phase 6 Advanced Resume Intelligence Frontend Unit Tests', () => {

  // ----------------------------------------------------------------
  // 1. SCORE RENDERING & NULL/NA HANDLING
  // ----------------------------------------------------------------
  describe('1. Score Rendering & Null / N/A Value Handling', () => {
    it('TC-FE-01: Correctly maps scores >= 80 to Strong green tone', () => {
      const tone = getScoreTone(88);
      assert.equal(tone.label, 'Strong');
      assert.equal(tone.text, 'text-[#10B981]');
      assert.equal(tone.fill, '#10B981');
      assert.ok(tone.border.includes('#10B981'));
    });

    it('TC-FE-02: Correctly maps scores between 65 and 79 to Moderate amber tone', () => {
      const tone = getScoreTone(74);
      assert.equal(tone.label, 'Moderate');
      assert.equal(tone.text, 'text-[#F59E0B]');
      assert.equal(tone.fill, '#F59E0B');
    });

    it('TC-FE-03: Correctly maps scores < 65 to Needs Work red tone', () => {
      const tone = getScoreTone(45);
      assert.equal(tone.label, 'Needs Work');
      assert.equal(tone.text, 'text-[#EF4444]');
      assert.equal(tone.fill, '#EF4444');
    });

    it('TC-FE-04: Returns "Not Evaluated" neutral tone for null, undefined, or NaN inputs', () => {
      const nullTone = getScoreTone(null);
      assert.equal(nullTone.label, 'Not Evaluated');
      assert.equal(nullTone.text, 'text-[#94A3B8]');

      const undefTone = getScoreTone(undefined);
      assert.equal(undefTone.label, 'Not Evaluated');

      const nanTone = getScoreTone(NaN);
      assert.equal(nanTone.label, 'Not Evaluated');

      const nonNumTone = getScoreTone('invalid');
      assert.equal(nonNumTone.label, 'Not Evaluated');
    });

    it('TC-FE-05: Clamps edge scores (0 and 100) accurately', () => {
      const zeroTone = getScoreTone(0);
      assert.equal(zeroTone.label, 'Needs Work');

      const perfectTone = getScoreTone(100);
      assert.equal(perfectTone.label, 'Strong');
    });
  });

  // ----------------------------------------------------------------
  // 2. ALL FOUR CHECK STATUSES & SEVEN CATEGORIES
  // ----------------------------------------------------------------
  describe('2. Check Statuses & Seven Categories Verification', () => {
    it('TC-FE-06: Formats PASS status with green badge styles', () => {
      const cfg = getStatusConfig('PASS');
      assert.equal(cfg.label, 'Passed');
      assert.ok(cfg.badgeClass.includes('#10B981'));
      assert.ok(cfg.textClass.includes('#10B981'));
    });

    it('TC-FE-07: Formats WARNING status with amber badge styles', () => {
      const cfg = getStatusConfig('WARNING');
      assert.equal(cfg.label, 'Warning');
      assert.ok(cfg.badgeClass.includes('#F59E0B'));
      assert.ok(cfg.textClass.includes('#F59E0B'));
    });

    it('TC-FE-08: Formats FAIL status with red badge styles', () => {
      const cfg = getStatusConfig('FAIL');
      assert.equal(cfg.label, 'Failed');
      assert.ok(cfg.badgeClass.includes('#EF4444'));
      assert.ok(cfg.textClass.includes('#EF4444'));
    });

    it('TC-FE-09: Formats NOT_EVALUATED status with neutral slate badge styles', () => {
      const cfg = getStatusConfig('NOT_EVALUATED');
      assert.equal(cfg.label, 'Not Evaluated');
      assert.ok(cfg.badgeClass.includes('#64748B'));
      assert.ok(cfg.textClass.includes('#94A3B8'));
    });

    it('TC-FE-10: Formats all severity badges (critical, high, medium, low, info)', () => {
      assert.ok(getSeverityBadge('critical').includes('#EF4444'));
      assert.ok(getSeverityBadge('high').includes('#F97316'));
      assert.ok(getSeverityBadge('medium').includes('#F59E0B'));
      assert.ok(getSeverityBadge('low').includes('#3B82F6'));
      assert.ok(getSeverityBadge('info').includes('#6366F1'));
    });

    it('TC-FE-11: Confirms all 7 categories are accurately registered in CATEGORY_META', () => {
      const keys = Object.keys(CATEGORY_META);
      assert.equal(keys.length, 7);
      assert.deepEqual(keys, ['CAT-01', 'CAT-02', 'CAT-03', 'CAT-04', 'CAT-05', 'CAT-06', 'CAT-07']);

      assert.equal(CATEGORY_META['CAT-01'].name, 'ATS Essentials');
      assert.equal(CATEGORY_META['CAT-02'].name, 'Resume Sections');
      assert.equal(CATEGORY_META['CAT-03'].name, 'Resume Content');
      assert.equal(CATEGORY_META['CAT-04'].name, 'Job Tailoring');
      assert.equal(CATEGORY_META['CAT-05'].name, 'Recruiter Red Flags');
      assert.equal(CATEGORY_META['CAT-06'].name, 'Bias Prevention');
      assert.equal(CATEGORY_META['CAT-07'].name, 'Seniority & Impact');
    });

    it('TC-FE-12: Verifies Category 6 Bias Prevention carries explicit 0% score weight guarantee', () => {
      const cat6 = CATEGORY_META['CAT-06'];
      assert.ok(cat6.description.includes('0% score weight guarantee'));
    });
  });

  // ----------------------------------------------------------------
  // 3. AI ANALYSIS & BRACKETED METRICS PARSING
  // ----------------------------------------------------------------
  describe('3. AI Analysis & Anti-Hallucination Token Parsing', () => {
    it('TC-FE-13: parseBracketedTokens identifies bracketed placeholders in rewrite text', () => {
      const text = 'Reduced latency by [X]% across [Y] databases for [Z] daily users.';
      const tokens = parseBracketedTokens(text);

      assert.ok(tokens.length >= 5);
      const placeholders = tokens.filter((t) => t.isPlaceholder);
      assert.equal(placeholders.length, 3);
      assert.equal(placeholders[0].text, '[X]%');
      assert.equal(placeholders[1].text, '[Y]');
      assert.equal(placeholders[2].text, '[Z]');
    });

    it('TC-FE-14: parseBracketedTokens handles plain text without placeholders cleanly', () => {
      const text = 'Architected microservices using Node.js and AWS.';
      const tokens = parseBracketedTokens(text);

      assert.equal(tokens.length, 1);
      assert.equal(tokens[0].isPlaceholder, false);
      assert.equal(tokens[0].text, text);
    });

    it('TC-FE-15: parseBracketedTokens handles currency placeholders such as $[Y]', () => {
      const text = 'Decreased annual cloud expenditure by $[Y] through auto-scaling.';
      const tokens = parseBracketedTokens(text);

      const placeholder = tokens.find((t) => t.isPlaceholder);
      assert.ok(placeholder);
      assert.equal(placeholder.text, '$[Y]');
    });
  });

  // ----------------------------------------------------------------
  // 4. PROGRESS STAGES & THEME PERSISTENCE
  // ----------------------------------------------------------------
  describe('4. Progress Stages, Theme Persistence & Responsive Controls', () => {
    it('TC-FE-16: Confirms 5 sequential stages in PROGRESS_STAGES', () => {
      assert.equal(PROGRESS_STAGES.length, 5);
      assert.equal(PROGRESS_STAGES[0].label, 'Document Parsing & Structure');
      assert.equal(PROGRESS_STAGES[1].label, '27-Point Rule Engine');
      assert.equal(PROGRESS_STAGES[2].label, 'Multi-Dimensional Scoring');
      assert.equal(PROGRESS_STAGES[3].label, 'Google Gemini AI Intelligence');
      assert.equal(PROGRESS_STAGES[4].label, 'Synthesizing Recommendations');
    });

    it('TC-FE-17: Verifies getStoredTheme defaults safely to "dark" (Midnight Navy)', () => {
      // In Node environment without window/localStorage
      const theme = getStoredTheme();
      assert.equal(theme, 'dark');
    });

    it('TC-FE-18: Verifies applyTheme handles dark and light mode without crashing', () => {
      // Mock minimal document.documentElement for Node testing
      globalThis.document = {
        documentElement: {
          classList: {
            remove: () => {},
            add: () => {},
          },
          setAttribute: () => {},
        },
        body: {
          classList: {
            remove: () => {},
            add: () => {},
          },
        },
      };

      const darkResult = applyTheme('dark');
      assert.equal(darkResult, 'dark');

      const lightResult = applyTheme('light');
      assert.equal(lightResult, 'light');
    });
  });

  // ----------------------------------------------------------------
  // 5. BACKEND API INTEGRATION CONTRACTS
  // ----------------------------------------------------------------
  describe('5. Backend API Service Contract Verification', () => {
    it('TC-FE-19: Verifies all Phase 3, 4, and 5 API endpoint functions are exported', () => {
      assert.equal(typeof api.runResumeChecks, 'function', 'runResumeChecks must be exported');
      assert.equal(typeof api.fetchResumeChecks, 'function', 'fetchResumeChecks must be exported');
      assert.equal(typeof api.fetchResumeCheckById, 'function', 'fetchResumeCheckById must be exported');
      assert.equal(typeof api.recheckResume, 'function', 'recheckResume must be exported');
      assert.equal(typeof api.fetchResumeScores, 'function', 'fetchResumeScores must be exported');
      assert.equal(typeof api.analyzeResume, 'function', 'analyzeResume must be exported');
      assert.equal(typeof api.fetchResumeAnalysis, 'function', 'fetchResumeAnalysis must be exported');
      assert.equal(typeof api.uploadResume, 'function', 'uploadResume must be exported');
      assert.equal(typeof api.fetchResumes, 'function', 'fetchResumes must be exported');
      assert.equal(typeof api.deleteResume, 'function', 'deleteResume must be exported');
    });

    it('TC-FE-20: Verifies token management functions work cleanly', () => {
      assert.equal(typeof api.getStoredToken, 'function');
      assert.equal(typeof api.setStoredToken, 'function');
      assert.equal(typeof api.getStoredUser, 'function');
      assert.equal(typeof api.setStoredUser, 'function');
    });
  });
});
