import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  validateFileSignature,
  normalizeExtractedText,
  extractResumeText,
  extractResumeWithMetadata,
} from '../../src/utils/textExtractor.js';

describe('Suite: Advanced Document Parser & Text Extractor', () => {
  // Test PDF Buffer
  const validPdfBuffer = Buffer.from(
    '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length 78 >>\nstream\nBT /F1 12 Tf 72 712 Td (Jordan Hayes - Principal Cloud Architect with Kubernetes and Terraform experience) Tj ET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000214 00000 n \ntrailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n342\n%%EOF'
  );

  it('1. validateFileSignature correctly identifies PDF, DOCX, and TXT magic bytes', () => {
    // Valid PDF (%PDF-)
    assert.equal(validateFileSignature(Buffer.from('%PDF-1.7...'), 'pdf'), true);
    assert.equal(validateFileSignature(Buffer.from('NOT_PDF'), 'pdf'), false);

    // Valid DOCX (PK\x03\x04)
    assert.equal(validateFileSignature(Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00]), 'docx'), true);
    assert.equal(validateFileSignature(Buffer.from([0x00, 0x00, 0x00, 0x00]), 'docx'), false);

    // Valid TXT (UTF-8 text without null bytes)
    assert.equal(validateFileSignature(Buffer.from('Clean plain text resume'), 'txt'), true);
    assert.equal(validateFileSignature(Buffer.from([0x48, 0x65, 0x00, 0x6c]), 'txt'), false);

    // Short buffer boundary
    assert.equal(validateFileSignature(Buffer.from('ab'), 'pdf'), false);
    assert.equal(validateFileSignature(null, 'pdf'), false);
  });

  it('2. normalizeExtractedText strips control chars and pdf-parse page artifact markers', () => {
    const rawWithArtifacts =
      'Header Line\r\n-- 1 of 3 --\r\nMiddle Line with \x00null and \x07bell\n\n\n\nFooter Line\r\n-- 2 of 3 --';
    const cleaned = normalizeExtractedText(rawWithArtifacts);

    assert.ok(!cleaned.includes('-- 1 of 3 --'), 'Must strip page number markers');
    assert.ok(!cleaned.includes('-- 2 of 3 --'), 'Must strip page number markers');
    assert.ok(!cleaned.includes('\x00'), 'Must remove null control char');
    assert.ok(!cleaned.includes('\x07'), 'Must remove bell control char');
    assert.ok(cleaned.includes('Header Line'));
    assert.ok(cleaned.includes('Middle Line with null and bell'));
    assert.ok(cleaned.includes('Footer Line'));
  });

  it('3. extractResumeWithMetadata successfully parses valid PDF and populates metadata', async () => {
    const tmpPath = path.join(os.tmpdir(), `test_valid_${Date.now()}.pdf`);
    fs.writeFileSync(tmpPath, validPdfBuffer);

    try {
      const result = await extractResumeWithMetadata(tmpPath, 'pdf');
      assert.ok(result.text.includes('Jordan Hayes'), 'Must extract candidate name');
      assert.ok(result.metadata.pageCount >= 1, 'Must report at least 1 page');
      assert.equal(result.metadata.format, 'pdf');
      assert.ok(result.metadata.charCount >= 20, 'Character count must be >= 20');
      assert.ok(result.metadata.wordCount > 5, 'Word count must be positive');

      // Also verify backward-compatible extractResumeText returns string
      const strText = await extractResumeText(tmpPath, 'pdf');
      assert.equal(typeof strText, 'string');
      assert.ok(strText.includes('Jordan Hayes'));
    } finally {
      if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    }
  });

  it('4. extractResumeWithMetadata rejects corrupted or header-mismatched files with CORRUPTED_FILE', async () => {
    const tmpPath = path.join(os.tmpdir(), `test_corrupt_${Date.now()}.pdf`);
    fs.writeFileSync(tmpPath, Buffer.from('THIS_IS_DEFINITELY_NOT_A_PDF_FILE'));

    try {
      await assert.rejects(
        async () => {
          await extractResumeWithMetadata(tmpPath, 'pdf');
        },
        (err) => {
          assert.equal(err.code, 'CORRUPTED_FILE');
          assert.equal(err.statusCode, 400);
          return true;
        }
      );
    } finally {
      if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    }
  });

  it('5. extractResumeWithMetadata rejects image-only or scanned PDF (< 20 chars) with SCANNED_OR_IMAGE_PDF', async () => {
    // PDF that is syntactically valid with pages but has zero text
    const emptyPdfBuffer = Buffer.from(
      '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n185\n%%EOF'
    );

    const tmpPath = path.join(os.tmpdir(), `test_scanned_${Date.now()}.pdf`);
    fs.writeFileSync(tmpPath, emptyPdfBuffer);

    try {
      await assert.rejects(
        async () => {
          await extractResumeWithMetadata(tmpPath, 'pdf');
        },
        (err) => {
          assert.equal(err.code, 'SCANNED_OR_IMAGE_PDF');
          assert.equal(err.statusCode, 400);
          assert.ok(err.message.includes('Scanned or image-only PDF detected'));
          return true;
        }
      );
    } finally {
      if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    }
  });

  it('6. extractResumeWithMetadata rejects password-protected PDFs with PASSWORD_PROTECTED', async () => {
    // PDF buffer containing an /Encrypt object
    const encryptedPdfBuffer = Buffer.from(
      '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\n4 0 obj\n<< /Filter /Standard /V 2 /R 3 /O (password) /U (user) /P -4 >>\nendobj\ntrailer\n<< /Size 5 /Root 1 0 R /Encrypt 4 0 R >>\nstartxref\n250\n%%EOF'
    );

    const tmpPath = path.join(os.tmpdir(), `test_pw_${Date.now()}.pdf`);
    fs.writeFileSync(tmpPath, encryptedPdfBuffer);

    try {
      await assert.rejects(
        async () => {
          await extractResumeWithMetadata(tmpPath, 'pdf');
        },
        (err) => {
          assert.equal(err.code, 'PASSWORD_PROTECTED');
          assert.equal(err.statusCode, 400);
          assert.ok(err.message.includes('Password-protected'));
          return true;
        }
      );
    } finally {
      if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    }
  });

  it('7. extractResumeWithMetadata rejects missing files on disk with FILE_NOT_FOUND', async () => {
    await assert.rejects(
      async () => {
        await extractResumeWithMetadata('C:\\non_existent_resume_file.pdf', 'pdf');
      },
      (err) => {
        assert.equal(err.code, 'FILE_NOT_FOUND');
        assert.equal(err.statusCode, 404);
        return true;
      }
    );
  });
});
