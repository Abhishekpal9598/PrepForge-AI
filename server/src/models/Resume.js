import mongoose from 'mongoose';

const resumeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    originalFileName: {
      type: String,
      required: [true, 'Original file name is required'],
      trim: true,
      maxlength: [255, 'File name cannot exceed 255 characters'],
    },
    storedFileName: {
      type: String,
      required: [true, 'Stored file name is required'],
      trim: true,
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
    fileType: {
      type: String,
      lowercase: true,
      trim: true,
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
    extractedText: {
      type: String,
      minlength: [20, 'Extracted text must be at least 20 characters'],
      maxlength: [500000, 'Extracted text cannot exceed 500,000 characters'],
    },
    parsedSections: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: 'resumes',
  }
);

// Synchronize backward-compatible and new fields before validation
resumeSchema.pre('validate', function () {
  if (this.extractedText && !this.rawText) {
    this.rawText = this.extractedText;
  }
  if (this.rawText && !this.extractedText) {
    this.extractedText = this.rawText;
  }
  if (this.fileType && !this.fileFormat) {
    this.fileFormat = this.fileType.toLowerCase().replace('.', '');
  }
  if (this.fileFormat && !this.fileType) {
    this.fileType = this.fileFormat;
  }
  if (!this.storedFileName && this.originalFileName) {
    this.storedFileName = `${Date.now()}-${this.originalFileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
  }
  if (!this.uploadedAt) {
    this.uploadedAt = this.createdAt || new Date();
  }
});

// Compound indexes for fast user-scoped chronological queries
resumeSchema.index({ userId: 1, createdAt: -1 });
resumeSchema.index({ userId: 1, uploadedAt: -1 });

export const Resume = mongoose.models.Resume || mongoose.model('Resume', resumeSchema);
export default Resume;
