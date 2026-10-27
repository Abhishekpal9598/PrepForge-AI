import { getDatabaseState } from '../config/db.js';

/**
 * Basic application health check controller
 * Preserves exact Phase 1 specification
 * Endpoint: GET /api/health
 */
export const getHealthStatus = (req, res) => {
  res.status(200).json({
    success: true,
    message: "AI Interview Preparation Platform API is running"
  });
};

/**
 * Dedicated database diagnostics controller
 * Endpoint: GET /api/health/db
 */
export const getDatabaseHealthStatus = (req, res) => {
  const dbState = getDatabaseState();

  if (!dbState.isConnected) {
    return res.status(503).json({
      success: false,
      database: {
        status: dbState.status,
        readyState: dbState.readyState,
      },
      error: "Database is not connected"
    });
  }

  return res.status(200).json({
    success: true,
    database: {
      status: dbState.status,
      readyState: dbState.readyState,
      host: dbState.host,
      name: dbState.name,
      modelsLoaded: [
        'User',
        'Resume',
        'ResumeAnalysis',
        'JobAnalysis',
        'InterviewSession',
        'Application'
      ],
    }
  });
};

/**
 * Versioned health check with database status telemetry
 * Endpoint: GET /api/v1/health
 */
export const getV1HealthStatus = (req, res) => {
  const dbState = getDatabaseState();
  const isHealthy = dbState.isConnected;
  return res.status(isHealthy ? 200 : 503).json({
    success: isHealthy,
    message: isHealthy ? 'PrepForge AI API is running' : 'PrepForge AI API is degraded: Database unavailable',
    status: isHealthy ? 'healthy' : 'degraded',
    version: '1.0.0',
    database: {
      connected: isHealthy,
      status: dbState.status,
      host: isHealthy ? dbState.host : undefined,
    },
    timestamp: new Date().toISOString()
  });
};

export default {
  getHealthStatus,
  getDatabaseHealthStatus,
  getV1HealthStatus,
};
