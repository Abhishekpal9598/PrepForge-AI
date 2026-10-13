import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { config } from '../src/config/env.js';
import {
  User,
  Resume,
  ResumeAnalysis,
  JobAnalysis,
  InterviewSession,
  Application,
} from '../src/models/index.js';

describe('Suite 4: CRUD Integration & Index Verification (Isolated Test DB)', () => {
  const testUri = process.env.TEST_MONGODB_URI || config.testMongoUri;
  const testRunId = Date.now();
  const testEmail = `test.user.${testRunId}@example.com`;

  let createdUser = null;
  let createdResume = null;
  let createdAnalysis = null;
  let createdJobAnalysis = null;
  let createdSession = null;
  let createdApplication = null;

  before(async () => {
    // Assert safety: never run against main database
    assert.ok(testUri, 'TEST_MONGODB_URI is required for CRUD tests');
    assert.notEqual(
      testUri,
      config.mongoUri,
      'Safety check failed: Refusing to run integration CRUD tests against primary database'
    );

    await connectDB(testUri);
    // Ensure indexes are built in test database
    await Promise.all([
      User.init(),
      Resume.init(),
      ResumeAnalysis.init(),
      JobAnalysis.init(),
      InterviewSession.init(),
      Application.init(),
    ]);
  });

  after(async () => {
    // Isolated teardown: clean up only records created in this test run
    if (createdUser?._id) {
      await Promise.all([
        User.deleteOne({ _id: createdUser._id }),
        Resume.deleteMany({ userId: createdUser._id }),
        ResumeAnalysis.deleteMany({ userId: createdUser._id }),
        JobAnalysis.deleteMany({ userId: createdUser._id }),
        InterviewSession.deleteMany({ userId: createdUser._id }),
        Application.deleteMany({ userId: createdUser._id }),
      ]);
    }
    await disconnectDB();
  });

  it('should create a User document and enforce case-insensitive unique email index', async () => {
    // 1. Create first user
    createdUser = await User.create({
      email: testEmail,
      passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234',
      fullName: 'Integration Test User',
      targetRole: 'Full Stack Engineer',
      careerLevel: 'Mid',
    });

    assert.ok(createdUser._id, 'User should be created with an _id');
    assert.equal(createdUser.email, testEmail.toLowerCase());

    // 2. Attempt creating duplicate user with different casing
    const uppercaseEmail = testEmail.toUpperCase();
    await assert.rejects(
      async () => {
        await User.create({
          email: uppercaseEmail,
          passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234',
          fullName: 'Duplicate User Attempt',
        });
      },
      (err) => {
        // Should throw MongoDB duplicate key error (code 11000)
        assert.equal(err.code, 11000, 'Expected duplicate key error code 11000');
        return true;
      }
    );
  });

  it('should create and retrieve a Resume document referencing the User', async () => {
    createdResume = await Resume.create({
      userId: createdUser._id,
      originalFileName: 'john_doe_resume.pdf',
      fileFormat: 'pdf',
      fileSize: 154200,
      rawText: 'Experienced Node.js and React Developer with cloud deployment skills in AWS.',
      parsedSections: { experience: true, skills: true },
    });

    assert.ok(createdResume._id);
    assert.equal(createdResume.userId.toString(), createdUser._id.toString());

    // Retrieve via compound index { userId: 1, createdAt: -1 }
    const fetched = await Resume.findOne({ userId: createdUser._id }).sort({ createdAt: -1 });
    assert.equal(fetched._id.toString(), createdResume._id.toString());
  });

  it('should create and retrieve a ResumeAnalysis document', async () => {
    createdAnalysis = await ResumeAnalysis.create({
      userId: createdUser._id,
      resumeId: createdResume._id,
      overallScore: 82,
      categoryScores: {
        impact: 75,
        brevity: 85,
        style: 80,
        skills: 85,
        atsReadability: 90,
      },
      summaryFeedback: 'Strong candidate profile with measurable impact across projects.',
      bulletImprovements: [
        {
          original: 'Developed web applications.',
          issue: 'Lacks metrics.',
          rewrite: 'Developed high-scale web applications serving 50k DAU.',
          impact: 'Highlights scale and throughput.',
        },
      ],
      strengths: ['Modern tech stack'],
      weaknesses: ['Add testing metrics'],
      identifiedSkills: {
        technical: ['React', 'Node.js'],
        soft: ['Team leadership'],
        tools: ['Git', 'Docker'],
      },
    });

    assert.ok(createdAnalysis._id);
    assert.equal(createdAnalysis.overallScore, 82);
    assert.equal(createdAnalysis.bulletImprovements.length, 1);
  });

  it('should create and retrieve a JobAnalysis document', async () => {
    createdJobAnalysis = await JobAnalysis.create({
      userId: createdUser._id,
      resumeId: createdResume._id,
      jobTitle: 'Senior Full Stack Developer',
      company: 'TechCorp',
      jobDescription:
        'Looking for a Senior Developer with 5+ years building full stack web applications using React, Express, and MongoDB in high-growth environments.',
      matchScore: 84,
      matchedSkills: ['React', 'Express', 'MongoDB'],
      missingSkills: ['Kubernetes'],
      tailoringRecommendations: ['Emphasize container orchestration experience'],
    });

    assert.ok(createdJobAnalysis._id);
    assert.equal(createdJobAnalysis.matchScore, 84);
  });

  it('should create an InterviewSession with optional resumeId as null', async () => {
    createdSession = await InterviewSession.create({
      userId: createdUser._id,
      resumeId: null, // Role-based standalone practice session
      jobTitle: 'Backend Architect',
      questions: [
        {
          questionText: 'Explain database indexing strategies in MongoDB.',
          category: 'Technical',
          difficulty: 'Senior',
          sampleKeyPoints: ['B-tree indexing', 'Compound index prefix rules'],
        },
      ],
    });

    assert.ok(createdSession._id);
    assert.equal(createdSession.resumeId, null);
    assert.equal(createdSession.questions.length, 1);
  });

  it('should create and update an Application document', async () => {
    createdApplication = await Application.create({
      userId: createdUser._id,
      resumeId: createdResume._id,
      jobAnalysisId: createdJobAnalysis._id,
      companyName: 'TechCorp',
      positionTitle: 'Senior Full Stack Developer',
      status: 'Saved',
      salaryExpectation: 135000,
    });

    assert.ok(createdApplication._id);
    assert.equal(createdApplication.status, 'Saved');

    // Update status to Interviewing
    createdApplication.status = 'Interviewing';
    createdApplication.interviewDate = new Date();
    await createdApplication.save();

    const updated = await Application.findById(createdApplication._id);
    assert.equal(updated.status, 'Interviewing');
    assert.ok(updated.interviewDate);
  });
});
