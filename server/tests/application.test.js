import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { config } from '../src/config/env.js';
import { User } from '../src/models/User.js';
import { Resume } from '../src/models/Resume.js';
import { JobAnalysis } from '../src/models/JobAnalysis.js';
import { Application } from '../src/models/Application.js';
import {
  createApplicationSchema,
  updateApplicationSchema,
  queryApplicationSchema,
} from '../src/validators/applicationValidators.js';

describe('Suite: Job Application Tracker (Phase 5)', () => {
  let server = null;
  let baseUrl = '';
  const testUri = process.env.TEST_MONGODB_URI || config.testMongoUri;

  const userA = {
    fullName: 'Application Candidate Alpha',
    email: `alpha-app-${Date.now()}@tracker.local`,
    password: 'SecurePassword123!',
    targetRole: 'Senior Backend Engineer',
  };

  const userB = {
    fullName: 'Application Candidate Beta',
    email: `beta-app-${Date.now()}@tracker.local`,
    password: 'SecurePassword123!',
    targetRole: 'Junior Frontend Developer',
  };

  let tokenA = '';
  let tokenB = '';
  let userDocA = null;
  let userDocB = null;
  let resumeA = null;
  let jobAnalysisA = null;
  let createdApplicationId = '';

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

    // 3. Seed User A's Resume
    resumeA = await Resume.create({
      userId: userDocA.id || userDocA._id,
      originalFileName: 'Alpha_Backend_Resume.pdf',
      storedFileName: 'stored_alpha_resume.pdf',
      fileFormat: 'pdf',
      fileSize: 1024 * 50,
      mimeType: 'application/pdf',
      rawText: 'Senior Backend Engineer specializing in Node.js, distributed databases, high throughput caching, and AWS cloud infrastructure.',
      extractedText: 'Senior Backend Engineer specializing in Node.js, distributed databases, high throughput caching, and AWS cloud infrastructure.',
    });

    // 4. Seed User A's JobAnalysis
    jobAnalysisA = await JobAnalysis.create({
      userId: userDocA.id || userDocA._id,
      resumeId: resumeA._id,
      jobTitle: 'Staff Infrastructure Engineer',
      companyName: 'Stripe',
      jobDescription: 'Leading distributed ledger architecture, fault-tolerant consensus systems, and high concurrency payment rails across multi-region deployments.',
      matchScore: 92,
      matchedSkills: ['Node.js', 'Distributed Systems', 'AWS', 'PostgreSQL'],
      missingSkills: ['Rust'],
    });
  });

  after(async () => {
    if (userDocA) {
      const uAId = userDocA.id || userDocA._id;
      await Application.deleteMany({ userId: uAId });
      await JobAnalysis.deleteMany({ userId: uAId });
      await Resume.deleteMany({ userId: uAId });
      await User.deleteOne({ _id: uAId });
    }
    if (userDocB) {
      const uBId = userDocB.id || userDocB._id;
      await Application.deleteMany({ userId: uBId });
      await User.deleteOne({ _id: uBId });
    }

    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await disconnectDB();
  });

  describe('1. Zod Validation & Schema Rules', () => {
    it('should validate valid application payload with default status and type', () => {
      const input = {
        companyName: 'Datadog',
        jobTitle: 'Staff Backend Engineer',
      };
      const parsed = createApplicationSchema.parse(input);
      assert.equal(parsed.companyName, 'Datadog');
      assert.equal(parsed.jobTitle, 'Staff Backend Engineer');
      assert.equal(parsed.status, 'Saved');
      assert.equal(parsed.employmentType, 'Full-time');
      assert.equal(parsed.location, 'Remote');
    });

    it('should accept positionTitle as alias for jobTitle', () => {
      const input = {
        companyName: 'Airbnb',
        positionTitle: 'Senior Platform Engineer',
      };
      const parsed = createApplicationSchema.parse(input);
      assert.equal(parsed.companyName, 'Airbnb');
      assert.equal(parsed.positionTitle, 'Senior Platform Engineer');
    });

    it('should reject application without both jobTitle and positionTitle', () => {
      const input = {
        companyName: 'Google',
      };
      assert.throws(() => createApplicationSchema.parse(input));
    });

    it('should reject empty company name', () => {
      const input = {
        companyName: '   ',
        jobTitle: 'Engineer',
      };
      assert.throws(() => createApplicationSchema.parse(input));
    });

    it('should reject invalid application status enum', () => {
      const input = {
        companyName: 'Meta',
        jobTitle: 'Production Engineer',
        status: 'Invited_Unknown',
      };
      assert.throws(() => createApplicationSchema.parse(input));
    });

    it('should validate safe job URL and reject invalid protocols or strings', () => {
      const validPayload = {
        companyName: 'Netflix',
        jobTitle: 'Systems Engineer',
        jobUrl: 'https://jobs.netflix.com/position/12345',
      };
      assert.doesNotThrow(() => createApplicationSchema.parse(validPayload));

      const invalidPayload = {
        companyName: 'Netflix',
        jobTitle: 'Systems Engineer',
        jobUrl: 'not-a-valid-url-format',
      };
      assert.throws(() => createApplicationSchema.parse(invalidPayload));
    });

    it('should reject negative salaryExpectation', () => {
      const input = {
        companyName: 'Apple',
        jobTitle: 'iOS Engineer',
        salaryExpectation: -50000,
      };
      assert.throws(() => createApplicationSchema.parse(input));
    });
  });

  describe('2. Authentication & Ownership Security Guards', () => {
    it('should reject unauthenticated request with HTTP 401', async () => {
      const res = await fetch(`${baseUrl}/api/v1/applications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: 'Stripe',
          jobTitle: 'Staff Backend Engineer',
        }),
      });

      assert.equal(res.status, 401);
      const data = await res.json();
      assert.equal(data.success, false);
      assert.equal(data.code, 'AUTH_TOKEN_MISSING');
    });

    it('should reject invalid application ObjectId with HTTP 400', async () => {
      const res = await fetch(`${baseUrl}/api/v1/applications/invalid-object-id`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });

      assert.equal(res.status, 400);
      const data = await res.json();
      assert.equal(data.code, 'INVALID_ID_FORMAT');
    });

    it('should prevent cross-user resume referencing: User B cannot link User A resume', async () => {
      const res = await fetch(`${baseUrl}/api/v1/applications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenB}`,
        },
        body: JSON.stringify({
          companyName: 'Cloudflare',
          jobTitle: 'Systems Engineer',
          resumeId: resumeA._id.toString(),
        }),
      });

      assert.equal(res.status, 404);
      const data = await res.json();
      assert.equal(data.code, 'RESUME_NOT_FOUND');
    });

    it('should prevent cross-user job analysis referencing: User B cannot link User A job analysis', async () => {
      const res = await fetch(`${baseUrl}/api/v1/applications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenB}`,
        },
        body: JSON.stringify({
          companyName: 'Cloudflare',
          jobTitle: 'Systems Engineer',
          jobAnalysisId: jobAnalysisA._id.toString(),
        }),
      });

      assert.equal(res.status, 404);
      const data = await res.json();
      assert.equal(data.code, 'JOB_ANALYSIS_NOT_FOUND');
    });
  });

  describe('3. Application CRUD Lifecycle', () => {
    it('POST /api/v1/applications creates new application for authenticated user', async () => {
      const payload = {
        companyName: 'Stripe',
        jobTitle: 'Staff Infrastructure Engineer',
        jobDescription: 'Architecting high availability multi-region payment infrastructure.',
        location: 'San Francisco, CA (Remote)',
        employmentType: 'Full-time',
        status: 'Applied',
        applicationDate: new Date('2026-10-01').toISOString(),
        deadline: new Date('2026-11-15').toISOString(),
        jobUrl: 'https://stripe.com/jobs/staff-infrastructure',
        resumeId: resumeA._id.toString(),
        jobAnalysisId: jobAnalysisA._id.toString(),
        salaryExpectation: 220000,
        notes: 'Screening call scheduled for next week with hiring director.',
      };

      const res = await fetch(`${baseUrl}/api/v1/applications`, {
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
      assert.equal(data.data.companyName, 'Stripe');
      assert.equal(data.data.jobTitle, 'Staff Infrastructure Engineer');
      assert.equal(data.data.positionTitle, 'Staff Infrastructure Engineer');
      assert.equal(data.data.status, 'Applied');
      assert.equal(data.data.salaryExpectation, 220000);
      assert.equal(data.data.resumeId, resumeA._id.toString());
      assert.equal(data.data.jobAnalysisId, jobAnalysisA._id.toString());

      createdApplicationId = data.data._id;
    });

    it('GET /api/v1/applications/:id retrieves specific application with populated references', async () => {
      const res = await fetch(`${baseUrl}/api/v1/applications/${createdApplicationId}`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.equal(data.data._id, createdApplicationId);
      assert.equal(data.data.companyName, 'Stripe');
      assert.ok(data.data.resumeId);
      assert.equal(data.data.resumeId.originalFileName, 'Alpha_Backend_Resume.pdf');
      assert.ok(data.data.jobAnalysisId);
      assert.equal(data.data.jobAnalysisId.matchScore, 92);
    });

    it('prevent cross-user retrieval: User B cannot retrieve User A application', async () => {
      const res = await fetch(`${baseUrl}/api/v1/applications/${createdApplicationId}`, {
        headers: { Authorization: `Bearer ${tokenB}` },
      });

      assert.equal(res.status, 404);
      const data = await res.json();
      assert.equal(data.code, 'RESOURCE_NOT_FOUND');
    });

    it('PUT /api/v1/applications/:id updates application status and details', async () => {
      const updatePayload = {
        status: 'Interview',
        notes: 'Technical screen passed with flying colors. Advancing to onsite loop.',
        salaryExpectation: 235000,
        interviewDate: new Date('2026-10-25').toISOString(),
      };

      const res = await fetch(`${baseUrl}/api/v1/applications/${createdApplicationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify(updatePayload),
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.equal(data.data.status, 'Interview');
      assert.equal(data.data.salaryExpectation, 235000);
      assert.match(data.data.notes, /Technical screen passed/i);
    });

    it('prevent cross-user update: User B cannot update User A application', async () => {
      const res = await fetch(`${baseUrl}/api/v1/applications/${createdApplicationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenB}`,
        },
        body: JSON.stringify({ status: 'Rejected' }),
      });

      assert.equal(res.status, 404);
      const data = await res.json();
      assert.equal(data.code, 'RESOURCE_NOT_FOUND');
    });

    it('prevent cross-user deletion: User B cannot delete User A application', async () => {
      const res = await fetch(`${baseUrl}/api/v1/applications/${createdApplicationId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${tokenB}` },
      });

      assert.equal(res.status, 404);
      const data = await res.json();
      assert.equal(data.code, 'RESOURCE_NOT_FOUND');
    });
  });

  describe('4. Search, Filtering, Sorting & Pagination', () => {
    before(async () => {
      const uAId = userDocA.id || userDocA._id;
      // Seed additional diverse applications for User A
      await Application.insertMany([
        {
          userId: uAId,
          companyName: 'Datadog',
          jobTitle: 'Senior Distributed Systems Engineer',
          status: 'Applied',
          location: 'New York, NY',
          applicationDate: new Date('2026-09-15'),
        },
        {
          userId: uAId,
          companyName: 'Airbnb',
          jobTitle: 'Staff Backend Architect',
          status: 'Offer',
          location: 'San Francisco, CA',
          applicationDate: new Date('2026-09-01'),
        },
        {
          userId: uAId,
          companyName: 'Cloudflare',
          jobTitle: 'Edge Platform Engineer',
          status: 'Assessment',
          location: 'Austin, TX (Remote)',
          applicationDate: new Date('2026-10-10'),
        },
        {
          userId: uAId,
          companyName: 'Amazon',
          jobTitle: 'Principal Software Engineer',
          status: 'Rejected',
          location: 'Seattle, WA',
          applicationDate: new Date('2026-08-10'),
        },
        {
          userId: uAId,
          companyName: 'Microsoft',
          jobTitle: 'Cloud Solutions Architect',
          status: 'Saved',
          location: 'Redmond, WA',
          applicationDate: new Date('2026-10-12'),
        },
        {
          userId: uAId,
          companyName: 'Uber',
          jobTitle: 'Core Infrastructure Lead',
          status: 'Withdrawn',
          location: 'San Francisco, CA',
          applicationDate: new Date('2026-07-20'),
        },
      ]);
    });

    it('GET /api/v1/applications returns paginated results', async () => {
      const res = await fetch(`${baseUrl}/api/v1/applications?page=1&limit=3`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.equal(data.data.length, 3);
      assert.ok(data.pagination.total >= 7);
      assert.equal(data.pagination.page, 1);
      assert.equal(data.pagination.limit, 3);
    });

    it('should filter applications by status correctly', async () => {
      const res = await fetch(`${baseUrl}/api/v1/applications?status=Offer`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.ok(data.data.length >= 1);
      data.data.forEach((app) => {
        assert.equal(app.status, 'Offer');
      });
    });

    it('should search applications by company name', async () => {
      const res = await fetch(`${baseUrl}/api/v1/applications?search=Airbnb`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.equal(data.data.length, 1);
      assert.equal(data.data[0].companyName, 'Airbnb');
    });

    it('should search applications by job title', async () => {
      const res = await fetch(`${baseUrl}/api/v1/applications?search=Distributed`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.ok(data.data.length >= 1);
      assert.match(data.data[0].jobTitle, /Distributed/i);
    });

    it('should sort applications chronologically', async () => {
      const res = await fetch(`${baseUrl}/api/v1/applications?sortBy=applicationDate&sortOrder=asc&limit=10`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.ok(data.data.length >= 2);

      for (let i = 0; i < data.data.length - 1; i++) {
        const d1 = new Date(data.data[i].applicationDate).getTime();
        const d2 = new Date(data.data[i + 1].applicationDate).getTime();
        assert.ok(d1 <= d2, 'Ascending sort must order dates from earliest to latest');
      }
    });
  });

  describe('5. Real Aggregated Application Statistics', () => {
    it('GET /api/v1/applications/stats calculates real counts and conversion rates from MongoDB', async () => {
      const res = await fetch(`${baseUrl}/api/v1/applications/stats`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);
      const stats = data.data;

      assert.ok(stats.total >= 7);
      assert.ok(stats.saved >= 1);
      assert.ok(stats.applied >= 1);
      assert.ok(stats.assessment >= 1);
      assert.ok(stats.interview >= 1);
      assert.ok(stats.offer >= 1);
      assert.ok(stats.rejected >= 1);
      assert.ok(stats.withdrawn >= 1);

      // Verify mathematical relations
      const calculatedSum =
        stats.saved +
        stats.applied +
        stats.assessment +
        stats.interview +
        stats.offer +
        stats.rejected +
        stats.withdrawn;
      assert.equal(stats.total, calculatedSum, 'Sum of status counts must equal total');

      // Verify conversion rate calculations
      assert.ok(typeof stats.interviewConversionRate === 'number');
      assert.ok(stats.interviewConversionRate >= 0 && stats.interviewConversionRate <= 100);

      assert.ok(typeof stats.offerConversionRate === 'number');
      assert.ok(stats.offerConversionRate >= 0 && stats.offerConversionRate <= 100);

      // Verify clear definition metadata
      assert.ok(stats.definitions);
      assert.ok(stats.definitions.interviewConversionRate);
      assert.ok(stats.definitions.offerConversionRate);

      // Status distribution array
      assert.ok(Array.isArray(stats.statusDistribution));
      assert.equal(stats.statusDistribution.length, 7);
    });

    it('returns zeroes without crashing when user has no applications', async () => {
      const res = await fetch(`${baseUrl}/api/v1/applications/stats`, {
        headers: { Authorization: `Bearer ${tokenB}` },
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);
      const stats = data.data;

      assert.equal(stats.total, 0);
      assert.equal(stats.saved, 0);
      assert.equal(stats.interviewConversionRate, 0);
      assert.equal(stats.offerConversionRate, 0);
    });
  });

  describe('6. Application Deletion Verification', () => {
    it('DELETE /api/v1/applications/:id deletes application and confirms removal', async () => {
      const res = await fetch(`${baseUrl}/api/v1/applications/${createdApplicationId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${tokenA}` },
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);

      // Verify removal
      const checkRes = await fetch(`${baseUrl}/api/v1/applications/${createdApplicationId}`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      assert.equal(checkRes.status, 404);
    });
  });
});
