import mongoose from 'mongoose';

const bulletImprovementSchema = new mongoose.Schema(
  {
    original: {
      type: String,
      required: [true, 'Original bullet text is required'],
    },
    issue: {
      type: String,
      required: [true, 'Critique/issue description is required'],
    },
    rewrite: {
      type: String,
      required: [true, 'Recommended rewrite is required'],
    },
    impact: {
      type: String,
      required: [true, 'Impact explanation is required'],
    },
  },
  { _id: false }
);

const categoryScoresSchema = new mongoose.Schema(
  {
    impact: {
      type: Number,
      required: true,
      min: [0, 'Impact score cannot be less than 0'],
      max: [100, 'Impact score cannot exceed 100'],
    },
    brevity: {
      type: Number,
      required: true,
      min: [0, 'Brevity score cannot be less than 0'],
      max: [100, 'Brevity score cannot exceed 100'],
    },
    style: {
      type: Number,
      required: true,
      min: [0, 'Style score cannot be less than 0'],
      max: [100, 'Style score cannot exceed 100'],
    },
    skills: {
      type: Number,
      required: true,
      min: [0, 'Skills score cannot be less than 0'],
      max: [100, 'Skills score cannot exceed 100'],
    },
    atsReadability: {
      type: Number,
      required: true,
      min: [0, 'ATS readability score cannot be less than 0'],
      max: [100, 'ATS readability score cannot exceed 100'],
    },
  },
  { _id: false }
);

const identifiedSkillsSchema = new mongoose.Schema(
  {
    technical: {
      type: [String],
      default: [],
    },
    soft: {
      type: [String],
      default: [],
    },
    tools: {
      type: [String],
      default: [],
    },
  },
  { _id: false }
);

const detailedCheckResultSchema = new mongoose.Schema(
  {
    checkId: {
      type: String,
      required: true,
      trim: true,
    },
    categoryId: {
      type: String,
      required: true,
      trim: true,
    },
    categoryName: {
      type: String,
      required: true,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      required: true,
      enum: ['PASS', 'WARNING', 'FAIL', 'NOT_EVALUATED'],
    },
    severity: {
      type: String,
      required: true,
      enum: ['critical', 'high', 'medium', 'low', 'info'],
    },
    description: {
      type: String,
      default: '',
    },
    evidence: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    explanation: {
      type: String,
      default: '',
    },
    recommendation: {
      type: String,
      default: null,
    },
    confidence: {
      type: Number,
      default: 1.0,
      min: 0,
      max: 1,
    },
    limitations: {
      type: [String],
      default: [],
    },
    source: {
      type: String,
      default: 'deterministic',
    },
    ruleVersion: {
      type: String,
      default: '1.0',
    },
    evaluatedAt: {
      type: String,
      default: null,
    },
  },
  { _id: false }
);

const checkSummarySchema = new mongoose.Schema(
  {
    totalChecks: {
      type: Number,
      default: 27,
    },
    passedCount: {
      type: Number,
      default: 0,
    },
    warningCount: {
      type: Number,
      default: 0,
    },
    failedCount: {
      type: Number,
      default: 0,
    },
    notEvaluatedCount: {
      type: Number,
      default: 0,
    },
  },
  { _id: false }
);

const subScoresSchema = new mongoose.Schema(
  {
    atsScore: {
      type: Number,
      min: [0, 'ATS score cannot be less than 0'],
      max: [100, 'ATS score cannot exceed 100'],
      default: null,
    },
    contentScore: {
      type: Number,
      min: [0, 'Content score cannot be less than 0'],
      max: [100, 'Content score cannot exceed 100'],
      default: null,
    },
    structureScore: {
      type: Number,
      min: [0, 'Structure score cannot be less than 0'],
      max: [100, 'Structure score cannot exceed 100'],
      default: null,
    },
    jobMatchScore: {
      type: Number,
      min: [0, 'Job match score cannot be less than 0'],
      max: [100, 'Job match score cannot exceed 100'],
      default: null,
    },
  },
  { _id: false }
);

const resumeAnalysisSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
    },
    resumeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Resume',
      required: [true, 'Resume ID is required'],
    },
    overallScore: {
      type: Number,
      default: 0,
      min: [0, 'Overall score cannot be less than 0'],
      max: [100, 'Overall score cannot exceed 100'],
    },
    subScores: {
      type: subScoresSchema,
      default: () => ({
        atsScore: null,
        contentScore: null,
        structureScore: null,
        jobMatchScore: null,
      }),
    },
    scoringVersion: {
      type: String,
      default: null,
    },
    scoreConfidence: {
      type: Number,
      min: [0, 'Score confidence cannot be less than 0'],
      max: [1, 'Score confidence cannot exceed 1'],
      default: null,
    },
    scoredAt: {
      type: Date,
      default: null,
    },
    scoringBreakdown: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    aiAnalysis: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    analysisResults: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    modelUsed: {
      type: String,
      default: 'gemini-3.5-flash',
      trim: true,
    },
    categoryScores: {
      type: categoryScoresSchema,
      default: () => ({
        impact: 75,
        brevity: 75,
        style: 75,
        skills: 75,
        atsReadability: 75,
      }),
    },
    summaryFeedback: {
      type: String,
      default: 'Comprehensive ATS resume analysis completed successfully.',
    },
    bulletImprovements: {
      type: [bulletImprovementSchema],
      default: [],
    },
    strengths: {
      type: [String],
      default: [],
    },
    weaknesses: {
      type: [String],
      default: [],
    },
    identifiedSkills: {
      type: identifiedSkillsSchema,
      default: () => ({ technical: [], soft: [], tools: [] }),
    },
    detailedChecks: {
      type: [detailedCheckResultSchema],
      default: [],
    },
    checkSummary: {
      type: checkSummarySchema,
      default: null,
    },
    checkVersion: {
      type: String,
      default: '1.0.0',
    },
    evaluatedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'resumeanalyses',
  }
);

// Synchronize backward-compatible and structured analysisResults
resumeAnalysisSchema.pre('validate', function () {
  if (this.analysisResults && typeof this.analysisResults === 'object' && Object.keys(this.analysisResults).length > 0) {
    if (this.analysisResults.overallScore !== undefined && this.overallScore === undefined) {
      this.overallScore = this.analysisResults.overallScore;
    }
    if (this.analysisResults.resumeSummary && (!this.summaryFeedback || this.summaryFeedback === 'Comprehensive ATS resume analysis completed successfully.')) {
      this.summaryFeedback = this.analysisResults.resumeSummary;
    }
    if (this.analysisResults.categoryScores && (!this.categoryScores || this.categoryScores.impact === undefined)) {
      this.categoryScores = this.analysisResults.categoryScores;
    }
    if (Array.isArray(this.analysisResults.strengths) && (!this.strengths || this.strengths.length === 0)) {
      this.strengths = this.analysisResults.strengths;
    }
    if (Array.isArray(this.analysisResults.weaknesses) && (!this.weaknesses || this.weaknesses.length === 0)) {
      this.weaknesses = this.analysisResults.weaknesses;
    }
    if (this.analysisResults.technicalSkills || this.analysisResults.softSkills) {
      this.identifiedSkills = {
        technical: this.analysisResults.technicalSkills || this.identifiedSkills?.technical || [],
        soft: this.analysisResults.softSkills || this.identifiedSkills?.soft || [],
        tools: this.identifiedSkills?.tools || [],
      };
    }
  } else if (this.categoryScores && this.summaryFeedback) {
    // Populate analysisResults if created via legacy structure
    this.analysisResults = {
      overallScore: this.overallScore,
      resumeSummary: this.summaryFeedback,
      categoryScores: this.categoryScores,
      technicalSkills: this.identifiedSkills?.technical || [],
      softSkills: this.identifiedSkills?.soft || [],
      strengths: this.strengths || [],
      weaknesses: this.weaknesses || [],
    };
  }
});

// Compound indexes for user history and resume analysis history
resumeAnalysisSchema.index({ userId: 1, createdAt: -1 });
resumeAnalysisSchema.index({ resumeId: 1, createdAt: -1 });
resumeAnalysisSchema.index({ userId: 1, resumeId: 1, createdAt: -1 });

export const ResumeAnalysis =
  mongoose.models.ResumeAnalysis || mongoose.model('ResumeAnalysis', resumeAnalysisSchema);
export default ResumeAnalysis;

