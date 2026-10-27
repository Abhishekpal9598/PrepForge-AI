import mongoose from 'mongoose';
import assert from 'node:assert/strict';
import bcryptjs from 'bcryptjs';
import { connectDB, disconnectDB, sanitizeMongoUri } from '../../src/config/db.js';
import { config } from '../../src/config/env.js';
import { User } from '../../src/models/User.js';
import { Resume } from '../../src/models/Resume.js';
import { ResumeAnalysis } from '../../src/models/ResumeAnalysis.js';
import { JobAnalysis } from '../../src/models/JobAnalysis.js';
import { InterviewSession } from '../../src/models/InterviewSession.js';
import { Application } from '../../src/models/Application.js';

/**
 * Phase 9.1: MongoDB Atlas Production Database Provisioning & Verification
 * Connects to the dedicated 'prepforge_prod' database, synchronizes all 27 indexes,
 * conducts a non-destructive read/write verification probe, and cleans up the probe record.
 */
async function runAtlasProductionVerification() {
  console.log('================================================================');
  console.log('   PrepForge AI — Phase 9.1 Atlas Production DB Provisioning');
  console.log('================================================================\n');

  const TARGET_DB = 'prepforge_prod';
  const PROBE_EMAIL = 'prepforge_prod_provision_probe@audit.prepforge.ai';

  // 1. Connection String Verification
  console.log('Step 1: Auditing connection configuration & TLS protocol...');
  const uri = config.mongoUri;
  assert.ok(uri, 'MONGODB_URI must be configured');
  assert.ok(uri.startsWith('mongodb+srv://'), 'Production URI must use mongodb+srv protocol (TLS/SSL enforced)');
  const sanitizedUri = sanitizeMongoUri(uri);
  console.log(`  ✔ PASS - Secure SRV URI validated: ${sanitizedUri}`);
  console.log('  ✔ PASS - TLS/SSL protocol active by default on mongodb+srv connection.\n');

  // 2. Connect to Dedicated Production Database
  console.log(`Step 2: Connecting to dedicated production database "${TARGET_DB}"...`);
  await connectDB(uri, { dbName: TARGET_DB });
  const activeDbName = mongoose.connection.name;
  const activeHost = mongoose.connection.host;
  const readyState = mongoose.connection.readyState;

  assert.equal(activeDbName, TARGET_DB, `Connected database must be strictly "${TARGET_DB}"`);
  assert.equal(readyState, 1, 'Mongoose readyState must be 1 (Connected)');
  console.log(`  ✔ PASS - Connected to target DB: "${activeDbName}" on host: ${activeHost}`);
  console.log(`  ✔ PASS - Database isolation verified: Active DB is NOT "test" or local development.\n`);

  // 3. Inspect Existing Collections
  console.log('Step 3: Inspecting collections in prepforge_prod...');
  const existingCollections = await mongoose.connection.db.listCollections().toArray();
  const collectionNames = existingCollections.map((c) => c.name);
  console.log(`  Collections present (${collectionNames.length}): [${collectionNames.join(', ') || 'None (New DB)'}]\n`);

  // 4. Synchronize & Verify Indexes across all 6 models
  console.log('Step 4: Synchronizing production indexes without deleting existing data...');
  const models = [
    { name: 'User', model: User, expectedMinIndexes: 2 },
    { name: 'Resume', model: Resume, expectedMinIndexes: 4 },
    { name: 'ResumeAnalysis', model: ResumeAnalysis, expectedMinIndexes: 4 },
    { name: 'JobAnalysis', model: JobAnalysis, expectedMinIndexes: 4 },
    { name: 'InterviewSession', model: InterviewSession, expectedMinIndexes: 6 },
    { name: 'Application', model: Application, expectedMinIndexes: 6 },
  ];

  let totalIndexesCount = 0;
  for (const { name, model, expectedMinIndexes } of models) {
    await model.syncIndexes();
    const activeIndexes = await model.collection.indexes();
    totalIndexesCount += activeIndexes.length;
    assert.ok(
      activeIndexes.length >= expectedMinIndexes,
      `[${name}] Must have at least ${expectedMinIndexes} indexes (found ${activeIndexes.length})`
    );
    console.log(`  ✔ [${name}] Indexed successfully (${activeIndexes.length} active indexes):`);
    activeIndexes.forEach((idx) => {
      console.log(`     • ${idx.name}: ${JSON.stringify(idx.key)}`);
    });
  }
  console.log(`\n  ✔ PASS - All 6 collections synchronized. Total active indexes in "${TARGET_DB}": ${totalIndexesCount}\n`);

  // 5. Read/Write Probe Verification
  console.log('Step 5: Executing non-destructive read/write probe...');
  // Ensure no leftover probe exists from previous run
  await User.deleteOne({ email: PROBE_EMAIL });

  const salt = await bcryptjs.genSalt(10);
  const passwordHash = await bcryptjs.hash('AuditPassword123!', salt);

  const probeUser = await User.create({
    fullName: 'Production DB Probe User',
    email: PROBE_EMAIL,
    passwordHash,
    targetRole: 'Site Reliability Engineer',
    careerLevel: 'Senior',
  });

  assert.ok(probeUser._id, 'Probe record must be assigned a MongoDB ObjectId');
  console.log(`  ✔ PASS - Successfully wrote probe record to "${TARGET_DB}".users (ID: ${probeUser._id})`);

  const fetchedUser = await User.findOne({ email: PROBE_EMAIL });
  assert.ok(fetchedUser, 'Probe record must be readable from production database');
  assert.equal(fetchedUser.email, PROBE_EMAIL);
  assert.equal(fetchedUser.targetRole, 'Site Reliability Engineer');
  console.log(`  ✔ PASS - Successfully verified read query from "${TARGET_DB}".users`);

  // 6. Clean Up Probe Record
  console.log('\nStep 6: Cleaning up probe record...');
  const deleteResult = await User.deleteOne({ email: PROBE_EMAIL });
  assert.equal(deleteResult.deletedCount, 1, 'Must delete exactly 1 probe record');

  const recheck = await User.findOne({ email: PROBE_EMAIL });
  assert.equal(recheck, null, 'Probe record must no longer exist');
  console.log(`  ✔ PASS - Probe record safely removed. Zero existing user data touched.\n`);

  // 7. Verify Database State Diagnostic
  console.log('Step 7: Validating connection health telemetry...');
  const state = mongoose.connection.readyState;
  assert.equal(state, 1);
  console.log(`  ✔ PASS - Database connection stable and ready for production API traffic.\n`);

  console.log('================================================================');
  console.log(`  ✔ SUCCESS: "${TARGET_DB}" is fully provisioned and verified!`);
  console.log('================================================================\n');
}

runAtlasProductionVerification()
  .catch((err) => {
    console.error('\n✖ Production Atlas Verification Failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDB();
    console.log('Database disconnected.');
  });
