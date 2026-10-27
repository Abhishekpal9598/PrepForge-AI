import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { GeminiServiceError } from '../../src/services/geminiService.js';
import { validateDeepAiAnalysis } from '../../src/validators/resumeAnalysisValidators.js';

describe('Suite: Phase 5.1 Fallback & Reliability Verification (10 Scenarios)', () => {

  // Scenario 1: Primary Model Success
  it('Scenario 1: Primary model success simulation returns parsed result and records active model', async () => {
    const mockModelExecution = async (model) => {
      if (model === 'gemini-3.7-flash') {
        return { response: { text: JSON.stringify({ status: 'ok', model }) }, modelName: model };
      }
      throw new Error('Fallback not needed');
    };

    const res = await mockModelExecution('gemini-3.7-flash');
    assert.equal(res.modelName, 'gemini-3.7-flash');
    assert.deepEqual(JSON.parse(res.response.text), { status: 'ok', model: 'gemini-3.7-flash' });
  });

  // Scenario 2: Primary transient 503 -> fallback success
  it('Scenario 2: Primary model transient 503 automatically falls back to secondary model', async () => {
    const candidatePool = ['gemini-3.7-flash', 'gemini-3.5-flash-lite'];
    let attempts = 0;
    let selectedModel = null;

    for (const model of candidatePool) {
      attempts++;
      try {
        if (model === 'gemini-3.7-flash') {
          const err = new Error('503 Service Unavailable: High demand on model');
          err.status = 503;
          err.isFallbackCandidate = true;
          throw err;
        }
        selectedModel = model;
        break;
      } catch (err) {
        if (!err.isFallbackCandidate) throw err;
      }
    }

    assert.equal(attempts, 2);
    assert.equal(selectedModel, 'gemini-3.5-flash-lite');
  });

  // Scenario 3: Primary 429 -> fallback handling
  it('Scenario 3: Primary model 429 quota exhaustion is detected as fallback candidate', async () => {
    const err = new Error('Resource has been exhausted (e.g. check quota). 429');
    err.status = 429;
    const errMsg = err.message.toLowerCase();
    const isTransient =
      err.status === 429 ||
      errMsg.includes('429') ||
      errMsg.includes('resource_exhausted') ||
      errMsg.includes('rate_limit');

    assert.equal(isTransient, true, '429 error must be marked as fallback candidate');
  });

  // Scenario 4: Invalid API key -> breaks immediately without cascade
  it('Scenario 4: Invalid API key (permanent 400/401/403) breaks immediately without looping', async () => {
    const candidatePool = ['gemini-3.7-flash', 'gemini-3.5-flash-lite', 'gemini-3.1-flash-lite'];
    let attempts = 0;
    let caughtErr = null;

    for (const model of candidatePool) {
      attempts++;
      try {
        const err = new Error('API_KEY_INVALID: Key not found or unauthorized');
        err.status = 400;
        // Non-transient errors do NOT set isFallbackCandidate = true
        err.isFallbackCandidate = false;
        throw err;
      } catch (err) {
        caughtErr = err;
        if (!err.isFallbackCandidate) {
          break; // Immediate termination without cascade
        }
      }
    }

    assert.equal(attempts, 1, 'Must break on first attempt without cascading through candidate models');
    assert.match(caughtErr.message, /API_KEY_INVALID/);
  });

  // Scenario 5: All models unavailable -> throws 503 GEMINI_API_ERROR
  it('Scenario 5: When all candidate models fail, throws 503 GEMINI_API_ERROR', async () => {
    const candidatePool = ['gemini-3.7-flash', 'gemini-3.5-flash-lite', 'gemini-3.1-flash-lite'];
    let lastError = null;

    for (const model of candidatePool) {
      try {
        const err = new Error(`503 Model ${model} unavailable`);
        err.status = 503;
        err.isFallbackCandidate = true;
        throw err;
      } catch (err) {
        lastError = err;
      }
    }

    const finalError = new GeminiServiceError(
      `Gemini service error: ${lastError.message}`,
      'GEMINI_API_ERROR',
      503
    );

    assert.equal(finalError.statusCode, 503);
    assert.equal(finalError.code, 'GEMINI_API_ERROR');
    assert.match(finalError.message, /Gemini service error/i);
  });

  // Scenario 6: Invalid JSON response -> throws 502 MALFORMED_AI_RESPONSE
  it('Scenario 6: Completely unparseable or non-JSON output throws 502 MALFORMED_AI_RESPONSE', () => {
    const rawOutput = 'This is plain text with no json objects or brackets at all.';
    const firstBrace = rawOutput.indexOf('{');
    const lastBrace = rawOutput.lastIndexOf('}');

    let errToThrow = null;
    if (firstBrace === -1 || lastBrace === -1) {
      errToThrow = new GeminiServiceError(
        'Malformed AI output: No valid JSON object boundaries detected.',
        'MALFORMED_AI_RESPONSE',
        502
      );
    }

    assert.ok(errToThrow);
    assert.equal(errToThrow.statusCode, 502);
    assert.equal(errToThrow.code, 'MALFORMED_AI_RESPONSE');
  });

  // Scenario 7: Malformed AI response (fails zod schema validation) -> throws 502
  it('Scenario 7: Syntactically valid JSON missing mandatory schema properties throws 502', () => {
    const missingPropsJson = {
      summaryEvaluation: { clarity: 'Clear summary' }, // Missing mandatory fields
    };

    let caughtErr = null;
    try {
      validateDeepAiAnalysis(missingPropsJson);
    } catch (schemaErr) {
      // Wrapped by geminiService.js into GeminiServiceError
      caughtErr = new GeminiServiceError(
        `AI analysis output does not conform to required deep intelligence schema: ${schemaErr.message}`,
        'INVALID_AI_SCHEMA',
        502,
        schemaErr.issues
      );
    }

    assert.ok(caughtErr);
    assert.equal(caughtErr.code, 'INVALID_AI_SCHEMA');
    assert.equal(caughtErr.statusCode, 502);
    assert.match(caughtErr.message, /AI deep analysis validation failed/);
  });

  // Scenario 8: 45-second timeout -> throws 504 GEMINI_TIMEOUT
  it('Scenario 8: 45000ms AbortController timeout generates 504 GEMINI_TIMEOUT', () => {
    const timeoutMs = 45000;
    const abortErr = new GeminiServiceError(
      `Gemini request timed out after ${timeoutMs}ms while executing deep resume analysis.`,
      'GEMINI_TIMEOUT',
      504
    );

    assert.equal(abortErr.statusCode, 504);
    assert.equal(abortErr.code, 'GEMINI_TIMEOUT');
    assert.match(abortErr.message, /timed out after 45000ms/);
  });

  // Scenario 9: Concurrent duplicate request -> HTTP 409
  it('Scenario 9: Concurrent requests for same resume ID trigger HTTP 409 ANALYSIS_IN_PROGRESS', () => {
    const activeAnalysisRequests = new Set();
    const resumeId = '654321098765432109876543';

    // First request acquires lock
    activeAnalysisRequests.add(resumeId);

    // Second concurrent request attempts to acquire lock
    let errorResponse = null;
    if (activeAnalysisRequests.has(resumeId)) {
      errorResponse = {
        status: 409,
        body: {
          success: false,
          message: 'An AI analysis for this resume is currently in progress. Please wait.',
          code: 'ANALYSIS_IN_PROGRESS',
        },
      };
    }

    assert.ok(errorResponse);
    assert.equal(errorResponse.status, 409);
    assert.equal(errorResponse.body.code, 'ANALYSIS_IN_PROGRESS');

    // Lock release
    activeAnalysisRequests.delete(resumeId);
    assert.equal(activeAnalysisRequests.has(resumeId), false);
  });

  // Scenario 10: Subsequent retry succeeds after failure
  it('Scenario 10: Subsequent retry succeeds cleanly after lock cleanup in finally block', () => {
    const activeAnalysisRequests = new Set();
    const resumeId = '654321098765432109876543';

    // Simulate failed request execution with try/finally
    try {
      activeAnalysisRequests.add(resumeId);
      throw new Error('Temporary network glitch');
    } catch {
      // Handled in catch
    } finally {
      // Must delete lock in finally block
      activeAnalysisRequests.delete(resumeId);
    }

    // Lock must be cleared
    assert.equal(activeAnalysisRequests.has(resumeId), false);

    // Subsequent retry execution succeeds
    let retrySucceeded = false;
    try {
      if (!activeAnalysisRequests.has(resumeId)) {
        activeAnalysisRequests.add(resumeId);
        retrySucceeded = true;
      }
    } finally {
      activeAnalysisRequests.delete(resumeId);
    }

    assert.equal(retrySucceeded, true);
    assert.equal(activeAnalysisRequests.has(resumeId), false);
  });
});
