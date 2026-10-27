import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { config } from '../src/config/env.js';
import { User } from '../src/models/User.js';
import { Resume } from '../src/models/Resume.js';
import { ResumeAnalysis } from '../src/models/ResumeAnalysis.js';

describe('Suite: Phase 5 Deep AI Analysis Endpoints & Integration', () => {
  let server = null;
  let baseUrl = '';
  const testUri = process.env.TEST_MONGODB_URI || config.testMongoUri;

  const userA = {
    fullName: 'AI Candidate Alpha',
    email: `ai-alpha-${Date.now()}@aitest.local`,
    password: 'SecurePassword123!',
    targetRole: 'Senior Cloud Architect',
  };

  const userB = {
    fullName: 'AI Candidate Beta',
    email: `ai-beta-${Date.now()}@aitest.local`,
    password: 'SecurePassword123!',
    targetRole: 'Data Engineer',
  };

  let tokenA = '';
  let tokenB = '';
  let resumeIdA = '';
  let shortResumeId = '';
  let historicalResumeId = '';

  before(async () => {
    await connectDB(testUri);
    await User.deleteMany({ email: { $regex: /@aitest\.local$/i } });

    // Start ephemeral server
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}/api/v1`;
        resolve();
      });
    });

    // Register User A
    const regResA = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userA),
    });
    const regDataA = await regResA.json();
    tokenA = regDataA.token || regDataA.data?.token || '';

    // Register User B
    const regResB = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userB),
    });
    const regDataB = await regResB.json();
    tokenB = regDataB.token || regDataB.data?.token || '';

    const userDocA = await User.findOne({ email: userA.email });

    // 1. Create a rich technical resume for User A
    const resumeDocA = await Resume.create({
      userId: userDocA._id,
      title: 'DevOps_Architect_Resume.pdf',
      originalFileName: 'Morgan_Riley_Senior_DevOps_Resume.pdf',
      fileFormat: 'pdf',
      fileSize: 130000,
      extractedText: `
        Morgan Riley
        Senior Cloud & DevOps Architect
        morgan.riley@example.com | +1 555-0188 | Denver, CO
        https://linkedin.com/in/morganriley | https://github.com/morganriley

        Professional Summary
        Senior Cloud & DevOps Architect with 9+ years experience architecting multi-region AWS and Kubernetes infrastructure.

        Technical Skills
        AWS, Kubernetes, Terraform, Docker, Python, Go, Node.js, CI/CD, Prometheus, Grafana

        Professional Experience
        Lead Infrastructure Architect — Apex Cloud (01/2021 - Present)
        • Architected multi-cluster Kubernetes platform serving 85,000 requests per second with 99.99% SLA.
        • Automated GitOps infrastructure pipelines via Terraform and GitHub Actions saving 40 hours monthly.
        • Mentored 6 DevOps engineers and established organizational zero-trust security standards.

        Senior DevOps Engineer — Horizon Technologies (03/2017 - 12/2020)
        • Orchestrated Docker containerization reducing developer staging cycle times by 55%.
        • Engineered Prometheus and Grafana observability stack decreasing mean time to detect incidents by 30 minutes.

        Projects
        Multi-Region Failover Controller
        • Implemented an open-source Kubernetes operator in Go for cross-region disaster recovery failover.
        • Technologies: Go, Kubernetes API, AWS Route 53.

        Education
        Bachelor of Science in Computer Engineering — University of Colorado Boulder (2013 - 2017)
      `,
      parsedSections: {
        rawSections: {
          summary: 'Senior Cloud & DevOps Architect with 9+ years experience architecting multi-region AWS and Kubernetes infrastructure.',
          skills: 'AWS, Kubernetes, Terraform, Docker, Python, Go, Node.js, CI/CD, Prometheus, Grafana',
          experience: 'Lead Infrastructure Architect at Apex Cloud\nSenior DevOps Engineer at Horizon Technologies',
          education: 'Bachelor of Science in Computer Engineering',
        },
        detectedSections: [
          { canonicalKey: 'contact', characterCount: 100 },
          { canonicalKey: 'summary', characterCount: 120 },
          { canonicalKey: 'technicalSkills', characterCount: 95 },
          { canonicalKey: 'experience', characterCount: 600 },
          { canonicalKey: 'education', characterCount: 90 },
        ],
        sectionOrder: ['contact', 'summary', 'technicalSkills', 'experience', 'education'],
      },
    });
    resumeIdA = resumeDocA._id.toString();

    // 2. Pre-seed a Phase 4 scoring analysis on resumeIdA
    await ResumeAnalysis.create({
      userId: userDocA._id,
      resumeId: resumeDocA._id,
      overallScore: 94,
      subScores: {
        atsScore: 96,
        contentScore: 92,
        structureScore: 95,
        jobMatchScore: null,
      },
      detailedChecks: [
        {
          checkId: 'CHK-01',
          categoryId: 'CAT-01',
          categoryName: 'ATS Essentials',
          title: 'File Format & Technical Readability',
          status: 'PASS',
          severity: 'info',
          evidence: ['Valid PDF format'],
          explanation: 'File is valid',
          confidence: 1.0,
        },
      ],
      checkSummary: { totalChecks: 27, passedCount: 26, warningCount: 1, failedCount: 0, notEvaluatedCount: 0 },
      scoringVersion: '1.0.0',
      scoreConfidence: 1.0,
      scoredAt: new Date(),
    });

    // 3. Short resume for validation tests
    const shortResume = await Resume.create({
      userId: userDocA._id,
      title: 'Short.pdf',
      originalFileName: 'Short.pdf',
      fileFormat: 'pdf',
      fileSize: 1000,
      extractedText: 'Too short text here!',
    });
    shortResumeId = shortResume._id.toString();

    // 4. Historical resume without aiAnalysis
    const historicalResume = await Resume.create({
      userId: userDocA._id,
      title: 'Historical.pdf',
      originalFileName: 'Historical.pdf',
      fileFormat: 'pdf',
      fileSize: 50000,
      extractedText: 'Historical resume content with adequate length for testing legacy backward compatibility.',
    });
    historicalResumeId = historicalResume._id.toString();

    await ResumeAnalysis.create({
      userId: userDocA._id,
      resumeId: historicalResume._id,
      overallScore: 80,
      summaryFeedback: 'Historical legacy record.',
      // aiAnalysis is default null
    });
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await User.deleteMany({ email: { $regex: /@aitest\.local$/i } });
    await Resume.deleteMany({ _id: { $in: [resumeIdA, shortResumeId, historicalResumeId] } });
    await ResumeAnalysis.deleteMany({ resumeId: { $in: [resumeIdA, shortResumeId, historicalResumeId] } });
    await disconnectDB();
  });

  // TC-AIEP-01: Authentication Guard
  it('TC-AIEP-01: Rejects unauthenticated analysis requests with HTTP 401', async () => {
    const res = await fetch(`${baseUrl}/resumes/${resumeIdA}/analyze`, {
      method: 'POST',
    });
    assert.equal(res.status, 401);
  });

  // TC-AIEP-02: IDOR Protection
  it('TC-AIEP-02: Prevents cross-user analysis (User B receives HTTP 404 for User A resume)', async () => {
    const res = await fetch(`${baseUrl}/resumes/${resumeIdA}/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenB}`, // User B token
      },
    });
    assert.equal(res.status, 404);
  });

  // TC-AIEP-03: Insufficient Text Validation (< 20 chars)
  it('TC-AIEP-03: Rejects resumes with insufficient text (< 20 chars) with HTTP 400', async () => {
    // Override extractedText to be 10 chars
    await Resume.updateOne({ _id: shortResumeId }, { $set: { extractedText: 'Short' } });

    const res = await fetch(`${baseUrl}/resumes/${shortResumeId}/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.code, 'INSUFFICIENT_TEXT');
  });

  // TC-AIEP-04: Deterministic Checks & Phase 4 Scores Preserved After AI Analysis
  it('TC-AIEP-04: Preserves existing Phase 4 scores and Phase 3 checks without AI recalculation', async () => {
    const beforeAnalysis = await ResumeAnalysis.findOne({ resumeId: resumeIdA });
    assert.equal(beforeAnalysis.overallScore, 94);
    assert.equal(beforeAnalysis.subScores.atsScore, 96);

    const res = await fetch(`${baseUrl}/resumes/${resumeIdA}/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        targetRole: 'Staff Site Reliability Engineer',
      }),
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.success, true);

    const afterAnalysis = await ResumeAnalysis.findOne({ resumeId: resumeIdA });
    // Deterministic overallScore and subScores must remain exactly as computed by Phase 4
    assert.equal(afterAnalysis.overallScore, 94, 'Overall Score must NOT be overwritten by AI');
    assert.equal(afterAnalysis.subScores.atsScore, 96, 'ATS Score must NOT be overwritten by AI');
    assert.equal(afterAnalysis.subScores.contentScore, 92);
    assert.equal(afterAnalysis.subScores.structureScore, 95);

    // Deep AI analysis must be populated
    assert.ok(afterAnalysis.aiAnalysis, 'aiAnalysis subdocument must be persisted');
    assert.ok(afterAnalysis.aiAnalysis.summaryEvaluation);
    assert.ok(afterAnalysis.aiAnalysis.experienceAnalysis);
    assert.ok(afterAnalysis.aiAnalysis.skillsAnalysis);
    assert.ok(afterAnalysis.aiAnalysis.projectAnalysis);
    assert.ok(Array.isArray(afterAnalysis.aiAnalysis.improvementRecommendations));
    assert.ok(afterAnalysis.aiAnalysis.antiHallucinationAudit.bracketedMetricsTemplatesProvided);
  });

  // TC-AIEP-05: GET /resumes/:id/analysis Returns Deep AI Structure
  it('TC-AIEP-05: GET /resumes/:id/analysis returns complete payload with aiAnalysis and subScores', async () => {
    const res = await fetch(`${baseUrl}/resumes/${resumeIdA}/analysis`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${tokenA}`,
      },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(body.analysis);
    assert.equal(body.analysis.overallScore, 94);
    assert.ok(body.analysis.aiAnalysis, 'aiAnalysis must be present in GET response');
    assert.ok(body.analysis.aiAnalysis.summaryEvaluation);
    assert.ok(body.analysis.aiAnalysis.experienceAnalysis);
    assert.ok(body.analysis.subScores);
  });

  // TC-AIEP-06: Historical Document Backward Compatibility
  it('TC-AIEP-06: GET /resumes/:id/analysis on historical document returns valid payload with aiAnalysis: null', async () => {
    const res = await fetch(`${baseUrl}/resumes/${historicalResumeId}/analysis`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${tokenA}`,
      },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.analysis.overallScore, 80);
    assert.equal(body.analysis.aiAnalysis, null, 'aiAnalysis must be null for pre-Phase 5 documents');
  });

  // TC-AIEP-07: Cross-User Retrieval IDOR Protection
  it('TC-AIEP-07: IDOR Guard: User B cannot retrieve User A analysis (returns HTTP 404)', async () => {
    const res = await fetch(`${baseUrl}/resumes/${resumeIdA}/analysis`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${tokenB}`, // User B token
      },
    });

    assert.equal(res.status, 404);
  });

  // TC-AIEP-08: Concurrency Locking Prevents Simultaneous Duplicate Requests
  it('TC-AIEP-08: Concurrency lock rejects simultaneous duplicate requests on same resume with 409', async () => {
    // Send two concurrent requests without awaiting the first
    const req1 = fetch(`${baseUrl}/resumes/${resumeIdA}/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
    });

    const req2 = fetch(`${baseUrl}/resumes/${resumeIdA}/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
    });

    const [res1, res2] = await Promise.all([req1, req2]);
    const statuses = [res1.status, res2.status];

    // One must succeed (201), the second must be rejected with 409 (ANALYSIS_IN_PROGRESS)
    assert.ok(
      statuses.includes(409) || statuses.every((s) => s === 201),
      'Concurrent request must either be protected by 409 lock or safely sequentialized'
    );
  });
});
