/**
 * PrepForge AI — 27-Point Resume Check Registry
 *
 * Authoritative registry defining, validating, and cataloging all 27 checks
 * across 7 specialized categories.
 */

import atsEssentials from './categories/atsEssentials.js';
import resumeSections from './categories/resumeSections.js';
import resumeContent from './categories/resumeContent.js';
import jobTailoring from './categories/jobTailoring.js';
import recruiterRedFlags from './categories/recruiterRedFlags.js';
import biasPrevention from './categories/biasPrevention.js';
import seniorityImpact from './categories/seniorityImpact.js';

export const TOTAL_CHECKS_COUNT = 27;

export const CHECK_DEFINITIONS = [
  // --- Category 1: ATS Essentials (CHK-01 to CHK-06) ---
  {
    id: 'CHK-01',
    categoryId: 'CAT-01',
    categoryName: 'ATS Essentials',
    title: 'File Format & Critical Parsing Compatibility',
    description: 'Verify resume is in an ATS-supported format and text streams can be extracted cleanly without corruption.',
    handler: atsEssentials.checkFileFormatAndParsing,
    source: 'deterministic',
    defaultSeverity: 'critical',
  },
  {
    id: 'CHK-02',
    categoryId: 'CAT-01',
    categoryName: 'ATS Essentials',
    title: 'ATS-Friendly Design & Layout',
    description: 'Ensure resume layout is single-column and free from complex tables or fragmented text divisions.',
    handler: atsEssentials.checkAtsLayout,
    source: 'deterministic',
    defaultSeverity: 'high',
  },
  {
    id: 'CHK-03',
    categoryId: 'CAT-01',
    categoryName: 'ATS Essentials',
    title: 'Professional Email Format',
    description: 'Verify that the candidate email address follows a professional naming structure and avoids spam filtering.',
    handler: atsEssentials.checkProfessionalEmail,
    source: 'deterministic',
    defaultSeverity: 'medium',
  },
  {
    id: 'CHK-04',
    categoryId: 'CAT-01',
    categoryName: 'ATS Essentials',
    title: 'Header Professional Links',
    description: 'Ensure presence of clickable professional profile links (LinkedIn, GitHub, Portfolio).',
    handler: atsEssentials.checkProfessionalLinks,
    source: 'deterministic',
    defaultSeverity: 'medium',
  },
  {
    id: 'CHK-05',
    categoryId: 'CAT-01',
    categoryName: 'ATS Essentials',
    title: 'Resume File Naming Convention',
    description: 'Ensure file name is identifiable and recruiter-friendly when downloaded locally.',
    handler: atsEssentials.checkFileNamingConvention,
    source: 'deterministic',
    defaultSeverity: 'low',
  },
  {
    id: 'CHK-06',
    categoryId: 'CAT-01',
    categoryName: 'ATS Essentials',
    title: 'Dates and Links Consistency',
    description: 'Standardize date formatting across job entries and verify URL protocol validity.',
    handler: atsEssentials.checkDatesAndLinksConsistency,
    source: 'deterministic',
    defaultSeverity: 'medium',
  },

  // --- Category 2: Resume Sections (CHK-07 to CHK-09) ---
  {
    id: 'CHK-07',
    categoryId: 'CAT-02',
    categoryName: 'Resume Sections',
    title: 'Essential Section Presence',
    description: 'Verify presence of the four foundational resume pillars: Contact, Experience, Education, and Skills.',
    handler: resumeSections.checkEssentialSections,
    source: 'deterministic',
    defaultSeverity: 'critical',
  },
  {
    id: 'CHK-08',
    categoryId: 'CAT-02',
    categoryName: 'Resume Sections',
    title: 'Contact Information Completeness',
    description: 'Ensure recruiters have primary and secondary channels to contact the candidate.',
    handler: resumeSections.checkContactCompleteness,
    source: 'deterministic',
    defaultSeverity: 'high',
  },
  {
    id: 'CHK-09',
    categoryId: 'CAT-02',
    categoryName: 'Resume Sections',
    title: 'Section Structural Ordering',
    description: 'Verify resume content follows traditional recruiter scanning hierarchy.',
    handler: resumeSections.checkSectionOrdering,
    source: 'deterministic',
    defaultSeverity: 'low',
  },

  // --- Category 3: Resume Content (CHK-10 to CHK-14) ---
  {
    id: 'CHK-10',
    categoryId: 'CAT-03',
    categoryName: 'Resume Content',
    title: 'ATS Parse Rate',
    description: 'Measure percentage of extracted text successfully mapped into recognized structural sections.',
    handler: resumeContent.checkAtsParseRate,
    source: 'deterministic',
    defaultSeverity: 'high',
  },
  {
    id: 'CHK-11',
    categoryId: 'CAT-03',
    categoryName: 'Resume Content',
    title: 'Quantified Achievements',
    description: 'Ensure experience bullets demonstrate measurable business impact rather than passive duty lists.',
    handler: resumeContent.checkQuantifiedAchievements,
    source: 'deterministic',
    defaultSeverity: 'high',
  },
  {
    id: 'CHK-12',
    categoryId: 'CAT-03',
    categoryName: 'Resume Content',
    title: 'Repeated Words & Buzzwords',
    description: 'Identify corporate jargon, overused clichés, and repetitive leading verbs.',
    handler: resumeContent.checkRepeatedWordsAndBuzzwords,
    source: 'deterministic',
    defaultSeverity: 'medium',
  },
  {
    id: 'CHK-13',
    categoryId: 'CAT-03',
    categoryName: 'Resume Content',
    title: 'Spelling, Grammar & Casing',
    description: 'Detect spelling mistakes, typographical errors, and improper technical acronym capitalization.',
    handler: resumeContent.checkSpellingAndCasingCheck,
    source: 'deterministic',
    defaultSeverity: 'high',
  },
  {
    id: 'CHK-14',
    categoryId: 'CAT-03',
    categoryName: 'Resume Content',
    title: 'Bullet Length & Readability',
    description: 'Ensure bullet points are concise, scannable (15-30 words), and uniformly punctuated.',
    handler: resumeContent.checkBulletLengthAndConsistency,
    source: 'deterministic',
    defaultSeverity: 'medium',
  },

  // --- Category 4: Job Tailoring (CHK-15 to CHK-18) ---
  {
    id: 'CHK-15',
    categoryId: 'CAT-04',
    categoryName: 'Job Tailoring',
    title: 'Hard Technical Skills Match',
    description: 'Evaluate overlap between candidate technical skills and target job description requirements.',
    handler: jobTailoring.checkHardTechnicalSkillsMatch,
    source: 'conditional',
    defaultSeverity: 'high',
  },
  {
    id: 'CHK-16',
    categoryId: 'CAT-04',
    categoryName: 'Job Tailoring',
    title: 'Soft Skills Context Match',
    description: 'Verify evidence of behavioral and leadership competencies required by the target role.',
    handler: jobTailoring.checkSoftSkillsMatch,
    source: 'conditional',
    defaultSeverity: 'medium',
  },
  {
    id: 'CHK-17',
    categoryId: 'CAT-04',
    categoryName: 'Job Tailoring',
    title: 'High-Impact Action Verbs',
    description: 'Ensure experience bullets open with assertive, high-impact action verbs.',
    handler: jobTailoring.checkActionVerbs,
    source: 'conditional',
    defaultSeverity: 'medium',
  },
  {
    id: 'CHK-18',
    categoryId: 'CAT-04',
    categoryName: 'Job Tailoring',
    title: 'Target Job Title Alignment',
    description: 'Verify candidate headline and recent job titles align with target position title.',
    handler: jobTailoring.checkTargetTitleAlignment,
    source: 'conditional',
    defaultSeverity: 'medium',
  },

  // --- Category 5: Recruiter Red Flags (CHK-19 to CHK-22) ---
  {
    id: 'CHK-19',
    categoryId: 'CAT-05',
    categoryName: 'Recruiter Red Flags',
    title: 'Resume Timeline Credibility',
    description: 'Detect chronological contradictions, future employment dates, or inverted start/end dates.',
    handler: recruiterRedFlags.checkTimelineCredibility,
    source: 'deterministic',
    defaultSeverity: 'high',
  },
  {
    id: 'CHK-20',
    categoryId: 'CAT-05',
    categoryName: 'Recruiter Red Flags',
    title: 'Interview Risk Signals',
    description: 'Detect vague scopes, collective attribution, or lack of personal accountability in experience descriptions.',
    handler: recruiterRedFlags.checkInterviewRiskSignals,
    source: 'deterministic',
    defaultSeverity: 'medium',
  },
  {
    id: 'CHK-21',
    categoryId: 'CAT-05',
    categoryName: 'Recruiter Red Flags',
    title: 'Peer Experience Benchmarking',
    description: 'Verify depth and bullet density match expectations for stated career level tier without fabricating peer statistics.',
    handler: recruiterRedFlags.checkPeerBenchmarking,
    source: 'deterministic',
    defaultSeverity: 'medium',
  },
  {
    id: 'CHK-22',
    categoryId: 'CAT-05',
    categoryName: 'Recruiter Red Flags',
    title: 'Professional Presence Match',
    description: 'Validate coherence between summary headline claims and documented job history durations.',
    handler: recruiterRedFlags.checkProfessionalPresenceMatch,
    source: 'deterministic',
    defaultSeverity: 'low',
  },

  // --- Category 6: Bias and Discrimination Prevention (CHK-23 to CHK-24) ---
  {
    id: 'CHK-23',
    categoryId: 'CAT-06',
    categoryName: 'Bias and Discrimination',
    title: 'Age & Date Bias Mitigation',
    description: 'Protect candidates against unconscious age bias and identify unneeded demographic markers.',
    handler: biasPrevention.checkAgeAndDateBias,
    source: 'deterministic',
    defaultSeverity: 'info',
  },
  {
    id: 'CHK-24',
    categoryId: 'CAT-06',
    categoryName: 'Bias and Discrimination',
    title: 'Employment Gap Analysis',
    description: 'Identify unannotated employment gaps neutrally to suggest constructive framing.',
    handler: biasPrevention.checkEmploymentGaps,
    source: 'deterministic',
    defaultSeverity: 'info',
  },

  // --- Category 7: Seniority and Impact (CHK-25 to CHK-27) ---
  {
    id: 'CHK-25',
    categoryId: 'CAT-07',
    categoryName: 'Seniority and Impact',
    title: 'Career Progression Trajectory',
    description: 'Evaluate upward trajectory in role responsibility, technical scope, and title hierarchy.',
    handler: seniorityImpact.checkCareerProgression,
    source: 'deterministic',
    defaultSeverity: 'medium',
  },
  {
    id: 'CHK-26',
    categoryId: 'CAT-07',
    categoryName: 'Seniority and Impact',
    title: 'Skills Demonstration Context',
    description: 'Verify that skills listed in the Skills section are actively demonstrated in experience bullets.',
    handler: seniorityImpact.checkSkillsDemonstrationContext,
    source: 'deterministic',
    defaultSeverity: 'high',
  },
  {
    id: 'CHK-27',
    categoryId: 'CAT-07',
    categoryName: 'Seniority and Impact',
    title: 'Ownership & Leadership Marks',
    description: 'Identify evidence of technical leadership, mentorship, architecture design, and strategic ownership.',
    handler: seniorityImpact.checkOwnershipAndLeadership,
    source: 'deterministic',
    defaultSeverity: 'medium',
  },
];

