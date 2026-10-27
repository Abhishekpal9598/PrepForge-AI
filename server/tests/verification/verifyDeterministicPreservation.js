import { connectDB, disconnectDB } from '../../src/config/db.js';
import { config } from '../../src/config/env.js';
import { Resume } from '../../src/models/Resume.js';
import { ResumeAnalysis } from '../../src/models/ResumeAnalysis.js';
import { runAllChecks } from '../../src/services/resumeChecks/checkRunner.js';
import { computeMultiDimensionalScores } from '../../src/services/scoringEngine.js';
import mongoose from 'mongoose';

const runVerification = async () => {
  const testUri = process.env.TEST_MONGODB_URI || config.testMongoUri;
  await connectDB(testUri);

  console.log('--- Deterministic Engine Preservation Verification ---');

  const testUserId = new mongoose.Types.ObjectId();
  const resume = await Resume.create({
    userId: testUserId,
    title: 'Senior_Dev.pdf',
    originalFileName: 'Senior_Dev.pdf',
    fileFormat: 'pdf',
    fileSize: 80000,
    extractedText: `
      Sam Taylor
      Senior Full Stack Engineer
      sam.taylor@example.com | +1 555-0123 | Seattle, WA
      https://linkedin.com/in/samtaylor | https://github.com/samtaylor

      Summary
      Senior Engineer with 6+ years experience in Node.js and React.

      Technical Skills
      JavaScript, TypeScript, React, Node.js, PostgreSQL, Docker, AWS

      Experience
      Senior Developer — TechCorp (2021 - Present)
      • Architected microservices in Node.js reducing latency by 40%.
      • Spearheaded cloud migration to AWS saving $30,000 annually.
      • Mentored 4 engineers and conducted technical interviews.

      Education
      BS in Computer Science — University of Washington (2015 - 2019)
    `,
    parsedSections: {
      rawSections: {
        summary: 'Senior Engineer with 6+ years experience in Node.js and React.',
        skills: 'JavaScript, TypeScript, React, Node.js, PostgreSQL, Docker, AWS',
        experience: 'Senior Developer at TechCorp',
        education: 'BS in Computer Science',
      },
      detectedSections: [
        { canonicalKey: 'contact', characterCount: 90 },
        { canonicalKey: 'summary', characterCount: 65 },
        { canonicalKey: 'technicalSkills', characterCount: 75 },
        { canonicalKey: 'experience', characterCount: 400 },
        { canonicalKey: 'education', characterCount: 80 },
      ],
      sectionOrder: ['contact', 'summary', 'technicalSkills', 'experience', 'education'],
    },
  });

  // Step 1: Run Phase 3 checks & Phase 4 scoring
  const checks = await runAllChecks(resume, {});
  const scores = computeMultiDimensionalScores(checks.checks, {});

  const analysisDoc = await ResumeAnalysis.create({
    userId: testUserId,
    resumeId: resume._id,
    overallScore: scores.overallScore,
    subScores: scores.subScores,
    scoringVersion: scores.scoringVersion,
    scoreConfidence: scores.scoreConfidence,
    scoredAt: new Date(scores.scoredAt),
    scoringBreakdown: scores.scoringBreakdown,
    detailedChecks: checks.checks,
    checkSummary: checks.checkSummary,
    checkVersion: checks.engineVersion,
    evaluatedAt: new Date(checks.evaluatedAt),
  });

  console.log('\n[Before AI Analysis] Database Values:');
  console.log('  overallScore:', analysisDoc.overallScore);
  console.log('  subScores:', JSON.stringify(analysisDoc.subScores));
  console.log('  totalChecks:', analysisDoc.detailedChecks.length);
  console.log('  checkSummary:', JSON.stringify(analysisDoc.checkSummary));
  console.log('  aiAnalysis:', analysisDoc.aiAnalysis);

  const snapshotBefore = {
    overallScore: analysisDoc.overallScore,
    subScores: JSON.stringify(analysisDoc.subScores),
    checkCount: analysisDoc.detailedChecks.length,
    passedCount: analysisDoc.checkSummary.passedCount,
    warningCount: analysisDoc.checkSummary.warningCount,
    failedCount: analysisDoc.checkSummary.failedCount,
    scoringVersion: analysisDoc.scoringVersion,
    scoreConfidence: analysisDoc.scoreConfidence,
  };

  // Step 2: Attach AI analysis as the controller would
  const mockAiAnalysis = {
    summaryEvaluation: {
      clarity: 'Clear summary',
      professionalRelevance: 'High',
      technicalRelevance: 'High',
      experienceRepresentation: 'Accurate',
      genericLanguageDetected: [],
      improvementOpportunities: [],
      improvedSummary: 'Senior Full Stack Engineer with 6+ years experience.',
      sufficientEvidence: true,
    },
    experienceAnalysis: {
      responsibilityDescriptions: 'Strong responsibility ownership.',
      achievementDescriptions: 'Quantified metrics present.',
      actionVerbStrength: 'Strong',
      quantifiedImpact: 'Good impact density.',
      technicalContributions: 'Node.js and AWS.',
      relevanceAndClarity: 'Clear and relevant.',
      weakStatements: [],
    },
    skillsAnalysis: {
      technicalSkills: ['JavaScript', 'TypeScript', 'React', 'Node.js'],
      programmingLanguages: ['JavaScript', 'TypeScript'],
      frameworksAndTools: ['React', 'Node.js', 'PostgreSQL'],
      domainSkills: ['Microservices'],
      skillsPresentation: 'Clean presentation.',
      missingEvidenceSkills: [],
      unsubstantiatedClaims: [],
    },
    projectAnalysis: {
      projectCount: 0,
      projectsEvaluated: [],
      overallAssessment: 'No dedicated project section.',
    },
    improvementRecommendations: [
      {
        priority: 'Medium',
        section: 'Skills',
        problem: 'Group skills by domain',
        whyItMatters: 'Improves recruiter scanning speed',
        evidence: 'Skills list',
        suggestedImprovement: 'Group into Languages, Frameworks, and Cloud',
        expectedBenefit: 'Clearer technical profile',
      },
    ],
    strengths: ['Clean microservice architecture experience'],
    weaknesses: ['Could expand on cloud infrastructure scale'],
    sectionFeedback: { summary: 'Good', experience: 'Strong', skills: 'Solid', projects: 'N/A', education: 'Verified' },
    antiHallucinationAudit: {
      groundedFactsObserved: 8,
      bracketedMetricsTemplatesProvided: true,
      unverifiedClaimsFlagged: [],
      insufficientEvidenceSections: ['Projects'],
      disclaimer: 'All evaluations grounded in resume text.',
    },
  };

  // Update as in controller
  analysisDoc.aiAnalysis = mockAiAnalysis;
  analysisDoc.summaryFeedback = mockAiAnalysis.summaryEvaluation.improvedSummary;
  analysisDoc.strengths = mockAiAnalysis.strengths;
  analysisDoc.weaknesses = mockAiAnalysis.weaknesses;
  await analysisDoc.save();

  // Step 3: Fetch updated document and compare
  const fetchedAfter = await ResumeAnalysis.findById(analysisDoc._id);

  console.log('\n[After AI Analysis] Database Values:');
  console.log('  overallScore:', fetchedAfter.overallScore);
  console.log('  subScores:', JSON.stringify(fetchedAfter.subScores));
  console.log('  totalChecks:', fetchedAfter.detailedChecks.length);
  console.log('  checkSummary:', JSON.stringify(fetchedAfter.checkSummary));
  console.log('  aiAnalysis exists:', Boolean(fetchedAfter.aiAnalysis));

  // Assertions
  if (fetchedAfter.overallScore !== snapshotBefore.overallScore) {
    throw new Error(`FAIL: overallScore was modified! Expected ${snapshotBefore.overallScore}, got ${fetchedAfter.overallScore}`);
  }
  if (JSON.stringify(fetchedAfter.subScores) !== snapshotBefore.subScores) {
    throw new Error('FAIL: subScores was modified by AI analysis!');
  }
  if (fetchedAfter.detailedChecks.length !== snapshotBefore.checkCount) {
    throw new Error('FAIL: detailedChecks length was modified by AI analysis!');
  }
  if (fetchedAfter.checkSummary.passedCount !== snapshotBefore.passedCount) {
    throw new Error('FAIL: checkSummary.passedCount was modified by AI analysis!');
  }
  if (fetchedAfter.scoreConfidence !== snapshotBefore.scoreConfidence) {
    throw new Error('FAIL: scoreConfidence was modified by AI analysis!');
  }
  if (fetchedAfter.scoringVersion !== snapshotBefore.scoringVersion) {
    throw new Error('FAIL: scoringVersion was modified by AI analysis!');
  }
  if (!fetchedAfter.aiAnalysis?.summaryEvaluation) {
    throw new Error('FAIL: aiAnalysis was not persisted!');
  }

  console.log('\nAll Deterministic Preservation Checks PASSED with 100% fidelity!');

  // Cleanup
  await Resume.deleteMany({ _id: resume._id });
  await ResumeAnalysis.deleteMany({ _id: analysisDoc._id });
  await disconnectDB();
};

runVerification().catch(err => {
  console.error(err);
  process.exit(1);
});
