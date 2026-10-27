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
    companyName: {
      type: String,
      default: '',
      trim: true,
      maxlength: [150, 'Company name cannot exceed 150 characters'],
    },
    location: {
      type: String,
      default: '',
      trim: true,
      maxlength: [150, 'Location cannot exceed 150 characters'],
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
    analysisResults: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    modelUsed: {
      type: String,
      default: 'gemini-3.5-flash',
      trim: true,
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

// Synchronize backward-compatible and new fields before validation
jobAnalysisSchema.pre('validate', function () {
  if (this.companyName && !this.company) {
    this.company = this.companyName;
  }
  if (this.company && !this.companyName) {
    this.companyName = this.company;
  }

  if (this.analysisResults && typeof this.analysisResults === 'object' && Object.keys(this.analysisResults).length > 0) {
    if (this.analysisResults.matchScore !== undefined && this.matchScore === undefined) {
      this.matchScore = this.analysisResults.matchScore;
    }
    if (Array.isArray(this.analysisResults.matchedSkills) && (!this.matchedSkills || this.matchedSkills.length === 0)) {
      this.matchedSkills = this.analysisResults.matchedSkills;
    }
    if (Array.isArray(this.analysisResults.missingRequiredSkills) && (!this.missingSkills || this.missingSkills.length === 0)) {
      this.missingSkills = this.analysisResults.missingRequiredSkills;
    }
    if (Array.isArray(this.analysisResults.improvementRecommendations) && (!this.tailoringRecommendations || this.tailoringRecommendations.length === 0)) {
      this.tailoringRecommendations = this.analysisResults.improvementRecommendations;
    }
  } else if (this.matchedSkills || this.missingSkills) {
    // Populate analysisResults if created via legacy structure
    this.analysisResults = {
      matchScore: this.matchScore,
      matchedSkills: this.matchedSkills || [],
      missingRequiredSkills: this.missingSkills || [],
      missingPreferredSkills: this.unverifiedSkills || [],
      improvementRecommendations: this.tailoringRecommendations || [],
    };
  }
});

// Query indexes for fast user and resume-scoped lookups
jobAnalysisSchema.index({ userId: 1, createdAt: -1 });
jobAnalysisSchema.index({ resumeId: 1, createdAt: -1 });
jobAnalysisSchema.index({ userId: 1, resumeId: 1, createdAt: -1 });

export const JobAnalysis =
  mongoose.models.JobAnalysis || mongoose.model('JobAnalysis', jobAnalysisSchema);
export default JobAnalysis;
