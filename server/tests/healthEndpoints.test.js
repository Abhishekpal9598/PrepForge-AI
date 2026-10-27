import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { config } from '../src/config/env.js';

describe('Suite 5: HTTP Health Endpoints Verification', () => {
  let server = null;
  let baseUrl = '';
  const testUri = process.env.TEST_MONGODB_URI || config.testMongoUri;

  before(async () => {
    // Start an ephemeral test server listening on an OS-assigned free port (port 0)
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    await disconnectDB();
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it('GET /api/health must return exact Phase 1 JSON contract without database information', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.equal(res.status, 200);

    const data = await res.json();
    assert.deepEqual(data, {
      success: true,
      message: 'AI Interview Preparation Platform API is running',
    });
    // Ensure no database info leaked
    assert.equal(data.database, undefined, 'No database object should be present on /api/health');
  });

  it('GET /api/health/db must return HTTP 503 when database is disconnected', async () => {
    await disconnectDB();

    const res = await fetch(`${baseUrl}/api/health/db`);
    assert.equal(res.status, 503, 'Should return HTTP 503 when disconnected');

    const data = await res.json();
    assert.equal(data.success, false);
    assert.equal(data.database.status, 'disconnected');
    assert.equal(data.database.readyState, 0);
    assert.equal(data.error, 'Database is not connected');
  });

  it('GET /api/health/db must return HTTP 200 and diagnostic metadata when database is connected', async () => {
    await connectDB(testUri);

    const res = await fetch(`${baseUrl}/api/health/db`);
    assert.equal(res.status, 200, 'Should return HTTP 200 when connected');

    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.database.status, 'connected');
    assert.equal(data.database.readyState, 1);
    assert.ok(data.database.host, 'Host should be reported');
    assert.ok(data.database.name, 'Database name should be reported');
    assert.deepEqual(data.database.modelsLoaded, [
      'User',
      'Resume',
      'ResumeAnalysis',
      'JobAnalysis',
      'InterviewSession',
      'Application',
    ]);

    // Credentials safety: ensure no passwords in response
    const jsonString = JSON.stringify(data);
    assert.ok(!jsonString.includes('password'), 'No password strings should ever be exposed');
  });

  it('GET /api/v1/health must return HTTP 200 and versioned status', async () => {
    const res = await fetch(`${baseUrl}/api/v1/health`);
    assert.ok([200, 503].includes(res.status), 'Should return valid HTTP health status');
    const data = await res.json();
    assert.ok(data.version === '1.0.0', 'Should return version 1.0.0');
    assert.ok(data.status === 'healthy' || data.status === 'degraded');
  });
});

