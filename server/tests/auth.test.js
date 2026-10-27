import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { config } from '../src/config/env.js';
import { User } from '../src/models/User.js';

describe('Suite: Authentication Endpoints Verification', () => {
  let server = null;
  let baseUrl = '';
  const testUri = process.env.TEST_MONGODB_URI || config.testMongoUri;

  const testUser = {
    fullName: 'Jane PrepForge Candidate',
    email: `test-${Date.now()}@prepforge.ai`,
    password: 'SuperSecurePassword123!',
    targetRole: 'Full Stack Engineer',
    careerLevel: 'Mid'
  };

  let authToken = '';
  let authCookie = '';

  before(async () => {
    await connectDB(testUri);
    await User.deleteMany({ email: { $regex: /@prepforge\.ai$/i } });

    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    await User.deleteMany({ email: { $regex: /@prepforge\.ai$/i } });
    await disconnectDB();
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it('1. POST /api/v1/auth/register creates user, hashes password, and returns JWT', async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser)
    });

    assert.equal(res.status, 201, 'Should return HTTP 201 Created');
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.token, 'Should return token');
    assert.equal(data.user.email, testUser.email.toLowerCase());
    assert.equal(data.user.fullName, testUser.fullName);
    assert.equal(data.user.targetRole, testUser.targetRole);
    assert.equal(data.user.careerLevel, testUser.careerLevel);
    assert.equal(data.user.passwordHash, undefined, 'passwordHash must never be exposed');

    // Extract cookie
    const setCookie = res.headers.get('set-cookie');
    assert.ok(setCookie && setCookie.includes('access_token='), 'Should set HttpOnly access_token cookie');

    authToken = data.token;
    authCookie = setCookie.split(';')[0];

    // Verify stored user in database has a 60-character bcrypt hash
    const stored = await User.findOne({ email: testUser.email.toLowerCase() }).select('+passwordHash');
    assert.ok(stored, 'User must exist in MongoDB');
    assert.equal(stored.passwordHash.length, 60, 'Bcrypt password hash must be exactly 60 characters');
    assert.ok(stored.passwordHash.startsWith('$2'), 'Must be a valid bcrypt hash');
  });

  it('2. POST /api/v1/auth/register rejects duplicate email with HTTP 409', async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser)
    });

    assert.equal(res.status, 409, 'Duplicate registration should return HTTP 409 Conflict');
    const data = await res.json();
    assert.equal(data.success, false);
    assert.ok(data.message.includes('already exists'), 'Error message should explain duplicate email');
  });

  it('3. POST /api/v1/auth/register rejects invalid email and short password', async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'A',
        email: 'invalid-email',
        password: '123'
      })
    });

    assert.equal(res.status, 400, 'Should reject with HTTP 400 Bad Request');
    const data = await res.json();
    assert.equal(data.success, false);
  });

  it('4. POST /api/v1/auth/login authenticates valid credentials and returns JWT', async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testUser.email,
        password: testUser.password
      })
    });

    assert.equal(res.status, 200, 'Should return HTTP 200 OK');
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.token, 'Should return authentication token');
    assert.equal(data.user.email, testUser.email.toLowerCase());
  });

  it('5. POST /api/v1/auth/login rejects wrong password with HTTP 401', async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testUser.email,
        password: 'CompletelyWrongPassword!'
      })
    });

    assert.equal(res.status, 401, 'Wrong password should return HTTP 401');
    const data = await res.json();
    assert.equal(data.success, false);
    assert.equal(data.message, 'Invalid email or password.');
  });

  it('6. GET /api/v1/auth/me returns current user profile when authenticated via Bearer token', async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/me`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.user.email, testUser.email.toLowerCase());
    assert.equal(data.user.fullName, testUser.fullName);
  });

  it('7. GET /api/v1/auth/me returns current user profile when authenticated via cookie', async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/me`, {
      headers: {
        'Cookie': authCookie
      }
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.user.email, testUser.email.toLowerCase());
  });

  it('8. GET /api/v1/auth/me rejects unauthenticated request with HTTP 401', async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/me`);
    assert.equal(res.status, 401);
    const data = await res.json();
    assert.equal(data.success, false);
    assert.equal(data.code, 'AUTH_TOKEN_MISSING');
  });

  it('9. POST /api/v1/auth/logout clears access token cookie', async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/logout`, {
      method: 'POST'
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
  });
});
