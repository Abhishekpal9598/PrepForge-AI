import mongoose from 'express';
import { Application } from '../models/Application.js';
import { Resume } from '../models/Resume.js';
import { JobAnalysis } from '../models/JobAnalysis.js';
import { logger } from '../utils/logger.js';
import {
  validateCreateApplication,
  validateUpdateApplication,
  validateQueryApplication,
} from '../validators/applicationValidators.js';

const isValidObjectId = (id) => {
  return typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id);
};

/**
 * @desc    Create a new job application
 * @route   POST /api/v1/applications
 * @access  Private
 */
export const createApplication = async (req, res, next) => {
  try {
    const validatedData = validateCreateApplication(req.body);

    // Verify resume ownership if provided
    if (validatedData.resumeId) {
      const resume = await Resume.findOne({
        _id: validatedData.resumeId,
        userId: req.user._id,
      });

      if (!resume) {
        return res.status(404).json({
          success: false,
          message: 'Referenced resume not found or does not belong to your account',
          code: 'RESUME_NOT_FOUND',
        });
      }
    }

    // Verify job analysis ownership if provided
    if (validatedData.jobAnalysisId) {
      const jobAnalysis = await JobAnalysis.findOne({
        _id: validatedData.jobAnalysisId,
        userId: req.user._id,
      });

      if (!jobAnalysis) {
        return res.status(404).json({
          success: false,
          message: 'Referenced job analysis not found or does not belong to your account',
          code: 'JOB_ANALYSIS_NOT_FOUND',
        });
      }
    }

    const application = new Application({
      ...validatedData,
      userId: req.user._id,
      resumeId: validatedData.resumeId || null,
      jobAnalysisId: validatedData.jobAnalysisId || null,
    });

    await application.save();

    logger.info(`Created job application for user ${req.user._id} at "${application.companyName}" (${application._id})`);

    return res.status(201).json({
      success: true,
      message: 'Job application created successfully',
      data: application,
    });
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        message: 'Application validation failed',
        errors: err.issues || err.errors,
        code: 'VALIDATION_ERROR',
      });
    }
    next(err);
  }
};

/**
 * @desc    Get paginated job applications with filtering, search, and sorting
 * @route   GET /api/v1/applications
 * @access  Private
 */
export const getApplications = async (req, res, next) => {
  try {
    const query = validateQueryApplication(req.query);

    const filter = { userId: req.user._id };

    // Status filter
    if (query.status && query.status !== 'All') {
      if (query.status === 'Interviewing') {
        filter.status = { $in: ['Interview', 'Interviewing'] };
      } else if (query.status === 'Offered') {
        filter.status = { $in: ['Offer', 'Offered'] };
      } else {
        filter.status = query.status;
      }
    }

    // Text search on companyName and jobTitle / positionTitle
    if (query.search && query.search.trim().length > 0) {
      const searchRegex = new RegExp(query.search.trim(), 'i');
      filter.$or = [
        { companyName: searchRegex },
        { jobTitle: searchRegex },
        { positionTitle: searchRegex },
        { location: searchRegex },
      ];
    }

    // Sorting
    const sortField = query.sortBy || 'applicationDate';
    const sortDirection = query.sortOrder === 'asc' ? 1 : -1;
    const sort = { [sortField]: sortDirection };

    // Pagination
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const [total, applications] = await Promise.all([
      Application.countDocuments(filter),
      Application.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('resumeId', 'originalFileName storedFileName fileType')
        .populate('jobAnalysisId', 'matchScore targetRole matchSummary')
        .lean(),
    ]);

    return res.status(200).json({
      success: true,
      data: applications,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid query parameters',
        errors: err.issues || err.errors,
        code: 'VALIDATION_ERROR',
      });
    }
    next(err);
  }
};

/**
 * @desc    Get single job application by ID
 * @route   GET /api/v1/applications/:id
 * @access  Private
 */
