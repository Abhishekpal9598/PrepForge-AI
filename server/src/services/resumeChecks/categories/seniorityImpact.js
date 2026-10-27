/**
 * PrepForge AI — Category 7: Seniority and Impact Checks (CHK-25 through CHK-27)
 *
 * Evaluates upward career progression, skills demonstration in work bullets,
 * and leadership/technical ownership marks.
 */

import { formatCheckResult } from '../utils/resultFormatter.js';
import { collectExperienceBullets } from './resumeContent.js';

const SENIORITY_TIERS = {
  intern: 1,
  junior: 2,
  associate: 2,
  mid: 3,
  engineer: 3,
  developer: 3,
  senior: 4,
  lead: 5,
  staff: 6,
  principal: 7,
  architect: 7,
  manager: 6,
  director: 8,
  head: 8,
  vp: 9,
  chief: 10,
  cto: 10,
};

const LEADERSHIP_MARKERS = [
  'mentored', 'mentoring', 'coached', 'trained', 'architected', 'system design',
  'spearheaded', 'directed', 'championed', 'established best practices', 'led cross-functional',
  'cross-functional alignment', 'hired', 'interviewed', 'scaled the team', 'code reviews',
  'technical roadmap', 'stakeholder management', 'governed',
];

/**
 * CHK-25: Career Progression Trajectory
 */
export const checkCareerProgression = (resumeData) => {
  const checkId = 'CHK-25';
  const categoryId = 'CAT-07';
  const title = 'Career Progression Trajectory';
  const description = 'Evaluate upward trajectory in role responsibility, technical scope, and title hierarchy.';

  const experience = resumeData?.parsedSections?.structured?.experience || [];

  if (experience.length < 2) {
    return formatCheckResult({
      checkId,
      categoryId,
      title,
      status: 'PASS',
      severity: 'info',
      description,
      evidence: [`${experience.length} work role(s) on file`],
      explanation: 'Sufficient historical roles needed for longitudinal progression analysis.',
      recommendation: null,
      confidence: 0.8,
      limitations: ['Requires multiple historical roles for trend modeling.'],
      source: 'deterministic',
    });
  }

  // Titles listed in reverse chronological order (index 0 is most recent)
  const roleTiers = experience.map((exp) => {
    const titleLower = (exp.title || '').toLowerCase();
    let maxTier = 3; // default mid-level
    for (const [kw, tier] of Object.entries(SENIORITY_TIERS)) {
      if (new RegExp(`\\b${kw}\\b`, 'i').test(titleLower)) {
        if (tier > maxTier || maxTier === 3) maxTier = tier;
      }
    }
    return { title: exp.title || 'Role', tier: maxTier };
  });

  // Recent role tier should be >= earlier role tier
  const mostRecent = roleTiers[0];
  const oldest = roleTiers[roleTiers.length - 1];

  if (mostRecent.tier < oldest.tier && oldest.tier >= 4) {
    return formatCheckResult({
      checkId,
      categoryId,
      title,
      status: 'WARNING',
      severity: 'medium',
      description,
      evidence: [`Most recent: '${mostRecent.title}' (Tier ${mostRecent.tier})`, `Earlier: '${oldest.title}' (Tier ${oldest.tier})`],
      explanation: `Title hierarchy indicates a lateral or downward shift from '${oldest.title}' to '${mostRecent.title}'. Recruiters may question career momentum.`,
      recommendation: 'Emphasize increased scope of impact, system ownership, and technical leadership in your recent role bullets.',
      confidence: 0.8,
      limitations: ['Title conventions differ across corporate structures.'],
      source: 'deterministic',
    });
  }

  return formatCheckResult({
    checkId,
    categoryId,
    title,
    status: 'PASS',
    severity: 'info',
    description,
    evidence: [`Progression: ${roleTiers.map((r) => r.title).reverse().join(' -> ')}`],
    explanation: 'Career history demonstrates healthy upward or stable progression in responsibility.',
    recommendation: null,
    confidence: 0.85,
    limitations: [],
    source: 'deterministic',
  });
};

/**
 * CHK-26: Skills Demonstration Context
 */
