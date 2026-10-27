import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import {
  getProfile,
  updateProfile,
  changePassword,
  deleteAccount,
} from '../controllers/profileController.js';

const router = express.Router();

// Enforce authentication across all profile endpoints
router.use(authenticate);

// GET /api/v1/profile
router.get('/', getProfile);

// PUT /api/v1/profile
router.put('/', updateProfile);

// POST /api/v1/profile/change-password
router.post('/change-password', changePassword);

// DELETE /api/v1/profile/account
router.delete('/account', deleteAccount);

export default router;
