import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import {
  getResumeAnalyses,
  getResumeAnalysisById,
  deleteResumeAnalysis,
} from '../controllers/resumeAnalysisController.js';

const router = express.Router();

// Enforce authentication across all resume analysis history endpoints
router.use(authenticate);

// GET /api/v1/resume-analyses - Paginated list of analysis history
router.get('/', getResumeAnalyses);

// GET /api/v1/resume-analyses/:analysisId - Get specific analysis by ID
router.get('/:analysisId', getResumeAnalysisById);

// DELETE /api/v1/resume-analyses/:analysisId - Delete specific analysis by ID
router.delete('/:analysisId', deleteResumeAnalysis);

export default router;
