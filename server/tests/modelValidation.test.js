import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import {
  User,
  Resume,
  ResumeAnalysis,
  JobAnalysis,
  InterviewSession,
  Application,
} from '../src/models/index.js';

describe('Suite 2: Model Validation & Schema Rules (In-Memory)', () => {
  const dummyUserId = new mongoose.Types.ObjectId();
  const dummyResumeId = new mongoose.Types.ObjectId();

  describe('User Model Validation', () => {
    it('should validate a complete and valid User document', async () => {
      const user = new User({
        email: 'Priya.Sharma@example.com',
        passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234',
        fullName: 'Priya Sharma',
        targetRole: 'Full Stack Engineer',
        careerLevel: 'Mid',
      });

      await user.validate();
      assert.equal(user.email, 'priya.sharma@example.com', 'Email should be lowercased');
    });

    it('should fail validation when required User fields are missing', async () => {
      const user = new User({});
      await assert.rejects(
        () => user.validate(),
        (err) => {
          assert.ok(err.errors.email, 'email should be required');
          assert.ok(err.errors.passwordHash, 'passwordHash should be required');
          assert.ok(err.errors.fullName, 'fullName should be required');
          return true;
        }
      );
    });

    it('should fail validation on invalid email format', async () => {
      const user = new User({
        email: 'not-an-email',
        passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234',
        fullName: 'Test User',
      });
      await assert.rejects(
        () => user.validate(),
        (err) => {
          assert.ok(err.errors.email, 'Invalid email should fail validation');
          return true;
        }
      );
    });

    it('should fail validation on invalid careerLevel enum', async () => {
      const user = new User({
        email: 'valid@example.com',
        passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234',
        fullName: 'Test User',
        careerLevel: 'SuperSenior',
      });
      await assert.rejects(
        () => user.validate(),
        (err) => {
          assert.ok(err.errors.careerLevel, 'Invalid careerLevel enum should fail validation');
          return true;
        }
      );
    });
  });

  describe('Resume Model Validation', () => {
    it('should validate a complete and valid Resume document', async () => {
      const resume = new Resume({
        userId: dummyUserId,
        originalFileName: 'resume.pdf',
        fileFormat: 'pdf',
        fileSize: 102400,
        rawText: 'Experienced Software Engineer with proficiency in JavaScript, React, and Node.js.',
      });

      await resume.validate();
    });

    it('should fail validation on unsupported fileFormat enum', async () => {
      const resume = new Resume({
        userId: dummyUserId,
        originalFileName: 'resume.exe',
        fileFormat: 'exe',
        fileSize: 102400,
        rawText: 'Valid text content over 20 characters long.',
      });
      await assert.rejects(
        () => resume.validate(),
        (err) => {
          assert.ok(err.errors.fileFormat, 'Unsupported file format must fail validation');
          return true;
        }
      );
    });

    it('should fail validation when fileSize exceeds 5MB limit', async () => {
      const resume = new Resume({
        userId: dummyUserId,
        originalFileName: 'large.pdf',
        fileFormat: 'pdf',
        fileSize: 6000000, // > 5,242,880
        rawText: 'Valid text content over 20 characters long.',
      });
      await assert.rejects(
        () => resume.validate(),
        (err) => {
          assert.ok(err.errors.fileSize, 'File size > 5MB must fail validation');
          return true;
        }
      );
    });

    it('should fail validation when rawText is under 20 characters', async () => {
      const resume = new Resume({
        userId: dummyUserId,
        originalFileName: 'short.pdf',
        fileFormat: 'pdf',
        fileSize: 1000,
        rawText: 'Too short',
      });
      await assert.rejects(
        () => resume.validate(),
        (err) => {
          assert.ok(err.errors.rawText, 'rawText < 20 chars must fail validation');
          return true;
        }
      );
    });
  });

  describe('ResumeAnalysis Model Validation', () => {
    it('should validate a complete and valid ResumeAnalysis document', async () => {
      const analysis = new ResumeAnalysis({
        userId: dummyUserId,
        resumeId: dummyResumeId,
        overallScore: 85,
        categoryScores: {
          impact: 80,
          brevity: 90,
          style: 85,
          skills: 88,
          atsReadability: 92,
        },
        summaryFeedback: 'Excellent technical resume with strong action verbs and clear structure.',
        strengths: ['Modern tech stack', 'Quantified achievements'],
        weaknesses: ['Add more leadership details'],
      });

      await analysis.validate();
    });

    it('should fail validation when scores exceed 100 or are negative', async () => {
      const analysis = new ResumeAnalysis({
        userId: dummyUserId,
        resumeId: dummyResumeId,
        overallScore: 110, // > 100
        categoryScores: {
          impact: -5, // < 0
          brevity: 90,
          style: 85,
          skills: 88,
          atsReadability: 92,
        },
        summaryFeedback: 'Valid summary feedback exceeding minimum length.',
      });
      await assert.rejects(
        () => analysis.validate(),
        (err) => {
          assert.ok(err.errors.overallScore, 'Overall score > 100 must fail');
          assert.ok(err.errors['categoryScores.impact'], 'Negative category score must fail');
          return true;
        }
      );
    });
  });

  describe('JobAnalysis Model Validation', () => {
    it('should validate a complete and valid JobAnalysis document', async () => {
      const jobAnalysis = new JobAnalysis({
        userId: dummyUserId,
        resumeId: dummyResumeId,
        jobTitle: 'Senior Full Stack Engineer',
        company: 'Stripe',
        jobDescription: 'Seeking an experienced engineer proficient in Node.js, React, distributed systems, and cloud infrastructure with 5+ years experience.',
        matchScore: 78,
        matchedSkills: ['Node.js', 'React'],
        missingSkills: ['Kubernetes'],
      });

      await jobAnalysis.validate();
    });

    it('should fail validation when jobDescription is under 50 characters', async () => {
      const jobAnalysis = new JobAnalysis({
        userId: dummyUserId,
        resumeId: dummyResumeId,
        jobTitle: 'Engineer',
        jobDescription: 'Short description.', // < 50
        matchScore: 50,
      });
      await assert.rejects(
        () => jobAnalysis.validate(),
        (err) => {
          assert.ok(err.errors.jobDescription, 'Job description < 50 chars must fail');
          return true;
        }
      );
    });
  });

  describe('InterviewSession Model Validation', () => {
    it('should validate a standalone InterviewSession with resumeId as null (role-based practice)', async () => {
      const session = new InterviewSession({
        userId: dummyUserId,
        resumeId: null, // Explicitly null: standalone interview
        jobTitle: 'Cloud Architect',
        questions: [
          {
            questionText: 'How do you design a highly available multi-region architecture on AWS?',
            category: 'Technical',
            difficulty: 'Senior',
            sampleKeyPoints: ['Route 53 latency routing', 'Active-Active DB replication'],
          },
        ],
      });

      await session.validate();
      assert.equal(session.resumeId, null);
    });

    it('should fail validation on invalid question category or difficulty enum', async () => {
      const session = new InterviewSession({
        userId: dummyUserId,
        jobTitle: 'Developer',
        questions: [
          {
            questionText: 'Tell me about yourself',
            category: 'InvalidCategory',
            difficulty: 'UltraSenior',
          },
        ],
      });

      await assert.rejects(
        () => session.validate(),
        (err) => {
          assert.ok(err.errors['questions.0.category'], 'Invalid category must fail');
          assert.ok(err.errors['questions.0.difficulty'], 'Invalid difficulty must fail');
          return true;
        }
      );
    });
  });

  describe('Application Model Validation', () => {
    it('should validate an Application document with defaults applied', async () => {
      const app = new Application({
        userId: dummyUserId,
        companyName: 'Acme Corp',
        positionTitle: 'Frontend Engineer',
      });

      await app.validate();
      assert.equal(app.status, 'Saved', 'Default status should be Saved');
      assert.equal(app.resumeId, null);
      assert.equal(app.jobAnalysisId, null);
    });

    it('should fail validation on invalid application status enum', async () => {
      const app = new Application({
        userId: dummyUserId,
        companyName: 'Acme Corp',
        positionTitle: 'Frontend Engineer',
        status: 'Hired_Unknown',
      });

      await assert.rejects(
        () => app.validate(),
        (err) => {
          assert.ok(err.errors.status, 'Invalid application status must fail');
          return true;
        }
      );
    });

    it('should fail validation on negative salaryExpectation', async () => {
      const app = new Application({
        userId: dummyUserId,
        companyName: 'Acme Corp',
        positionTitle: 'Frontend Engineer',
        salaryExpectation: -1000,
      });

      await assert.rejects(
        () => app.validate(),
        (err) => {
          assert.ok(err.errors.salaryExpectation, 'Negative salary expectation must fail');
          return true;
        }
      );
    });
  });
});
