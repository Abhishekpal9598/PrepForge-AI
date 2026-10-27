/**
 * PrepForge AI — Category 3: Resume Content Checks (CHK-10 through CHK-14)
 *
 * Evaluates parse rate, quantified accomplishments, cliché avoidance,
 * technical spelling/casing, and bullet readability/consistency.
 */

import { formatCheckResult } from '../utils/resultFormatter.js';
import { findCliches } from '../utils/clicheDictionary.js';
import { checkSpellingAndCasing } from '../utils/spellingDictionary.js';
import { analyzeBulletVerb } from '../utils/verbTaxonomy.js';

/**
 * Helper to collect all experience bullets from structured or raw data
 */
export const collectExperienceBullets = (resumeData) => {
  const structuredExp = resumeData?.parsedSections?.structured?.experience || [];
  const bullets = [];

  for (const exp of structuredExp) {
    if (Array.isArray(exp.bullets)) {
      for (const b of exp.bullets) {
        if (typeof b === 'string' && b.trim()) {
          bullets.push(b.trim());
        }
      }
    }
  }

  if (bullets.length > 0) return bullets;

  // Fallback: extract from rawSections.experience
  const rawExp = resumeData?.parsedSections?.rawSections?.experience || '';
  if (rawExp) {
    const lines = rawExp.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (/^[•\-\*\u2022\u25E6\u2043\u2219]|\b\d+\.\s+/.test(trimmed) && trimmed.length > 15) {
        bullets.push(trimmed.replace(/^[•\-\*\u2022\u25E6\u2043\u2219\d\.\s]+/, '').trim());
      }
    }
  }

  return bullets;
};

/**
 * CHK-10: ATS Parse Rate
 */
