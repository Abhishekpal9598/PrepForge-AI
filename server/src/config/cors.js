import { config } from './env.js';

export const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      config.clientUrl,
      'http://localhost:5173',
      'http://127.0.0.1:5173',
    ];

    // Allow requests with no origin (such as mobile apps, curl, or Postman)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};
