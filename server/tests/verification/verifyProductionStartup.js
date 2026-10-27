import { spawn } from 'child_process';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import assert from 'node:assert/strict';
import { validateEnv } from '../../src/config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runProductionStartupVerification() {
  console.log('======================================================');
  console.log('  PrepForge AI — Phase 8.1 Production Startup Audit');
  console.log('======================================================\n');

  // Test 1: Production validation fails if JWT_SECRET is missing
  console.log('Test 1: Validating production environment guards against missing JWT_SECRET...');
  assert.throws(
    () => {
      validateEnv({
        NODE_ENV: 'production',
        MONGODB_URI: 'mongodb+srv://<db_user>:<db_password_placeholder>@cluster0.xyz.mongodb.net/prepforge_prod',
        // Missing JWT_SECRET
      });
    },
    (err) => {
      assert.ok(err.message.includes('JWT_SECRET is mandatory in production'), 'Must reject missing JWT_SECRET');
      return true;
    }
  );
  console.log('  ✔ PASS - Missing JWT_SECRET in production strictly halts startup with clear error.\n');

  // Test 2: Production validation passes with valid configuration
  console.log('Test 2: Validating production environment accepts valid configuration...');
  const prodConfig = validateEnv({
    NODE_ENV: 'production',
    PORT: 5001,
    MONGODB_URI: 'mongodb+srv://<db_user>:<db_password_placeholder>@cluster0.xyz.mongodb.net/prepforge_prod',
    JWT_SECRET: 'a_very_secure_random_production_secret_key_minimum_32_characters_long',
    CLIENT_URL: 'https://prepforge.ai',
    GEMINI_API_KEY: 'test_production_key',
  });
  assert.equal(prodConfig.NODE_ENV, 'production');
  assert.equal(prodConfig.PORT, 5001);
  assert.equal(prodConfig.CLIENT_URL, 'https://prepforge.ai');
  console.log('  ✔ PASS - Production configuration schema passes validation.\n');

  // Test 3: Check runtime package dependencies (no devDependency in production runtime)
  console.log('Test 3: Auditing server dependencies for development-only leaks...');
  const pkgPath = path.resolve(__dirname, '../../package.json');
  const pkg = JSON.parse(await import('fs').then((m) => m.readFileSync(pkgPath, 'utf8')));
  const devDeps = Object.keys(pkg.devDependencies || {});
  assert.ok(devDeps.includes('nodemon'), 'Nodemon must be in devDependencies');
  assert.ok(!pkg.dependencies.nodemon, 'Nodemon must NOT be in dependencies');
  console.log('  ✔ PASS - Runtime dependencies clean: nodemon isolated to devDependencies.\n');

  // Test 4: Live HTTP Health Check Probe against active server
  console.log('Test 4: Probing running server health endpoint on port 5001...');
  const healthData = await new Promise((resolve, reject) => {
    const req = http.get('http://127.0.0.1:5001/api/health', (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(5000, () => { req.destroy(new Error('Timeout probing health')); });
  });

  assert.equal(healthData.status, 200, 'Health endpoint should return HTTP 200');
  assert.equal(healthData.data.success, true, 'Health check success must be true');
  console.log(`  ✔ PASS - /api/health returned HTTP 200: "${healthData.data.message}".\n`);

  // Test 5: DB Health Check Probe
  console.log('Test 5: Probing running server DB diagnostics endpoint...');
  const dbData = await new Promise((resolve, reject) => {
    const req = http.get('http://127.0.0.1:5001/api/health/db', (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(5000, () => { req.destroy(new Error('Timeout probing DB health')); });
  });

  assert.equal(dbData.status, 200, 'DB health endpoint should return HTTP 200');
  assert.equal(dbData.data.database.readyState, 1, 'Database readyState must be 1 (connected)');
  assert.equal(dbData.data.database.status, 'connected', 'Database status must be "connected"');
  console.log(`  ✔ PASS - /api/health/db returned HTTP 200 [Host: ${dbData.data.database.host}, DB: ${dbData.data.database.name}, Models: ${dbData.data.database.modelsLoaded.length}].\n`);

  // Test 6: V1 Versioned Health Check Probe
  console.log('Test 6: Probing /api/v1/health endpoint...');
  const v1Data = await new Promise((resolve, reject) => {
    const req = http.get('http://127.0.0.1:5001/api/v1/health', (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(5000, () => { req.destroy(new Error('Timeout probing V1 health')); });
  });

  assert.equal(v1Data.status, 200, 'V1 health endpoint should return HTTP 200');
  assert.equal(v1Data.data.status, 'healthy');
  assert.equal(v1Data.data.database.connected, true);
  console.log(`  ✔ PASS - /api/v1/health returned HTTP 200 with status "${v1Data.data.status}" [v${v1Data.data.version}].\n`);

  console.log('======================================================');
  console.log('  ✔ All 5 Production Startup & Port Tests Passed!');
  console.log('======================================================\n');
}

runProductionStartupVerification().catch((err) => {
  console.error('\n✖ Production Startup Verification Failed:', err);
  process.exit(1);
});
