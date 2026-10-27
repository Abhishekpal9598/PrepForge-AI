/**
 * PrepForge AI — Resume Checks Request & Query Validators
 *
 * Enforces strict validation on check run options, filter queries, and check IDs.
 */

import { z } from 'zod';

export const runResumeChecksSchema = z.object({
  jobDescription: z.string().max(10000, 'Job description must not exceed 10,000 characters').optional(),
  targetRole: z.string().max(200, 'Target role title must not exceed 200 characters').optional(),
  careerLevel: z.enum(['entry', 'mid', 'senior', 'lead', 'executive']).optional(),
  benchmarkData: z.record(z.any()).optional(),
});

export const getResumeChecksQuerySchema = z.object({
  status: z.enum(['PASS', 'WARNING', 'FAIL', 'NOT_EVALUATED']).optional(),
  category: z.enum(['CAT-01', 'CAT-02', 'CAT-03', 'CAT-04', 'CAT-05', 'CAT-06', 'CAT-07']).optional(),
});

export const checkIdParamSchema = z.object({
  checkId: z.string().regex(/^CHK-(?:0[1-9]|1[0-9]|2[0-7])$/i, {
    message: 'Check ID must be in the valid format CHK-01 through CHK-27',
  }),
});

/**
 * Middleware to validate POST /resumes/:id/checks body
 */
export const validateRunChecks = (req, res, next) => {
  const result = runResumeChecksSchema.safeParse(req.body || {});
  if (!result.success) {
    const errorList = result.error.issues || result.error.errors || [];
    return res.status(400).json({
      success: false,
      message: 'Validation failed on check execution parameters.',
      errors: errorList.map((e) => ({ field: (e.path || []).join('.'), message: e.message })),
    });
  }
  req.validatedBody = result.data;
  next();
};

/**
 * Middleware to validate GET /resumes/:id/checks query parameters
 */
export const validateGetChecks = (req, res, next) => {
  const result = getResumeChecksQuerySchema.safeParse(req.query || {});
  if (!result.success) {
    const errorList = result.error.issues || result.error.errors || [];
    return res.status(400).json({
      success: false,
      message: 'Invalid query parameters.',
      errors: errorList.map((e) => ({ field: (e.path || []).join('.'), message: e.message })),
    });
  }
  req.validatedQuery = result.data;
  next();
};

/**
 * Middleware to validate checkId route parameter
 */
export const validateCheckIdParam = (req, res, next) => {
  const result = checkIdParamSchema.safeParse(req.params);
  if (!result.success) {
    const errorList = result.error.issues || result.error.errors || [];
    return res.status(400).json({
      success: false,
      message: 'Invalid check ID format.',
      errors: errorList.map((e) => ({ field: (e.path || []).join('.'), message: e.message })),
    });
  }
  next();
};

export default {
  runResumeChecksSchema,
  getResumeChecksQuerySchema,
  checkIdParamSchema,
  validateRunChecks,
  validateGetChecks,
  validateCheckIdParam,
};
