// probeRenderAuth.js
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

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log(`Checking Render Backend at ${RENDER_BASE}...`);
  let attempts = 0;
  let healthy = false;

  while (attempts < 15 && !healthy) {
    attempts++;
    process.stdout.write(`Attempt ${attempts}: probing /api/v1/health... `);
    try {
      const res = await fetchWithTimeout(`${RENDER_BASE}/api/v1/health`, {}, 15000);
      if (res.status === 200) {
        const body = await res.json();
        console.log(`HTTP ${res.status}`, JSON.stringify(body));
        healthy = true;
      } else {
        console.log(`HTTP ${res.status}`);
      }
    } catch (e) {
      console.log(`Failed (${e.name === 'AbortError' ? 'Timeout' : e.message})`);
    }

    if (!healthy) {
      await sleep(10000);
    }
  }

  if (!healthy) {
    console.error('Render backend did not become healthy within the timeout window.');
    process.exit(1);
  }

  // Probe DB health
  console.log('\nProbing /api/health/db...');
  try {
    const resDb = await fetchWithTimeout(`${RENDER_BASE}/api/health/db`);
    const dbData = await resDb.json();
    console.log(`DB Status: HTTP ${resDb.status}`, JSON.stringify(dbData, null, 2));
  } catch (err) {
    console.error('DB probe error:', err.message);
  }

  // Test live auth flow to confirm commit 906a528 is live
  console.log('\nTesting Live Auth Flow on Render...');
  const testEmail = `render-verify-${Date.now()}@prepforge-live.test`;
  const testPassword = 'SecurePassword123!Render';

  console.log(`1. POST /api/v1/auth/register for ${testEmail}...`);
  const regRes = await fetchWithTimeout(`${RENDER_BASE}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: 'Live Deploy Verifier',
      email: testEmail,
      password: testPassword,
      targetRole: 'Full Stack Engineer',
      careerLevel: 'Mid',
    }),
  });

  const regData = await regRes.json();
  const regCookie = regRes.headers.get('set-cookie');
  console.log(`Register status: HTTP ${regRes.status}`);
  console.log(`Register body:`, JSON.stringify(regData));
  console.log(`Register Set-Cookie:`, regCookie);

  const isTokenOmitted = regData.token === undefined;
  const isCookieOmitted = !regCookie || !regCookie.includes('access_token=');
  console.log(`Verified no JWT in register response: ${isTokenOmitted}`);
  console.log(`Verified no cookie in register response: ${isCookieOmitted}`);

  console.log(`\n2. POST /api/v1/auth/login for ${testEmail}...`);
  const loginRes = await fetchWithTimeout(`${RENDER_BASE}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: testPassword,
    }),
  });

  const loginData = await loginRes.json();
  const loginCookie = loginRes.headers.get('set-cookie');
  console.log(`Login status: HTTP ${loginRes.status}`);
  console.log(`Login has token: ${!!loginData.token}`);
  console.log(`Login has cookie: ${!!(loginCookie && loginCookie.includes('access_token='))}`);

  // Test me endpoint
  console.log(`\n3. GET /api/v1/auth/me with Bearer token...`);
  const meRes = await fetchWithTimeout(`${RENDER_BASE}/api/v1/auth/me`, {
    headers: { Authorization: `Bearer ${loginData.token}` },
  });
  const meData = await meRes.json();
  console.log(`Me status: HTTP ${meRes.status}`, JSON.stringify(meData));

  // Test logout
  console.log(`\n4. POST /api/v1/auth/logout...`);
  const logoutRes = await fetchWithTimeout(`${RENDER_BASE}/api/v1/auth/logout`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${loginData.token}` },
  });
  console.log(`Logout status: HTTP ${logoutRes.status}`);
  console.log(`Logout cookie header:`, logoutRes.headers.get('set-cookie'));
}

main().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
