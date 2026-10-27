import rateLimit from 'express-rate-limit';

/**
 * Skip rate limiting during test executions to avoid false test failures.
 */
const isTestEnv = () => process.env.NODE_ENV === 'test';

/**
 * General API Rate Limiter
 * 1,000 requests per 15 minutes per IP
 */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  skip: isTestEnv,
  message: {
    success: false,
    message: 'Too many requests from this IP. Please try again later.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
});

/**
 * Strict Authentication Rate Limiter
 * 30 attempts per 15 minutes per IP (protects login/register/password change from brute force)
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  skip: isTestEnv,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again after 15 minutes.',
    code: 'AUTH_RATE_LIMIT_EXCEEDED',
  },
});

/**
 * AI Generation & Heavy Operations Rate Limiter
 * 60 requests per 15 minutes per IP (protects Gemini quota and server resources)
 */
export const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  skip: isTestEnv,
  message: {
    success: false,
    message: 'AI request limit reached. Please wait a few moments before trying again.',
    code: 'AI_RATE_LIMIT_EXCEEDED',
  },
});

export default {
  generalLimiter,
  authLimiter,
  aiLimiter,
};
