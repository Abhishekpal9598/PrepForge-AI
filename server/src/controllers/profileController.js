import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import { User } from '../models/User.js';
import { Resume } from '../models/Resume.js';
import { ResumeAnalysis } from '../models/ResumeAnalysis.js';
import { JobAnalysis } from '../models/JobAnalysis.js';
import { InterviewSession } from '../models/InterviewSession.js';
import { Application } from '../models/Application.js';
import { UPLOAD_DIR } from '../middleware/uploadMiddleware.js';
import { config } from '../config/env.js';
import {
  validateUpdateProfile,
  validateChangePassword,
  validateUpdateSettings,
  validateDeleteAccount,
} from '../validators/profileValidators.js';

const JWT_SECRET = config.jwtSecret || 'development_jwt_secret_minimum_32_characters_long';
const TOKEN_EXPIRY = '7d';

/**
 * Helper to sign JWT access token
 */
const signToken = (userId, email, tokenVersion = 0) => {
  return jwt.sign(
    { id: userId, email, tokenVersion },
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRY }
  );
};

/**
 * Helper to set HttpOnly cookie
 */
const setAuthCookie = (res, token) => {
  res.cookie('access_token', token, {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: config.nodeEnv === 'production' ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  });
};

/**
 * Helper to safely unlink a file from disk
 */
const safeUnlink = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (err) {
    console.warn(`[profileController] Could not unlink file: ${filePath}`, err.message);
  }
};

/**
 * Formats a clean public profile object
 */
const formatProfileResponse = (user) => ({
  id: user._id,
  fullName: user.fullName,
  email: user.email,
  phoneNumber: user.phoneNumber || '',
  avatar: user.avatar || '',
  headline: user.headline || '',
  currentRole: user.currentRole || '',
  targetRole: user.targetRole || '',
  careerLevel: user.careerLevel || 'Entry',
  location: user.location || '',
  skills: user.skills || [],
  education: user.education || [],
  notifications: user.notifications || {
    interviewReminders: true,
    applicationReminders: true,
    resumeUpdates: true,
    jobMatchUpdates: true,
    productAnnouncements: false,
  },
  appearance: user.appearance || { theme: 'dark' },
  passwordChangedAt: user.passwordChangedAt || null,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

/**
 * GET /api/v1/profile
 * Retrieve authenticated candidate's full profile
 */
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found.',
        code: 'USER_NOT_FOUND',
      });
    }

    return res.status(200).json({
      success: true,
      data: formatProfileResponse(user),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve profile.',
      error: error.message,
    });
  }
};

/**
 * PUT /api/v1/profile
 * Update authenticated candidate's profile information
 */
export const updateProfile = async (req, res) => {
  try {
    const validation = validateUpdateProfile(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: validation.error,
        code: 'VALIDATION_ERROR',
        errors: validation.fieldErrors,
      });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found.',
        code: 'USER_NOT_FOUND',
      });
    }

    const {
      fullName,
      email,
      phoneNumber,
      avatar,
      headline,
      currentRole,
      targetRole,
      careerLevel,
      location,
      skills,
      education,
    } = validation.data;

    // Email update: check uniqueness if email is changed
    if (email && email.toLowerCase() !== user.email.toLowerCase()) {
      const existingUser = await User.findOne({
        email: email.toLowerCase(),
        _id: { $ne: user._id },
      });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'An account with this email address already exists.',
          code: 'DUPLICATE_EMAIL',
        });
      }

      user.email = email.toLowerCase();
    }

    if (fullName !== undefined) user.fullName = fullName;
    if (phoneNumber !== undefined) user.phoneNumber = phoneNumber;
    if (avatar !== undefined) user.avatar = avatar;
    if (headline !== undefined) user.headline = headline;
    if (currentRole !== undefined) user.currentRole = currentRole;
    if (targetRole !== undefined) user.targetRole = targetRole;
    if (careerLevel !== undefined) user.careerLevel = careerLevel;
    if (location !== undefined) user.location = location;
    if (skills !== undefined) user.skills = skills;
    if (education !== undefined) user.education = education;

    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      data: formatProfileResponse(user),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email address already exists.',
        code: 'DUPLICATE_EMAIL',
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to update profile.',
      error: error.message,
    });
  }
};

/**
 * POST /api/v1/profile/change-password
 * Change password with verification of current password and token invalidation
 */
export const changePassword = async (req, res) => {
  try {
    const validation = validateChangePassword(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: validation.error,
        code: 'VALIDATION_ERROR',
        errors: validation.fieldErrors,
      });
    }

    const { currentPassword, newPassword } = validation.data;

    // Fetch user with passwordHash
    const user = await User.findById(req.userId).select('+passwordHash');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
        code: 'USER_NOT_FOUND',
      });
    }

    // Verify current password
    const isMatch = await bcryptjs.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect.',
        code: 'INVALID_CREDENTIALS',
      });
    }

    // Hash new password
    const salt = await bcryptjs.genSalt(10);
    const newHash = await bcryptjs.hash(newPassword, salt);

    user.passwordHash = newHash;
    user.passwordChangedAt = new Date();
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();

    // Issue a fresh token for the current session
    const freshToken = signToken(user._id, user.email, user.tokenVersion);
    setAuthCookie(res, freshToken);

    return res.status(200).json({
      success: true,
      message: 'Password changed successfully. Existing sessions have been invalidated.',
      token: freshToken,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to change password.',
      error: error.message,
    });
  }
};

