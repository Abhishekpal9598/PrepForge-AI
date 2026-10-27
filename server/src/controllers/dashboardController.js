import { Resume } from '../models/Resume.js';
import { ResumeAnalysis } from '../models/ResumeAnalysis.js';
import { JobAnalysis } from '../models/JobAnalysis.js';
import { InterviewSession } from '../models/InterviewSession.js';
import { Application } from '../models/Application.js';
import { logger } from '../utils/logger.js';

/**
 * @desc    Get real-time dashboard analytics, metrics, trends, and recent activity
 * @route   GET /api/v1/dashboard/analytics
 * @access  Private
 */
export const getDashboardAnalytics = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Execute parallel MongoDB queries scoped strictly to authenticated user
    const [
      // 1. Resume & ATS Analysis Metrics
      resumeCount,
      atsStats,
      latestAts,
      recentResumes,
      atsTrendDocs,

      // 2. Job Analysis Metrics
      jobCount,
      jobStats,
      recentJobs,
      jobTrendDocs,

      // 3. Interview Metrics
      interviewTotalCount,
      interviewCompletedCount,
      interviewInProgressCount,
      interviewStats,
      recentInterviews,
      interviewTrendDocs,

      // 4. Application Metrics
      applicationStatsRaw,
      recentApplications,
    ] = await Promise.all([
      // Resumes
      Resume.countDocuments({ userId }),
      ResumeAnalysis.aggregate([
        { $match: { userId } },
        {
          $group: {
            _id: null,
            totalAnalyses: { $sum: 1 },
            avgScore: { $avg: '$overallScore' },
            maxScore: { $max: '$overallScore' },
          },
        },
      ]),
      ResumeAnalysis.findOne({ userId })
        .sort({ createdAt: -1 })
        .select('overallScore targetRole createdAt')
        .lean(),
      Resume.find({ userId })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('originalFileName fileFormat createdAt fileSize')
        .lean(),
      ResumeAnalysis.find({ userId })
        .sort({ createdAt: 1 })
        .limit(10)
        .select('overallScore targetRole createdAt')
        .lean(),

      // Job Matches
      JobAnalysis.countDocuments({ userId }),
      JobAnalysis.aggregate([
        { $match: { userId } },
        {
          $group: {
            _id: null,
            avgScore: { $avg: '$matchScore' },
            maxScore: { $max: '$matchScore' },
          },
        },
      ]),
      JobAnalysis.find({ userId })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('companyName jobTitle matchScore createdAt')
        .lean(),
      JobAnalysis.find({ userId })
        .sort({ createdAt: 1 })
        .limit(10)
        .select('companyName jobTitle matchScore createdAt')
        .lean(),

      // Interviews
      InterviewSession.countDocuments({ userId }),
      InterviewSession.countDocuments({ userId, status: 'completed' }),
      InterviewSession.countDocuments({
        userId,
        status: { $in: ['in_progress', 'pending'] },
      }),
      InterviewSession.aggregate([
        { $match: { userId, overallScore: { $ne: null } } },
        {
          $group: {
            _id: null,
            avgScore: { $avg: '$overallScore' },
            maxScore: { $max: '$overallScore' },
          },
        },
      ]),
      InterviewSession.find({ userId })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('jobRole jobTitle category difficulty status overallScore createdAt')
        .lean(),
      InterviewSession.find({ userId, overallScore: { $ne: null } })
        .sort({ createdAt: 1 })
        .limit(10)
        .select('jobRole jobTitle category overallScore createdAt completedAt')
        .lean(),

      // Applications
      Application.aggregate([
        { $match: { userId } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Application.find({ userId })
        .sort({ updatedAt: -1 })
        .limit(5)
        .select('companyName jobTitle positionTitle location status applicationDate updatedAt')
        .lean(),
    ]);

    // Parse Resume & ATS Stats
    const atsAgg = atsStats[0] || {};
    const resumeAnalytics = {
      totalUploaded: resumeCount,
      totalAnalyses: atsAgg.totalAnalyses || 0,
      latestAtsScore: latestAts?.overallScore ?? null,
      averageAtsScore: atsAgg.avgScore ? Math.round(atsAgg.avgScore) : null,
      highestAtsScore: atsAgg.maxScore ?? null,
    };

    // Parse Job Match Stats
    const jobAgg = jobStats[0] || {};
    const jobMatchAnalytics = {
      totalMatches: jobCount,
      averageMatchScore: jobAgg.avgScore ? Math.round(jobAgg.avgScore) : null,
      highestMatchScore: jobAgg.maxScore ?? null,
    };

    // Parse Interview Stats
    const intAgg = interviewStats[0] || {};
    const interviewAnalytics = {
      totalInterviews: interviewTotalCount,
      completedInterviews: interviewCompletedCount,
      inProgressInterviews: interviewInProgressCount,
      averageInterviewScore: intAgg.avgScore ? Math.round(intAgg.avgScore) : null,
      highestInterviewScore: intAgg.maxScore ?? null,
    };

    // Parse Application Stats
    const countsMap = {
      Saved: 0,
      Applied: 0,
      Assessment: 0,
      Interview: 0,
      Offer: 0,
      Rejected: 0,
      Withdrawn: 0,
    };

    let applicationTotal = 0;
    for (const item of applicationStatsRaw) {
      let statusKey = item._id;
      if (statusKey === 'Interviewing') statusKey = 'Interview';
      if (statusKey === 'Offered') statusKey = 'Offer';

      if (countsMap[statusKey] !== undefined) {
        countsMap[statusKey] += item.count;
      }
      applicationTotal += item.count;
    }

    const saved = countsMap.Saved;
    const applied = countsMap.Applied;
    const assessment = countsMap.Assessment;
    const interview = countsMap.Interview;
    const offer = countsMap.Offer;
    const rejected = countsMap.Rejected;
    const withdrawn = countsMap.Withdrawn;

    const totalSubmitted = applied + assessment + interview + offer + rejected;
    const interviewConversionRate =
      totalSubmitted > 0 ? Math.round(((interview + offer) / totalSubmitted) * 100) : 0;
    const interviewedTotal = interview + offer;
    const offerConversionRate =
      interviewedTotal > 0 ? Math.round((offer / interviewedTotal) * 100) : 0;

    const applicationAnalytics = {
      totalApplications: applicationTotal,
      saved,
      applied,
      assessment,
      interview,
      offer,
      rejected,
      withdrawn,
      totalSubmitted,
      interviewConversionRate,
      offerConversionRate,
      statusDistribution: Object.keys(countsMap).map((status) => ({
        status,
        count: countsMap[status],
        percentage:
          applicationTotal > 0
            ? Math.round((countsMap[status] / applicationTotal) * 100)
            : 0,
      })),
    };

    // Trend Progressions
    const atsScoreTrend = atsTrendDocs.map((item, idx) => ({
      index: idx + 1,
      score: item.overallScore,
      targetRole: item.targetRole || 'Resume Analysis',
      date: item.createdAt,
    }));

    const jobMatchTrend = jobTrendDocs.map((item, idx) => ({
      index: idx + 1,
      score: item.matchScore,
      company: item.companyName || 'Job Match',
      role: item.jobTitle,
      date: item.createdAt,
    }));

    const interviewScoreTrend = interviewTrendDocs.map((item, idx) => ({
      index: idx + 1,
      score: item.overallScore,
      role: item.jobRole || item.jobTitle || 'Mock Interview',
      category: item.category,
      date: item.completedAt || item.createdAt,
    }));

    // Unified Recent Activity Feed (Merge, tag, and sort across all 5 models)
    const activities = [];

    // Add Resume Uploads
    for (const r of recentResumes) {
      activities.push({
        type: 'resume_upload',
        title: `Resume Uploaded`,
        subtitle: r.originalFileName,
        date: r.createdAt,
        status: 'Uploaded',
        score: null,
        recordId: r._id,
        link: '/resume-analyzer',
      });
    }

    // Add ATS Analyses
    for (const a of atsTrendDocs.slice(-3)) {
      activities.push({
        type: 'resume_analysis',
        title: `Resume ATS Analysis`,
        subtitle: a.targetRole ? `Target: ${a.targetRole}` : 'Comprehensive ATS Audit',
        date: a.createdAt,
        status: 'Completed',
        score: a.overallScore,
        recordId: a._id,
        link: '/resume-analyzer',
      });
    }

    // Add Job Matches
    for (const j of recentJobs) {
      activities.push({
        type: 'job_match',
        title: `Job Match Analysis`,
        subtitle: `${j.companyName ? `${j.companyName} • ` : ''}${j.jobTitle}`,
        date: j.createdAt,
        status: 'Completed',
        score: j.matchScore,
        recordId: j._id,
        link: '/job-match',
      });
    }

    // Add Mock Interviews
    for (const i of recentInterviews) {
      activities.push({
        type: 'mock_interview',
        title: `Mock Interview Session`,
        subtitle: `${i.jobRole || i.jobTitle || 'General Practice'} (${i.category})`,
        date: i.createdAt,
        status: i.status === 'completed' ? 'Completed' : 'In Progress',
        score: i.overallScore ?? null,
        recordId: i._id,
        link: '/interview-history',
      });
    }

    // Add Applications
    for (const app of recentApplications) {
      activities.push({
        type: 'job_application',
        title: `Application: ${app.companyName}`,
        subtitle: `${app.jobTitle || app.positionTitle} • ${app.location}`,
        date: app.updatedAt || app.applicationDate,
        status: app.status,
        score: null,
        recordId: app._id,
        link: '/applications',
      });
    }

    // Sort newest first & limit to top 10 items
    activities.sort((a, b) => new Date(b.date) - new Date(a.date));
    const recentActivity = activities.slice(0, 10);

    // Summary Top KPIs
    const summary = {
      totalResumes: resumeCount,
      averageAtsScore: resumeAnalytics.averageAtsScore,
      totalJobMatches: jobCount,
      averageInterviewScore: interviewAnalytics.averageInterviewScore,
      totalApplications: applicationTotal,
      interviewConversionRate: applicationAnalytics.interviewConversionRate,
    };

    logger.info(`Computed real-time dashboard analytics for user ${userId}`);

    return res.status(200).json({
      success: true,
      data: {
        summary,
        resumes: resumeAnalytics,
        jobMatches: jobMatchAnalytics,
        interviews: interviewAnalytics,
        applications: applicationAnalytics,
        trends: {
          atsScoreTrend,
          jobMatchTrend,
          interviewScoreTrend,
          hasEnoughTrendData:
            atsScoreTrend.length >= 2 ||
            jobMatchTrend.length >= 2 ||
            interviewScoreTrend.length >= 2,
        },
        recentActivity,
      },
    });
  } catch (err) {
    next(err);
  }
};

export default {
  getDashboardAnalytics,
};
