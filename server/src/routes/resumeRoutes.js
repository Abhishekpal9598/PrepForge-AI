import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { handleResumeUpload } from '../middleware/uploadMiddleware.js';
import {
  uploadResume,
  getResumes,
  getResumeById,
  deleteResume,
} from '../controllers/resumeController.js';
import {
  analyzeResume,
  getLatestAnalysisForResume,
} from '../controllers/resumeAnalysisController.js';
import {
  runResumeChecks,
  getResumeChecks,
  getSingleCheckDetail,
  recheckResume,
  getResumeScores,
} from '../controllers/resumeCheckController.js';
import {
  validateRunChecks,
  validateGetChecks,
  validateCheckIdParam,
} from '../validators/resumeCheckValidators.js';

const router = express.Router();

// Enforce authentication across all resume endpoints
router.use(authenticate);

// POST /api/v1/resumes - Upload resume file (PDF, DOCX, TXT)
router.post('/', handleResumeUpload, uploadResume);

// GET /api/v1/resumes - Get paginated list of user's resumes
router.get('/', getResumes);

// GET /api/v1/resumes/:id - Get resume details by ID
router.get('/:id', getResumeById);

// DELETE /api/v1/resumes/:id - Delete resume by ID
router.delete('/:id', deleteResume);

// POST /api/v1/resumes/:id/analyze - Trigger AI ATS resume analysis
router.post('/:id/analyze', analyzeResume);

// GET /api/v1/resumes/:id/analysis - Get latest ATS analysis for resume
router.get('/:id/analysis', getLatestAnalysisForResume);

// --- Phase 3: 27-Point Advanced Resume Checking Endpoints ---
// POST /api/v1/resumes/:id/checks - Run 27-point check engine
router.post('/:id/checks', validateRunChecks, runResumeChecks);

// GET /api/v1/resumes/:id/checks - Retrieve cached checks with optional filters (?status=PASS&category=CAT-01)
router.get('/:id/checks', validateGetChecks, getResumeChecks);

// GET /api/v1/resumes/:id/checks/:checkId - Retrieve single check detail (e.g. CHK-01)
router.get('/:id/checks/:checkId', validateCheckIdParam, getSingleCheckDetail);

// POST /api/v1/resumes/:id/recheck - Force re-evaluation of all 27 checks
router.post('/:id/recheck', validateRunChecks, recheckResume);

// --- Phase 4: Multi-Dimensional Scoring Endpoints ---
// GET /api/v1/resumes/:id/scores - Retrieve multi-dimensional scores and explainable breakdown
router.get('/:id/scores', getResumeScores);

export default router;
