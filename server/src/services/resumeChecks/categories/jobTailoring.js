/**
 * PrepForge AI — Category 4: Job Tailoring Checks (CHK-15 through CHK-18)
 *
 * Evaluates hard technical skills overlap, soft skills context, action verbs,
 * and target job title alignment against an optional job description.
 *
 * MANDATORY RULE: If no target job description is provided, all 4 checks
 * return status: "NOT_EVALUATED".
 */

import { formatCheckResult } from '../utils/resultFormatter.js';
import { analyzeBulletVerb } from '../utils/verbTaxonomy.js';
import { collectExperienceBullets } from './resumeContent.js';

const COMMON_TECH_TERMS = [
  'javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'go', 'golang', 'rust', 'ruby', 'php',
  'react', 'react.js', 'angular', 'vue', 'vue.js', 'next.js', 'node.js', 'nodejs', 'express',
  'aws', 'azure', 'gcp', 'google cloud', 'docker', 'kubernetes', 'k8s', 'terraform', 'ci/cd',
  'sql', 'postgresql', 'postgres', 'mysql', 'mongodb', 'redis', 'graphql', 'rest', 'restful',
  'html', 'css', 'tailwind', 'git', 'linux', 'microservices', 'kafka', 'elasticsearch',
];

export const SOFT_SKILLS_TAXONOMY = {
  leadership: ['lead', 'leader', 'leading', 'led', 'leadership'],
  mentoring: ['mentor', 'mentored', 'mentoring', 'coach', 'coached'],
  collaboration: ['collaborat', 'partner', 'cross-functional', 'collaborated'],
  communication: ['communicat', 'present', 'author', 'written', 'articulated'],
  agile: ['agile', 'scrum', 'sprint', 'kanban'],
  'problem-solving': ['problem-solving', 'troubleshoot', 'resolved', 'debugged'],
  stakeholder: ['stakeholder', 'client', 'customer'],
  adaptability: ['adapt', 'flexible', 'pivoted'],
  initiative: ['initiat', 'spearhead', 'champion'],
};

/**
 * Extracts candidate skills as a normalized Set
 */
const getCandidateSkills = (resumeData) => {
  const skills = new Set();
  const structuredSkills = resumeData?.parsedSections?.structured?.skills;

  if (Array.isArray(structuredSkills)) {
    for (const s of structuredSkills) {
      if (typeof s === 'string') skills.add(s.toLowerCase().trim());
      else if (s?.name) skills.add(s.name.toLowerCase().trim());
    }
  } else if (structuredSkills && typeof structuredSkills === 'object') {
    const technical = structuredSkills.technical || [];
    for (const t of technical) {
      if (typeof t === 'string') skills.add(t.toLowerCase().trim());
    }
  }

  // Also scan full text for common tech terms
  const fullText = (resumeData?.extractedText || resumeData?.rawText || '').toLowerCase();
  for (const term of COMMON_TECH_TERMS) {
    const escaped = term.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    if (new RegExp(`\\b${escaped}\\b`, 'i').test(fullText)) {
      skills.add(term);
    }
  }

  return skills;
};

/**
 * Extracts skills from job description text
 */
const extractJdSkills = (jdText) => {
  const lower = jdText.toLowerCase();
  const found = new Set();
  for (const term of COMMON_TECH_TERMS) {
    const escaped = term.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    if (new RegExp(`\\b${escaped}\\b`, 'i').test(lower)) {
      found.add(term);
    }
  }
  return Array.from(found);
};

/**
 * CHK-15: Hard Technical Skills Match
 */
