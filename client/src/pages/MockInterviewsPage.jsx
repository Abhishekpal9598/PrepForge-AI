import React, { useState, useEffect, useRef } from 'react';
import {
  Bot,
  Sparkles,
  Play,
  CheckCircle2,
  AlertCircle,
  Clock,
  Mic,
  MicOff,
  Send,
  Layers,
  Award,
  ChevronRight,
  ArrowRight,
  RotateCcw,
  BookOpen,
  Trash2,
  HelpCircle,
  FileText,
  Briefcase,
  Sliders,
  TrendingUp,
  ShieldCheck,
  Check,
  Copy,
  Info,
  XCircle,
} from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import {
  createInterviewSession,
  fetchInterviewSessions,
  fetchInterviewSessionById,
  startInterviewSession,
  submitInterviewAnswer,
  completeInterviewSession,
  deleteInterviewSession,
  fetchResumes,
  fetchJobAnalyses,
} from '../services/api';

/**
 * PrepForge AI - AI Mock Interview Simulator (Phase 4)
 * Complete 7-Step Lifecycle:
 * 1. Setup -> 2. Instructions -> 3. Question -> 4. Answer -> 5. AI Feedback -> 6. Next Question -> 7. Final Report
 */
export const MockInterviewsPage = () => {
  // Navigation / Step View State: 'setup' | 'instructions' | 'question' | 'feedback' | 'report' | 'history'
  const [viewState, setViewState] = useState('setup');

  // Form setup inputs
  const [interviewTitle, setInterviewTitle] = useState('');
  const [jobRole, setJobRole] = useState('Senior Full Stack Engineer');
  const [experienceLevel, setExperienceLevel] = useState('Senior');
  const [category, setCategory] = useState('Technical');
  const [difficulty, setDifficulty] = useState('Medium');
  const [numberOfQuestions, setNumberOfQuestions] = useState(5);
  const [selectedResumeId, setSelectedResumeId] = useState('');
  const [selectedJobId, setSelectedJobId] = useState('');
  const [additionalInstructions, setAdditionalInstructions] = useState('');

  // Dropdown data options
  const [userResumes, setUserResumes] = useState([]);
  const [userJobAnalyses, setUserJobAnalyses] = useState([]);
  const [recentSessions, setRecentSessions] = useState([]);

  // Active Session State
  const [activeSession, setActiveSession] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswerText, setUserAnswerText] = useState('');
  const [latestEvaluation, setLatestEvaluation] = useState(null);

  // Status & Loaders
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [copiedModelAnswer, setCopiedModelAnswer] = useState(false);

  // Audio / Speech-to-text
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef(null);

  // Confirmation Modals
  const [showExitModal, setShowExitModal] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState(null);

  // Load user resumes, job analyses, and session history on mount
  useEffect(() => {
    loadPrerequisites();
  }, []);

  const loadPrerequisites = async () => {
    try {
      const [resumesRes, jobsRes, sessionsRes] = await Promise.allSettled([
        fetchResumes(),
        fetchJobAnalyses(),
        fetchInterviewSessions({ limit: 5 }),
      ]);

      if (resumesRes.status === 'fulfilled' && resumesRes.value.data) {
        setUserResumes(resumesRes.value.data);
      }
      if (jobsRes.status === 'fulfilled' && jobsRes.value.data) {
        setUserJobAnalyses(jobsRes.value.data);
      }
      if (sessionsRes.status === 'fulfilled' && sessionsRes.value.data) {
        setRecentSessions(sessionsRes.value.data);
      }
    } catch (err) {
      console.warn('Prerequisites load warning:', err.message);
    }
  };

  // Speech Recognition Setup (Web Speech API)
  const toggleSpeechRecognition = () => {
    if (isRecording) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsRecording(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setErrorMessage('Speech recognition is not supported in this browser. Please type your response.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setUserAnswerText((prev) => (prev ? `${prev} ${transcript}` : transcript));
      };

      recognition.onerror = (event) => {
        console.warn('Speech recognition error:', event.error);
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognition.start();
      recognitionRef.current = recognition;
      setIsRecording(true);
      setErrorMessage('');
    } catch (err) {
      console.warn('Failed to start speech recognition:', err);
      setIsRecording(false);
    }
  };

  // Step 1 -> Step 2: Generate Interview
  const handleGenerateInterview = async (e) => {
    e?.preventDefault();
    setErrorMessage('');
    setIsGenerating(true);

    try {
      const payload = {
        interviewTitle: interviewTitle.trim() || `${jobRole} (${category}) Mock Interview`,
        jobRole: jobRole.trim(),
        experienceLevel,
        category,
        difficulty,
        numberOfQuestions: Number(numberOfQuestions),
        resumeId: selectedResumeId || null,
        jobAnalysisId: selectedJobId || null,
        additionalInstructions: additionalInstructions.trim(),
      };

      const res = await createInterviewSession(payload);
      setActiveSession(res.data);
      setCurrentQuestionIndex(0);
      setUserAnswerText('');
      setLatestEvaluation(null);
      setViewState('instructions');
      loadPrerequisites(); // Refresh history
    } catch (err) {
      setErrorMessage(err.message || 'Failed to generate interview questions. Please retry.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Step 2 -> Step 3: Start Interview
  const handleStartInterview = async () => {
    if (!activeSession) return;
    setErrorMessage('');
    try {
      const res = await startInterviewSession(activeSession._id);
      setActiveSession(res.data);
      setCurrentQuestionIndex(res.data.currentQuestionIndex || 0);
      setViewState('question');
    } catch (err) {
      setErrorMessage(err.message || 'Failed to start interview.');
    }
  };

  // Step 4 -> Step 5: Submit Answer & Receive AI Evaluation
  const handleSubmitAnswer = async () => {
    if (!activeSession || !userAnswerText.trim()) return;
    if (userAnswerText.trim().length < 5) {
      setErrorMessage('Please provide a substantive answer (at least 5 characters).');
      return;
    }

    if (isRecording && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }

    const currentQuestion = activeSession.questions[currentQuestionIndex];
    if (!currentQuestion) return;

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const res = await submitInterviewAnswer(activeSession._id, {
        questionId: currentQuestion.questionId,
        answerText: userAnswerText.trim(),
      });

      setLatestEvaluation(res.data.evaluation);

      // Update in-memory session with evaluated question
      const updatedQuestions = [...activeSession.questions];
      updatedQuestions[currentQuestionIndex] = {
        ...currentQuestion,
        userAnswer: userAnswerText.trim(),
        evaluation: res.data.evaluation,
      };

      setActiveSession({
        ...activeSession,
        questions: updatedQuestions,
        currentQuestionIndex: res.data.currentQuestionIndex,
      });

      setViewState('feedback');
    } catch (err) {
      setErrorMessage(err.message || 'Failed to evaluate answer. Please try submitting again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 6: Advance to Next Question
  const handleNextQuestion = () => {
    if (!activeSession) return;
    const nextIdx = currentQuestionIndex + 1;
    if (nextIdx < activeSession.questions.length) {
      setCurrentQuestionIndex(nextIdx);
      const nextQ = activeSession.questions[nextIdx];
      setUserAnswerText(nextQ?.userAnswer || '');
      setLatestEvaluation(nextQ?.evaluation || null);
      setViewState('question');
    } else {
      // Completed all questions -> Trigger final report
      handleCompleteInterview();
    }
  };

  // Step 7: Complete Interview & View Final Report
  const handleCompleteInterview = async () => {
    if (!activeSession) return;
    setIsCompleting(true);
    setErrorMessage('');

    try {
      const res = await completeInterviewSession(activeSession._id);
      setActiveSession(res.data);
      setViewState('report');
      loadPrerequisites();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to complete interview and synthesize report.');
    } finally {
      setIsCompleting(false);
    }
  };

  // Resume or Inspect a Previous Session
  const handleInspectSession = async (sessionId) => {
    setErrorMessage('');
    try {
      const res = await fetchInterviewSessionById(sessionId);
      const session = res.data;
      setActiveSession(session);

      if (session.status === 'completed' && session.finalEvaluation) {
        setViewState('report');
      } else if (session.status === 'in_progress' || session.status === 'pending') {
        // Find first unanswered question
        const unansweredIdx = session.questions.findIndex((q) => !q.userAnswer);
        const targetIdx = unansweredIdx !== -1 ? unansweredIdx : 0;
        setCurrentQuestionIndex(targetIdx);
        setUserAnswerText(session.questions[targetIdx]?.userAnswer || '');
        setLatestEvaluation(session.questions[targetIdx]?.evaluation || null);
        setViewState(session.status === 'pending' ? 'instructions' : 'question');
      }
    } catch (err) {
      setErrorMessage('Failed to load session details.');
    }
  };

  // Delete Session
  const handleDeleteSession = async (sessionId) => {
    try {
      await deleteInterviewSession(sessionId);
      setSuccessMessage('Interview session removed successfully.');
      setTimeout(() => setSuccessMessage(''), 4000);
      setDeleteTargetId(null);
      if (activeSession?._id === sessionId) {
        setActiveSession(null);
        setViewState('setup');
      }
      loadPrerequisites();
    } catch (err) {
      setErrorMessage('Failed to delete interview session.');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedModelAnswer(true);
    setTimeout(() => setCopiedModelAnswer(false), 2500);
  };

  // Current Question
  const currentQ = activeSession?.questions?.[currentQuestionIndex];
  const totalQ = activeSession?.questions?.length || numberOfQuestions;
  const progressPercent = Math.round(((currentQuestionIndex + 1) / totalQ) * 100);

  // Score color helper
  const getScoreColor = (score) => {
    if (score >= 80) return 'text-status-success';
    if (score >= 60) return 'text-brand-secondary';
    if (score >= 40) return 'text-status-warning';
    return 'text-status-error';
  };

  const getScoreBadgeBg = (score) => {
    if (score >= 80) return 'bg-status-success/15 border-status-success/30 text-status-success';
    if (score >= 60) return 'bg-brand-secondary/15 border-brand-secondary/30 text-brand-secondary';
    if (score >= 40) return 'bg-status-warning/15 border-status-warning/30 text-status-warning';
    return 'bg-status-error/15 border-status-error/30 text-status-error';
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <PageHeader
        title="AI Mock Interview Simulator"
        subtitle="Simulate real-world technical and behavioral interviews with real-time Gemini evaluation and actionable feedback."
        badgeText="Production AI"
      />

      {/* Global Alerts */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-status-error/15 border border-status-error/30 text-status-error flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="text-sm flex-1">
            <p className="font-semibold">Error</p>
            <p className="opacity-90">{errorMessage}</p>
          </div>
          <button onClick={() => setErrorMessage('')} className="text-status-error hover:opacity-75">
            <XCircle className="w-5 h-5" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-xl bg-status-success/15 border border-status-success/30 text-status-success flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-medium">{successMessage}</p>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. SETUP VIEW */}
      {/* ========================================================================= */}
      {viewState === 'setup' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Setup Form */}
            <Card className="lg:col-span-2 space-y-6 bg-dark-card border-border-subtle">
              <div className="border-b border-border-subtle pb-4">
                <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-brand-primary" />
                  Configure Your Mock Interview
                </h3>
                <p className="text-xs text-text-secondary mt-1">
                  Customize the simulation track, difficulty, and personalize questions using your uploaded resume or target job description.
                </p>
              </div>

              <form onSubmit={handleGenerateInterview} className="space-y-5">
                {/* Job Role & Title */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-text-primary mb-1.5">
                      Target Job Role *
                    </label>
                    <input
                      type="text"
                      required
                      value={jobRole}
                      onChange={(e) => setJobRole(e.target.value)}
                      placeholder="e.g. Senior Full Stack Engineer"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-dark-surface border border-border-subtle text-text-primary placeholder:text-text-muted text-sm focus:outline-none focus:border-brand-primary transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-text-primary mb-1.5">
                      Interview Session Title (Optional)
                    </label>
                    <input
                      type="text"
                      value={interviewTitle}
                      onChange={(e) => setInterviewTitle(e.target.value)}
                      placeholder="e.g. Stripe Cloud Architecture Practice"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-dark-surface border border-border-subtle text-text-primary placeholder:text-text-muted text-sm focus:outline-none focus:border-brand-primary transition-colors"
                    />
                  </div>
                </div>

                {/* Role Level, Category & Difficulty */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-text-primary mb-1.5">
                      Experience Level
                    </label>
                    <select
                      value={experienceLevel}
                      onChange={(e) => setExperienceLevel(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-dark-surface border border-border-subtle text-text-primary text-sm focus:outline-none focus:border-brand-primary transition-colors"
                    >
                      {['Fresher', 'Junior', 'Mid-Level', 'Senior', 'Lead'].map((lvl) => (
                        <option key={lvl} value={lvl} className="bg-dark-surface text-text-primary">
                          {lvl}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-text-primary mb-1.5">
                      Interview Category
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-dark-surface border border-border-subtle text-text-primary text-sm focus:outline-none focus:border-brand-primary transition-colors"
                    >
                      {['Technical', 'HR', 'Behavioral', 'Role-Based', 'General'].map((cat) => (
                        <option key={cat} value={cat} className="bg-dark-surface text-text-primary">
                          {cat} Round
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-text-primary mb-1.5">
                      Difficulty Level
                    </label>
                    <select
                      value={difficulty}
                      onChange={(e) => setDifficulty(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-dark-surface border border-border-subtle text-text-primary text-sm focus:outline-none focus:border-brand-primary transition-colors"
                    >
                      {['Easy', 'Medium', 'Hard'].map((diff) => (
                        <option key={diff} value={diff} className="bg-dark-surface text-text-primary">
                          {diff}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Question Count Selection */}
                <div>
                  <label className="block text-xs font-semibold text-text-primary mb-1.5">
                    Number of Interview Questions
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {[5, 10, 15].map((cnt) => (
                      <button
                        key={cnt}
                        type="button"
                        onClick={() => setNumberOfQuestions(cnt)}
                        className={`py-2 px-4 rounded-xl border text-sm font-semibold transition-all ${
                          numberOfQuestions === cnt
                            ? 'bg-brand-primary/20 border-brand-primary text-brand-primary shadow-sm'
                            : 'bg-dark-surface border-border-subtle text-text-secondary hover:text-text-primary'
                        }`}
                      >
                        {cnt} Questions
                      </button>
                    ))}
                  </div>
                </div>

                {/* Optional Context: Resume & Job Analysis */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border-subtle">
                  <div>
                    <label className="block text-xs font-semibold text-text-primary mb-1.5 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-brand-secondary" />
                      Personalize with Resume (Optional)
                    </label>
                    <select
                      value={selectedResumeId}
                      onChange={(e) => setSelectedResumeId(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-dark-surface border border-border-subtle text-text-primary text-xs focus:outline-none focus:border-brand-primary transition-colors"
                    >
                      <option value="">No Resume (Role-based Practice)</option>
                      {userResumes.map((res) => (
                        <option key={res._id} value={res._id} className="bg-dark-surface text-text-primary">
                          {res.originalFileName} ({new Date(res.uploadedAt).toLocaleDateString()})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-text-primary mb-1.5 flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5 text-brand-primary" />
                      Target Job Analysis (Optional)
                    </label>
                    <select
                      value={selectedJobId}
                      onChange={(e) => setSelectedJobId(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-dark-surface border border-border-subtle text-text-primary text-xs focus:outline-none focus:border-brand-primary transition-colors"
                    >
                      <option value="">No Job Match Context</option>
                      {userJobAnalyses.map((job) => (
                        <option key={job._id} value={job._id} className="bg-dark-surface text-text-primary">
                          {job.jobTitle} - {job.companyName || 'Company'} ({job.matchScore}% Match)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Additional Guidance / Topics */}
                <div>
                  <label className="block text-xs font-semibold text-text-primary mb-1.5">
                    Specific Focus Areas or Additional Instructions (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={additionalInstructions}
                    onChange={(e) => setAdditionalInstructions(e.target.value)}
                    placeholder="e.g. Focus on microservice communication, database indexing, and conflict resolution scenarios."
                    className="w-full px-3.5 py-2 rounded-xl bg-dark-surface border border-border-subtle text-text-primary placeholder:text-text-muted text-xs focus:outline-none focus:border-brand-primary transition-colors resize-none"
                  />
                </div>

                {/* Submit Action */}
                <div className="pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    isLoading={isGenerating}
                    leftIcon={Sparkles}
                    className="w-full"
                  >
                    {isGenerating
                      ? 'Generating Tailored Questions with Gemini AI...'
                      : 'Generate AI Mock Interview Session'}
                  </Button>
                </div>
              </form>
            </Card>

            {/* Recent Sessions & Quick Tips */}
            <div className="space-y-6">
              {/* Quick Tips Card */}
              <Card className="bg-dark-card border-border-subtle space-y-3">
                <h4 className="text-sm font-bold text-text-primary flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-status-success" />
                  Simulation Best Practices
                </h4>
                <ul className="text-xs text-text-secondary space-y-2 leading-relaxed">
                  <li className="flex items-start gap-2">
                    <span className="text-brand-primary font-bold">•</span>
                    <span>Use the <strong>STAR Method</strong> (Situation, Task, Action, Result) for behavioral answers.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-brand-primary font-bold">•</span>
                    <span>For technical questions, explain <strong>trade-offs</strong>, scalability, and edge cases.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-brand-primary font-bold">•</span>
                    <span>Gemini provides a full <strong>model answer</strong> and scoring for every single question.</span>
                  </li>
                </ul>
              </Card>

              {/* Past Sessions Drawer */}
              <Card className="bg-dark-card border-border-subtle space-y-4">
                <div className="flex items-center justify-between border-b border-border-subtle pb-3">
                  <h4 className="text-sm font-bold text-text-primary flex items-center gap-2">
                    <Clock className="w-4 h-4 text-brand-secondary" />
                    Recent Sessions ({recentSessions.length})
                  </h4>
                  <button
                    onClick={() => setViewState('history')}
                    className="text-xs text-brand-primary hover:underline font-medium"
                  >
                    View All
                  </button>
                </div>

                {recentSessions.length === 0 ? (
                  <p className="text-xs text-text-secondary py-3 text-center">
                    No past sessions yet. Create your first interview!
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {recentSessions.slice(0, 4).map((sess) => (
                      <div
                        key={sess._id}
                        className="p-3 rounded-xl bg-dark-elevated border border-border-subtle hover:border-brand-primary/40 transition-colors flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="truncate space-y-0.5">
                          <p className="font-semibold text-text-primary truncate">{sess.jobRole}</p>
                          <div className="flex items-center gap-2 text-[10px] text-text-secondary">
                            <span className="capitalize">{sess.category}</span>
                            <span>•</span>
                            <span
                              className={`capitalize font-bold ${
                                sess.status === 'completed'
                                  ? 'text-status-success'
                                  : sess.status === 'in_progress'
                                  ? 'text-brand-secondary'
                                  : 'text-text-secondary'
                              }`}
                            >
                              {sess.status.replace('_', ' ')}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          {sess.overallScore !== null && (
                            <span className={`font-bold ${getScoreColor(sess.overallScore)}`}>
                              {sess.overallScore}%
                            </span>
                          )}
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleInspectSession(sess._id)}
                            className="text-[11px] py-1 px-2.5"
                          >
                            {sess.status === 'completed' ? 'Report' : 'Resume'}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. INSTRUCTIONS VIEW */}
      {/* ========================================================================= */}
      {viewState === 'instructions' && activeSession && (
        <Card className="max-w-3xl mx-auto space-y-6 bg-dark-card border-border-subtle">
          <div className="text-center space-y-2 border-b border-border-subtle pb-5">
            <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-brand-primary/15 text-brand-primary border border-brand-primary/30">
              Ready to Begin
            </span>
            <h3 className="text-xl font-bold text-text-primary">{activeSession.interviewTitle}</h3>
            <p className="text-xs text-text-secondary">
              {activeSession.jobRole} • {activeSession.experienceLevel} • {activeSession.category} Round ({activeSession.difficulty})
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
            <div className="p-3.5 rounded-xl bg-dark-elevated border border-border-subtle">
              <p className="text-[10px] text-text-secondary uppercase">Questions</p>
              <p className="text-lg font-bold text-text-primary">{activeSession.questions.length}</p>
            </div>
            <div className="p-3.5 rounded-xl bg-dark-elevated border border-border-subtle">
              <p className="text-[10px] text-text-secondary uppercase">Format</p>
              <p className="text-lg font-bold text-brand-secondary">Interactive Q&A</p>
            </div>
            <div className="p-3.5 rounded-xl bg-dark-elevated border border-border-subtle">
              <p className="text-[10px] text-text-secondary uppercase">Evaluation</p>
              <p className="text-lg font-bold text-status-success">Instant AI Scoring</p>
            </div>
          </div>

          <div className="space-y-3 text-xs text-text-secondary leading-relaxed bg-dark-elevated p-4 rounded-xl border border-border-subtle">
            <h5 className="font-semibold text-text-primary flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-brand-primary" />
              Guidelines for this Session:
            </h5>
            <p>1. Questions will appear one by one. Take your time to structure your thoughts before submitting.</p>
            <p>2. You can either type your response or speak into your microphone using the Speech-to-Text button.</p>
            <p>3. After each answer, our Gemini AI engine will provide an instant rubric score, strengths, missing points, and an exemplary model answer.</p>
            <p>4. Upon answering all questions, a comprehensive diagnostic report with topic recommendations will be generated.</p>
          </div>

          <div className="flex items-center justify-between pt-2">
            <Button variant="ghost" size="md" onClick={() => setViewState('setup')}>
              Back to Configuration
            </Button>
            <Button
              variant="primary"
              size="lg"
              leftIcon={Play}
              onClick={handleStartInterview}
            >
              Start Interview
            </Button>
          </div>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* 3. ACTIVE QUESTION SCREEN */}
      {/* ========================================================================= */}
      {viewState === 'question' && activeSession && currentQ && (
        <div className="space-y-6 max-w-4xl mx-auto">
          {/* Progress Header */}
          <div className="flex items-center justify-between text-xs text-text-secondary">
            <div className="flex items-center gap-2">
              <span className="font-bold text-text-primary">
                Question {currentQuestionIndex + 1} of {totalQ}
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded bg-brand-primary/15 text-brand-primary font-semibold">
                {currentQ.questionType || 'Technical'}
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded bg-dark-elevated border border-border-subtle text-text-secondary font-medium">
                {currentQ.difficulty || activeSession.difficulty}
              </span>
            </div>

            <button
              onClick={() => setShowExitModal(true)}
              className="text-status-error hover:underline text-xs"
            >
              Exit Session
            </button>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-1.5 rounded-full bg-dark-surface overflow-hidden">
            <div
              className="h-full brand-gradient transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Question Card */}
          <Card className="bg-dark-card border-border-subtle space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-brand-primary">
                  {currentQ.category || activeSession.category} Round
                </span>
                <h3 className="text-lg sm:text-xl font-bold text-text-primary leading-snug">
                  {currentQ.questionText}
                </h3>
              </div>
            </div>

            {/* Key Expected Areas Prompt Preview */}
            {currentQ.expectedAnswerPoints?.length > 0 && (
              <div className="pt-3 border-t border-border-subtle">
                <p className="text-[11px] font-semibold text-text-secondary mb-2 flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-brand-secondary" />
                  Key aspects an interviewer looks for:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {currentQ.expectedAnswerPoints.map((pt, i) => (
                    <span
                      key={i}
                      className="text-[11px] px-2.5 py-1 rounded-lg bg-dark-elevated border border-border-subtle text-text-secondary"
                    >
                      {pt}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {/* Candidate Response Editor */}
          <Card className="bg-dark-card border-border-subtle space-y-4">
            <div className="flex items-center justify-between text-xs">
              <label className="font-semibold text-text-primary flex items-center gap-2">
                <Bot className="w-4 h-4 text-brand-primary" />
                Your Proposed Response:
              </label>

              {/* Speech to Text Mic Toggle */}
              <button
                type="button"
                onClick={toggleSpeechRecognition}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs font-medium transition-all ${
                  isRecording
                    ? 'bg-status-error/15 border-status-error text-status-error animate-pulse'
                    : 'bg-dark-elevated border-border-subtle text-text-secondary hover:text-text-primary'
                }`}
              >
                {isRecording ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                <span>{isRecording ? 'Listening (Click to Stop)' : 'Voice Input'}</span>
              </button>
            </div>

            <textarea
              rows={8}
              value={userAnswerText}
              onChange={(e) => setUserAnswerText(e.target.value)}
              placeholder="State your answer clearly. Highlight your reasoning, architecture, tools, metrics, or STAR story..."
              className="w-full p-4 rounded-xl bg-dark-surface border border-border-subtle text-text-primary placeholder:text-text-muted text-sm focus:outline-none focus:border-brand-primary leading-relaxed resize-y transition-colors font-sans"
            />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <span className="text-[11px] text-text-secondary">
                {userAnswerText.length} characters • Minimum 5 characters
              </span>

              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setUserAnswerText('')}
                  disabled={!userAnswerText || isSubmitting}
                >
                  Clear
                </Button>

                <Button
                  variant="primary"
                  size="md"
                  isLoading={isSubmitting}
                  leftIcon={Send}
                  onClick={handleSubmitAnswer}
                  disabled={userAnswerText.trim().length < 5}
                >
                  {isSubmitting ? 'Evaluating Response...' : 'Submit Answer'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. AI FEEDBACK & PROGRESSION SCREEN */}
      {/* ========================================================================= */}
      {viewState === 'feedback' && latestEvaluation && (
        <div className="space-y-6 max-w-4xl mx-auto">
          {/* Header Action Bar */}
          <div className="flex items-center justify-between text-xs text-text-secondary">
            <span>
              Evaluation for Question {currentQuestionIndex + 1} of {totalQ}
            </span>
            <Button
              variant="primary"
              size="sm"
              rightIcon={ChevronRight}
              onClick={handleNextQuestion}
              isLoading={isCompleting}
            >
              {currentQuestionIndex + 1 < totalQ
                ? `Proceed to Question ${currentQuestionIndex + 2}`
                : 'Complete Interview & View Report'}
            </Button>
          </div>

          {/* Instant Score Hero Card */}
          <Card className="bg-dark-card border-border-subtle p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-subtle pb-6">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-brand-primary">
                  AI Performance Assessment
                </span>
                <h3 className="text-xl font-bold text-text-primary mt-1">Answer Evaluation</h3>
                <p className="text-xs text-text-secondary mt-0.5">
                  Question: &quot;{currentQ?.questionText}&quot;
                </p>
              </div>

              {/* Circular Gauge / Badge */}
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-[11px] text-text-secondary uppercase">Answer Score</p>
                  <p className={`text-3xl font-extrabold ${getScoreColor(latestEvaluation.overallScore || latestEvaluation.score)}`}>
                    {latestEvaluation.overallScore || latestEvaluation.score}/100
                  </p>
                </div>
              </div>
            </div>

            {/* 5 Scoring Dimensions Breakdown */}
            {latestEvaluation.categoryScores && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider">
                  Dimension Breakdown:
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 text-xs">
                  {[
                    { label: 'Technical', val: latestEvaluation.categoryScores.technicalAccuracy, weight: '30%' },
                    { label: 'Relevance', val: latestEvaluation.categoryScores.relevance, weight: '25%' },
                    { label: 'Completeness', val: latestEvaluation.categoryScores.completeness, weight: '20%' },
                    { label: 'Clarity', val: latestEvaluation.categoryScores.clarity, weight: '15%' },
                    { label: 'Communication', val: latestEvaluation.categoryScores.communicationQuality, weight: '10%' },
                  ].map((dim, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-dark-elevated border border-border-subtle space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-text-secondary font-medium">{dim.label}</span>
                        <span className="font-bold text-text-primary">{dim.val}%</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-dark-surface overflow-hidden">
                        <div
                          className="h-full bg-brand-primary rounded-full"
                          style={{ width: `${dim.val}%` }}
                        />
                      </div>
                      <span className="text-[9px] text-text-muted">{dim.weight} weight</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Strengths & Missing Points Side-by-Side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Correct Points & Strengths */}
              <div className="p-4 rounded-xl bg-status-success/10 border border-status-success/25 space-y-2.5">
                <h5 className="font-bold text-status-success flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  What You Did Well:
                </h5>
                <ul className="space-y-1.5 text-text-secondary">
                  {(latestEvaluation.strengths?.length > 0
                    ? latestEvaluation.strengths
                    : latestEvaluation.correctPoints || []
                  ).map((pt, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-status-success font-bold mt-0.5">✓</span>
                      <span>{pt}</span>
                    </li>
                  ))}
                  {(!latestEvaluation.strengths?.length && !latestEvaluation.correctPoints?.length) && (
                    <li className="text-text-muted">No specific strengths identified.</li>
                  )}
                </ul>
              </div>

              {/* Missing Points & Weaknesses */}
              <div className="p-4 rounded-xl bg-status-warning/10 border border-status-warning/25 space-y-2.5">
                <h5 className="font-bold text-status-warning flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Gaps & Missing Concepts:
                </h5>
                <ul className="space-y-1.5 text-text-secondary">
                  {(latestEvaluation.missingPoints?.length > 0
                    ? latestEvaluation.missingPoints
                    : latestEvaluation.weaknesses || []
                  ).map((pt, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-status-warning font-bold mt-0.5">!</span>
                      <span>{pt}</span>
                    </li>
                  ))}
                  {(!latestEvaluation.missingPoints?.length && !latestEvaluation.weaknesses?.length) && (
                    <li className="text-text-muted">No critical missing points noted.</li>
                  )}
                </ul>
              </div>
            </div>

            {/* Actionable Suggestions */}
            {latestEvaluation.suggestions?.length > 0 && (
              <div className="p-4 rounded-xl bg-dark-elevated border border-border-subtle space-y-2 text-xs">
                <h5 className="font-semibold text-text-primary flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-brand-primary" />
                  Actionable Improvement Suggestions:
                </h5>
                <ul className="space-y-1.5 text-text-secondary">
                  {latestEvaluation.suggestions.map((sug, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-brand-secondary font-bold">→</span>
                      <span>{sug}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Top-Tier Exemplary Model Answer */}
            {(latestEvaluation.exampleImprovedAnswer || latestEvaluation.modelAnswer) && (
              <div className="p-4 rounded-xl bg-dark-surface border border-brand-primary/30 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <h5 className="font-bold text-brand-primary flex items-center gap-2">
                    <Award className="w-4 h-4" />
                    Exemplary Model Response ({activeSession.experienceLevel} Tier):
                  </h5>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        latestEvaluation.exampleImprovedAnswer || latestEvaluation.modelAnswer
                      )
                    }
                    className="flex items-center gap-1 text-[11px] text-text-secondary hover:text-text-primary transition-colors"
                  >
                    {copiedModelAnswer ? <Check className="w-3.5 h-3.5 text-status-success" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedModelAnswer ? 'Copied' : 'Copy Response'}</span>
                  </button>
                </div>
                <p className="text-text-secondary leading-relaxed whitespace-pre-line bg-dark-card/60 p-3 rounded-lg border border-border-subtle">
                  {latestEvaluation.exampleImprovedAnswer || latestEvaluation.modelAnswer}
                </p>
              </div>
            )}
          </Card>

          {/* Bottom Action */}
          <div className="flex justify-end pt-2">
            <Button
              variant="primary"
              size="lg"
              rightIcon={ChevronRight}
              onClick={handleNextQuestion}
              isLoading={isCompleting}
            >
              {currentQuestionIndex + 1 < totalQ
                ? `Proceed to Question ${currentQuestionIndex + 2}`
                : 'Complete Interview & View Report'}
            </Button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. FINAL COMPREHENSIVE INTERVIEW REPORT VIEW */}
      {/* ========================================================================= */}
      {viewState === 'report' && activeSession?.finalEvaluation && (
        <div className="space-y-8 max-w-4xl mx-auto">
          {/* Top Actions & AI Disclaimer Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-xs text-text-secondary">
              Simulation Completed • {new Date(activeSession.completedAt || Date.now()).toLocaleDateString()}
            </span>
            <div className="flex items-center gap-3">
              <Button variant="secondary" size="sm" onClick={() => setViewState('setup')} leftIcon={RotateCcw}>
                Start New Interview
              </Button>
              <Button variant="outline" size="sm" onClick={() => setViewState('history')}>
                View Past History
              </Button>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-brand-primary/10 border border-brand-primary/25 text-xs text-text-secondary flex items-start gap-2.5">
            <Info className="w-4 h-4 text-brand-primary flex-shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>AI Disclaimer:</strong> {activeSession.finalEvaluation.aiDisclaimer}
            </p>
          </div>

          {/* Master Score Hero Card */}
          <Card className="bg-dark-card border-border-subtle p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-border-subtle pb-6">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-brand-primary">
                  Comprehensive Diagnostic
                </span>
                <h2 className="text-2xl font-bold text-text-primary">{activeSession.interviewTitle}</h2>
                <p className="text-xs text-text-secondary">
                  Target: {activeSession.jobRole} ({activeSession.experienceLevel}) • {activeSession.category} Track
                </p>
              </div>

              {/* Master Score Badge */}
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-[11px] text-text-secondary uppercase">Overall Score</p>
                  <p className={`text-4xl font-extrabold ${getScoreColor(activeSession.overallScore)}`}>
                    {activeSession.overallScore}/100
                  </p>
                </div>
                <div
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold uppercase tracking-wider ${getScoreBadgeBg(
                    activeSession.overallScore
                  )}`}
                >
                  {activeSession.finalEvaluation.finalAssessmentLabel}
                </div>
              </div>
            </div>

            {/* Category Scores Breakdown */}
            {activeSession.finalEvaluation.categoryScores && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider">
                  Category Performance Overview:
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  {Object.entries(activeSession.finalEvaluation.categoryScores).map(([catName, sc], i) => (
                    <div key={i} className="p-3.5 rounded-xl bg-dark-elevated border border-border-subtle space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-text-primary">{catName}</span>
                        <span className="font-bold text-brand-secondary">{sc}%</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-dark-surface overflow-hidden">
                        <div className="h-full bg-brand-secondary rounded-full" style={{ width: `${sc}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Qualitative Narrative Assessments */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-dark-elevated border border-border-subtle space-y-2">
                <h5 className="font-bold text-text-primary flex items-center gap-2">
                  <Bot className="w-4 h-4 text-brand-primary" />
                  Technical Knowledge Assessment
                </h5>
                <p className="text-text-secondary leading-relaxed">
                  {activeSession.finalEvaluation.technicalAssessment}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-dark-elevated border border-border-subtle space-y-2">
                <h5 className="font-bold text-text-primary flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-brand-secondary" />
                  Communication & Articulation Assessment
                </h5>
                <p className="text-text-secondary leading-relaxed">
                  {activeSession.finalEvaluation.communicationAssessment}
                </p>
              </div>
            </div>

            {/* Recommendations & Suggested Study Topics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-dark-elevated border border-border-subtle space-y-2">
                <h5 className="font-bold text-status-success flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Prioritized Recommendations:
                </h5>
                <ul className="space-y-1.5 text-text-secondary">
                  {activeSession.finalEvaluation.improvementRecommendations?.map((rec, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-status-success font-bold">→</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-dark-elevated border border-border-subtle space-y-2">
                <h5 className="font-bold text-brand-primary flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  Suggested Study Topics:
                </h5>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {activeSession.finalEvaluation.suggestedTopics?.map((top, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-lg bg-dark-surface border border-border-subtle text-text-primary text-[11px]"
                    >
                      {top}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          {/* Full Question-by-Question Review */}
          <Card className="bg-dark-card border-border-subtle space-y-4">
            <h4 className="text-sm font-bold text-text-primary flex items-center gap-2 border-b border-border-subtle pb-3">
              <Layers className="w-4 h-4 text-brand-secondary" />
              Question-by-Question Breakdown ({activeSession.questions.length})
            </h4>

            <div className="space-y-4">
              {activeSession.questions.map((q, idx) => (
                <div
                  key={q.questionId || idx}
                  className="p-4 rounded-xl bg-dark-elevated border border-border-subtle space-y-3 text-xs"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border-subtle/60 pb-2">
                    <span className="font-bold text-text-primary text-sm">
                      Question {idx + 1}: {q.questionText}
                    </span>
                    {q.evaluation?.score !== undefined && (
                      <span className={`font-bold text-sm ${getScoreColor(q.evaluation.score)}`}>
                        {q.evaluation.score}/100
                      </span>
                    )}
                  </div>

                  <div className="space-y-1">
                    <p className="text-[11px] font-semibold text-text-secondary">Your Answer:</p>
                    <p className="text-text-primary bg-dark-surface p-3 rounded-lg border border-border-subtle leading-relaxed">
                      {q.userAnswer || 'No answer submitted'}
                    </p>
                  </div>

                  {q.evaluation?.exampleImprovedAnswer && (
                    <div className="space-y-1">
                      <p className="text-[11px] font-semibold text-brand-primary">Exemplary Answer:</p>
                      <p className="text-text-secondary bg-dark-surface/50 p-3 rounded-lg border border-brand-primary/20 leading-relaxed">
                        {q.evaluation.exampleImprovedAnswer}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 8. SESSIONS HISTORY VIEW */}
      {/* ========================================================================= */}
      {viewState === 'history' && (
        <div className="space-y-6 max-w-4xl mx-auto">
          <div className="flex items-center justify-between border-b border-border-subtle pb-4">
            <div>
              <h3 className="text-lg font-bold text-text-primary">Interview History</h3>
              <p className="text-xs text-text-secondary mt-0.5">
                Review past simulations, scores, and coaching reports.
              </p>
            </div>
            <Button variant="primary" size="sm" onClick={() => setViewState('setup')}>
              Configure New Interview
            </Button>
          </div>

          {recentSessions.length === 0 ? (
            <Card className="bg-dark-card border-border-subtle p-8 text-center space-y-3">
              <Bot className="w-10 h-10 text-text-muted mx-auto" />
              <h4 className="text-base font-bold text-text-primary">No Interviews Completed Yet</h4>
              <p className="text-xs text-text-secondary max-w-sm mx-auto">
                Configure your first AI mock interview session to practice questions and receive detailed diagnostic feedback.
              </p>
              <Button variant="primary" size="md" onClick={() => setViewState('setup')}>
                Start Your First Interview
              </Button>
            </Card>
          ) : (
            <div className="space-y-3">
              {recentSessions.map((sess) => (
                <Card
                  key={sess._id}
                  className="bg-dark-card border-border-subtle p-5 hover:border-brand-primary/40 transition-colors space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-brand-primary/15 text-brand-primary">
                          {sess.category}
                        </span>
                        <span className="text-xs text-text-secondary">
                          {new Date(sess.createdAt).toLocaleDateString()}
                        </span>
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                            sess.status === 'completed'
                              ? 'bg-status-success/15 text-status-success'
                              : 'bg-brand-secondary/15 text-brand-secondary'
                          }`}
                        >
                          {sess.status.replace('_', ' ')}
                        </span>
                      </div>
                      <h4 className="text-base font-bold text-text-primary">{sess.interviewTitle}</h4>
                      <p className="text-xs text-text-secondary">
                        {sess.jobRole} • {sess.experienceLevel} • {sess.totalQuestions} Questions
                      </p>
                    </div>

                    <div className="flex items-center gap-4">
                      {sess.overallScore !== null && (
                        <div className="text-right">
                          <p className="text-[10px] text-text-secondary uppercase">Score</p>
                          <p className={`text-2xl font-extrabold ${getScoreColor(sess.overallScore)}`}>
                            {sess.overallScore}/100
                          </p>
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleInspectSession(sess._id)}
                        >
                          {sess.status === 'completed' ? 'View Report' : 'Resume Session'}
                        </Button>
                        <button
                          onClick={() => setDeleteTargetId(sess._id)}
                          className="p-2 rounded-lg bg-dark-elevated text-text-muted hover:text-status-error transition-colors"
                          title="Delete Session"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Confirmation Modal: Exit Session */}
      {showExitModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <Card className="max-w-md w-full bg-dark-card border-border-subtle p-6 space-y-4">
            <h4 className="text-base font-bold text-text-primary">Exit Interview Session?</h4>
            <p className="text-xs text-text-secondary leading-relaxed">
              Your answered questions and evaluations are automatically saved. You can resume this session anytime from your History.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setShowExitModal(false)}>
                Continue Interview
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  setShowExitModal(false);
                  setViewState('setup');
                }}
              >
                Exit to Setup
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Confirmation Modal: Delete Session */}
      {deleteTargetId && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <Card className="max-w-md w-full bg-dark-card border-border-subtle p-6 space-y-4">
            <h4 className="text-base font-bold text-text-primary">Delete Interview Session?</h4>
            <p className="text-xs text-text-secondary leading-relaxed">
              Are you sure you want to delete this session? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setDeleteTargetId(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => handleDeleteSession(deleteTargetId)}
              >
                Delete Session
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default MockInterviewsPage;
