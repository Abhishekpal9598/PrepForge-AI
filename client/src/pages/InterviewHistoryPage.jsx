import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  History,
  CheckCircle2,
  Bot,
  Clock,
  ArrowRight,
  TrendingUp,
  Award,
  Trash2,
  AlertCircle,
  Eye,
  RotateCcw,
  BookOpen,
  XCircle,
  Check,
} from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import {
  fetchInterviewSessions,
  deleteInterviewSession,
  fetchInterviewSessionById,
} from '../services/api';

/**
 * PrepForge AI - Interview History Page (Production Connected)
 */
export const InterviewHistoryPage = () => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedSession, setSelectedSession] = useState(null);
  const [deleteTargetId, setDeleteTargetId] = useState(null);

  useEffect(() => {
    loadSessions();
  }, [filterStatus]);

  const loadSessions = async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const params = { limit: 50 };
      if (filterStatus !== 'all') {
        params.status = filterStatus;
      }
      const res = await fetchInterviewSessions(params);
      setSessions(res.data || []);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to load interview history.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteInterviewSession(id);
      setSuccessMessage('Interview session deleted successfully.');
      setTimeout(() => setSuccessMessage(''), 3500);
      setDeleteTargetId(null);
      if (selectedSession?._id === id) {
        setSelectedSession(null);
      }
      loadSessions();
    } catch (err) {
      setErrorMessage('Failed to delete interview session.');
    }
  };

  const handleInspect = async (id) => {
    try {
      const res = await fetchInterviewSessionById(id);
      setSelectedSession(res.data);
    } catch (err) {
      setErrorMessage('Failed to load session details.');
    }
  };

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
      <PageHeader
        title="Interview Session History"
        subtitle="Review past simulation sessions, rubrics, and detailed AI coaching feedback."
        badgeText="Saved Sessions"
      />

      {/* Global Alerts */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-status-error/15 border border-status-error/30 text-status-error flex items-start gap-3 text-xs">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p className="flex-1">{errorMessage}</p>
          <button onClick={() => setErrorMessage('')}><XCircle className="w-4 h-4" /></button>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-xl bg-status-success/15 border border-status-success/30 text-status-success flex items-center gap-3 text-xs">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <p className="flex-1 font-medium">{successMessage}</p>
        </div>
      )}

      {/* Filter and Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-subtle pb-4">
        <div className="flex items-center gap-2">
          {['all', 'completed', 'in_progress', 'pending'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all ${
                filterStatus === st
                  ? 'bg-brand-primary text-white shadow-sm'
                  : 'bg-dark-card border border-border-subtle text-text-secondary hover:text-text-primary'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => navigate('/mock-interviews')}
          leftIcon={Bot}
        >
          New Interview Simulator
        </Button>
      </div>

      {/* Loading Skeleton */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-6 rounded-2xl bg-dark-card border border-border-subtle animate-pulse h-28" />
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <Card className="bg-dark-card border-border-subtle p-10 text-center space-y-4">
          <Bot className="w-12 h-12 text-text-muted mx-auto" />
          <h4 className="text-base font-bold text-text-primary">No Sessions Found</h4>
          <p className="text-xs text-text-secondary max-w-sm mx-auto">
            {filterStatus === 'all'
              ? 'You have not completed any mock interview simulations yet.'
              : `No sessions found with status "${filterStatus}".`}
          </p>
          <Button variant="primary" size="md" onClick={() => navigate('/mock-interviews')}>
            Configure Interview
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {sessions.map((sess) => (
            <Card
              key={sess._id}
              className="bg-dark-card border-border-subtle p-6 hover:border-brand-primary/40 transition-colors space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-subtle pb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-brand-primary/15 text-brand-primary">
                      {sess.category} Round
                    </span>
                    <span className="text-xs text-text-secondary flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
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
                  <h3 className="text-lg font-bold text-text-primary">{sess.interviewTitle}</h3>
                  <p className="text-xs text-text-secondary">
                    {sess.jobRole} • {sess.experienceLevel} Tier • {sess.totalQuestions} Questions
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
                      onClick={() => handleInspect(sess._id)}
                      leftIcon={Eye}
                    >
                      Inspect
                    </Button>
                    <button
                      onClick={() => setDeleteTargetId(sess._id)}
                      className="p-2 rounded-xl bg-dark-elevated text-text-muted hover:text-status-error transition-colors"
                      title="Delete Session"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Highlights Preview */}
              {sess.finalEvaluation ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-dark-elevated border border-border-subtle space-y-1">
                    <span className="font-semibold text-status-success">Technical Assessment:</span>
                    <p className="text-text-secondary line-clamp-2 leading-relaxed">
                      {sess.finalEvaluation.technicalAssessment}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-dark-elevated border border-border-subtle space-y-1">
                    <span className="font-semibold text-brand-secondary">Key Study Topics:</span>
                    <p className="text-text-secondary line-clamp-2 leading-relaxed">
                      {sess.finalEvaluation.suggestedTopics?.join(', ') || 'N/A'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-text-secondary flex items-center justify-between">
                  <span>
                    Questions Answered: {sess.questions?.filter((q) => q.userAnswer)?.length || 0} /{' '}
                    {sess.totalQuestions}
                  </span>
                  <Link
                    to="/mock-interviews"
                    className="text-brand-primary hover:underline font-semibold flex items-center gap-1"
                  >
                    Resume this session <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Details / Report Modal */}
      {selectedSession && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 overflow-y-auto">
          <Card className="max-w-2xl w-full bg-dark-card border-border-subtle p-6 space-y-5 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-border-subtle pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-brand-primary">
                  {selectedSession.category} Round Details
                </span>
                <h3 className="text-lg font-bold text-text-primary mt-1">
                  {selectedSession.interviewTitle}
                </h3>
                <p className="text-xs text-text-secondary">
                  {selectedSession.jobRole} ({selectedSession.experienceLevel})
                </p>
              </div>
              <button
                onClick={() => setSelectedSession(null)}
                className="text-text-muted hover:text-text-primary text-sm p-1"
              >
                ✕
              </button>
            </div>

            {selectedSession.overallScore !== null && (
              <div className="p-4 rounded-xl bg-dark-elevated border border-border-subtle flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-text-secondary uppercase">Overall Score</p>
                  <p className={`text-2xl font-bold ${getScoreColor(selectedSession.overallScore)}`}>
                    {selectedSession.overallScore}/100
                  </p>
                </div>
                {selectedSession.finalEvaluation?.finalAssessmentLabel && (
                  <span
                    className={`px-3 py-1 rounded-xl text-xs font-bold uppercase ${getScoreBadgeBg(
                      selectedSession.overallScore
                    )}`}
                  >
                    {selectedSession.finalEvaluation.finalAssessmentLabel}
                  </span>
                )}
              </div>
            )}

            {/* Questions list */}
            <div className="space-y-3">
              <h5 className="text-xs font-bold text-text-primary uppercase tracking-wider">
                Question Responses ({selectedSession.questions?.length})
              </h5>
              <div className="space-y-3">
                {selectedSession.questions?.map((q, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-dark-elevated border border-border-subtle space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-text-primary">Q{idx + 1}: {q.questionText}</span>
                      {q.evaluation?.score !== undefined && (
                        <span className={`font-bold ${getScoreColor(q.evaluation.score)}`}>
                          {q.evaluation.score}%
                        </span>
                      )}
                    </div>
                    <p className="text-text-secondary bg-dark-surface p-2.5 rounded-lg border border-border-subtle">
                      {q.userAnswer || 'No answer recorded.'}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-border-subtle">
              <Button variant="secondary" size="sm" onClick={() => setSelectedSession(null)}>
                Close
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTargetId && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <Card className="max-w-md w-full bg-dark-card border-border-subtle p-6 space-y-4">
            <h4 className="text-base font-bold text-text-primary">Delete Interview Session?</h4>
            <p className="text-xs text-text-secondary leading-relaxed">
              Are you sure you want to permanently delete this interview session? All questions and scores will be removed.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setDeleteTargetId(null)}>
                Cancel
              </Button>
              <Button variant="danger" size="sm" onClick={() => handleDelete(deleteTargetId)}>
                Delete Session
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default InterviewHistoryPage;
