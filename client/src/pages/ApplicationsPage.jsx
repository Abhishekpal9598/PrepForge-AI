import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Briefcase,
  Plus,
  Building,
  MapPin,
  Calendar,
  Clock,
  ExternalLink,
  Search,
  Filter,
  Trash2,
  Edit2,
  Eye,
  CheckCircle2,
  XCircle,
  HelpCircle,
  TrendingUp,
  FileText,
  Sparkles,
  Layers,
  List,
  Kanban,
  DollarSign,
  AlertTriangle,
  ArrowRight,
  MoreVertical,
} from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { Modal } from '../components/Modal';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { EmptyState } from '../components/EmptyState';
import {
  fetchApplications,
  fetchApplicationStats,
  createApplication,
  updateApplication,
  deleteApplication,
  fetchResumes,
  fetchJobAnalyses,
} from '../services/api';

const STATUS_CONFIG = {
  Saved: {
    label: 'Saved',
    variant: 'neutral',
    color: '#94A3B8',
    bgColor: 'bg-white/[0.04]',
    borderColor: 'border-white/[0.08]',
  },
  Applied: {
    label: 'Applied',
    variant: 'blue',
    color: '#3985FF',
    bgColor: 'bg-[#3985FF]/10',
    borderColor: 'border-[#3985FF]/30',
  },
  Assessment: {
    label: 'Assessment',
    variant: 'brand',
    color: '#7657FF',
    bgColor: 'bg-[#7657FF]/10',
    borderColor: 'border-[#7657FF]/30',
  },
  Interview: {
    label: 'Interview',
    variant: 'warning',
    color: '#F5B942',
    bgColor: 'bg-[#F5B942]/10',
    borderColor: 'border-[#F5B942]/30',
  },
  Offer: {
    label: 'Offer',
    variant: 'success',
    color: '#22C98B',
    bgColor: 'bg-[#22C98B]/10',
    borderColor: 'border-[#22C98B]/30',
  },
  Rejected: {
    label: 'Rejected',
    variant: 'error',
    color: '#EF4444',
    bgColor: 'bg-[#EF4444]/10',
    borderColor: 'border-[#EF4444]/30',
  },
  Withdrawn: {
    label: 'Withdrawn',
    variant: 'neutral',
    color: '#64748B',
    bgColor: 'bg-white/[0.02]',
    borderColor: 'border-white/[0.05]',
  },
};

const STATUS_LIST = ['Saved', 'Applied', 'Assessment', 'Interview', 'Offer', 'Rejected', 'Withdrawn'];

