/**
 * verifyLiveRenderE2E.js
 *
 * Executes live End-to-End integration against deployed Render backend:
 * 1. User Registration & JWT Authentication
 * 2. Resume PDF Upload & Text Parsing
 * 3. 27-Point Check Execution
 * 4. Multi-Dimensional Scoring
 * 5. Database Cleanup (Deletion of test artifacts)
 */

import https from 'node:https';
import { URL } from 'node:url';

const BASE_URL = process.env.RENDER_URL || 'https://prepforge-ai-b65p.onrender.com';

console.log(`\n======================================================`);
console.log(`PrepForge AI — Live Render E2E Integration Probe`);
console.log(`Target Backend: ${BASE_URL}`);
console.log(`Timestamp:      ${new Date().toISOString()}`);
console.log(`======================================================\n`);

function apiCall(endpoint, method = 'GET', data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const fullUrl = new URL(endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`);
    let postData = null;
    const reqHeaders = {
      'User-Agent': 'PrepForge-E2E-Verifier/1.0',
      Accept: 'application/json',
      ...headers,
    };

    if (data && typeof data === 'object' && !(data instanceof Buffer) && !headers['Content-Type']?.includes('multipart')) {
      postData = JSON.stringify(data);
      reqHeaders['Content-Type'] = 'application/json';
      reqHeaders['Content-Length'] = Buffer.byteLength(postData);
    } else if (data instanceof Buffer) {
      postData = data;
      reqHeaders['Content-Length'] = data.length;
    }

    const req = https.request(
      fullUrl,
      {
        method,
        headers: reqHeaders,
        timeout: 30000,
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => {
          let json = null;
          try { json = JSON.parse(body); } catch {}
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body,
            json,
          });
        });
      }
    );

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Timeout calling ${endpoint}`));
    });

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

function buildMultipartFormData(fields, fileField, filename, fileBuffer, mimeType) {
  const boundary = `----PrepForgeBoundary${Date.now()}`;
  const parts = [];

  for (const [key, val] of Object.entries(fields)) {
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${val}\r\n`));
  }

  parts.push(Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="${fileField}"; filename="${filename}"\r\nContent-Type: ${mimeType}\r\n\r\n`
  ));
  parts.push(fileBuffer);
  parts.push(Buffer.from(`\r\n--${boundary}--\r\n`));

  const body = Buffer.concat(parts);
  const contentType = `multipart/form-data; boundary=${boundary}`;

  return { body, contentType };
}

async function runLiveE2E() {
  const results = { total: 6, passed: 0, failed: 0 };
  const testEmail = `verify-${Date.now()}@prepforge-verify.io`;
  const testPassword = 'VerifyPassword123!Secure';
  let token = null;
  let resumeId = null;

  function record(name, pass, detail = '') {
    if (pass) {
      results.passed++;
      console.log(`  [PASS] ${name} ${detail ? `(${detail})` : ''}`);
    } else {
      results.failed++;
      console.error(`  [FAIL] ${name} - ${detail}`);
    }
  }

  // 1. Health Probe
  try {
    const res = await apiCall('/api/v1/health');
    const pass = res.statusCode === 200 && res.json?.status === 'healthy';
    record('1. Live V1 Health Check', pass, `status=${res.json?.status}, db=${res.json?.database?.connected}`);
  } catch (err) {
    record('1. Live V1 Health Check', false, err.message);
  }

  // 2. User Registration & Auth
  try {
    const res = await apiCall('/api/v1/auth/register', 'POST', {
      fullName: 'Live Verifier User',
      email: testEmail,
      password: testPassword,
      targetRole: 'Senior Software Engineer',
    });
    token = res.json?.token || res.json?.data?.token;
    const pass = res.statusCode === 201 && !!token;
    record('2. Live User Registration & JWT Issuance', pass, `HTTP ${res.statusCode}, User: ${testEmail}`);
  } catch (err) {
    record('2. Live User Registration & JWT Issuance', false, err.message);
  }

  // 3. Resume Upload (PDF)
  if (token) {
    try {
      const validPdfBuffer = Buffer.from(
        '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length 120 >>\nstream\nBT /F1 12 Tf 72 712 Td (Jordan Taylor - Lead Backend Engineer with 7 years Node.js, Express, Docker, and MongoDB expertise) Tj ET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000214 00000 n \ntrailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n384\n%%EOF'
      );

      const { body, contentType } = buildMultipartFormData(
        { targetRole: 'Backend Engineer' },
        'resume',
        'jordan-taylor-resume.pdf',
        validPdfBuffer,
        'application/pdf'
      );

      const res = await apiCall('/api/v1/resumes', 'POST', body, {
        Authorization: `Bearer ${token}`,
        'Content-Type': contentType,
      });

      resumeId = res.json?.resume?.id || res.json?.resume?._id || res.json?.data?.resume?._id;
      const pass = res.statusCode === 201 && !!resumeId;
      record('3. Live Resume PDF Upload & Text Parsing', pass, `Resume ID: ${resumeId}, Text len: ${res.json?.resume?.extractedText?.length || 0}`);
    } catch (err) {
      record('3. Live Resume PDF Upload & Text Parsing', false, err.message);
    }
  }

  // 4. 27-Point Check Execution
  if (token && resumeId) {
    try {
      const res = await apiCall(`/api/v1/resumes/${resumeId}/checks`, 'POST', {}, {
        Authorization: `Bearer ${token}`,
      });
      const checks = res.json?.data?.checks;
      const pass = res.statusCode === 200 && Array.isArray(checks) && checks.length === 27;
      record('4. Live 27-Point Resume Checks Execution', pass, `Total checks: ${checks?.length}, Passed: ${res.json?.data?.summary?.passed}`);
    } catch (err) {
      record('4. Live 27-Point Resume Checks Execution', false, err.message);
    }
  }

  // 5. Multi-Dimensional Scoring
  if (token && resumeId) {
    try {
      const res = await apiCall(`/api/v1/resumes/${resumeId}/scores`, 'GET', null, {
        Authorization: `Bearer ${token}`,
      });
      const scores = res.json?.data?.scores || res.json?.data;
      const pass = res.statusCode === 200 && typeof scores?.overallScore === 'number';
      record('5. Live Multi-Dimensional Scoring Engine', pass, `Overall Score: ${scores?.overallScore}, ATS: ${scores?.subScores?.atsCompatibility}`);
    } catch (err) {
      record('5. Live Multi-Dimensional Scoring Engine', false, err.message);
    }
  }

  // 6. Artifact Cleanup (DELETE resume and user)
  if (token && resumeId) {
    try {
      const delResume = await apiCall(`/api/v1/resumes/${resumeId}`, 'DELETE', null, {
        Authorization: `Bearer ${token}`,
      });
      const delPass = delResume.statusCode === 200;
      record('6. Live Database & Disk Artifact Cleanup', delPass, `Deleted Resume ${resumeId}`);
    } catch (err) {
      record('6. Live Database & Disk Artifact Cleanup', false, err.message);
    }
  }

  console.log(`\n======================================================`);
  console.log(`Live E2E Verification Results: ${results.passed}/${results.total} Passed (${results.failed} Failed)`);
  console.log(`======================================================\n`);

  if (results.failed > 0) {
    process.exit(1);
  }
}

runLiveE2E().catch((err) => {
  console.error('\nE2E probe failed:', err);
  process.exit(1);
});
