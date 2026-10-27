import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { corsOptions } from './config/cors.js';
import helmet from 'helmet';
import { generalLimiter, authLimiter, aiLimiter } from './middleware/rateLimitMiddleware.js';
import healthRoutes from './routes/healthRoutes.js';
import authRoutes from './routes/authRoutes.js';
import resumeRoutes from './routes/resumeRoutes.js';
import resumeAnalysisRoutes from './routes/resumeAnalysisRoutes.js';
import jobRoutes from './routes/jobRoutes.js';
import interviewRoutes from './routes/interviewRoutes.js';
import applicationRoutes from './routes/applicationRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import profileRoutes from './routes/profileRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import { notFoundHandler } from './middleware/notFoundHandler.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

// Trust reverse proxy (Render, Cloudflare, AWS ALB) for secure cookies and rate limiting
app.set('trust proxy', 1);

// Security headers (Helmet)
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

// CORS and payload parsers (enforce 2MB request body size limit against payload attacks)
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(cookieParser());

// Rate Limiting Guards
app.use('/api', generalLimiter);
app.use('/api/v1/auth/login', authLimiter);
app.use('/api/v1/auth/register', authLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/v1/profile/change-password', authLimiter);
app.use('/api/profile/change-password', authLimiter);
app.use('/api/v1/resumes/:id/analyze', aiLimiter);
app.use('/api/resumes/:id/analyze', aiLimiter);
app.use('/api/v1/jobs/analyze', aiLimiter);
app.use('/api/jobs/analyze', aiLimiter);

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/v1/resumes', resumeRoutes);
app.use('/api/resumes', resumeRoutes);
app.use('/api/v1/resume-analyses', resumeAnalysisRoutes);
app.use('/api/resume-analyses', resumeAnalysisRoutes);
app.use('/api/v1/jobs', jobRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/v1/interviews', interviewRoutes);
app.use('/api/interviews', interviewRoutes);
app.use('/api/v1/applications', applicationRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/v1/profile', profileRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/v1/settings', settingsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api', healthRoutes);





// Root endpoint: redirect browser requests to frontend, or return API status
app.get('/', (req, res) => {
  if (req.accepts('html')) {
    return res.redirect(process.env.CLIENT_URL || 'http://localhost:5173');
  }
  res.json({
    success: true,
    message: 'PrepForge AI API is running',
    endpoints: {
      health: '/api/health',
      database: '/api/health/db',
    },
    frontendUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  });
});

// Compatibility route for root /health
app.get('/health', (req, res) => {
  res.redirect('/api/health');
});

// 404 & Centralized Error Handlers
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
