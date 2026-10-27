import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bot,
  FileText,
  Sparkles,
  TrendingUp,
  ArrowRight,
  CheckCircle2,
  Target,
  Award,
  Zap,
  Briefcase,
  RefreshCw,
  Clock,
  ExternalLink,
  AlertTriangle,
  Layers,
  ChevronRight,
  Flame,
  Plus,
} from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { EmptyState } from '../components/EmptyState';
import { fetchDashboardAnalytics, getStoredUser } from '../services/api';

export const DashboardPage = () => {
  const navigate = useNavigate();
  const user = getStoredUser();

  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [trendTab, setTrendTab] = useState('ats'); // 'ats' | 'job' | 'interview'

  const loadDashboard = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const res = await fetchDashboardAnalytics();
      setAnalytics(res.data);
    } catch (err) {
      setError(err.message || 'Failed to load real-time dashboard analytics.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // Format date helper
  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const diffHours = Math.floor((now - d) / (1000 * 60 * 60));
      if (diffHours < 1) return 'Just now';
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffHours < 48) return 'Yesterday';
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return 'N/A';
    }
  };

  // Activity icon helper
  const getActivityIcon = (type) => {
    switch (type) {
      case 'resume_upload':
        return { icon: FileText, bg: 'bg-[#7657FF]/15 text-[#B49DFF]' };
      case 'resume_analysis':
        return { icon: Sparkles, bg: 'bg-[#3985FF]/15 text-[#93C5FD]' };
      case 'job_match':
        return { icon: Target, bg: 'bg-[#22C98B]/15 text-[#6EE7B7]' };
      case 'mock_interview':
        return { icon: Bot, bg: 'bg-[#F5B942]/15 text-[#FCD34D]' };
      case 'job_application':
        return { icon: Briefcase, bg: 'bg-[#EC4899]/15 text-[#F472B6]' };
      default:
        return { icon: Clock, bg: 'bg-white/10 text-white' };
    }
  };

  // Generate real SVG trend line from active data series
  const renderTrendSvg = (series, color = '#3985FF', gradId = 'dashTrendGrad') => {
    if (!series || series.length < 2) return null;

    const width = 500;
    const height = 150;
    const padding = 20;

    const scores = series.map((s) => s.score);
    const minScore = Math.max(0, Math.min(...scores) - 10);
    const maxScore = Math.min(100, Math.max(...scores) + 10);
    const scoreRange = Math.max(1, maxScore - minScore);

    const points = series.map((item, idx) => {
      const x = padding + (idx / (series.length - 1)) * (width - 2 * padding);
      const y = height - padding - ((item.score - minScore) / scoreRange) * (height - 2 * padding);
      return { x, y, score: item.score, item };
    });

    // Build SVG path
    let pathD = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      // Smooth cubic bezier curve between points
      const prev = points[i - 1];
      const curr = points[i];
      const cp1x = prev.x + (curr.x - prev.x) / 2;
      const cp1y = prev.y;
      const cp2x = prev.x + (curr.x - prev.x) / 2;
      const cp2y = curr.y;
      pathD += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${curr.x} ${curr.y}`;
    }

    const areaD = `${pathD} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;

    return (
      <div className="h-52 w-full pt-2">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.45" />
              <stop offset="100%" stopColor={color} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid horizontal guidelines */}
          <line x1="0" y1={height * 0.25} x2={width} y2={height * 0.25} stroke="#1E293B" strokeDasharray="3 3" />
          <line x1="0" y1={height * 0.5} x2={width} y2={height * 0.5} stroke="#1E293B" strokeDasharray="3 3" />
          <line x1="0" y1={height * 0.75} x2={width} y2={height * 0.75} stroke="#1E293B" strokeDasharray="3 3" />
          <line x1="0" y1={height - padding} x2={width} y2={height - padding} stroke="#1E293B" />

          {/* Filled Area */}
          <path d={areaD} fill={`url(#${gradId})`} />

          {/* Curve Line */}
          <path d={pathD} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" />

          {/* Data Points with Values */}
          {points.map((pt, idx) => (
            <g key={idx} className="group cursor-pointer">
              <circle
                cx={pt.x}
                cy={pt.y}
                r={idx === points.length - 1 ? 5 : 4}
                fill={idx === points.length - 1 ? '#22C98B' : color}
                stroke="#080B16"
                strokeWidth="2"
              />
              <text
                x={pt.x}
                y={pt.y - 10}
                textAnchor="middle"
                fill="#F8FAFC"
                fontSize="10"
                fontFamily="monospace"
                fontWeight="bold"
                className="opacity-80 group-hover:opacity-100"
              >
                {pt.score}%
              </text>
            </g>
          ))}
        </svg>

        {/* Labels below points */}
        <div className="flex justify-between text-[10px] text-[#94A3B8] pt-1 px-4 font-mono">
          {series.map((item, idx) => (
            <span key={idx} className="truncate max-w-[80px]">
              {formatDate(item.date)}
            </span>
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col justify-center items-center space-y-4">
        <LoadingSpinner size="lg" message="Computing your real-time analytics..." />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-8 text-center bg-[#EF4444]/10 border-[#EF4444]/30 space-y-3 rounded-2xl">
        <AlertTriangle className="w-8 h-8 text-[#EF4444] mx-auto" />
        <h3 className="text-base font-bold text-[#F8FAFC]">Failed to load dashboard analytics</h3>
        <p className="text-xs text-[#94A3B8] max-w-md mx-auto">{error}</p>
        <Button variant="secondary" size="sm" onClick={() => loadDashboard(false)}>
          Try Again
        </Button>
      </Card>
    );
  }

  const { summary, resumes, jobMatches, interviews, applications, trends, recentActivity } = analytics || {};

  return (
    <div className="space-y-7 text-left pb-12">
      {/* HEADER: GREETING & REAL-TIME REFRESH ACTION */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#F8FAFC] tracking-tight">
            Welcome back, {user?.fullName || 'Candidate'}
          </h1>
          <p className="text-xs sm:text-sm text-[#94A3B8]">
            Real-time telemetry across your resumes, AI analyses, mock interviews, and application pipeline.
          </p>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Button
            variant="secondary"
            size="sm"
            leftIcon={RefreshCw}
            onClick={() => loadDashboard(true)}
            isLoading={refreshing}
            title="Refresh analytics from MongoDB"
          >
            Refresh
          </Button>
          <Link to="/mock-interviews">
            <Button variant="primary" size="sm" leftIcon={Bot}>
              Practice Interview
            </Button>
          </Link>
        </div>
      </div>

      {/* 1. TOP ROW: 5 REAL KPI CARDS + MOTIVATIONAL ACCENT */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* KPI 1: Resumes Uploaded */}
        <Card className="p-4 bg-[#0D1220] border-white/[0.08] space-y-1.5 rounded-2xl flex flex-col justify-between hover:border-white/[0.15] transition-all">
          <span className="text-[11px] font-medium text-[#94A3B8] uppercase tracking-wider">
            Resumes
          </span>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#F8FAFC] font-mono">
            {summary?.totalResumes ?? 0}
          </div>
          <div className="text-[10px] text-[#94A3B8] flex items-center justify-between">
            <span>{resumes?.totalAnalyses ?? 0} analyzed</span>
            <FileText className="w-3.5 h-3.5 text-[#7657FF]" />
          </div>
        </Card>

        {/* KPI 2: Avg. Resume ATS Score */}
        <Card className="p-4 bg-[#0D1220] border-white/[0.08] space-y-1.5 rounded-2xl flex flex-col justify-between hover:border-white/[0.15] transition-all">
          <span className="text-[11px] font-medium text-[#94A3B8] uppercase tracking-wider">
            Avg. ATS Score
          </span>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#3985FF] font-mono">
            {summary?.averageAtsScore !== null ? `${summary.averageAtsScore}%` : '—'}
          </div>
          <div className="text-[10px] text-[#94A3B8] flex items-center justify-between">
            <span>Peak: {resumes?.highestAtsScore ? `${resumes.highestAtsScore}%` : 'N/A'}</span>
            <Sparkles className="w-3.5 h-3.5 text-[#3985FF]" />
          </div>
        </Card>

        {/* KPI 3: Job Matches */}
        <Card className="p-4 bg-[#0D1220] border-white/[0.08] space-y-1.5 rounded-2xl flex flex-col justify-between hover:border-white/[0.15] transition-all">
          <span className="text-[11px] font-medium text-[#94A3B8] uppercase tracking-wider">
            Job Matches
          </span>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#22C98B] font-mono">
            {summary?.totalJobMatches ?? 0}
          </div>
          <div className="text-[10px] text-[#94A3B8] flex items-center justify-between">
            <span>Avg: {jobMatches?.averageScore ? `${jobMatches.averageScore}%` : 'N/A'}</span>
            <Target className="w-3.5 h-3.5 text-[#22C98B]" />
          </div>
        </Card>

        {/* KPI 4: Avg. Interview Score */}
        <Card className="p-4 bg-[#0D1220] border-white/[0.08] space-y-1.5 rounded-2xl flex flex-col justify-between hover:border-white/[0.15] transition-all">
          <span className="text-[11px] font-medium text-[#94A3B8] uppercase tracking-wider">
            Avg. Interview
          </span>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#F5B942] font-mono">
            {summary?.averageInterviewScore !== null ? `${summary.averageInterviewScore}%` : '—'}
          </div>
          <div className="text-[10px] text-[#94A3B8] flex items-center justify-between">
            <span>{interviews?.completedInterviews ?? 0} completed</span>
            <Bot className="w-3.5 h-3.5 text-[#F5B942]" />
          </div>
        </Card>

        {/* KPI 5: Active Applications */}
        <Card className="p-4 bg-[#0D1220] border-white/[0.08] space-y-1.5 rounded-2xl flex flex-col justify-between hover:border-white/[0.15] transition-all">
          <span className="text-[11px] font-medium text-[#94A3B8] uppercase tracking-wider">
            Applications
          </span>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#F8FAFC] font-mono">
            {summary?.totalApplications ?? 0}
          </div>
          <div className="text-[10px] text-[#94A3B8] flex items-center justify-between">
            <span>{applications?.applied ?? 0} active</span>
            <Briefcase className="w-3.5 h-3.5 text-[#7657FF]" />
          </div>
        </Card>

        {/* KPI 6: Interview Conversion Rate */}
        <Card className="p-4 bg-gradient-to-br from-[#1E294A] to-[#141B33] border-white/[0.12] space-y-1.5 rounded-2xl flex flex-col justify-between shadow-lg shadow-[#3985FF]/10">
          <span className="text-[11px] font-medium text-[#93C5FD] uppercase tracking-wider">
            Conversion Rate
          </span>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#F8FAFC] font-mono">
            {summary?.interviewConversionRate}%
          </div>
          <div className="text-[10px] text-[#93C5FD] flex items-center justify-between">
            <span>{applications?.offer ?? 0} offers secured</span>
            <TrendingUp className="w-3.5 h-3.5 text-[#3985FF]" />
          </div>
        </Card>
      </div>

      {/* 2. MIDDLE ROW: PERFORMANCE TRENDS CHART (8 cols) + QUICK ACTIONS (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Real Performance Trends Chart */}
        <Card className="lg:col-span-8 p-5 bg-[#0D1220] border-white/[0.08] space-y-4 rounded-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.06] pb-3">
            <div>
              <h3 className="text-sm font-bold text-[#F8FAFC] flex items-center gap-2">
                <span>Performance Progression Trajectory</span>
                <Badge variant="brand" size="xs">Live Telemetry</Badge>
              </h3>
              <p className="text-[11px] text-[#94A3B8]">
                Real historical scores over time across AI audits and mock interviews.
              </p>
            </div>

            {/* Trend Selector Tabs */}
            <div className="flex items-center gap-1 bg-[#1E293B]/70 p-1 rounded-xl border border-white/[0.08] self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setTrendTab('ats')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  trendTab === 'ats'
                    ? 'bg-[#3985FF] text-[#F8FAFC] shadow'
                    : 'text-[#94A3B8] hover:text-[#F8FAFC]'
                }`}
              >
                ATS Scores ({trends?.atsScoreTrend?.length || 0})
              </button>
              <button
                type="button"
                onClick={() => setTrendTab('job')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  trendTab === 'job'
                    ? 'bg-[#22C98B] text-[#080B16] shadow'
                    : 'text-[#94A3B8] hover:text-[#F8FAFC]'
                }`}
              >
                Job Matches ({trends?.jobMatchTrend?.length || 0})
              </button>
              <button
                type="button"
                onClick={() => setTrendTab('interview')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  trendTab === 'interview'
                    ? 'bg-[#F5B942] text-[#080B16] shadow'
                    : 'text-[#94A3B8] hover:text-[#F8FAFC]'
                }`}
              >
                Interviews ({trends?.interviewScoreTrend?.length || 0})
              </button>
            </div>
          </div>

          {/* Active Chart Rendering */}
          <div className="min-h-[220px] flex items-center justify-center">
            {trendTab === 'ats' && (
              trends?.atsScoreTrend?.length >= 2 ? (
                renderTrendSvg(trends.atsScoreTrend, '#3985FF', 'atsGrad')
              ) : (
                <div className="text-center py-8 space-y-2">
                  <Sparkles className="w-8 h-8 text-[#3985FF] mx-auto opacity-50" />
                  <p className="text-xs text-[#94A3B8] max-w-sm">
                    {trends?.atsScoreTrend?.length === 1
                      ? `1 ATS analysis recorded (${trends.atsScoreTrend[0].score}%). Run another analysis to plot your historical improvement curve.`
                      : 'No ATS analyses on file yet. Upload a resume to establish your baseline score.'}
                  </p>
                  <Link to="/resume-analyzer">
                    <Button variant="secondary" size="xs">
                      Analyze Resume
                    </Button>
                  </Link>
                </div>
              )
            )}

            {trendTab === 'job' && (
              trends?.jobMatchTrend?.length >= 2 ? (
                renderTrendSvg(trends.jobMatchTrend, '#22C98B', 'jobGrad')
              ) : (
                <div className="text-center py-8 space-y-2">
                  <Target className="w-8 h-8 text-[#22C98B] mx-auto opacity-50" />
                  <p className="text-xs text-[#94A3B8] max-w-sm">
                    {trends?.jobMatchTrend?.length === 1
                      ? `1 Job match recorded (${trends.jobMatchTrend[0].score}%). Match against additional job descriptions to graph match progression.`
                      : 'No job matches evaluated yet. Match your resume against target roles.'}
                  </p>
                  <Link to="/job-match">
                    <Button variant="secondary" size="xs">
                      Match Job Description
                    </Button>
                  </Link>
                </div>
              )
            )}

            {trendTab === 'interview' && (
              trends?.interviewScoreTrend?.length >= 2 ? (
                renderTrendSvg(trends.interviewScoreTrend, '#F5B942', 'interviewGrad')
              ) : (
                <div className="text-center py-8 space-y-2">
                  <Bot className="w-8 h-8 text-[#F5B942] mx-auto opacity-50" />
                  <p className="text-xs text-[#94A3B8] max-w-sm">
                    {trends?.interviewScoreTrend?.length === 1
                      ? `1 Completed interview on record (${trends.interviewScoreTrend[0].score}%). Complete another session to track score gains.`
                      : 'No completed mock interviews yet. Practice with real-time AI feedback.'}
                  </p>
                  <Link to="/mock-interviews">
                    <Button variant="secondary" size="xs">
                      Start Mock Interview
                    </Button>
                  </Link>
                </div>
              )
            )}
          </div>
        </Card>

        {/* Quick Actions (4 cols) */}
        <Card className="lg:col-span-4 p-5 bg-[#0D1220] border-white/[0.08] space-y-3.5 rounded-2xl">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5">
            <h3 className="text-sm font-bold text-[#F8FAFC]">Quick Actions</h3>
            <span className="text-[10px] text-[#94A3B8] font-mono">Workflow Shortcuts</span>
          </div>

          <div className="space-y-2.5">
            {[
              {
                title: 'Start AI Mock Interview',
                sub: 'Live question generation & scoring',
                icon: Bot,
                to: '/mock-interviews',
                color: 'text-[#F5B942] bg-[#F5B942]/15',
              },
              {
                title: 'Upload & Analyze Resume',
                sub: '13-component ATS scoring rubric',
                icon: FileText,
                to: '/resume-analyzer',
                color: 'text-[#7657FF] bg-[#7657FF]/15',
              },
              {
                title: 'Match Job Description',
                sub: 'Semantic skill gap extraction',
                icon: Target,
                to: '/job-match',
                color: 'text-[#22C98B] bg-[#22C98B]/15',
              },
              {
                title: 'Track Job Application',
                sub: 'Stage pipeline & deadlines',
                icon: Briefcase,
                to: '/applications',
                color: 'text-[#3985FF] bg-[#3985FF]/15',
              },
              {
                title: 'Review Interview History',
                sub: 'Detailed diagnostic reports',
                icon: Clock,
                to: '/interview-history',
                color: 'text-[#94A3B8] bg-white/[0.06]',
              },
            ].map((action, idx) => (
              <Link
                key={idx}
                to={action.to}
                className="p-2.5 rounded-xl bg-[#1E293B]/40 border border-white/[0.06] hover:border-[#7657FF]/50 flex items-center justify-between group transition-all hover:bg-white/[0.03]"
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-7 h-7 rounded-lg ${action.color} flex items-center justify-center flex-shrink-0`}>
                    <action.icon className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#F8FAFC] group-hover:text-[#7657FF] transition-colors leading-tight">
                      {action.title}
                    </p>
                    <p className="text-[10px] text-[#94A3B8]">{action.sub}</p>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-[#94A3B8] group-hover:text-[#F8FAFC] group-hover:translate-x-0.5 transition-all" />
              </Link>
            ))}
          </div>
        </Card>
      </div>

      {/* 3. BOTTOM ROW: RECENT UNIFIED ACTIVITY FEED & APPLICATION DISTRIBUTION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Unified Recent Activity Feed (7 cols) */}
        <Card className="lg:col-span-7 p-5 bg-[#0D1220] border-white/[0.08] space-y-4 rounded-2xl">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5">
            <div>
              <h3 className="text-sm font-bold text-[#F8FAFC]">Unified Activity Stream</h3>
              <p className="text-[11px] text-[#94A3B8]">
                Real-time chronological log across all PrepForge AI modules.
              </p>
            </div>
            <span className="text-[10px] font-mono text-[#94A3B8]">
              {recentActivity?.length || 0} events
            </span>
          </div>

          <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
            {!recentActivity || recentActivity.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#94A3B8] space-y-2">
                <Clock className="w-6 h-6 text-[#94A3B8] mx-auto opacity-40" />
                <p>No activity logged yet. Start by uploading a resume or trying an interview!</p>
              </div>
            ) : (
              recentActivity.map((act, idx) => {
                const { icon: ActIcon, bg: actBg } = getActivityIcon(act.type);
                return (
                  <Link
                    key={idx}
                    to={act.link}
                    className="p-3 rounded-xl bg-[#1E293B]/30 border border-white/[0.06] hover:border-white/[0.15] flex items-center justify-between group transition-all"
                  >
                    <div className="flex items-center gap-3 truncate">
                      <div className={`w-8 h-8 rounded-lg ${actBg} flex items-center justify-center flex-shrink-0`}>
                        <ActIcon className="w-4 h-4" />
                      </div>
                      <div className="truncate">
                        <p className="text-xs font-bold text-[#F8FAFC] group-hover:text-[#7657FF] transition-colors truncate">
                          {act.title}
                        </p>
                        <p className="text-[10px] text-[#94A3B8] truncate">{act.subtitle}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {act.score !== null && act.score !== undefined && (
                        <span className="text-[11px] font-mono font-bold text-[#22C98B] bg-[#22C98B]/10 px-2 py-0.5 rounded border border-[#22C98B]/20">
                          {act.score}%
                        </span>
                      )}
                      <span className="text-[10px] text-[#94A3B8] font-mono">
                        {formatDate(act.date)}
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-[#94A3B8] group-hover:text-white transition-colors" />
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </Card>

        {/* Application Pipeline Stage Distribution (5 cols) */}
        <Card className="lg:col-span-5 p-5 bg-[#0D1220] border-white/[0.08] space-y-4 rounded-2xl">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5">
            <div>
              <h3 className="text-sm font-bold text-[#F8FAFC]">Application Pipeline Stages</h3>
              <p className="text-[11px] text-[#94A3B8]">
                Distribution of your {applications?.totalApplications || 0} tracked opportunities.
              </p>
            </div>
            <Link to="/applications" className="text-xs text-[#3985FF] hover:underline font-semibold flex items-center gap-1">
              <span>View Pipeline</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {/* Status Breakdown Progress Bars */}
          <div className="space-y-3 pt-1">
            {applications?.statusDistribution?.map((dist) => {
              const colorMap = {
                Saved: 'bg-[#94A3B8]',
                Applied: 'bg-[#3985FF]',
                Assessment: 'bg-[#7657FF]',
                Interview: 'bg-[#F5B942]',
                Offer: 'bg-[#22C98B]',
                Rejected: 'bg-[#EF4444]',
                Withdrawn: 'bg-[#64748B]',
              };
              const barColor = colorMap[dist.status] || 'bg-[#7657FF]';

              return (
                <div key={dist.status} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-[#F8FAFC] flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${barColor}`} />
                      {dist.status}
                    </span>
                    <span className="text-[11px] font-mono text-[#94A3B8]">
                      {dist.count} ({dist.percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-[#1E293B] h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${barColor} transition-all duration-500`}
                      style={{ width: `${dist.percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Conversion rate callout */}
          <div className="p-3 bg-[#1E293B]/40 rounded-xl border border-white/[0.06] flex items-center justify-between text-xs pt-3">
            <span className="text-[#94A3B8]">Active Interview Rate:</span>
            <span className="font-mono font-bold text-[#22C98B]">
              {applications?.interviewConversionRate || 0}%
            </span>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default DashboardPage;
