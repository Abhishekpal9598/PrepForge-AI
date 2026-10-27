import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import {
  analyzeJobDescription,
  getJobAnalyses,
  getJobAnalysisById,
  deleteJobAnalysis,
} from '../controllers/jobAnalysisController.js';

const router = express.Router();

// Enforce authentication across all job analysis endpoints
router.use(authenticate);

// POST /api/v1/jobs/analyze - Trigger AI Job Description analysis & resume matching
router.post('/analyze', analyzeJobDescription);

// GET /api/v1/jobs - Paginated list of user's past job analyses
router.get('/', getJobAnalyses);

// GET /api/v1/jobs/history - Alias for paginated history
router.get('/history', getJobAnalyses);

// GET /api/v1/jobs/:id - Retrieve specific job analysis by ID
router.get('/:id', getJobAnalysisById);

// DELETE /api/v1/jobs/:id - Delete specific job analysis by ID
router.delete('/:id', deleteJobAnalysis);

export default router;
