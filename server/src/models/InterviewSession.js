import mongoose from 'mongoose';

const questionEvaluationSchema = new mongoose.Schema(
  {
    score: {
      type: Number,
      min: [0, 'Evaluation score cannot be less than 0'],
      max: [100, 'Evaluation score cannot exceed 100'],
    },
    strengths: {
      type: [String],
      default: [],
    },
    weaknesses: {
      type: [String],
      default: [],
    },
    missingPoints: {
      type: [String],
      default: [],
    },
    modelAnswer: {
      type: String,
      default: '',
    },
    evaluatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const interviewQuestionSchema = new mongoose.Schema({
  questionText: {
    type: String,
    required: [true, 'Question text is required'],
  },
  category: {
    type: String,
    required: [true, 'Question category is required'],
    enum: {
      values: ['Technical', 'Behavioral', 'Situational'],
      message: '{VALUE} is not an accepted question category',
    },
  },
  difficulty: {
    type: String,
    required: [true, 'Question difficulty is required'],
    enum: {
      values: ['Junior', 'Mid', 'Senior'],
      message: '{VALUE} is not an accepted difficulty tier',
    },
  },
  sampleKeyPoints: {
    type: [String],
    default: [],
  },
  userAnswer: {
    type: String,
    default: '',
  },
  evaluation: {
    type: questionEvaluationSchema,
    default: null,
  },
});

const interviewSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
    },
    resumeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Resume',
      default: null, // Optional: supports role-based standalone mock interview sessions
    },
    jobTitle: {
      type: String,
      required: [true, 'Job title is required'],
      trim: true,
      maxlength: [150, 'Job title cannot exceed 150 characters'],
    },
    questions: {
      type: [interviewQuestionSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    collection: 'interviewsessions',
  }
);

// Chronological user session index
interviewSessionSchema.index({ userId: 1, createdAt: -1 });

export const InterviewSession =
  mongoose.models.InterviewSession ||
  mongoose.model('InterviewSession', interviewSessionSchema);
export default InterviewSession;
