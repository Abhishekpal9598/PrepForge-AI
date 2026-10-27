import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { envSchema, validateEnv } from '../src/config/env.js';
import { extractDbFromUri, resolveDatabaseName } from '../src/config/db.js';

describe('Suite 1: Environment Variable Validation', () => {
  it('should successfully validate and apply defaults for a valid environment configuration', () => {
    const validRaw = {
      MONGODB_URI: 'mongodb://localhost:27017/ai_interview_prep',
    };

    const parsed = validateEnv(validRaw);
    assert.equal(parsed.MONGODB_URI, 'mongodb://localhost:27017/ai_interview_prep');
    assert.equal(parsed.PORT, 5001, 'Default port should be 5001');
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

  it('should coerce PORT from string to number', () => {
    const parsed = validateEnv({
      MONGODB_URI: 'mongodb://localhost:27017/ai_interview_prep',
      PORT: '10000',
    });
    assert.equal(parsed.PORT, 10000);
  });

  it('should reject DB_NAME="test" when NODE_ENV is production', () => {
    assert.throws(
      () =>
        validateEnv({
          NODE_ENV: 'production',
          MONGODB_URI: 'mongodb+srv://user:pass@cluster0.xyz.mongodb.net/test',
          JWT_SECRET: 'a_very_secure_secret_key_minimum_32_characters_long',
          DB_NAME: 'test',
        }),
      (err) => {
        assert.ok(err.message.includes('DB_NAME cannot be "test" in production'));
        return true;
      }
    );
  });

  it('should accept valid DB_NAME="prepforge_prod" in production', () => {
    const parsed = validateEnv({
      NODE_ENV: 'production',
      MONGODB_URI: 'mongodb+srv://user:pass@cluster0.xyz.mongodb.net/prepforge_prod',
      JWT_SECRET: 'a_very_secure_secret_key_minimum_32_characters_long',
      DB_NAME: 'prepforge_prod',
    });
    assert.equal(parsed.DB_NAME, 'prepforge_prod');
  });
});

describe('Suite 2: Database Name Resolution and Precedence', () => {
  it('extractDbFromUri correctly extracts db from standard mongodb URI', () => {
    assert.equal(extractDbFromUri('mongodb://localhost:27017/ai_interview_prep'), 'ai_interview_prep');
    assert.equal(extractDbFromUri('mongodb://localhost:27017/ai_interview_prep?authSource=admin'), 'ai_interview_prep');
  });

  it('extractDbFromUri correctly extracts db from mongodb+srv URI', () => {
    assert.equal(extractDbFromUri('mongodb+srv://user:pass@cluster0.xyz.mongodb.net/prepforge_prod?retryWrites=true'), 'prepforge_prod');
    assert.equal(extractDbFromUri('mongodb+srv://user:pass@cluster0.xyz.mongodb.net/test?retryWrites=true'), 'test');
    assert.equal(extractDbFromUri('mongodb+srv://user:pass@cluster0.xyz.mongodb.net/?retryWrites=true'), null);
    assert.equal(extractDbFromUri('mongodb+srv://user:pass@cluster0.xyz.mongodb.net/'), null);
  });

  it('resolveDatabaseName strictly enforces prepforge_prod in production if db is test or missing', () => {
    // Missing db in URI
    const res1 = resolveDatabaseName('mongodb+srv://user:pass@cluster0.xyz.mongodb.net/?retryWrites=true', undefined, 'production');
    assert.equal(res1, 'prepforge_prod');

    // 'test' in URI
    const res2 = resolveDatabaseName('mongodb+srv://user:pass@cluster0.xyz.mongodb.net/test?retryWrites=true', undefined, 'production');
    assert.equal(res2, 'prepforge_prod');

    // explicitDbName = 'test' in production
    const res3 = resolveDatabaseName('mongodb+srv://user:pass@cluster0.xyz.mongodb.net/', 'test', 'production');
    assert.equal(res3, 'prepforge_prod');
  });

  it('resolveDatabaseName respects explicit non-test DB_NAME in production', () => {
    const res = resolveDatabaseName('mongodb+srv://user:pass@cluster0.xyz.mongodb.net/', 'custom_prod_db', 'production');
    assert.equal(res, 'custom_prod_db');
  });

  it('resolveDatabaseName preserves URI database in development', () => {
    const res = resolveDatabaseName('mongodb://localhost:27017/ai_interview_prep', undefined, 'development');
    assert.equal(res, 'ai_interview_prep');
  });
});
