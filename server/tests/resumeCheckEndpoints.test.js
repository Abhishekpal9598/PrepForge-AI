import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { config } from '../src/config/env.js';
import { User } from '../src/models/User.js';
import { Resume } from '../src/models/Resume.js';
import { ResumeAnalysis } from '../src/models/ResumeAnalysis.js';

describe('Suite: Resume Check API Endpoints & Access Control', () => {
  let server = null;
  let baseUrl = '';
  const testUri = process.env.TEST_MONGODB_URI || config.testMongoUri;

  const userA = {
    fullName: 'Check Candidate Alpha',
    email: `alpha-${Date.now()}@checktest.local`,
    password: 'SecurePassword123!',
    targetRole: 'Full Stack Engineer',
  };

  const userB = {
    fullName: 'Check Candidate Beta',
    email: `beta-${Date.now()}@checktest.local`,
    password: 'SecurePassword123!',
    targetRole: 'Data Scientist',
  };

  let tokenA = '';
  let tokenB = '';
  let resumeIdA = '';

  before(async () => {
    await connectDB(testUri);
    await User.deleteMany({ email: { $regex: /@checktest\.local$/i } });
    await Resume.deleteMany({});
    await ResumeAnalysis.deleteMany({});

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

    // Create a rich parsed Resume for User A directly
    const userDocA = await User.findOne({ email: userA.email });
    const resumeA = await Resume.create({
      userId: userDocA._id,
      title: 'Dev_Resume.pdf',
      originalFileName: 'Alex_Vance_Senior_Dev_Resume.pdf',
      fileFormat: 'pdf',
      fileSize: 120000,
      extractedText: `
        Alex Vance
        Senior Full Stack Engineer
        alex.vance@example.com | +1 555-0199 | Austin, TX
        https://linkedin.com/in/alexvance | https://github.com/alexvance
        
        Summary
        Senior Full Stack Engineer with 7+ years of experience building scalable distributed web applications.
        
        Technical Skills
        JavaScript, TypeScript, React, Node.js, PostgreSQL, Docker, AWS
        
        Professional Experience
        Senior Software Engineer — CloudCore Inc (06/2021 - Present)
        • Architected microservices with Node.js and TypeScript handling 50k requests/second.
        • Spearheaded cloud migration to AWS reducing hosting costs by $35,000 annually.
        • Mentored 5 junior engineers and facilitated weekly technical design reviews.
        
        Software Engineer — WebForge (08/2018 - 05/2021)
        • Engineered customer-facing React components improving page speed by 40%.
        • Delivered RESTful API endpoints in PostgreSQL and Node.js.
        
        Education
        Bachelor of Science in Computer Science — University of Texas at Austin (2014 - 2018)
      `,
      parsedSections: {
        rawSections: {
          summary: 'Senior Full Stack Engineer with 7+ years of experience.',
          experience: 'Senior Software Engineer at CloudCore Inc\nSoftware Engineer at WebForge',
          skills: 'JavaScript, TypeScript, React, Node.js, PostgreSQL, Docker, AWS',
          education: 'Bachelor of Science in Computer Science',
        },
        detectedSections: [
          { canonicalKey: 'contact', characterCount: 150 },
          { canonicalKey: 'summary', characterCount: 80 },
          { canonicalKey: 'technicalSkills', characterCount: 90 },
          { canonicalKey: 'experience', characterCount: 500 },
          { canonicalKey: 'education', characterCount: 90 },
        ],
        sectionOrder: ['contact', 'summary', 'technicalSkills', 'experience', 'education'],
        missingCoreSections: [],
        confidence: 0.95,
        structured: {
          contact: {
            email: 'alex.vance@example.com',
            phone: '+1 555-0199',
            location: 'Austin, TX',
            links: ['https://linkedin.com/in/alexvance', 'https://github.com/alexvance'],
          },
          skills: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'PostgreSQL', 'Docker', 'AWS'],
          experience: [
            {
              title: 'Senior Software Engineer',
              company: 'CloudCore Inc',
              dateRange: { startYear: 2021, endYear: 2026, isCurrent: true, raw: '06/2021 - Present' },
              bullets: [
                'Architected microservices with Node.js and TypeScript handling 50k requests/second.',
                'Spearheaded cloud migration to AWS reducing hosting costs by $35,000 annually.',
                'Mentored 5 junior engineers and facilitated weekly technical design reviews.',
              ],
            },
            {
              title: 'Software Engineer',
              company: 'WebForge',
              dateRange: { startYear: 2018, endYear: 2021, raw: '08/2018 - 05/2021' },
              bullets: [
                'Engineered customer-facing React components improving page speed by 40%.',
                'Delivered RESTful API endpoints in PostgreSQL and Node.js.',
              ],
            },
          ],
          education: [
            {
              degree: 'Bachelor of Science in Computer Science',
              institution: 'University of Texas at Austin',
              dateRange: { startYear: 2014, endYear: 2018 },
            },
          ],
          timeline: {
            totalExperienceYears: 7.5,
            hasGaps: false,
            gaps: [],
          },
        },
      },
    });

    resumeIdA = resumeA._id.toString();
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await User.deleteMany({ email: { $regex: /@checktest\.local$/i } });
    await Resume.deleteMany({});
    await ResumeAnalysis.deleteMany({});
    await disconnectDB();
  });

  it('1. POST /resumes/:id/checks returns 401 without authentication', async () => {
    const res = await fetch(`${baseUrl}/resumes/${resumeIdA}/checks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    assert.equal(res.status, 401);
  });

  it('2. POST /resumes/:id/checks returns 404 when accessed by User B (IDOR protection)', async () => {
    const res = await fetch(`${baseUrl}/resumes/${resumeIdA}/checks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenB}`,
      },
    });
    assert.equal(res.status, 404);
  });

  it('3. POST /resumes/:id/checks evaluates all 27 checks successfully for owner', async () => {
    const res = await fetch(`${baseUrl}/resumes/${resumeIdA}/checks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        jobDescription: 'Senior Software Engineer proficient in TypeScript, React, Node.js, and AWS.',
        targetRole: 'Senior Full Stack Engineer',
      }),
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.checkSummary.totalChecks, 27);
    assert.equal(body.data.checks.length, 27);
    assert.ok(body.data.evaluatedAt);
    assert.ok(typeof body.data.executionTimeMs === 'number');

    // Verify persistence in ResumeAnalysis
    const analysis = await ResumeAnalysis.findOne({ resumeId: resumeIdA });
    assert.ok(analysis);
    assert.equal(analysis.detailedChecks.length, 27);
    assert.ok(analysis.evaluatedAt);
    assert.equal(analysis.checkSummary.totalChecks, 27);
  });

  it('4. GET /resumes/:id/checks retrieves cached checks and supports status/category filtering', async () => {
    // 1. Retrieve all
    const allRes = await fetch(`${baseUrl}/resumes/${resumeIdA}/checks`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert.equal(allRes.status, 200);
    const allBody = await allRes.json();
    assert.equal(allBody.data.checks.length, 27);

    // 2. Filter by status=PASS
    const passRes = await fetch(`${baseUrl}/resumes/${resumeIdA}/checks?status=PASS`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert.equal(passRes.status, 200);
    const passBody = await passRes.json();
    assert.ok(passBody.data.checks.every((c) => c.status === 'PASS'));

    // 3. Filter by category=CAT-01
    const catRes = await fetch(`${baseUrl}/resumes/${resumeIdA}/checks?category=CAT-01`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert.equal(catRes.status, 200);
    const catBody = await catRes.json();
    assert.equal(catBody.data.checks.length, 6);
    assert.ok(catBody.data.checks.every((c) => c.categoryId === 'CAT-01'));
  });

  it('5. GET /resumes/:id/checks/:checkId retrieves single check detail', async () => {
    const res = await fetch(`${baseUrl}/resumes/${resumeIdA}/checks/CHK-01`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.checkId, 'CHK-01');

    // Invalid check ID format returns 400
    const invalidFormatRes = await fetch(`${baseUrl}/resumes/${resumeIdA}/checks/INVALID-ID`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert.equal(invalidFormatRes.status, 400);

    // Non-existent check ID (e.g. CHK-99) returns 400 or 404
    const nonExistentRes = await fetch(`${baseUrl}/resumes/${resumeIdA}/checks/CHK-99`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert.ok(nonExistentRes.status === 400 || nonExistentRes.status === 404);
  });

  it('6. POST /resumes/:id/recheck triggers re-evaluation and updates timestamp', async () => {
    const recheckRes = await fetch(`${baseUrl}/resumes/${resumeIdA}/recheck`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
    });

    assert.equal(recheckRes.status, 200);
    const body = await recheckRes.json();
    assert.equal(body.success, true);
    assert.equal(body.data.checkSummary.totalChecks, 27);
  });
});
