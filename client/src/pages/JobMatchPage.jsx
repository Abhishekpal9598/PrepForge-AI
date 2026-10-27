import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Sparkles, 
  CheckCircle2, 
  XCircle, 
  Briefcase, 
  Building2,
  MapPin,
  TrendingUp, 
  AlertCircle,
  AlertTriangle,
  History,
  Trash2,
  RefreshCw,
  FileText,
  Layers,
  Award,
  BookOpen,
  GraduationCap,
  Key,
  ShieldCheck,
  HelpCircle,
  Clock,
  ChevronRight,
  ExternalLink,
  Sliders,
  Check
} from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { EmptyState } from '../components/EmptyState';
import { Toast } from '../components/Toast';
import { Modal } from '../components/Modal';
import { 
  fetchResumes,
  analyzeJobDescription,
  fetchJobAnalyses,
  fetchJobAnalysisById,
  deleteJobAnalysis
} from '../services/api';

/**
 * PrepForge AI - Job Description Analysis & Resume Matching Workbench
 * Fully connected to real Gemini 3.5 Flash semantic matching and MongoDB persistence.
 */
export const JobMatchPage = () => {
  // Input Form State
  const [resumes, setResumes] = useState([]);
  const [selectedResumeId, setSelectedResumeId] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [location, setLocation] = useState('');
  const [jobDescription, setJobDescription] = useState('');

  // UI View Mode: 'workbench' | 'history'
  const [activeView, setActiveView] = useState('workbench');

  // Execution & Loading States
  const [isLoadingResumes, setIsLoadingResumes] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStepIndex, setAnalysisStepIndex] = useState(0);
  const [currentResult, setCurrentResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  // History State
  const [jobHistory, setJobHistory] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Notification Toast
  const [toast, setToast] = useState(null);

  // Dynamic progress steps
  const MATCHING_STEPS = [
    'Parsing job description requirements with Gemini...',
    'Extracting required technical competencies & seniority...',
    'Comparing candidate experience bullets against job scope...',
    'Calculating weighted 4-factor semantic match score...',
    'Generating tailored resume optimization recommendations...',
  ];

  // Rotate loading step messages smoothly while AI runs
  useEffect(() => {
    let interval;
    if (isAnalyzing) {
      setAnalysisStepIndex(0);
      interval = setInterval(() => {
        setAnalysisStepIndex((prev) => (prev < MATCHING_STEPS.length - 1 ? prev + 1 : prev));
      }, 3500);
    }
    return () => clearInterval(interval);
  }, [isAnalyzing]);

  // Load user resumes on mount
  const loadResumes = async () => {
    try {
      setIsLoadingResumes(true);
      const res = await fetchResumes();
      if (res.success && Array.isArray(res.data)) {
        setResumes(res.data);
        if (res.data.length > 0 && !selectedResumeId) {
          setSelectedResumeId(res.data[0].id || res.data[0]._id);
        }
      }
    } catch (err) {
      setToast({
        type: 'error',
        message: err.message || 'Failed to load resumes.',
      });
    } finally {
      setIsLoadingResumes(false);
    }
  };

  useEffect(() => {
    loadResumes();
  }, []);

  // Load Job Matching History
  const loadHistory = async () => {
    try {
      setIsLoadingHistory(true);
      const res = await fetchJobAnalyses({ limit: 20 });
      if (res.success && Array.isArray(res.data)) {
        setJobHistory(res.data);
      }
    } catch (err) {
      setToast({
        type: 'error',
        message: err.message || 'Failed to load job matching history.',
      });
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (activeView === 'history') {
      loadHistory();
    }
  }, [activeView]);

  // Format date helper
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  // Determine score color classification
  const getScoreColor = (score) => {
    if (score >= 80) return { text: 'text-[#10B981]', border: 'border-[#10B981]', bg: 'bg-[#10B981]/10', label: 'Strong Role Match' };
    if (score >= 65) return { text: 'text-[#F59E0B]', border: 'border-[#F59E0B]', bg: 'bg-[#F59E0B]/10', label: 'Moderate Fit (Needs Tailoring)' };
    return { text: 'text-[#EF4444]', border: 'border-[#EF4444]', bg: 'bg-[#EF4444]/10', label: 'Low Fit (Critical Skill Gaps)' };
  };

  // Trigger Job Description Analysis & Resume Matching
  const handleAnalyzeJob = async (e) => {
    if (e) e.preventDefault();

    if (!selectedResumeId) {
      setToast({ type: 'error', message: 'Please select an uploaded resume to compare against.' });
      return;
    }

    if (!jobTitle.trim()) {
      setToast({ type: 'error', message: 'Job title is required.' });
      return;
    }

    if (!jobDescription.trim() || jobDescription.trim().length < 50) {
      setToast({
        type: 'error',
        message: 'Job description must be at least 50 characters long.',
      });
      return;
    }

    try {
      setIsAnalyzing(true);
      setErrorMessage(null);

      const payload = {
        resumeId: selectedResumeId,
        jobTitle: jobTitle.trim(),
        companyName: companyName.trim() || undefined,
        location: location.trim() || undefined,
        jobDescription: jobDescription.trim(),
      };

      const res = await analyzeJobDescription(payload);
      if (res.success && res.job) {
        setCurrentResult(res.job);
        setToast({
          type: 'success',
          message: `Job matching analysis completed! Match score: ${res.job.matchScore}%`,
        });
      }
    } catch (err) {
      const msg = err.message || 'Failed to complete job description analysis. Please try again.';
      setErrorMessage(msg);
      setToast({
        type: 'error',
        message: msg,
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Delete Job Match Record
  const confirmDeleteJobRecord = async () => {
    if (!deleteCandidate) return;

    try {
      setIsDeleting(true);
      const id = deleteCandidate.id || deleteCandidate._id;
      await deleteJobAnalysis(id);

      setJobHistory((prev) => prev.filter((item) => (item.id || item._id) !== id));

      if ((currentResult?.id || currentResult?._id) === id) {
        setCurrentResult(null);
      }

      setToast({
        type: 'success',
        message: 'Job match record deleted successfully.',
      });
    } catch (err) {
      setToast({
        type: 'error',
        message: err.message || 'Failed to delete job match record.',
      });
    } finally {
      setIsDeleting(false);
      setDeleteCandidate(null);
    }
  };

  // Selected resume object helper
  const activeResume = resumes.find((r) => (r.id || r._id) === selectedResumeId);

  return (
    <div className="space-y-8 text-left">
      {/* Toast Notification Container */}
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      {/* Page Header */}
      <PageHeader
        title="Job Description Analysis & Semantic Match"
        subtitle="Compare your resume against any target job description. Google Gemini extracts required competencies, computes an explainable multi-factor match score, and generates targeted tailoring recommendations."
        badgeText={currentResult ? `Match: ${currentResult.matchScore}%` : 'Semantic Match Engine'}
      />

      {/* View Switcher: Workbench vs History */}
      <div className="flex items-center justify-between border-b border-[#334155]/60 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveView('workbench')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
              activeView === 'workbench'
                ? 'bg-[#7657FF]/20 text-[#B49DFF] border border-[#7657FF]/40 shadow-sm'
                : 'text-[#94A3B8] hover:text-[#F8FAFC]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Matching Workbench</span>
          </button>

          <button
            onClick={() => setActiveView('history')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
              activeView === 'history'
                ? 'bg-[#1E293B] text-[#F8FAFC] border border-[#334155] shadow-sm'
                : 'text-[#94A3B8] hover:text-[#F8FAFC]'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Matching History</span>
            {jobHistory.length > 0 && (
              <span className="text-[10px] bg-[#334155] px-1.5 py-0.2 rounded-full text-[#CBD5E1]">
                {jobHistory.length}
              </span>
            )}
          </button>
        </div>

        {activeView === 'workbench' && currentResult && (
          <button
            onClick={() => {
              setCurrentResult(null);
              setErrorMessage(null);
            }}
            className="text-xs text-[#94A3B8] hover:text-[#F8FAFC] transition-colors flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" />
            <span>New Analysis</span>
          </button>
        )}
      </div>

      {/* VIEW 1: MATCHING WORKBENCH */}
      {activeView === 'workbench' && (
        <div className="space-y-8">
          
          {/* Top Form: Source Resume & Job Description Inputs */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Left Box: Resume Selection & Context */}
            <Card className="lg:col-span-5 bg-[#0D1220] border-[#334155] p-5 space-y-4 text-left">
              <div className="flex items-center justify-between border-b border-[#334155]/60 pb-3">
                <h3 className="text-sm font-bold text-[#F8FAFC] flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#7657FF]" />
                  <span>1. Source Resume</span>
                </h3>
                <Link
                  to="/resume-analyzer"
                  className="text-xs text-[#818CF8] hover:underline flex items-center gap-1"
                >
                  <span>Manage</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>

              {isLoadingResumes ? (
                <div className="p-6 text-center">
                  <LoadingSpinner size="sm" message="Loading your resumes..." />
                </div>
              ) : resumes.length === 0 ? (
                <div className="p-6 rounded-xl bg-[#1E293B]/60 border border-[#334155] text-center space-y-3">
                  <p className="text-xs text-[#94A3B8]">
                    You haven't uploaded any resumes yet. Upload a PDF or Word resume first to begin matching.
                  </p>
                  <Link to="/resume-analyzer">
                    <Button variant="primary" size="sm" className="text-xs">
                      Upload Resume
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#CBD5E1]">
                      Select Resume to Compare:
                    </label>
                    <select
                      value={selectedResumeId}
                      onChange={(e) => setSelectedResumeId(e.target.value)}
                      disabled={isAnalyzing}
                      className="w-full px-3 py-2 rounded-xl bg-[#1E293B] border border-[#334155] text-xs text-[#F8FAFC] outline-none focus:border-[#818CF8]"
                    >
                      {resumes.map((r) => {
                        const id = r.id || r._id;
                        return (
                          <option key={id} value={id}>
                            {r.originalFileName} ({(r.fileType || r.fileFormat || 'pdf').toUpperCase()})
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {activeResume && (
                    <div className="p-3.5 rounded-xl bg-[#080B16] border border-[#334155] space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-[#94A3B8]">
                        <span className="font-semibold text-[#E2E8F0] truncate max-w-[200px]">
                          {activeResume.originalFileName}
                        </span>
                        <Badge variant="primary">
                          {(activeResume.fileType || activeResume.fileFormat || 'pdf').toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-[#94A3B8] font-mono line-clamp-3 leading-relaxed">
                        {activeResume.extractedText || activeResume.rawText || 'No text extracted.'}
                      </p>
                      <div className="text-[10px] text-[#64748B]">
                        {(activeResume.extractedText || activeResume.rawText || '').split(/\s+/).filter(Boolean).length} words ready for comparison
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>

            {/* Right Box: Target Job Description Input Form */}
            <Card className="lg:col-span-7 bg-[#0D1220] border-[#334155] p-5 space-y-4 text-left">
              <div className="flex items-center justify-between border-b border-[#334155]/60 pb-3">
                <h3 className="text-sm font-bold text-[#F8FAFC] flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-[#3985FF]" />
                  <span>2. Target Job Description</span>
                </h3>
                <span className="text-[11px] text-[#94A3B8]">
                  Min 50 characters
                </span>
              </div>

              <form onSubmit={handleAnalyzeJob} className="space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[#CBD5E1]">
                      Job Title <span className="text-[#EF4444]">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Senior Full Stack Engineer"
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                      disabled={isAnalyzing}
                      className="w-full px-3 py-2 rounded-xl bg-[#1E293B] border border-[#334155] text-xs text-[#F8FAFC] placeholder:text-[#94A3B8] outline-none focus:border-[#818CF8]"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[#CBD5E1]">
                      Company Name <span className="text-[#94A3B8]">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Stripe, Acme Cloud"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      disabled={isAnalyzing}
                      className="w-full px-3 py-2 rounded-xl bg-[#1E293B] border border-[#334155] text-xs text-[#F8FAFC] placeholder:text-[#94A3B8] outline-none focus:border-[#818CF8]"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-[#CBD5E1]">
                      Job Description <span className="text-[#EF4444]">*</span>
                    </label>
                    <span className={`text-[10px] ${jobDescription.trim().length >= 50 ? 'text-[#10B981]' : 'text-[#94A3B8]'}`}>
                      {jobDescription.length} characters
                    </span>
                  </div>
                  <textarea
                    rows={6}
                    placeholder="Paste the complete job description, requirements, and responsibilities here..."
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    disabled={isAnalyzing}
                    className="w-full p-3 rounded-xl bg-[#080B16] border border-[#334155] text-xs text-[#F8FAFC] placeholder:text-[#94A3B8] font-mono outline-none focus:border-[#818CF8] leading-relaxed"
                    required
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="text-[11px] text-[#94A3B8] flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#10B981]" />
                    <span>Gemini 3.5 Flash Powered</span>
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={isAnalyzing || !selectedResumeId || jobDescription.trim().length < 50}
                    className="bg-gradient-to-r from-[#7657FF] to-[#3985FF] text-xs px-5 font-semibold shadow-lg shadow-[#7657FF]/20"
                  >
                    {isAnalyzing ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                        <span>Matching with Gemini...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                        <span>Analyze Job Match & Gaps</span>
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Card>
          </div>

          {/* Loading Card during AI Analysis */}
          {isAnalyzing && (
            <div className="p-8 rounded-2xl bg-[#1E293B]/70 border border-[#7657FF]/40 text-center space-y-4 animate-pulse">
              <div className="w-12 h-12 rounded-2xl bg-[#7657FF]/20 border border-[#7657FF]/40 flex items-center justify-center text-[#B49DFF] mx-auto shadow-lg shadow-[#7657FF]/20">
                <Sparkles className="w-6 h-6 animate-spin text-[#B49DFF]" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-[#F8FAFC]">
                  Executing Semantic Job Fit & Gap Audit
                </h4>
                <p className="text-xs text-[#818CF8] font-medium">
                  {MATCHING_STEPS[analysisStepIndex]}
                </p>
              </div>
              <p className="text-[11px] text-[#94A3B8] max-w-sm mx-auto">
                Comparing required competencies against candidate tenure, technical depth, and quantifiable achievements...
              </p>
            </div>
          )}

          {/* Error Banner */}
          {!isAnalyzing && errorMessage && (
            <div className="p-4 rounded-xl bg-[#EF4444]/15 border border-[#EF4444]/30 space-y-2 text-left">
              <div className="flex items-center gap-2 text-[#F87171] text-xs font-bold">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>Job Matching Error</span>
              </div>
              <p className="text-xs text-[#FCA5A5]">{errorMessage}</p>
              <div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleAnalyzeJob}
                  className="text-xs flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Retry Analysis</span>
                </Button>
              </div>
            </div>
          )}

          {/* RESULTS DASHBOARD */}
          {!isAnalyzing && currentResult && (
            <div className="space-y-6">
              
              {/* 1. Overall Match Score Hero Card */}
              {(() => {
                const scoreInfo = getScoreColor(currentResult.matchScore);
                const categoryScores = currentResult.categoryScores || {};

                return (
                  <div className="p-6 rounded-2xl bg-gradient-to-br from-[#1E293B] to-[#0D1220] border border-[#334155] space-y-6">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                      <div className="flex items-center gap-5">
                        <div className={`w-24 h-24 rounded-2xl flex flex-col items-center justify-center border-2 ${scoreInfo.border} ${scoreInfo.bg} shadow-lg`}>
                          <span className={`text-3xl font-extrabold ${scoreInfo.text}`}>
                            {currentResult.matchScore}%
                          </span>
                          <span className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-wider">
                            Match Fit
                          </span>
                        </div>

                        <div className="space-y-1 text-left">
                          <h3 className="text-lg font-bold text-[#F8FAFC]">
                            {currentResult.jobTitle}
                          </h3>
                          <div className="flex items-center gap-2 text-xs text-[#94A3B8]">
                            {currentResult.company && (
                              <span className="flex items-center gap-1 text-[#CBD5E1]">
                                <Building2 className="w-3.5 h-3.5 text-[#3985FF]" />
                                {currentResult.company}
                              </span>
                            )}
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <FileText className="w-3.5 h-3.5 text-[#7657FF]" />
                              {currentResult.resumeFileName}
                            </span>
                          </div>
                          <span className={`inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full border mt-1 ${scoreInfo.border} ${scoreInfo.bg} ${scoreInfo.text}`}>
                            {scoreInfo.label}
                          </span>
                        </div>
                      </div>

                      <div className="text-right text-[11px] text-[#94A3B8] space-y-0.5 sm:self-start">
                        <div>Model: <span className="text-[#CBD5E1] font-mono">{currentResult.modelUsed || 'gemini-3.5-flash'}</span></div>
                        <div>Analyzed: <span className="text-[#CBD5E1]">{formatDate(currentResult.createdAt)}</span></div>
                      </div>
                    </div>

                    {/* 4-Factor Weighted Score Breakdown */}
                    <div className="space-y-3 pt-2 border-t border-[#334155]/60">
                      <span className="text-xs font-bold text-[#E2E8F0] uppercase tracking-wider block">
                        Weighted Evaluation Rubric
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                        {[
                          { label: 'Skills Match', weight: '40%', score: categoryScores.skillsMatch ?? 75 },
                          { label: 'Experience Match', weight: '30%', score: categoryScores.experienceMatch ?? 80 },
                          { label: 'Education Match', weight: '15%', score: categoryScores.educationMatch ?? 75 },
                          { label: 'Scope & Keywords', weight: '15%', score: categoryScores.scopeAndKeywords ?? 70 },
                        ].map((item, idx) => (
                          <div key={idx} className="p-3 rounded-xl bg-[#080B16] border border-[#334155]/60 space-y-1.5 text-left">
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-[#94A3B8] font-medium">{item.label}</span>
                              <span className="font-bold text-[#F8FAFC]">{item.score}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-[#1E293B] rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full ${item.score >= 80 ? 'bg-[#10B981]' : item.score >= 60 ? 'bg-[#F59E0B]' : 'bg-[#EF4444]'}`}
                                style={{ width: `${Math.min(100, Math.max(0, item.score))}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-[#64748B] block">Weight: {item.weight}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Disclaimer */}
                    <div className="text-[11px] text-[#94A3B8] bg-[#080B16]/60 p-3 rounded-xl border border-[#334155]/40 flex items-start gap-2">
                      <HelpCircle className="w-4 h-4 text-[#818CF8] flex-shrink-0 mt-0.5" />
                      <span>{currentResult.disclaimer || 'This match score is an estimation based on semantic skill and experience alignment. It does not guarantee recruiter decisions or universal ATS screening outcomes.'}</span>
                    </div>
                  </div>
                );
              })()}

              {/* 2. Executive Match Summary */}
              {currentResult.matchSummary && (
                <div className="p-5 rounded-2xl bg-[#1E293B]/70 border border-[#334155] space-y-2 text-left">
                  <h4 className="text-xs font-bold text-[#E2E8F0] uppercase tracking-wider flex items-center gap-2">
                    <BookOpen className="w-3.5 h-3.5 text-[#7657FF]" />
                    <span>Executive Fit Summary</span>
                  </h4>
                  <p className="text-xs sm:text-sm text-[#CBD5E1] leading-relaxed">
                    {currentResult.matchSummary}
                  </p>
                </div>
              )}

              {/* 3. Extracted Job Requirements Breakdown (Step 3) */}
              {currentResult.jobRequirements && (
                <div className="p-5 rounded-2xl bg-[#080B16] border border-[#334155] space-y-4 text-left">
                  <div className="flex items-center justify-between pb-2 border-b border-[#334155]/60">
                    <h4 className="text-xs font-bold text-[#E2E8F0] uppercase tracking-wider flex items-center gap-2">
                      <Layers className="w-3.5 h-3.5 text-[#3985FF]" />
                      <span>Extracted Job Requirements (AI Parsed)</span>
                    </h4>
                    <Badge variant="primary">
                      Seniority: {currentResult.jobRequirements.seniorityLevel || 'Mid-Level'}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-semibold text-[#CBD5E1]">Required Technical Skills:</span>
                      <div className="flex flex-wrap gap-1">
                        {currentResult.jobRequirements.requiredTechnicalSkills?.map((s, idx) => (
                          <span key={idx} className="text-[10px] bg-[#1E293B] text-[#E2E8F0] px-2 py-0.5 rounded border border-[#334155]">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <span className="text-[11px] font-semibold text-[#CBD5E1]">Preferred / Bonus Skills:</span>
                      <div className="flex flex-wrap gap-1">
                        {currentResult.jobRequirements.preferredTechnicalSkills?.map((s, idx) => (
                          <span key={idx} className="text-[10px] bg-[#3985FF]/10 text-[#60A5FA] px-2 py-0.5 rounded border border-[#3985FF]/30">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <span className="text-[11px] font-semibold text-[#CBD5E1]">Soft Skills & Leadership:</span>
                      <div className="flex flex-wrap gap-1">
                        {currentResult.jobRequirements.softSkills?.map((s, idx) => (
                          <span key={idx} className="text-[10px] bg-[#7657FF]/10 text-[#B49DFF] px-2 py-0.5 rounded border border-[#7657FF]/30">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 4. Skills Comparison Grid (Matched vs Missing) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
                {/* Matched Skills */}
                <div className="p-4 rounded-xl bg-[#080B16] border border-[#10B981]/30 space-y-2.5">
                  <span className="text-xs font-bold text-[#34D399] flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                    <span>Matched Competencies ({currentResult.matchedSkills?.length || 0})</span>
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {currentResult.matchedSkills?.length > 0 ? (
                      currentResult.matchedSkills.map((skill, idx) => (
                        <span key={idx} className="text-[11px] bg-[#10B981]/15 text-[#34D399] px-2.5 py-1 rounded-lg border border-[#10B981]/30 font-medium">
                          ✓ {skill}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-[#94A3B8]">No direct keyword matches detected</span>
                    )}
                  </div>
                </div>

                {/* Missing Required Skills */}
                <div className="p-4 rounded-xl bg-[#080B16] border border-[#EF4444]/30 space-y-2.5">
                  <span className="text-xs font-bold text-[#F87171] flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-[#EF4444]" />
                    <span>Missing Required Skills ({currentResult.missingRequiredSkills?.length || 0})</span>
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {currentResult.missingRequiredSkills?.length > 0 ? (
                      currentResult.missingRequiredSkills.map((skill, idx) => (
                        <span key={idx} className="text-[11px] bg-[#EF4444]/15 text-[#F87171] px-2.5 py-1 rounded-lg border border-[#EF4444]/30 font-medium">
                          ✗ {skill}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-[#10B981]">All required core skills are present!</span>
                    )}
                  </div>
                </div>

                {/* Missing Preferred Skills */}
                <div className="p-4 rounded-xl bg-[#080B16] border border-[#F59E0B]/30 space-y-2.5">
                  <span className="text-xs font-bold text-[#FBBF24] flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-[#F59E0B]" />
                    <span>Missing Preferred Skills ({currentResult.missingPreferredSkills?.length || 0})</span>
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {currentResult.missingPreferredSkills?.length > 0 ? (
                      currentResult.missingPreferredSkills.map((skill, idx) => (
                        <span key={idx} className="text-[11px] bg-[#F59E0B]/15 text-[#FBBF24] px-2.5 py-1 rounded-lg border border-[#F59E0B]/30 font-medium">
                          • {skill}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-[#94A3B8]">No preferred skill gaps</span>
                    )}
                  </div>
                </div>
              </div>

              {/* 5. Experience & Education Assessment Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                {/* Experience Match */}
                {currentResult.experienceAnalysis && (
                  <div className="p-4 rounded-xl bg-[#080B16] border border-[#334155] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#E2E8F0] uppercase tracking-wider flex items-center gap-1.5">
                        <Briefcase className="w-3.5 h-3.5 text-[#7657FF]" />
                        <span>Experience Assessment</span>
                      </span>
                      <Badge variant={currentResult.experienceAnalysis.status === 'Exceeds' || currentResult.experienceAnalysis.status === 'Meets' ? 'success' : 'warning'}>
                        {currentResult.experienceAnalysis.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-[#CBD5E1] leading-relaxed">
                      {currentResult.experienceAnalysis.assessment}
                    </p>
                  </div>
                )}

                {/* Education Match */}
                {currentResult.educationAnalysis && (
                  <div className="p-4 rounded-xl bg-[#080B16] border border-[#334155] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#E2E8F0] uppercase tracking-wider flex items-center gap-1.5">
                        <GraduationCap className="w-3.5 h-3.5 text-[#3985FF]" />
                        <span>Education Assessment</span>
                      </span>
                      <Badge variant={currentResult.educationAnalysis.status === 'Meets' ? 'success' : 'warning'}>
                        {currentResult.educationAnalysis.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-[#CBD5E1] leading-relaxed">
                      {currentResult.educationAnalysis.assessment}
                    </p>
                  </div>
                )}
              </div>

              {/* 6. Keyword Overlap & Vocabulary */}
              {currentResult.keywordOverlap && (
                <div className="p-5 rounded-2xl bg-[#1E293B]/60 border border-[#334155] space-y-3 text-left">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-[#E2E8F0] uppercase tracking-wider flex items-center gap-2">
                      <Key className="w-3.5 h-3.5 text-[#F59E0B]" />
                      <span>Job Keyword & Indexing Overlap</span>
                    </h4>
                    <span className="text-xs font-bold text-[#10B981]">
                      {currentResult.keywordOverlap.overlapPercentage}% Vocabulary Overlap
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-semibold text-[#10B981]">Keywords Present in Resume:</span>
                      <div className="flex flex-wrap gap-1">
                        {currentResult.keywordOverlap.highValueKeywordsFound?.map((kw, idx) => (
                          <span key={idx} className="text-[10px] bg-[#10B981]/15 text-[#34D399] px-2 py-0.5 rounded border border-[#10B981]/30">
                            {kw}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <span className="text-[11px] font-semibold text-[#EF4444]">Keywords Missing from Resume:</span>
                      <div className="flex flex-wrap gap-1">
                        {currentResult.keywordOverlap.missingKeywords?.map((kw, idx) => (
                          <span key={idx} className="text-[10px] bg-[#EF4444]/15 text-[#F87171] px-2 py-0.5 rounded border border-[#EF4444]/30">
                            ✗ {kw}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 7. Relevant Resume Sections (Direct Mappings) */}
              {currentResult.relevantResumeSections?.length > 0 && (
                <div className="p-5 rounded-2xl bg-[#080B16] border border-[#334155] space-y-3 text-left">
                  <h4 className="text-xs font-bold text-[#E2E8F0] uppercase tracking-wider flex items-center gap-2">
                    <Award className="w-3.5 h-3.5 text-[#818CF8]" />
                    <span>Most Relevant Resume Experience Mappings</span>
                  </h4>
                  <div className="space-y-2.5">
                    {currentResult.relevantResumeSections.map((sec, idx) => (
                      <div key={idx} className="p-3.5 rounded-xl bg-[#1E293B]/70 border border-[#334155] space-y-1.5">
                        <span className="text-xs font-bold text-[#F8FAFC]">{sec.sectionTitle}</span>
                        <p className="text-xs text-[#94A3B8] font-mono bg-[#080B16] p-2 rounded border border-[#334155]/60">
                          "{sec.excerpt}"
                        </p>
                        <p className="text-[11px] text-[#A5B4FC]">
                          <strong className="text-[#818CF8]">Relevance:</strong> {sec.relevance}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 8. Role Strengths & Gaps (Dual Grid) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                {/* Strengths */}
                <div className="p-5 rounded-2xl bg-[#080B16] border border-[#10B981]/30 space-y-2.5">
                  <h4 className="text-xs font-bold text-[#34D399] uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                    <span>Strengths for this Job</span>
                  </h4>
                  <ul className="space-y-2">
                    {currentResult.strengthsForThisJob?.map((item, idx) => (
                      <li key={idx} className="text-xs text-[#CBD5E1] flex items-start gap-2">
                        <span className="text-[#10B981] font-bold">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Weaknesses / Gaps */}
                <div className="p-5 rounded-2xl bg-[#080B16] border border-[#EF4444]/30 space-y-2.5">
                  <h4 className="text-xs font-bold text-[#F87171] uppercase tracking-wider flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-[#EF4444]" />
                    <span>Gaps to Address in Interview</span>
                  </h4>
                  <ul className="space-y-2">
                    {currentResult.weaknessesAndGaps?.map((item, idx) => (
                      <li key={idx} className="text-xs text-[#CBD5E1] flex items-start gap-2">
                        <span className="text-[#EF4444] font-bold">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* 9. Tailoring Recommendations */}
              {currentResult.improvementRecommendations?.length > 0 && (
                <div className="p-5 rounded-2xl bg-[#1E293B]/60 border border-[#334155] space-y-3 text-left">
                  <h4 className="text-xs font-bold text-[#E2E8F0] uppercase tracking-wider flex items-center gap-2">
                    <TrendingUp className="w-3.5 h-3.5 text-[#10B981]" />
                    <span>Resume Tailoring Action Plan</span>
                  </h4>
                  <div className="space-y-2">
                    {currentResult.improvementRecommendations.map((rec, idx) => {
                      const priority = rec.priority || 'Medium';
                      const area = rec.area || 'Experience';
                      const recommendation = typeof rec === 'string' ? rec : rec.recommendation;

                      return (
                        <div key={idx} className="p-3.5 rounded-xl bg-[#080B16] border border-[#334155] space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-[#F8FAFC]">[{area}]</span>
                            <Badge variant={priority === 'High' ? 'danger' : priority === 'Medium' ? 'warning' : 'primary'}>
                              {priority} Priority
                            </Badge>
                          </div>
                          <p className="text-xs text-[#CBD5E1]">{recommendation}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>
          )}

        </div>
      )}

      {/* VIEW 2: JOB MATCHING HISTORY */}
      {activeView === 'history' && (
        <div className="space-y-4 text-left">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#F8FAFC] flex items-center gap-2">
              <History className="w-4 h-4 text-[#7657FF]" />
              <span>Job Match History</span>
            </h3>
            <Button
              variant="secondary"
              size="sm"
              onClick={loadHistory}
              disabled={isLoadingHistory}
              className="text-xs"
            >
              <RefreshCw className={`w-3 h-3 mr-1 ${isLoadingHistory ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </Button>
          </div>

          {isLoadingHistory ? (
            <div className="p-12 text-center bg-[#0D1220] rounded-2xl border border-[#334155]">
              <LoadingSpinner size="md" message="Loading matching history..." />
            </div>
          ) : jobHistory.length === 0 ? (
            <Card className="bg-[#0D1220] border-[#334155] p-12 text-center space-y-3">
              <EmptyState
                icon={History}
                title="No Job Analyses Yet"
                description="Use the Matching Workbench to compare your resume against a target job description."
              />
            </Card>
          ) : (
            <div className="space-y-3">
              {jobHistory.map((item) => {
                const id = item.id || item._id;
                const scoreInfo = getScoreColor(item.matchScore);

                return (
                  <Card
                    key={id}
                    className="bg-[#0D1220] border-[#334155] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-[#475569] transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-base border ${scoreInfo.border} ${scoreInfo.bg} ${scoreInfo.text} flex-shrink-0`}>
                        {item.matchScore}%
                      </div>
                      <div className="space-y-0.5">
                        <h4 className="text-sm font-bold text-[#F8FAFC]">
                          {item.jobTitle}
                        </h4>
                        <div className="flex items-center gap-2 text-[11px] text-[#94A3B8]">
                          {item.company && (
                            <span className="text-[#CBD5E1]">{item.company}</span>
                          )}
                          <span>•</span>
                          <span>{item.resumeFileName}</span>
                          <span>•</span>
                          <span>{formatDate(item.createdAt)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setCurrentResult(item);
                          setActiveView('workbench');
                        }}
                        className="text-xs px-3"
                      >
                        View Report
                      </Button>

                      <button
                        onClick={() => setDeleteCandidate(item)}
                        className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors"
                        title="Delete analysis"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteCandidate && (
        <Modal
          isOpen={!!deleteCandidate}
          onClose={() => setDeleteCandidate(null)}
          title="Delete Job Match Record"
        >
          <div className="space-y-4 text-left">
            <p className="text-xs sm:text-sm text-[#94A3B8]">
              Are you sure you want to delete the job analysis record for{' '}
              <strong className="text-[#F8FAFC]">"{deleteCandidate.jobTitle}"</strong>?
              This action cannot be undone.
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setDeleteCandidate(null)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={confirmDeleteJobRecord}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete Record'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default JobMatchPage;
