import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { config } from '../src/config/env.js';
import { User } from '../src/models/User.js';
import { Resume } from '../src/models/Resume.js';
import { ResumeAnalysis } from '../src/models/ResumeAnalysis.js';
import { JobAnalysis } from '../src/models/JobAnalysis.js';
import { InterviewSession } from '../src/models/InterviewSession.js';
import { Application } from '../src/models/Application.js';

describe('Suite: Dashboard Analytics & Real-Time Performance Metrics (Phase 6)', () => {
  let server = null;
  let baseUrl = '';
  const testUri = process.env.TEST_MONGODB_URI || config.testMongoUri;

  const userA = {
    fullName: 'Analytics User Alpha',
    email: `alpha-dash-${Date.now()}@prepforge.local`,
    password: 'SecurePassword123!',
    targetRole: 'Staff Infrastructure Architect',
  };

  const userB = {
    fullName: 'Analytics User Beta',
    email: `beta-dash-${Date.now()}@prepforge.local`,
    password: 'SecurePassword123!',
    targetRole: 'Junior Frontend Developer',
  };

  let tokenA = '';
  let tokenB = '';
  let userDocA = null;
  let userDocB = null;

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
    tokenA = dataA.token || dataA.data?.token;
    userDocA = dataA.user || dataA.data?.user;

    // 2. Register User B
    const resB = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userB),
    });
    const dataB = await resB.json();
    tokenB = dataB.token || dataB.data?.token;
    userDocB = dataB.user || dataB.data?.user;

    const uAId = userDocA.id || userDocA._id;

    // 3. Seed User A Resumes
    const resumeA1 = await Resume.create({
      userId: uAId,
      originalFileName: 'Alpha_Staff_Resume_v1.pdf',
      storedFileName: 'stored_alpha_v1.pdf',
      fileFormat: 'pdf',
      fileSize: 1024 * 40,
      mimeType: 'application/pdf',
      rawText: 'Staff Systems Architect with 10+ years experience in distributed storage and consensus protocols.',
      extractedText: 'Staff Systems Architect with 10+ years experience in distributed storage and consensus protocols.',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10),
    });

    const resumeA2 = await Resume.create({
      userId: uAId,
      originalFileName: 'Alpha_Staff_Resume_v2.pdf',
      storedFileName: 'stored_alpha_v2.pdf',
      fileFormat: 'pdf',
      fileSize: 1024 * 45,
      mimeType: 'application/pdf',
      rawText: 'Staff Systems Architect with refined quantifiable impact metrics and cloud cost optimizations.',
      extractedText: 'Staff Systems Architect with refined quantifiable impact metrics and cloud cost optimizations.',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
    });

    // 4. Seed User A ATS Analyses
    await ResumeAnalysis.create([
      {
        userId: uAId,
        resumeId: resumeA1._id,
        targetRole: 'Infrastructure Architect',
        overallScore: 78,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 9),
      },
      {
        userId: uAId,
        resumeId: resumeA2._id,
        targetRole: 'Staff Infrastructure Architect',
        overallScore: 88,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4),
      },
    ]);

    // 5. Seed User A Job Matches
    await JobAnalysis.create([
      {
        userId: uAId,
        resumeId: resumeA2._id,
        companyName: 'Stripe',
        jobTitle: 'Staff Distributed Systems Engineer',
        jobDescription: 'Architecting high availability global ledger payment processing systems across multi-region AWS.',
        matchScore: 92,
        matchedSkills: ['Distributed Systems', 'Go', 'AWS'],
        missingSkills: ['Rust'],
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
      },
      {
        userId: uAId,
        resumeId: resumeA2._id,
        companyName: 'Datadog',
        jobTitle: 'Principal Platform Architect',
        jobDescription: 'Designing petabyte-scale telemetry ingestion pipelines and distributed query optimizations.',
        matchScore: 86,
        matchedSkills: ['Kubernetes', 'Distributed Systems'],
        missingSkills: ['Kafka'],
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
      },
    ]);

    // 6. Seed User A Mock Interviews
    await InterviewSession.create([
      {
        userId: uAId,
        resumeId: resumeA2._id,
        jobRole: 'Staff Infrastructure Engineer',
        jobTitle: 'Staff Infrastructure Engineer',
        category: 'Technical',
        difficulty: 'Hard',
        status: 'completed',
        overallScore: 82,
        questions: [
          {
            questionId: 'q1',
            questionText: 'Explain Paxos vs Raft consensus trade-offs.',
            userAnswer: 'Raft divides consensus into leader election, log replication and safety.',
          },
        ],
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
        completedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
      },
      {
        userId: uAId,
        resumeId: resumeA2._id,
        jobRole: 'Staff Infrastructure Engineer',
        jobTitle: 'Staff Infrastructure Engineer',
        category: 'Role-Based',
        difficulty: 'Hard',
        status: 'completed',
        overallScore: 90,
        questions: [
          {
            questionId: 'q2',
            questionText: 'Design a distributed rate limiter for 10 million requests per second.',
            userAnswer: 'Token bucket with Redis cluster and local in-memory sliding window caching.',
          },
        ],
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1),
        completedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1),
      },
      {
        userId: uAId,
        resumeId: null,
        jobRole: 'Engineering Manager',
        jobTitle: 'Engineering Manager',
        category: 'Behavioral',
        difficulty: 'Medium',
        status: 'in_progress',
        overallScore: null,
        questions: [{ questionId: 'q3', questionText: 'Describe a conflict resolution experience.' }],
        createdAt: new Date(),
      },
    ]);

    // 7. Seed User A Applications
    await Application.create([
      {
        userId: uAId,
        companyName: 'Stripe',
        jobTitle: 'Staff Infrastructure Engineer',
        status: 'Interview',
        applicationDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14),
      },
      {
        userId: uAId,
        companyName: 'Datadog',
        jobTitle: 'Principal Platform Architect',
        status: 'Offer',
        applicationDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 20),
      },
      {
        userId: uAId,
        companyName: 'Cloudflare',
        jobTitle: 'Senior Systems Engineer',
        status: 'Applied',
        applicationDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
      },
      {
        userId: uAId,
        companyName: 'Google',
        jobTitle: 'Site Reliability Architect',
        status: 'Rejected',
        applicationDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30),
      },
      {
        userId: uAId,
        companyName: 'Airbnb',
        jobTitle: 'Cloud Architect',
        status: 'Saved',
        applicationDate: new Date(),
      },
    ]);
  });

  after(async () => {
    if (userDocA) {
      const uAId = userDocA.id || userDocA._id;
      await Application.deleteMany({ userId: uAId });
      await InterviewSession.deleteMany({ userId: uAId });
      await JobAnalysis.deleteMany({ userId: uAId });
      await ResumeAnalysis.deleteMany({ userId: uAId });
      await Resume.deleteMany({ userId: uAId });
      await User.deleteOne({ _id: uAId });
    }
    if (userDocB) {
      const uBId = userDocB.id || userDocB._id;
      await Application.deleteMany({ userId: uBId });
      await InterviewSession.deleteMany({ userId: uBId });
      await JobAnalysis.deleteMany({ userId: uBId });
      await ResumeAnalysis.deleteMany({ userId: uBId });
      await Resume.deleteMany({ userId: uBId });
      await User.deleteOne({ _id: uBId });
    }

    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await disconnectDB();
  });

  describe('1. Authentication & Security Guards', () => {
    it('should reject unauthenticated request with HTTP 401', async () => {
      const res = await fetch(`${baseUrl}/api/v1/dashboard/analytics`);
      assert.equal(res.status, 401);
      const data = await res.json();
      assert.equal(data.success, false);
      assert.equal(data.code, 'AUTH_TOKEN_MISSING');
    });

    it('compatibility route /api/dashboard/analytics works identically', async () => {
      const res = await fetch(`${baseUrl}/api/dashboard/analytics`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.ok(data.data.summary);
    });
  });

  describe('2. Empty State Handling (User B with 0 records)', () => {
    it('returns zeroes, null averages, and empty arrays without crashing', async () => {
      const res = await fetch(`${baseUrl}/api/v1/dashboard/analytics`, {
        headers: { Authorization: `Bearer ${tokenB}` },
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);

      const d = data.data;

      // Summary
      assert.equal(d.summary.totalResumes, 0);
      assert.equal(d.summary.averageAtsScore, null);
      assert.equal(d.summary.totalJobMatches, 0);
      assert.equal(d.summary.averageInterviewScore, null);
      assert.equal(d.summary.totalApplications, 0);
      assert.equal(d.summary.interviewConversionRate, 0);

      // Section counts
      assert.equal(d.resumes.totalUploaded, 0);
      assert.equal(d.resumes.totalAnalyses, 0);
      assert.equal(d.jobMatches.totalMatches, 0);
      assert.equal(d.interviews.totalInterviews, 0);
      assert.equal(d.applications.totalApplications, 0);

      // Trends & Activity
      assert.equal(d.trends.hasEnoughTrendData, false);
      assert.equal(d.trends.atsScoreTrend.length, 0);
      assert.equal(d.trends.jobMatchTrend.length, 0);
      assert.equal(d.trends.interviewScoreTrend.length, 0);
      assert.equal(d.recentActivity.length, 0);
    });
  });

  describe('3. Populated Metrics & Conversion Calculations (User A)', () => {
    let analytics = null;

    before(async () => {
      const res = await fetch(`${baseUrl}/api/v1/dashboard/analytics`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      assert.equal(res.status, 200);
      const json = await res.json();
      analytics = json.data;
    });

    it('calculates accurate Resume and ATS metrics', () => {
      const r = analytics.resumes;
      assert.equal(r.totalUploaded, 2, 'Must count 2 uploaded resumes');
      assert.equal(r.totalAnalyses, 2, 'Must count 2 ATS analyses');
      assert.equal(r.latestAtsScore, 88, 'Latest ATS score must be 88');
      assert.equal(r.highestAtsScore, 88, 'Highest ATS score must be 88');
      assert.equal(r.averageAtsScore, 83, 'Average ATS score must be round((78+88)/2) = 83');
    });

    it('calculates accurate Job Match metrics', () => {
      const j = analytics.jobMatches;
      assert.equal(j.totalMatches, 2, 'Must count 2 job matches');
      assert.equal(j.highestMatchScore, 92, 'Highest match score must be 92');
      assert.equal(j.averageMatchScore, 89, 'Average match score must be round((92+86)/2) = 89');
    });

    it('calculates accurate Interview Session metrics', () => {
      const i = analytics.interviews;
      assert.equal(i.totalInterviews, 3, 'Must count 3 total interviews');
      assert.equal(i.completedInterviews, 2, 'Must count 2 completed interviews');
      assert.equal(i.inProgressInterviews, 1, 'Must count 1 in-progress interview');
      assert.equal(i.highestInterviewScore, 90, 'Highest interview score must be 90');
      assert.equal(i.averageInterviewScore, 86, 'Average completed interview score must be round((82+90)/2) = 86');
    });

    it('calculates accurate Application Pipeline & Conversion metrics', () => {
      const a = analytics.applications;
      assert.equal(a.totalApplications, 5, 'Total applications must be 5');
      assert.equal(a.interview, 1);
      assert.equal(a.offer, 1);
      assert.equal(a.applied, 1);
      assert.equal(a.rejected, 1);
      assert.equal(a.saved, 1);

      // Total submitted = interview(1) + offer(1) + applied(1) + rejected(1) = 4
      assert.equal(a.totalSubmitted, 4);

      // Interview conversion rate: (interview(1) + offer(1)) / 4 = 50%
      assert.equal(a.interviewConversionRate, 50);

      // Offer conversion rate: offer(1) / (interview(1) + offer(1)) = 50%
      assert.equal(a.offerConversionRate, 50);

      // Status distribution array has 7 categories
      assert.equal(a.statusDistribution.length, 7);
    });

    it('verifies summary KPI cards match section calculations', () => {
      const s = analytics.summary;
      assert.equal(s.totalResumes, 2);
      assert.equal(s.averageAtsScore, 83);
      assert.equal(s.totalJobMatches, 2);
      assert.equal(s.averageInterviewScore, 86);
      assert.equal(s.totalApplications, 5);
      assert.equal(s.interviewConversionRate, 50);
    });
  });

  describe('4. Performance Trends Progression', () => {
    it('generates chronological trend series with real scores and timestamps', async () => {
      const res = await fetch(`${baseUrl}/api/v1/dashboard/analytics`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      const data = await res.json();
      const trends = data.data.trends;

      assert.equal(trends.hasEnoughTrendData, true);

      // ATS score trend
      assert.ok(trends.atsScoreTrend.length >= 2);
      assert.equal(trends.atsScoreTrend[0].score, 78);
      assert.equal(trends.atsScoreTrend[1].score, 88);

      // Interview performance trend
      assert.ok(trends.interviewScoreTrend.length >= 2);
      assert.equal(trends.interviewScoreTrend[0].score, 82);
      assert.equal(trends.interviewScoreTrend[1].score, 90);
    });
  });

  describe('5. Unified Recent Activity Feed', () => {
    it('aggregates activities across all 5 models and orders by newest first', async () => {
      const res = await fetch(`${baseUrl}/api/v1/dashboard/analytics`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      const data = await res.json();
      const activities = data.data.recentActivity;

      assert.ok(Array.isArray(activities));
      assert.ok(activities.length >= 5, 'Must contain merged activity items');
      assert.ok(activities.length <= 10, 'Must be bounded by limit');

      // Verify activity items contain required properties
      activities.forEach((act) => {
        assert.ok(act.type, 'Activity must have type');
        assert.ok(act.title, 'Activity must have title');
        assert.ok(act.date, 'Activity must have date');
        assert.ok(act.recordId, 'Activity must reference recordId');
        assert.ok(act.link, 'Activity must have navigation link');
      });

      // Verify sorted by newest date first
      for (let i = 0; i < activities.length - 1; i++) {
        const d1 = new Date(activities[i].date).getTime();
        const d2 = new Date(activities[i + 1].date).getTime();
        assert.ok(d1 >= d2, `Activity at index ${i} (${d1}) must be >= index ${i + 1} (${d2})`);
      }
    });

    it('enforces strict data isolation: User B never sees User A activities', async () => {
      const res = await fetch(`${baseUrl}/api/v1/dashboard/analytics`, {
        headers: { Authorization: `Bearer ${tokenB}` },
      });
      const data = await res.json();
      assert.equal(data.data.recentActivity.length, 0);
    });
  });
});
