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
      required: [true, 'Overall composite score is required'],
      min: [0, 'Overall score cannot be less than 0'],
      max: [100, 'Overall score cannot exceed 100'],
    },
    categoryScores: {
      type: categoryScoresSchema,
      required: [true, 'Category scores breakdown is required'],
    },
    summaryFeedback: {
      type: String,
      required: [true, 'Summary evaluation feedback is required'],
      minlength: [10, 'Summary feedback must be at least 10 characters'],
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
  },
  {
    timestamps: true,
    collection: 'resumeanalyses',
  }
);

// Compound indexes for user history and resume analysis history
resumeAnalysisSchema.index({ userId: 1, createdAt: -1 });
resumeAnalysisSchema.index({ resumeId: 1, createdAt: -1 });

export const ResumeAnalysis =
  mongoose.models.ResumeAnalysis || mongoose.model('ResumeAnalysis', resumeAnalysisSchema);
export default ResumeAnalysis;
