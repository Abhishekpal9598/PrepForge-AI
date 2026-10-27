import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { Resume } from '../models/Resume.js';
import { extractResumeWithMetadata } from '../utils/textExtractor.js';
import { segmentResumeSections } from '../services/sectionSegmenter.js';
import { extractStructuredResumeData } from '../services/structuredExtractor.js';
import { UPLOAD_DIR } from '../middleware/uploadMiddleware.js';

/**
 * Safely delete a file from disk
 */
const safeUnlink = (filePath) => {
  try {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (err) {
    // Non-fatal cleanup error
    console.warn(`[resumeController] Failed to unlink file ${filePath}:`, err.message);
  }
};

/**
 * Format resume output object to prevent exposing internal server paths
 */
export const formatResumeResponse = (doc) => ({
  id: doc._id,
  _id: doc._id,
  userId: doc.userId,
  originalFileName: doc.originalFileName,
  fileType: doc.fileType || doc.fileFormat,
  fileFormat: doc.fileFormat || doc.fileType,
  fileSize: doc.fileSize,
  extractedText: doc.extractedText || doc.rawText,
  rawText: doc.rawText || doc.extractedText,
  parsedSections: doc.parsedSections || {},
  uploadedAt: doc.uploadedAt || doc.createdAt,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

/**
 * POST /api/v1/resumes
 * Upload and process a new resume (PDF, DOCX, TXT)
 * Executes text extraction, section segmentation, and structured information extraction
 */
export const uploadResume = async (req, res) => {
  const file = req.file;

  if (!file) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a resume file in the multipart/form-data payload.',
      code: 'FILE_REQUIRED',
    });
  }

  const ext = path.extname(file.originalname).slice(1).toLowerCase();

  try {
    // 1. Extract readable text & metadata from uploaded file
    const extractionResult = await extractResumeWithMetadata(file.path, ext);
    const extractedText = extractionResult.text;

    // 2. Deterministic Section Segmentation (17 Canonical Sections)
    const segmentation = segmentResumeSections(extractedText);

    // 3. Structured Information & Timeline Extraction
    const structured = extractStructuredResumeData(extractedText, segmentation.rawSections);

    // 4. Assemble Rich parsedSections Payload
    const parsedSections = {
      rawSections: segmentation.rawSections,
      detectedSections: segmentation.detectedSections,
      sectionOrder: segmentation.sectionOrder,
      missingCoreSections: segmentation.missingCoreSections,
      confidence: segmentation.confidence,
      structured,
      documentMetadata: extractionResult.metadata,
      parsedAt: new Date(),
    };

    // 5. Create Resume document associated with authenticated user
    const resume = await Resume.create({
      userId: req.userId,
      originalFileName: file.originalname,
      storedFileName: file.filename,
      fileType: ext,
      fileFormat: ext,
      fileSize: file.size,
      extractedText,
      rawText: extractedText,
      parsedSections,
      uploadedAt: new Date(),
    });

    return res.status(201).json({
      success: true,
      message: 'Resume uploaded and processed successfully.',
      resume: formatResumeResponse(resume),
    });
  } catch (error) {
    // Clean up temporary file from disk on failure to prevent disk bloat
    safeUnlink(file.path);

    const statusCode = error.statusCode || 400;
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to process resume file.',
      code: error.code || 'RESUME_PROCESSING_ERROR',
    });
  }
};

/**
 * GET /api/v1/resumes
 * Retrieve paginated list of resumes owned by the authenticated user
 */
export const getResumes = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const query = { userId: req.userId };

    // Optional search by file name
    if (req.query.search && typeof req.query.search === 'string') {
      const searchRegex = new RegExp(req.query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.originalFileName = searchRegex;
    }

    const [total, resumes] = await Promise.all([
      Resume.countDocuments(query),
      Resume.find(query)
        .sort({ uploadedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    const formattedResumes = resumes.map((doc) => ({
      ...formatResumeResponse(doc),
      // Provide a brief snippet of text for list preview
      textPreview: (doc.extractedText || doc.rawText || '').slice(0, 160).trim() + '...',
    }));

    return res.status(200).json({
      success: true,
      count: formattedResumes.length,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
      data: formattedResumes,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve resumes.',
      error: error.message,
    });
  }
};

/**
 * GET /api/v1/resumes/:id
 * Retrieve specific resume details by ID (enforces user ownership)
 * Performs lazy self-healing section segmentation if resume was uploaded prior to Phase 2
 */
export const getResumeById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid resume ID format.',
        code: 'INVALID_ID',
      });
    }

    const resume = await Resume.findOne({ _id: id, userId: req.userId });

    if (!resume) {
      return res.status(404).json({
        success: false,
        message: 'Resume not found.',
        code: 'RESUME_NOT_FOUND',
      });
    }

    // Lazy self-healing: if parsedSections is missing or empty, generate and persist it
    if (!resume.parsedSections || Object.keys(resume.parsedSections).length === 0) {
      const text = resume.extractedText || resume.rawText;
      if (text && text.length >= 20) {
        const segmentation = segmentResumeSections(text);
        const structured = extractStructuredResumeData(text, segmentation.rawSections);
        resume.parsedSections = {
          rawSections: segmentation.rawSections,
          detectedSections: segmentation.detectedSections,
          sectionOrder: segmentation.sectionOrder,
          missingCoreSections: segmentation.missingCoreSections,
          confidence: segmentation.confidence,
          structured,
          documentMetadata: {
            format: resume.fileFormat || resume.fileType,
            charCount: text.length,
            wordCount: text.split(/\s+/).filter(Boolean).length,
          },
          parsedAt: new Date(),
        };
        await resume.save();
      }
    }

    return res.status(200).json({
      success: true,
      resume: formatResumeResponse(resume),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve resume.',
      error: error.message,
    });
  }
};

/**
 * DELETE /api/v1/resumes/:id
 * Delete resume from disk and database (enforces user ownership)
 */
export const deleteResume = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid resume ID format.',
        code: 'INVALID_ID',
      });
    }

    const resume = await Resume.findOne({ _id: id, userId: req.userId });

    if (!resume) {
      return res.status(404).json({
        success: false,
        message: 'Resume not found.',
        code: 'RESUME_NOT_FOUND',
      });
    }

    // Delete stored file from disk
    if (resume.storedFileName) {
      const diskPath = path.join(UPLOAD_DIR, resume.storedFileName);
      safeUnlink(diskPath);
    }

    // Delete database document
    await Resume.deleteOne({ _id: resume._id });

    return res.status(200).json({
      success: true,
      message: 'Resume deleted successfully.',
      id: resume._id,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to delete resume.',
      error: error.message,
    });
  }
};

export default {
  uploadResume,
  getResumes,
  getResumeById,
  deleteResume,
};
