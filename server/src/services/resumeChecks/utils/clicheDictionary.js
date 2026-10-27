/**
 * PrepForge AI — Cliché & Buzzword Dictionary
 *
 * Exhaustive catalog of overused corporate jargon and empty clichés.
 */

export const RESUME_CLICHES = [
  'synergy',
  'rockstar',
  'ninja',
  'guru',
  'wizard',
  'go-getter',
  'go getter',
  'hardworker',
  'hard-working',
  'hard working',
  'team player',
  'results-driven',
  'results driven',
  'think outside the box',
  'thinking outside the box',
  'self-starter',
  'self starter',
  'fast learner',
  'quick learner',
  'dynamic',
  'passionate',
  'strategic thinker',
  'detail-oriented',
  'detail oriented',
  'proactive',
  'highly motivated',
  'innovative thinker',
  'hit the ground running',
  'wear many hats',
  'thought leader',
];

/**
 * Searches text for clichés and buzzwords
 *
 * @param {string} text
 * @returns {Array<{ word: string, count: number }>}
 */
export const findCliches = (text) => {
  if (!text || typeof text !== 'string') return [];

  const lower = text.toLowerCase();
  const matches = [];

  for (const cliche of RESUME_CLICHES) {
    const escaped = cliche.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
    const count = (lower.match(regex) || []).length;
    if (count > 0) {
      matches.push({ word: cliche, count });
    }
  }

  return matches;
};

export default {
  RESUME_CLICHES,
  findCliches,
};