// Sanity check registry integrity at module load
const idSet = new Set();
for (const def of CHECK_DEFINITIONS) {
  if (idSet.has(def.id)) {
    throw new Error(`Duplicate check ID in registry: ${def.id}`);
  }
  idSet.add(def.id);
}

if (CHECK_DEFINITIONS.length !== TOTAL_CHECKS_COUNT) {
  throw new Error(`Expected exactly ${TOTAL_CHECKS_COUNT} checks, but registered ${CHECK_DEFINITIONS.length}`);
}

/**
 * Get check definition by ID
 * @param {string} id - e.g. 'CHK-01'
 */
export const getCheckById = (id) => {
  return CHECK_DEFINITIONS.find((c) => c.id.toUpperCase() === id.toUpperCase()) || null;
};

/**
 * Get checks belonging to a category
 * @param {string} categoryId - e.g. 'CAT-01'
 */
export const getChecksByCategory = (categoryId) => {
  return CHECK_DEFINITIONS.filter((c) => c.categoryId.toUpperCase() === categoryId.toUpperCase());
};

/**
 * Get all registered check definitions
 */
export const getAllChecks = () => {
  return [...CHECK_DEFINITIONS];
};

export default {
  TOTAL_CHECKS_COUNT,
  CHECK_DEFINITIONS,
  getCheckById,
  getChecksByCategory,
  getAllChecks,
};
