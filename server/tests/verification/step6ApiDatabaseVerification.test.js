import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import fs from 'fs';
import app from '../../src/app.js';
import { connectDB, disconnectDB } from '../../src/config/db.js';
import { config } from '../../src/config/env.js';
import { User } from '../../src/models/User.js';
import { Resume } from '../../src/models/Resume.js';
import { UPLOAD_DIR } from '../../src/middleware/uploadMiddleware.js';

describe('Suite: Step 6 API & Database Runtime Verification', () => {
  let server = null;
  let baseUrl = '';
  const testUri = process.env.TEST_MONGODB_URI || config.testMongoUri;

  const candidateUser = {
    fullName: 'Dr. Evelyn Reed',
    email: `evelyn-${Date.now()}@testverify.local`,
    password: 'SecurePassword123!',
    targetRole: 'Staff AI Engineer',
  };

  const otherUser = {
    fullName: 'Marcus Vance',
    email: `marcus-${Date.now()}@testverify.local`,
    password: 'SecurePassword123!',
    targetRole: 'DevOps Engineer',
  };

  let tokenCandidate = '';
  let tokenOther = '';
  let uploadedResumeId = '';

  const testPdfBuffer = Buffer.from(
    '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length 120 >>\nstream\nBT /F1 12 Tf 72 712 Td (Dr. Evelyn Reed - Lead AI Architect specializing in PyTorch, Distributed Systems, and Large Language Models.) Tj ET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000214 00000 n \ntrailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n384\n%%EOF'
  );

  before(async () => {
    await connectDB(testUri);

    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });

    // Register Candidate User
    const resA = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(candidateUser),
    });
    const dataA = await resA.json();
    tokenCandidate = dataA.token;

    // Register Other User
    const resB = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(otherUser),
    });
    const dataB = await resB.json();
    tokenOther = dataB.token;
  });

  after(async () => {
    await User.deleteMany({ email: { $in: [candidateUser.email, otherUser.email] } });
    if (uploadedResumeId) {
      await Resume.deleteMany({ _id: uploadedResumeId });
    }
    await disconnectDB();
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it('1. POST /api/v1/resumes successfully uploads resume and persists parsedSections to MongoDB', async () => {
    const fd = new FormData();
    const blob = new Blob([testPdfBuffer], { type: 'application/pdf' });
    fd.append('resume', blob, 'evelyn_reed_resume.pdf');

    const res = await fetch(`${baseUrl}/api/v1/resumes`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenCandidate}` },
      body: fd,
    });

    assert.equal(res.status, 201, 'Should return HTTP 201 Created');
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.resume.id, 'Must return created resume id');
    uploadedResumeId = data.resume.id;

    // Verify parsedSections returned in API response
    assert.ok(data.resume.parsedSections, 'Response must include parsedSections');
    assert.ok(data.resume.parsedSections.structured, 'Response must include structured entities');
    assert.ok(data.resume.parsedSections.confidence >= 0.25);
    assert.ok(data.resume.parsedSections.documentMetadata, 'Response must include documentMetadata');
    assert.equal(data.resume.parsedSections.documentMetadata.format, 'pdf');

    // Security check: Must not expose server disk paths
    assert.equal(data.resume.storedFileName, undefined);
    assert.equal(data.resume.path, undefined);

    // Verify MongoDB document directly
    const saved = await Resume.findById(uploadedResumeId);
    assert.ok(saved, 'Document must exist in MongoDB');
    assert.ok(saved.parsedSections, 'MongoDB document must store parsedSections');
    assert.ok(saved.parsedSections.confidence !== undefined);
  });

  it('2. GET /api/v1/resumes/:id retrieves resume with full parsedSections and zero path leaks', async () => {
    const res = await fetch(`${baseUrl}/api/v1/resumes/${uploadedResumeId}`, {
      headers: { Authorization: `Bearer ${tokenCandidate}` },
    });

    assert.equal(res.status, 200, 'Should return HTTP 200 OK');
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.resume.id, uploadedResumeId);
    assert.ok(data.resume.extractedText.includes('Evelyn Reed'));
    assert.ok(data.resume.parsedSections.confidence !== undefined);
    assert.equal(data.resume.storedFileName, undefined);
  });

  it('3. GET /api/v1/resumes/:id performs lazy self-healing when parsedSections is empty', async () => {
    // Create a legacy resume directly in MongoDB with parsedSections: {}
    const legacyDoc = await Resume.create({
      userId: candidateUser.email ? (await User.findOne({ email: candidateUser.email }))._id : null,
      originalFileName: 'legacy_candidate_cv.txt',
      storedFileName: 'resume-legacy-uuid-1234.txt',
      fileFormat: 'txt',
      fileType: 'txt',
      fileSize: 400,
      extractedText:
        'Dr. Alan Turing\nalan@turing.org | 555-123-9999 | Cambridge, UK\n\nPROFESSIONAL SUMMARY\nPioneer in computer science and mathematical logic.\n\nEDUCATION\nUniversity of Cambridge\nPh.D. in Mathematics (1938)\n\nTECHNICAL SKILLS\nLogic, Cryptography, Computation Theory',
      rawText:
        'Dr. Alan Turing\nalan@turing.org | 555-123-9999 | Cambridge, UK\n\nPROFESSIONAL SUMMARY\nPioneer in computer science and mathematical logic.\n\nEDUCATION\nUniversity of Cambridge\nPh.D. in Mathematics (1938)\n\nTECHNICAL SKILLS\nLogic, Cryptography, Computation Theory',
      parsedSections: {}, // Empty legacy structure
      uploadedAt: new Date(),
    });

    try {
      // Call GET /api/v1/resumes/:id
      const res = await fetch(`${baseUrl}/api/v1/resumes/${legacyDoc._id}`, {
        headers: { Authorization: `Bearer ${tokenCandidate}` },
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);

      // Verify lazy self-healing generated parsedSections
      assert.ok(data.resume.parsedSections.confidence >= 0.5, 'Must generate confidence score');
      assert.ok(data.resume.parsedSections.sectionOrder.includes('education'));
      assert.ok(data.resume.parsedSections.structured.contact.fullName.includes('Alan Turing'));
      assert.equal(data.resume.parsedSections.structured.contact.email, 'alan@turing.org');

      // Verify the document was updated in MongoDB
      const updatedDoc = await Resume.findById(legacyDoc._id);
      assert.ok(updatedDoc.parsedSections.confidence > 0, 'MongoDB document must now have populated parsedSections');
    } finally {
      await Resume.deleteOne({ _id: legacyDoc._id });
    }
  });

  it('4. Rejects unauthenticated requests with HTTP 401', async () => {
    const res = await fetch(`${baseUrl}/api/v1/resumes/${uploadedResumeId}`);
    assert.equal(res.status, 401, 'Must reject unauthenticated request with HTTP 401');
  });

  it('5. Prevents cross-user access (IDOR guard) with HTTP 404', async () => {
    const res = await fetch(`${baseUrl}/api/v1/resumes/${uploadedResumeId}`, {
      headers: { Authorization: `Bearer ${tokenOther}` },
    });
    assert.equal(res.status, 404, 'Must prevent user B from accessing user A resume');
  });
});
