import fs from 'fs';
import path from 'path';
import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';

/**
 * Validate file header magic bytes
 *
 * @param {Buffer} buffer - File buffer
 * @param {string} extension - File extension without dot (pdf, docx, txt)
 * @returns {boolean} True if header magic bytes match the expected format
 */
export const validateFileSignature = (buffer, extension) => {
  if (!buffer || buffer.length < 4) {
    return false;
  }

  const ext = extension.toLowerCase().replace('.', '');
  if (ext === 'pdf') {
    // PDF magic bytes: %PDF- (0x25, 0x50, 0x44, 0x46)
    return (
      buffer[0] === 0x25 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x44 &&
      buffer[3] === 0x46
    );
  }

  if (ext === 'docx') {
    // DOCX (ZIP container) magic bytes: PK\x03\x04 (0x50, 0x4B, 0x03, 0x04)
    return (
      buffer[0] === 0x50 &&
      buffer[1] === 0x4B &&
      buffer[2] === 0x03 &&
      buffer[3] === 0x04
    );
  }

  if (ext === 'txt') {
    // TXT plain text has no fixed magic bytes, ensure valid UTF-8 and no null byte sequences
    // Reject binary executables disguised as .txt
    const checkLen = Math.min(buffer.length, 512);
    for (let i = 0; i < checkLen; i++) {
      if (buffer[i] === 0x00) {
        return false;
      }
    }
    return true;
  }

  return false;
};

/**
 * Clean and normalize extracted text:
 * - Unifies line endings to '\n'
 * - Strips non-printable ASCII control characters (preserving tab and newline)
 * - Removes pdf-parse page artifact markers (e.g., '-- 1 of 2 --')
 * - Normalizes excessive consecutive blank lines (> 2 newlines)
 *
 * @param {string} raw - Raw extracted string
 * @returns {string} Sanitized string
 */
export const normalizeExtractedText = (raw) => {
  if (!raw || typeof raw !== 'string') return '';

  return raw
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n?--\s*\d+\s+of\s+\d+\s*--\n?/gi, '\n') // Remove pdf-parse page markers
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Strip binary control characters
    .replace(/\n{3,}/g, '\n\n') // Collapse excessive blank lines
    .trim();
};

/**
 * Extract plain text and metadata from uploaded resume file
 *
 * @param {string} filePath - Absolute path to uploaded file on disk
 * @param {string} fileFormat - 'pdf', 'docx', or 'txt'
 * @returns {Promise<{ text: string, metadata: { pageCount: number, format: string, charCount: number, wordCount: number, isScanned: boolean } }>}
 */
