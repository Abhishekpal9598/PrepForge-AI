import mongoose from 'mongoose';
import { logger } from '../utils/logger.js';
import config from './env.js';

/**
 * Sanitizes a MongoDB URI by masking user credentials.
 * @param {string} uri
 * @returns {string}
 */
export const sanitizeMongoUri = (uri) => {
  if (!uri || typeof uri !== 'string') return '';
  return uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@');
};

/**
 * Connection options for Mongoose 8+
 */
const defaultConnectionOptions = {
  maxPoolSize: 10,
  minPoolSize: 2,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  family: 4, // Enforce IPv4 to bypass Windows IPv6 resolution latency
  autoIndex: process.env.NODE_ENV !== 'production',
};

// Register connection lifecycle event listeners
let listenersAttached = false;
const attachConnectionListeners = () => {
  if (listenersAttached) return;
  listenersAttached = true;

  mongoose.connection.on('connected', () => {
    const host = mongoose.connection.host || 'unknown-host';
    const dbName = mongoose.connection.name || 'unknown-db';
    logger.info(`MongoDB connection established [Host: ${host}, DB: ${dbName}]`);
  });

  mongoose.connection.on('open', () => {
    logger.info('MongoDB connection open and ready for operations.');
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB connection disconnected.');
  });

  mongoose.connection.on('close', () => {
    logger.info('MongoDB connection closed.');
  });

  mongoose.connection.on('error', (err) => {
    logger.error(`MongoDB connection error: ${err.message}`);
  });
};

/**
 * Connects to MongoDB with configured pooling and options.
 *
 * @param {string} [uri] Custom connection URI, defaults to config.mongoUri
 * @param {Record<string, unknown>} [options] Override connection options
 * @returns {Promise<typeof mongoose>}
 */
export const connectDB = async (uri = config.mongoUri, options = {}) => {
  attachConnectionListeners();

  if (!uri) {
    throw new Error('Database connection failed: MONGODB_URI is undefined or empty.');
  }

  // If already connected to the same host/db, return existing connection
  if (mongoose.connection.readyState === 1) {
    logger.info('MongoDB is already connected.');
    return mongoose;
  }

  const mergedOptions = { ...defaultConnectionOptions, ...options };
  const sanitized = sanitizeMongoUri(uri);

  try {
    logger.info(`Connecting to MongoDB at ${sanitized}...`);
    await mongoose.connect(uri, mergedOptions);
    return mongoose;
  } catch (error) {
    logger.error(`Failed to connect to MongoDB (${sanitized}): ${error.message}`);
    throw error;
  }
};

/**
 * Disconnects from MongoDB gracefully.
 *
 * @returns {Promise<void>}
 */
export const disconnectDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    logger.info('Closing MongoDB connection...');
    await mongoose.connection.close(false);
    logger.info('MongoDB connection closed successfully.');
  }
};

/**
 * Returns current database connection state and non-sensitive diagnostic metadata.
 *
 * @returns {{ isConnected: boolean, readyState: number, host: string, name: string }}
 */
export const getDatabaseState = () => {
  const readyState = mongoose.connection.readyState;
  // readyState: 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
  const stateLabels = ['disconnected', 'connected', 'connecting', 'disconnecting'];

  return {
    isConnected: readyState === 1,
    readyState,
    status: stateLabels[readyState] || 'unknown',
    host: mongoose.connection.host || null,
    name: mongoose.connection.name || null,
  };
};

export default {
  connectDB,
  disconnectDB,
  getDatabaseState,
  sanitizeMongoUri,
};
