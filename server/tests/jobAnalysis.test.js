import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { config } from '../src/config/env.js';
import { User } from '../src/models/User.js';
import { Resume } from '../src/models/Resume.js';
import { JobAnalysis } from '../src/models/JobAnalysis.js';
import {
  calculateJobMatchCompositeScore,
  validateAiJobMatch,
  jobAnalysisInputSchema,
} from '../src/validators/jobAnalysisValidators.js';

describe('Suite: Job Description Analysis & Resume Matching Module', () => {
  let server = null;
  let baseUrl = '';
  const testUri = process.env.TEST_MONGODB_URI || config.testMongoUri;

  const userA = {
    fullName: 'Job Candidate Alpha',
    email: `alpha-job-${Date.now()}@jobmatchtest.local`,
    password: 'SecurePassword123!',
    targetRole: 'Staff Distributed Systems Engineer',
  };

  const userB = {
    fullName: 'Job Candidate Beta',
    email: `beta-job-${Date.now()}@jobmatchtest.local`,
    password: 'SecurePassword123!',
    targetRole: 'Mobile Developer',
  };

  let tokenA = '';
  let tokenB = '';
  let resumeA = null;
  let createdJobId = '';

  const sampleJobData = {
    jobTitle: 'Staff Backend Infrastructure Engineer',
    companyName: 'Acme Cloud Platforms',
    location: 'San Francisco, CA or Remote',
    jobDescription: `
We are seeking an exceptional Staff Backend Infrastructure Engineer to lead the architectural evolution of our global event streaming platform.
Requirements:
- 6+ years of production experience designing and building high-throughput distributed microservices.
- Mastery of Node.js, TypeScript, Go, or Python.
- Deep expertise in Kafka, Redis, and relational database tuning (PostgreSQL).
- Experience leading cloud migrations (AWS, Docker, Kubernetes) with 99.99% SLA requirements.
- Strong cross-functional mentorship and architectural RFC leadership.
Education:
- Bachelor's degree in Computer Science, Software Engineering, or equivalent practical experience.
    `.trim(),
  };

  before(async () => {
    await connectDB(testUri);

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

    // Create a Resume for User A
    const sampleResumeText = `
Alex Mercer - Staff Software Engineer
San Francisco, CA | alex.mercer@example.com | (555) 019-2834
Summary: Staff Backend Engineer with 7+ years architecting distributed streaming systems, Kafka pipelines, and cloud microservices.

EXPERIENCE:
Staff Software Engineer - Cloud Systems Inc. (2021 - Present)
- Architected distributed event streaming engine processing 150M events daily using Node.js, Express, Kafka, and Redis, decreasing p99 latency by 42%.
- Led cloud migration from monolithic services to AWS ECS and Docker, maintaining 99.99% uptime.
- Mentored 8 engineers through code reviews, system design sessions, and RFCs.

Senior Software Engineer - FinTech Labs (2018 - 2021)
- Designed transaction settlement pipelines with PostgreSQL, Python, and React.
- Optimized query execution plans and database indexing, speeding checkout queries by 35%.

SKILLS:
- Languages: TypeScript, JavaScript, Python, SQL
- Technologies: Kafka, Redis, AWS (ECS, S3, RDS), Docker, PostgreSQL, Microservices
- Leadership: System Architecture, Technical RFCs, Mentorship

EDUCATION:
- B.S. in Computer Science - University of California, Berkeley (2014 - 2018)
    `.trim();

    resumeA = await Resume.create({
      userId: dataA.user.id || dataA.user._id,
      originalFileName: 'Alex_Mercer_Staff_Backend.pdf',
      storedFileName: `test-${Date.now()}-Alex_Mercer.pdf`,
      fileType: 'pdf',
      fileFormat: 'pdf',
      fileSize: 52000,
      extractedText: sampleResumeText,
      rawText: sampleResumeText,
      uploadedAt: new Date(),
    });
  });

  after(async () => {
    try {
      if (resumeA) {
        await Resume.deleteMany({ userId: { $in: [resumeA.userId] } });
        await JobAnalysis.deleteMany({ userId: { $in: [resumeA.userId] } });
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

  // 1. Zod Schema & Deterministic Scoring Validation
  describe('1. Zod Schema & Scoring Engine Validation', () => {
    it('should correctly calculate deterministic weighted job match composite score', () => {
      // 0.40 * 85 + 0.30 * 90 + 0.15 * 80 + 0.15 * 70
      // = 34 + 27 + 12 + 10.5 = 83.5 -> 84
      const categoryScores = {
        skillsMatch: 85,
        experienceMatch: 90,
        educationMatch: 80,
        scopeAndKeywords: 70,
      };
      const score = calculateJobMatchCompositeScore(categoryScores);
      assert.equal(score, 84);
    });

    it('should validate complete AI Job Match schema output', () => {
      const samplePayload = {
        matchScore: 84,
        matchSummary: 'Candidate is an exceptional match for this Staff Backend Infrastructure role with direct production experience in Kafka and distributed systems.',
        categoryScores: {
          skillsMatch: 85,
          experienceMatch: 90,
          educationMatch: 80,
          scopeAndKeywords: 70,
        },
        jobRequirements: {
          seniorityLevel: 'Staff/Principal',
          requiredTechnicalSkills: ['Node.js', 'TypeScript', 'Kafka', 'PostgreSQL', 'AWS'],
          preferredTechnicalSkills: ['Kubernetes', 'Go'],
          softSkills: ['Mentorship', 'RFC Leadership', 'System Design'],
          requiredExperience: '6+ years distributed systems',
          educationRequirements: 'Bachelor in CS or equivalent',
          keyResponsibilities: ['Lead streaming architecture', 'Manage cloud microservices migration'],
          importantKeywords: ['Distributed Systems', 'Kafka', 'p99 Latency', 'Microservices'],
        },
        matchedSkills: ['Node.js', 'TypeScript', 'Kafka', 'PostgreSQL', 'AWS', 'Redis', 'Docker'],
        missingRequiredSkills: [],
        missingPreferredSkills: ['Kubernetes', 'Go'],
        experienceAnalysis: {
          status: 'Exceeds',
          candidateExperienceSummary: '7+ years building high-throughput distributed backends and event streams.',
          requiredExperienceSummary: '6+ years in production distributed systems.',
          assessment: 'Candidate tenure and seniority fully satisfy the Staff requirement.',
        },
        educationAnalysis: {
          status: 'Meets',
          candidateEducation: 'B.S. in Computer Science, UC Berkeley',
          requiredEducation: 'Bachelor in CS or equivalent',
          assessment: 'Direct academic degree alignment with job requirement.',
        },
        keywordOverlap: {
          highValueKeywordsFound: ['Distributed Systems', 'Kafka', 'Redis', 'Microservices'],
          missingKeywords: ['Kubernetes'],
          overlapPercentage: 85,
        },
        relevantResumeSections: [
          {
            sectionTitle: 'Cloud Systems Inc. - Staff Software Engineer',
            excerpt: 'Architected distributed event streaming engine processing 150M events daily using Node.js, Express, Kafka, and Redis.',
            relevance: 'Demonstrates exact scale and technology stack required by the role.',
          },
        ],
        strengthsForThisJob: [
          'Direct production architecture experience with Apache Kafka and Redis caching.',
          'Quantified latency reduction (42% p99) and 99.99% SLA adherence.',
        ],
        weaknessesAndGaps: [
          'Resume emphasizes AWS ECS rather than Kubernetes explicitly mentioned in preferred qualifications.',
        ],
        improvementRecommendations: [
          {
            priority: 'High',
            area: 'Technical Skills',
            recommendation: 'Highlight any hands-on exposure to Kubernetes or container orchestration.',
          },
        ],
        disclaimer: 'This match score is an estimation based on semantic skill and experience alignment.',
      };

      const validated = validateAiJobMatch(samplePayload);
      assert.ok(validated);
      assert.equal(validated.matchScore, 84);
      assert.equal(validated.matchedSkills.length, 7);
    });

    it('should reject malformed payload missing matchSummary or categoryScores', () => {
      const invalid = {
        matchScore: 80,
      };
      assert.throws(() => validateAiJobMatch(invalid), {
        code: 'INVALID_AI_SCHEMA',
      });
    });
  });

  // 2. Input Validation & Ownership Guards
  describe('2. Input Validation & Authentication Guards', () => {
    it('should reject unauthenticated request with HTTP 401', async () => {
      const res = await fetch(`${baseUrl}/api/v1/jobs/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeId: resumeA._id,
          ...sampleJobData,
        }),
      });
      assert.equal(res.status, 401);
      const data = await res.json();
      assert.equal(data.code, 'AUTH_TOKEN_MISSING');
    });

    it('should reject invalid resumeId format with HTTP 400', async () => {
      const res = await fetch(`${baseUrl}/api/v1/jobs/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({
          resumeId: 'not-a-valid-id',
          ...sampleJobData,
        }),
      });
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.equal(data.code, 'VALIDATION_ERROR');
    });

    it('should reject short job description (<50 characters) with HTTP 400', async () => {
      const res = await fetch(`${baseUrl}/api/v1/jobs/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({
          resumeId: resumeA._id,
          jobTitle: 'Software Engineer',
          jobDescription: 'Too short description.',
        }),
      });
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.equal(data.code, 'VALIDATION_ERROR');
    });

    it('should return 404 when resume does not exist', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const res = await fetch(`${baseUrl}/api/v1/jobs/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({
          resumeId: nonExistentId,
          ...sampleJobData,
        }),
      });
      assert.equal(res.status, 404);
      const data = await res.json();
      assert.equal(data.code, 'RESUME_NOT_FOUND');
    });

    it('should prevent cross-user matching: User B cannot match against User A resume', async () => {
      const res = await fetch(`${baseUrl}/api/v1/jobs/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenB}`, // User B token
        },
        body: JSON.stringify({
          resumeId: resumeA._id, // User A resume
          ...sampleJobData,
        }),
      });
      assert.equal(res.status, 404);
      const data = await res.json();
      assert.equal(data.code, 'RESUME_NOT_FOUND');
    });
  });

  // 3. AI Job Matching & MongoDB Persistence
  describe('3. AI Job Matching & Persistence', () => {
    it('POST /api/v1/jobs/analyze runs real Gemini AI matching and persists record', async () => {
      const res = await fetch(`${baseUrl}/api/v1/jobs/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({
          resumeId: resumeA._id,
          ...sampleJobData,
        }),
      });

      assert.equal(res.status, 201);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.ok(data.job, 'Job record must be returned');
      assert.ok(data.job.id || data.job._id);
      createdJobId = data.job.id || data.job._id;

      // Verify returned match structure
      assert.equal(data.job.jobTitle, sampleJobData.jobTitle);
      assert.ok(typeof data.job.matchScore === 'number');
      assert.ok(data.job.matchScore >= 0 && data.job.matchScore <= 100);
      assert.ok(data.job.categoryScores.skillsMatch >= 0);
      assert.ok(data.job.jobRequirements.requiredTechnicalSkills);
      assert.ok(Array.isArray(data.job.matchedSkills));
      assert.ok(data.job.experienceAnalysis);
      assert.ok(data.job.educationAnalysis);
      assert.ok(data.job.keywordOverlap);
      assert.ok(Array.isArray(data.job.strengthsForThisJob));
      assert.ok(Array.isArray(data.job.weaknessesAndGaps));
      assert.ok(Array.isArray(data.job.improvementRecommendations));

      // Verify persistence directly in MongoDB
      const persistedDoc = await JobAnalysis.findById(createdJobId);
      assert.ok(persistedDoc);
      assert.equal(persistedDoc.userId.toString(), resumeA.userId.toString());
      assert.equal(persistedDoc.resumeId.toString(), resumeA._id.toString());
      assert.equal(persistedDoc.jobTitle, sampleJobData.jobTitle);
    });

    it('GET /api/v1/jobs/:id retrieves specific job match record with populated resume info', async () => {
      const res = await fetch(`${baseUrl}/api/v1/jobs/${createdJobId}`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.equal(data.job.id || data.job._id, createdJobId.toString());
      assert.equal(data.job.resumeFileName, resumeA.originalFileName);
    });
  });

  // 4. Job History & Deletion Endpoints
  describe('4. Job History & Deletion Endpoints', () => {
    it('GET /api/v1/jobs returns paginated list of user job analyses', async () => {
      const res = await fetch(`${baseUrl}/api/v1/jobs?page=1&limit=10`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.ok(data.total >= 1);
      assert.ok(Array.isArray(data.data));
      assert.ok(data.data.some((j) => (j.id || j._id) === createdJobId.toString()));
    });

    it('GET /api/v1/jobs/history acts as alias returning history', async () => {
      const res = await fetch(`${baseUrl}/api/v1/jobs/history`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.ok(Array.isArray(data.data));
    });

    it('prevent cross-user deletion: User B cannot delete User A job analysis', async () => {
      const res = await fetch(`${baseUrl}/api/v1/jobs/${createdJobId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${tokenB}` },
      });

      assert.equal(res.status, 404);
    });

    it('DELETE /api/v1/jobs/:id deletes record and verifies removal from database', async () => {
      const res = await fetch(`${baseUrl}/api/v1/jobs/${createdJobId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${tokenA}` },
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);

      const checkDoc = await JobAnalysis.findById(createdJobId);
      assert.equal(checkDoc, null);
    });
  });

  // 5. Concurrency Control
  describe('5. Concurrency Control', () => {
    it('should reject simultaneous duplicate job matching on same resume with HTTP 409 Conflict', async () => {
      const call1 = fetch(`${baseUrl}/api/v1/jobs/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({
          resumeId: resumeA._id,
          ...sampleJobData,
        }),
      });

      const call2 = fetch(`${baseUrl}/api/v1/jobs/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({
          resumeId: resumeA._id,
          ...sampleJobData,
        }),
      });

      const [res1, res2] = await Promise.all([call1, call2]);
      const statuses = [res1.status, res2.status];

      assert.ok(
        statuses.includes(409),
        `Expected at least one request to receive HTTP 409 Conflict. Got statuses: ${statuses.join(', ')}`
      );

      // Clean up created record
      await JobAnalysis.deleteMany({ resumeId: resumeA._id });
    });
  });
});
