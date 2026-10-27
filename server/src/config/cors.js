import { config } from './env.js';

/**
 * Validates whether an origin is permitted in production environments
 */
export const isOriginAllowedInProduction = (origin, clientUrl = config.clientUrl) => {
  if (!origin) return true;
  const normalizedOrigin = origin.replace(/\/$/, '');
  const configuredOrigins = (clientUrl || '')
    .split(',')
    .map((url) => url.trim().replace(/\/$/, ''))
    .filter(Boolean);

  const allowedOrigins = [
    ...configuredOrigins,
    'https://prepforge.ai',
    'https://www.prepforge.ai',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
    'http://localhost:4173',
  ];

  // Dynamic pattern matching for verified Vercel production & preview deployments
  const isVercelDomain =
    /^https:\/\/(?:[a-z0-9-]+\.)*(?:prepforge|ai-interview)[a-z0-9-]*\.vercel\.app$/i.test(normalizedOrigin) ||
    /^https:\/\/[a-z0-9-]+-abhishek(?:pal9598)?(?:-pals-projects)?\.vercel\.app$/i.test(normalizedOrigin);

  return allowedOrigins.includes(normalizedOrigin) || isVercelDomain;
};

export const corsOptions = {
  origin: (origin, callback) => {
    // In development or test mode, or server-to-server/curl requests, allow origin
    if (config.nodeEnv !== 'production' || !origin) {
      return callback(null, true);
    }

    if (isOriginAllowedInProduction(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  maxAge: 86400,
};
