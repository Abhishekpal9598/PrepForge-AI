import mongoose from 'mongoose';

const resumeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
    },
    originalFileName: {
      type: String,
      required: [true, 'Original file name is required'],
      trim: true,
      maxlength: [255, 'File name cannot exceed 255 characters'],
    },
    fileFormat: {
      type: String,
      required: [true, 'File format is required'],
      lowercase: true,
      enum: {
        values: ['pdf', 'docx', 'txt'],
        message: '{VALUE} is not an accepted file format. Allowed formats: pdf, docx, txt',
      },
    },
    fileSize: {
      type: Number,
      required: [true, 'File size is required'],
      min: [1, 'File size must be greater than 0 bytes'],
      max: [5242880, 'File size cannot exceed 5MB (5,242,880 bytes)'],
    },
    rawText: {
      type: String,
      required: [true, 'Raw extracted text is required'],
      minlength: [20, 'Raw text must be at least 20 characters'],
      maxlength: [500000, 'Raw text cannot exceed 500,000 characters'],
    },
    parsedSections: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    collection: 'resumes',
  }
);

// Compound index for fast user-scoped chronological queries
resumeSchema.index({ userId: 1, createdAt: -1 });

export const Resume = mongoose.models.Resume || mongoose.model('Resume', resumeSchema);
export default Resume;
