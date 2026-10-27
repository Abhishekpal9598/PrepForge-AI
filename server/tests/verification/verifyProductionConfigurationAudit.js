/**
 * verifyProductionConfigurationAudit.js
 *
 * Systematic verification test suite for Phase 9.2.1 Production Configuration Audit.
 * Tests:
 * 1. MongoDB Configuration & DB_NAME Precedence.
 * 2. Production Environment & Security Validation.
 * 3. Render Dynamic Port Binding.
 * 4. Application Branding in Startup Logs.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateEnv, envSchema } from '../../src/config/env.js';
import { extractDbFromUri, resolveDatabaseName } from '../../src/config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runAuditVerification() {
  console.log('\n======================================================');
  console.log('PrepForge AI — Phase 9.2.1 Production Configuration Audit');
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log('======================================================\n');

  let passed = 0;
  let total = 0;

  function test(name, fn) {
    total++;
    try {
      fn();
      console.log(`  [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  [FAIL] ${name}: ${err.message}`);
      throw err;
    }
  }

  // ------------------------------------------------------------------------
  // STEP 1: MongoDB Configuration & Precedence
  // ------------------------------------------------------------------------
  console.log('--- STEP 1: MongoDB Configuration & Database Precedence ---');

  test('1.1: extractDbFromUri correctly parses database paths from MongoDB URIs', () => {
    assert.equal(extractDbFromUri('mongodb+srv://user:pass@cluster.mongodb.net/prepforge_prod?retryWrites=true'), 'prepforge_prod');
    assert.equal(extractDbFromUri('mongodb+srv://user:pass@cluster.mongodb.net/test?retryWrites=true'), 'test');
    assert.equal(extractDbFromUri('mongodb+srv://user:pass@cluster.mongodb.net/?retryWrites=true'), null);
    assert.equal(extractDbFromUri('mongodb+srv://user:pass@cluster.mongodb.net/'), null);
    assert.equal(extractDbFromUri('mongodb://localhost:27017/ai_interview_prep'), 'ai_interview_prep');
    assert.equal(extractDbFromUri(''), null);
    assert.equal(extractDbFromUri(null), null);
  });

  test('1.2: resolveDatabaseName enforces "prepforge_prod" in production when DB is omitted or "test"', () => {
    // Empty URI path in production
    const r1 = resolveDatabaseName('mongodb+srv://user:pass@cluster.mongodb.net/?retryWrites=true', undefined, 'production');
    assert.equal(r1, 'prepforge_prod');

    // Default Atlas "test" path in production
    const r2 = resolveDatabaseName('mongodb+srv://user:pass@cluster.mongodb.net/test?retryWrites=true', undefined, 'production');
    assert.equal(r2, 'prepforge_prod');

    // Explicit "test" DB_NAME in production is overridden to prepforge_prod
    const r3 = resolveDatabaseName('mongodb+srv://user:pass@cluster.mongodb.net/', 'test', 'production');
    assert.equal(r3, 'prepforge_prod');
  });

  test('1.3: resolveDatabaseName respects valid custom DB_NAME in production', () => {
    const r = resolveDatabaseName('mongodb+srv://user:pass@cluster.mongodb.net/', 'prepforge_custom_prod', 'production');
    assert.equal(r, 'prepforge_custom_prod');
  });

  test('1.4: resolveDatabaseName preserves local development database without forcing production name', () => {
    const devDb = resolveDatabaseName('mongodb://localhost:27017/ai_interview_prep', undefined, 'development');
    assert.equal(devDb, 'ai_interview_prep');
  });

  // ------------------------------------------------------------------------
  // STEP 2: Production Environment Validation
  // ------------------------------------------------------------------------
  console.log('\n--- STEP 2: Production Environment & Security Validation ---');

  test('2.1: Rejects missing JWT_SECRET in production mode', () => {
    assert.throws(
      () =>
        validateEnv({
          NODE_ENV: 'production',
          MONGODB_URI: 'mongodb+srv://user:pass@cluster.mongodb.net/prepforge_prod',
        }),
      (err) => {
        assert.ok(err.message.includes('JWT_SECRET is mandatory in production'));
        return true;
      }
    );
  });

  test('2.2: Rejects DB_NAME="test" in production validation', () => {
    assert.throws(
      () =>
        validateEnv({
          NODE_ENV: 'production',
          MONGODB_URI: 'mongodb+srv://user:pass@cluster.mongodb.net/prepforge_prod',
          JWT_SECRET: 'super_secret_jwt_key_that_is_at_least_32_characters_long',
          DB_NAME: 'test',
        }),
      (err) => {
        assert.ok(err.message.includes('DB_NAME cannot be "test" in production'));
        return true;
      }
    );
  });

  test('2.3: Rejects weak/short JWT_SECRET in production mode', () => {
    assert.throws(
      () =>
        validateEnv({
          NODE_ENV: 'production',
          MONGODB_URI: 'mongodb+srv://user:pass@cluster.mongodb.net/prepforge_prod',
          JWT_SECRET: 'short_key',
        }),
      (err) => {
        assert.ok(err.message.includes('JWT_SECRET must be at least 32 characters'));
        return true;
      }
    );
  });

  test('2.4: Valid production configuration passes with correct defaults', () => {
    const res = validateEnv({
      NODE_ENV: 'production',
      MONGODB_URI: 'mongodb+srv://user:pass@cluster.mongodb.net/prepforge_prod',
      JWT_SECRET: 'super_secret_jwt_key_that_is_at_least_32_characters_long',
      DB_NAME: 'prepforge_prod',
      PORT: '10000',
    });
    assert.equal(res.NODE_ENV, 'production');
    assert.equal(res.DB_NAME, 'prepforge_prod');
    assert.equal(res.PORT, 10000);
  });

  // ------------------------------------------------------------------------
  // STEP 3: Render Port Resolution
  // ------------------------------------------------------------------------
  console.log('\n--- STEP 3: Dynamic Port Resolution ---');

  test('3.1: Coerces Render PORT string (e.g. "10000") to number', () => {
    const res = validateEnv({
      MONGODB_URI: 'mongodb://localhost:27017/ai_interview_prep',
      PORT: '10000',
    });
    assert.equal(res.PORT, 10000);
  });

  test('3.2: Defaults to port 5001 when PORT is not provided', () => {
    const res = validateEnv({
      MONGODB_URI: 'mongodb://localhost:27017/ai_interview_prep',
    });
    assert.equal(res.PORT, 5001);
  });

  // ------------------------------------------------------------------------
  // STEP 4: Application Branding in Server Startup
  // ------------------------------------------------------------------------
  console.log('\n--- STEP 4: Application Branding in Startup Logs ---');

  test('4.1: server.js contains updated branding "PrepForge AI — Advanced Resume Intelligence Engine"', () => {
    const serverPath = path.resolve(__dirname, '../../src/server.js');
    const serverCode = fs.readFileSync(serverPath, 'utf8');

    assert.ok(
      serverCode.includes('PrepForge AI — Advanced Resume Intelligence Engine'),
      'server.js must log "PrepForge AI — Advanced Resume Intelligence Engine"'
    );
    assert.ok(
      !serverCode.includes('AI Interview Preparation Platform Server running'),
      'server.js must NOT contain legacy "AI Interview Preparation Platform Server running"'
    );
  });

  console.log('\n======================================================');
  console.log(`Results: ${passed}/${total} Tests Passed (100% Success)`);
  console.log('======================================================\n');
}

runAuditVerification().catch((err) => {
  console.error('\nVerification failed:', err);
  process.exit(1);
});