export const getApplicationById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid application ID format',
        code: 'INVALID_ID_FORMAT',
      });
    }

    const application = await Application.findOne({
      _id: id,
      userId: req.user._id,
    })
      .populate('resumeId', 'originalFileName storedFileName fileType rawText extractedText')
      .populate('jobAnalysisId', 'matchScore targetRole matchSummary matchedSkills missingSkills');

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found or does not belong to your account',
        code: 'RESOURCE_NOT_FOUND',
      });
    }

    return res.status(200).json({
      success: true,
      data: application,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Update an existing job application
 * @route   PUT /api/v1/applications/:id
 * @access  Private
 */
export const updateApplication = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid application ID format',
        code: 'INVALID_ID_FORMAT',
      });
    }

    const validatedData = validateUpdateApplication(req.body);

    const application = await Application.findOne({
      _id: id,
      userId: req.user._id,
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found or does not belong to your account',
        code: 'RESOURCE_NOT_FOUND',
      });
    }

    // Verify resume ownership if being updated
    if (validatedData.resumeId !== undefined) {
      if (validatedData.resumeId && validatedData.resumeId !== '') {
        const resume = await Resume.findOne({
          _id: validatedData.resumeId,
          userId: req.user._id,
        });

        if (!resume) {
          return res.status(404).json({
            success: false,
            message: 'Referenced resume not found or does not belong to your account',
            code: 'RESUME_NOT_FOUND',
          });
        }
        application.resumeId = validatedData.resumeId;
      } else {
        application.resumeId = null;
      }
    }

    // Verify job analysis ownership if being updated
    if (validatedData.jobAnalysisId !== undefined) {
      if (validatedData.jobAnalysisId && validatedData.jobAnalysisId !== '') {
        const jobAnalysis = await JobAnalysis.findOne({
          _id: validatedData.jobAnalysisId,
          userId: req.user._id,
        });

        if (!jobAnalysis) {
          return res.status(404).json({
            success: false,
            message: 'Referenced job analysis not found or does not belong to your account',
            code: 'JOB_ANALYSIS_NOT_FOUND',
          });
        }
        application.jobAnalysisId = validatedData.jobAnalysisId;
      } else {
        application.jobAnalysisId = null;
      }
    }

    // Update remaining properties
    const directFields = [
      'companyName',
      'jobTitle',
      'positionTitle',
      'jobDescription',
      'location',
      'employmentType',
      'applicationDate',
      'appliedDate',
      'deadline',
      'jobUrl',
      'status',
      'salaryExpectation',
      'notes',
      'interviewDate',
    ];

    for (const field of directFields) {
      if (validatedData[field] !== undefined) {
        application[field] = validatedData[field];
      }
    }

    await application.save();

    logger.info(`Updated job application ${id} for user ${req.user._id}`);

    return res.status(200).json({
      success: true,
      message: 'Job application updated successfully',
      data: application,
    });
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        message: 'Application update validation failed',
        errors: err.issues || err.errors,
        code: 'VALIDATION_ERROR',
      });
    }
    next(err);
  }
};

/**
 * @desc    Delete a job application
 * @route   DELETE /api/v1/applications/:id
 * @access  Private
 */
export const deleteApplication = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid application ID format',
        code: 'INVALID_ID_FORMAT',
      });
    }

    const application = await Application.findOneAndDelete({
      _id: id,
      userId: req.user._id,
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found or does not belong to your account',
        code: 'RESOURCE_NOT_FOUND',
      });
    }

    logger.info(`Deleted job application ${id} for user ${req.user._id}`);

    return res.status(200).json({
      success: true,
      message: 'Job application deleted successfully',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Calculate real aggregated job application statistics
 * @route   GET /api/v1/applications/stats
 * @access  Private
 */
export const getApplicationStats = async (req, res, next) => {
  try {
    const rawCounts = await Application.aggregate([
      { $match: { userId: req.user._id } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const countsMap = {
      Saved: 0,
      Applied: 0,
      Assessment: 0,
      Interview: 0,
      Offer: 0,
      Rejected: 0,
      Withdrawn: 0,
    };

    let total = 0;

    for (const item of rawCounts) {
      let statusKey = item._id;
      if (statusKey === 'Interviewing') statusKey = 'Interview';
      if (statusKey === 'Offered') statusKey = 'Offer';

      if (countsMap[statusKey] !== undefined) {
        countsMap[statusKey] += item.count;
      }
      total += item.count;
    }

    const saved = countsMap.Saved;
    const applied = countsMap.Applied;
    const assessment = countsMap.Assessment;
    const interview = countsMap.Interview;
    const offer = countsMap.Offer;
    const rejected = countsMap.Rejected;
    const withdrawn = countsMap.Withdrawn;

    // Total Submitted = Applications actively sent out into employer pipeline (excludes Saved drafts and Withdrawn)
    const totalSubmitted = applied + assessment + interview + offer + rejected;

    // Interview Conversion Rate: Percentage of submitted applications that secured an interview or offer
    // Denominator: Total Submitted Applications
    const interviewConversionRate =
      totalSubmitted > 0 ? Math.round(((interview + offer) / totalSubmitted) * 100) : 0;

    // Offer Conversion Rate: Percentage of interviews that converted into a job offer
    // Denominator: Applications reaching interview stage or above (interview + offer)
    const interviewedTotal = interview + offer;
    const offerConversionRate =
      interviewedTotal > 0 ? Math.round((offer / interviewedTotal) * 100) : 0;

    // Overall Offer Rate: Percentage of total submitted applications that resulted in an offer
    const offerToSubmittedRate =
      totalSubmitted > 0 ? Math.round((offer / totalSubmitted) * 100) : 0;

    // Status Distribution
    const statusDistribution = Object.keys(countsMap).map((status) => ({
      status,
      count: countsMap[status],
      percentage: total > 0 ? Math.round((countsMap[status] / total) * 100) : 0,
    }));

    return res.status(200).json({
      success: true,
      data: {
        total,
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
        offerToSubmittedRate,
        statusDistribution,
        definitions: {
          interviewConversionRate:
            'Calculated as (Interviews + Offers) / Total Submitted Applications (Applied, Assessment, Interview, Offer, Rejected)',
          offerConversionRate:
            'Calculated as Offers / Total Interviewed Applications (Interviews + Offers)',
          offerToSubmittedRate:
            'Calculated as Offers / Total Submitted Applications',
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

export default {
  createApplication,
  getApplications,
  getApplicationById,
  updateApplication,
  deleteApplication,
  getApplicationStats,
};
