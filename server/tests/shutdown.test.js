import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { handleShutdown, _resetShutdownStateForTesting } from '../src/server.js';
import { connectDB, disconnectDB, getDatabaseState } from '../src/config/db.js';
import { config } from '../src/config/env.js';

describe('Suite 6: Graceful Shutdown Lifecycle & Deduplication', () => {
  const testUri = process.env.TEST_MONGODB_URI || config.testMongoUri;

  beforeEach(() => {
    _resetShutdownStateForTesting();
  });

  afterEach(async () => {
    _resetShutdownStateForTesting();
    await disconnectDB();
  });

  it('should disconnect database and invoke exit handler with code 0', async () => {
    // 1. Establish active connection first
    await connectDB(testUri);
    assert.equal(getDatabaseState().isConnected, true);

    let exitCode = null;
    const mockExit = (code) => {
      exitCode = code;
    };

    // 2. Trigger graceful shutdown
    const handled = await handleShutdown('SIGTERM', mockExit);

    assert.equal(handled, true, 'handleShutdown should execute successfully');
    assert.equal(exitCode, 0, 'Exit code should be 0');
    assert.equal(getDatabaseState().isConnected, false, 'Database should be disconnected');
  });

  it('should prevent duplicate shutdown execution when multiple signals are dispatched', async () => {
    await connectDB(testUri);

    let exitCount = 0;
    const mockExit = () => {
      exitCount++;
    };

    // First signal triggers shutdown
    const firstRun = await handleShutdown('SIGINT', mockExit);
    assert.equal(firstRun, true);
    assert.equal(exitCount, 1);

    // Second signal should be ignored
    const duplicateRun = await handleShutdown('SIGTERM', mockExit);
    assert.equal(duplicateRun, false, 'Duplicate shutdown should be ignored');
    assert.equal(exitCount, 1, 'Exit function should not be called again');
  });
});
