import { connectDB, disconnectDB } from '../../src/config/db.js';
import { config } from '../../src/config/env.js';
import app from '../../src/app.js';
import { User } from '../../src/models/User.js';
import { Resume } from '../../src/models/Resume.js';
import { ResumeAnalysis } from '../../src/models/ResumeAnalysis.js';

const runApiEdgeCaseVerification = async () => {
  const testUri = process.env.TEST_MONGODB_URI || config.testMongoUri;
  await connectDB(testUri);

  console.log('--- API & Security Edge Case Verification ---');

  let server = null;
  let baseUrl = '';

  await new Promise((resolve) => {
    server = app.listen(0, () => {
      baseUrl = `http://127.0.0.1:${server.address().port}/api/v1`;
      resolve();
    });
  });

  // Create Users
  const userA = {
    fullName: 'Edge User Alpha',
    email: `edge-a-${Date.now()}@edgetest.local`,
    password: 'Password123!',
  };
  const userB = {
    fullName: 'Edge User Beta',
    email: `edge-b-${Date.now()}@edgetest.local`,
    password: 'Password123!',
  };

  const regA = await fetch(`${baseUrl}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userA),
  });
  const tokenA = (await regA.json()).token;

  const regB = await fetch(`${baseUrl}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userB),
  });
  const tokenB = (await regB.json()).token;

  const userDocA = await User.findOne({ email: userA.email });

  // 1. Resume with Historical Analysis (missing Phase 4 score fields)
  console.log('\n[Check 1] Querying scores for Resume with Historical (pre-Phase 4) Analysis...');
  const histResume = await Resume.create({
    userId: userDocA._id,
    title: 'Hist_Resume.pdf',
    originalFileName: 'Hist_Resume.pdf',
    fileFormat: 'pdf',
    fileSize: 50000,
    extractedText: 'Extracted text content exceeding 20 characters for validation requirements.',
  });

  await ResumeAnalysis.create({
    userId: userDocA._id,
    resumeId: histResume._id,
    overallScore: 70,
    summaryFeedback: 'Pre-Phase 4 legacy record.',
    // subScores, scoreConfidence, scoredAt are default null
  });

  const histRes = await fetch(`${baseUrl}/resumes/${histResume._id}/scores`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  console.log('Status code for historical record:', histRes.status);
  const histBody = await histRes.json();
  console.log('Response body:', histBody);
  if (histRes.status !== 404 || histBody.success !== false) {
    throw new Error('FAIL: Expected 404 for historical analysis with null score fields!');
  }
  console.log('  -> Historical analysis non-crash verification: VERIFIED PASS');

  // 2. Malformed Object ID
  console.log('\n[Check 2] Malformed Object ID handling...');
  const badIdRes = await fetch(`${baseUrl}/resumes/not-a-valid-id/scores`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  console.log('Bad ID Status:', badIdRes.status);
  if (badIdRes.status !== 400) {
    throw new Error('FAIL: Expected 400 for malformed ID!');
  }
  console.log('  -> Malformed ID handling: VERIFIED PASS');

  // 3. IDOR Security
  console.log('\n[Check 3] IDOR Cross-User Protection...');
  const idorRes = await fetch(`${baseUrl}/resumes/${histResume._id}/scores`, {
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  console.log('IDOR Attempt Status:', idorRes.status);
  if (idorRes.status !== 404) {
    throw new Error('FAIL: Expected 404 IDOR protection when User B accesses User A resume!');
  }
  console.log('  -> IDOR Protection: VERIFIED PASS');

  // Cleanup
  await new Promise((r) => server.close(r));
  await User.deleteMany({ email: { $regex: /@edgetest\.local$/i } });
  await Resume.deleteMany({ _id: histResume._id });
  await ResumeAnalysis.deleteMany({ resumeId: histResume._id });
  await disconnectDB();

  console.log('\nAll API & Security Edge Case Checks PASSED!');
};

runApiEdgeCaseVerification().catch(err => {
  console.error(err);
  process.exit(1);
});
