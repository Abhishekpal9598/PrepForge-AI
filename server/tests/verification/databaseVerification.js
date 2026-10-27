import { connectDB, disconnectDB } from '../../src/config/db.js';
import { config } from '../../src/config/env.js';
import { ResumeAnalysis } from '../../src/models/ResumeAnalysis.js';
import mongoose from 'mongoose';

const runDbVerification = async () => {
  const testUri = process.env.TEST_MONGODB_URI || config.testMongoUri;
  await connectDB(testUri);

  console.log('--- Database & Schema Compatibility Verification ---');

  const testUserId = new mongoose.Types.ObjectId();
  const testResumeId = new mongoose.Types.ObjectId();

  // 1. Historical Document Simulation (Phase 1/2/3 structure without Phase 4 fields)
  console.log('\n[Check 1] Creating legacy/historical ResumeAnalysis document...');
  const legacyDoc = new ResumeAnalysis({
    userId: testUserId,
    resumeId: testResumeId,
    overallScore: 82,
    categoryScores: {
      impact: 80,
      brevity: 85,
      style: 75,
      skills: 90,
      atsReadability: 80,
    },
    summaryFeedback: 'Legacy analysis generated before Phase 4.',
    modelUsed: 'gemini-3.5-flash',
  });
  await legacyDoc.save();

  // Read back and verify null defaults
  const fetchedLegacy = await ResumeAnalysis.findById(legacyDoc._id).lean();
  console.log('Fetched Legacy Doc:');
  console.log('  overallScore:', fetchedLegacy.overallScore);
  console.log('  subScores:', fetchedLegacy.subScores);
  console.log('  scoringVersion:', fetchedLegacy.scoringVersion);
  console.log('  scoreConfidence:', fetchedLegacy.scoreConfidence);
  console.log('  scoredAt:', fetchedLegacy.scoredAt);
  console.log('  scoringBreakdown:', fetchedLegacy.scoringBreakdown);

  if (
    fetchedLegacy.overallScore !== 82 ||
    fetchedLegacy.subScores.atsScore !== null ||
    fetchedLegacy.subScores.contentScore !== null ||
    fetchedLegacy.subScores.structureScore !== null ||
    fetchedLegacy.subScores.jobMatchScore !== null ||
    fetchedLegacy.scoringVersion !== null ||
    fetchedLegacy.scoreConfidence !== null ||
    fetchedLegacy.scoredAt !== null ||
    fetchedLegacy.scoringBreakdown !== null
  ) {
    throw new Error('FAIL: Historical document defaults are corrupted or non-null!');
  }
  console.log('  -> Historical document backwards compatibility: VERIFIED PASS');

  // 2. Phase 4 Scored Document Simulation
  console.log('\n[Check 2] Creating Phase 4 Scored Document...');
  const now = new Date();
  const scoredDoc = new ResumeAnalysis({
    userId: testUserId,
    resumeId: testResumeId,
    overallScore: 91,
    subScores: {
      atsScore: 94,
      contentScore: 88,
      structureScore: 92,
      jobMatchScore: 85,
    },
    scoringVersion: '1.0.0',
    scoreConfidence: 0.95,
    scoredAt: now,
    scoringBreakdown: { test: true },
  });
  await scoredDoc.save();

  const fetchedScored = await ResumeAnalysis.findById(scoredDoc._id).lean();
  if (
    fetchedScored.subScores.atsScore !== 94 ||
    fetchedScored.subScores.contentScore !== 88 ||
    fetchedScored.subScores.structureScore !== 92 ||
    fetchedScored.subScores.jobMatchScore !== 85 ||
    fetchedScored.scoringVersion !== '1.0.0' ||
    fetchedScored.scoreConfidence !== 0.95 ||
    !fetchedScored.scoredAt ||
    !fetchedScored.scoringBreakdown?.test
  ) {
    throw new Error('FAIL: Phase 4 scored document fields failed to persist accurately!');
  }
  console.log('  -> Phase 4 persistence: VERIFIED PASS');

  // 3. Verify Indexes
  console.log('\n[Check 3] Inspecting Collection Indexes...');
  const indexes = await ResumeAnalysis.collection.indexes();
  console.log('Active Indexes:', indexes.map(i => Object.keys(i.key).join('_')));
  const requiredIndexFound = indexes.some(i => i.key.userId === 1 && i.key.resumeId === 1 && i.key.createdAt === -1);
  if (!requiredIndexFound) {
    throw new Error('FAIL: Compound index { userId: 1, resumeId: 1, createdAt: -1 } missing!');
  }
  console.log('  -> Index integrity: VERIFIED PASS');

  // Cleanup
  await ResumeAnalysis.deleteMany({ userId: testUserId });
  await disconnectDB();

  console.log('\nAll Database Compatibility Checks PASSED!');
};

runDbVerification().catch(err => {
  console.error(err);
  process.exit(1);
});
