import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import {
  getSettings,
  updateSettings,
} from '../controllers/profileController.js';

const router = express.Router();

// Enforce authentication across all settings endpoints
router.use(authenticate);

// GET /api/v1/settings
router.get('/', getSettings);

// PUT /api/v1/settings
router.put('/', updateSettings);

export default router;
