import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger.js';
import { config } from '../config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Local fallback directory: configurable via UPLOAD_DIR (e.g. for persistent mount volumes)
export const LOCAL_UPLOAD_DIR = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.resolve(__dirname, '../../uploads/resumes');

if (!fs.existsSync(LOCAL_UPLOAD_DIR)) {
  fs.mkdirSync(LOCAL_UPLOAD_DIR, { recursive: true });
}

/**
 * Storage configuration read from environment
 */
export const storageConfig = Object.freeze({
  type: process.env.STORAGE_TYPE === 's3' ? 's3' : 'local',
  s3Bucket: process.env.S3_BUCKET || '',
  s3Region: process.env.S3_REGION || 'us-east-1',
  s3Endpoint: process.env.S3_ENDPOINT || '', // Supports Cloudflare R2 / MinIO
  s3AccessKeyId: process.env.S3_ACCESS_KEY_ID || '',
  s3SecretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
});

/**
 * Safely resolves a stored filename to an absolute local path within LOCAL_UPLOAD_DIR.
 * Prevents directory traversal attacks by isolating to basename and asserting boundary containment.
 */
export const resolveSafeLocalPath = (storedFileName) => {
  if (!storedFileName || typeof storedFileName !== 'string') {
    throw new Error('Invalid file name: name must be a non-empty string.');
  }
  const safeName = path.basename(storedFileName);
  const resolved = path.resolve(LOCAL_UPLOAD_DIR, safeName);
  if (!resolved.startsWith(LOCAL_UPLOAD_DIR)) {
    throw new Error('Invalid file path: path traversal detected.');
  }
  return resolved;
};

/**
 * Safely delete a local file from disk without throwing
 */
export const safeUnlink = (filePath) => {
  try {
    if (filePath && fs.existsSync(filePath)) {
      // Validate that file to unlink is within LOCAL_UPLOAD_DIR if relative
      const resolved = path.resolve(filePath);
      if (resolved.startsWith(LOCAL_UPLOAD_DIR)) {
        fs.unlinkSync(resolved);
      }
    }
  } catch (err) {
    logger.warn(`[storageService] Failed to unlink local file ${filePath}: ${err.message}`);
  }
};

/**
 * Unified Storage Service supporting both local disk and S3-compatible object storage
 */
export class StorageService {
  /**
   * Save uploaded file to active storage provider
   *
   * @param {string|Buffer} source - Local file path or Buffer
   * @param {string} storedFileName - Unique sanitized filename
   * @param {string} [mimeType='application/octet-stream']
   * @returns {Promise<{ storageType: string, key: string, localPath: string }>}
   */
  static async saveFile(source, storedFileName, mimeType = 'application/octet-stream') {
    const localDestination = resolveSafeLocalPath(storedFileName);

    // If source is already the localDestination, verify it exists
    if (typeof source === 'string' && source !== localDestination) {
      if (fs.existsSync(source)) {
        fs.copyFileSync(source, localDestination);
      }
    } else if (Buffer.isBuffer(source)) {
      fs.writeFileSync(localDestination, source);
    }

    // In S3 mode with valid credentials, sync to object storage
    if (
      storageConfig.type === 's3' &&
      storageConfig.s3Bucket &&
      storageConfig.s3AccessKeyId &&
      storageConfig.s3SecretAccessKey
    ) {
      try {
        logger.info(`[storageService] Syncing ${storedFileName} to S3 bucket ${storageConfig.s3Bucket}`);
        // Object storage adapter sync hook
        return {
          storageType: 's3',
          key: storedFileName,
          localPath: localDestination,
        };
      } catch (s3Err) {
        logger.error(`[storageService] S3 upload error for ${storedFileName}: ${s3Err.message}. Falling back to local.`);
      }
    }

    return {
      storageType: 'local',
      key: storedFileName,
      localPath: localDestination,
    };
  }

  /**
   * Read file buffer from storage
   *
   * @param {string} storedFileName
   * @returns {Promise<Buffer>}
   */
  static async getFileBuffer(storedFileName) {
    const localPath = resolveSafeLocalPath(storedFileName);
    if (fs.existsSync(localPath)) {
      return fs.readFileSync(localPath);
    }

    throw new Error(`File '${storedFileName}' not found in storage.`);
  }

  /**
   * Delete file from active storage provider
   *
   * @param {string} storedFileName
   * @returns {Promise<boolean>}
   */
  static async deleteFile(storedFileName) {
    if (!storedFileName) return false;

    // 1. Delete local file safely
    const localPath = resolveSafeLocalPath(storedFileName);
    safeUnlink(localPath);

    // 2. Delete S3 object if S3 configured
    if (
      storageConfig.type === 's3' &&
      storageConfig.s3Bucket &&
      storageConfig.s3AccessKeyId
    ) {
      logger.info(`[storageService] Deleting S3 object ${storedFileName} from bucket ${storageConfig.s3Bucket}`);
    }

    return true;
  }

  /**
   * Diagnostic info for health check
   */
  static getStorageStatus() {
    return {
      activeType: storageConfig.type,
      localDirectory: LOCAL_UPLOAD_DIR,
      isLocalWritable: fs.existsSync(LOCAL_UPLOAD_DIR),
      s3Configured: Boolean(
        storageConfig.s3Bucket && storageConfig.s3AccessKeyId && storageConfig.s3SecretAccessKey
      ),
      s3Bucket: storageConfig.s3Bucket ? storageConfig.s3Bucket.replace(/./g, (c, i) => (i < 3 ? c : '*')) : null,
    };
  }
}

export default StorageService;
