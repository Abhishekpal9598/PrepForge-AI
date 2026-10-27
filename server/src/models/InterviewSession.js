import mongoose from 'mongoose';

/**
 * Question Evaluation Subdocument Schema
 */
const questionEvaluationSchema = new mongoose.Schema(
  {
    score: {
      type: Number,
      min: [0, 'Evaluation score cannot be less than 0'],
      max: [100, 'Evaluation score cannot exceed 100'],
      default: 0,
    },
    overallScore: {
      type: Number,
      min: [0, 'Evaluation score cannot be less than 0'],
      max: [100, 'Evaluation score cannot exceed 100'],
      default: 0,
    },
    categoryScores: {
      technicalAccuracy: { type: Number, min: 0, max: 100, default: 0 },
      relevance: { type: Number, min: 0, max: 100, default: 0 },
      completeness: { type: Number, min: 0, max: 100, default: 0 },
      clarity: { type: Number, min: 0, max: 100, default: 0 },
      communicationQuality: { type: Number, min: 0, max: 100, default: 0 },
    },
    correctPoints: {
      type: [String],
      default: [],
    },
    missingPoints: {
      type: [String],
      default: [],
    },
    incorrectStatements: {
      type: [String],
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
    suggestions: {
      type: [String],
      default: [],
    },
    exampleImprovedAnswer: {
      type: String,
      default: '',
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

/**
 * Interview Question Subdocument Schema
 */
const interviewQuestionSchema = new mongoose.Schema({
  questionId: {
    type: String,
    required: true,
    default: () => new mongoose.Types.ObjectId().toString(),
  },
  questionText: {
    type: String,
    required: [true, 'Question text is required'],
    trim: true,
  },
  category: {
    type: String,
    required: [true, 'Question category is required'],
    enum: {
      values: ['Technical', 'HR', 'Behavioral', 'Role-Based', 'General', 'Situational', 'Conceptual'],
      message: '{VALUE} is not an accepted question category',
    },
    default: 'Technical',
  },
  difficulty: {
    type: String,
    required: [true, 'Question difficulty is required'],
    enum: {
      values: ['Easy', 'Medium', 'Hard', 'Junior', 'Mid', 'Senior'],
      message: '{VALUE} is not an accepted difficulty tier',
    },
    default: 'Medium',
  },
  questionType: {
    type: String,
    enum: {
      values: ['Technical', 'Conceptual', 'Behavioral', 'Situational'],
      message: '{VALUE} is not an accepted question type',
    },
    default: 'Technical',
  },
  expectedAnswerPoints: {
    type: [String],
    default: [],
  },
  sampleKeyPoints: {
    type: [String],
    default: [],
  },
  userAnswer: {
    type: String,
    default: '',
  },
  submittedAt: {
    type: Date,
    default: null,
  },
  evaluation: {
    type: questionEvaluationSchema,
    default: null,
  },
});

/**
 * Final Evaluation Schema
 */
const finalEvaluationSchema = new mongoose.Schema(
  {
    overallScore: {
      type: Number,
      min: [0, 'Overall score cannot be less than 0'],
      max: [100, 'Overall score cannot exceed 100'],
      required: true,
    },
    categoryScores: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    technicalAssessment: {
      type: String,
      default: '',
    },
    communicationAssessment: {
      type: String,
      default: '',
    },
    strongestAnswers: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    weakestAnswers: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    improvementRecommendations: {
      type: [String],
      default: [],
    },
    suggestedTopics: {
      type: [String],
      default: [],
    },
    finalAssessmentLabel: {
      type: String,
      enum: ['Excellent', 'Strong', 'Good', 'Needs Improvement'],
      default: 'Good',
    },
    aiDisclaimer: {
      type: String,
      default:
        'AI-generated evaluation for interview preparation purposes. This does not represent an actual hiring decision or employment guarantee.',
    },
    evaluatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

/**
 * Master InterviewSession Schema
 */
const interviewSessionSchema = new mongoose.Schema(
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
    interviewTitle: {
      type: String,
      required: [true, 'Interview title is required'],
      trim: true,
      maxlength: [180, 'Interview title cannot exceed 180 characters'],
    },
    jobRole: {
      type: String,
      required: [true, 'Job role is required'],
      trim: true,
      maxlength: [150, 'Job role cannot exceed 150 characters'],
    },
    jobTitle: {
      type: String,
      trim: true,
      maxlength: [150, 'Job title cannot exceed 150 characters'],
    },
    experienceLevel: {
      type: String,
      enum: {
        values: ['Fresher', 'Junior', 'Mid-Level', 'Senior', 'Lead'],
        message: '{VALUE} is not a valid experience level',
      },
      default: 'Mid-Level',
    },
    category: {
      type: String,
      enum: {
        values: ['Technical', 'HR', 'Behavioral', 'Role-Based', 'General'],
        message: '{VALUE} is not a valid interview category',
      },
      default: 'Technical',
    },
    difficulty: {
      type: String,
      enum: {
        values: ['Easy', 'Medium', 'Hard'],
        message: '{VALUE} is not a valid difficulty level',
      },
      default: 'Medium',
    },
    totalQuestions: {
      type: Number,
      required: true,
      min: [1, 'Must have at least 1 question'],
      max: [25, 'Cannot exceed 25 questions'],
      default: 5,
    },
    currentQuestionIndex: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: {
        values: ['pending', 'in_progress', 'completed', 'abandoned'],
        message: '{VALUE} is not a valid session status',
      },
      default: 'pending',
      index: true,
    },
    questions: {
      type: [interviewQuestionSchema],
      default: [],
    },
    answers: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    evaluations: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    overallScore: {
      type: Number,
      min: [0, 'Overall score cannot be less than 0'],
      max: [100, 'Overall score cannot exceed 100'],
      default: null,
    },
    finalEvaluation: {
      type: finalEvaluationSchema,
      default: null,
    },
    additionalInstructions: {
      type: String,
      trim: true,
      maxlength: [1000, 'Additional instructions cannot exceed 1000 characters'],
      default: '',
    },
    startedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    modelUsed: {
      type: String,
      default: 'gemini-3.5-flash',
    },
  },
  {
    timestamps: true,
    collection: 'interviewsessions',
  }
);

// Synchronization and backward-compatibility lifecycle hook
interviewSessionSchema.pre('validate', function () {
  // Synchronize jobTitle, jobRole, and interviewTitle
  if (this.jobRole && !this.jobTitle) {
    this.jobTitle = this.jobRole;
  } else if (this.jobTitle && !this.jobRole) {
    this.jobRole = this.jobTitle;
  }

  if (!this.interviewTitle) {
    this.interviewTitle = this.jobRole ? `${this.jobRole} Mock Interview` : 'Mock Interview Session';
  }

  if (!this.jobTitle && this.interviewTitle) {
    this.jobTitle = this.interviewTitle;
  }
  if (!this.jobRole && this.interviewTitle) {
    this.jobRole = this.interviewTitle;
  }

  // Synchronize question fields and sub-evaluations
  if (Array.isArray(this.questions)) {
    this.questions.forEach((q, idx) => {
      if (!q.questionId) {
        q.questionId = `q_${idx + 1}_${Math.random().toString(36).substring(2, 9)}`;
      }

      if (
        Array.isArray(q.sampleKeyPoints) &&
        q.sampleKeyPoints.length > 0 &&
        (!q.expectedAnswerPoints || q.expectedAnswerPoints.length === 0)
      ) {
        q.expectedAnswerPoints = [...q.sampleKeyPoints];
      } else if (
        Array.isArray(q.expectedAnswerPoints) &&
        q.expectedAnswerPoints.length > 0 &&
        (!q.sampleKeyPoints || q.sampleKeyPoints.length === 0)
      ) {
        q.sampleKeyPoints = [...q.expectedAnswerPoints];
      }

      if (q.evaluation) {
        if (q.evaluation.score && !q.evaluation.overallScore) {
          q.evaluation.overallScore = q.evaluation.score;
        } else if (q.evaluation.overallScore && !q.evaluation.score) {
          q.evaluation.score = q.evaluation.overallScore;
        }
        if (q.evaluation.modelAnswer && !q.evaluation.exampleImprovedAnswer) {
          q.evaluation.exampleImprovedAnswer = q.evaluation.modelAnswer;
        } else if (q.evaluation.exampleImprovedAnswer && !q.evaluation.modelAnswer) {
          q.evaluation.modelAnswer = q.evaluation.exampleImprovedAnswer;
        }
      }
    });

    if (this.questions.length > 0 && (!this.totalQuestions || this.totalQuestions === 5)) {
      this.totalQuestions = this.questions.length;
    }
  }
});

// Indexes for performance and sorting
interviewSessionSchema.index({ userId: 1, createdAt: -1 });
interviewSessionSchema.index({ userId: 1, status: 1 });
interviewSessionSchema.index({ resumeId: 1 });
interviewSessionSchema.index({ jobAnalysisId: 1 });

export const InterviewSession =
  mongoose.models.InterviewSession || mongoose.model('InterviewSession', interviewSessionSchema);

export default InterviewSession;
