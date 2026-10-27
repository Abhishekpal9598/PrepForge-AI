import { Router } from 'express';
import { getHealthStatus, getDatabaseHealthStatus, getV1HealthStatus } from '../controllers/healthController.js';

const router = Router();

// GET /api/health - Baseline server health (Phase 1 contract)
router.get('/health', getHealthStatus);

// GET /api/v1/health - Versioned health telemetry (Phase 2 contract)
router.get('/v1/health', getV1HealthStatus);

// GET /api/health/db - Dedicated database diagnostics
router.get('/health/db', getDatabaseHealthStatus);

export default router;

