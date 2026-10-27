/**
 * corsAndErrorHandling.test.js
 *
 * Dedicated tests for:
 * 1. CORS origin validation for Vercel, custom domain, and localhost in production
 * 2. Malicious origin rejection in production
 * 3. Preflight headers configuration
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { corsOptions, isOriginAllowedInProduction } from '../../src/config/cors.js';

describe('Suite: CORS Configuration & Origin Authorization Invariants', () => {
  it('1. Authorizes official Vercel production domain https://prepforge-ai.vercel.app', () => {
    assert.equal(isOriginAllowedInProduction('https://prepforge-ai.vercel.app'), true);
  });

  it('2. Authorizes project-based Vercel domain https://ai-interview-preparation-platform.vercel.app', () => {
    assert.equal(isOriginAllowedInProduction('https://ai-interview-preparation-platform.vercel.app'), true);
  });

  it('3. Authorizes Vercel branch & preview deployments matching prepforge or ai-interview', () => {
    assert.equal(isOriginAllowedInProduction('https://prepforge-ai-git-main-abhishekpal9598.vercel.app'), true);
    assert.equal(isOriginAllowedInProduction('https://ai-interview-preparation-platform-b65p.vercel.app'), true);
  });

  it('4. Authorizes official production domains https://prepforge.ai and https://www.prepforge.ai', () => {
    assert.equal(isOriginAllowedInProduction('https://prepforge.ai'), true);
    assert.equal(isOriginAllowedInProduction('https://www.prepforge.ai'), true);
  });

  it('5. Authorizes local development ports (5173, 3000, 4173)', () => {
    assert.equal(isOriginAllowedInProduction('http://localhost:5173'), true);
    assert.equal(isOriginAllowedInProduction('http://127.0.0.1:5173'), true);
    assert.equal(isOriginAllowedInProduction('http://localhost:3000'), true);
    assert.equal(isOriginAllowedInProduction('http://localhost:4173'), true);
  });

  it('6. Strictly rejects unauthorized third-party and malicious origins', () => {
    assert.equal(isOriginAllowedInProduction('https://malicious-attacker.com'), false);
    assert.equal(isOriginAllowedInProduction('https://unrelated-project.vercel.app'), false);
    assert.equal(isOriginAllowedInProduction('https://phishing-prepforge.com'), false);
  });

  it('7. Confirms credentials, allowed methods, and allowed headers', () => {
    assert.equal(corsOptions.credentials, true, 'Credentials must be enabled for HttpOnly cookies');
    assert.ok(corsOptions.methods.includes('OPTIONS'), 'Preflight OPTIONS must be permitted');
    assert.ok(corsOptions.methods.includes('POST'), 'POST must be permitted');
    assert.ok(corsOptions.allowedHeaders.includes('Content-Type'), 'Content-Type must be permitted');
    assert.ok(corsOptions.allowedHeaders.includes('Authorization'), 'Authorization must be permitted');
    assert.ok(corsOptions.allowedHeaders.includes('X-Requested-With'), 'X-Requested-With must be permitted');
  });
});
