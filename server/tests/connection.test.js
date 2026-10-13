import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { connectDB, disconnectDB, getDatabaseState, sanitizeMongoUri } from '../src/config/db.js';
import { config } from '../src/config/env.js';

describe('Suite 3: MongoDB Connection & Lifecycle', () => {
  const testUri = process.env.TEST_MONGODB_URI || config.testMongoUri;

  before(async () => {
    // Ensure starting from disconnected state
    await disconnectDB();
  });

  after(async () => {
    await disconnectDB();
  });

  it('should sanitize credentials in mongo URIs', () => {
    const raw = 'mongodb://myUser:secretPassword123@cluster0.mongodb.net/ai_prep';
    const sanitized = sanitizeMongoUri(raw);
    assert.ok(!sanitized.includes('secretPassword123'), 'Password must be masked');
    assert.ok(!sanitized.includes('myUser'), 'Username must be masked');
    assert.equal(sanitized, 'mongodb://***:***@cluster0.mongodb.net/ai_prep');
  });

  it('should reject when TEST_MONGODB_URI matches development or production MONGODB_URI', () => {
    const mainUri = config.mongoUri;
    assert.ok(testUri, 'TEST_MONGODB_URI must be configured for integration testing');
    assert.notEqual(
      testUri,
      mainUri,
      'TEST_MONGODB_URI must be distinct from development/production MONGODB_URI'
    );
  });

  it('should distinguish malformed URI errors immediately', async () => {
    const malformedUri = 'not_a_valid_protocol://invalid-format';
    await assert.rejects(
      async () => {
        await connectDB(malformedUri);
      },
      (err) => {
        assert.ok(
          err.name === 'MongoParseError' ||
            err.message.includes('Invalid scheme') ||
            err.message.includes('protocol') ||
            err.message.includes('must begin with'),
          `Expected parsing error for malformed URI, got: ${err.message}`
        );
        return true;
      }
    );
  });

  it('should connect successfully to TEST_MONGODB_URI and report state', async () => {
    await connectDB(testUri);
    const state = getDatabaseState();

    assert.equal(state.isConnected, true, 'Database should report isConnected = true');
    assert.equal(state.readyState, 1, 'readyState should be 1 (connected)');
    assert.equal(state.status, 'connected');
    assert.ok(state.host, 'Host should be populated');
  });

  it('should disconnect cleanly and report disconnected state', async () => {
    await disconnectDB();
    const state = getDatabaseState();

    assert.equal(state.isConnected, false, 'Database should report isConnected = false');
    assert.equal(state.readyState, 0, 'readyState should be 0 (disconnected)');
    assert.equal(state.status, 'disconnected');
  });
});
