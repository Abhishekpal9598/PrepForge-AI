import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import {
  createInterviewSession,
  getInterviewSessions,
  getInterviewSessionById,
  startInterviewSession,
  submitInterviewAnswer,
  completeInterviewSession,
  deleteInterviewSession,
} from '../controllers/interviewController.js';

const router = express.Router();

// Enforce authentication across all interview endpoints
router.use(authenticate);

// POST /api/v1/interviews - Create session & generate questions
router.post('/', createInterviewSession);

// GET /api/v1/interviews - Paginated user sessions
router.get('/', getInterviewSessions);

// GET /api/v1/interviews/history - Alias for paginated history
router.get('/history', getInterviewSessions);

// GET /api/v1/interviews/:id - Retrieve specific session
router.get('/:id', getInterviewSessionById);

// POST /api/v1/interviews/:id/start - Start session
router.post('/:id/start', startInterviewSession);

// POST /api/v1/interviews/:id/answer - Submit answer to question & get evaluation
router.post('/:id/answer', submitInterviewAnswer);

// POST /api/v1/interviews/:id/complete - Complete session & generate final report
router.post('/:id/complete', completeInterviewSession);

// DELETE /api/v1/interviews/:id - Delete session
router.delete('/:id', deleteInterviewSession);

export default router;
