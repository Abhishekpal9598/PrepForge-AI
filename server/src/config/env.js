import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables exclusively from server root or workspace root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

/**
 * Zod validation schema for environment variables
 */
export const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(5001),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  CLIENT_URL: z.string().url().default('http://localhost:5173'),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required and cannot be empty'),
  DB_NAME: z.string().optional(),
  TEST_MONGODB_URI: z.string().optional(),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters').optional(),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.NODE_ENV === 'production' && !data.JWT_SECRET) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'JWT_SECRET is mandatory in production and must be at least 32 characters.',
      path: ['JWT_SECRET'],
    });
  }
});

/**
 * Validates a dictionary of environment variables against envSchema.
 * Does not expose raw connection strings or secrets in error outputs.
 *
 * @param {Record<string, unknown>} rawEnv
 * @returns {Record<string, any>}
 */
export const validateEnv = (rawEnv = process.env) => {
  const result = envSchema.safeParse(rawEnv);

  if (!result.success) {
    const errorIssues = result.error.issues.map((issue) => {
      const field = issue.path.join('.');
      return `  - ${field}: ${issue.message}`;
    });

    const formattedMessage = `[ENVIRONMENT ERROR] Configuration validation failed:\n${errorIssues.join('\n')}`;
    
    // In test environment, throw error for assertion; in runtime, throw so caller can exit cleanly
    const error = new Error(formattedMessage);
    error.issues = result.error.issues;
    throw error;
  }

  return Object.freeze(result.data);
};

let validatedData;
try {
  validatedData = validateEnv(process.env);
} catch (err) {
  // If not running under test runner, print error and exit process cleanly
  if (process.env.NODE_ENV !== 'test') {
    console.error(err.message);
    process.exit(1);
  } else {
    // Under test, provide fallback so other isolated modules can import config
    validatedData = {
      PORT: 5001,
      NODE_ENV: 'test',
      CLIENT_URL: 'http://localhost:5173',
      MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/ai_interview_prep',
      TEST_MONGODB_URI: process.env.TEST_MONGODB_URI || 'mongodb://localhost:27017/ai_interview_prep_test',
    };
  }
}

export const config = Object.freeze({
  port: validatedData.PORT,
  nodeEnv: validatedData.NODE_ENV,
  clientUrl: validatedData.CLIENT_URL,
  mongoUri: validatedData.MONGODB_URI,
  dbName: validatedData.DB_NAME || (validatedData.NODE_ENV === 'production' ? 'prepforge_prod' : undefined),
  testMongoUri: validatedData.TEST_MONGODB_URI,
  jwtSecret: validatedData.JWT_SECRET,
  geminiApiKey: validatedData.GEMINI_API_KEY,
  geminiModel: validatedData.GEMINI_MODEL,
});

export default config;
