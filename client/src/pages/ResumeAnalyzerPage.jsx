import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, 
  UploadCloud, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle,
  Copy, 
  Check, 
  RefreshCw, 
  Search, 
  Sparkles,
  TrendingUp,
  Award,
  BookOpen,
  Briefcase,
  GraduationCap,
  History,
  ShieldCheck,
  ChevronRight,
  ArrowRight,
  FileCode,
  Layers,
  HelpCircle,
  Clock,
  Filter,
  Scale,
  Settings
} from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { EmptyState } from '../components/EmptyState';
import { Toast } from '../components/Toast';
import { Modal } from '../components/Modal';

// Resume Intelligence Components
import {
  ResumeScoreOverview,
  ScoreBreakdown,
  ChecksExplorer,
  AIInsightsPanel,
  AnalysisProgress,
  TargetRoleModal,
  ParsedSectionsView,
} from '../components/resume';

// Centralized API Service
import { 
  fetchResumes, 
  fetchResumeById,
  uploadResume, 
  deleteResume, 
  runResumeChecks,
  fetchResumeChecks,
  recheckResume,
  fetchResumeScores,
  analyzeResume,
  fetchResumeAnalysis,
  fetchResumeAnalyses,
  deleteResumeAnalysis
} from '../services/api';

/**
 * PrepForge AI - Complete Resume Intelligence & Career Optimization Hub
 * Integrates Phase 2 Segmented Extraction, Phase 3 27-Point Checks,
 * Phase 4 Multi-Dimensional Scoring, and Phase 5.2 Deep AI Analysis.
 */
