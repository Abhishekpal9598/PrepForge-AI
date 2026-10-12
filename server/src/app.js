import express from 'express';
import cors from 'cors';
import { corsOptions } from './config/cors.js';
import healthRoutes from './routes/healthRoutes.js';
import { notFoundHandler } from './middleware/notFoundHandler.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

// Security and utility middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api', healthRoutes);

// Compatibility route for root /health
app.get('/health', (req, res) => {
  res.redirect('/api/health');
});

// 404 & Centralized Error Handlers
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
