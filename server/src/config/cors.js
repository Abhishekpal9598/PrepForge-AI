import { config } from './env.js';

export const corsOptions = {
  origin: (origin, callback) => {
    // In development or test mode, or server-to-server/curl requests, allow origin
    if (config.nodeEnv !== 'production' || !origin) {
      return callback(null, true);
    }

    const normalizedOrigin = origin.replace(/\/$/, '');
    const configuredOrigins = (config.clientUrl || '')
      .split(',')
      .map((url) => url.trim().replace(/\/$/, ''))
      .filter(Boolean);

    const allowedOrigins = [
      ...configuredOrigins,
      'http://localhost:5173',
      'http://127.0.0.1:5173',
    ];

    const isAllowed =
      allowedOrigins.includes(normalizedOrigin) ||
      /^https:\/\/prepforge(-[a-z0-9-]+)?\.vercel\.app$/.test(normalizedOrigin);

    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
};
