import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { config } from '../src/config/env.js';
import { User } from '../src/models/User.js';
import { Resume } from '../src/models/Resume.js';
import { ResumeAnalysis } from '../src/models/ResumeAnalysis.js';
import { SCORING_VERSION } from '../src/services/scoringEngine.js';

describe('Suite: Multi-Dimensional Scoring API Endpoints (Phase 4 Integration)', () => {
  let server = null;
  let baseUrl = '';
  const testUri = process.env.TEST_MONGODB_URI || config.testMongoUri;

  const userA = {
    fullName: 'Scoring Candidate Alpha',
    email: `score-alpha-${Date.now()}@scoringtest.local`,
    password: 'SecurePassword123!',
    targetRole: 'Staff Software Engineer',
  };

  const userB = {
    fullName: 'Scoring Candidate Beta',
    email: `score-beta-${Date.now()}@scoringtest.local`,
    password: 'SecurePassword123!',
    targetRole: 'Product Manager',
  };

  let tokenA = '';
  let tokenB = '';
  let resumeIdA = '';
  let unanalyzedResumeId = '';

  before(async () => {
    await connectDB(testUri);
    await User.deleteMany({ email: { $regex: /@scoringtest\.local$/i } });

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

    // Seed Resume for User A
    const userDocA = await User.findOne({ email: userA.email });
    const resumeDocA = await Resume.create({
      userId: userDocA._id,
      title: 'Scoring_Senior_Engineer.pdf',
      originalFileName: 'Alex_Vance_Senior_Dev_Resume.pdf',
      fileFormat: 'pdf',
      fileSize: 125000,
      extractedText: `
        Alex Vance
        Staff Cloud Engineer
        alex.vance@example.com | +1 555-0199 | Austin, TX
        https://linkedin.com/in/alexvance | https://github.com/alexvance

        Summary
        Staff Cloud Engineer with 8+ years experience designing resilient distributed systems.

        Technical Skills
        JavaScript, TypeScript, React, Node.js, PostgreSQL, Docker, AWS, Kubernetes

        Professional Experience
        Staff Software Engineer — CloudCore Inc (06/2021 - Present)
        • Architected microservices with Node.js and TypeScript handling 50,000 requests per second.
        • Spearheaded cloud migration to AWS reducing hosting costs by $35,000 annually.
        • Mentored 5 junior engineers and facilitated weekly technical design reviews.

        Senior Software Engineer — WebForge (08/2018 - 05/2021)
        • Engineered customer-facing React components improving page speed by 40%.
        • Delivered RESTful API endpoints in PostgreSQL and Node.js.

        Education
        Bachelor of Science in Computer Science — University of Texas at Austin (2014 - 2018)
      `,
      parsedSections: {
        rawSections: {
          contact: 'Alex Vance\nalex.vance@example.com | +1 555-0199',
          summary: 'Staff Cloud Engineer with 8+ years experience designing resilient distributed systems.',
          skills: 'JavaScript, TypeScript, React, Node.js, PostgreSQL, Docker, AWS, Kubernetes',
          experience: 'Staff Software Engineer at CloudCore Inc\nSenior Software Engineer at WebForge',
          education: 'Bachelor of Science in Computer Science',
        },
        detectedSections: [
          { canonicalKey: 'contact', characterCount: 70 },
          { canonicalKey: 'summary', characterCount: 88 },
          { canonicalKey: 'technicalSkills', characterCount: 78 },
          { canonicalKey: 'experience', characterCount: 520 },
          { canonicalKey: 'education', characterCount: 85 },
        ],
        sectionOrder: ['contact', 'summary', 'technicalSkills', 'experience', 'education'],
        structured: {
          contact: {
            name: 'Alex Vance',
            email: 'alex.vance@example.com',
            phone: '+1 555-0199',
            location: 'Austin, TX',
            urls: ['https://linkedin.com/in/alexvance', 'https://github.com/alexvance'],
          },
          skills: {
            technical: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'PostgreSQL', 'Docker', 'AWS', 'Kubernetes'],
            soft: ['leadership', 'mentoring', 'collaboration'],
            tools: ['Docker', 'AWS', 'Kubernetes'],
          },
          experience: [
            {
              role: 'Staff Software Engineer',
              company: 'CloudCore Inc',
              startDate: '2021-06',
              endDate: null,
              isCurrent: true,
              bullets: [
                'Architected microservices with Node.js and TypeScript handling 50,000 requests per second.',
                'Spearheaded cloud migration to AWS reducing hosting costs by $35,000 annually.',
                'Mentored 5 junior engineers and facilitated weekly technical design reviews.',
              ],
            },
            {
              role: 'Senior Software Engineer',
              company: 'WebForge',
              startDate: '2018-08',
              endDate: '2021-05',
              isCurrent: false,
              bullets: [
                'Engineered customer-facing React components improving page speed by 40%.',
                'Delivered RESTful API endpoints in PostgreSQL and Node.js.',
              ],
            },
          ],
          education: [
            {
              institution: 'University of Texas at Austin',
              degree: 'Bachelor of Science',
              field: 'Computer Science',
              graduationYear: 2018,
            },
          ],
        },
      },
    });
    resumeIdA = resumeDocA._id.toString();

    // Create a second un-evaluated resume for 404 tests
    const unanalyzedResume = await Resume.create({
      userId: userDocA._id,
      title: 'Unanalyzed_Resume.pdf',
      originalFileName: 'Unanalyzed_Resume.pdf',
      fileFormat: 'pdf',
      fileSize: 45000,
      extractedText: 'Raw unanalyzed resume text exceeding twenty characters for testing purposes.',
    });
    unanalyzedResumeId = unanalyzedResume._id.toString();
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await User.deleteMany({ email: { $regex: /@scoringtest\.local$/i } });
    await Resume.deleteMany({ _id: { $in: [resumeIdA, unanalyzedResumeId] } });
    await ResumeAnalysis.deleteMany({ resumeId: { $in: [resumeIdA, unanalyzedResumeId] } });
    await disconnectDB();
  });

  // TC-EP-01: POST /resumes/:id/checks returns scoring outputs
  it('TC-EP-01: POST /resumes/:id/checks executes checks and returns all 5 scores + breakdown', async () => {
    const res = await fetch(`${baseUrl}/resumes/${resumeIdA}/checks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        jobDescription: 'Looking for a Staff Engineer skilled in Node.js, TypeScript, AWS, and Docker.',
      }),
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(body.data);

    // Verify 5 Scores
    const { overallScore, subScores, scoreConfidence, scoringBreakdown, scoringVersion, scoredAt } = body.data;
    assert.equal(typeof overallScore, 'number', 'overallScore must be a number');
    assert.ok(overallScore >= 0 && overallScore <= 100);

    assert.ok(subScores, 'subScores object must be present');
    assert.equal(typeof subScores.atsScore, 'number');
    assert.equal(typeof subScores.contentScore, 'number');
    assert.equal(typeof subScores.structureScore, 'number');
    assert.equal(typeof subScores.jobMatchScore, 'number', 'jobMatchScore must be computed when JD is supplied');

    assert.equal(scoringVersion, SCORING_VERSION);
    assert.ok(scoreConfidence > 0 && scoreConfidence <= 1.0);
    assert.ok(scoredAt);
    assert.ok(scoringBreakdown);
    assert.ok(scoringBreakdown.weights);
    assert.ok(scoringBreakdown.components);
  });

  // TC-EP-02: Database Persistence
  it('TC-EP-02: Persists subScores and scoringBreakdown into ResumeAnalysis collection', async () => {
    const analysis = await ResumeAnalysis.findOne({ resumeId: resumeIdA });
    assert.ok(analysis, 'ResumeAnalysis document must exist in MongoDB');
    assert.equal(analysis.scoringVersion, SCORING_VERSION);
    assert.ok(analysis.subScores);
    assert.equal(typeof analysis.subScores.atsScore, 'number');
    assert.equal(typeof analysis.subScores.contentScore, 'number');
    assert.equal(typeof analysis.subScores.structureScore, 'number');
    assert.equal(typeof analysis.subScores.jobMatchScore, 'number');
    assert.ok(analysis.scoreConfidence > 0);
    assert.ok(analysis.scoredAt instanceof Date);
    assert.ok(analysis.scoringBreakdown);
  });

  // TC-EP-03: Without Job Description, Job Match Score is null
  it('TC-EP-03: POST /resumes/:id/checks without JD sets jobMatchScore to null', async () => {
    const res = await fetch(`${baseUrl}/resumes/${resumeIdA}/checks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({}), // No job description
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.data.subScores.jobMatchScore, null, 'Job Match score must be null without JD');
    assert.equal(body.data.scoringBreakdown.components.jobMatch, null);
  });

  // TC-EP-04: GET /resumes/:id/scores retrieves cached scoring data
  it('TC-EP-04: GET /resumes/:id/scores retrieves persisted scores without re-running checks', async () => {
    const res = await fetch(`${baseUrl}/resumes/${resumeIdA}/scores`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${tokenA}`,
      },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.resumeId, resumeIdA);
    assert.equal(typeof body.data.overallScore, 'number');
    assert.ok(body.data.subScores);
    assert.equal(typeof body.data.subScores.atsScore, 'number');
    assert.equal(typeof body.data.subScores.contentScore, 'number');
    assert.equal(typeof body.data.subScores.structureScore, 'number');
    assert.equal(body.data.subScores.jobMatchScore, null); // from TC-EP-03
    assert.ok(body.data.scoreConfidence > 0);
    assert.equal(body.data.scoringVersion, SCORING_VERSION);
    assert.ok(body.data.scoringBreakdown);
  });

  // TC-EP-05: GET /resumes/:id/scores returns 404 for un-evaluated resume
  it('TC-EP-05: GET /resumes/:id/scores returns 404 when resume has not been scored', async () => {
    const res = await fetch(`${baseUrl}/resumes/${unanalyzedResumeId}/scores`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${tokenA}`,
      },
    });

    assert.equal(res.status, 404);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.match(body.message, /no score evaluation records found/i);
  });

  // TC-EP-06: IDOR Protection: User B cannot access User A's scores
  it('TC-EP-06: IDOR Protection: User B receives 404 when requesting scores for User A resume', async () => {
    const res = await fetch(`${baseUrl}/resumes/${resumeIdA}/scores`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${tokenB}`, // User B token
      },
    });

    assert.equal(res.status, 404);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.match(body.message, /not found or unauthorized/i);
  });

  // TC-EP-07: POST /resumes/:id/recheck updates persisted scores
  it('TC-EP-07: POST /resumes/:id/recheck refreshes scores and updates scoredAt timestamp', async () => {
    const beforeAnalysis = await ResumeAnalysis.findOne({ resumeId: resumeIdA });
    const prevScoredAt = beforeAnalysis.scoredAt;

    // Small delay to ensure timestamp difference
    await new Promise((r) => setTimeout(r, 20));

    const res = await fetch(`${baseUrl}/resumes/${resumeIdA}/recheck`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        jobDescription: 'Senior Backend Engineer with Node.js and AWS',
      }),
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.data.subScores.jobMatchScore > 0);

    const afterAnalysis = await ResumeAnalysis.findOne({ resumeId: resumeIdA });
    assert.ok(afterAnalysis.scoredAt.getTime() >= prevScoredAt.getTime());
  });

  // TC-EP-08: Authentication Required
  it('TC-EP-08: Rejects unauthenticated score requests with 401 Unauthorized', async () => {
    const res = await fetch(`${baseUrl}/resumes/${resumeIdA}/scores`, {
      method: 'GET',
    });

    assert.equal(res.status, 401);
  });
});
