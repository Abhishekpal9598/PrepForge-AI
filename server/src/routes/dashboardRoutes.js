import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { getDashboardAnalytics } from '../controllers/dashboardController.js';

const router = express.Router();

// All dashboard analytics are private and user-scoped
router.use(authenticate);

// GET /api/v1/dashboard/analytics
router.get('/analytics', getDashboardAnalytics);

export default router;