export const ResumeAnalyzerPage = () => {
  // Stored resumes state
  const [resumes, setResumes] = useState([]);
  const [selectedResume, setSelectedResume] = useState(null);
  const [isLoadingResumes, setIsLoadingResumes] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Active view tab: 'scores' | 'checks' | 'ai' | 'sections' | 'history'
  const [activeTab, setActiveTab] = useState('scores');

  // Multi-dimensional scores & checks state
  const [currentAnalysis, setCurrentAnalysis] = useState(null);
  const [checksData, setChecksData] = useState({ checks: [], checkSummary: null, categoryBreakdown: [] });
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
  const [isEvaluatingChecks, setIsEvaluatingChecks] = useState(false);
  const [isAnalyzingAI, setIsAnalyzingAI] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);

  // Target Role & Job Description Configuration
  const [targetRole, setTargetRole] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [isTargetRoleModalOpen, setIsTargetRoleModalOpen] = useState(false);

  // Score breakdown formula modal
  const [isBreakdownModalOpen, setIsBreakdownModalOpen] = useState(false);

  // Analysis History state
  const [analysisHistory, setAnalysisHistory] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Modals & Notifications
  const [toast, setToast] = useState(null);
  const [deleteCandidate, setDeleteCandidate] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [copied, setCopied] = useState(false);

  const fileInputRef = useRef(null);

  // 1. Load user resumes on mount
  const loadResumes = async () => {
    try {
      setIsLoadingResumes(true);
      const res = await fetchResumes();
      if (res.success && Array.isArray(res.data)) {
        setResumes(res.data);
        if (res.data.length > 0 && !selectedResume) {
          setSelectedResume(res.data[0]);
        }
      }
    } catch (err) {
      setToast({
        type: 'error',
        message: err.message || 'Failed to load resumes from server.',
      });
    } finally {
      setIsLoadingResumes(false);
    }
  };

  useEffect(() => {
    loadResumes();
  }, []);

  // 2. Load latest analysis and checks when a resume is selected
  const loadResumeIntelligence = async (resumeId) => {
    if (!resumeId) return;

    try {
      setIsLoadingAnalysis(true);
      setAnalysisError(null);

      // Concurrently fetch analysis and checks
      const [analysisResult, checksResult] = await Promise.allSettled([
        fetchResumeAnalysis(resumeId),
        fetchResumeChecks(resumeId),
      ]);

      // Handle Analysis
      if (analysisResult.status === 'fulfilled' && analysisResult.value?.analysis) {
        setCurrentAnalysis(analysisResult.value.analysis);
      } else {
        setCurrentAnalysis(null);
      }

      // Handle Checks
      if (checksResult.status === 'fulfilled' && checksResult.value?.success) {
        setChecksData({
          checks: checksResult.value.checks || [],
          checkSummary: checksResult.value.checkSummary || null,
          categoryBreakdown: checksResult.value.categoryBreakdown || [],
        });
      } else {
        setChecksData({ checks: [], checkSummary: null, categoryBreakdown: [] });
      }
    } catch (err) {
      console.warn('[ResumeAnalyzer] Error loading analysis/checks:', err.message);
    } finally {
      setIsLoadingAnalysis(false);
    }
  };

  useEffect(() => {
    if (selectedResume) {
      const resumeId = selectedResume.id || selectedResume._id;
      loadResumeIntelligence(resumeId);
    } else {
      setCurrentAnalysis(null);
      setChecksData({ checks: [], checkSummary: null, categoryBreakdown: [] });
    }
  }, [selectedResume]);

  // 3. Load analysis history on tab switch
  const loadHistory = async () => {
    try {
      setIsLoadingHistory(true);
      const res = await fetchResumeAnalyses({ limit: 20 });
      if (res.success && Array.isArray(res.data)) {
        setAnalysisHistory(res.data);
      }
    } catch (err) {
      setToast({
        type: 'error',
        message: err.message || 'Failed to load analysis history.',
      });
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory();
    }
  }, [activeTab]);

  // Format file size
  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  // Format timestamp
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

  // 4. File Validation & Upload Workflow
  const validateFile = (file) => {
    if (!file) return 'No file selected.';
    const allowedExtensions = ['.pdf', '.docx', '.txt'];
    const fileName = file.name.toLowerCase();
    const hasValidExt = allowedExtensions.some((ext) => fileName.endsWith(ext));

    if (!hasValidExt) {
      return 'Unsupported file format. Please upload PDF (.pdf), Word (.docx), or Text (.txt).';
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return `File exceeds 5MB size limit (${formatFileSize(file.size)}). Please choose a smaller file.`;
    }

    return null;
  };

  const handleFileUpload = async (file) => {
    const error = validateFile(file);
    if (error) {
      setToast({ type: 'error', message: error });
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(20);

      const progressTimer = setInterval(() => {
        setUploadProgress((prev) => (prev < 85 ? prev + 15 : prev));
      }, 200);

      const res = await uploadResume(file);
      clearInterval(progressTimer);
      setUploadProgress(100);

      if (res.success && res.resume) {
        setToast({
          type: 'success',
          message: `Resume "${file.name}" uploaded and parsed into structured sections!`,
        });

        setResumes((prev) => [res.resume, ...prev]);
        setSelectedResume(res.resume);
        setCurrentAnalysis(null);
        setChecksData({ checks: [], checkSummary: null, categoryBreakdown: [] });
        setActiveTab('sections'); // Guide user to inspect extracted sections first
      }
    } catch (err) {
      setToast({
        type: 'error',
        message: err.message || 'Failed to upload resume. Please check the file.',
      });
    } finally {
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }, 500);
    }
  };

  // 5. Run 27-Point Deterministic Checks Workflow
  const handleRunChecks = async (overrideParams = null) => {
    if (!selectedResume) return;
    const resumeId = selectedResume.id || selectedResume._id;

    const payload = {
      targetRole: overrideParams?.targetRole ?? targetRole,
      jobDescription: overrideParams?.jobDescription ?? jobDescription,
    };

    try {
      setIsEvaluatingChecks(true);
      setAnalysisError(null);

      const res = await runResumeChecks(resumeId, payload);
      if (res.success) {
        setChecksData({
          checks: res.checks || [],
          checkSummary: res.checkSummary || null,
          categoryBreakdown: res.categoryBreakdown || [],
        });

        // Also update scores state
        setCurrentAnalysis((prev) => ({
          ...(prev || {}),
          overallScore: res.overallScore,
          subScores: res.subScores,
          scoreConfidence: res.scoreConfidence,
          scoringBreakdown: res.scoringBreakdown,
          checkSummary: res.checkSummary,
        }));

        setToast({
          type: 'success',
          message: `27 checks evaluated in ${res.durationMs || 'sub-50'}ms! Overall Score: ${res.overallScore}/100`,
        });
      }
    } catch (err) {
      const errorMsg = err.message || 'Failed to evaluate resume checks. Please try again.';
      setAnalysisError(errorMsg);
      setToast({ type: 'error', message: errorMsg });
    } finally {
      setIsEvaluatingChecks(false);
    }
  };

  // 6. Run Deep AI Resume Analysis Workflow
  const handleTriggerAIAnalysis = async (overrideParams = null) => {
    if (!selectedResume) return;
    const resumeId = selectedResume.id || selectedResume._id;

    const payload = {
      targetRole: overrideParams?.targetRole ?? targetRole,
      jobDescription: overrideParams?.jobDescription ?? jobDescription,
    };

    try {
      setIsAnalyzingAI(true);
      setAnalysisError(null);

      const res = await analyzeResume(resumeId, payload);
      if (res.success && res.analysis) {
        setCurrentAnalysis(res.analysis);
        setActiveTab('ai'); // Switch to AI tab to view rich insights

        // Also refresh checks data
        if (res.analysis.checkSummary) {
          const checksRes = await fetchResumeChecks(resumeId);
          if (checksRes.success) {
            setChecksData({
              checks: checksRes.checks || [],
              checkSummary: checksRes.checkSummary,
              categoryBreakdown: checksRes.categoryBreakdown || [],
            });
          }
        }

        setToast({
          type: 'success',
          message: `Deep AI analysis complete! Overall Score: ${res.analysis.overallScore}/100`,
        });
      }
    } catch (err) {
      let errorMsg = err.message || 'An error occurred during AI analysis.';
      if (err.status === 429) {
        errorMsg = 'Rate limit reached for AI analysis. Please wait a moment before trying again.';
      } else if (err.status === 409) {
        errorMsg = 'An AI analysis is currently running for this resume. Please wait for it to finish.';
      } else if (err.status === 504) {
        errorMsg = 'AI request timed out. Please retry in a few moments.';
      }

      setAnalysisError(errorMsg);
      setToast({ type: 'error', message: errorMsg });
    } finally {
      setIsAnalyzingAI(false);
    }
  };

  // 7. Delete Resume
  const confirmDeleteResume = async () => {
    if (!deleteCandidate) return;

    try {
      setIsDeleting(true);
      const id = deleteCandidate.id || deleteCandidate._id;
      await deleteResume(id);

      setResumes((prev) => prev.filter((r) => (r.id || r._id) !== id));

      if ((selectedResume?.id || selectedResume?._id) === id) {
        const remaining = resumes.filter((r) => (r.id || r._id) !== id);
        setSelectedResume(remaining.length > 0 ? remaining[0] : null);
        setCurrentAnalysis(null);
        setChecksData({ checks: [], checkSummary: null, categoryBreakdown: [] });
      }

      setToast({
        type: 'success',
        message: `Resume "${deleteCandidate.originalFileName}" deleted successfully.`,
      });
    } catch (err) {
      setToast({
        type: 'error',
        message: err.message || 'Failed to delete resume.',
      });
    } finally {
      setIsDeleting(false);
      setDeleteCandidate(null);
    }
  };

  // 8. Delete History Record
  const handleDeleteAnalysisRecord = async (analysisId) => {
    try {
      await deleteResumeAnalysis(analysisId);
      setAnalysisHistory((prev) => prev.filter((item) => (item.id || item._id) !== analysisId));

      if ((currentAnalysis?.id || currentAnalysis?._id) === analysisId) {
        setCurrentAnalysis(null);
      }

      setToast({
        type: 'success',
        message: 'Analysis record deleted successfully.',
      });
    } catch (err) {
      setToast({
        type: 'error',
        message: err.message || 'Failed to delete analysis.',
      });
    }
  };

  // Filter resumes in sidebar
  const filteredResumes = resumes.filter((r) =>
    r.originalFileName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

      {/* Target Role & Job Description Modal */}
      <TargetRoleModal
        isOpen={isTargetRoleModalOpen}
        onClose={() => setIsTargetRoleModalOpen(false)}
        initialTargetRole={targetRole}
        initialJobDescription={jobDescription}
        isLoading={isEvaluatingChecks || isAnalyzingAI}
        onSubmit={({ targetRole: newRole, jobDescription: newJd }) => {
          setTargetRole(newRole || '');
          setJobDescription(newJd || '');
          setIsTargetRoleModalOpen(false);
          handleRunChecks({ targetRole: newRole, jobDescription: newJd });
        }}
      />

      {/* Mathematical Score Breakdown Modal */}
      <ScoreBreakdown
        isOpen={isBreakdownModalOpen}
        onClose={() => setIsBreakdownModalOpen(false)}
        overallScore={currentAnalysis?.overallScore}
        subScores={currentAnalysis?.subScores}
        scoringBreakdown={currentAnalysis?.scoringBreakdown}
      />

      {/* Delete Confirmation Modal */}
      {deleteCandidate && (
        <Modal
          isOpen={!!deleteCandidate}
          onClose={() => setDeleteCandidate(null)}
          title="Delete Resume Document"
        >
          <div className="space-y-4 text-left">
            <p className="text-xs text-[#CBD5E1]">
              Are you sure you want to permanently delete <strong>{deleteCandidate.originalFileName}</strong>? This will remove all associated ATS checks and AI analysis records.
            </p>
            <div className="flex justify-end gap-2 pt-2">
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
                onClick={confirmDeleteResume}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete Permanently'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Page Header */}
      <PageHeader
        title="Resume Intelligence & Multi-Dimensional ATS Engine"
        subtitle="Upload, extract structured sections, execute 27 deterministic checks, and receive grounded AI rewrites powered by Google Gemini."
        badgeText={`${resumes.length} ${resumes.length === 1 ? 'Resume' : 'Resumes'} Stored`}
      />

      {/* Drag & Drop Upload Zone */}
      <Card
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (e.dataTransfer.files?.length > 0) handleFileUpload(e.dataTransfer.files[0]);
        }}
        className={`border-2 border-dashed transition-all duration-200 text-center py-7 px-6 space-y-4 ${
          isDragging 
            ? 'border-[#7657FF] bg-[#182238] shadow-xl ring-4 ring-[#7657FF]/20' 
            : 'border-[#334155] bg-[#0D1220]/80 hover:border-[#475569]'
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => {
            if (e.target.files?.length > 0) handleFileUpload(e.target.files[0]);
          }}
          accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
          className="hidden"
          disabled={isUploading}
        />

        <div className="w-12 h-12 rounded-2xl bg-[#7657FF]/15 border border-[#7657FF]/30 flex items-center justify-center text-[#B49DFF] mx-auto shadow-md">
          {isUploading ? (
            <LoadingSpinner size="md" color="text-[#B49DFF]" />
          ) : (
            <UploadCloud className="w-6 h-6" />
          )}
        </div>

        <div className="space-y-1 max-w-md mx-auto">
          <h3 className="text-sm font-bold text-[#F8FAFC]">
            {isUploading ? 'Extracting Text & Segmenting Sections...' : 'Upload Resume File for Multi-Factor Audit'}
          </h3>
          <p className="text-xs text-[#94A3B8]">
            Supports PDF, Word (.docx), or Text (.txt) up to 5MB. Clean text and headings will be parsed automatically.
          </p>
        </div>

        {/* Upload Progress Bar */}
        {isUploading && (
          <div className="max-w-xs mx-auto space-y-1.5">
            <div className="flex justify-between text-[11px] text-[#94A3B8]">
              <span>Extracting text & validating...</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full h-1.5 bg-[#1E293B] rounded-full overflow-hidden border border-[#334155]">
              <div 
                className="h-full bg-gradient-to-r from-[#7657FF] to-[#3985FF] transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        <div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
            className="px-5 text-xs"
          >
            {isUploading ? 'Uploading...' : 'Browse Local Files'}
          </Button>
        </div>
      </Card>

      {/* Main Two-Column Workbench */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Stored Resume List */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#F8FAFC] flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#7657FF]" />
              <span>Your Resumes</span>
              <span className="text-[11px] bg-[#1E293B] text-[#94A3B8] px-2 py-0.5 rounded-full border border-[#334155]">
                {resumes.length}
              </span>
            </h3>

            <button
              onClick={loadResumes}
              disabled={isLoadingResumes}
              className="text-[#94A3B8] hover:text-[#F8FAFC] transition-colors p-1 rounded hover:bg-[#1E293B]"
              title="Refresh resumes"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingResumes ? 'animate-spin text-[#7657FF]' : ''}`} />
            </button>
          </div>

          {/* Search Box */}
          {resumes.length > 2 && (
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
              <input
                type="text"
                placeholder="Search resumes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[#1E293B] border border-[#334155] text-xs text-[#F8FAFC] placeholder:text-[#94A3B8] focus:border-[#7657FF] outline-none"
              />
            </div>
          )}

          {/* Resume Items */}
          {isLoadingResumes ? (
            <div className="p-8 text-center bg-[#0D1220] rounded-2xl border border-[#334155]/60">
              <LoadingSpinner size="md" message="Loading your resumes..." />
            </div>
          ) : filteredResumes.length === 0 ? (
            <Card className="bg-[#0D1220]/80 border-[#334155] p-6 text-center">
              <EmptyState
                icon={FileText}
                title={searchTerm ? 'No matching resumes' : 'No Resumes Uploaded'}
                description={
                  searchTerm 
                    ? 'Try searching with a different file name.' 
                    : 'Upload a PDF or DOCX file using the upload card above.'
                }
              />
            </Card>
          ) : (
            <div className="space-y-2 max-h-[640px] overflow-y-auto pr-1">
              {filteredResumes.map((resume) => {
                const id = resume.id || resume._id;
                const isSelected = (selectedResume?.id || selectedResume?._id) === id;
                const fileType = (resume.fileType || resume.fileFormat || 'pdf').toUpperCase();

                return (
                  <div
                    key={id}
                    onClick={() => setSelectedResume(resume)}
                    className={`group p-3.5 rounded-xl border transition-all duration-200 cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-[#182238] border-[#7657FF] shadow-md ring-1 ring-[#7657FF]/40'
                        : 'bg-[#0D1220] border-[#334155]/80 hover:bg-[#151D2E] hover:border-[#475569]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 border ${
                        fileType === 'PDF' 
                          ? 'bg-[#EF4444]/15 border-[#EF4444]/30 text-[#F87171]' 
                          : fileType === 'DOCX'
                          ? 'bg-[#3985FF]/15 border-[#3985FF]/30 text-[#60A5FA]'
                          : 'bg-[#10B981]/15 border-[#10B981]/30 text-[#34D399]'
                      }`}>
                        <FileText className="w-4 h-4" />
                      </div>

                      <div className="min-w-0 space-y-0.5 text-left">
                        <p className="text-xs font-semibold text-[#F8FAFC] truncate">
                          {resume.originalFileName}
                        </p>
                        <div className="flex items-center gap-2 text-[10px] text-[#94A3B8]">
                          <span className="font-medium text-[#CBD5E1]">{fileType}</span>
                          <span>•</span>
                          <span>{formatFileSize(resume.fileSize)}</span>
                          <span>•</span>
                          <span>{formatDate(resume.uploadedAt || resume.createdAt)}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteCandidate(resume);
                      }}
                      className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors flex-shrink-0"
                      title="Delete resume"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Workbench & Multi-Tab Analysis */}
        <div className="lg:col-span-8 space-y-4">
          {selectedResume ? (
            <Card className="bg-[#121A2B] border-[#334155] p-6 space-y-6">
              
              {/* Selected Resume Header & Action Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#334155]">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-bold text-[#F8FAFC] break-all">
                      {selectedResume.originalFileName}
                    </h3>
                    <Badge variant="primary">
                      {(selectedResume.fileType || selectedResume.fileFormat || 'pdf').toUpperCase()}
                    </Badge>
                    {targetRole && (
                      <span className="text-[10px] bg-[#7657FF]/20 text-[#B49DFF] px-2 py-0.5 rounded-full border border-[#7657FF]/40 font-semibold flex items-center gap-1">
                        <Briefcase className="w-3 h-3" /> {targetRole}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#94A3B8]">
                    Uploaded on {formatDate(selectedResume.uploadedAt || selectedResume.createdAt)}
                  </p>
                </div>

                {/* Primary Action Buttons */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Configure Target Role / JD */}
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setIsTargetRoleModalOpen(true)}
                    className="flex items-center gap-1.5 text-xs"
                    title="Configure target role or paste job description"
                  >
                    <Briefcase className="w-3.5 h-3.5 text-[#F59E0B]" />
                    <span>{targetRole ? 'Edit Target JD' : 'Target Role / JD'}</span>
                  </Button>

                  {/* Run 27-Point Checks */}
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleRunChecks()}
                    disabled={isEvaluatingChecks || isAnalyzingAI}
                    className="flex items-center gap-1.5 text-xs font-semibold"
                  >
                    <Layers className={`w-3.5 h-3.5 text-[#7657FF] ${isEvaluatingChecks ? 'animate-spin' : ''}`} />
                    <span>{isEvaluatingChecks ? 'Checking...' : 'Run 27 Checks'}</span>
                  </Button>

                  {/* Run Deep AI Analysis */}
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleTriggerAIAnalysis()}
                    disabled={isEvaluatingChecks || isAnalyzingAI}
                    className="flex items-center gap-1.5 text-xs bg-gradient-to-r from-[#7657FF] to-[#3985FF] hover:opacity-95 shadow-lg shadow-[#7657FF]/25 font-semibold px-4"
                  >
                    {isAnalyzingAI ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>AI Auditing...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-white" />
                        <span>{currentAnalysis?.aiAnalysis ? 'Re-Analyze AI' : 'Deep AI Analysis'}</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* View Tabs */}
              <div className="flex items-center justify-between border-b border-[#334155]/60 pb-2 overflow-x-auto">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveTab('scores')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                      activeTab === 'scores'
                        ? 'bg-[#7657FF]/20 text-[#B49DFF] border border-[#7657FF]/40'
                        : 'text-[#94A3B8] hover:text-[#F8FAFC]'
                    }`}
                  >
                    <Award className="w-3.5 h-3.5" />
                    <span>Scores & Overview</span>
                    {typeof currentAnalysis?.overallScore === 'number' && (
                      <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#7657FF] text-white">
                        {currentAnalysis.overallScore}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => setActiveTab('checks')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                      activeTab === 'checks'
                        ? 'bg-[#7657FF]/20 text-[#B49DFF] border border-[#7657FF]/40'
                        : 'text-[#94A3B8] hover:text-[#F8FAFC]'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>27-Point Checks</span>
                    <span className="text-[10px] bg-[#1E293B] px-1.5 py-0.2 rounded-full border border-[#334155]">
                      {checksData.checks?.length || 27}
                    </span>
                  </button>

                  <button
                    onClick={() => setActiveTab('ai')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                      activeTab === 'ai'
                        ? 'bg-[#7657FF]/20 text-[#B49DFF] border border-[#7657FF]/40'
                        : 'text-[#94A3B8] hover:text-[#F8FAFC]'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>AI Deep Intelligence</span>
                    {currentAnalysis?.aiAnalysis && (
                      <span className="w-2 h-2 rounded-full bg-[#10B981]" />
                    )}
                  </button>

                  <button
                    onClick={() => setActiveTab('sections')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                      activeTab === 'sections'
                        ? 'bg-[#7657FF]/20 text-[#B49DFF] border border-[#7657FF]/40'
                        : 'text-[#94A3B8] hover:text-[#F8FAFC]'
                    }`}
                  >
                    <FileCode className="w-3.5 h-3.5" />
                    <span>Extracted Sections</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('history')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                      activeTab === 'history'
                        ? 'bg-[#7657FF]/20 text-[#B49DFF] border border-[#7657FF]/40'
                        : 'text-[#94A3B8] hover:text-[#F8FAFC]'
                    }`}
                  >
                    <History className="w-3.5 h-3.5" />
                    <span>History</span>
                  </button>
                </div>
              </div>

              {/* Multi-Stage Animated Progress Bar */}
              <AnalysisProgress isAnalyzing={isAnalyzingAI || isEvaluatingChecks} />

              {/* Error Banner */}
              {analysisError && !isAnalyzingAI && !isEvaluatingChecks && (
                <div className="p-4 rounded-xl bg-[#EF4444]/15 border border-[#EF4444]/30 space-y-2 text-left">
                  <div className="flex items-center gap-2 text-[#F87171] text-xs font-bold">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>Operation Error</span>
                  </div>
                  <p className="text-xs text-[#FCA5A5]">{analysisError}</p>
                  <div className="pt-1 flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleRunChecks()}
                      className="text-xs flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Retry Checks</span>
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleTriggerAIAnalysis()}
                      className="text-xs flex items-center gap-1.5 bg-gradient-to-r from-[#7657FF] to-[#3985FF]"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Retry AI Analysis</span>
                    </Button>
                  </div>
                </div>
              )}

              {/* TAB 1: SCORES & OVERVIEW */}
              {activeTab === 'scores' && (
                <div className="space-y-6">
                  {currentAnalysis ? (
                    <ResumeScoreOverview
                      overallScore={currentAnalysis.overallScore}
                      subScores={currentAnalysis.subScores}
                      scoreConfidence={currentAnalysis.scoreConfidence}
                      checkSummary={currentAnalysis.checkSummary || checksData.checkSummary}
                      timestamp={currentAnalysis.evaluatedAt || currentAnalysis.scoredAt || currentAnalysis.createdAt}
                      modelUsed={currentAnalysis.modelUsed}
                      onOpenBreakdown={() => setIsBreakdownModalOpen(true)}
                    />
                  ) : (
                    <div className="p-8 rounded-2xl bg-[#0D1220] border border-[#334155] text-center space-y-4">
                      <div className="w-12 h-12 rounded-2xl bg-[#7657FF]/15 text-[#B49DFF] border border-[#7657FF]/30 flex items-center justify-center mx-auto shadow-md">
                        <Award className="w-6 h-6" />
                      </div>
                      <div className="space-y-1 max-w-md mx-auto">
                        <h4 className="text-sm font-bold text-[#F8FAFC]">
                          Resume Extracted & Ready for Evaluation
                        </h4>
                        <p className="text-xs text-[#94A3B8]">
                          Execute the 27-point checking engine to calculate ATS compatibility, content quality, and structure scores.
                        </p>
                      </div>
                      <div className="flex items-center justify-center gap-3">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleRunChecks()}
                          disabled={isEvaluatingChecks}
                          className="bg-gradient-to-r from-[#7657FF] to-[#3985FF] text-xs px-5 font-semibold"
                        >
                          <Layers className="w-3.5 h-3.5 mr-1.5" />
                          <span>Run 27-Point Checks</span>
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setIsTargetRoleModalOpen(true)}
                          className="text-xs"
                        >
                          <Briefcase className="w-3.5 h-3.5 mr-1.5 text-[#F59E0B]" />
                          <span>Set Target Role</span>
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Category Summary Cards */}
                  {checksData.checks?.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-[#CBD5E1] uppercase tracking-wider">
                          Seven Category Performance Overview
                        </h4>
                        <button
                          onClick={() => setActiveTab('checks')}
                          className="text-xs text-[#7657FF] hover:underline flex items-center gap-1 font-semibold"
                        >
                          <span>Explore All 27 Checks</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        {['CAT-01', 'CAT-02', 'CAT-03', 'CAT-04', 'CAT-05', 'CAT-06', 'CAT-07'].map((catId) => {
                          const catChecks = checksData.checks.filter((c) => c.categoryId === catId);
                          const passed = catChecks.filter((c) => c.status === 'PASS').length;
                          const warning = catChecks.filter((c) => c.status === 'WARNING').length;
                          const failed = catChecks.filter((c) => c.status === 'FAIL').length;
                          const notEvaluated = catChecks.filter((c) => c.status === 'NOT_EVALUATED').length;
                          const backendCat = checksData.categoryBreakdown.find((b) => b.categoryId === catId);
                          const score = backendCat ? backendCat.score : (catChecks.length > 0 && notEvaluated < catChecks.length ? Math.round((passed / Math.max(1, catChecks.length - notEvaluated)) * 100) : null);

                          return (
                            <div
                              key={catId}
                              onClick={() => setActiveTab('checks')}
                              className="p-3.5 rounded-xl bg-[#0D1220] border border-[#334155]/80 hover:border-[#7657FF] transition-all cursor-pointer space-y-2"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-[10px] text-[#B49DFF] font-bold">{catId}</span>
                                {catId === 'CAT-06' ? (
                                  <span className="text-[9px] bg-[#6366F1]/20 text-[#A5B4FC] px-1.5 py-0.2 rounded border border-[#6366F1]/30">Advisory</span>
                                ) : (
                                  <span className="text-xs font-bold text-[#F8FAFC]">{score !== null ? `${score}%` : 'N/A'}</span>
                                )}
                              </div>
                              <div className="text-xs font-semibold text-[#CBD5E1] truncate">
                                {backendCat?.categoryName || catId}
                              </div>
                              <div className="flex gap-1 text-[9px]">
                                <span className="text-[#10B981]">{passed}P</span>
                                <span className="text-[#F59E0B]">{warning}W</span>
                                <span className="text-[#EF4444]">{failed}F</span>
                                <span className="text-[#94A3B8]">{notEvaluated}NE</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: 27-POINT CHECKS */}
              {activeTab === 'checks' && (
                <div className="space-y-6">
                  {checksData.checks?.length > 0 ? (
                    <ChecksExplorer
                      checks={checksData.checks}
                      categoryBreakdown={checksData.categoryBreakdown}
                      checkSummary={checksData.checkSummary}
                      onRecheck={() => handleRunChecks()}
                      onOpenTargetRoleModal={() => setIsTargetRoleModalOpen(true)}
                      isRechecking={isEvaluatingChecks}
                      targetRole={targetRole}
                    />
                  ) : (
                    <div className="p-8 rounded-2xl bg-[#0D1220] border border-[#334155] text-center space-y-4">
                      <div className="w-12 h-12 rounded-2xl bg-[#7657FF]/15 text-[#B49DFF] border border-[#7657FF]/30 flex items-center justify-center mx-auto">
                        <Layers className="w-6 h-6" />
                      </div>
                      <div className="space-y-1 max-w-md mx-auto">
                        <h4 className="text-sm font-bold text-[#F8FAFC]">
                          27-Point Check Engine Ready
                        </h4>
                        <p className="text-xs text-[#94A3B8]">
                          Evaluate all seven categories including ATS Essentials, Sections, Measurable Content, and Bias Prevention.
                        </p>
                      </div>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleRunChecks()}
                        disabled={isEvaluatingChecks}
                        className="bg-gradient-to-r from-[#7657FF] to-[#3985FF] text-xs px-5 font-semibold"
                      >
                        <Layers className="w-3.5 h-3.5 mr-1.5" />
                        <span>Run All 27 Checks</span>
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: AI DEEP INTELLIGENCE */}
              {activeTab === 'ai' && (
                <AIInsightsPanel
                  aiAnalysis={currentAnalysis?.aiAnalysis}
                  resumeFileName={selectedResume.originalFileName}
                  onTriggerAnalysis={() => handleTriggerAIAnalysis()}
                  isAnalyzing={isAnalyzingAI}
                />
              )}

              {/* TAB 4: EXTRACTED SECTIONS */}
              {activeTab === 'sections' && (
                <ParsedSectionsView resume={selectedResume} />
              )}

              {/* TAB 5: HISTORY */}
              {activeTab === 'history' && (
                <div className="space-y-4 text-left">
                  <div className="flex items-center justify-between pb-2 border-b border-[#334155]/60">
                    <h4 className="text-xs font-bold text-[#CBD5E1] uppercase tracking-wider flex items-center gap-1.5">
                      <History className="w-3.5 h-3.5 text-[#7657FF]" />
                      <span>Audit History Records</span>
                    </h4>
                    <span className="text-xs text-[#94A3B8]">{analysisHistory.length} Recorded</span>
                  </div>

                  {isLoadingHistory ? (
                    <div className="p-8 text-center">
                      <LoadingSpinner size="md" message="Loading audit history..." />
                    </div>
                  ) : analysisHistory.length === 0 ? (
                    <div className="p-8 text-center text-xs text-[#94A3B8] bg-[#0D1220] rounded-xl border border-[#334155]/60">
                      No previous analysis records found. Run an evaluation to start tracking improvements.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {analysisHistory.map((item) => {
                        const id = item.id || item._id;
                        return (
                          <div
                            key={id}
                            className="p-3.5 rounded-xl bg-[#0D1220] border border-[#334155]/80 flex items-center justify-between gap-4 hover:border-[#475569] transition-all"
                          >
                            <div className="space-y-0.5">
                              <span className="text-xs font-bold text-[#F8FAFC]">
                                Score: {item.overallScore}/100
                              </span>
                              <div className="flex items-center gap-2 text-[10px] text-[#94A3B8]">
                                <span>Model: {item.modelUsed || 'gemini-3.7-flash'}</span>
                                <span>•</span>
                                <span>{formatDate(item.createdAt)}</span>
                              </div>
                            </div>

                            <button
                              onClick={() => handleDeleteAnalysisRecord(id)}
                              className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors"
                              title="Delete record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </Card>
          ) : (
            <div className="p-12 text-center bg-[#0D1220] rounded-2xl border border-[#334155] space-y-3">
              <FileText className="w-10 h-10 text-[#64748B] mx-auto" />
              <h4 className="text-base font-bold text-[#F8FAFC]">Select or Upload a Resume</h4>
              <p className="text-xs text-[#94A3B8] max-w-sm mx-auto">
                Choose a resume from your library on the left or upload a new file above to view multi-dimensional scores and 27-point checks.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResumeAnalyzerPage;