export const checkHardTechnicalSkillsMatch = (resumeData, options = {}) => {
  const checkId = 'CHK-15';
  const categoryId = 'CAT-04';
  const title = 'Hard Technical Skills Match';
  const description = 'Evaluate overlap between candidate technical skills and target job description requirements.';

  const jd = options?.jobDescription;
  if (!jd || typeof jd !== 'string' || !jd.trim()) {
    return formatCheckResult({
      checkId,
      categoryId,
      title,
      status: 'NOT_EVALUATED',
      severity: 'info',
      description,
      evidence: ['Target job description not provided'],
      explanation: 'No job description was provided to evaluate job tailoring alignment.',
      recommendation: 'Provide a target job description to evaluate hard skills overlap.',
      confidence: 1.0,
      limitations: ['Requires target job description.'],
      source: 'deterministic',
    });
  }

  const jdSkills = extractJdSkills(jd);
  if (jdSkills.length === 0) {
    return formatCheckResult({
      checkId,
      categoryId,
      title,
      status: 'NOT_EVALUATED',
      severity: 'info',
      description,
      evidence: ['No standard technical skill requirements identified in job description'],
      explanation: 'Could not identify specific core technical competencies in the provided job description.',
      recommendation: 'Ensure the job description includes specific technical requirements and qualifications.',
      confidence: 0.8,
      limitations: [],
      source: 'deterministic',
    });
  }

  const candidateSkills = getCandidateSkills(resumeData);
  const matched = [];
  const missing = [];

  for (const skill of jdSkills) {
    if (candidateSkills.has(skill)) {
      matched.push(skill);
    } else {
      missing.push(skill);
    }
  }

  const matchRatio = Math.round((matched.length / jdSkills.length) * 100);

  if (matchRatio >= 75) {
    return formatCheckResult({
      checkId,
      categoryId,
      title,
      status: 'PASS',
      severity: 'info',
      description,
      evidence: [`Matched skills (${matchRatio}%): ${matched.join(', ')}`],
      explanation: `Strong technical skills match (${matchRatio}%). You cover ${matched.length} of ${jdSkills.length} key required competencies.`,
      recommendation: null,
      confidence: 0.9,
      limitations: [],
      source: 'deterministic',
    });
  }

  if (matchRatio >= 50) {
    return formatCheckResult({
      checkId,
      categoryId,
      title,
      status: 'WARNING',
      severity: 'high',
      description,
      evidence: [`Matched (${matched.length}): ${matched.join(', ')}`, `Missing (${missing.length}): ${missing.join(', ')}`],
      explanation: `Moderate technical overlap (${matchRatio}%). Several skills specified in the job posting are missing from your resume.`,
      recommendation: `Incorporate missing technical skills you possess into your skills list and experience bullets: ${missing.slice(0, 5).join(', ')}.`,
      confidence: 0.9,
      limitations: [],
      source: 'deterministic',
    });
  }

  return formatCheckResult({
    checkId,
    categoryId,
    title,
    status: 'FAIL',
    severity: 'high',
    description,
    evidence: [`Missing critical skills: ${missing.slice(0, 8).join(', ')}`],
    explanation: `Low technical overlap (${matchRatio}%). Less than half of required competencies from the job description are present on your resume.`,
    recommendation: 'Tailor your resume by adding matching technical proficiencies and related projects.',
    confidence: 0.9,
    limitations: [],
    source: 'deterministic',
  });
};

/**
 * CHK-16: Soft Skills Context Match
 */
