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
