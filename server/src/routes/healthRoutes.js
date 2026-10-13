import { Router } from 'express';
import { getHealthStatus, getDatabaseHealthStatus } from '../controllers/healthController.js';

const router = Router();

// GET /api/health - Baseline server health
router.get('/health', getHealthStatus);

// GET /api/health/db - Dedicated database diagnostics
router.get('/health/db', getDatabaseHealthStatus);

export default router;
