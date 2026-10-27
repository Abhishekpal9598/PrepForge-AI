/**
 * PrepForge AI — Deterministic Resume Section Segmentation Engine
 *
 * Implements rule-based, deterministic boundary detection for 17 canonical resume sections:
 * 1. contact: Contact Information / Header Details
 * 2. summary: Professional Summary / Executive Profile
 * 3. objective: Career Objective
 * 4. experience: Work Experience / Professional Experience
 * 5. employment: Employment History
 * 6. education: Education & Academic History
 * 7. technicalSkills: Technical Skills & Tech Stack
 * 8. softSkills: Soft Skills & Core Competencies
 * 9. projects: Key Projects & Technical Initiatives
 * 10. certifications: Certifications & Licenses
 * 11. achievements: Key Achievements & Accomplishments
 * 12. awards: Honors & Awards
 * 13. publications: Publications & Research
 * 14. languages: Languages & Proficiencies
 * 15. volunteer: Volunteer Experience & Community Service
 * 16. leadership: Leadership Experience
 * 17. interests: Interests & Extracurricular Activities
 */

export const CANONICAL_SECTIONS = [
  'contact',
  'summary',
  'objective',
  'experience',
  'employment',
  'education',
  'technicalSkills',
  'softSkills',
  'projects',
  'certifications',
  'achievements',
  'awards',
  'publications',
  'languages',
  'volunteer',
  'leadership',
  'interests',
];

export const CORE_SECTIONS = ['contact', 'experience', 'education', 'technicalSkills'];

/**
 * Section Heading Definitions with synonym lists and regular expressions.
 * Ordered intentionally so specific phrases match before generic ones.
 */
const SECTION_DEFINITIONS = [
  {
    key: 'technicalSkills',
    canonicalName: 'Technical Skills',
    pattern: /^(?:technical\s+skills|technical\s+competencies|core\s+technologies|tech\s+stack|programming\s+languages|tools\s+&?\s+technologies|technical\s+expertise|technical\s+proficiencies|computer\s+skills|it\s+skills|technical\s+toolkit)$/i,
  },
  {
    key: 'softSkills',
    canonicalName: 'Soft Skills',
    pattern: /^(?:soft\s+skills|interpersonal\s+skills|core\s+competencies|key\s+competencies|core\s+strengths|personal\s+skills|professional\s+attributes)$/i,
  },
  {
    // Generic skills header (maps to technicalSkills or generic skills container)
    key: 'skills',
    canonicalName: 'Skills',
    pattern: /^(?:skills|skills\s+&?\s+abilities|key\s+skills|competencies|areas\s+of\s+expertise|skill\s+set|proficiencies)$/i,
  },
  {
    key: 'summary',
    canonicalName: 'Professional Summary',
    pattern: /^(?:professional\s+summary|executive\s+summary|executive\s+profile|summary\s+of\s+qualifications|career\s+summary|profile|career\s+profile|professional\s+profile|about\s+me|overview|personal\s+statement|biography)$/i,
  },
  {
    key: 'objective',
    canonicalName: 'Career Objective',
    pattern: /^(?:career\s+objective|professional\s+objective|job\s+objective|objective|career\s+goal)$/i,
  },
  {
    key: 'experience',
    canonicalName: 'Work Experience',
    pattern: /^(?:work\s+experience|professional\s+experience|relevant\s+experience|experience|work\s+history|career\s+history|professional\s+background|practical\s+experience)$/i,
  },
  {
    key: 'employment',
    canonicalName: 'Employment History',
    pattern: /^(?:employment\s+history|employment|past\s+employment|previous\s+employment|positions\s+held)$/i,
  },
  {
    key: 'education',
    canonicalName: 'Education',
    pattern: /^(?:education|educational\s+background|academic\s+background|academic\s+history|academics|qualifications|academic\s+qualifications|degrees|degrees\s+&?\s+credentials|education\s+&?\s+credentials|education\s+and\s+training)$/i,
  },
  {
    key: 'projects',
    canonicalName: 'Projects',
    pattern: /^(?:projects|technical\s+projects|key\s+projects|personal\s+projects|academic\s+projects|notable\s+projects|selected\s+projects|portfolio\s+projects|open\s+source\s+projects)$/i,
  },
  {
    key: 'certifications',
    canonicalName: 'Certifications',
    pattern: /^(?:certifications|certificates|licenses|professional\s+certifications|credentials|licenses\s+&?\s+certifications|accreditations|certifications\s+&?\s+licenses)$/i,
  },
  {
    key: 'achievements',
    canonicalName: 'Achievements',
    pattern: /^(?:achievements|key\s+achievements|accomplishments|key\s+accomplishments|notable\s+achievements|career\s+highlights|major\s+accomplishments)$/i,
  },
  {
    key: 'awards',
    canonicalName: 'Awards & Honors',
    pattern: /^(?:awards|honors|awards\s+&?\s+honors|accolades|distinctions|recognitions|scholarships\s+&?\s+awards)$/i,
  },
  {
    key: 'publications',
    canonicalName: 'Publications',
    pattern: /^(?:publications|publications\s+&?\s+research|research\s+papers|research|whitepapers|articles|conference\s+proceedings|patents|published\s+works)$/i,
  },
  {
    key: 'languages',
    canonicalName: 'Languages',
    pattern: /^(?:languages|language\s+proficiency|language\s+proficiencies|multilingual\s+skills|languages\s+known|spoken\s+languages)$/i,
  },
  {
    key: 'volunteer',
    canonicalName: 'Volunteer Experience',
    pattern: /^(?:volunteer\s+experience|volunteering|volunteer\s+work|community\s+involvement|community\s+service|civic\s+engagement|social\s+work)$/i,
  },
  {
    key: 'leadership',
    canonicalName: 'Leadership Experience',
    pattern: /^(?:leadership|leadership\s+experience|leadership\s+activities|leadership\s+&?\s+activities|extracurricular\s+leadership|activities\s+&?\s+leadership|campus\s+leadership)$/i,
  },
  {
    key: 'interests',
    canonicalName: 'Interests & Activities',
    pattern: /^(?:interests|hobbies|interests\s+&?\s+hobbies|hobbies\s+&?\s+interests|extracurricular\s+activities|extracurriculars|personal\s+interests|affiliations)$/i,
  },
  {
    key: 'contact',
    canonicalName: 'Contact Information',
    pattern: /^(?:contact|contact\s+information|contact\s+details|personal\s+details|personal\s+info|contact\s+info)$/i,
  },
];

