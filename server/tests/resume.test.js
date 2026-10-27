import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import app from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { config } from '../src/config/env.js';
import { User } from '../src/models/User.js';
import { Resume } from '../src/models/Resume.js';
import { UPLOAD_DIR } from '../src/middleware/uploadMiddleware.js';

describe('Suite: Resume Management & CRUD API Endpoints', () => {
  let server = null;
  let baseUrl = '';
  const testUri = process.env.TEST_MONGODB_URI || config.testMongoUri;

  // Test User A
  const userA = {
    fullName: 'Candidate Alpha',
    email: `alpha-${Date.now()}@resumetest.local`,
    password: 'SecurePassword123!',
    targetRole: 'Full Stack Engineer',
  };

  // Test User B (for cross-user isolation testing)
  const userB = {
    fullName: 'Candidate Beta',
    email: `beta-${Date.now()}@resumetest.local`,
    password: 'SecurePassword123!',
    targetRole: 'DevOps Engineer',
  };

  let tokenA = '';
  let tokenB = '';
  let resumeIdA = '';

  // Minimal valid PDF with readable text (> 20 chars)
  const validPdfBuffer = Buffer.from(
    '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length 78 >>\nstream\nBT /F1 12 Tf 72 712 Td (Alex Mercer - Senior Software Engineer with Node.js and React expertise) Tj ET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000214 00000 n \ntrailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n342\n%%EOF'
  );

  // Helper to build a minimal valid DOCX zip buffer
  const createValidDocxBuffer = () => {
    const crc32 = (buf) => {
      let crc = ~0;
      for (let i = 0; i < buf.length; i++) {
        crc ^= buf[i];
        for (let j = 0; j < 8; j++) {
          crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
        }
      }
      return ~crc >>> 0;
    };

    const filename = Buffer.from('word/document.xml');
    const xmlContent = Buffer.from(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
      '<w:body><w:p><w:r><w:t>Morgan Vance - Staff Platform Engineer with 8 years building distributed systems.</w:t></w:r></w:p></w:body>' +
      '</w:document>'
    );
    const crc = crc32(xmlContent);

    // Local file header (30 bytes + filename length)
    const lfh = Buffer.alloc(30);
    lfh.writeUInt32LE(0x04034b50, 0);
    lfh.writeUInt16LE(20, 4);
    lfh.writeUInt16LE(0, 6);
    lfh.writeUInt16LE(0, 8); // stored
    lfh.writeUInt16LE(0, 10);
    lfh.writeUInt16LE(0, 12);
    lfh.writeUInt32LE(crc, 14);
    lfh.writeUInt32LE(xmlContent.length, 18);
    lfh.writeUInt32LE(xmlContent.length, 22);
    lfh.writeUInt16LE(filename.length, 26);
    lfh.writeUInt16LE(0, 28);

    // Central Directory header
    const cdfh = Buffer.alloc(46);
    cdfh.writeUInt32LE(0x02014b50, 0);
    cdfh.writeUInt16LE(20, 4);
    cdfh.writeUInt16LE(20, 6);
    cdfh.writeUInt16LE(0, 8);
    cdfh.writeUInt16LE(0, 10);
    cdfh.writeUInt16LE(0, 12);
    cdfh.writeUInt32LE(crc, 16);
    cdfh.writeUInt32LE(xmlContent.length, 20);
    cdfh.writeUInt32LE(xmlContent.length, 24);
    cdfh.writeUInt16LE(filename.length, 28);
    cdfh.writeUInt16LE(0, 30);
    cdfh.writeUInt16LE(0, 32);
    cdfh.writeUInt16LE(0, 34);
    cdfh.writeUInt16LE(0, 36);
    cdfh.writeUInt32LE(0, 38);
    cdfh.writeUInt32LE(0, 42); // offset of LFH

    const cdOffset = lfh.length + filename.length + xmlContent.length;
    const cdSize = cdfh.length + filename.length;
    const eocd = Buffer.alloc(22);
    eocd.writeUInt32LE(0x06054b50, 0);
    eocd.writeUInt16LE(0, 4);
    eocd.writeUInt16LE(0, 6);
    eocd.writeUInt16LE(1, 8);
    eocd.writeUInt16LE(1, 10);
    eocd.writeUInt32LE(cdSize, 12);
    eocd.writeUInt32LE(cdOffset, 16);
    eocd.writeUInt16LE(0, 20);

    return Buffer.concat([lfh, filename, xmlContent, cdfh, filename, eocd]);
  };

  before(async () => {
    await connectDB(testUri);
    await User.deleteMany({ email: { $regex: /@prepforge\.ai$/i } });
    await Resume.deleteMany({});

    // Start ephemeral server
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });

    // Register User A
    const resA = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userA),
    });
    const dataA = await resA.json();
    tokenA = dataA.token;

    // Register User B
    const resB = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userB),
    });
    const dataB = await resB.json();
    tokenB = dataB.token;
  });

  after(async () => {
    await User.deleteMany({ email: { $regex: /@prepforge\.ai$/i } });
    await Resume.deleteMany({});
    await disconnectDB();
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it('1. Upload valid PDF creates Resume document and extracts text', async () => {
    const fd = new FormData();
    const pdfBlob = new Blob([validPdfBuffer], { type: 'application/pdf' });
    fd.append('resume', pdfBlob, 'alex_mercer_resume.pdf');

    const res = await fetch(`${baseUrl}/api/v1/resumes`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: fd,
    });

    assert.equal(res.status, 201, 'Should return HTTP 201 Created');
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.resume.id, 'Should return created resume id');
    assert.equal(data.resume.originalFileName, 'alex_mercer_resume.pdf');
    assert.equal(data.resume.fileType, 'pdf');
    assert.ok(data.resume.extractedText.includes('Alex Mercer'), 'Should extract candidate text');

    // Store for subsequent tests
    resumeIdA = data.resume.id;

    // Verify MongoDB document
    const savedDoc = await Resume.findById(resumeIdA);
    assert.ok(savedDoc, 'Resume document must exist in MongoDB');
    assert.equal(savedDoc.originalFileName, 'alex_mercer_resume.pdf');
    assert.ok(savedDoc.storedFileName, 'Must have storedFileName');
  });

  it('2. Upload valid DOCX creates Resume document and extracts text', async () => {
    const docxBuffer = createValidDocxBuffer();
    const fd = new FormData();
    const docxBlob = new Blob([docxBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    fd.append('resume', docxBlob, 'morgan_vance.docx');

    const res = await fetch(`${baseUrl}/api/v1/resumes`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: fd,
    });

    assert.equal(res.status, 201, 'Should return HTTP 201 Created');
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.resume.originalFileName, 'morgan_vance.docx');
    assert.equal(data.resume.fileType, 'docx');
    assert.ok(data.resume.extractedText.includes('Morgan Vance'), 'Should extract text from docx');
  });

  it('3. Reject unsupported extensions (.exe / .sh / .png)', async () => {
    const fd = new FormData();
    const exeBlob = new Blob(['MZ\x90\x00\x03\x00\x00\x00 malicious binary payload'], {
      type: 'application/x-msdownload',
    });
    fd.append('resume', exeBlob, 'malware.exe');

    const res = await fetch(`${baseUrl}/api/v1/resumes`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: fd,
    });

    assert.equal(res.status, 400, 'Should return HTTP 400 Bad Request');
    const data = await res.json();
    assert.equal(data.success, false);
    assert.ok(data.message.includes('Unsupported file type'), 'Should return clear unsupported message');
  });

  it('4. Reject oversized files (> 5MB)', async () => {
    // 5.5 MB dummy buffer
    const oversizedBuffer = Buffer.alloc(5.5 * 1024 * 1024, 0x41);
    const fd = new FormData();
    const blob = new Blob([oversizedBuffer], { type: 'application/pdf' });
    fd.append('resume', blob, 'oversized.pdf');

    const res = await fetch(`${baseUrl}/api/v1/resumes`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: fd,
    });

    assert.equal(res.status, 400, 'Should return HTTP 400 Bad Request');
    const data = await res.json();
    assert.equal(data.success, false);
    assert.ok(
      data.message.includes('5MB') || data.code === 'FILE_TOO_LARGE',
      'Should report 5MB limit'
    );
  });

  it('5. Reject corrupted files (invalid header / unparseable content)', async () => {
    const corruptedBuffer = Buffer.from('NOT_A_REAL_PDF_JUST_RANDOM_TEXT_WITH_PDF_EXTENSION');
    const fd = new FormData();
    const blob = new Blob([corruptedBuffer], { type: 'application/pdf' });
    fd.append('resume', blob, 'corrupted.pdf');

    const res = await fetch(`${baseUrl}/api/v1/resumes`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: fd,
    });

    assert.equal(res.status, 400, 'Should return HTTP 400 Bad Request');
    const data = await res.json();
    assert.equal(data.success, false);
    assert.ok(
      data.code === 'CORRUPTED_FILE' || data.message.includes('Corrupted or invalid'),
      'Should reject corrupted content'
    );
  });

  it('6. Reject unauthenticated requests with HTTP 401', async () => {
    const res = await fetch(`${baseUrl}/api/v1/resumes`);
    assert.equal(res.status, 401, 'Should return HTTP 401 Unauthorized');
    const data = await res.json();
    assert.equal(data.success, false);
  });

  it('7. Prevent cross-user access (User B cannot view or delete User A resume)', async () => {
    // User B attempts to GET User A's resume
    const getRes = await fetch(`${baseUrl}/api/v1/resumes/${resumeIdA}`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    assert.equal(getRes.status, 404, 'User B must not be able to retrieve User A resume');

    // User B attempts to DELETE User A's resume
    const delRes = await fetch(`${baseUrl}/api/v1/resumes/${resumeIdA}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    assert.equal(delRes.status, 404, 'User B must not be able to delete User A resume');

    // Confirm User A resume still exists in MongoDB
    const checkDoc = await Resume.findById(resumeIdA);
    assert.ok(checkDoc, 'User A resume must remain intact');
  });

  it('8. GET /api/v1/resumes returns user-scoped list with pagination', async () => {
    const res = await fetch(`${baseUrl}/api/v1/resumes?page=1&limit=10`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });

    assert.equal(res.status, 200, 'Should return HTTP 200 OK');
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(Array.isArray(data.data), 'data must be an array');
    assert.equal(data.total, 2, 'User A should have 2 resumes uploaded');
    assert.equal(data.page, 1);
    assert.ok(data.totalPages >= 1);
    assert.ok(data.data[0].textPreview, 'Should include textPreview snippet');
  });

  it('9. GET /api/v1/resumes/:id retrieves specific resume with full extractedText', async () => {
    const res = await fetch(`${baseUrl}/api/v1/resumes/${resumeIdA}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });

    assert.equal(res.status, 200, 'Should return HTTP 200 OK');
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.resume.id, resumeIdA);
    assert.ok(data.resume.extractedText.includes('Alex Mercer'), 'Must return full extractedText');
    assert.equal(data.resume.path, undefined, 'Must NEVER expose server file system paths');
  });

  it('10. DELETE /api/v1/resumes/:id deletes resume from database and disk', async () => {
    // Find storedFileName before deleting to verify disk cleanup
    const docBefore = await Resume.findById(resumeIdA);
    const diskPath = path.join(UPLOAD_DIR, docBefore.storedFileName);

    const delRes = await fetch(`${baseUrl}/api/v1/resumes/${resumeIdA}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenA}` },
    });

    assert.equal(delRes.status, 200, 'Should return HTTP 200 OK');
    const data = await delRes.json();
    assert.equal(data.success, true);

    // Verify MongoDB document deleted
    const docAfter = await Resume.findById(resumeIdA);
    assert.equal(docAfter, null, 'Document must be removed from MongoDB');

    // Verify file deleted from disk
    assert.equal(fs.existsSync(diskPath), false, 'File must be unlinked from storage disk');
  });

  it('11. Reject invalid MongoDB ObjectId format with HTTP 400', async () => {
    const res = await fetch(`${baseUrl}/api/v1/resumes/invalid-non-objectid-123`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });

    assert.equal(res.status, 400, 'Should return HTTP 400 Bad Request');
    const data = await res.json();
    assert.equal(data.code, 'INVALID_ID');
  });
});
