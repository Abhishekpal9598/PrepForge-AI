import mongoose from 'mongoose';

const jobAnalysisSchema = new mongoose.Schema(
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
    jobTitle: {
      type: String,
      required: [true, 'Job title is required'],
      trim: true,
      maxlength: [150, 'Job title cannot exceed 150 characters'],
    },
    company: {
      type: String,
      default: '',
      trim: true,
      maxlength: [150, 'Company name cannot exceed 150 characters'],
    },
    jobDescription: {
      type: String,
      required: [true, 'Job description text is required'],
      minlength: [50, 'Job description must be at least 50 characters'],
      maxlength: [50000, 'Job description cannot exceed 50,000 characters'],
    },
    matchScore: {
      type: Number,
      required: [true, 'Semantic match score is required'],
      min: [0, 'Match score cannot be less than 0'],
      max: [100, 'Match score cannot exceed 100'],
    },
    matchedSkills: {
      type: [String],
      default: [],
    },
    missingSkills: {
      type: [String],
      default: [],
    },
    unverifiedSkills: {
      type: [String],
      default: [],
    },
    tailoringRecommendations: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
    collection: 'jobanalyses',
  }
);

// Query indexes
jobAnalysisSchema.index({ userId: 1, createdAt: -1 });
jobAnalysisSchema.index({ resumeId: 1 });

export const JobAnalysis =
  mongoose.models.JobAnalysis || mongoose.model('JobAnalysis', jobAnalysisSchema);
export default JobAnalysis;
