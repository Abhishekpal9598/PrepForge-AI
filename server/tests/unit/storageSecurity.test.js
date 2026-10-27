import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import {
  resolveSafeLocalPath,
  safeUnlink,
  StorageService,
  LOCAL_UPLOAD_DIR,
} from '../../src/services/storageService.js';

describe('Suite: Storage Security & Path Traversal Prevention', () => {
  it('TC-STOR-01: Correctly resolves valid filenames within LOCAL_UPLOAD_DIR', () => {
    const filename = 'resume-abc-123.pdf';
    const resolved = resolveSafeLocalPath(filename);
    assert.equal(resolved, path.resolve(LOCAL_UPLOAD_DIR, filename));
    assert.ok(resolved.startsWith(LOCAL_UPLOAD_DIR));
  });

  it('TC-STOR-02: Isolates path traversal strings using basename to prevent directory climbing', () => {
    // Attempting ../../etc/passwd should resolve to LOCAL_UPLOAD_DIR/passwd
    const attack1 = '../../etc/passwd';
    const resolved = resolveSafeLocalPath(attack1);
    assert.equal(resolved, path.resolve(LOCAL_UPLOAD_DIR, 'passwd'));
    assert.ok(resolved.startsWith(LOCAL_UPLOAD_DIR));
  });

  it('TC-STOR-03: Strictly rejects non-string or empty filename inputs', () => {
    assert.throws(
      () => resolveSafeLocalPath(''),
      (err) => {
        assert.ok(err.message.includes('Invalid file name'));
        return true;
      }
    );

    assert.throws(
      () => resolveSafeLocalPath(null),
      (err) => {
        assert.ok(err.message.includes('Invalid file name'));
        return true;
      }
    );

    assert.throws(
      () => resolveSafeLocalPath(undefined),
      (err) => {
        assert.ok(err.message.includes('Invalid file name'));
        return true;
      }
    );
  });

  it('TC-STOR-04: safeUnlink safely handles missing or non-existent files without throwing', () => {
    assert.doesNotThrow(() => {
      safeUnlink('non-existent-file-xyz.pdf');
      safeUnlink(null);
      safeUnlink(undefined);
    });
  });

  it('TC-STOR-05: StorageService.getStorageStatus provides diagnostics without leaking credentials', () => {
    const status = StorageService.getStorageStatus();
    assert.ok(status.activeType === 'local' || status.activeType === 's3');
    assert.ok(typeof status.isLocalWritable === 'boolean');
    assert.ok(status.localDirectory.includes('resumes'));
    assert.equal(typeof status.s3Configured, 'boolean');
    // Ensure no raw secret access keys appear in status
    assert.equal(status.s3SecretAccessKey, undefined);
  });
});