export const checkSkillsDemonstrationContext = (resumeData) => {
  const checkId = 'CHK-26';
  const categoryId = 'CAT-07';
  const title = 'Skills Demonstration Context';
  const description = 'Verify that skills listed in the Skills section are actively demonstrated in experience bullets.';

  const rawSkills = resumeData?.parsedSections?.structured?.skills;
  const skillsList = [];

  if (Array.isArray(rawSkills)) {
    for (const s of rawSkills) {
      if (typeof s === 'string') skillsList.push(s.trim());
      else if (s?.name) skillsList.push(s.name.trim());
    }
  } else if (rawSkills && typeof rawSkills === 'object') {
    const tech = rawSkills.technical || [];
    for (const t of tech) {
      if (typeof t === 'string') skillsList.push(t.trim());
    }
  }

  if (skillsList.length === 0) {
    return formatCheckResult({
      checkId,
      categoryId,
      title,
      status: 'PASS',
      severity: 'info',
      description,
      evidence: ['No standalone skills list to cross-reference'],
      explanation: 'No explicit standalone skills list detected for bullet cross-referencing.',
      recommendation: null,
      confidence: 0.8,
      limitations: [],
      source: 'deterministic',
    });
  }

  const bullets = collectExperienceBullets(resumeData);
  const bulletText = bullets.join(' ').toLowerCase();

  const substantiated = [];
  const orphaned = [];

  for (const skill of skillsList) {
    const escaped = skill.toLowerCase().replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    if (new RegExp(`\\b${escaped}\\b`, 'i').test(bulletText)) {
      substantiated.push(skill);
    } else {
      orphaned.push(skill);
    }
  }

  const ratio = Math.round((substantiated.length / skillsList.length) * 100);

  if (ratio >= 60) {
    return formatCheckResult({
      checkId,
      categoryId,
      title,
      status: 'PASS',
      severity: 'info',
      description,
      evidence: [`Substantiated: ${ratio}% (${substantiated.length}/${skillsList.length} skills)`],
      explanation: `Strong skills demonstration (${ratio}%). The majority of your claimed technical skills are directly evidenced in work accomplishments.`,
      recommendation: null,
      confidence: 0.9,
      limitations: ['60% demonstration coaching guideline.'],
      source: 'deterministic',
    });
  }

  return formatCheckResult({
    checkId,
    categoryId,
    title,
    status: 'WARNING',
    severity: 'high',
    description,
    evidence: [`Substantiated: ${ratio}%`, `Orphaned skills: ${orphaned.slice(0, 6).join(', ')}`],
    explanation: `Only ${ratio}% of your listed skills are mentioned in your work experience bullets. Skills listed in isolation without application context carry less weight with recruiters.`,
    recommendation: `Integrate key skills directly into your achievement bullets: ${orphaned.slice(0, 4).join(', ')}.`,
    confidence: 0.85,
    limitations: [],
    source: 'deterministic',
  });
};

/**
 * CHK-27: Ownership & Leadership Marks
 */
export const checkOwnershipAndLeadership = (resumeData) => {
  const checkId = 'CHK-27';
  const categoryId = 'CAT-07';
  const title = 'Ownership & Leadership Marks';
  const description = 'Identify evidence of technical leadership, mentorship, architecture design, and strategic ownership.';

  const bullets = collectExperienceBullets(resumeData);

  if (bullets.length === 0) {
    return formatCheckResult({
      checkId,
      categoryId,
      title,
      status: 'PASS',
      severity: 'info',
      description,
      evidence: ['No bullets to evaluate'],
      explanation: 'No bullet points available for leadership analysis.',
      recommendation: null,
      confidence: 0.8,
      limitations: [],
      source: 'deterministic',
    });
  }

  const bulletText = bullets.join(' ').toLowerCase();
  const matchedMarkers = [];

  for (const marker of LEADERSHIP_MARKERS) {
    if (bulletText.includes(marker)) {
      matchedMarkers.push(marker);
    }
  }

  if (matchedMarkers.length >= 2) {
    return formatCheckResult({
      checkId,
      categoryId,
      title,
      status: 'PASS',
      severity: 'info',
      description,
      evidence: [`Leadership signals detected: ${matchedMarkers.join(', ')}`],
      explanation: 'Experience demonstrates strong technical leadership, mentorship, and system ownership.',
      recommendation: null,
      confidence: 0.9,
      limitations: [],
      source: 'deterministic',
    });
  }

  return formatCheckResult({
    checkId,
    categoryId,
    title,
    status: 'WARNING',
    severity: 'medium',
    description,
    evidence: matchedMarkers.length === 1 ? [`Only 1 leadership signal: '${matchedMarkers[0]}'`] : ['Zero leadership signals detected'],
    explanation: 'Limited evidence of technical ownership, mentorship, architecture design, or initiative was found in work bullets.',
    recommendation: 'Highlight instances where you mentored junior peers, led system design, or drove cross-functional decisions.',
    confidence: 0.85,
    limitations: ['Expectation scales with candidate career level.'],
    source: 'deterministic',
  });
};

export default {
  checkCareerProgression,
  checkSkillsDemonstrationContext,
  checkOwnershipAndLeadership,
};
