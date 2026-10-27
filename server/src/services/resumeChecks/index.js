/**
 * PrepForge AI — Advanced Resume Checking Engine (Master Facade)
 *
 * Public entry point for all 27 checks, runner orchestration, registry,
 * and formatting utilities.
 */

export * from './checkRegistry.js';
export * from './checkRunner.js';
export * from './utils/resultFormatter.js';
export * from './utils/clicheDictionary.js';
export * from './utils/verbTaxonomy.js';
export * from './utils/spellingDictionary.js';

import registry from './checkRegistry.js';
import runner from './checkRunner.js';
import formatter from './utils/resultFormatter.js';

export default {
  ...registry,
  ...runner,
  ...formatter,
};