export const checkSoftSkillsMatch = (resumeData, options = {}) => {
  const checkId = 'CHK-16';
  const categoryId = 'CAT-04';
  const title = 'Soft Skills Context Match';
  const description = 'Verify evidence of behavioral and leadership competencies required by the target role.';

  const jd = options?.jobDescription;
  if (!jd || typeof jd !== 'string' || !jd.trim()) {
    return formatCheckResult({
      checkId,
      categoryId,
      title,
      status: 'NOT_EVALUATED',
      severity: 'info',
      description,
      evidence: ['Target job description not provided'],
      explanation: 'No job description was provided to evaluate job tailoring alignment.',
      recommendation: 'Provide a target job description to evaluate soft skills alignment.',
      confidence: 1.0,
      limitations: ['Requires target job description.'],
      source: 'deterministic',
    });
  }

  const jdLower = jd.toLowerCase();
  const jdRequiredSoft = Object.keys(SOFT_SKILLS_TAXONOMY).filter((key) => {
    const variants = SOFT_SKILLS_TAXONOMY[key];
    return variants.some((v) => jdLower.includes(v));
  });

  if (jdRequiredSoft.length === 0) {
    return formatCheckResult({
      checkId,
      categoryId,
      title,
      status: 'PASS',
      severity: 'info',
      description,
      evidence: ['No specific soft skill mandates isolated in target posting'],
      explanation: 'The target job description does not specify explicit behavioral competencies.',
      recommendation: null,
      confidence: 0.85,
      limitations: [],
      source: 'deterministic',
    });
  }

  const bullets = collectExperienceBullets(resumeData);
  const bulletText = bullets.join(' ').toLowerCase();

  const demonstrated = [];
  const missing = [];

  for (const skillKey of jdRequiredSoft) {
    const variants = SOFT_SKILLS_TAXONOMY[skillKey];
    const isPresent = variants.some((v) => bulletText.includes(v));
    if (isPresent) {
      demonstrated.push(skillKey);
    } else {
      missing.push(skillKey);
    }
  }

  if (demonstrated.length >= Math.ceil(jdRequiredSoft.length / 2)) {
    return formatCheckResult({
      checkId,
      categoryId,
      title,
      status: 'PASS',
      severity: 'info',
      description,
      evidence: [`Demonstrated in context: ${demonstrated.join(', ')}`],
      explanation: `Behavioral skills required by the posting (${demonstrated.join(', ')}) are demonstrated with contextual evidence in your experience bullets.`,
      recommendation: null,
      confidence: 0.85,
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
    evidence: [`Missing behavioral context: ${missing.join(', ')}`],
    explanation: `The job posting highlights behavioral competencies (${missing.join(', ')}) that are not backed by evidence in your experience section.`,
    recommendation: 'Demonstrate required behavioral strengths (e.g., cross-functional leadership, mentoring) with concrete project examples in your bullets.',
    confidence: 0.85,
    limitations: [],
    source: 'deterministic',
  });
};

/**
 * CHK-17: High-Impact Action Verbs
 */
export const checkActionVerbs = (resumeData, options = {}) => {
  const checkId = 'CHK-17';
  const categoryId = 'CAT-04';
  const title = 'High-Impact Action Verbs';
  const description = 'Ensure experience bullets open with assertive, high-impact action verbs.';

  const jd = options?.jobDescription;
  if (!jd || typeof jd !== 'string' || !jd.trim()) {
    return formatCheckResult({
      checkId,
      categoryId,
      title,
      status: 'NOT_EVALUATED',
      severity: 'info',
      description,
      evidence: ['Target job description not provided'],
      explanation: 'No job description was provided to evaluate job tailoring alignment.',
      recommendation: 'Provide a target job description to evaluate action verb alignment.',
      confidence: 1.0,
      limitations: ['Category 4 checks require a target job description.'],
      source: 'deterministic',
    });
  }

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
      explanation: 'No bullets available for action verb analysis.',
      recommendation: null,
      confidence: 0.8,
      limitations: [],
      source: 'deterministic',
    });
  }

  const passiveBullets = [];
  const strongBullets = [];

  for (const b of bullets) {
    const analysis = analyzeBulletVerb(b);
    if (analysis.isPassive) {
      passiveBullets.push({ bullet: b, phrase: analysis.matchedPassivePhrase });
    } else if (analysis.isStrongVerb) {
      strongBullets.push(b);
    }
  }

  const strongRatio = Math.round((strongBullets.length / bullets.length) * 100);

  if (passiveBullets.length > 0 || strongRatio < 80) {
    const evidence = [];
    if (passiveBullets.length > 0) {
      evidence.push(`Passive phrasing detected (${passiveBullets.length}x): ${passiveBullets.map((p) => `'${p.phrase}'`).slice(0, 3).join(', ')}`);
    }
    evidence.push(`Strong action verb ratio: ${strongRatio}% (${strongBullets.length}/${bullets.length} bullets)`);

    return formatCheckResult({
      checkId,
      categoryId,
      title,
      status: 'WARNING',
      severity: 'medium',
      description,
      evidence,
      explanation: `Identified ${passiveBullets.length} bullet(s) with passive phrases or non-assertive opening verbs.`,
      recommendation: "Replace passive phrases like 'Responsible for' or 'Helped with' with authoritative power verbs such as 'Architected', 'Spearheaded', 'Engineered', or 'Delivered'.",
      confidence: 0.9,
      limitations: ['Action verb taxonomy covers standard English past-tense verbs.'],
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
    evidence: [`Strong action verb ratio: ${strongRatio}%`],
    explanation: 'Experience bullets open with strong, assertive action verbs that emphasize candidate agency and impact.',
    recommendation: null,
    confidence: 0.95,
    limitations: [],
    source: 'deterministic',
  });
};

