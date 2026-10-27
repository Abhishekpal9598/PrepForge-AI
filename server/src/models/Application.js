import mongoose from 'mongoose';

const applicationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    resumeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Resume',
      default: null,
    },
    jobAnalysisId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'JobAnalysis',
      default: null,
    },
    companyName: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
      maxlength: [150, 'Company name cannot exceed 150 characters'],
    },
    // Supporting both jobTitle (preferred) and positionTitle (backward compatibility)
    jobTitle: {
      type: String,
      trim: true,
      maxlength: [150, 'Job title cannot exceed 150 characters'],
    },
    positionTitle: {
      type: String,
      trim: true,
      maxlength: [150, 'Position title cannot exceed 150 characters'],
    },
    jobDescription: {
      type: String,
      default: '',
      trim: true,
      maxlength: [50000, 'Job description cannot exceed 50,000 characters'],
    },
    location: {
      type: String,
      default: 'Remote',
      trim: true,
      maxlength: [150, 'Location cannot exceed 150 characters'],
    },
    employmentType: {
      type: String,
      enum: {
        values: ['Full-time', 'Part-time', 'Contract', 'Internship', 'Freelance', 'Other'],
        message: '{VALUE} is not a valid employment type',
      },
      default: 'Full-time',
    },
    // Supporting both applicationDate and appliedDate
    applicationDate: {
      type: Date,
      default: Date.now,
    },
    appliedDate: {
      type: Date,
      default: Date.now,
    },
    deadline: {
      type: Date,
      default: null,
    },
    jobUrl: {
      type: String,
      default: '',
      trim: true,
    },
    status: {
      type: String,
      required: [true, 'Application status is required'],
      enum: {
        values: [
          'Saved',
          'Applied',
          'Assessment',
          'Interview',
          'Interviewing', // Legacy alias
          'Offer',
          'Offered', // Legacy alias
          'Rejected',
          'Withdrawn',
        ],
        message: '{VALUE} is not a valid application status',
      },
      default: 'Saved',
    },
    salaryExpectation: {
      type: Number,
      default: null,
      min: [0, 'Salary expectation cannot be negative'],
    },
    notes: {
      type: String,
      default: '',
      maxlength: [5000, 'Notes cannot exceed 5000 characters'],
    },
    interviewDate: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'applications',
  }
);

/**
 * Pre-validation hook:
 * Ensures synchronization between jobTitle & positionTitle,
 * applicationDate & appliedDate, and status normalizations.
 */
applicationSchema.pre('validate', function () {
  // Synchronize title fields
  if (this.jobTitle && !this.positionTitle) {
    this.positionTitle = this.jobTitle;
  } else if (this.positionTitle && !this.jobTitle) {
    this.jobTitle = this.positionTitle;
  }

  // Ensure title is present on at least one field
  if (!this.jobTitle && !this.positionTitle) {
    this.invalidate('jobTitle', 'Job title or position title is required');
  }

  // Synchronize date fields
  if (this.applicationDate && !this.appliedDate) {
    this.appliedDate = this.applicationDate;
  } else if (this.appliedDate && !this.applicationDate) {
    this.applicationDate = this.appliedDate;
  }
});

// Indexes for high performance filtering, sorting, and user isolation
applicationSchema.index({ userId: 1, status: 1 });
applicationSchema.index({ userId: 1, updatedAt: -1 });
applicationSchema.index({ userId: 1, applicationDate: -1 });
applicationSchema.index({ userId: 1, companyName: 1 });

export const Application =
  mongoose.models.Application || mongoose.model('Application', applicationSchema);
export default Application;