export const checkAtsParseRate = (resumeData) => {
  const checkId = 'CHK-10';
  const categoryId = 'CAT-03';
  const title = 'ATS Parse Rate';
  const description = 'Measure percentage of extracted text successfully mapped into recognized structural sections.';

  const fullText = resumeData?.extractedText || resumeData?.rawText || '';
  const totalChars = fullText.trim().length;

  if (totalChars === 0) {
    return formatCheckResult({
      checkId,
      categoryId,
      title,
      status: 'FAIL',
      severity: 'high',
      description,
      evidence: ['0 total characters extracted'],
      explanation: 'No selectable text was extracted from the document.',
      recommendation: 'Provide a readable text-based resume file.',
      confidence: 1.0,
      limitations: [],
      source: 'deterministic',
    });
  }

  const detectedSections = resumeData?.parsedSections?.detectedSections || [];
  const mappedChars = detectedSections.reduce((sum, sec) => sum + (sec.characterCount || 0), 0);
  const parseRate = Math.min(100, Math.round((mappedChars / totalChars) * 100));

  if (parseRate >= 85) {
    return formatCheckResult({
      checkId,
      categoryId,
      title,
      status: 'PASS',
      severity: 'info',
      description,
      evidence: [`Parse rate: ${parseRate}%`, `Mapped characters: ${mappedChars} of ${totalChars}`],
      explanation: `High ATS parse rate achieved (${parseRate}%). Content is well-structured under standard headings.`,
      recommendation: null,
      confidence: 0.95,
      limitations: ['Coaching guideline threshold: 85%.'],
      source: 'deterministic',
    });
  }

  if (parseRate >= 70) {
    return formatCheckResult({
      checkId,
      categoryId,
      title,
      status: 'WARNING',
      severity: 'high',
      description,
      evidence: [`Parse rate: ${parseRate}%`, `Unmapped characters: ${totalChars - mappedChars}`],
      explanation: `Moderate ATS parse rate (${parseRate}%). Some content resides outside standard section headings and may be skipped by ATS indexing engines.`,
      recommendation: 'Organize unheaded content under recognizable headings (e.g. Summary, Experience, Education, Skills, Projects).',
      confidence: 0.9,
      limitations: ['Coaching guideline threshold.'],
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
    evidence: [`Parse rate: ${parseRate}%`],
    explanation: `Low ATS parse rate (${parseRate}%). Over 30% of resume text could not be mapped into recognized sections.`,
    recommendation: 'Restructure your resume with standard ATS-compatible section headers.',
    confidence: 0.9,
    limitations: [],
    source: 'deterministic',
  });
};

/**
 * CHK-11: Quantified Achievements
 */
export const checkQuantifiedAchievements = (resumeData) => {
  const checkId = 'CHK-11';
  const categoryId = 'CAT-03';
  const title = 'Quantified Achievements';
  const description = 'Ensure experience bullets demonstrate measurable business impact rather than passive duty lists.';

  const bullets = collectExperienceBullets(resumeData);

  if (bullets.length === 0) {
    return formatCheckResult({
      checkId,
      categoryId,
      title,
      status: 'WARNING',
      severity: 'high',
      description,
      evidence: ['No experience bullet points detected'],
      explanation: 'No experience bullet points were found to evaluate metric quantification.',
      recommendation: 'Add accomplishment bullets with metrics under each job role.',
      confidence: 0.85,
      limitations: [],
      source: 'deterministic',
    });
  }

  // Metric pattern excluding standalone 4-digit years (e.g., 2020)
  const metricPattern = /(?:\$|€|£|¥)\s*\d+(?:,\d{3})*(?:\.\d+)?|\b\d+(?:\.\d+)?\s*%|\b\d+x\b|\b\d+\s*k\b|\b\d+\+?\s*(?:users|clients|engineers|customers|transactions|requests|ms|seconds|minutes|hours|days|weeks|months|percent|million|billion|members|bps)\b|\b(?:saved|increased|reduced|grew|scaled|generated)\s+(?:by\s+)?(?:\$)?\d+/i;

  const quantifiedBullets = [];
  const weakBullets = [];

  for (const b of bullets) {
    // Strip standalone calendar years like "in 2022" or "(2020-2023)"
    const cleaned = b.replace(/\b(?:19|20)\d{2}\b/g, '');
    if (metricPattern.test(cleaned)) {
      quantifiedBullets.push(b);
    } else {
      weakBullets.push(b);
    }
  }

  const ratio = Math.round((quantifiedBullets.length / bullets.length) * 100);

  if (ratio >= 40) {
    return formatCheckResult({
      checkId,
      categoryId,
      title,
      status: 'PASS',
      severity: 'info',
      description,
      evidence: [`Quantified ratio: ${ratio}% (${quantifiedBullets.length}/${bullets.length} bullets)`],
      explanation: `Strong quantification rate (${ratio}%). Meets or exceeds the 40% measurable impact coaching guideline.`,
      recommendation: null,
      confidence: 0.9,
      limitations: ['Coaching guideline threshold: 40%.'],
      source: 'deterministic',
    });
  }

  if (ratio >= 25) {
    return formatCheckResult({
      checkId,
      categoryId,
      title,
      status: 'WARNING',
      severity: 'high',
      description,
      evidence: [`Quantified ratio: ${ratio}%`, `Weak bullets sample: ${weakBullets.slice(0, 2).join(' | ')}`],
      explanation: `Moderate quantification rate (${ratio}%). Only ${quantifiedBullets.length} of ${bullets.length} bullets contain measurable metrics.`,
      recommendation: 'Add metrics, percentages, revenue impact, or user counts to at least 40% of your bullets.',
      confidence: 0.9,
      limitations: ['Adapts severity for qualitative or entry-level disciplines.'],
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
    evidence: [`Quantified ratio: ${ratio}% (${quantifiedBullets.length}/${bullets.length} bullets)`],
    explanation: `Low quantification rate (${ratio}%). The majority of bullets describe passive duties without demonstrable impact.`,
    recommendation: 'Add numerical outcomes to your bullets (e.g., "Increased system throughput by 35%", "Reduced latency by 120ms").',
    confidence: 0.9,
    limitations: [],
    source: 'deterministic',
  });
};

/**
 * CHK-12: Repeated Words & Buzzwords
 */
export const checkRepeatedWordsAndBuzzwords = (resumeData) => {
  const checkId = 'CHK-12';
  const categoryId = 'CAT-03';
  const title = 'Repeated Words & Buzzwords';
  const description = 'Identify corporate jargon, overused clichés, and repetitive leading verbs.';

  const text = resumeData?.extractedText || resumeData?.rawText || '';
  const cliches = findCliches(text);

  // Check for repeated starting verbs within experience entries
  const structuredExp = resumeData?.parsedSections?.structured?.experience || [];
  const repeatedVerbs = {};

  for (const exp of structuredExp) {
    const verbCounts = {};
    const bullets = Array.isArray(exp.bullets) ? exp.bullets : [];
    for (const b of bullets) {
      const { startingToken } = analyzeBulletVerb(b);
      if (startingToken && startingToken.length > 2) {
        verbCounts[startingToken] = (verbCounts[startingToken] || 0) + 1;
      }
    }
    for (const [v, c] of Object.entries(verbCounts)) {
      if (c >= 3) {
        repeatedVerbs[v] = (repeatedVerbs[v] || 0) + c;
      }
    }
  }

  const issues = [];
  if (cliches.length > 0) {
    issues.push(`Overused clichés found: ${cliches.map((c) => `'${c.word}' (${c.count}x)`).join(', ')}`);
  }
  const repeatedVerbKeys = Object.keys(repeatedVerbs);
  if (repeatedVerbKeys.length > 0) {
    issues.push(`Repetitive starting verbs: ${repeatedVerbKeys.map((v) => `'${v}' (${repeatedVerbs[v]}x)`).join(', ')}`);
  }

  if (issues.length > 0) {
    return formatCheckResult({
      checkId,
      categoryId,
      title,
      status: 'WARNING',
      severity: 'medium',
      description,
      evidence: issues,
      explanation: 'Overused corporate buzzwords or repetitive starting action verbs were detected.',
      recommendation: 'Replace generic buzzwords (e.g., "go-getter", "team player") with technical outcomes, and diversify starting verbs across your bullets.',
      confidence: 0.9,
      limitations: ['Cliché taxonomy handles standard corporate terminology.'],
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
    evidence: ['Zero detected clichés', 'Diverse starting action verbs'],
    explanation: 'Bullet vocabulary is active, specific, and free of overused corporate jargon.',
    recommendation: null,
    confidence: 0.95,
    limitations: [],
    source: 'deterministic',
  });
};

/**
 * CHK-13: Spelling, Grammar & Casing
 */
export const checkSpellingAndCasingCheck = (resumeData) => {
  const checkId = 'CHK-13';
  const categoryId = 'CAT-03';
  const title = 'Spelling, Grammar & Casing';
  const description = 'Detect spelling mistakes, typographical errors, and improper technical acronym capitalization.';

  const text = resumeData?.extractedText || resumeData?.rawText || '';
  const { typos, casingIssues } = checkSpellingAndCasing(text);

  const totalErrors = typos.length + casingIssues.length;
  const evidence = [
    ...typos.map((t) => `Typo: '${t.found}' -> suggestion: '${t.suggestion}'`),
    ...casingIssues.map((c) => `Casing issue: '${c.found}' -> expected: '${c.expected}'`),
  ];

  if (totalErrors === 0) {
    return formatCheckResult({
      checkId,
      categoryId,
      title,
      status: 'PASS',
      severity: 'info',
      description,
      evidence: ['No high-frequency typos or technical casing errors detected'],
      explanation: 'Text is free of common typographical mistakes and adheres to standard technical casing (e.g. JavaScript, PostgreSQL).',
      recommendation: null,
      confidence: 0.9,
      limitations: ['Heuristic covers known resume typos and technical capitalization dictionary.'],
      source: 'deterministic',
    });
  }

  if (totalErrors <= 2) {
    return formatCheckResult({
      checkId,
      categoryId,
      title,
      status: 'WARNING',
      severity: 'high',
      description,
      evidence,
      explanation: `Detected ${totalErrors} minor typographical or casing discrepancies.`,
      recommendation: 'Correct the identified typos and verify consistent capitalization for technical acronyms.',
      confidence: 0.95,
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
    evidence,
    explanation: `Found ${totalErrors} spelling errors or inconsistent technical capitalizations. Multiple errors undermine recruiter confidence.`,
    recommendation: 'Perform a comprehensive proofreading pass to resolve highlighted typos and technical terms.',
    confidence: 0.95,
    limitations: [],
    source: 'deterministic',
  });
};

/**
 * CHK-14: Bullet Length & Readability
 */
export const checkBulletLengthAndConsistency = (resumeData) => {
  const checkId = 'CHK-14';
  const categoryId = 'CAT-03';
  const title = 'Bullet Length & Readability';
  const description = 'Ensure bullet points are concise, scannable (15-30 words), and uniformly punctuated.';

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
      explanation: 'No bullet points available for length analysis.',
      recommendation: null,
      confidence: 0.8,
      limitations: [],
      source: 'deterministic',
    });
  }

  const wordCounts = bullets.map((b) => b.split(/\s+/).filter(Boolean).length);
  const avgWords = Math.round(wordCounts.reduce((a, b) => a + b, 0) / wordCounts.length);

  const tooShort = bullets.filter((b, idx) => wordCounts[idx] < 8);
  const tooLong = bullets.filter((b, idx) => wordCounts[idx] > 45);

  // Check punctuation consistency (all end with period, or all do not)
  const endingWithPeriod = bullets.filter((b) => /\.\s*$/.test(b)).length;
  const periodRatio = endingWithPeriod / bullets.length;
  const punctuationInconsistent = periodRatio > 0.2 && periodRatio < 0.8;

  const issues = [];
  if (tooShort.length > 0) {
    issues.push(`${tooShort.length} bullet(s) under 8 words (too brief)`);
  }
  if (tooLong.length > 0) {
    issues.push(`${tooLong.length} bullet(s) exceeding 45 words (run-on paragraph)`);
  }
  if (punctuationInconsistent) {
    issues.push(`Inconsistent terminal punctuation (${endingWithPeriod}/${bullets.length} bullets end with a period)`);
  }

  if (issues.length > 0 && (tooShort.length + tooLong.length > bullets.length * 0.3 || punctuationInconsistent)) {
    return formatCheckResult({
      checkId,
      categoryId,
      title,
      status: 'WARNING',
      severity: 'medium',
      description,
      evidence: [`Average words per bullet: ${avgWords}`, ...issues],
      explanation: 'Bullet point lengths or punctuation styles deviate from optimal recruiter scannability standards.',
      recommendation: 'Aim for 15-30 words per bullet point and ensure all bullets consistently either end with a period or omit it.',
      confidence: 0.9,
      limitations: ['Coaching guideline: 15-30 words optimal.'],
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
    evidence: [`Average words per bullet: ${avgWords}`, `Punctuation consistency: ${Math.round(periodRatio * 100)}%`],
    explanation: 'Bullet points are scannable, well-proportioned, and maintain uniform punctuation.',
    recommendation: null,
    confidence: 0.95,
    limitations: [],
    source: 'deterministic',
  });
};

export default {
  collectExperienceBullets,
  checkAtsParseRate,
  checkQuantifiedAchievements,
  checkRepeatedWordsAndBuzzwords,
  checkSpellingAndCasingCheck,
  checkBulletLengthAndConsistency,
};