/**
 * GET /api/v1/settings
 * Retrieve user's notification and appearance settings
 */
export const getSettings = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
        code: 'USER_NOT_FOUND',
      });
    }

    const notifications = user.notifications || {
      interviewReminders: true,
      applicationReminders: true,
      resumeUpdates: true,
      jobMatchUpdates: true,
      productAnnouncements: false,
    };

    const appearance = user.appearance || { theme: 'dark' };

    return res.status(200).json({
      success: true,
      data: {
        notifications,
        appearance,
        security: {
          email: user.email,
          passwordLastChanged: user.passwordChangedAt || null,
          accountCreated: user.createdAt,
          authMethod: 'password_jwt',
          sessionActive: true,
          emailDeliveryConfigured: false,
        },
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve settings.',
      error: error.message,
    });
  }
};

/**
 * PUT /api/v1/settings
 * Update notification preferences and appearance theme
 */
export const updateSettings = async (req, res) => {
  try {
    const validation = validateUpdateSettings(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: validation.error,
        code: 'VALIDATION_ERROR',
        errors: validation.fieldErrors,
      });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
        code: 'USER_NOT_FOUND',
      });
    }

    const { notifications, appearance } = validation.data;

    if (notifications) {
      user.notifications = {
        ...(user.notifications?.toObject?.() || user.notifications || {}),
        ...notifications,
      };
    }

    if (appearance) {
      user.appearance = {
        ...(user.appearance?.toObject?.() || user.appearance || {}),
        ...appearance,
      };
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Settings updated successfully.',
      data: {
        notifications: user.notifications,
        appearance: user.appearance,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update settings.',
      error: error.message,
    });
  }
};

/**
 * DELETE /api/v1/profile/account
 * Secure cascading deletion of user account and all owned assets
 */
export const deleteAccount = async (req, res) => {
  try {
    const validation = validateDeleteAccount(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: validation.error,
        code: 'VALIDATION_ERROR',
      });
    }

    const { password } = validation.data;

    // Verify user identity with password confirmation
    const user = await User.findById(req.userId).select('+passwordHash');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
        code: 'USER_NOT_FOUND',
      });
    }

    const isMatch = await bcryptjs.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Incorrect password. Account deletion aborted.',
        code: 'INVALID_CREDENTIALS',
      });
    }

    const userId = user._id;

    // 1. Fetch user's resumes to clean up stored physical files from disk
    const resumes = await Resume.find({ userId }).lean();
    for (const r of resumes) {
      if (r.storedFileName) {
        const filePath = path.join(UPLOAD_DIR, r.storedFileName);
        safeUnlink(filePath);
      }
    }

    // 2. Cascading deletion across all 6 collections
    // Attempt transaction if replica set is available, else execute safe ordered cascade
    let session = null;

    try {
      session = await mongoose.startSession();
      session.startTransaction();
      await Promise.all([
        Resume.deleteMany({ userId }, { session }),
        ResumeAnalysis.deleteMany({ userId }, { session }),
        JobAnalysis.deleteMany({ userId }, { session }),
        InterviewSession.deleteMany({ userId }, { session }),
        Application.deleteMany({ userId }, { session }),
        User.deleteOne({ _id: userId }, { session }),
      ]);
      await session.commitTransaction();
    } catch (txError) {
      if (session) {
        await session.abortTransaction().catch(() => {});
      }
      // If transactions or retryable writes are unsupported on deployment (e.g. standalone MongoDB), execute safe cascade
      await Promise.all([
        Resume.deleteMany({ userId }),
        ResumeAnalysis.deleteMany({ userId }),
        JobAnalysis.deleteMany({ userId }),
        InterviewSession.deleteMany({ userId }),
        Application.deleteMany({ userId }),
        User.deleteOne({ _id: userId }),
      ]);
    } finally {
      if (session) {
        await session.endSession().catch(() => {});
      }
    }

    // 3. Invalidate authentication cookie
    res.clearCookie('access_token', {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: config.nodeEnv === 'production' ? 'strict' : 'lax',
      path: '/',
    });

    return res.status(200).json({
      success: true,
      message: 'Your account and all associated resumes, analyses, job matches, interviews, and applications have been permanently deleted.',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to delete account.',
      error: error.message,
    });
  }
};

export default {
  getProfile,
  updateProfile,
  changePassword,
  getSettings,
  updateSettings,
  deleteAccount,
};
