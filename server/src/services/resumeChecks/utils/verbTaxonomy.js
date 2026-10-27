/**
 * PrepForge AI — Action Verb & Duty Phrase Taxonomy
 *
 * Provides authoritative lists of high-impact action verbs and weak/passive duty phrases
 * for evaluating resume bullet point assertiveness and leadership impact.
 */

export const STRONG_ACTION_VERBS = new Set([
  // Leadership & Direction
  'orchestrated', 'spearheaded', 'championed', 'directed', 'steered', 'governed',
  'mobilized', 'navigated', 'overhauled', 'piloted', 'pioneered', 'restructured',
  'empowered', 'mentored', 'advised', 'coached', 'fostered', 'cultivated',

  // Architecture & Engineering
  'architected', 'engineered', 'designed', 'developed', 'built', 'constructed',
  'implemented', 'deployed', 'migrated', 'automated', 'integrated', 'refactored',
  'configured', 'installed', 'programmed', 'containerized', 'provisioned', 'standardized',

  // Optimization & Performance
  'optimized', 'accelerated', 'streamlined', 'maximized', 'enhanced', 'boosted',
  'scaled', 'amplified', 'augmented', 'consolidated', 'modernized', 'upgraded',
  'curtailed', 'mitigated', 'reduced', 'eliminated', 'debugged', 'resolved',

  // Execution & Delivery
  'delivered', 'executed', 'launched', 'produced', 'published', 'established',
  'formulated', 'generated', 'initiated', 'instituted', 'introduced', 'originated',
  'authored', 'devised', 'penned', 'drafted', 'crafted', 'created',

  // Analysis & Strategy
  'analyzed', 'evaluated', 'assessed', 'audited', 'benchmarked', 'diagnosed',
  'discovered', 'identified', 'modeled', 'quantified', 'scrutinized', 'surveyed',
  'synthesized', 'uncovered', 'forecasted', 'validated', 'tested', 'inspected',

  // Collaboration & Operations
  'negotiated', 'partnered', 'collaborated', 'facilitated', 'liaised', 'secured',
  'acquired', 'maintained', 'administered', 'coordinated', 'aligned', 'unified',
]);

export const PASSIVE_DUTY_PATTERNS = [
  /^(?:responsible\s+for)\b/i,
  /^(?:was\s+responsible\s+for)\b/i,
  /^(?:assisted\s+(?:with|in))\b/i,
  /^(?:helped\s+(?:with|to))\b/i,
  /^(?:worked\s+(?:on|with))\b/i,
  /^(?:duties\s+included)\b/i,
  /^(?:tasked\s+with)\b/i,
  /^(?:handled\s+(?:the|daily))\b/i,
  /^(?:involved\s+in)\b/i,
  /^(?:participated\s+in)\b/i,
  /^(?:served\s+as)\b/i,
  /^(?:part\s+of\s+a\s+team\s+that)\b/i,
];

/**
 * Extracts the starting head verb or initial tokens of a bullet point
 *
 * @param {string} bullet
 * @returns {{ startingToken: string, isPassive: boolean, matchedPassivePhrase: string|null, isStrongVerb: boolean }}
 */
export const analyzeBulletVerb = (bullet) => {
  if (!bullet || typeof bullet !== 'string') {
    return {
      startingToken: '',
      isPassive: false,
      matchedPassivePhrase: null,
      isStrongVerb: false,
    };
  }

  const trimmed = bullet.replace(/^[\s•\-\*\u2022\u25E6\u2043\u2219\d\.\)\:]+/, '').trim();
  const lower = trimmed.toLowerCase();

  // Check for passive duty phrases
  for (const pattern of PASSIVE_DUTY_PATTERNS) {
    const match = lower.match(pattern);
    if (match) {
      return {
        startingToken: match[0],
        isPassive: true,
        matchedPassivePhrase: match[0],
        isStrongVerb: false,
      };
    }
  }

  // Extract first word
  const firstWordMatch = lower.match(/^[a-z]+/);
  const firstWord = firstWordMatch ? firstWordMatch[0] : '';
  const isStrong = STRONG_ACTION_VERBS.has(firstWord);

  return {
    startingToken: firstWord,
    isPassive: false,
    matchedPassivePhrase: null,
    isStrongVerb: isStrong,
  };
};

export default {
  STRONG_ACTION_VERBS,
  PASSIVE_DUTY_PATTERNS,
  analyzeBulletVerb,
};
