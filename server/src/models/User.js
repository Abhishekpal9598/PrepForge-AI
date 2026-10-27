import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
      minlength: [60, 'Password hash must be at least 60 characters'],
      select: false, // Omit from default queries
    },
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      minlength: [2, 'Full name must be at least 2 characters'],
      maxlength: [100, 'Full name cannot exceed 100 characters'],
    },
    targetRole: {
      type: String,
      default: '',
      trim: true,
      maxlength: [120, 'Target role cannot exceed 120 characters'],
    },
    careerLevel: {
      type: String,
      enum: {
        values: ['Entry', 'Mid', 'Senior', 'Lead', 'Executive'],
        message: '{VALUE} is not a valid career level',
      },
      default: 'Entry',
    },
    phoneNumber: {
      type: String,
      default: '',
      trim: true,
      maxlength: [30, 'Phone number cannot exceed 30 characters'],
    },
    avatar: {
      type: String,
      default: '',
      trim: true,
    },
    headline: {
      type: String,
      default: '',
      trim: true,
      maxlength: [150, 'Headline cannot exceed 150 characters'],
    },
    currentRole: {
      type: String,
      default: '',
      trim: true,
      maxlength: [120, 'Current role cannot exceed 120 characters'],
    },
    location: {
      type: String,
      default: '',
      trim: true,
      maxlength: [120, 'Location cannot exceed 120 characters'],
    },
    skills: {
      type: [String],
      default: [],
    },
    education: [
      {
        institution: { type: String, default: '', trim: true },
        degree: { type: String, default: '', trim: true },
        fieldOfStudy: { type: String, default: '', trim: true },
        graduationYear: { type: Number, default: null },
      },
    ],
    notifications: {
      interviewReminders: { type: Boolean, default: true },
      applicationReminders: { type: Boolean, default: true },
      resumeUpdates: { type: Boolean, default: true },
      jobMatchUpdates: { type: Boolean, default: true },
      productAnnouncements: { type: Boolean, default: false },
    },
    appearance: {
      theme: {
        type: String,
        enum: {
          values: ['dark', 'light', 'system'],
          message: '{VALUE} is not a valid theme',
        },
        default: 'dark',
      },
    },
    passwordChangedAt: {
      type: Date,
      default: null,
    },
    tokenVersion: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    collection: 'users',
  }
);

// Single unique collation index for case-insensitive uniqueness without duplicate index warnings
userSchema.index(
  { email: 1 },
  { unique: true, collation: { locale: 'en', strength: 2 } }
);

export const User = mongoose.models.User || mongoose.model('User', userSchema);
export default User;
