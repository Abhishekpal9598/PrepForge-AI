import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const urlOrEmptyString = z
  .string()
  .trim()
  .optional()
  .refine(
    (val) => {
      if (!val || val === '') return true;
      try {
        const parsed = new URL(val);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
      } catch {
        return false;
      }
    },
    { message: 'jobUrl must be a valid HTTP or HTTPS URL or an empty string' }
  );

export const applicationStatusEnum = z.enum([
  'Saved',
  'Applied',
  'Assessment',
  'Interview',
  'Interviewing',
  'Offer',
  'Offered',
  'Rejected',
  'Withdrawn',
]);

export const employmentTypeEnum = z.enum([
  'Full-time',
  'Part-time',
  'Contract',
  'Internship',
  'Freelance',
  'Other',
]);

export const createApplicationSchema = z
  .object({
    companyName: z
      .string({ required_error: 'Company name is required' })
      .trim()
      .min(1, 'Company name cannot be empty')
      .max(150, 'Company name cannot exceed 150 characters'),
    jobTitle: z
      .string()
      .trim()
      .min(1, 'Job title cannot be empty')
      .max(150, 'Job title cannot exceed 150 characters')
      .optional(),
    positionTitle: z
      .string()
      .trim()
      .min(1, 'Position title cannot be empty')
      .max(150, 'Position title cannot exceed 150 characters')
      .optional(),
    jobDescription: z
      .string()
      .trim()
      .max(50000, 'Job description cannot exceed 50,000 characters')
      .optional()
      .default(''),
    location: z
      .string()
      .trim()
      .max(150, 'Location cannot exceed 150 characters')
      .optional()
      .default('Remote'),
    employmentType: employmentTypeEnum.optional().default('Full-time'),
    applicationDate: z
      .union([z.string().datetime(), z.string().date(), z.date(), z.string().regex(/^\d{4}-\d{2}-\d{2}/)])
      .optional(),
    appliedDate: z
      .union([z.string().datetime(), z.string().date(), z.date(), z.string().regex(/^\d{4}-\d{2}-\d{2}/)])
      .optional(),
    deadline: z
      .union([z.string().datetime(), z.string().date(), z.date(), z.string().regex(/^\d{4}-\d{2}-\d{2}/), z.null()])
      .optional()
      .nullable(),
    jobUrl: urlOrEmptyString.default(''),
    resumeId: z
      .string()
      .regex(objectIdRegex, 'Invalid resumeId format')
      .optional()
      .nullable()
      .or(z.literal('')),
    jobAnalysisId: z
      .string()
      .regex(objectIdRegex, 'Invalid jobAnalysisId format')
      .optional()
      .nullable()
      .or(z.literal('')),
    status: applicationStatusEnum.optional().default('Saved'),
    salaryExpectation: z
      .number()
      .min(0, 'Salary expectation cannot be negative')
      .optional()
      .nullable(),
    notes: z
      .string()
      .max(5000, 'Notes cannot exceed 5000 characters')
      .optional()
      .default(''),
    interviewDate: z
      .union([z.string().datetime(), z.string().date(), z.date(), z.string().regex(/^\d{4}-\d{2}-\d{2}/), z.null()])
      .optional()
      .nullable(),
  })
  .refine(
    (data) => Boolean(data.jobTitle || data.positionTitle),
    {
      message: 'Either jobTitle or positionTitle is required',
      path: ['jobTitle'],
    }
  );

export const updateApplicationSchema = z.object({
  companyName: z
    .string()
    .trim()
    .min(1, 'Company name cannot be empty')
    .max(150, 'Company name cannot exceed 150 characters')
    .optional(),
  jobTitle: z
    .string()
    .trim()
    .min(1, 'Job title cannot be empty')
    .max(150, 'Job title cannot exceed 150 characters')
    .optional(),
  positionTitle: z
    .string()
    .trim()
    .min(1, 'Position title cannot be empty')
    .max(150, 'Position title cannot exceed 150 characters')
    .optional(),
  jobDescription: z
    .string()
    .trim()
    .max(50000, 'Job description cannot exceed 50,000 characters')
    .optional(),
  location: z
    .string()
    .trim()
    .max(150, 'Location cannot exceed 150 characters')
    .optional(),
  employmentType: employmentTypeEnum.optional(),
  applicationDate: z
    .union([z.string().datetime(), z.string().date(), z.date(), z.string().regex(/^\d{4}-\d{2}-\d{2}/), z.null()])
    .optional()
    .nullable(),
  appliedDate: z
    .union([z.string().datetime(), z.string().date(), z.date(), z.string().regex(/^\d{4}-\d{2}-\d{2}/), z.null()])
    .optional()
    .nullable(),
  deadline: z
    .union([z.string().datetime(), z.string().date(), z.date(), z.string().regex(/^\d{4}-\d{2}-\d{2}/), z.null()])
    .optional()
    .nullable(),
  jobUrl: urlOrEmptyString,
  resumeId: z
    .string()
    .regex(objectIdRegex, 'Invalid resumeId format')
    .optional()
    .nullable()
    .or(z.literal('')),
  jobAnalysisId: z
    .string()
    .regex(objectIdRegex, 'Invalid jobAnalysisId format')
    .optional()
    .nullable()
    .or(z.literal('')),
  status: applicationStatusEnum.optional(),
  salaryExpectation: z
    .number()
    .min(0, 'Salary expectation cannot be negative')
    .optional()
    .nullable(),
  notes: z
    .string()
    .max(5000, 'Notes cannot exceed 5000 characters')
    .optional(),
  interviewDate: z
    .union([z.string().datetime(), z.string().date(), z.date(), z.string().regex(/^\d{4}-\d{2}-\d{2}/), z.null()])
    .optional()
    .nullable(),
});

export const queryApplicationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  status: z.string().optional(),
  search: z.string().optional(),
  sortBy: z
    .enum(['applicationDate', 'appliedDate', 'createdAt', 'updatedAt', 'companyName', 'jobTitle', 'deadline'])
    .default('applicationDate'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const validateCreateApplication = (data) => createApplicationSchema.parse(data);
export const validateUpdateApplication = (data) => updateApplicationSchema.parse(data);
export const validateQueryApplication = (data) => queryApplicationSchema.parse(data);
