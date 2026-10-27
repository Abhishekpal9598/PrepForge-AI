import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import bcryptjs from 'bcryptjs';
import app from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { config } from '../src/config/env.js';
import { User } from '../src/models/User.js';
import { Resume } from '../src/models/Resume.js';
import { ResumeAnalysis } from '../src/models/ResumeAnalysis.js';
import { JobAnalysis } from '../src/models/JobAnalysis.js';
import { InterviewSession } from '../src/models/InterviewSession.js';
import { Application } from '../src/models/Application.js';
import { UPLOAD_DIR } from '../src/middleware/uploadMiddleware.js';

describe('Suite: Profile & Settings Management (Phase 7)', () => {
  let server = null;
  let baseUrl = '';
  const testUri = process.env.TEST_MONGODB_URI || config.testMongoUri;

  // Test User A
  const userAData = {
    fullName: 'Sophia Candidate',
    email: `sophia-${Date.now()}@prepforge.ai`,
    password: 'Password123!',
    targetRole: 'Staff Software Engineer',
    careerLevel: 'Senior',
  };
  let userAToken = '';
  let userACookie = '';
  let userAId = '';

  // Test User B (for isolation testing)
  const userBData = {
    fullName: 'Marcus Developer',
    email: `marcus-${Date.now()}@prepforge.ai`,
    password: 'Password123!',
    targetRole: 'Frontend Engineer',
    careerLevel: 'Mid',
  };
  let userBToken = '';
  let userBId = '';

  before(async () => {
    await connectDB(testUri);

    // Clean up any lingering test users
    await Promise.all([
      User.deleteMany({ email: { $regex: /@prepforge\.ai$/i } }),
      Resume.deleteMany({ originalFileName: { $regex: /test-phase7/i } }),
    ]);

    // Ensure uploads directory exists
    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }

    // Start ephemeral HTTP test server
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
      body: JSON.stringify(userAData),
    });
    const dataA = await resA.json();
    userAToken = dataA.token;
    userAId = dataA.user.id;
    const setCookie = resA.headers.get('set-cookie');
    userACookie = setCookie ? setCookie.split(';')[0] : '';

    // 2. Register User B
    const resB = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userBData),
    });
    const dataB = await resB.json();
    userBToken = dataB.token;
    userBId = dataB.user.id;
  });

  after(async () => {
    await Promise.all([
      User.deleteMany({ email: { $regex: /@prepforge\.ai$/i } }),
      Resume.deleteMany({ originalFileName: { $regex: /test-phase7/i } }),
    ]);
    await disconnectDB();
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  describe('1. Profile Retrieval & Authentication Guards', () => {
    it('should reject unauthenticated request with HTTP 401', async () => {
      const res = await fetch(`${baseUrl}/api/v1/profile`);
      assert.equal(res.status, 401, 'Should require authentication');
      const data = await res.json();
      assert.equal(data.success, false);
      assert.equal(data.code, 'AUTH_TOKEN_MISSING');
    });

    it('GET /api/v1/profile retrieves own profile from MongoDB', async () => {
      const res = await fetch(`${baseUrl}/api/v1/profile`, {
        headers: { Authorization: `Bearer ${userAToken}` },
      });
      assert.equal(res.status, 200, 'Should return HTTP 200 OK');
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.data.id, userAId);
      assert.equal(body.data.email, userAData.email.toLowerCase());
      assert.equal(body.data.fullName, userAData.fullName);
      assert.equal(body.data.targetRole, userAData.targetRole);
      assert.equal(body.data.careerLevel, userAData.careerLevel);
      assert.equal(body.data.passwordHash, undefined, 'passwordHash must never be exposed');
      assert.ok(Array.isArray(body.data.skills), 'skills must be an array');
      assert.ok(Array.isArray(body.data.education), 'education must be an array');
    });

    it('compatibility route /api/profile works identically', async () => {
      const res = await fetch(`${baseUrl}/api/profile`, {
        headers: { Authorization: `Bearer ${userAToken}` },
      });
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.data.id, userAId);
    });
  });

  describe('2. Profile Update & Input Validation', () => {
    it('PUT /api/v1/profile updates candidate profile fields', async () => {
      const updatePayload = {
        fullName: 'Sophia Candidate, M.Sc.',
        phoneNumber: '+1 (555) 019-4829',
        headline: 'Staff Infrastructure Architect & Cloud Native Specialist',
        currentRole: 'Lead SRE',
        targetRole: 'Staff Software Engineer',
        careerLevel: 'Lead',
        location: 'Seattle, WA / Remote',
        skills: ['Kubernetes', 'Go', 'Distributed Systems', 'Node.js', 'PostgreSQL'],
        education: [
          {
            institution: 'University of Washington',
            degree: 'M.Sc.',
            fieldOfStudy: 'Computer Science',
            graduationYear: 2020,
          },
        ],
      };

      const res = await fetch(`${baseUrl}/api/v1/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userAToken}`,
        },
        body: JSON.stringify(updatePayload),
      });

      assert.equal(res.status, 200, 'Should return HTTP 200 OK');
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.data.fullName, updatePayload.fullName);
      assert.equal(body.data.phoneNumber, updatePayload.phoneNumber);
      assert.equal(body.data.headline, updatePayload.headline);
      assert.equal(body.data.currentRole, updatePayload.currentRole);
      assert.equal(body.data.careerLevel, 'Lead');
      assert.equal(body.data.location, updatePayload.location);
      assert.deepEqual(body.data.skills, updatePayload.skills);
      assert.equal(body.data.education.length, 1);
      assert.equal(body.data.education[0].institution, 'University of Washington');

      // Verify persistence in MongoDB
      const dbUser = await User.findById(userAId);
      assert.equal(dbUser.fullName, updatePayload.fullName);
      assert.equal(dbUser.careerLevel, 'Lead');
      assert.equal(dbUser.skills.length, 5);
    });

    it('rejects attempt to alter protected fields (role, passwordHash, accountStatus)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userAToken}`,
        },
        body: JSON.stringify({
          fullName: 'Sophia Hacker',
          role: 'admin',
          passwordHash: 'injected_hash_attempt',
        }),
      });

      assert.equal(res.status, 400, 'Should reject modification of protected fields with HTTP 400');
      const body = await res.json();
      assert.equal(body.success, false);
      assert.ok(body.message.includes('protected'), 'Message must indicate protected fields error');
    });

    it('rejects invalid career level enum with HTTP 400', async () => {
      const res = await fetch(`${baseUrl}/api/v1/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userAToken}`,
        },
        body: JSON.stringify({
          careerLevel: 'SupremeCommander',
        }),
      });

      assert.equal(res.status, 400, 'Should reject invalid careerLevel enum');
      const body = await res.json();
      assert.equal(body.success, false);
    });

    it('rejects duplicate email taken by another user with HTTP 409 Conflict', async () => {
      const res = await fetch(`${baseUrl}/api/v1/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userAToken}`,
        },
        body: JSON.stringify({
          email: userBData.email, // Already used by User B
        }),
      });

      assert.equal(res.status, 409, 'Should return HTTP 409 Conflict for duplicate email');
      const body = await res.json();
      assert.equal(body.success, false);
      assert.ok(body.message.includes('already exists'), 'Should explain email conflict');
    });

    it('allows updating email to a new valid and unused address', async () => {
      const newEmail = `sophia-updated-${Date.now()}@prepforge.ai`;
      const res = await fetch(`${baseUrl}/api/v1/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userAToken}`,
        },
        body: JSON.stringify({ email: newEmail }),
      });

      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.data.email, newEmail.toLowerCase());

      // Revert email back for remaining tests
      await User.findByIdAndUpdate(userAId, { email: userAData.email.toLowerCase() });
    });
  });

  describe('3. Password Management & Token Invalidation', () => {
    it('POST /api/v1/profile/change-password rejects incorrect current password with HTTP 401', async () => {
      const res = await fetch(`${baseUrl}/api/v1/profile/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userAToken}`,
        },
        body: JSON.stringify({
          currentPassword: 'WrongPassword999!',
          newPassword: 'BrandNewPassword123!',
          confirmPassword: 'BrandNewPassword123!',
        }),
      });

      assert.equal(res.status, 401, 'Should reject incorrect current password');
      const body = await res.json();
      assert.equal(body.success, false);
      assert.equal(body.code, 'INVALID_CREDENTIALS');
    });

    it('rejects weak new password with HTTP 400', async () => {
      const res = await fetch(`${baseUrl}/api/v1/profile/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userAToken}`,
        },
        body: JSON.stringify({
          currentPassword: userAData.password,
          newPassword: 'weak',
          confirmPassword: 'weak',
        }),
      });

      assert.equal(res.status, 400, 'Should reject weak password');
      const body = await res.json();
      assert.equal(body.success, false);
    });

    it('rejects when new password equals current password with HTTP 400', async () => {
      const res = await fetch(`${baseUrl}/api/v1/profile/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userAToken}`,
        },
        body: JSON.stringify({
          currentPassword: userAData.password,
          newPassword: userAData.password,
          confirmPassword: userAData.password,
        }),
      });

      assert.equal(res.status, 400, 'Should reject identical new password');
      const body = await res.json();
      assert.equal(body.success, false);
    });

    it('rejects when new password and confirm password do not match with HTTP 400', async () => {
      const res = await fetch(`${baseUrl}/api/v1/profile/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userAToken}`,
        },
        body: JSON.stringify({
          currentPassword: userAData.password,
          newPassword: 'BrandNewPassword123!',
          confirmPassword: 'MismatchPassword123!',
        }),
      });

      assert.equal(res.status, 400, 'Should reject password mismatch');
      const body = await res.json();
      assert.equal(body.success, false);
    });

    const brandNewPassword = 'SuperFreshPassword2026!';
    let oldTokenToTestInvalidation = '';

    it('successfully updates password with valid credentials and returns fresh JWT', async () => {
      oldTokenToTestInvalidation = userAToken;

      // Small delay so timestamp advances beyond old token iat
      await new Promise((r) => setTimeout(r, 1100));

      const res = await fetch(`${baseUrl}/api/v1/profile/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userAToken}`,
        },
        body: JSON.stringify({
          currentPassword: userAData.password,
          newPassword: brandNewPassword,
          confirmPassword: brandNewPassword,
        }),
      });

      assert.equal(res.status, 200, 'Should return HTTP 200 OK');
      const body = await res.json();
      assert.equal(body.success, true);
      assert.ok(body.token, 'Should return fresh JWT');

      // Update userAToken to the new valid token
      userAToken = body.token;

      // Verify in DB that passwordChangedAt was set
      const dbUser = await User.findById(userAId);
      assert.ok(dbUser.passwordChangedAt, 'passwordChangedAt must be populated');
    });

    it('verifies that older tokens issued before password change are rejected', async () => {
      const res = await fetch(`${baseUrl}/api/v1/profile`, {
        headers: { Authorization: `Bearer ${oldTokenToTestInvalidation}` },
      });

      assert.equal(res.status, 401, 'Old token should be rejected with HTTP 401');
      const body = await res.json();
      assert.equal(body.success, false);
      assert.equal(body.code, 'TOKEN_INVALIDATED');
    });

    it('authenticates successfully with new password via POST /api/v1/auth/login', async () => {
      const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userAData.email,
          password: brandNewPassword,
        }),
      });

      assert.equal(res.status, 200, 'Login with new password should succeed');
      const body = await res.json();
      assert.equal(body.success, true);
      assert.ok(body.token);
      userAToken = body.token;
    });
  });

  describe('4. Settings Management (Notifications & Appearance)', () => {
    it('GET /api/v1/settings returns default notification and theme settings', async () => {
      const res = await fetch(`${baseUrl}/api/v1/settings`, {
        headers: { Authorization: `Bearer ${userAToken}` },
      });

      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.ok(body.data.notifications);
      assert.equal(body.data.notifications.interviewReminders, true);
      assert.equal(body.data.notifications.applicationReminders, true);
      assert.equal(body.data.notifications.resumeUpdates, true);
      assert.equal(body.data.appearance.theme, 'dark');
      assert.equal(body.data.security.email, userAData.email.toLowerCase());
      assert.equal(body.data.security.emailDeliveryConfigured, false);
    });

    it('PUT /api/v1/settings updates notification preferences', async () => {
      const res = await fetch(`${baseUrl}/api/v1/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userAToken}`,
        },
        body: JSON.stringify({
          notifications: {
            interviewReminders: false,
            productAnnouncements: true,
          },
        }),
      });

      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.data.notifications.interviewReminders, false);
      assert.equal(body.data.notifications.productAnnouncements, true);
      assert.equal(body.data.notifications.applicationReminders, true, 'Unmodified keys should be preserved');
    });

    it('PUT /api/v1/settings updates appearance theme to light and system', async () => {
      // Test Light
      let res = await fetch(`${baseUrl}/api/v1/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userAToken}`,
        },
        body: JSON.stringify({
          appearance: { theme: 'light' },
        }),
      });
      assert.equal(res.status, 200);
      let body = await res.json();
      assert.equal(body.data.appearance.theme, 'light');

      // Test System
      res = await fetch(`${baseUrl}/api/v1/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userAToken}`,
        },
        body: JSON.stringify({
          appearance: { theme: 'system' },
        }),
      });
      assert.equal(res.status, 200);
      body = await res.json();
      assert.equal(body.data.appearance.theme, 'system');
    });

    it('rejects invalid appearance theme enum with HTTP 400', async () => {
      const res = await fetch(`${baseUrl}/api/v1/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userAToken}`,
        },
        body: JSON.stringify({
          appearance: { theme: 'cyberpunk_neon' },
        }),
      });

      assert.equal(res.status, 400, 'Should reject invalid theme enum');
      const body = await res.json();
      assert.equal(body.success, false);
    });
  });

  describe('5. Cascading Account Deletion & Asset Purge', () => {
    let dummyStoredFileName = '';

    before(async () => {
      // Seed User A assets across all collections
      dummyStoredFileName = `test-phase7-resume-${Date.now()}.pdf`;
      const dummyFilePath = path.join(UPLOAD_DIR, dummyStoredFileName);
      fs.writeFileSync(dummyFilePath, '%PDF-1.4 Dummy User A Resume File for Phase 7 Deletion Verification');

      const resumeA = await Resume.create({
        userId: userAId,
        originalFileName: 'test-phase7-resume.pdf',
        storedFileName: dummyStoredFileName,
        fileFormat: 'pdf',
        fileSize: 1024,
        rawText: 'Experienced Senior Engineer with Distributed Systems background.',
      });

      await ResumeAnalysis.create({
        userId: userAId,
        resumeId: resumeA._id,
        overallScore: 88,
        categoryScores: { impact: 88, brevity: 85, style: 90, skills: 90, atsReadability: 87 },
        summaryFeedback: 'Excellent candidate profile with strong leadership metrics.',
      });

      await JobAnalysis.create({
        userId: userAId,
        resumeId: resumeA._id,
        jobTitle: 'Staff Backend Infrastructure Engineer',
        jobDescription: 'Seeking an experienced Staff Software Engineer with Go and Kubernetes proficiency to scale our distributed systems.',
        matchScore: 91,
      });

      await InterviewSession.create({
        userId: userAId,
        resumeId: resumeA._id,
        interviewTitle: 'Staff Backend Engineer Practice',
        jobRole: 'Staff Backend Engineer',
        level: 'Senior',
        category: 'Technical',
        status: 'completed',
        overallScore: 89,
        questions: [],
      });

      await Application.create({
        userId: userAId,
        companyName: 'Stripe',
        jobTitle: 'Staff Software Engineer',
        status: 'Interview',
      });

      // Seed User B assets (must NOT be deleted)
      const resumeB = await Resume.create({
        userId: userBId,
        originalFileName: 'test-phase7-userB.pdf',
        fileFormat: 'pdf',
        fileSize: 2048,
        rawText: 'User B frontend portfolio and competencies.',
      });

      await Application.create({
        userId: userBId,
        companyName: 'Airbnb',
        jobTitle: 'Frontend Engineer',
        status: 'Applied',
      });
    });

    it('DELETE /api/v1/profile/account rejects unauthenticated request with HTTP 401', async () => {
      const res = await fetch(`${baseUrl}/api/v1/profile/account`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: 'any' }),
      });
      assert.equal(res.status, 401);
    });

    it('rejects incorrect password with HTTP 401 and aborts deletion', async () => {
      const res = await fetch(`${baseUrl}/api/v1/profile/account`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userAToken}`,
        },
        body: JSON.stringify({ password: 'WrongPassword999!' }),
      });

      assert.equal(res.status, 401, 'Should reject wrong password');
      const body = await res.json();
      assert.equal(body.success, false);
      assert.equal(body.code, 'INVALID_CREDENTIALS');

      // Verify User A and assets still exist
      const userAExists = await User.findById(userAId);
      assert.ok(userAExists, 'User A must not be deleted on wrong password');
    });

    it('permanently deletes User A account, files, and all associated assets', async () => {
      const dummyFilePath = path.join(UPLOAD_DIR, dummyStoredFileName);
      assert.ok(fs.existsSync(dummyFilePath), 'Test resume file must exist before deletion');

      const res = await fetch(`${baseUrl}/api/v1/profile/account`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userAToken}`,
        },
        body: JSON.stringify({
          password: 'SuperFreshPassword2026!',
          confirmation: 'DELETE',
        }),
      });

      assert.equal(res.status, 200, 'Should return HTTP 200 OK');
      const body = await res.json();
      assert.equal(body.success, true);
      assert.ok(body.message.includes('permanently deleted'));

      // 1. Verify User A record is removed
      const userAAfter = await User.findById(userAId);
      assert.equal(userAAfter, null, 'User A must be removed from users collection');

      // 2. Verify all User A assets across collections are purged
      const [resumesA, analysesA, jobsA, sessionsA, appsA] = await Promise.all([
        Resume.find({ userId: userAId }),
        ResumeAnalysis.find({ userId: userAId }),
        JobAnalysis.find({ userId: userAId }),
        InterviewSession.find({ userId: userAId }),
        Application.find({ userId: userAId }),
      ]);
      assert.equal(resumesA.length, 0, 'User A resumes must be deleted');
      assert.equal(analysesA.length, 0, 'User A analyses must be deleted');
      assert.equal(jobsA.length, 0, 'User A job matches must be deleted');
      assert.equal(sessionsA.length, 0, 'User A interview sessions must be deleted');
      assert.equal(appsA.length, 0, 'User A applications must be deleted');

      // 3. Verify uploaded resume file was unlinked from disk
      assert.equal(fs.existsSync(dummyFilePath), false, 'Physical resume file must be removed from disk');

      // 4. Verify User B assets remain COMPLETELY untouched!
      const userBAfter = await User.findById(userBId);
      assert.ok(userBAfter, 'User B must remain intact');
      const resumesB = await Resume.find({ userId: userBId });
      const appsB = await Application.find({ userId: userBId });
      assert.equal(resumesB.length, 1, 'User B resume must remain intact');
      assert.equal(appsB.length, 1, 'User B application must remain intact');

      // 5. Verify User A token is now rejected
      const profileAfterDelete = await fetch(`${baseUrl}/api/v1/profile`, {
        headers: { Authorization: `Bearer ${userAToken}` },
      });
      assert.equal(profileAfterDelete.status, 401, 'Deleted user token must return HTTP 401');
    });
  });
});