/**
 * Clean a potential heading candidate line:
 * Strips leading/trailing punctuation, markdown hashes, bullets, dashes, colons.
 *
 * @param {string} line - Raw text line
 * @returns {string} Sanitized candidate heading
 */
const cleanHeadingCandidate = (line) => {
  if (!line || typeof line !== 'string') return '';
  return line
    .trim()
    .replace(/^[\s#*=\-_~•|:\[\]()]+/g, '')
    .replace(/[\s#*=\-_~•|:\[\]()]+$/g, '')
    .trim();
};

/**
 * Determine if a line qualifies as a section heading
 *
 * @param {string} line - Single line of text
 * @returns {{ key: string, canonicalName: string, matchedHeader: string } | null}
 */
export const matchSectionHeading = (line) => {
  if (!line) return null;
  const trimmed = line.trim();

  // Heading lines are typically short (< 65 chars) and non-empty (> 2 chars)
  if (trimmed.length < 3 || trimmed.length > 65) {
    return null;
  }

  // Reject lines starting with bullet characters or list numbers (e.g. "1. Developed ...")
  if (/^(\*|-|•|–|—|\d+\.)\s+/i.test(trimmed)) {
    return null;
  }

  // Reject lines that look like sentences (ending with period, comma, or containing common prose markers)
  if (/[.!?]$/.test(trimmed) && !/^(?:etc\.|inc\.)/i.test(trimmed)) {
    return null;
  }

  const cleaned = cleanHeadingCandidate(trimmed);
  if (!cleaned || cleaned.length < 3) return null;

  for (const def of SECTION_DEFINITIONS) {
    if (def.pattern.test(cleaned)) {
      return {
        key: def.key === 'skills' ? 'technicalSkills' : def.key,
        canonicalName: def.canonicalName,
        matchedHeader: trimmed,
      };
    }
  }

  return null;
};

/**
 * Segment full resume text into 17 canonical sections
 *
 * @param {string} rawText - Full extracted resume text
 * @returns {object} Section segmentation result including rawSections, detectedSections, sectionOrder, and confidence
 */
export const segmentResumeSections = (rawText) => {
  if (!rawText || typeof rawText !== 'string' || rawText.trim().length === 0) {
    return {
      rawSections: {},
      detectedSections: [],
      sectionOrder: [],
      missingCoreSections: [...CORE_SECTIONS],
      confidence: 0,
      totalLength: 0,
    };
  }

  const lines = rawText.split('\n');
  const totalLength = rawText.length;

  // Track discovered headings and line indices
  const discoveredHeadings = [];

  for (let i = 0; i < lines.length; i++) {
    const match = matchSectionHeading(lines[i]);
    if (match) {
      discoveredHeadings.push({
        ...match,
        lineIndex: i,
      });
    }
  }

  // Initialize rawSections map with empty strings
  const rawSections = {};
  for (const sec of CANONICAL_SECTIONS) {
    rawSections[sec] = '';
  }
  rawSections.unstructured = '';

  const detectedSections = [];
  const sectionOrder = [];

  if (discoveredHeadings.length === 0) {
    // No headings detected: safely put top lines into contact and rest into unstructured
    const headerCount = lines.length > 2 ? 1 : Math.min(lines.length, 1);
    const headerLines = lines.slice(0, headerCount);
    const bodyLines = lines.slice(headerCount);

    rawSections.contact = headerLines.join('\n').trim();
    rawSections.unstructured = bodyLines.join('\n').trim();

    return {
      rawSections,
      detectedSections: [
        {
          key: 'contact',
          canonicalName: 'Contact Information',
          matchedHeader: 'Header Block (Inferred)',
          lineIndex: 0,
          characterCount: rawSections.contact.length,
        },
      ],
      sectionOrder: ['contact', 'unstructured'],
      missingCoreSections: ['experience', 'education', 'technicalSkills'],
      confidence: 0.25,
      totalLength,
    };
  }

  // If there is text before the first section heading, it belongs to the contact / header block
  const firstHeadingLine = discoveredHeadings[0].lineIndex;
  if (firstHeadingLine > 0) {
    const topLines = lines.slice(0, firstHeadingLine);
    const topText = topLines.join('\n').trim();
    if (topText.length > 0) {
      rawSections.contact = topText;
      detectedSections.push({
        key: 'contact',
        canonicalName: 'Contact Information',
        matchedHeader: 'Header Block (Inferred)',
        lineIndex: 0,
        characterCount: topText.length,
      });
      sectionOrder.push('contact');
    }
  }

  // Slice content between heading boundaries
  for (let h = 0; h < discoveredHeadings.length; h++) {
    const currentHeading = discoveredHeadings[h];
    const startLine = currentHeading.lineIndex + 1;
    const endLine =
      h + 1 < discoveredHeadings.length
        ? discoveredHeadings[h + 1].lineIndex
        : lines.length;

    const sectionContent = lines.slice(startLine, endLine).join('\n').trim();
    const sectionKey = currentHeading.key;

    // Append to existing section if repeated (e.g. multiple experience blocks)
    if (rawSections[sectionKey] && rawSections[sectionKey].length > 0) {
      rawSections[sectionKey] += '\n\n' + sectionContent;
    } else {
      rawSections[sectionKey] = sectionContent;
    }

    if (!sectionOrder.includes(sectionKey)) {
      sectionOrder.push(sectionKey);
    }

    detectedSections.push({
      key: sectionKey,
      canonicalName: currentHeading.canonicalName,
      matchedHeader: currentHeading.matchedHeader,
      lineIndex: currentHeading.lineIndex,
      characterCount: sectionContent.length,
    });
  }

  // Evaluate missing core sections
  const missingCoreSections = CORE_SECTIONS.filter((sec) => {
    if (sec === 'contact') {
      return !rawSections.contact || rawSections.contact.trim().length === 0;
    }
    if (sec === 'experience') {
      const hasExp = rawSections.experience && rawSections.experience.trim().length > 0;
      const hasEmp = rawSections.employment && rawSections.employment.trim().length > 0;
      return !hasExp && !hasEmp;
    }
    if (sec === 'technicalSkills') {
      const hasTech = rawSections.technicalSkills && rawSections.technicalSkills.trim().length > 0;
      const hasSoft = rawSections.softSkills && rawSections.softSkills.trim().length > 0;
      return !hasTech && !hasSoft;
    }
    return !rawSections[sec] || rawSections[sec].trim().length === 0;
  });

  // Calculate parsing confidence score (0.0 to 1.0)
  // Factors: Core section presence (70%) + Text coverage percentage (30%)
  const coreWeights = {
    contact: 0.15,
    experience: 0.25,
    education: 0.15,
    technicalSkills: 0.15,
  };

  let coreScore = 0;
  if (!missingCoreSections.includes('contact')) coreScore += coreWeights.contact;
  if (!missingCoreSections.includes('experience')) coreScore += coreWeights.experience;
  if (!missingCoreSections.includes('education')) coreScore += coreWeights.education;
  if (!missingCoreSections.includes('technicalSkills')) coreScore += coreWeights.technicalSkills;

  let assignedChars = 0;
  for (const k of Object.keys(rawSections)) {
    if (k !== 'unstructured') {
      assignedChars += rawSections[k].length;
    }
  }

  const coverageRatio = totalLength > 0 ? Math.min(1.0, assignedChars / totalLength) : 0;
  const confidence = Math.min(1.0, Math.max(0.1, Number((coreScore + 0.3 * coverageRatio).toFixed(2))));

  return {
    rawSections,
    detectedSections,
    sectionOrder,
    missingCoreSections,
    confidence,
    totalLength,
  };
};

export default {
  CANONICAL_SECTIONS,
  CORE_SECTIONS,
  matchSectionHeading,
  segmentResumeSections,
};
