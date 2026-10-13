import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { envSchema, validateEnv } from '../src/config/env.js';

describe('Suite 1: Environment Variable Validation', () => {
  it('should successfully validate and apply defaults for a valid environment configuration', () => {
    const validRaw = {
      MONGODB_URI: 'mongodb://localhost:27017/ai_interview_prep',
    };

    const parsed = validateEnv(validRaw);
    assert.equal(parsed.MONGODB_URI, 'mongodb://localhost:27017/ai_interview_prep');
    assert.equal(parsed.PORT, 5002, 'Default port should be 5002');
    assert.equal(parsed.NODE_ENV, 'development', 'Default NODE_ENV should be development');
    assert.equal(parsed.CLIENT_URL, 'http://localhost:5173');
    assert.equal(parsed.JWT_SECRET, undefined, 'JWT_SECRET should be undefined if not provided');
    assert.equal(parsed.GEMINI_API_KEY, undefined, 'GEMINI_API_KEY should be optional');
    assert.equal(parsed.GEMINI_MODEL, undefined, 'GEMINI_MODEL should be optional');
  });

  it('should fail validation when MONGODB_URI is missing or empty', () => {
    assert.throws(
      () => validateEnv({}),
      (err) => {
        assert.ok(err.message.includes('MONGODB_URI'), 'Error should mention MONGODB_URI');
        return true;
      }
    );

    assert.throws(
      () => validateEnv({ MONGODB_URI: '' }),
      (err) => {
        assert.ok(err.message.includes('MONGODB_URI'), 'Error should mention MONGODB_URI is required');
        return true;
      }
    );
  });

  it('should allow optional JWT_SECRET, GEMINI_API_KEY, and GEMINI_MODEL when provided', () => {
    const raw = {
      MONGODB_URI: 'mongodb://localhost:27017/ai_interview_prep',
      JWT_SECRET: 'a_very_secure_secret_key_minimum_32_characters_long',
      GEMINI_API_KEY: 'test-api-key',
      GEMINI_MODEL: 'gemini-2.0-flash',
    };

    const parsed = validateEnv(raw);
    assert.equal(parsed.JWT_SECRET, 'a_very_secure_secret_key_minimum_32_characters_long');
    assert.equal(parsed.GEMINI_API_KEY, 'test-api-key');
    assert.equal(parsed.GEMINI_MODEL, 'gemini-2.0-flash');
  });

  it('should reject short JWT_SECRET when provided (min 32 chars required)', () => {
    assert.throws(
      () =>
        validateEnv({
          MONGODB_URI: 'mongodb://localhost:27017/ai_interview_prep',
          JWT_SECRET: 'too_short',
        }),
      (err) => {
        assert.ok(err.message.includes('JWT_SECRET'));
        return true;
      }
    );
  });

  it('should reject invalid NODE_ENV values', () => {
    assert.throws(
      () =>
        validateEnv({
          MONGODB_URI: 'mongodb://localhost:27017/ai_interview_prep',
          NODE_ENV: 'staging_invalid',
        }),
      (err) => {
        assert.ok(err.message.includes('NODE_ENV'));
        return true;
      }
    );
  });

  it('should reject invalid CLIENT_URL values', () => {
    assert.throws(
      () =>
        validateEnv({
          MONGODB_URI: 'mongodb://localhost:27017/ai_interview_prep',
          CLIENT_URL: 'not-a-valid-url',
        }),
      (err) => {
        assert.ok(err.message.includes('CLIENT_URL'));
        return true;
      }
    );
  });
});