/**
 * CHK-18: Target Job Title Alignment
 */
export const checkTargetTitleAlignment = (resumeData, options = {}) => {
  const checkId = 'CHK-18';
  const categoryId = 'CAT-04';
  const title = 'Target Job Title Alignment';
  const description = 'Verify candidate headline and recent job titles align with target position title.';

  const jd = options?.jobDescription;
  const targetRole = options?.targetRole;

  if ((!jd || !jd.trim()) && (!targetRole || !targetRole.trim())) {
    return formatCheckResult({
      checkId,
      categoryId,
      title,
      status: 'NOT_EVALUATED',
      severity: 'info',
      description,
      evidence: ['Target job description or target role omitted'],
      explanation: 'No job description was provided to evaluate job tailoring alignment.',
      recommendation: 'Provide a target job description or target role title.',
      confidence: 1.0,
      limitations: ['Requires target role or job description.'],
      source: 'deterministic',
    });
  }

  // Derive target title
  const effectiveTarget = (targetRole || '').trim() || jd.slice(0, 150).split('\n')[0].replace(/^(?:job title|role|position|opening)[:\s]*/i, '').trim();

  const structuredExp = resumeData?.parsedSections?.structured?.experience || [];
  const recentTitle = structuredExp[0]?.title || '';
  const headline = resumeData?.parsedSections?.rawSections?.summary || '';

  const targetTokens = effectiveTarget.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
  const candidateText = `${recentTitle} ${headline}`.toLowerCase();

  const matchedTokens = targetTokens.filter((token) => candidateText.includes(token));
  const alignmentRatio = targetTokens.length > 0 ? matchedTokens.length / targetTokens.length : 1;

  if (alignmentRatio >= 0.5 || recentTitle.toLowerCase().includes(effectiveTarget.toLowerCase())) {
    return formatCheckResult({
      checkId,
      categoryId,
      title,
      status: 'PASS',
      severity: 'info',
      description,
      evidence: [`Target title: '${effectiveTarget}'`, `Recent title: '${recentTitle || 'Not listed'}'`],
      explanation: `Recent experience and headline align closely with target role '${effectiveTarget}'.`,
      recommendation: null,
      confidence: 0.85,
      limitations: ['Semantic equivalence approximation.'],
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
    evidence: [`Target title: '${effectiveTarget}'`, `Recent title: '${recentTitle || 'None'}'`],
    explanation: `Your most recent job title ('${recentTitle || 'None'}') deviates from the target position '${effectiveTarget}'. Recruiters may perceive a career gap or domain mismatch.`,
    recommendation: `Align your professional headline or summary to clearly reference '${effectiveTarget}' to signal relevant qualifications.`,
    confidence: 0.85,
    limitations: [],
    source: 'deterministic',
  });
};

export default {
  checkHardTechnicalSkillsMatch,
  checkSoftSkillsMatch,
  checkActionVerbs,
  checkTargetTitleAlignment,
};
