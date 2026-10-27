import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import {
  createApplication,
  getApplications,
  getApplicationStats,
  getApplicationById,
  updateApplication,
  deleteApplication,
} from '../controllers/applicationController.js';

const router = express.Router();

// All application routes are strictly authenticated
router.use(authenticate);

// Aggregated stats endpoint (must be defined before /:id)
router.get('/stats', getApplicationStats);

// Collection endpoints
router.route('/')
  .post(createApplication)
  .get(getApplications);

// Document endpoints
router.route('/:id')
  .get(getApplicationById)
  .put(updateApplication)
  .delete(deleteApplication);

export default router;
