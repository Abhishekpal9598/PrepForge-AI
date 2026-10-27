import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  TOTAL_CHECKS_COUNT,
  CHECK_DEFINITIONS,
  getCheckById,
  getChecksByCategory,
  getAllChecks,
} from '../../src/services/resumeChecks/checkRegistry.js';
import { VALID_STATUSES, VALID_SEVERITIES } from '../../src/services/resumeChecks/utils/resultFormatter.js';

describe('Suite: 27-Point Check Registry & Metadata Verification', () => {
  it('1. Registry contains exactly 27 checks', () => {
    assert.equal(TOTAL_CHECKS_COUNT, 27);
    assert.equal(CHECK_DEFINITIONS.length, 27);
    assert.equal(getAllChecks().length, 27);
  });

  it('2. Every check ID is unique and follows CHK-01 through CHK-27 pattern', () => {
    const ids = new Set();
    const idPattern = /^CHK-(?:0[1-9]|1[0-9]|2[0-7])$/;

    for (const def of CHECK_DEFINITIONS) {
      assert.ok(idPattern.test(def.id), `Invalid check ID format: ${def.id}`);
      assert.ok(!ids.has(def.id), `Duplicate check ID found: ${def.id}`);
      ids.add(def.id);
    }

    assert.equal(ids.size, 27);
  });

  it('3. Every check belongs to one of the 7 valid categories', () => {
    const validCategories = new Set([
      'CAT-01',
      'CAT-02',
      'CAT-03',
      'CAT-04',
      'CAT-05',
      'CAT-06',
      'CAT-07',
    ]);

    for (const def of CHECK_DEFINITIONS) {
      assert.ok(validCategories.has(def.categoryId), `Invalid category ID: ${def.categoryId} in ${def.id}`);
      assert.ok(typeof def.categoryName === 'string' && def.categoryName.length > 0);
    }
  });

  it('4. Category distribution matches approved specification', () => {
    assert.equal(getChecksByCategory('CAT-01').length, 6, 'Category 1 should have 6 checks');
    assert.equal(getChecksByCategory('CAT-02').length, 3, 'Category 2 should have 3 checks');
    assert.equal(getChecksByCategory('CAT-03').length, 5, 'Category 3 should have 5 checks');
    assert.equal(getChecksByCategory('CAT-04').length, 4, 'Category 4 should have 4 checks');
    assert.equal(getChecksByCategory('CAT-05').length, 4, 'Category 5 should have 4 checks');
    assert.equal(getChecksByCategory('CAT-06').length, 2, 'Category 6 should have 2 checks');
    assert.equal(getChecksByCategory('CAT-07').length, 3, 'Category 7 should have 3 checks');
  });

  it('5. Every check has a valid executable handler function', () => {
    for (const def of CHECK_DEFINITIONS) {
      assert.equal(typeof def.handler, 'function', `Handler for ${def.id} must be a function`);
      assert.ok(VALID_SEVERITIES.includes(def.defaultSeverity), `Invalid default severity: ${def.defaultSeverity} in ${def.id}`);
    }
  });

  it('6. getCheckById retrieves exact check definitions case-insensitively', () => {
    const chk01 = getCheckById('chk-01');
    assert.ok(chk01);
    assert.equal(chk01.id, 'CHK-01');
    assert.equal(chk01.categoryId, 'CAT-01');

    const chk27 = getCheckById('CHK-27');
    assert.ok(chk27);
    assert.equal(chk27.id, 'CHK-27');

    const invalid = getCheckById('CHK-99');
    assert.equal(invalid, null);
  });
});
