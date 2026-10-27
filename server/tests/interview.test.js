import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { config } from '../src/config/env.js';
import { User } from '../src/models/User.js';
import { Resume } from '../src/models/Resume.js';
import { JobAnalysis } from '../src/models/JobAnalysis.js';
import { InterviewSession } from '../src/models/InterviewSession.js';
import {
  interviewInputSchema,
  submitAnswerInputSchema,
  calculateAnswerCompositeScore,
  determineFinalAssessmentLabel,
  validateAiQuestionList,
  validateAiAnswerEvaluation,
} from '../src/validators/interviewValidators.js';

describe('Suite: AI Mock Interview System (Phase 4)', () => {
  let server = null;
  let baseUrl = '';
  const testUri = process.env.TEST_MONGODB_URI || config.testMongoUri;

  const userA = {
    fullName: 'Candidate Interview Alpha',
    email: `alpha-mock-${Date.now()}@interviewtest.local`,
    password: 'SecurePassword123!',
    targetRole: 'Senior Full Stack Engineer',
  };

  const userB = {
    fullName: 'Candidate Interview Beta',
    email: `beta-mock-${Date.now()}@interviewtest.local`,
    password: 'SecurePassword123!',
    targetRole: 'Junior Frontend Developer',
  };

  let tokenA = '';
  let tokenB = '';
  let resumeA = null;
  let jobAnalysisA = null;
  let createdSessionId = '';
  let firstQuestionId = '';

  before(async () => {
    await connectDB(testUri);

    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });

    // 1. Register User A
    const resA = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userA),
    });
    const dataA = await resA.json();
    tokenA = dataA.token;

    // 2. Register User B
    const resB = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userB),
    });
    const dataB = await resB.json();
    tokenB = dataB.token;

    const userAId = dataA.user.id;

    // 3. Create Resume for User A
    resumeA = await Resume.create({
      userId: userAId,
      originalFileName: 'Alpha_FullStack_Resume.pdf',
      storedFileName: 'stored_alpha_resume.pdf',
      fileFormat: 'pdf',
      fileSize: 1024 * 120,
      rawText: `
Abhishek Pal - Senior Full Stack Engineer
Skills: Node.js, Express, React, TypeScript, MongoDB, Redis, Docker, Microservices, AWS.
Experience:
- Designed and maintained high-throughput REST APIs handling 5,000 req/sec with 99.99% uptime.
- Optimized database indexing in MongoDB reducing P95 latency by 45%.
- Implemented JWT authentication and distributed session caching via Redis.
Education: Bachelor of Technology in Computer Science.
      `.trim(),
      extractedText: `
Abhishek Pal - Senior Full Stack Engineer
Skills: Node.js, Express, React, TypeScript, MongoDB, Redis, Docker, Microservices, AWS.
Experience:
- Designed and maintained high-throughput REST APIs handling 5,000 req/sec with 99.99% uptime.
- Optimized database indexing in MongoDB reducing P95 latency by 45%.
- Implemented JWT authentication and distributed session caching via Redis.
Education: Bachelor of Technology in Computer Science.
      `.trim(),
    });

    // 4. Create Job Analysis for User A
    jobAnalysisA = await JobAnalysis.create({
      userId: userAId,
      resumeId: resumeA._id,
      jobTitle: 'Senior Full Stack Engineer',
      companyName: 'CloudScale Technologies',
      jobDescription: `
Seeking a Senior Full Stack Engineer with extensive Node.js, MongoDB, React, and system design expertise.
Responsibilities include building scalable APIs, managing CI/CD pipelines, and driving architectural decisions.
      `.trim(),
      matchScore: 88,
      matchedSkills: ['Node.js', 'React', 'MongoDB', 'AWS'],
      missingSkills: ['GraphQL'],
    });
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }

    try {
      await User.deleteMany({ email: { $in: [userA.email, userB.email] } });
      if (resumeA) await Resume.deleteMany({ _id: resumeA._id });
      if (jobAnalysisA) await JobAnalysis.deleteMany({ _id: jobAnalysisA._id });
      await InterviewSession.deleteMany({
        $or: [{ userId: resumeA?.userId }, { interviewTitle: /Mock Interview/i }],
      });
    } catch (cleanupErr) {
      console.warn('Test cleanup notice:', cleanupErr.message);
    }

    await disconnectDB();
  });

  describe('1. Zod Validation & Deterministic Scoring Engine', () => {
    it('should validate valid interview input with default parameters', () => {
      const parsed = interviewInputSchema.parse({
        jobRole: 'Software Engineer',
      });

      assert.equal(parsed.jobRole, 'Software Engineer');
      assert.equal(parsed.experienceLevel, 'Mid-Level');
      assert.equal(parsed.category, 'Technical');
      assert.equal(parsed.difficulty, 'Medium');
      assert.equal(parsed.numberOfQuestions, 5);
      assert.equal(parsed.resumeId, null);
      assert.equal(parsed.jobAnalysisId, null);
    });

    it('should reject invalid question count not in [5, 10, 15]', () => {
      assert.throws(() => {
        interviewInputSchema.parse({
          jobRole: 'Software Engineer',
          numberOfQuestions: 7,
        });
      }, /Number of questions must be 5, 10, or 15/);
    });

    it('should reject malformed ObjectId strings for resumeId or jobAnalysisId', () => {
      assert.throws(() => {
        interviewInputSchema.parse({
          jobRole: 'Software Engineer',
          resumeId: 'not-a-valid-24-hex-id',
        });
      }, /Invalid Resume ID format/);
    });

    it('should correctly calculate deterministic answer composite score with weighted formula', () => {
      // 30% technicalAccuracy (100) + 25% relevance (80) + 20% completeness (90) + 15% clarity (70) + 10% communicationQuality (80)
      // = 30 + 20 + 18 + 10.5 + 8 = 86.5 -> 87
      const score = calculateAnswerCompositeScore({
        technicalAccuracy: 100,
        relevance: 80,
        completeness: 90,
        clarity: 70,
        communicationQuality: 80,
      });

      assert.equal(score, 87);
    });

    it('should correctly assign performance assessment labels', () => {
      assert.equal(determineFinalAssessmentLabel(92), 'Excellent');
      assert.equal(determineFinalAssessmentLabel(78), 'Strong');
      assert.equal(determineFinalAssessmentLabel(62), 'Good');
      assert.equal(determineFinalAssessmentLabel(45), 'Needs Improvement');
    });

    it('should validate submit answer schema with text trimming', () => {
      const parsed = submitAnswerInputSchema.parse({
        questionId: 'q_123',
        answerText: '  This is an articulate response exceeding minimum length.  ',
      });

      assert.equal(parsed.questionId, 'q_123');
      assert.equal(parsed.answerText, 'This is an articulate response exceeding minimum length.');
    });
  });

  describe('2. Authentication & Ownership Security Guards', () => {
    it('should reject unauthenticated request with HTTP 401', async () => {
      const res = await fetch(`${baseUrl}/api/v1/interviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobRole: 'DevOps Engineer' }),
      });

      assert.equal(res.status, 401);
      const data = await res.json();
      assert.equal(data.success, false);
      assert.equal(data.code, 'AUTH_TOKEN_MISSING');
    });

    it('should prevent cross-user resume referencing: User B cannot use User A resume', async () => {
      const res = await fetch(`${baseUrl}/api/v1/interviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenB}`,
        },
        body: JSON.stringify({
          jobRole: 'Full Stack Engineer',
          resumeId: resumeA._id.toString(),
        }),
      });

      assert.equal(res.status, 404);
      const data = await res.json();
      assert.equal(data.success, false);
      assert.match(data.message, /not found or does not belong to your account/i);
    });

    it('should prevent cross-user job analysis referencing: User B cannot use User A job analysis', async () => {
      const res = await fetch(`${baseUrl}/api/v1/interviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenB}`,
        },
        body: JSON.stringify({
          jobRole: 'Full Stack Engineer',
          jobAnalysisId: jobAnalysisA._id.toString(),
        }),
      });

      assert.equal(res.status, 404);
      const data = await res.json();
      assert.equal(data.success, false);
      assert.match(data.message, /not found or does not belong to your account/i);
    });

    it('should reject invalid session ObjectId with HTTP 400', async () => {
      const res = await fetch(`${baseUrl}/api/v1/interviews/invalid-session-id`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });

      assert.equal(res.status, 400);
      const data = await res.json();
      assert.equal(data.code, 'INVALID_ID_FORMAT');
    });
  });

  describe('3. AI Interview Engine: Question Generation & Persistence', () => {
    it('POST /api/v1/interviews creates session with live Gemini AI questions', async () => {
      const payload = {
        interviewTitle: 'Senior Full Stack Practice Interview',
        jobRole: 'Senior Full Stack Engineer',
        experienceLevel: 'Senior',
        category: 'Technical',
        difficulty: 'Hard',
        numberOfQuestions: 5,
        resumeId: resumeA._id.toString(),
        jobAnalysisId: jobAnalysisA._id.toString(),
        additionalInstructions: 'Focus on distributed system trade-offs and database tuning.',
      };

      const res = await fetch(`${baseUrl}/api/v1/interviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify(payload),
      });

      assert.equal(res.status, 201);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.ok(data.data._id);
      assert.equal(data.data.status, 'pending');
      assert.equal(data.data.jobRole, 'Senior Full Stack Engineer');
      assert.equal(data.data.questions.length, 5);

      // Verify each generated question structure
      const firstQ = data.data.questions[0];
      assert.ok(firstQ.questionId, 'Question must have questionId');
      assert.ok(firstQ.questionText.length > 10, 'Question text must have sufficient length');
      assert.ok(Array.isArray(firstQ.expectedAnswerPoints), 'Must contain expected key points');
      assert.ok(firstQ.expectedAnswerPoints.length >= 1, 'At least 1 expected key point');

      createdSessionId = data.data._id;
      firstQuestionId = firstQ.questionId;
    });

    it('POST /api/v1/interviews/:id/start begins the interview and transitions status to in_progress', async () => {
      const res = await fetch(`${baseUrl}/api/v1/interviews/${createdSessionId}/start`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenA}` },
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.equal(data.data.status, 'in_progress');
      assert.ok(data.data.startedAt, 'startedAt timestamp should be set');
    });
  });

  describe('4. AI Answer Submission, Evaluation & Progression', () => {
    it('POST /api/v1/interviews/:id/answer evaluates candidate response via Gemini AI', async () => {
      const answerPayload = {
        questionId: firstQuestionId,
        answerText: `
In Node.js and MongoDB high-scale architectures, I address performance bottlenecks by first profiling P95 and P99 latency using distributed tracing (OpenTelemetry).
For database optimization, I analyze execution plans via .explain("executionStats") to identify COLLSCAN operations and build compound indexes with proper equality, sort, and range (ESR) rule alignment.
At the application layer, I utilize Redis cluster caching with cache-aside and TTL-based invalidation for read-heavy entities. Furthermore, I implement worker threads or cluster mode to take advantage of multi-core CPU availability and mitigate Node.js single-threaded event loop saturation.
        `.trim(),
      };

      const res = await fetch(`${baseUrl}/api/v1/interviews/${createdSessionId}/answer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify(answerPayload),
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.equal(data.data.questionId, firstQuestionId);
      assert.ok(data.data.evaluation, 'Evaluation object must be returned');

      const evaluation = data.data.evaluation;
      const score = evaluation.overallScore ?? evaluation.score;
      assert.ok(typeof score === 'number');
      assert.ok(score >= 0 && score <= 100);
      assert.ok(
        (evaluation.categoryScores && evaluation.categoryScores.technicalAccuracy >= 0) ||
          evaluation.technicalAccuracy >= 0
      );
      assert.ok(Array.isArray(evaluation.correctPoints));
      assert.ok(Array.isArray(evaluation.strengths));
      assert.ok(Array.isArray(evaluation.suggestions));
      assert.ok((evaluation.exampleImprovedAnswer || evaluation.modelAnswer || '').length > 20);
    });

    it('should reject submitting answer to an alien question ID not in session', async () => {
      const res = await fetch(`${baseUrl}/api/v1/interviews/${createdSessionId}/answer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({
          questionId: 'alien_question_9999',
          answerText: 'Some random answer text for testing error handling.',
        }),
      });

      assert.equal(res.status, 400);
      const data = await res.json();
      assert.equal(data.code, 'QUESTION_NOT_FOUND');
    });

    it('prevent cross-user answering: User B cannot answer User A session', async () => {
      const res = await fetch(`${baseUrl}/api/v1/interviews/${createdSessionId}/answer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenB}`,
        },
        body: JSON.stringify({
          questionId: firstQuestionId,
          answerText: 'Unauthorized answer attempt.',
        }),
      });

      assert.equal(res.status, 404);
      const data = await res.json();
      assert.equal(data.code, 'RESOURCE_NOT_FOUND');
    });
  });

  describe('5. Final Evaluation Synthesis & Session Completion', () => {
    it('POST /api/v1/interviews/:id/complete generates comprehensive report and overall score', async () => {
      const res = await fetch(`${baseUrl}/api/v1/interviews/${createdSessionId}/complete`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenA}` },
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.equal(data.data.status, 'completed');
      assert.ok(data.data.completedAt);
      assert.ok(typeof data.data.overallScore === 'number');

      const finalEval = data.data.finalEvaluation;
      assert.ok(finalEval, 'Final evaluation must be populated');
      assert.ok(finalEval.technicalAssessment.length > 10);
      assert.ok(finalEval.communicationAssessment.length > 10);
      assert.ok(Array.isArray(finalEval.improvementRecommendations));
      assert.ok(Array.isArray(finalEval.suggestedTopics));
      assert.ok(['Excellent', 'Strong', 'Good', 'Needs Improvement'].includes(finalEval.finalAssessmentLabel));
      assert.match(finalEval.aiDisclaimer, /AI-generated evaluation/i);
    });

    it('prevent modifying completed session: answering after completion returns HTTP 400', async () => {
      const res = await fetch(`${baseUrl}/api/v1/interviews/${createdSessionId}/answer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({
          questionId: firstQuestionId,
          answerText: 'Attempting to modify answer after session completion.',
        }),
      });

      assert.equal(res.status, 400);
      const data = await res.json();
      assert.equal(data.code, 'SESSION_COMPLETED');
    });

    it('prevent restarting completed session: start endpoint returns HTTP 400', async () => {
      const res = await fetch(`${baseUrl}/api/v1/interviews/${createdSessionId}/start`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenA}` },
      });

      assert.equal(res.status, 400);
      const data = await res.json();
      assert.equal(data.code, 'SESSION_ALREADY_COMPLETED');
    });
  });

  describe('6. History, Details, Isolation & Deletion Endpoints', () => {
    it('GET /api/v1/interviews returns paginated user sessions with metadata', async () => {
      const res = await fetch(`${baseUrl}/api/v1/interviews?page=1&limit=5`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.ok(Array.isArray(data.data));
      assert.ok(data.data.length >= 1);
      assert.ok(data.pagination);
      assert.equal(data.pagination.page, 1);
    });

    it('GET /api/v1/interviews/history alias works identically', async () => {
      const res = await fetch(`${baseUrl}/api/v1/interviews/history`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.ok(Array.isArray(data.data));
    });

    it('GET /api/v1/interviews/:id retrieves single session with populated references', async () => {
      const res = await fetch(`${baseUrl}/api/v1/interviews/${createdSessionId}`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.equal(data.data._id, createdSessionId);
      assert.ok(data.data.resumeId);
      assert.equal(data.data.resumeId.originalFileName, 'Alpha_FullStack_Resume.pdf');
    });

    it('prevent cross-user retrieval: User B cannot retrieve User A session details', async () => {
      const res = await fetch(`${baseUrl}/api/v1/interviews/${createdSessionId}`, {
        headers: { Authorization: `Bearer ${tokenB}` },
      });

      assert.equal(res.status, 404);
      const data = await res.json();
      assert.equal(data.code, 'RESOURCE_NOT_FOUND');
    });

    it('prevent cross-user deletion: User B cannot delete User A session', async () => {
      const res = await fetch(`${baseUrl}/api/v1/interviews/${createdSessionId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${tokenB}` },
      });

      assert.equal(res.status, 404);
      const data = await res.json();
      assert.equal(data.code, 'RESOURCE_NOT_FOUND');
    });

    it('DELETE /api/v1/interviews/:id deletes session and verifies removal', async () => {
      const res = await fetch(`${baseUrl}/api/v1/interviews/${createdSessionId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${tokenA}` },
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);

      // Verify removal
      const checkRes = await fetch(`${baseUrl}/api/v1/interviews/${createdSessionId}`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      assert.equal(checkRes.status, 404);
    });
  });
});
