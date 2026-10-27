import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { logger } from '../src/utils/logger.js';
import { User } from '../src/models/User.js';
import { Resume } from '../src/models/Resume.js';
import { ResumeAnalysis } from '../src/models/ResumeAnalysis.js';
import { JobAnalysis } from '../src/models/JobAnalysis.js';
import { InterviewSession } from '../src/models/InterviewSession.js';
import { Application } from '../src/models/Application.js';

/**
 * Production Index Synchronization Script
 * Synchronizes compound and unique indexes across all 6 collections in MongoDB Atlas
 * without deleting any documents or altering production data.
 */
async function syncAllIndexes() {
  console.log('========================================================');
  console.log('  PrepForge AI — Production Database Index Synchronization');
  console.log('========================================================\n');

  try {
    await connectDB();
    const dbName = mongoose.connection.name;
    const host = mongoose.connection.host;
    console.log(`Connected to Database: "${dbName}" on host: ${host}\n`);

    const models = [
      { name: 'User', model: User },
      { name: 'Resume', model: Resume },
      { name: 'ResumeAnalysis', model: ResumeAnalysis },
      { name: 'JobAnalysis', model: JobAnalysis },
      { name: 'InterviewSession', model: InterviewSession },
      { name: 'Application', model: Application },
    ];

    for (const { name, model } of models) {
      console.log(`Synchronizing indexes for model: ${name}...`);
      const syncResult = await model.syncIndexes();
      const currentIndexes = await model.collection.indexes();
      console.log(`  ✔ [${name}] Active indexes (${currentIndexes.length}):`);
      currentIndexes.forEach((idx) => {
        console.log(`     - ${idx.name}: ${JSON.stringify(idx.key)}`);
      });
      console.log('');
    }

    console.log('✔ All collection indexes successfully verified and synchronized.\n');
  } catch (error) {
    console.error('✖ Error synchronizing database indexes:', error.message);
    process.exitCode = 1;
  } finally {
    await disconnectDB();
    console.log('Database connection closed.');
  }
}

syncAllIndexes();
