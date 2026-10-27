import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { config } from '../src/config/env.js';
import { User } from '../src/models/User.js';
import { Resume } from '../src/models/Resume.js';
import { ResumeAnalysis } from '../src/models/ResumeAnalysis.js';
import { validateAtsAnalysis, calculateAtsCompositeScore } from '../src/validators/resumeAnalysisValidators.js';

describe('Suite: AI Resume Analysis & ATS Scoring Integration', () => {
  let server = null;
  let baseUrl = '';
  const testUri = process.env.TEST_MONGODB_URI || config.testMongoUri;

  // Test User A (Owner)
  const userA = {
    fullName: 'Resume Candidate A',
    email: `cand-a-${Date.now()}@analysistest.local`,
    password: 'SecurePassword123!',
    targetRole: 'Senior Full Stack Engineer',
  };

  // Test User B (Attacker / Cross-user test)
  const userB = {
    fullName: 'Resume Candidate B',
    email: `cand-b-${Date.now()}@analysistest.local`,
    password: 'SecurePassword123!',
    targetRole: 'Data Engineer',
  };

  let tokenA = '';
  let tokenB = '';
  let resumeA = null;
  let createdAnalysisId = '';

  before(async () => {
    await connectDB(testUri);

    // Bind Express server to ephemeral test port
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });

    // Register User A
    const resA = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userA),
    });
    const dataA = await resA.json();
    tokenA = dataA.token;

    // Register User B
    const resB = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userB),
    });
    const dataB = await resB.json();
    tokenB = dataB.token;

    // Create a verified Resume document for User A with realistic technical text
    const sampleResumeText = `
Alex Mercer
Email: alex.mercer@example.com | Phone: (555) 019-2834 | GitHub: github.com/alexmercer
Full Stack Software Engineer

PROFESSIONAL EXPERIENCE:
Staff Software Engineer - Acme Cloud Systems (2021 - Present)
- Architected and delivered high-throughput distributed event streaming platform using Node.js, Express, Kafka, and Redis, reducing p99 latency by 42%.
- Spearheaded migration of monolith backend to AWS ECS microservices with automated Docker CI/CD pipelines, scaling to 150M daily API calls.
- Mentored 8 junior and mid-level engineers through code reviews, design docs, and architectural RFCs.

Senior Software Engineer - FinTech Horizons (2018 - 2021)
- Built financial transaction processing services with PostgreSQL and React frontend, maintaining 99.99% uptime.
- Optimized database indexing and slow query plans, decreasing average checkout execution time by 35%.

TECHNICAL SKILLS:
- Languages: JavaScript (ES6+), TypeScript, Python, SQL
- Frameworks & Libraries: React, Node.js, Express, TailwindCSS, Jest
- Cloud & Databases: AWS (ECS, S3, RDS), Docker, MongoDB, PostgreSQL, Redis, Kafka

EDUCATION:
Bachelor of Science in Computer Science - University of California, Berkeley (2014 - 2018)
    `.trim();

    resumeA = await Resume.create({
      userId: dataA.user.id || dataA.user._id,
      originalFileName: 'Alex_Mercer_Staff_Engineer_Resume.pdf',
      storedFileName: `test-${Date.now()}-Alex_Mercer.pdf`,
      fileType: 'pdf',
      fileFormat: 'pdf',
      fileSize: 48200,
      extractedText: sampleResumeText,
      rawText: sampleResumeText,
      uploadedAt: new Date(),
    });
  });

  after(async () => {
    try {
      if (resumeA) {
        await Resume.deleteMany({ userId: { $in: [resumeA.userId] } });
        await ResumeAnalysis.deleteMany({ userId: { $in: [resumeA.userId] } });
      }
      await User.deleteMany({
        email: { $in: [userA.email.toLowerCase(), userB.email.toLowerCase()] },
      });
    } catch {
      // Ignore cleanup errors
    }

    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await disconnectDB();
  });

  // 1. Zod Schema & Scoring Engine Tests
  describe('1. Zod Schema & Deterministic Scoring Validation', () => {
    it('should correctly calculate deterministic weighted ATS composite score', () => {
      // 0.25*80 + 0.20*90 + 0.15*70 + 0.20*85 + 0.20*95
      // = 20 + 18 + 10.5 + 17 + 19 = 84.5 -> 85
      const categoryScores = {
        impact: 80,
        brevity: 90,
        style: 70,
        skills: 85,
        atsReadability: 95,
      };
      const score = calculateAtsCompositeScore(categoryScores);
      assert.equal(score, 85);
    });

    it('should validate a full 13-component ATS analysis object', () => {
      const mockPayload = {
        overallScore: 88,
        resumeSummary: 'Experienced Staff Engineer with exemplary cloud-native architecture skills and proven team leadership.',
        categoryScores: {
          impact: 85,
          brevity: 90,
          style: 85,
          skills: 90,
          atsReadability: 90,
        },
        technicalSkills: ['JavaScript', 'TypeScript', 'Node.js', 'React', 'AWS', 'Docker'],
        softSkills: ['Mentorship', 'Cross-functional Collaboration', 'System Design'],
        workExperienceAnalysis: {
          summary: 'Outstanding impact quantification and strong architectural ownership across tenures.',
          bulletPointsEvaluated: [
            {
              original: 'Built financial transaction processing services with PostgreSQL and React frontend.',
              issue: 'Lacks explicit operational scale and business impact metrics.',
              rewrite: 'Engineered mission-critical payment settlement pipeline processing $12M+ monthly transaction volume with zero downtime.',
              impact: 'Highlights commercial scale and operational resilience.',
            },
          ],
          actionVerbStrength: 'Strong',
          quantifiableResultsPresent: true,
        },
        educationAnalysis: {
          summary: 'Accredited BS in Computer Science from a top-tier institution.',
          degreesFound: ['Bachelor of Science in Computer Science'],
          institutionFound: true,
          recommendations: ['Consider highlighting notable senior projects or honors.'],
        },
        strengths: [
          'Excellent metrics-driven bullet points demonstrating quantifiable business outcomes.',
          'Modern full-stack technical competencies aligned with senior engineering requirements.',
        ],
        weaknesses: [
          'Could expand on security practices and automated testing methodologies.',
        ],
        missingSkills: ['Kubernetes', 'GraphQL', 'Terraform'],
        keywordOptimization: {
          summary: 'High keyword match against senior backend and full stack job requisitions.',
          highValueKeywordsFound: ['Distributed Systems', 'Microservices', 'Kafka', 'Latency Optimization'],
          suggestedKeywordsToAdd: ['CI/CD Pipeline Automation', 'Observability (Prometheus/Grafana)'],
        },
        formattingFeedback: {
          isAtsFriendly: true,
          fontAndLayoutAdvice: 'Standard clean chronological hierarchy; sections are distinct and parseable.',
          sectionsIdentified: ['Experience', 'Technical Skills', 'Education'],
          potentialParsingRisks: [],
        },
        improvementSuggestions: [
          {
            priority: 'Medium',
            section: 'Technical Skills',
            suggestion: 'Group technologies by category (Languages, Cloud, DevOps) for rapid scanning.',
            actionableExample: 'Categories: Languages: JS/TS; Infrastructure: AWS, Docker.',
          },
        ],
        sectionWiseRecommendations: [
          {
            sectionName: 'Work Experience',
            status: 'Good',
            feedback: 'Strong action verbs and clear chronological progression.',
          },
        ],
        disclaimer: 'ATS compatibility score is an estimation based on standard parsing criteria.',
      };

      const validated = validateAtsAnalysis(mockPayload);
      assert.ok(validated);
      assert.equal(validated.overallScore, 88);
      assert.equal(validated.technicalSkills.length, 6);
    });

    it('should reject malformed analysis missing required fields', () => {
      const invalidPayload = {
        overallScore: 80,
        // missing resumeSummary
        categoryScores: { impact: 80 },
      };

      assert.throws(() => validateAtsAnalysis(invalidPayload), {
        code: 'INVALID_AI_SCHEMA',
      });
    });
  });

  // 2. Authentication & Authorization Guards
  describe('2. Authentication & Ownership Security Guards', () => {
    it('should reject unauthenticated analysis request with HTTP 401', async () => {
      const res = await fetch(`${baseUrl}/api/v1/resumes/${resumeA._id}/analyze`, {
        method: 'POST',
      });
      assert.equal(res.status, 401);
      const data = await res.json();
      assert.equal(data.success, false);
      assert.equal(data.code, 'AUTH_TOKEN_MISSING');
    });

    it('should reject invalid resume ObjectId format with HTTP 400', async () => {
      const res = await fetch(`${baseUrl}/api/v1/resumes/invalid-non-object-id/analyze`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.equal(data.code, 'INVALID_ID');
    });

    it('should return 404 when resume ID does not exist', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await fetch(`${baseUrl}/api/v1/resumes/${fakeId}/analyze`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      assert.equal(res.status, 404);
      const data = await res.json();
      assert.equal(data.code, 'RESUME_NOT_FOUND');
    });

    it('should prevent cross-user analysis: User B cannot analyze User A resume', async () => {
      const res = await fetch(`${baseUrl}/api/v1/resumes/${resumeA._id}/analyze`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenB}` }, // User B token
      });
      assert.equal(res.status, 404); // Returns 404 to prevent resource enumeration
      const data = await res.json();
      assert.equal(data.code, 'RESUME_NOT_FOUND');
    });

    it('should prevent cross-user retrieval: User B cannot retrieve User A analysis', async () => {
      const res = await fetch(`${baseUrl}/api/v1/resumes/${resumeA._id}/analysis`, {
        headers: { Authorization: `Bearer ${tokenB}` },
      });
      assert.equal(res.status, 404);
    });
  });

  // 3. AI Resume Analysis Execution & MongoDB Persistence
  describe('3. AI Resume Analysis Execution & Persistence', () => {
    it('POST /api/v1/resumes/:id/analyze generates real Gemini ATS analysis and persists to DB', async () => {
      const res = await fetch(`${baseUrl}/api/v1/resumes/${resumeA._id}/analyze`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenA}` },
      });

      assert.equal(res.status, 201);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.ok(data.analysis, 'Analysis object must be returned');
      assert.ok(data.analysis.id || data.analysis._id, 'Analysis must have database ID');
      createdAnalysisId = data.analysis.id || data.analysis._id;

      // Verify all 13 required fields are present and structured
      assert.ok(typeof data.analysis.overallScore === 'number');
      assert.ok(data.analysis.overallScore >= 0 && data.analysis.overallScore <= 100);
      assert.ok(data.analysis.summaryFeedback || data.analysis.resumeSummary);
      assert.ok(data.analysis.categoryScores.impact >= 0);
      assert.ok(data.analysis.categoryScores.atsReadability >= 0);
      assert.ok(Array.isArray(data.analysis.technicalSkills));
      assert.ok(Array.isArray(data.analysis.softSkills));
      assert.ok(data.analysis.workExperienceAnalysis);
      assert.ok(data.analysis.educationAnalysis);
      assert.ok(Array.isArray(data.analysis.strengths) && data.analysis.strengths.length > 0);
      assert.ok(Array.isArray(data.analysis.weaknesses) && data.analysis.weaknesses.length > 0);
      assert.ok(Array.isArray(data.analysis.missingSkills));
      assert.ok(data.analysis.keywordOptimization);
      assert.ok(data.analysis.formattingFeedback);
      assert.ok(Array.isArray(data.analysis.improvementSuggestions));
      assert.ok(Array.isArray(data.analysis.sectionWiseRecommendations));

      // Verify direct database persistence in MongoDB
      const persistedDoc = await ResumeAnalysis.findById(createdAnalysisId);
      assert.ok(persistedDoc, 'Document must be persisted in resumeanalyses collection');
      assert.equal(persistedDoc.userId.toString(), resumeA.userId.toString());
      assert.equal(persistedDoc.resumeId.toString(), resumeA._id.toString());
      assert.equal(persistedDoc.overallScore, data.analysis.overallScore);
    });

    it('GET /api/v1/resumes/:id/analysis retrieves the latest analysis for the resume', async () => {
      const res = await fetch(`${baseUrl}/api/v1/resumes/${resumeA._id}/analysis`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.equal(data.analysis.id || data.analysis._id, createdAnalysisId.toString());
      assert.equal(data.analysis.resumeId.toString(), resumeA._id.toString());
    });
  });

  // 4. Analysis History & Management Endpoints
  describe('4. Analysis History, Retrieval & Deletion Endpoints', () => {
    it('GET /api/v1/resume-analyses returns paginated analysis history for authenticated user', async () => {
      const res = await fetch(`${baseUrl}/api/v1/resume-analyses?page=1&limit=10`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.ok(data.total >= 1);
      assert.ok(Array.isArray(data.data));
      assert.ok(data.data.some((a) => (a.id || a._id) === createdAnalysisId.toString()));
    });

    it('GET /api/v1/resume-analyses/:analysisId retrieves single analysis by ID', async () => {
      const res = await fetch(`${baseUrl}/api/v1/resume-analyses/${createdAnalysisId}`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.equal(data.analysis.id || data.analysis._id, createdAnalysisId.toString());
    });

    it('DELETE /api/v1/resume-analyses/:analysisId deletes analysis and verifies removal', async () => {
      const res = await fetch(`${baseUrl}/api/v1/resume-analyses/${createdAnalysisId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${tokenA}` },
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);

      // Verify deletion from database
      const deletedDoc = await ResumeAnalysis.findById(createdAnalysisId);
      assert.equal(deletedDoc, null, 'Analysis document must no longer exist in DB');
    });

    it('GET /api/v1/resumes/:id/analysis returns 404 after analysis has been deleted', async () => {
      const res = await fetch(`${baseUrl}/api/v1/resumes/${resumeA._id}/analysis`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });

      assert.equal(res.status, 404);
      const data = await res.json();
      assert.equal(data.code, 'ANALYSIS_NOT_FOUND');
    });
  });

  // 5. Resilience, Fault Tolerance & Concurrency Control
  describe('5. Resilience, Fault Tolerance & Concurrency Control', () => {
    it('should reject analysis on resume with insufficient text (<20 characters)', async () => {
      const shortId = new mongoose.Types.ObjectId();
      await Resume.collection.insertOne({
        _id: shortId,
        userId: resumeA.userId,
        originalFileName: 'Short_Resume.pdf',
        storedFileName: `short-${Date.now()}.pdf`,
        fileType: 'pdf',
        fileFormat: 'pdf',
        fileSize: 100,
        extractedText: 'Too short text.',
        rawText: 'Too short text.',
        uploadedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await fetch(`${baseUrl}/api/v1/resumes/${shortId}/analyze`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenA}` },
      });

      assert.equal(res.status, 400);
      const data = await res.json();
      assert.equal(data.code, 'INSUFFICIENT_TEXT');

      await Resume.deleteOne({ _id: shortId });
    });


    it('should prevent simultaneous duplicate analysis on same resume (Concurrency Lock)', async () => {
      // Fire two requests concurrently
      const promise1 = fetch(`${baseUrl}/api/v1/resumes/${resumeA._id}/analyze`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      const promise2 = fetch(`${baseUrl}/api/v1/resumes/${resumeA._id}/analyze`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenA}` },
      });

      const [res1, res2] = await Promise.all([promise1, promise2]);
      const statuses = [res1.status, res2.status];

      // One should succeed (201) and the second should be locked (409 Conflict)
      assert.ok(
        statuses.includes(409),
        `Expected at least one request to receive HTTP 409 Conflict due to active concurrency lock. Got statuses: ${statuses.join(', ')}`
      );

      // Clean up newly created analysis if any
      await ResumeAnalysis.deleteMany({ resumeId: resumeA._id });
    });
  });
});

