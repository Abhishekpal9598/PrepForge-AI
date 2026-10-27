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
 * Extracts the database name component from a MongoDB connection string if present.
 * Returns null if no database name is specified in the URI path.
 *
 * @param {string} uri
 * @returns {string | null}
 */
export const extractDbFromUri = (uri) => {
  if (!uri || typeof uri !== 'string') return null;
  try {
    const withoutScheme = uri.replace(/^mongodb(\+srv)?:\/\//, '');
    const slashIdx = withoutScheme.indexOf('/');
    if (slashIdx === -1) return null;
    const afterSlash = withoutScheme.slice(slashIdx + 1);
    const qIdx = afterSlash.indexOf('?');
    const dbPart = qIdx === -1 ? afterSlash : afterSlash.slice(0, qIdx);
    return dbPart.trim() || null;
  } catch {
    return null;
  }
};

/**
 * Resolves the target database name based on configuration precedence:
 * 1. Caller explicit dbName option.
 * 2. Explicit DB_NAME environment variable (or config.dbName).
 * 3. In production mode (or on Render): strictly enforces 'prepforge_prod' if unspecified or if URI/config points to 'test'.
 * 4. In development/test mode: preserves URI path database if specified.
 *
 * @param {string} uri
 * @param {string} [explicitDbName]
 * @param {string} [nodeEnv]
 * @returns {string | undefined}
 */
export const resolveDatabaseName = (uri, explicitDbName, nodeEnv = config.nodeEnv) => {
  const isProd = nodeEnv === 'production' || process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';

  // 1. If explicit database name provided
  if (explicitDbName && typeof explicitDbName === 'string' && explicitDbName.trim()) {
    const trimmed = explicitDbName.trim();
    if (isProd && trimmed === 'test') {
      logger.warn('[DB] "test" database requested in production mode. Enforcing "prepforge_prod" for isolation safety.');
      return 'prepforge_prod';
    }
    return trimmed;
  }

  const uriDb = extractDbFromUri(uri);

  // 2. In production or on Render: enforce prepforge_prod if uriDb is missing or 'test'
  if (isProd) {
    if (uriDb && uriDb !== 'test') {
      return uriDb;
    }
    logger.info('[DB] Production database target enforced: prepforge_prod');
    return 'prepforge_prod';
  }

  // 3. In development/test mode: preserve URI database if present
  if (uriDb) {
    return uriDb;
  }

  return undefined;
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
    if ((config.nodeEnv === 'production' || process.env.NODE_ENV === 'production' || process.env.RENDER === 'true') && dbName === 'test') {
      logger.error('CRITICAL PRODUCTION WARNING: MongoDB connected to database "test" instead of "prepforge_prod". Verify DB_NAME configuration!');
    }
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
  // Resolve target database using strict precedence:
  // 1. options.dbName
  // 2. config.dbName / process.env.DB_NAME
  // 3. prepforge_prod (enforced in production / on Render)
  // 4. URI database path (development / test)
  const targetDbName = options.dbName || resolveDatabaseName(uri, config.dbName || process.env.DB_NAME, config.nodeEnv);
  if (targetDbName && !mergedOptions.dbName) {
    mergedOptions.dbName = targetDbName;
  }
  // When connecting via mongodb+srv, omit family: 4 to allow Atlas SRV / shard DNS resolution
  if (uri.startsWith('mongodb+srv://')) {
    delete mergedOptions.family;
  }
  const sanitized = sanitizeMongoUri(uri);

  try {
    logger.info(`Connecting to MongoDB at ${sanitized}...`);
    await mongoose.connect(uri, mergedOptions);
    return mongoose;
  } catch (error) {
    logger.error(`Failed to connect to MongoDB (${sanitized}): ${error.message}`);
    // If remote Atlas cluster failed (e.g. IP whitelist / network issue), attempt local MongoDB in development
    if (uri.startsWith('mongodb+srv://') && process.env.NODE_ENV !== 'production') {
      const localFallback = 'mongodb://localhost:27017/prepforge_ai';
      logger.warn(`Attempting fallback to local MongoDB at ${localFallback}...`);
      try {
        await mongoose.connect(localFallback, { ...defaultConnectionOptions, ...options });
        logger.info(`Connected to local fallback MongoDB [Host: ${mongoose.connection.host}, DB: ${mongoose.connection.name}]`);
        return mongoose;
      } catch (localErr) {
        logger.warn(`Local fallback connection attempt also failed: ${localErr.message}`);
      }
    }
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
  extractDbFromUri,
  resolveDatabaseName,
};
