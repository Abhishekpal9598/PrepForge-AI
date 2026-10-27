import fs from 'fs';
import path from 'path';

const BASE_URL = process.env.TEST_API_URL || 'http://localhost:5001';

const log = (step, msg, data = null) => {
  console.log(`\x1b[36m[WORKFLOW ${step}]\x1b[0m ${msg}`);
  if (data) console.log('   ↳', typeof data === 'object' ? JSON.stringify(data).slice(0, 160) + '...' : data);
};

const assertOk = (cond, msg) => {
  if (!cond) {
    console.error(`\x1b[31m[FAILED]\x1b[0m ${msg}`);
    process.exit(1);
  }
};

async function runLiveE2E() {
  console.log('\n============================================================');
  console.log('  PrepForge AI — Phase 9 Live Production E2E Verification');
  console.log('  Target API:', BASE_URL);
  console.log('============================================================\n');

  // ========================================================
  // PRE-FLIGHT: API & Database Health Check
  // ========================================================
  log('HEALTH', 'Verifying server and database readiness...');
  const healthRes = await fetch(`${BASE_URL}/api/v1/health`);
  const healthData = await healthRes.json();
  assertOk(healthRes.status === 200 && healthData.success && healthData.database?.connected, 'Health check failed: DB not connected');
  log('HEALTH', 'Server & Database operational', { status: healthData.status, db: healthData.database.status });

  const uniqueSuffix = Date.now();
  const userAEmail = `audit-candidate-${uniqueSuffix}@prepforge.ai`;
  const userAPassword = 'SecureAuditPassword2026!';
  const userBEmail = `audit-intruder-${uniqueSuffix}@prepforge.ai`;
  const userBPassword = 'IntruderPassword2026!';

  // ========================================================
  // WORKFLOW A: Register a new account
  // ========================================================
  log('A', `Registering new candidate account: ${userAEmail}`);
  const regResA = await fetch(`${BASE_URL}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: 'Alex Montgomery',
      email: userAEmail,
      password: userAPassword,
      targetRole: 'Senior Full Stack Engineer',
      careerLevel: 'Senior',
    }),
  });
  const regDataA = await regResA.json();
  assertOk(regResA.status === 201 && regDataA.success, `Workflow A Failed: ${regDataA.message}`);
  let tokenA = regDataA.token;
  const userAId = regDataA.user.id;
  log('A', 'Account registered successfully', { id: userAId, email: userAEmail });

  // Register User B for Cross-User Isolation (IDOR) tests
  const regResB = await fetch(`${BASE_URL}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: 'Bob Intruder',
      email: userBEmail,
      password: userBPassword,
      targetRole: 'Junior Developer',
      careerLevel: 'Entry',
    }),
  });
  const regDataB = await regResB.json();
  assertOk(regResB.status === 201 && regDataB.token, 'User B setup failed');
  const tokenB = regDataB.token;

  // ========================================================
  // WORKFLOW B: Log in
  // ========================================================
  log('B', 'Logging in candidate account via POST /api/v1/auth/login');
  const loginResA = await fetch(`${BASE_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: userAEmail, password: userAPassword }),
  });
  const loginDataA = await loginResA.json();
  assertOk(loginResA.status === 200 && loginDataA.token, `Workflow B Failed: ${loginDataA.message}`);
  tokenA = loginDataA.token;
  log('B', 'Candidate logged in successfully with fresh JWT');

  // ========================================================
  // WORKFLOW C: Upload a resume
  // ========================================================
  log('C', 'Uploading resume (valid text structure, magic bytes, extracted text)...');
  const sampleResume = `
ALEX MONTGOMERY
Senior Full Stack Engineer | alex@prepforge.ai | San Francisco, CA

SUMMARY
Highly capable full-stack engineer with 6+ years of experience designing scalable distributed web platforms using Node.js, Express, React, TypeScript, and MongoDB.

TECHNICAL SKILLS
Languages: JavaScript, TypeScript, Python, HTML5, CSS3, SQL
Backend: Node.js, Express, REST APIs, Microservices, MongoDB, PostgreSQL, Redis
Frontend: React, Redux, Next.js, Tailwind CSS, Vite
DevOps: Docker, AWS, CI/CD, Git, Jest

PROFESSIONAL EXPERIENCE
Senior Full Stack Engineer | CloudScale Systems | 2022 - Present
- Architected and delivered resilient microservices handling 250,000 requests/minute.
- Reduced API p99 latency by 35% through Redis caching and MongoDB query index optimization.
- Led front-end migration to React 19 and Tailwind CSS, improving Core Web Vitals LCP by 42%.

Software Engineer | DevForge Labs | 2020 - 2022
- Developed core RESTful APIs and managed MongoDB aggregation pipelines for dashboard reporting.
- Implemented JWT-based session security, RBAC authorization, and automated regression test suites.

EDUCATION
B.S. in Computer Science | University of California, Berkeley | Graduated 2020
  `.trim();

  const formData = new FormData();
  const fileBlob = new Blob([sampleResume], { type: 'text/plain' });
  formData.append('resume', fileBlob, 'Alex_Montgomery_Resume.txt');

  const uploadRes = await fetch(`${BASE_URL}/api/v1/resumes`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: formData,
  });
  const uploadData = await uploadRes.json();
  assertOk(uploadRes.status === 201 && uploadData.resume?.id, `Workflow C Failed: ${uploadData.message}`);
  const resumeId = uploadData.resume.id;
  log('C', 'Resume uploaded & text extracted successfully', { id: resumeId, size: uploadData.resume.fileSize });

  // Cross-user IDOR isolation test: User B cannot access User A's resume
  const idorResumeRes = await fetch(`${BASE_URL}/api/v1/resumes/${resumeId}`, {
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  assertOk(idorResumeRes.status === 404, 'Security violation: User B accessed User A resume!');
  log('C-SEC', 'Cross-user data isolation verified: User B blocked with HTTP 404');

  // ========================================================
  // WORKFLOW D: Analyze resume using Gemini
  // ========================================================
  log('D', `Analyzing resume ${resumeId} using Gemini AI...`);
  const analyzeRes = await fetch(`${BASE_URL}/api/v1/resumes/${resumeId}/analyze`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenA}`,
      'Content-Type': 'application/json',
    },
  });
  const analyzeData = await analyzeRes.json();
  assertOk((analyzeRes.status === 200 || analyzeRes.status === 201) && analyzeData.success, `Workflow D Failed: ${analyzeData.message}`);
  const analysisObj = analyzeData.analysis || analyzeData.data;
  const analysisId = analysisObj.id || analysisObj._id;
  const atsScore = analysisObj.overallScore || analysisObj.atsScore;
  log('D', 'AI Resume Analysis & ATS Scoring completed', {
    analysisId,
    atsScore,
    modelUsed: analysisObj.modelUsed || analyzeData.meta?.modelUsed || 'Gemini Multi-Tier',
  });

  // Cross-user IDOR test on analysis
  const idorAnalysisRes = await fetch(`${BASE_URL}/api/v1/resume-analyses/${analysisId}`, {
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  assertOk(idorAnalysisRes.status === 404, 'Security violation: User B accessed User A analysis!');
  log('D-SEC', 'Cross-user analysis isolation verified (HTTP 404)');

  // ========================================================
  // WORKFLOW E: Analyze a job description
  // ========================================================
  log('E', 'Analyzing job description & matching against candidate resume...');
  const sampleJobDesc = `
Role: Senior Full Stack Engineer
Company: TechCorp AI
Location: Remote / San Francisco, CA
Requirements:
- 5+ years building distributed web applications with Node.js and React.
- Strong knowledge of MongoDB, Express, and modern REST APIs.
- Experience with Docker, cloud infrastructure (AWS/GCP), and CI/CD pipelines.
- Excellent communication skills and passion for automated testing and code quality.
  `.trim();

  const jobMatchRes = await fetch(`${BASE_URL}/api/v1/jobs/analyze`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenA}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jobTitle: 'Senior Full Stack Engineer',
      companyName: 'TechCorp AI',
      jobDescription: sampleJobDesc,
      resumeId: resumeId,
    }),
  });
  const jobMatchData = await jobMatchRes.json();
  assertOk((jobMatchRes.status === 200 || jobMatchRes.status === 201) && jobMatchData.success, `Workflow E Failed: ${jobMatchData.message}`);
  const jobObj = jobMatchData.job || jobMatchData.data;
  const jobAnalysisId = jobObj.id || jobObj._id;
  const matchScore = jobObj.matchScore;
  log('E', 'Job Description matched successfully', { jobAnalysisId, matchScore });

  // ========================================================
  // WORKFLOW F: Generate a mock interview
  // ========================================================
  log('F', 'Generating mock interview questions with Gemini AI...');
  const interviewCreateRes = await fetch(`${BASE_URL}/api/v1/interviews`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenA}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jobRole: 'Senior Full Stack Engineer',
      experienceLevel: 'Senior',
      category: 'Technical',
      difficulty: 'Medium',
      numberOfQuestions: 5,
      resumeId: resumeId,
      jobAnalysisId: jobAnalysisId,
    }),
  });
  const interviewData = await interviewCreateRes.json();
  const sessionObj = interviewData.session || interviewData.data;
  assertOk(interviewCreateRes.status === 201 && (sessionObj?.id || sessionObj?._id), `Workflow F Failed: ${interviewData.message}`);
  const interviewId = sessionObj.id || sessionObj._id;
  log('F', 'Mock interview generated with tailored questions', {
    interviewId,
    questionCount: sessionObj.questions?.length || 0,
  });

  // Start the session
  const startRes = await fetch(`${BASE_URL}/api/v1/interviews/${interviewId}/start`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  const startData = await startRes.json();
  const startSession = startData.session || startData.data;
  assertOk(startRes.status === 200 && (startSession?.status === 'in_progress' || startSession?.status === 'in-progress'), 'Interview start failed');

  // Submit answer for first question
  const firstQ = startSession.questions?.[0] || sessionObj.questions?.[0];
  const questionId = firstQ?.questionId || 'q_1';
  log('F-ANS', `Submitting answer for question ${questionId}...`);
  const answerRes = await fetch(`${BASE_URL}/api/v1/interviews/${interviewId}/answer`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenA}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      questionId: questionId,
      answerText: 'In Node.js, the event loop runs on a single main thread, delegating I/O operations to libuv worker pool. I ensure high performance by avoiding synchronous blocking calls and utilizing connection pools for MongoDB.',
    }),
  });
  const answerData = await answerRes.json();
  assertOk(answerRes.status === 200 && answerData.success, `Answer evaluation failed: ${answerData.message}`);
  log('F-ANS', 'Instant AI answer evaluation received');

  // ========================================================
  // WORKFLOW G: Complete an interview
  // ========================================================
  log('G', 'Completing interview session & generating final comprehensive evaluation...');
  const completeRes = await fetch(`${BASE_URL}/api/v1/interviews/${interviewId}/complete`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  const completeData = await completeRes.json();
  const completeSession = completeData.session || completeData.data;
  assertOk(completeRes.status === 200 && completeSession?.status === 'completed', `Workflow G Failed: ${completeData.message}`);
  log('G', 'Interview completed and evaluated', {
    overallScore: completeSession.overallScore,
    assessment: completeSession.finalEvaluation?.overallAssessment || completeSession.finalFeedback?.overallAssessment,
  });

  // ========================================================
  // WORKFLOW H: Create a job application
  // ========================================================
  log('H', 'Creating tracked job application...');
  const appCreateRes = await fetch(`${BASE_URL}/api/v1/applications`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenA}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      companyName: 'TechCorp AI',
      jobTitle: 'Senior Full Stack Engineer',
      location: 'San Francisco, CA',
      employmentType: 'Full-time',
      status: 'Applied',
      resumeId: resumeId,
      jobAnalysisId: jobAnalysisId,
      notes: 'Submitted resume via official portal.',
    }),
  });
  const appData = await appCreateRes.json();
  const applicationId = appData.data?.id || appData.data?._id;
  assertOk(appCreateRes.status === 201 && applicationId, `Workflow H Failed: ${appData.message}`);
  log('H', 'Job application tracked successfully', { id: applicationId, status: appData.data.status });

  // Update status to Interview
  const appUpdateRes = await fetch(`${BASE_URL}/api/v1/applications/${applicationId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${tokenA}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      status: 'Interview',
      notes: 'Advancing to round 1 technical screen.',
    }),
  });
  const appUpdateData = await appUpdateRes.json();
  assertOk(appUpdateRes.status === 200 && appUpdateData.data.status === 'Interview', 'Application status update failed');
  log('H', 'Application status progressed to "Interview"');

  // ========================================================
  // WORKFLOW I: Verify dashboard analytics
  // ========================================================
  log('I', 'Querying real-time aggregated dashboard analytics...');
  const dashRes = await fetch(`${BASE_URL}/api/v1/dashboard/analytics`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  const dashData = await dashRes.json();
  assertOk(dashRes.status === 200 && dashData.success, `Workflow I Failed: ${dashData.message}`);
  const summary = dashData.data.summary || dashData.data.overview || {};
  assertOk(summary.totalApplications >= 1, 'Dashboard metric totalApplications mismatch');
  log('I', 'Dashboard metrics verified with live MongoDB aggregations', {
    totalApplications: summary.totalApplications,
    interviewRate: summary.interviewConversionRate || summary.interviewRate,
    avgAtsScore: summary.averageAtsScore || summary.avgAtsScore,
    completedInterviews: dashData.data.interviews?.completedInterviews,
  });

  // ========================================================
  // WORKFLOW J: Update profile
  // ========================================================
  log('J', 'Updating candidate profile fields...');
  const profileRes = await fetch(`${BASE_URL}/api/v1/profile`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${tokenA}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      headline: 'Senior Full-Stack Cloud Architect',
      currentRole: 'Lead Engineer',
      location: 'San Francisco Bay Area',
      skills: ['Node.js', 'React', 'MongoDB', 'Docker', 'TypeScript', 'AWS'],
    }),
  });
  const profileData = await profileRes.json();
  assertOk(profileRes.status === 200 && profileData.data.headline === 'Senior Full-Stack Cloud Architect', `Workflow J Failed: ${profileData.message}`);
  log('J', 'Candidate profile updated successfully');

  // ========================================================
  // WORKFLOW K: Change settings and theme
  // ========================================================
  log('K', 'Updating notification preferences and appearance theme...');
  const settingsRes = await fetch(`${BASE_URL}/api/v1/settings`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${tokenA}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      appearance: { theme: 'dark' },
      notifications: {
        interviewReminders: true,
        applicationReminders: true,
        resumeUpdates: true,
        jobMatchUpdates: true,
        productAnnouncements: true,
      },
    }),
  });
  const settingsData = await settingsRes.json();
  assertOk(settingsRes.status === 200 && settingsData.data.appearance.theme === 'dark', `Workflow K Failed: ${settingsData.message}`);
  log('K', 'Theme and notification settings persisted');

  // ========================================================
  // WORKFLOW L: Change password
  // ========================================================
  log('L', 'Changing candidate password via POST /api/v1/profile/change-password...');
  const brandNewPassword = 'SuperStrongNewPassword2026!';
  const pwRes = await fetch(`${BASE_URL}/api/v1/profile/change-password`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenA}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      currentPassword: userAPassword,
      newPassword: brandNewPassword,
      confirmPassword: brandNewPassword,
    }),
  });
  const pwData = await pwRes.json();
  assertOk(pwRes.status === 200 && pwData.token, `Workflow L Failed: ${pwData.message}`);
  const freshTokenA = pwData.token;
  log('L', 'Password changed successfully, received fresh session token');

  // ========================================================
  // WORKFLOW M: Verify old token invalidation
  // ========================================================
  log('M', 'Verifying older JWT token issued before password change is revoked...');
  const oldTokenCheck = await fetch(`${BASE_URL}/api/v1/profile`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  assertOk(oldTokenCheck.status === 401, 'Security issue: Old token was not revoked!');
  log('M', 'Old token successfully rejected with HTTP 401 Unauthorized');

  // Verify fresh token works
  const freshTokenCheck = await fetch(`${BASE_URL}/api/v1/profile`, {
    headers: { Authorization: `Bearer ${freshTokenA}` },
  });
  assertOk(freshTokenCheck.status === 200, 'Fresh token should be accepted');
  log('M-VALID', 'Fresh session token validated with HTTP 200 OK');

  // ========================================================
  // WORKFLOW N: Delete test account
  // ========================================================
  log('N', 'Permanently deleting User A account & cascading assets...');
  const deleteRes = await fetch(`${BASE_URL}/api/v1/profile/account`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${freshTokenA}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      password: brandNewPassword,
      confirmation: 'DELETE MY ACCOUNT',
    }),
  });
  const deleteData = await deleteRes.json();
  assertOk(deleteRes.status === 200 && deleteData.success, `Workflow N Failed: ${deleteData.message}`);
  log('N', 'User A account and associated assets deleted', deleteData.deletedCounts);

  // Verify User A cannot authenticate after deletion
  const postDeleteCheck = await fetch(`${BASE_URL}/api/v1/profile`, {
    headers: { Authorization: `Bearer ${freshTokenA}` },
  });
  assertOk(postDeleteCheck.status === 401, 'Deleted user session must be rejected');
  log('N-SEC', 'Deleted account session rejected with HTTP 401');

  // Clean up User B
  await fetch(`${BASE_URL}/api/v1/profile/account`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${tokenB}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      password: userBPassword,
      confirmation: 'DELETE MY ACCOUNT',
    }),
  });
  log('CLEANUP', 'Test accounts and temporary assets purged cleanly');

  console.log('\n============================================================');
  console.log('  All Workflows (A through N) Verified Successfully! 100% PASS');
  console.log('============================================================\n');
}

runLiveE2E().catch((err) => {
  console.error('\x1b[31m[LIVE E2E RUNNER ERROR]\x1b[0m', err);
  process.exit(1);
});