export const extractResumeWithMetadata = async (filePath, fileFormat) => {
  if (!fs.existsSync(filePath)) {
    const err = new Error('Resume file does not exist on disk.');
    err.code = 'FILE_NOT_FOUND';
    err.statusCode = 404;
    throw err;
  }

  const fileBuffer = fs.readFileSync(filePath);
  const ext = (fileFormat || path.extname(filePath).slice(1)).toLowerCase();

  // 1. Verify Magic Bytes
  if (!validateFileSignature(fileBuffer, ext)) {
    const err = new Error(
      `Corrupted or invalid file content. The file does not match the expected ${ext.toUpperCase()} structure.`
    );
    err.code = 'CORRUPTED_FILE';
    err.statusCode = 400;
    throw err;
  }

  let rawText = '';
  let pageCount = 1;
  let isPasswordProtected = false;

  try {
    // 2. Extract according to file type
    if (ext === 'pdf') {
      // Check for raw /Encrypt dictionary marker in PDF buffer
      const bufferSnippet = fileBuffer.slice(0, Math.min(fileBuffer.length, 10000)).toString('latin1');
      const trailerSnippet = fileBuffer.slice(Math.max(0, fileBuffer.length - 10000)).toString('latin1');
      if (bufferSnippet.includes('/Encrypt') || trailerSnippet.includes('/Encrypt')) {
        // Potential encrypted PDF - verify during parse
        isPasswordProtected = true;
      }

      try {
        const parser = new PDFParse({ data: fileBuffer });
        const result = await parser.getText();
        
        pageCount = result?.total || (result?.pages?.length > 0 ? result.pages.length : 1);
        
        if (result?.pages && result.pages.length > 0) {
          rawText = result.pages.map((p) => p.text || '').join('\n\n');
        } else {
          rawText = result?.text || '';
        }
      } catch (pdfErr) {
        const errMsg = (pdfErr.message || '').toLowerCase();
        const errName = (pdfErr.name || '').toLowerCase();
        
        if (
          errName.includes('password') ||
          errMsg.includes('password') ||
          errMsg.includes('encrypt') ||
          errMsg.includes('decrypt') ||
          isPasswordProtected
        ) {
          const err = new Error(
            'Password-protected or encrypted PDF files are not supported. Please remove the password and re-upload.'
          );
          err.code = 'PASSWORD_PROTECTED';
          err.statusCode = 400;
          throw err;
        }

        const err = new Error(`Failed to parse PDF content: ${pdfErr.message}`);
        err.code = 'CORRUPTED_FILE';
        err.statusCode = 400;
        throw err;
      }
    } else if (ext === 'docx') {
      try {
        // Try mammoth markdown conversion first to preserve bullet points and lists
        const mdResult = await mammoth.convertToMarkdown({ path: filePath });
        if (mdResult?.value && mdResult.value.trim().length >= 20) {
          // Normalize markdown bullets to standard dashed lists
          rawText = mdResult.value
            .replace(/^(\s*)[*+]\s+/gm, '$1- ')
            .replace(/^#{1,6}\s+/gm, ''); // Strip leading markdown header hashes
        } else {
          // Fall back to raw text extraction
          const rawResult = await mammoth.extractRawText({ path: filePath });
          rawText = rawResult?.value || '';
        }
      } catch (docxErr) {
        const err = new Error(`Failed to parse DOCX content: ${docxErr.message}`);
        err.code = 'CORRUPTED_FILE';
        err.statusCode = 400;
        throw err;
      }
    } else if (ext === 'txt') {
      rawText = fileBuffer.toString('utf-8');
    } else {
      const err = new Error(`Unsupported file format '${ext}'. Allowed formats: PDF, DOCX, TXT.`);
      err.code = 'UNSUPPORTED_FILE_TYPE';
      err.statusCode = 400;
      throw err;
    }
  } catch (extractionError) {
    if (extractionError.statusCode) throw extractionError;
    const err = new Error(`Failed to parse ${ext.toUpperCase()} content: ${extractionError.message}`);
    err.code = 'CORRUPTED_FILE';
    err.statusCode = 400;
    throw err;
  }

  // 3. Normalize and sanitize text
  const cleanedText = normalizeExtractedText(rawText);

  // 4. Character validation & Scanned/Image-only PDF detection
  if (!cleanedText || cleanedText.length < 20) {
    if (ext === 'pdf' && pageCount >= 1) {
      const err = new Error(
        'Scanned or image-only PDF detected. Extracted text contains fewer than 20 readable characters. Please upload a PDF with selectable, machine-readable text or a Word document.'
      );
      err.code = 'SCANNED_OR_IMAGE_PDF';
      err.statusCode = 400;
      throw err;
    }

    const err = new Error(
      'Extracted resume text is too short (minimum 20 characters required). Please ensure your resume is not blank or corrupted.'
    );
    err.code = 'EMPTY_OR_CORRUPT_RESUME';
    err.statusCode = 400;
    throw err;
  }

  const wordCount = cleanedText.split(/\s+/).filter(Boolean).length;

  return {
    text: cleanedText,
    metadata: {
      pageCount,
      format: ext,
      charCount: cleanedText.length,
      wordCount,
      isScanned: false,
    },
  };
};

/**
 * Extract plain text from uploaded resume file (Backward-compatible string return)
 *
 * @param {string} filePath - Absolute path to uploaded file on disk
 * @param {string} fileFormat - 'pdf', 'docx', or 'txt'
 * @returns {Promise<string>} Cleaned extracted text
 */
export const extractResumeText = async (filePath, fileFormat) => {
  const result = await extractResumeWithMetadata(filePath, fileFormat);
  return result.text;
};

export default {
  validateFileSignature,
  normalizeExtractedText,
  extractResumeWithMetadata,
  extractResumeText,
};
