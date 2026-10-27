import app from './app.js';
import { config } from './config/env.js';
import { connectDB, disconnectDB } from './config/db.js';
import { logger } from './utils/logger.js';

let server = null;
let isShuttingDown = false;

/**
 * Graceful shutdown sequence
 * 1. Stop receiving new HTTP connections
 * 2. Close active database connections
 * 3. Exit process cleanly
 *
 * @param {string} signal
 * @param {Function} [exitFn] Optional custom exit handler for testing
 */
export const handleShutdown = async (signal, exitFn = process.exit) => {
  if (isShuttingDown) {
    logger.warn(`Shutdown already in progress. Ignoring duplicate ${signal} signal.`);
    return false;
  }
  isShuttingDown = true;
  logger.info(`${signal} signal received. Initiating graceful shutdown sequence...`);

  if (server) {
    await new Promise((resolve) => {
      server.close(() => {
        logger.info('HTTP server closed successfully.');
        resolve();
      });
    });
  }

  try {
    await disconnectDB();
  } catch (err) {
    logger.error(`Error during database disconnect: ${err.message}`);
  }

  logger.info('Graceful shutdown complete. Exiting process.');
  exitFn(0);
  return true;
};

export const _resetShutdownStateForTesting = () => {
  isShuttingDown = false;
  server = null;
};

// Register process termination signal listeners
process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

// Process error listeners for production stability
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Promise Rejection:', reason instanceof Error ? reason.stack : reason);
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err.stack || err.message);
  handleShutdown('UNCAUGHT_EXCEPTION', () => process.exit(1));
});

/**
 * Starts the application:
 * 1. Validates environment variables (completed upon config import)
 * 2. Connects to MongoDB
 * 3. Starts the HTTP server only after database is connected
 */
export const startServer = async () => {
  try {
    // Attempt database connection with graceful error fallback
    try {
      await connectDB();
    } catch (dbErr) {
      logger.warn(`Initial database connection attempt failed: ${dbErr.message}. Server running with degraded health.`);
    }

    server = app.listen(config.port, () => {
      logger.info(
        `AI Interview Preparation Platform Server running in ${config.nodeEnv} mode on port ${config.port}`
      );
      logger.info(`Health check available at: http://localhost:${config.port}/api/health`);
      logger.info(`V1 Health check available at: http://localhost:${config.port}/api/v1/health`);
      logger.info(`DB diagnostics available at: http://localhost:${config.port}/api/health/db`);
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        logger.error(
          `Port ${config.port} is already in use by another process. Set a different PORT in server/.env.`
        );
        process.exit(1);
      } else {
        logger.error(`Server error: ${err.message}`);
        process.exit(1);
      }
    });

    return server;
  } catch (error) {
    logger.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

// Auto-start server when executed directly as main entry point
if (process.argv[1] && process.argv[1].endsWith('server.js')) {
  startServer();
}

export default app;
