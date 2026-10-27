import { z } from 'zod';

/**
 * Career seniority level enum
 */
export const careerLevelEnum = z.enum([
  'Entry',
  'Mid',
  'Senior',
  'Lead',
  'Executive',
]);

/**
 * Theme preference enum
 */
export const themeEnum = z.enum(['dark', 'light', 'system']);

/**
 * Education entry schema
 */
export const educationEntrySchema = z.object({
  institution: z
    .string()
    .trim()
    .max(120, 'Institution name cannot exceed 120 characters')
    .default(''),
  degree: z
    .string()
    .trim()
    .max(120, 'Degree cannot exceed 120 characters')
    .default(''),
  fieldOfStudy: z
    .string()
    .trim()
    .max(120, 'Field of study cannot exceed 120 characters')
    .default(''),
  graduationYear: z
    .number()
    .int('Graduation year must be an integer')
    .min(1950, 'Graduation year must be after 1950')
    .max(2100, 'Graduation year must be before 2100')
    .nullable()
    .optional(),
});

/**
 * Protected user fields that cannot be altered via profile update
 */
export const PROTECTED_PROFILE_FIELDS = [
  'role',
  'permissions',
  'passwordHash',
  'accountStatus',
  'isSuperuser',
  'isAdmin',
  'tokenVersion',
  'passwordChangedAt',
  '_id',
  'createdAt',
  'updatedAt',
];

/**
 * Profile Update Schema
 */
export const updateProfileSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, 'Full name must be at least 2 characters long')
      .max(100, 'Full name cannot exceed 100 characters')
      .optional(),
    email: z
      .string()
      .trim()
      .email('Please provide a valid email address')
      .toLowerCase()
      .optional(),
    phoneNumber: z
      .string()
      .trim()
      .max(30, 'Phone number cannot exceed 30 characters')
      .optional(),
    avatar: z
      .string()
      .trim()
      .max(500, 'Avatar URL cannot exceed 500 characters')
      .optional(),
    headline: z
      .string()
      .trim()
      .max(150, 'Professional headline cannot exceed 150 characters')
      .optional(),
    currentRole: z
      .string()
      .trim()
      .max(120, 'Current role cannot exceed 120 characters')
      .optional(),
    targetRole: z
      .string()
      .trim()
      .max(120, 'Target role cannot exceed 120 characters')
      .optional(),
    careerLevel: careerLevelEnum.optional(),
    location: z
      .string()
      .trim()
      .max(120, 'Location cannot exceed 120 characters')
      .optional(),
    skills: z
      .array(
        z.string().trim().min(1, 'Skill tag cannot be empty').max(50, 'Skill tag cannot exceed 50 characters')
      )
      .max(50, 'You can add at most 50 skills')
      .optional(),
    education: z.array(educationEntrySchema).max(20, 'At most 20 education entries').optional(),
  })
  .strict(); // Rejects unrecognized or protected top-level fields

/**
 * Change Password Schema
 */
export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string({ required_error: 'Current password is required' })
      .min(1, 'Current password cannot be empty'),
    newPassword: z
      .string({ required_error: 'New password is required' })
      .min(8, 'New password must be at least 8 characters long')
      .max(128, 'New password cannot exceed 128 characters')
      .regex(/[A-Z]/, 'New password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'New password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'New password must contain at least one number'),
    confirmPassword: z
      .string({ required_error: 'Password confirmation is required' })
      .min(1, 'Password confirmation cannot be empty'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'New password and confirmation do not match',
    path: ['confirmPassword'],
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    message: 'New password must be different from current password',
    path: ['newPassword'],
  });

/**
 * Settings Update Schema
 */
export const updateSettingsSchema = z.object({
  notifications: z
    .object({
      interviewReminders: z.boolean().optional(),
      applicationReminders: z.boolean().optional(),
      resumeUpdates: z.boolean().optional(),
      jobMatchUpdates: z.boolean().optional(),
      productAnnouncements: z.boolean().optional(),
    })
    .optional(),
  appearance: z
    .object({
      theme: themeEnum.optional(),
    })
    .optional(),
});

/**
 * Account Deletion Schema
 */
export const deleteAccountSchema = z.object({
  password: z
    .string({ required_error: 'Password is required to confirm account deletion' })
    .min(1, 'Password cannot be empty'),
  confirmation: z
    .string()
    .optional(),
});

/**
 * Validation helpers with standard normalized return format
 */
export const validateUpdateProfile = (payload) => {
  // Check for protected field attempts
  const detectedProtected = PROTECTED_PROFILE_FIELDS.filter(
    (field) => field in payload && payload[field] !== undefined
  );
  if (detectedProtected.length > 0) {
    return {
      success: false,
      error: `Modification of protected fields is prohibited: ${detectedProtected.join(', ')}`,
      fieldErrors: detectedProtected.reduce((acc, field) => {
        acc[field] = 'This field is protected and cannot be modified';
        return acc;
      }, {}),
    };
  }

  const result = updateProfileSchema.safeParse(payload);
  if (!result.success) {
    const firstIssue = result.error.issues[0];
    const fieldErrors = result.error.issues.reduce((acc, issue) => {
      const path = issue.path.join('.');
      acc[path] = issue.message;
      return acc;
    }, {});

    return {
      success: false,
      error: firstIssue.message,
      fieldErrors,
    };
  }

  return {
    success: true,
    data: result.data,
  };
};

export const validateChangePassword = (payload) => {
  const result = changePasswordSchema.safeParse(payload);
  if (!result.success) {
    const firstIssue = result.error.issues[0];
    const fieldErrors = result.error.issues.reduce((acc, issue) => {
      const path = issue.path.join('.');
      acc[path] = issue.message;
      return acc;
    }, {});

    return {
      success: false,
      error: firstIssue.message,
      fieldErrors,
    };
  }

  return {
    success: true,
    data: result.data,
  };
};

export const validateUpdateSettings = (payload) => {
  const result = updateSettingsSchema.safeParse(payload);
  if (!result.success) {
    const firstIssue = result.error.issues[0];
    const fieldErrors = result.error.issues.reduce((acc, issue) => {
      const path = issue.path.join('.');
      acc[path] = issue.message;
      return acc;
    }, {});

    return {
      success: false,
      error: firstIssue.message,
      fieldErrors,
    };
  }

  return {
    success: true,
    data: result.data,
  };
};

export const validateDeleteAccount = (payload) => {
  const result = deleteAccountSchema.safeParse(payload);
  if (!result.success) {
    const firstIssue = result.error.issues[0];
    return {
      success: false,
      error: firstIssue.message,
    };
  }

  return {
    success: true,
    data: result.data,
  };
};

export default {
  careerLevelEnum,
  themeEnum,
  updateProfileSchema,
  changePasswordSchema,
  updateSettingsSchema,
  deleteAccountSchema,
  validateUpdateProfile,
  validateChangePassword,
  validateUpdateSettings,
  validateDeleteAccount,
};
