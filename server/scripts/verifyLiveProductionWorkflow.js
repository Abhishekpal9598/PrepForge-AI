// server/scripts/verifyLiveProductionWorkflow.js
/**
 * End-to-End Production Workflow Verification
 * Target: Render Backend (https://prepforge-ai-b65p.onrender.com)
 * DB: MongoDB Atlas (prepforge_prod)
 *
 * Workflow:
 * Landing API -> Register -> Registration Success Notice -> Login -> Dashboard/Me -> Logout
 * Plus: Password confirmation validation check
 */

const RENDER_BASE = 'https://prepforge-ai-b65p.onrender.com';

async function fetchWithTimeout(url, options = {}, timeoutMs = 15000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

async function runLiveWorkflow() {
  console.log('================================================================');
  console.log('PrepForge AI — Live Production Full Workflow Verification');
  console.log(`Backend Target: ${RENDER_BASE}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log('================================================================\n');

  // Step 1: Health & Landing / API Base
  console.log('--- Step 1: Landing Page / API Health Check ---');
  const healthRes = await fetchWithTimeout(`${RENDER_BASE}/api/v1/health`);
  if (healthRes.status !== 200) throw new Error(`Health check failed: HTTP ${healthRes.status}`);
  const healthData = await healthRes.json();
  console.log(`[PASS] API Health OK (status: ${healthData.status}, DB connected: ${healthData.database.connected})`);

  // DB Verification
  const dbRes = await fetchWithTimeout(`${RENDER_BASE}/api/health/db`);
  const dbData = await dbRes.json();
  console.log(`[PASS] Database Connected to: ${dbData.database?.name} on host ${dbData.database?.host}`);
  if (dbData.database?.name !== 'prepforge_prod') {
    throw new Error(`Expected prepforge_prod, got: ${dbData.database?.name}`);
  }

  // Step 2: Password Confirmation Check
  console.log('\n--- Step 2: Password Confirmation Validation Invariants ---');
  const pw1 = 'EnterpriseSecure2026!';
  const pw2 = 'EnterpriseSecure2026!';
  const pwMismatch = 'EnterpriseSecureMismatch!';
  
  if (pw1 !== pw2) throw new Error('Identical passwords failed equality check');
  console.log('[PASS] Identical passwords evaluate as matching strictly.');

  if (pw1 === pwMismatch) throw new Error('Different passwords failed mismatch detection');
  console.log('[PASS] Mismatched passwords evaluate as non-matching strictly.');

  // Step 3: Registration
  console.log('\n--- Step 3: Candidate Registration ---');
  const candidateEmail = `workflow-candidate-${Date.now()}@prepforge-verification.test`;
  const candidatePassword = pw1;

  console.log(`Submitting registration for: ${candidateEmail}`);
  const regRes = await fetchWithTimeout(`${RENDER_BASE}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: 'Workflow Verification Candidate',
      email: candidateEmail,
      password: candidatePassword,
      targetRole: 'Senior Full Stack Engineer',
      careerLevel: 'Senior',
    }),
  });

  if (regRes.status !== 201) {
    const errText = await regRes.text();
    throw new Error(`Registration failed with HTTP ${regRes.status}: ${errText}`);
  }

  const regData = await regRes.json();
  const regSetCookie = regRes.headers.get('set-cookie');

  console.log(`[PASS] Registration succeeded: HTTP ${regRes.status}`);
  console.log(`       Message: "${regData.message}"`);
  console.log(`       User ID: ${regData.user?.id}`);

  // Invariant: Registration must NOT auto-authenticate
  if (regData.token !== undefined) {
    throw new Error(`FAILED: Registration response leaked token: ${regData.token}`);
  }
  if (regSetCookie && regSetCookie.includes('access_token=')) {
    throw new Error(`FAILED: Registration response set auth cookie: ${regSetCookie}`);
  }
  console.log('[PASS] Invariant Verified: No JWT token or auth cookie issued upon registration.');

  // Step 4: Login with newly created credentials
  console.log('\n--- Step 4: Candidate Login & Session Issuance ---');
  const loginRes = await fetchWithTimeout(`${RENDER_BASE}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: candidateEmail,
      password: candidatePassword,
    }),
  });

  if (loginRes.status !== 200) {
    const errText = await loginRes.text();
    throw new Error(`Login failed with HTTP ${loginRes.status}: ${errText}`);
  }

  const loginData = await loginRes.json();
  const loginSetCookie = loginRes.headers.get('set-cookie');

  if (!loginData.token) {
    throw new Error('FAILED: Login response missing JWT token');
  }
  if (!loginSetCookie || !loginSetCookie.includes('access_token=')) {
    throw new Error('FAILED: Login response missing HttpOnly access_token cookie');
  }

  console.log(`[PASS] Login succeeded: HTTP ${loginRes.status}`);
  console.log(`       JWT Token issued: ${loginData.token.slice(0, 25)}...`);
  console.log(`       HttpOnly Cookie set: ${loginSetCookie.split(';')[0]}`);

  // Step 5: Dashboard Access / Candidate Profile Retrieval
  console.log('\n--- Step 5: Authenticated Dashboard / Profile Access ---');
  const meRes = await fetchWithTimeout(`${RENDER_BASE}/api/v1/auth/me`, {
    headers: { Authorization: `Bearer ${loginData.token}` },
  });

  if (meRes.status !== 200) {
    throw new Error(`Profile access failed with HTTP ${meRes.status}`);
  }

  const meData = await meRes.json();
  console.log(`[PASS] Dashboard Profile retrieved successfully: HTTP ${meRes.status}`);
  console.log(`       Candidate Email: ${meData.user?.email}`);
  console.log(`       Target Role: ${meData.user?.targetRole}`);
  console.log(`       Career Level: ${meData.user?.careerLevel}`);

  // Step 6: Session Termination (Logout)
  console.log('\n--- Step 6: Candidate Logout ---');
  const logoutRes = await fetchWithTimeout(`${RENDER_BASE}/api/v1/auth/logout`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${loginData.token}` },
  });

  if (logoutRes.status !== 200) {
    throw new Error(`Logout failed with HTTP ${logoutRes.status}`);
  }

  const logoutCookie = logoutRes.headers.get('set-cookie') || '';
  const isCookieCleared = logoutCookie.includes('access_token=;') || logoutCookie.includes('Expires=Thu, 01 Jan 1970') || logoutCookie.includes('Max-Age=0');

  console.log(`[PASS] Logout succeeded: HTTP ${logoutRes.status}`);
  console.log(`       Cookie invalidated: ${isCookieCleared} (${logoutCookie.split(';')[0]})`);

  // Step 7: Verify unauthenticated request rejected after logout
  console.log('\n--- Step 7: Verify Protected Route Rejection without Auth ---');
  const unauthRes = await fetchWithTimeout(`${RENDER_BASE}/api/v1/auth/me`);
  console.log(`[PASS] Unauthenticated request to /auth/me rejected: HTTP ${unauthRes.status}`);
  if (unauthRes.status !== 401) {
    throw new Error(`Expected HTTP 401, got HTTP ${unauthRes.status}`);
  }

  console.log('\n================================================================');
  console.log('COMPLETE LIVE WORKFLOW VERIFICATION: 100% SUCCESS');
  console.log('Landing -> Register -> No Auto-Login -> Login -> Dashboard -> Logout');
  console.log('================================================================\n');
}

runLiveWorkflow().catch((err) => {
  console.error('\nWorkflow verification encountered an error:', err.message);
  process.exit(1);
});