export const ApplicationsPage = () => {
  const navigate = useNavigate();

  // Data states
  const [applications, setApplications] = useState([]);
  const [stats, setStats] = useState(null);
  const [resumes, setResumes] = useState([]);
  const [jobAnalyses, setJobAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & display
  const [viewMode, setViewMode] = useState('kanban'); // 'kanban' | 'list'
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('applicationDate');
  const [sortOrder, setSortOrder] = useState('desc');

  // Modals & form state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Form inputs
  const initialFormState = {
    companyName: '',
    jobTitle: '',
    location: 'Remote',
    employmentType: 'Full-time',
    status: 'Saved',
    applicationDate: new Date().toISOString().split('T')[0],
    deadline: '',
    jobUrl: '',
    salaryExpectation: '',
    resumeId: '',
    jobAnalysisId: '',
    notes: '',
    jobDescription: '',
  };
  const [formData, setFormData] = useState(initialFormState);

  // Load applications & stats
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [appsRes, statsRes] = await Promise.all([
        fetchApplications({
          status: statusFilter,
          search: searchTerm,
          sortBy,
          sortOrder,
          limit: 100,
        }),
        fetchApplicationStats().catch(() => null),
      ]);

      setApplications(appsRes.data || []);
      if (statsRes?.data) {
        setStats(statsRes.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to load applications pipeline.');
    } finally {
      setLoading(false);
      setStatsLoading(false);
    }
  }, [statusFilter, searchTerm, sortBy, sortOrder]);

  // Load auxiliary data for dropdowns (resumes and job analyses)
  useEffect(() => {
    const loadAuxiliary = async () => {
      try {
        const [rRes, jRes] = await Promise.all([
          fetchResumes().catch(() => ({ data: [] })),
          fetchJobAnalyses().catch(() => ({ data: [] })),
        ]);
        setResumes(rRes.data || []);
        setJobAnalyses(jRes.data || []);
      } catch (err) {
        console.warn('Failed to load auxiliary resumes/job matches', err);
      }
    };
    loadAuxiliary();
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Open Add Modal
  const handleOpenAdd = () => {
    setFormData(initialFormState);
    setFormError('');
    setIsAddModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (app) => {
    setSelectedApp(app);
    setFormData({
      companyName: app.companyName || '',
      jobTitle: app.jobTitle || app.positionTitle || '',
      location: app.location || 'Remote',
      employmentType: app.employmentType || 'Full-time',
      status: app.status || 'Saved',
      applicationDate: app.applicationDate ? new Date(app.applicationDate).toISOString().split('T')[0] : '',
      deadline: app.deadline ? new Date(app.deadline).toISOString().split('T')[0] : '',
      jobUrl: app.jobUrl || '',
      salaryExpectation: app.salaryExpectation !== null && app.salaryExpectation !== undefined ? app.salaryExpectation : '',
      resumeId: app.resumeId?._id || app.resumeId || '',
      jobAnalysisId: app.jobAnalysisId?._id || app.jobAnalysisId || '',
      notes: app.notes || '',
      jobDescription: app.jobDescription || '',
    });
    setFormError('');
    setIsEditModalOpen(true);
  };

  // Open Detail Modal
  const handleOpenDetail = (app) => {
    setSelectedApp(app);
    setIsDetailModalOpen(true);
  };

  // Open Delete Modal
  const handleOpenDelete = (app) => {
    setSelectedApp(app);
    setIsDeleteModalOpen(true);
  };

  // Form Submit (Create)
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.companyName.trim()) {
      setFormError('Company name is required.');
      return;
    }
    if (!formData.jobTitle.trim()) {
      setFormError('Job title is required.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        ...formData,
        salaryExpectation: formData.salaryExpectation ? Number(formData.salaryExpectation) : null,
        deadline: formData.deadline ? new Date(formData.deadline).toISOString() : null,
        applicationDate: formData.applicationDate ? new Date(formData.applicationDate).toISOString() : new Date().toISOString(),
        resumeId: formData.resumeId || null,
        jobAnalysisId: formData.jobAnalysisId || null,
      };

      await createApplication(payload);
      setIsAddModalOpen(false);
      await loadData();
    } catch (err) {
      setFormError(err.message || 'Failed to create job application.');
    } finally {
      setSubmitting(false);
    }
  };

  // Form Submit (Update)
  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.companyName.trim()) {
      setFormError('Company name is required.');
      return;
    }
    if (!formData.jobTitle.trim()) {
      setFormError('Job title is required.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        ...formData,
        salaryExpectation: formData.salaryExpectation ? Number(formData.salaryExpectation) : null,
        deadline: formData.deadline ? new Date(formData.deadline).toISOString() : null,
        applicationDate: formData.applicationDate ? new Date(formData.applicationDate).toISOString() : new Date().toISOString(),
        resumeId: formData.resumeId || null,
        jobAnalysisId: formData.jobAnalysisId || null,
      };

      await updateApplication(selectedApp._id, payload);
      setIsEditModalOpen(false);
      await loadData();
    } catch (err) {
      setFormError(err.message || 'Failed to update job application.');
    } finally {
      setSubmitting(false);
    }
  };

  // Quick Status Transition
  const handleQuickStatusChange = async (appId, newStatus) => {
    try {
      await updateApplication(appId, { status: newStatus });
      await loadData();
    } catch (err) {
      console.error('Failed to change status', err);
    }
  };

  // Delete Action
  const handleDeleteConfirm = async () => {
    if (!selectedApp) return;
    try {
      setSubmitting(true);
      await deleteApplication(selectedApp._id);
      setIsDeleteModalOpen(false);
      setSelectedApp(null);
      await loadData();
    } catch (err) {
      alert(err.message || 'Failed to delete application');
    } finally {
      setSubmitting(false);
    }
  };

  // Format currency
  const formatSalary = (val) => {
    if (!val && val !== 0) return null;
    return `$${Number(val).toLocaleString()}`;
  };

  // Format date
  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return 'N/A';
    }
  };

  // Group applications by status for Kanban view
  const kanbanColumns = useMemo(() => {
    const columns = {
      Saved: [],
      Applied: [],
      Assessment: [],
      Interview: [],
      Offer: [],
      Rejected: [],
      Withdrawn: [],
    };

    applications.forEach((app) => {
      let st = app.status;
      if (st === 'Interviewing') st = 'Interview';
      if (st === 'Offered') st = 'Offer';
      if (columns[st]) {
        columns[st].push(app);
      } else {
        columns.Saved.push(app);
      }
    });

    return columns;
  }, [applications]);

  return (
    <div className="space-y-8 pb-12">
      {/* Page Header */}
      <PageHeader
        title="Job Application Pipeline"
        subtitle="Track active job applications, interview stages, deadlines, and launch targeted AI prep."
        badgeText="Pipeline Management"
      >
        <Button variant="primary" size="sm" leftIcon={Plus} onClick={handleOpenAdd}>
          Add Application
        </Button>
      </PageHeader>

      {/* KPI Statistics Dashboard */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          <Card className="p-4 bg-[#0D1220] border-white/[0.08] space-y-1">
            <span className="text-[11px] font-medium text-[#94A3B8] uppercase tracking-wider">
              Total Applications
            </span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-extrabold text-[#F8FAFC] font-mono">
                {stats.total || 0}
              </span>
              <Briefcase className="w-4 h-4 text-[#7657FF]" />
            </div>
            <p className="text-[10px] text-[#94A3B8]">Across all active stages</p>
          </Card>

          <Card className="p-4 bg-[#0D1220] border-white/[0.08] space-y-1">
            <span className="text-[11px] font-medium text-[#94A3B8] uppercase tracking-wider">
              Applied Stage
            </span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-extrabold text-[#3985FF] font-mono">
                {stats.applied || 0}
              </span>
              <Clock className="w-4 h-4 text-[#3985FF]" />
            </div>
            <p className="text-[10px] text-[#94A3B8]">Awaiting employer review</p>
          </Card>

          <Card className="p-4 bg-[#0D1220] border-white/[0.08] space-y-1">
            <span className="text-[11px] font-medium text-[#94A3B8] uppercase tracking-wider">
              Interviews
            </span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-extrabold text-[#F5B942] font-mono">
                {stats.interview || 0}
              </span>
              <Sparkles className="w-4 h-4 text-[#F5B942]" />
            </div>
            <p className="text-[10px] text-[#94A3B8]">Active rounds in progress</p>
          </Card>

          <Card className="p-4 bg-[#0D1220] border-white/[0.08] space-y-1">
            <span className="text-[11px] font-medium text-[#94A3B8] uppercase tracking-wider">
              Offers Received
            </span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-extrabold text-[#22C98B] font-mono">
                {stats.offer || 0}
              </span>
              <CheckCircle2 className="w-4 h-4 text-[#22C98B]" />
            </div>
            <p className="text-[10px] text-[#94A3B8]">Offers extended</p>
          </Card>

          <Card className="p-4 bg-[#0D1220] border-white/[0.08] space-y-1">
            <span className="text-[11px] font-medium text-[#94A3B8] uppercase tracking-wider">
              Interview Rate
            </span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-extrabold text-[#7657FF] font-mono">
                {stats.interviewConversionRate}%
              </span>
              <TrendingUp className="w-4 h-4 text-[#7657FF]" />
            </div>
            <p className="text-[10px] text-[#94A3B8] truncate" title="Interviews & Offers / Total Submitted">
              Interviews / Submissions
            </p>
          </Card>

          <Card className="p-4 bg-[#0D1220] border-white/[0.08] space-y-1">
            <span className="text-[11px] font-medium text-[#94A3B8] uppercase tracking-wider">
              Offer Rate
            </span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-extrabold text-[#22C98B] font-mono">
                {stats.offerConversionRate}%
              </span>
              <TrendingUp className="w-4 h-4 text-[#22C98B]" />
            </div>
            <p className="text-[10px] text-[#94A3B8] truncate" title="Offers / Total Interviewed">
              Offers / Interviews
            </p>
          </Card>
        </div>
      )}

      {/* Control & Filter Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3.5 bg-[#0D1220] p-3 rounded-2xl border border-white/[0.08]">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
          <input
            type="text"
            placeholder="Search company, job title, or location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#1E293B]/60 text-sm text-[#F8FAFC] placeholder-[#94A3B8] pl-10 pr-4 py-2 rounded-xl border border-white/[0.08] focus:outline-none focus:border-[#7657FF] transition-colors"
          />
        </div>

        {/* Status Filter Dropdown / Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#1E293B]/60 text-xs text-[#F8FAFC] px-3 py-2 rounded-xl border border-white/[0.08] focus:outline-none focus:border-[#7657FF]"
          >
            <option value="All">All Statuses</option>
            {STATUS_LIST.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>

          {/* Sort Selector */}
          <select
            value={`${sortBy}_${sortOrder}`}
            onChange={(e) => {
              const [sb, so] = e.target.value.split('_');
              setSortBy(sb);
              setSortOrder(so);
            }}
            className="bg-[#1E293B]/60 text-xs text-[#F8FAFC] px-3 py-2 rounded-xl border border-white/[0.08] focus:outline-none focus:border-[#7657FF]"
          >
            <option value="applicationDate_desc">Applied: Newest First</option>
            <option value="applicationDate_asc">Applied: Oldest First</option>
            <option value="deadline_asc">Deadline: Soonest First</option>
            <option value="companyName_asc">Company: A to Z</option>
          </select>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-[#1E293B]/80 p-0.5 rounded-xl border border-white/[0.08]">
            <button
              type="button"
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-all ${
                viewMode === 'kanban'
                  ? 'bg-[#7657FF] text-[#F8FAFC] font-semibold shadow-sm'
                  : 'text-[#94A3B8] hover:text-[#F8FAFC]'
              }`}
              title="Kanban Board View"
            >
              <Kanban className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Board</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-all ${
                viewMode === 'list'
                  ? 'bg-[#7657FF] text-[#F8FAFC] font-semibold shadow-sm'
                  : 'text-[#94A3B8] hover:text-[#F8FAFC]'
              }`}
              title="List View"
            >
              <List className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">List</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="py-20 flex justify-center items-center">
          <LoadingSpinner size="lg" message="Loading your application pipeline..." />
        </div>
      ) : error ? (
        <Card className="p-8 text-center bg-[#EF4444]/10 border-[#EF4444]/30 space-y-3">
          <AlertTriangle className="w-8 h-8 text-[#EF4444] mx-auto" />
          <h3 className="text-base font-bold text-[#F8FAFC]">Failed to load applications</h3>
          <p className="text-xs text-[#94A3B8] max-w-md mx-auto">{error}</p>
          <Button variant="secondary" size="sm" onClick={loadData}>
            Try Again
          </Button>
        </Card>
      ) : applications.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title={searchTerm || statusFilter !== 'All' ? 'No matching applications' : 'No job applications tracked yet'}
          description={
            searchTerm || statusFilter !== 'All'
              ? 'Try adjusting your search criteria or resetting the status filters.'
              : 'Keep track of all your company submissions, interviews, and offers in one organized dashboard.'
          }
          action={
            <Button variant="primary" size="sm" leftIcon={Plus} onClick={handleOpenAdd}>
              Add First Application
            </Button>
          }
        />
      ) : viewMode === 'kanban' ? (
        /* KANBAN BOARD VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4 items-start">
          {STATUS_LIST.map((statusKey) => {
            const config = STATUS_CONFIG[statusKey];
            const columnApps = kanbanColumns[statusKey] || [];

            return (
              <div
                key={statusKey}
                className="bg-[#0D1220]/70 border border-white/[0.08] rounded-2xl p-3 flex flex-col min-h-[500px] space-y-3"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: config.color }}
                    />
                    <span className="text-xs font-bold text-[#F8FAFC]">
                      {config.label}
                    </span>
                  </div>
                  <span className="w-5 h-5 rounded-full bg-[#1E293B] text-[#94A3B8] flex items-center justify-center font-mono text-[10px] font-bold">
                    {columnApps.length}
                  </span>
                </div>

                {/* Cards in Column */}
                <div className="flex-1 space-y-3 overflow-y-auto max-h-[750px] pr-0.5">
                  {columnApps.length === 0 ? (
                    <div className="h-28 border border-dashed border-white/[0.06] rounded-xl flex items-center justify-center text-[11px] text-[#64748B]">
                      No applications
                    </div>
                  ) : (
                    columnApps.map((app) => (
                      <Card
                        key={app._id}
                        hover
                        className="p-3.5 bg-[#0D1220] border-white/[0.1] rounded-xl space-y-2.5 transition-all hover:border-[#7657FF]/40 group relative"
                      >
                        {/* Company & Dropdown Actions */}
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="text-xs font-bold text-[#F8FAFC] group-hover:text-[#B49DFF] transition-colors leading-snug">
                              {app.companyName}
                            </h4>
                            <p className="text-[11px] text-[#94A3B8] font-medium line-clamp-1">
                              {app.jobTitle || app.positionTitle}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenDetail(app)}
                              className="p-1 text-[#94A3B8] hover:text-[#F8FAFC] transition-colors rounded"
                              title="View details"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(app)}
                              className="p-1 text-[#94A3B8] hover:text-[#3985FF] transition-colors rounded"
                              title="Edit application"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenDelete(app)}
                              className="p-1 text-[#94A3B8] hover:text-[#EF4444] transition-colors rounded"
                              title="Delete application"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Location & Employment Type */}
                        <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-[#94A3B8]">
                          <span className="flex items-center gap-1 bg-[#1E293B]/70 px-1.5 py-0.5 rounded">
                            <MapPin className="w-2.5 h-2.5 text-[#94A3B8]" />
                            {app.location || 'Remote'}
                          </span>
                          <span className="bg-[#1E293B]/70 px-1.5 py-0.5 rounded">
                            {app.employmentType || 'Full-time'}
                          </span>
                        </div>

                        {/* Salary (if specified) */}
                        {app.salaryExpectation && (
                          <div className="text-[11px] font-semibold text-[#22C98B] flex items-center gap-1">
                            <DollarSign className="w-3 h-3 text-[#22C98B]" />
                            <span>{formatSalary(app.salaryExpectation)}</span>
                          </div>
                        )}

                        {/* Linked Resume & Job Match Pills */}
                        {(app.resumeId || app.jobAnalysisId) && (
                          <div className="pt-1.5 border-t border-white/[0.06] flex flex-wrap gap-1.5">
                            {app.resumeId && (
                              <span
                                className="inline-flex items-center gap-1 text-[9px] bg-[#7657FF]/10 text-[#B49DFF] border border-[#7657FF]/20 px-1.5 py-0.5 rounded max-w-[130px] truncate"
                                title={`Linked Resume: ${app.resumeId.originalFileName || 'Resume attached'}`}
                              >
                                <FileText className="w-2.5 h-2.5 flex-shrink-0" />
                                <span className="truncate">
                                  {app.resumeId.originalFileName || 'Resume'}
                                </span>
                              </span>
                            )}
                            {app.jobAnalysisId && (
                              <span
                                className="inline-flex items-center gap-1 text-[9px] bg-[#22C98B]/10 text-[#6EE7B7] border border-[#22C98B]/20 px-1.5 py-0.5 rounded"
                                title={`Job Match: ${app.jobAnalysisId.matchScore}%`}
                              >
                                <Sparkles className="w-2.5 h-2.5" />
                                <span>{app.jobAnalysisId.matchScore}% Match</span>
                              </span>
                            )}
                          </div>
                        )}

                        {/* Footer: Date & Quick Actions */}
                        <div className="pt-1.5 border-t border-white/[0.06] flex items-center justify-between text-[10px] text-[#94A3B8]">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(app.applicationDate)}
                          </span>

                          {/* Quick stage transition button */}
                          <select
                            value={statusKey}
                            onChange={(e) => handleQuickStatusChange(app._id, e.target.value)}
                            className="bg-[#1E293B] text-[9px] text-[#F8FAFC] px-1.5 py-0.5 rounded border border-white/[0.1] focus:outline-none"
                            title="Move stage"
                          >
                            {STATUS_LIST.map((st) => (
                              <option key={st} value={st}>
                                {st}
                              </option>
                            ))}
                          </select>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE / LIST VIEW */
        <Card className="bg-[#0D1220] border-white/[0.08] overflow-hidden rounded-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/[0.08] bg-[#1E293B]/40 text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider">
                  <th className="py-3 px-4">Company & Role</th>
                  <th className="py-3 px-4">Location & Type</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Applied Date</th>
                  <th className="py-3 px-4">Target Salary</th>
                  <th className="py-3 px-4">Linked Assets</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06] text-xs">
                {applications.map((app) => {
                  const cfg = STATUS_CONFIG[app.status] || STATUS_CONFIG.Saved;
                  return (
                    <tr
                      key={app._id}
                      className="hover:bg-white/[0.02] transition-colors group cursor-pointer"
                      onClick={() => handleOpenDetail(app)}
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-[#F8FAFC] group-hover:text-[#7657FF] transition-colors">
                          {app.companyName}
                        </div>
                        <div className="text-[11px] text-[#94A3B8]">
                          {app.jobTitle || app.positionTitle}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-[#94A3B8]">
                        <div className="flex items-center gap-1 text-[11px]">
                          <MapPin className="w-3 h-3 text-[#94A3B8]" />
                          {app.location || 'Remote'}
                        </div>
                        <div className="text-[10px] text-[#64748B]">
                          {app.employmentType || 'Full-time'}
                        </div>
                      </td>

                      <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={app.status === 'Interviewing' ? 'Interview' : app.status === 'Offered' ? 'Offer' : app.status}
                          onChange={(e) => handleQuickStatusChange(app._id, e.target.value)}
                          className={`text-xs px-2.5 py-1 rounded-full font-medium border focus:outline-none ${cfg.bgColor} ${cfg.borderColor}`}
                          style={{ color: cfg.color }}
                        >
                          {STATUS_LIST.map((st) => (
                            <option key={st} value={st} className="bg-[#0D1220] text-[#F8FAFC]">
                              {st}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="py-3.5 px-4 text-[#94A3B8] font-mono text-[11px]">
                        {formatDate(app.applicationDate)}
                      </td>

                      <td className="py-3.5 px-4 font-mono font-medium text-[#22C98B]">
                        {formatSalary(app.salaryExpectation) || '—'}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          {app.resumeId ? (
                            <span
                              className="text-[10px] bg-[#7657FF]/15 text-[#B49DFF] border border-[#7657FF]/30 px-1.5 py-0.5 rounded truncate max-w-[120px]"
                              title={app.resumeId.originalFileName}
                            >
                              Resume
                            </span>
                          ) : null}
                          {app.jobAnalysisId ? (
                            <span className="text-[10px] bg-[#22C98B]/15 text-[#6EE7B7] border border-[#22C98B]/30 px-1.5 py-0.5 rounded">
                              {app.jobAnalysisId.matchScore}% Match
                            </span>
                          ) : null}
                          {!app.resumeId && !app.jobAnalysisId && (
                            <span className="text-[11px] text-[#64748B]">—</span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(app)}
                            className="p-1.5 text-[#94A3B8] hover:text-[#3985FF] hover:bg-white/[0.04] rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenDelete(app)}
                            className="p-1.5 text-[#94A3B8] hover:text-[#EF4444] hover:bg-white/[0.04] rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ADD APPLICATION MODAL */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Job Application"
        description="Track a new company application and link resumes or job match records."
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4 text-left">
          {formError && (
            <div className="p-3 bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-xl text-xs text-[#FCA5A5]">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-[#F8FAFC] mb-1">
                Company Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Datadog, Stripe, Airbnb"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                className="w-full bg-[#1E293B]/70 text-sm text-[#F8FAFC] p-2.5 rounded-xl border border-white/[0.1] focus:outline-none focus:border-[#7657FF]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#F8FAFC] mb-1">
                Job Title *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Staff Backend Engineer"
                value={formData.jobTitle}
                onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                className="w-full bg-[#1E293B]/70 text-sm text-[#F8FAFC] p-2.5 rounded-xl border border-white/[0.1] focus:outline-none focus:border-[#7657FF]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-[#F8FAFC] mb-1">
                Stage / Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full bg-[#1E293B]/70 text-sm text-[#F8FAFC] p-2.5 rounded-xl border border-white/[0.1] focus:outline-none focus:border-[#7657FF]"
              >
                {STATUS_LIST.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#F8FAFC] mb-1">
                Employment Type
              </label>
              <select
                value={formData.employmentType}
                onChange={(e) => setFormData({ ...formData, employmentType: e.target.value })}
                className="w-full bg-[#1E293B]/70 text-sm text-[#F8FAFC] p-2.5 rounded-xl border border-white/[0.1] focus:outline-none focus:border-[#7657FF]"
              >
                <option value="Full-time">Full-time</option>
                <option value="Part-time">Part-time</option>
                <option value="Contract">Contract</option>
                <option value="Internship">Internship</option>
                <option value="Freelance">Freelance</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#F8FAFC] mb-1">
                Location
              </label>
              <input
                type="text"
                placeholder="e.g. Remote, San Francisco, CA"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full bg-[#1E293B]/70 text-sm text-[#F8FAFC] p-2.5 rounded-xl border border-white/[0.1] focus:outline-none focus:border-[#7657FF]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-[#F8FAFC] mb-1">
                Application Date
              </label>
              <input
                type="date"
                value={formData.applicationDate}
                onChange={(e) => setFormData({ ...formData, applicationDate: e.target.value })}
                className="w-full bg-[#1E293B]/70 text-sm text-[#F8FAFC] p-2.5 rounded-xl border border-white/[0.1] focus:outline-none focus:border-[#7657FF]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#F8FAFC] mb-1">
                Application Deadline
              </label>
              <input
                type="date"
                value={formData.deadline}
                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                className="w-full bg-[#1E293B]/70 text-sm text-[#F8FAFC] p-2.5 rounded-xl border border-white/[0.1] focus:outline-none focus:border-[#7657FF]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#F8FAFC] mb-1">
                Target Salary ($)
              </label>
              <input
                type="number"
                min="0"
                placeholder="e.g. 185000"
                value={formData.salaryExpectation}
                onChange={(e) => setFormData({ ...formData, salaryExpectation: e.target.value })}
                className="w-full bg-[#1E293B]/70 text-sm text-[#F8FAFC] p-2.5 rounded-xl border border-white/[0.1] focus:outline-none focus:border-[#7657FF]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#F8FAFC] mb-1">
              Job Posting URL
            </label>
            <input
              type="url"
              placeholder="https://careers.company.com/job/..."
              value={formData.jobUrl}
              onChange={(e) => setFormData({ ...formData, jobUrl: e.target.value })}
              className="w-full bg-[#1E293B]/70 text-sm text-[#F8FAFC] p-2.5 rounded-xl border border-white/[0.1] focus:outline-none focus:border-[#7657FF]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-[#F8FAFC] mb-1">
                Selected Resume
              </label>
              <select
                value={formData.resumeId}
                onChange={(e) => setFormData({ ...formData, resumeId: e.target.value })}
                className="w-full bg-[#1E293B]/70 text-sm text-[#F8FAFC] p-2.5 rounded-xl border border-white/[0.1] focus:outline-none focus:border-[#7657FF]"
              >
                <option value="">None / Unspecified</option>
                {resumes.map((r) => (
                  <option key={r._id} value={r._id}>
                    {r.originalFileName} ({r.fileFormat.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#F8FAFC] mb-1">
                Related Job Match
              </label>
              <select
                value={formData.jobAnalysisId}
                onChange={(e) => setFormData({ ...formData, jobAnalysisId: e.target.value })}
                className="w-full bg-[#1E293B]/70 text-sm text-[#F8FAFC] p-2.5 rounded-xl border border-white/[0.1] focus:outline-none focus:border-[#7657FF]"
              >
                <option value="">None / Unspecified</option>
                {jobAnalyses.map((j) => (
                  <option key={j._id} value={j._id}>
                    {j.companyName ? `${j.companyName} - ` : ''}{j.jobTitle} ({j.matchScore}% match)
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#F8FAFC] mb-1">
              Notes & Contacts
            </label>
            <textarea
              rows="3"
              placeholder="Recruiter contact, referral details, round preparation notes..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full bg-[#1E293B]/70 text-sm text-[#F8FAFC] p-2.5 rounded-xl border border-white/[0.1] focus:outline-none focus:border-[#7657FF]"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.08]">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsAddModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={submitting}
            >
              Save Application
            </Button>
          </div>
        </form>
      </Modal>

      {/* EDIT APPLICATION MODAL */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Job Application"
        description="Update company details, interview stage, or linked assets."
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleUpdateSubmit} className="space-y-4 text-left">
          {formError && (
            <div className="p-3 bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-xl text-xs text-[#FCA5A5]">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-[#F8FAFC] mb-1">
                Company Name *
              </label>
              <input
                type="text"
                required
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                className="w-full bg-[#1E293B]/70 text-sm text-[#F8FAFC] p-2.5 rounded-xl border border-white/[0.1] focus:outline-none focus:border-[#7657FF]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#F8FAFC] mb-1">
                Job Title *
              </label>
              <input
                type="text"
                required
                value={formData.jobTitle}
                onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                className="w-full bg-[#1E293B]/70 text-sm text-[#F8FAFC] p-2.5 rounded-xl border border-white/[0.1] focus:outline-none focus:border-[#7657FF]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-[#F8FAFC] mb-1">
                Stage / Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full bg-[#1E293B]/70 text-sm text-[#F8FAFC] p-2.5 rounded-xl border border-white/[0.1] focus:outline-none focus:border-[#7657FF]"
              >
                {STATUS_LIST.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#F8FAFC] mb-1">
                Employment Type
              </label>
              <select
                value={formData.employmentType}
                onChange={(e) => setFormData({ ...formData, employmentType: e.target.value })}
                className="w-full bg-[#1E293B]/70 text-sm text-[#F8FAFC] p-2.5 rounded-xl border border-white/[0.1] focus:outline-none focus:border-[#7657FF]"
              >
                <option value="Full-time">Full-time</option>
                <option value="Part-time">Part-time</option>
                <option value="Contract">Contract</option>
                <option value="Internship">Internship</option>
                <option value="Freelance">Freelance</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#F8FAFC] mb-1">
                Location
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full bg-[#1E293B]/70 text-sm text-[#F8FAFC] p-2.5 rounded-xl border border-white/[0.1] focus:outline-none focus:border-[#7657FF]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-[#F8FAFC] mb-1">
                Application Date
              </label>
              <input
                type="date"
                value={formData.applicationDate}
                onChange={(e) => setFormData({ ...formData, applicationDate: e.target.value })}
                className="w-full bg-[#1E293B]/70 text-sm text-[#F8FAFC] p-2.5 rounded-xl border border-white/[0.1] focus:outline-none focus:border-[#7657FF]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#F8FAFC] mb-1">
                Application Deadline
              </label>
              <input
                type="date"
                value={formData.deadline}
                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                className="w-full bg-[#1E293B]/70 text-sm text-[#F8FAFC] p-2.5 rounded-xl border border-white/[0.1] focus:outline-none focus:border-[#7657FF]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#F8FAFC] mb-1">
                Target Salary ($)
              </label>
              <input
                type="number"
                min="0"
                value={formData.salaryExpectation}
                onChange={(e) => setFormData({ ...formData, salaryExpectation: e.target.value })}
                className="w-full bg-[#1E293B]/70 text-sm text-[#F8FAFC] p-2.5 rounded-xl border border-white/[0.1] focus:outline-none focus:border-[#7657FF]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#F8FAFC] mb-1">
              Job Posting URL
            </label>
            <input
              type="url"
              value={formData.jobUrl}
              onChange={(e) => setFormData({ ...formData, jobUrl: e.target.value })}
              className="w-full bg-[#1E293B]/70 text-sm text-[#F8FAFC] p-2.5 rounded-xl border border-white/[0.1] focus:outline-none focus:border-[#7657FF]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-[#F8FAFC] mb-1">
                Selected Resume
              </label>
              <select
                value={formData.resumeId}
                onChange={(e) => setFormData({ ...formData, resumeId: e.target.value })}
                className="w-full bg-[#1E293B]/70 text-sm text-[#F8FAFC] p-2.5 rounded-xl border border-white/[0.1] focus:outline-none focus:border-[#7657FF]"
              >
                <option value="">None / Unspecified</option>
                {resumes.map((r) => (
                  <option key={r._id} value={r._id}>
                    {r.originalFileName} ({r.fileFormat.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#F8FAFC] mb-1">
                Related Job Match
              </label>
              <select
                value={formData.jobAnalysisId}
                onChange={(e) => setFormData({ ...formData, jobAnalysisId: e.target.value })}
                className="w-full bg-[#1E293B]/70 text-sm text-[#F8FAFC] p-2.5 rounded-xl border border-white/[0.1] focus:outline-none focus:border-[#7657FF]"
              >
                <option value="">None / Unspecified</option>
                {jobAnalyses.map((j) => (
                  <option key={j._id} value={j._id}>
                    {j.companyName ? `${j.companyName} - ` : ''}{j.jobTitle} ({j.matchScore}% match)
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#F8FAFC] mb-1">
              Notes & Contacts
            </label>
            <textarea
              rows="3"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full bg-[#1E293B]/70 text-sm text-[#F8FAFC] p-2.5 rounded-xl border border-white/[0.1] focus:outline-none focus:border-[#7657FF]"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.08]">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsEditModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={submitting}
            >
              Update Application
            </Button>
          </div>
        </form>
      </Modal>

      {/* DETAIL INSPECTOR MODAL */}
      {selectedApp && (
        <Modal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          title={selectedApp.companyName}
          description={selectedApp.jobTitle || selectedApp.positionTitle}
          maxWidth="max-w-2xl"
        >
          <div className="space-y-5 text-left text-sm">
            {/* Stage & Meta Banner */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-[#1E293B]/40 rounded-xl border border-white/[0.08]">
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#94A3B8]">Current Stage:</span>
                <Badge variant={STATUS_CONFIG[selectedApp.status]?.variant || 'neutral'}>
                  {selectedApp.status}
                </Badge>
              </div>

              <div className="flex items-center gap-2">
                {selectedApp.jobUrl && (
                  <a
                    href={selectedApp.jobUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-[#3985FF] hover:underline"
                  >
                    <span>View Job Posting</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>

            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-[#1E293B]/30 rounded-xl border border-white/[0.06] space-y-1">
                <span className="text-[10px] text-[#94A3B8] uppercase">Location</span>
                <p className="text-xs font-semibold text-[#F8FAFC]">{selectedApp.location || 'Remote'}</p>
              </div>
              <div className="p-3 bg-[#1E293B]/30 rounded-xl border border-white/[0.06] space-y-1">
                <span className="text-[10px] text-[#94A3B8] uppercase">Employment</span>
                <p className="text-xs font-semibold text-[#F8FAFC]">{selectedApp.employmentType || 'Full-time'}</p>
              </div>
              <div className="p-3 bg-[#1E293B]/30 rounded-xl border border-white/[0.06] space-y-1">
                <span className="text-[10px] text-[#94A3B8] uppercase">Applied Date</span>
                <p className="text-xs font-semibold text-[#F8FAFC]">{formatDate(selectedApp.applicationDate)}</p>
              </div>
              <div className="p-3 bg-[#1E293B]/30 rounded-xl border border-white/[0.06] space-y-1">
                <span className="text-[10px] text-[#94A3B8] uppercase">Target Salary</span>
                <p className="text-xs font-semibold text-[#22C98B]">{formatSalary(selectedApp.salaryExpectation) || '—'}</p>
              </div>
            </div>

            {/* Linked Assets */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-[#F8FAFC] uppercase tracking-wider">
                Linked Preparation Assets
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-[#1E293B]/30 rounded-xl border border-white/[0.06] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#7657FF]" />
                    <div className="text-xs truncate">
                      <p className="font-semibold text-[#F8FAFC] truncate">
                        {selectedApp.resumeId?.originalFileName || 'No resume linked'}
                      </p>
                      <span className="text-[10px] text-[#94A3B8]">Selected Resume</span>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-[#1E293B]/30 rounded-xl border border-white/[0.06] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#22C98B]" />
                    <div className="text-xs truncate">
                      <p className="font-semibold text-[#F8FAFC] truncate">
                        {selectedApp.jobAnalysisId
                          ? `${selectedApp.jobAnalysisId.matchScore}% Match Score`
                          : 'No match record'}
                      </p>
                      <span className="text-[10px] text-[#94A3B8]">Job Analysis Match</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            {selectedApp.notes && (
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold text-[#F8FAFC] uppercase tracking-wider">
                  Notes & Recruiter Context
                </h4>
                <div className="p-3 bg-[#1E293B]/20 rounded-xl border border-white/[0.06] text-xs text-[#94A3B8] whitespace-pre-wrap">
                  {selectedApp.notes}
                </div>
              </div>
            )}

            {/* Launch Targeted Mock Interview Action */}
            <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between">
              <Button
                variant="primary"
                size="sm"
                leftIcon={Sparkles}
                onClick={() => {
                  setIsDetailModalOpen(false);
                  navigate('/mock-interview', {
                    state: {
                      jobRole: selectedApp.jobTitle || selectedApp.positionTitle,
                      resumeId: selectedApp.resumeId?._id || selectedApp.resumeId,
                      jobAnalysisId: selectedApp.jobAnalysisId?._id || selectedApp.jobAnalysisId,
                    },
                  });
                }}
              >
                Launch Mock Interview for this Role
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={Edit2}
                  onClick={() => {
                    setIsDetailModalOpen(false);
                    handleOpenEdit(selectedApp);
                  }}
                >
                  Edit
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsDetailModalOpen(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {selectedApp && (
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          title="Delete Job Application"
          description={`Are you sure you want to remove your application for "${selectedApp.companyName}" (${selectedApp.jobTitle || selectedApp.positionTitle})? This action cannot be undone.`}
          maxWidth="max-w-md"
        >
          <div className="flex items-center justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsDeleteModalOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleDeleteConfirm}
              isLoading={submitting}
              className="!bg-[#EF4444] hover:!bg-[#DC2626] !text-white"
            >
              Delete Application
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default ApplicationsPage;
