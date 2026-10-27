import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { config } from '../config/env.js';

/**
 * Authentication Middleware for PrepForge AI
 * Validates JWT access token from HttpOnly cookie or Authorization Bearer header.
 * Attaches the authenticated user document to req.user and req.userId.
 */
export const authenticate = async (req, res, next) => {
  try {
    let token = null;

    // 1. Check HttpOnly cookie first
    if (req.cookies && req.cookies.access_token) {
      token = req.cookies.access_token;
    }
    // 2. Fallback to Authorization: Bearer <token>
    else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. No access token provided.',
        code: 'AUTH_TOKEN_MISSING'
      });
    }

    // 3. Verify JWT
    const secret = config.jwtSecret || 'development_jwt_secret_minimum_32_characters_long';
    let decoded;
    try {
      decoded = jwt.verify(token, secret);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Authentication token has expired. Please log in again.',
          code: 'AUTH_TOKEN_EXPIRED'
        });
      }
      return res.status(401).json({
        success: false,
        message: 'Invalid authentication token.',
        code: 'AUTH_TOKEN_INVALID'
      });
    }

    if (!decoded || !decoded.id) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token payload structure.',
        code: 'AUTH_TOKEN_INVALID'
      });
    }

    // 4. Fetch user from database
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'The user belonging to this token no longer exists.',
        code: 'USER_NOT_FOUND'
      });
    }

    // 5. Invalidate token if tokenVersion does not match current user state
    if (decoded.tokenVersion !== undefined && user.tokenVersion !== undefined) {
      if (decoded.tokenVersion !== user.tokenVersion) {
        return res.status(401).json({
          success: false,
          message: 'Session has been invalidated. Please log in again.',
          code: 'TOKEN_INVALIDATED'
        });
      }
    }

    // 6. Invalidate token if password was changed after token issuance
    if (user.passwordChangedAt && decoded.iat) {
      const changedTimestamp = Math.floor(user.passwordChangedAt.getTime() / 1000);
      if (decoded.iat < changedTimestamp - 1) {
        return res.status(401).json({
          success: false,
          message: 'Password was recently changed. Please log in again.',
          code: 'TOKEN_INVALIDATED'
        });
      }
    }

    req.user = user;
    req.userId = user._id;
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Internal server error during authentication verification.',
      error: error.message
    });
  }
};

export default authenticate;
