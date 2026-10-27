/**
 * verifyRenderLiveDeployment.js
 *
 * Verifies live Render backend deployment against Phase 9.2 specifications:
 * 1. GET /api/health - HTTP 200, valid payload.
 * 2. GET /api/health/db - HTTP 200, readyState: 1, db: prepforge_prod.
 * 3. GET /api/v1/health - HTTP 200, status: healthy, database.connected: true.
 * 4. GET /api/v1/non-existent-route - HTTP 404, controlled JSON error, no stack trace.
 * 5. Security & Header check - Helmet headers, absence of secret leaks.
 */

import https from 'node:https';
import http from 'node:http';
import { URL } from 'node:url';

const targetUrl = process.argv[2] || process.env.RENDER_SERVICE_URL || 'https://prepforge-ai-api.onrender.com';

console.log(`\n======================================================`);
console.log(`PrepForge AI - Live Render Backend Verification`);
console.log(`Target URL: ${targetUrl}`);
console.log(`Timestamp:  ${new Date().toISOString()}`);
console.log(`======================================================\n`);

function makeRequest(urlString, options = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(urlString);
    const client = parsed.protocol === 'https:' ? https : http;

    const req = client.request(
      parsed,
      {
        method: options.method || 'GET',
        headers: {
          'User-Agent': 'PrepForge-Live-Verifier/1.0',
          Accept: 'application/json',
          ...(options.headers || {})
        },
        timeout: options.timeout || 15000
      },
      (res) => {
        let rawData = '';
        res.on('data', (chunk) => {
          rawData += chunk;
        });
        res.on('end', () => {
          let jsonData = null;
          try {
            jsonData = JSON.parse(rawData);
          } catch {
            // Not JSON
          }
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: rawData,
            json: jsonData
          });
        });
      }
    );

    req.on('error', (err) => reject(err));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Request timed out after ${options.timeout || 15000}ms`));
    });

    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

async function runVerification() {
  const results = {
    total: 5,
    passed: 0,
    failed: 0,
    details: []
  };

  function record(name, passed, detail) {
    if (passed) {
      results.passed++;
      console.log(` [PASS] ${name}`);
    } else {
      results.failed++;
      console.error(` [FAIL] ${name} - ${detail}`);
    }
    results.details.push({ name, passed, detail });
  }

  // 1. Root /api/health
  try {
    const res = await makeRequest(`${targetUrl}/api/health`);
    const is200 = res.statusCode === 200;
    const hasSuccess = res.json && res.json.success === true;
    record(
      '1. Root Health Endpoint (/api/health)',
      is200 && hasSuccess,
      `Status: ${res.statusCode}, Body: ${res.body.slice(0, 100)}`
    );
  } catch (err) {
    record('1. Root Health Endpoint (/api/health)', false, err.message);
  }

  // 2. Database Health & Isolation (/api/health/db)
  try {
    const res = await makeRequest(`${targetUrl}/api/health/db`);
    const is200 = res.statusCode === 200;
    const readyState = res.json?.data?.database?.readyState ?? res.json?.database?.readyState;
    const dbName = res.json?.data?.database?.name ?? res.json?.database?.name;
    const isProdDb = dbName === 'prepforge_prod';
    const isConnected = readyState === 1;

    // Check no credentials in body
    const hasNoSecrets =
      !res.body.includes('mongodb+srv://') &&
      !res.body.includes('password') &&
      !res.body.includes('secret');

    record(
      '2. Database Health & Isolation (/api/health/db)',
      is200 && isConnected && isProdDb && hasNoSecrets,
      `Status: ${res.statusCode}, readyState: ${readyState}, db: ${dbName}, safe: ${hasNoSecrets}`
    );
  } catch (err) {
    record('2. Database Health & Isolation (/api/health/db)', false, err.message);
  }

  // 3. V1 Standard Health (/api/v1/health)
  try {
    const res = await makeRequest(`${targetUrl}/api/v1/health`);
    const is200 = res.statusCode === 200;
    const isHealthy = res.json?.status === 'healthy';
    const dbConnected = res.json?.database?.connected === true;
    record(
      '3. V1 Standard Health Endpoint (/api/v1/health)',
      is200 && isHealthy && dbConnected,
      `Status: ${res.statusCode}, status: ${res.json?.status}, dbConnected: ${dbConnected}`
    );
  } catch (err) {
    record('3. V1 Standard Health Endpoint (/api/v1/health)', false, err.message);
  }

  // 4. Controlled Error Handling & No Stack Trace on 404
  try {
    const res = await makeRequest(`${targetUrl}/api/v1/non-existent-probe-test`);
    const is404 = res.statusCode === 404;
    const hasControlledError = res.json && res.json.success === false;
    const hasNoStack = !res.body.includes('at ') && !res.body.includes('node_modules');
    record(
      '4. Controlled 404 Error Handling & Stack Trace Suppression',
      is404 && hasControlledError && hasNoStack,
      `Status: ${res.statusCode}, JSON: ${!!res.json}, NoStack: ${hasNoStack}`
    );
  } catch (err) {
    record('4. Controlled 404 Error Handling & Stack Trace Suppression', false, err.message);
  }

  // 5. Security Headers & TLS
  try {
    const res = await makeRequest(`${targetUrl}/api/health`);
    const headers = res.headers;
    const isHttps = targetUrl.startsWith('https://');
    const noPoweredBy = !headers['x-powered-by'];
    const hasNosniff = headers['x-content-type-options'] === 'nosniff';
    const hasFrameOptions = headers['x-frame-options'] === 'DENY' || headers['x-frame-options'] === 'SAMEORIGIN';

    record(
      '5. Security Headers & TLS (Helmet & HTTPS)',
      isHttps && noPoweredBy && hasNosniff,
      `HTTPS: ${isHttps}, NoPoweredBy: ${noPoweredBy}, nosniff: ${hasNosniff}, frameOptions: ${headers['x-frame-options']}`
    );
  } catch (err) {
    record('5. Security Headers & TLS (Helmet & HTTPS)', false, err.message);
  }

  console.log(`\n======================================================`);
  console.log(`Results: ${results.passed}/${results.total} Passed, ${results.failed} Failed`);
  console.log(`======================================================\n`);

  if (results.failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runVerification();
