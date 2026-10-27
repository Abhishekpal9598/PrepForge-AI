import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { config } from '../config/env.js';

const JWT_SECRET = config.jwtSecret || 'development_jwt_secret_minimum_32_characters_long';
const TOKEN_EXPIRY = '7d';

/**
 * Generate JWT token for user
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
    path: '/'
  });
};

/**
 * Register a new user
 * POST /api/v1/auth/register
 */
export const register = async (req, res) => {
  try {
    const { fullName, email, password, targetRole, careerLevel } = req.body;

    // Validate required fields
    if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Full name is required and must be at least 2 characters long.'
      });
    }

    if (!email || typeof email !== 'string' || !/^\S+@\S+\.\S+$/.test(email.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.'
      });
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.'
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check duplicate email
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email address already exists. Please log in.'
      });
    }

    // Hash password with bcryptjs (salt rounds 10 => produces 60 char string)
    const salt = await bcryptjs.genSalt(10);
    const passwordHash = await bcryptjs.hash(password, salt);

    // Create User in MongoDB
    const user = await User.create({
      fullName: fullName.trim(),
      email: normalizedEmail,
      passwordHash,
      targetRole: (targetRole || '').trim(),
      careerLevel: careerLevel || 'Entry'
    });

    // Registration creates the account but does NOT automatically authenticate or issue tokens.
    // The user must explicitly log in with their credentials to establish a session.
    return res.status(201).json({
      success: true,
      message: 'Account created successfully! Please sign in with your credentials.',
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        targetRole: user.targetRole,
        careerLevel: user.careerLevel,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    // Handle Mongoose validation or duplicate key errors gracefully
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email address already exists.'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Registration failed due to a server error. Please try again.',
      error: error.message
    });
  }
};

/**
 * Login user with email and password
 * POST /api/v1/auth/login
 */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.'
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Query user and explicitly select passwordHash
    const user = await User.findOne({ email: normalizedEmail }).select('+passwordHash');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    // Verify password with bcryptjs
    const isMatch = await bcryptjs.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    const token = signToken(user._id, user.email, user.tokenVersion || 0);
    setAuthCookie(res, token);

    return res.status(200).json({
      success: true,
      message: 'Logged in successfully.',
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        targetRole: user.targetRole,
        careerLevel: user.careerLevel,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Login failed due to a server error. Please try again.',
      error: error.message
    });
  }
};

/**
 * Get current authenticated user profile
 * GET /api/v1/auth/me
 */
export const getMe = async (req, res) => {
  try {
    const user = req.user;
    return res.status(200).json({
      success: true,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        targetRole: user.targetRole,
        careerLevel: user.careerLevel,
        phoneNumber: user.phoneNumber || '',
        avatar: user.avatar || '',
        headline: user.headline || '',
        currentRole: user.currentRole || '',
        location: user.location || '',
        skills: user.skills || [],
        education: user.education || [],
        notifications: user.notifications,
        appearance: user.appearance,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve user profile.',
      error: error.message
    });
  }
};

/**
 * Logout user
 * POST /api/v1/auth/logout
 */
export const logout = (req, res) => {
  res.clearCookie('access_token', {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: config.nodeEnv === 'production' ? 'none' : 'lax',
    path: '/'
  });
  return res.status(200).json({
    success: true,
    message: 'Logged out successfully.'
  });
};

export default {
  register,
  login,
  getMe,
  logout
};
