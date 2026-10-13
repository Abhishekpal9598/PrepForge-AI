import mongoose from 'mongoose';

const applicationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
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
    positionTitle: {
      type: String,
      required: [true, 'Position title is required'],
      trim: true,
      maxlength: [150, 'Position title cannot exceed 150 characters'],
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
        values: ['Saved', 'Applied', 'Interviewing', 'Offered', 'Rejected', 'Withdrawn'],
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
      maxlength: [2000, 'Notes cannot exceed 2000 characters'],
    },
    appliedDate: {
      type: Date,
      default: null,
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

// Kanban column query index & recent activity index
applicationSchema.index({ userId: 1, status: 1 });
applicationSchema.index({ userId: 1, updatedAt: -1 });

export const Application =
  mongoose.models.Application || mongoose.model('Application', applicationSchema);
export default Application;
