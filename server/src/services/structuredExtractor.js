/**
 * PrepForge AI — Structured Information & Timeline Extraction Engine
 *
 * Deterministically extracts typed entities and timelines from segmented resume sections:
 * - Contact information (Name, Email, Phone, Location, Links)
 * - Education entries (Institution, Degree, Field of Study, Dates, GPA, Honors)
 * - Work Experience entries (Company, Role, Dates, Location, Bullets, Action Verbs, Metrics)
 * - Projects entries (Title, Description, Technologies, Link, Bullets)
 * - Skills matrix (Categorized Technical Skills, Soft Skills)
 * - Certifications (Name, Issuer, Date, Credential ID)
 * - Timeline analysis (Chronological order, date consistency, career breaks without penalty)
 */

// ==========================================
// 1. TAXONOMIES & REGEX DICTIONARIES
// ==========================================

const MONTH_NAMES = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12,
};

const COMMON_DEGREES = [
  { level: 'Doctorate', pattern: /\b(?:Ph\.?D\.?|Doctor(?:ate)?(?:\s+of\s+[A-Za-z\s]+)?)\b/i },
  { level: 'Master', pattern: /\b(?:M\.?S\.?|M\.?A\.?|M\.?Tech\.?|M\.?E\.?|M\.?B\.?A\.?|Master(?:'s)?(?:\s+of\s+[A-Za-z\s]+)?)\b/i },
  { level: 'Bachelor', pattern: /\b(?:B\.?S\.?|B\.?A\.?|B\.?Tech\.?|B\.?E\.?|Bachelor(?:'s)?(?:\s+of\s+[A-Za-z\s]+)?)\b/i },
  { level: 'Associate', pattern: /\b(?:A\.?S\.?|A\.?A\.?|Associate(?:'s)?(?:\s+of\s+[A-Za-z\s]+)?)\b/i },
];

const COMMON_TECH_SKILLS = {
  languages: [
    'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'C', 'Go', 'Golang',
    'Rust', 'Ruby', 'PHP', 'Swift', 'Kotlin', 'SQL', 'HTML', 'HTML5', 'CSS', 'CSS3',
    'Sass', 'SCSS', 'Bash', 'Shell', 'PowerShell', 'Scala', 'R', 'Perl', 'Dart',
  ],
  frameworks: [
    'React', 'React.js', 'React Native', 'Node.js', 'Express', 'Express.js', 'Next.js',
    'Vue', 'Vue.js', 'Angular', 'NestJS', 'Django', 'Flask', 'FastAPI', 'Spring',
    'Spring Boot', 'ASP.NET', 'Ruby on Rails', 'Laravel', 'GraphQL', 'REST', 'RESTful API',
    'Tailwind CSS', 'Bootstrap', 'Redux', 'Prisma', 'Sequelize', 'Mongoose',
  ],
  databases: [
    'MongoDB', 'PostgreSQL', 'MySQL', 'Redis', 'SQLite', 'DynamoDB', 'Cassandra',
    'Elasticsearch', 'Oracle', 'Firebase', 'Supabase', 'MariaDB', 'Neo4j',
  ],
  cloudDevOps: [
    'AWS', 'Amazon Web Services', 'Azure', 'Microsoft Azure', 'GCP', 'Google Cloud',
    'Docker', 'Kubernetes', 'Terraform', 'Ansible', 'Jenkins', 'GitHub Actions',
    'GitLab CI', 'CI/CD', 'Nginx', 'Apache', 'Linux', 'Ubuntu', 'Serverless',
    'Cloudflare', 'Vercel', 'Netlify', 'Prometheus', 'Grafana',
  ],
  tools: [
    'Git', 'GitHub', 'GitLab', 'Bitbucket', 'Postman', 'Jira', 'Confluence',
    'Figma', 'Vite', 'Webpack', 'Jest', 'Mocha', 'Chai', 'Cypress', 'Playwright',
    'VS Code', 'IntelliJ', 'Docker Desktop', 'Swagger', 'Postman',
  ],
};

const COMMON_SOFT_SKILLS = [
  'Leadership', 'Communication', 'Mentorship', 'Problem Solving', 'Critical Thinking',
  'Collaboration', 'Cross-functional Collaboration', 'Teamwork', 'Agile', 'Scrum',
  'Time Management', 'Adaptability', 'Creativity', 'Conflict Resolution', 'Emotional Intelligence',
  'Stakeholder Management', 'Public Speaking', 'Negotiation', 'Project Management',
];

const ACTION_VERBS = new Set([
  'accelerated', 'achieved', 'administered', 'advised', 'analyzed', 'architected',
  'automated', 'built', 'championed', 'coached', 'collaborated', 'consolidated',
  'constructed', 'coordinated', 'created', 'decreased', 'delivered', 'deployed',
  'designed', 'developed', 'devised', 'directed', 'documented', 'drove', 'engineered',
  'enhanced', 'established', 'evaluated', 'executed', 'expanded', 'expedited',
  'formulated', 'generated', 'guided', 'headed', 'identified', 'implemented',
  'improved', 'increased', 'initiated', 'innovated', 'installed', 'instituted',
  'integrated', 'introduced', 'invented', 'launched', 'led', 'managed', 'maximized',
  'mentored', 'migrated', 'minimized', 'modernized', 'negotiated', 'optimized',
  'orchestrated', 'organized', 'overhauled', 'oversaw', 'partnered', 'pioneered',
  'planned', 'produced', 'programmed', 'published', 're-engineered', 'reduced',
  'refactored', 'resolved', 'restructured', 'revamped', 'scaled', 'simplified',
  'spearheaded', 'standardized', 'streamlined', 'strengthened', 'supervised',
  'surpassed', 'transformed', 'upgraded',
]);

// ==========================================
// 2. HELPER UTILITIES
// ==========================================

/**
 * Parse an isolated date string into normalized date tokens
 * Supports MM/YYYY, Month YYYY, YYYY, Mon YYYY, Present/Current
 *
 * @param {string} raw - Raw date snippet
 * @returns {{ year: number, month: number, isCurrent: boolean, raw: string, timestamp: number } | null}
 */
export const parseDateToken = (raw) => {
  if (!raw || typeof raw !== 'string') return null;
  const str = raw.trim();

  // Present / Current / Ongoing / Now
  if (/^(?:present|current|ongoing|now)$/i.test(str)) {
    const now = new Date();
    return {
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      isCurrent: true,
      raw: str,
      timestamp: now.getTime(),
    };
  }

  // MM/YYYY or M/YYYY
  const mmYyyy = str.match(/\b(0?[1-9]|1[0-2])[\/.-](\d{4})\b/);
  if (mmYyyy) {
    const month = parseInt(mmYyyy[1], 10);
    const year = parseInt(mmYyyy[2], 10);
    return {
      year,
      month,
      isCurrent: false,
      raw: str,
      timestamp: new Date(year, month - 1, 1).getTime(),
    };
  }

  // Month YYYY or Mon YYYY (e.g. "January 2021", "Jan 2021")
  const monthYyyy = str.match(/\b([A-Za-z]+)\.?\s+(\d{4})\b/);
  if (monthYyyy) {
    const monStr = monthYyyy[1].toLowerCase().slice(0, 3);
    const month = MONTH_NAMES[monStr] || 1;
    const year = parseInt(monthYyyy[2], 10);
    return {
      year,
      month,
      isCurrent: false,
      raw: str,
      timestamp: new Date(year, month - 1, 1).getTime(),
    };
  }

  // Single 4-digit Year (e.g. "2022")
  const yyyy = str.match(/\b(19\d{2}|20\d{2})\b/);
  if (yyyy) {
    const year = parseInt(yyyy[1], 10);
    return {
      year,
      month: 1,
      isCurrent: false,
      raw: str,
      timestamp: new Date(year, 0, 1).getTime(),
    };
  }

  return null;
};

/**
 * Extract date range from text (e.g., "05/2020 - Present", "Jan 2019 – Dec 2022")
 *
 * @param {string} text - Text containing a date range
 * @returns {{ start: object|null, end: object|null, raw: string, isCurrent: boolean }}
 */
export const extractDateRange = (text) => {
  if (!text) return { start: null, end: null, raw: '', isCurrent: false };

  // Match: (Date 1) (separator) (Date 2 or Present)
  const rangePattern =
    /\b((?:(?:0?[1-9]|1[0-2])[\/.-]\d{4})|(?:[A-Za-z]+\.?\s+\d{4})|\d{4})\s*(?:[-–—to\s]+)\s*((?:(?:0?[1-9]|1[0-2])[\/.-]\d{4})|(?:[A-Za-z]+\.?\s+\d{4})|\d{4}|present|current|ongoing|now)\b/i;

  const match = text.match(rangePattern);
  if (match) {
    const start = parseDateToken(match[1]);
    const end = parseDateToken(match[2]);
    const isCurrent = end ? end.isCurrent : /present|current|ongoing|now/i.test(match[2]);

    return {
      start,
      end,
      raw: match[0],
      isCurrent,
    };
  }

  // Single date fallback (e.g. Graduation "May 2022")
  const single = parseDateToken(text);
  if (single) {
    return {
      start: single,
      end: single,
      raw: single.raw,
      isCurrent: single.isCurrent,
    };
  }

  return { start: null, end: null, raw: '', isCurrent: false };
};

// ==========================================
// 3. ENTITY EXTRACTORS
// ==========================================

/**
 * Extract Contact Information
 *
 * @param {string} contactText - Text from contact section or top header
 * @param {string} fullText - Complete resume text as fallback
 * @returns {object} Structured contact details
 */
export const extractContactInfo = (contactText, fullText = '') => {
  const source = (contactText && contactText.length > 10 ? contactText : fullText).slice(0, 2500);

  // 1. Email
  const emailMatch = source.match(/\b([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})\b/);
  const email = emailMatch ? emailMatch[1].toLowerCase() : null;

  // 2. Phone
  // Supports: +1-555-123-4567, (555) 123-4567, +91 98765 43210, +44 20 7946 0958
  const phonePattern =
    /(?:(?:\+?\d{1,3}[\s-]?)?(?:\(?\d{2,4}\)?[\s-]?)?\d{3,4}[\s-]?\d{3,4}|\+?\d{10,14})/;
  const phoneMatch = source.match(phonePattern);
  // Ensure match has at least 7 digits to avoid matching years or random numbers
  const phoneDigits = phoneMatch ? phoneMatch[0].replace(/\D/g, '') : '';
  const phone = phoneDigits.length >= 7 && phoneDigits.length <= 15 ? phoneMatch[0].trim() : null;

  // 3. Professional Links
  const linkedinMatch = source.match(
    /(?:https?:\/\/)?(?:[a-zA-Z0-9-]+\.)?linkedin\.com\/(?:in|pub)\/([a-zA-Z0-9_\-\.]+)\/?/i
  );
  const linkedin = linkedinMatch
    ? (linkedinMatch[0].startsWith('http') ? linkedinMatch[0] : `https://${linkedinMatch[0]}`)
    : null;

  const githubMatch = source.match(
    /(?:https?:\/\/)?(?:[a-zA-Z0-9-]+\.)?github\.com\/([a-zA-Z0-9_\-]+)\/?/i
  );
  const github = githubMatch
    ? (githubMatch[0].startsWith('http') ? githubMatch[0] : `https://${githubMatch[0]}`)
    : null;

  // Generic portfolio / website
  const urlMatches = source.match(/https?:\/\/[^\s,;<>"]+/gi) || [];
  const portfolio =
    urlMatches.find((u) => !u.includes('linkedin.com') && !u.includes('github.com')) || null;

  // 4. Candidate Name Heuristic
  // Typically the very first non-empty line of the resume before email/phone
  let fullName = null;
  const lines = (contactText || fullText).split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    // Exclude noise, URLs, emails, headings
    if (
      trimmed.length >= 2 &&
      trimmed.length <= 45 &&
      !trimmed.includes('@') &&
      !trimmed.includes('http') &&
      !trimmed.includes('/') &&
      !/^(?:resume|curriculum\s+vitae|cv|contact|portfolio|page\s+\d+)/i.test(trimmed) &&
      !/^\d+/.test(trimmed) &&
      /^[A-Za-z\s.'-]+$/.test(trimmed)
    ) {
      fullName = trimmed;
      break;
    }
  }

  // 5. Location Heuristics
  // Matches "City, State", "City, Country", "City, ST ZIP"
  let location = null;
  const locationMatch = source.match(
    /\b([A-Z][a-zA-Z\s.-]+),\s*([A-Z]{2}|[A-Z][a-zA-Z\s]+)(?:\s+(\d{5}(?:-\d{4})?))?\b/
  );
  if (locationMatch) {
    location = {
      raw: locationMatch[0].trim(),
      city: locationMatch[1].trim(),
      stateOrCountry: locationMatch[2].trim(),
      postalCode: locationMatch[3] || null,
      isStreetAddressPresent: /\b\d{1,5}\s+[A-Za-z0-9\s.,]+(?:st|street|ave|avenue|rd|road|blvd|lane|drive|dr)\b/i.test(
        source
      ),
    };
  }

  return {
    fullName,
    email,
    phone,
    location,
    links: {
      linkedin,
      github,
      portfolio,
      all: urlMatches,
    },
  };
};

/**
 * Extract Education Entries
 *
 * @param {string} educationText - Raw text from education section
 * @returns {Array<object>} Array of structured education items
 */
export const extractEducation = (educationText) => {
  if (!educationText || educationText.trim().length === 0) return [];

  const items = [];
  // Split into paragraphs or blocks
  const blocks = educationText
    .split(/\n{2,}|\n(?=[A-Z][a-zA-Z\s&]+(?:University|College|Institute|School|Academy|Polytechnic))/i)
    .filter((b) => b.trim().length > 0);

  for (const block of blocks) {
    const text = block.trim();

    // 1. Degree
    let degree = null;
    let degreeLevel = null;
    for (const deg of COMMON_DEGREES) {
      const match = text.match(deg.pattern);
      if (match) {
        degree = match[0].trim();
        degreeLevel = deg.level;
        break;
      }
    }

    // 2. Institution
    let institution = null;
    const instMatch = text.match(
      /\b([A-Z][a-zA-Z\s&.,'-]+(?:University|College|Institute|School|Academy|Polytechnic))\b/i
    );
    if (instMatch) {
      institution = instMatch[0].trim();
    } else {
      // Fallback: first capitalized line
      const firstLine = text.split('\n')[0].trim();
      if (firstLine.length > 3 && firstLine.length < 60) {
        institution = firstLine;
      }
    }

    // 3. Field of Study / Major
    let major = null;
    const majorMatch = text.match(
      /(?:in|of)\s+([A-Za-z\s&/]+?)(?:\s*\(|,|\n|–|-|\d{4}|$)/i
    );
    if (majorMatch && majorMatch[1].trim().length > 2 && majorMatch[1].trim().length < 40) {
      major = majorMatch[1].trim();
    }

    // 4. Dates
    const dates = extractDateRange(text);

    // 5. GPA
    let gpa = null;
    const gpaMatch = text.match(/\b(?:GPA|CGPA)[:\s]*([0-4]\.\d{1,2}(?:\s*\/\s*4(?:\.0)?)?|[0-9]\.?\d*(?:\s*\/\s*10)?)\b/i);
    if (gpaMatch) {
      gpa = gpaMatch[1].trim();
    }

    // 6. Honors
    const honors = [];
    if (/summa\s+cum\s+laude/i.test(text)) honors.push('Summa Cum Laude');
    if (/magna\s+cum\s+laude/i.test(text)) honors.push('Magna Cum Laude');
    if (/cum\s+laude/i.test(text)) honors.push('Cum Laude');
    if (/dean'?s\s+list/i.test(text)) honors.push("Dean's List");
    if (/first\s+class/i.test(text)) honors.push('First Class');

    if (institution || degree) {
      items.push({
        institution: institution || 'Unknown Institution',
        degree: degree || 'Degree',
        degreeLevel,
        major,
        startDate: dates.start,
        endDate: dates.end,
        graduationYear: dates.end ? dates.end.year : dates.start ? dates.start.year : null,
        gpa,
        honors,
        rawText: text,
      });
    }
  }

  return items;
};

/**
 * Extract Work Experience Entries & Bullet Points
 *
 * @param {string} experienceText - Raw text from experience section
 * @returns {Array<object>} Array of structured work experience items
 */
export const extractExperience = (experienceText) => {
  if (!experienceText || experienceText.trim().length === 0) return [];

  const items = [];
  const lines = experienceText.split('\n');

  let currentRole = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const dateRange = extractDateRange(line);
    const isBullet = /^[-*•–—+]\s+/i.test(line) || /^\d+\.\s+/i.test(line);

    // If line contains a clear date range or is not a bullet and followed by a date range, it may be a new role
    if (dateRange.raw && !isBullet) {
      // Check if currentRole was just initialized on preceding line without dates or bullets (2-line header pattern)
      if (currentRole && !currentRole.startDate && currentRole.bullets.length === 0) {
        currentRole.startDate = dateRange.start;
        currentRole.endDate = dateRange.end;
        currentRole.isCurrent = dateRange.isCurrent;
        currentRole.rawText += '\n' + line;
        const rest = line.replace(dateRange.raw, '').replace(/^[|•–—,-]+|[|•–—,-]+$/g, '').trim();
        if (rest && !currentRole.location) {
          currentRole.location = rest;
        }
        continue;
      }

      // Save previous role
      if (currentRole) {
        items.push(currentRole);
      }

      // Title/Company heuristic from current or previous line
      const cleanHeader = line.replace(dateRange.raw, '').replace(/[|•–—,-]+$/, '').trim();
      let title = cleanHeader;
      let company = 'Company';

      // Check if title and company are separated by '|', '–', '-', ' at '
      const sepMatch = cleanHeader.match(/^(.+?)\s*(?:\||–|-|\bat\b)\s*(.+)$/i);
      if (sepMatch) {
        title = sepMatch[1].trim();
        company = sepMatch[2].trim();
      } else if (i > 0 && lines[i - 1].trim() && !/^[-*•–—+]/i.test(lines[i - 1])) {
        // Maybe company was on the preceding line
        company = lines[i - 1].trim();
      }

      currentRole = {
        title: title || 'Professional Role',
        company: company || 'Organization',
        location: null,
        startDate: dateRange.start,
        endDate: dateRange.end,
        isCurrent: dateRange.isCurrent,
        bullets: [],
        rawText: line,
      };
      continue;
    }

    if (isBullet && currentRole) {
      // Clean bullet content
      const bulletText = line.replace(/^[-*•–—+\d.]+\s*/, '').trim();
      if (bulletText.length > 5) {
        const words = bulletText.split(/\s+/).filter(Boolean);
        const firstWord = words[0] ? words[0].toLowerCase().replace(/[^a-z]/g, '') : '';
        const isActionVerb = ACTION_VERBS.has(firstWord);
        const hasMetric = /[\d]+%|\$[\d,]+|\b\d+x\b|\b\d{2,}\b|\b\d+\s*(?:k|m|million|billion)\b/i.test(
          bulletText
        );

        currentRole.bullets.push({
          text: bulletText,
          wordCount: words.length,
          firstWord,
          isActionVerb,
          hasMetric,
        });
      }
      currentRole.rawText += '\n' + line;
    } else if (currentRole && currentRole.bullets.length > 0 && !isBullet) {
      // New role starting with title/company before its date line
      items.push(currentRole);
      let title = line;
      let company = 'Organization';
      const sepMatch = line.match(/^(.+?)\s*(?:\||–|-|\bat\b)\s*(.+)$/i);
      if (sepMatch) {
        title = sepMatch[1].trim();
        company = sepMatch[2].trim();
      }
      currentRole = {
        title: title || 'Professional Role',
        company: company || 'Organization',
        location: null,
        startDate: null,
        endDate: null,
        isCurrent: false,
        bullets: [],
        rawText: line,
      };
    } else if (currentRole && line.length > 0) {
      // Continuation line or non-bullet role summary
      currentRole.rawText += '\n' + line;
    } else if (!currentRole) {
      // First line before finding date range
      let title = line;
      let company = 'Organization';
      const sepMatch = line.match(/^(.+?)\s*(?:\||–|-|\bat\b)\s*(.+)$/i);
      if (sepMatch) {
        title = sepMatch[1].trim();
        company = sepMatch[2].trim();
      }
      currentRole = {
        title: title || 'Professional Role',
        company: company || 'Organization',
        location: null,
        startDate: null,
        endDate: null,
        isCurrent: false,
        bullets: [],
        rawText: line,
      };
    }
  }

  if (currentRole) {
    items.push(currentRole);
  }

  return items;
};

/**
 * Extract Project Entries
 *
 * @param {string} projectsText - Raw text from projects section
 * @returns {Array<object>} Array of structured project items
 */
export const extractProjects = (projectsText) => {
  if (!projectsText || projectsText.trim().length === 0) return [];

  const items = [];
  const lines = projectsText.split('\n');
  let currentProject = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const isBullet = /^[-*•–—+]\s+/i.test(trimmed);

    if (!isBullet && trimmed.length < 75 && !currentProject) {
      currentProject = {
        title: trimmed,
        description: '',
        technologies: [],
        link: null,
        bullets: [],
      };
      continue;
    }

    if (!isBullet && trimmed.length < 75 && currentProject && currentProject.bullets.length > 0) {
      items.push(currentProject);
      currentProject = {
        title: trimmed,
        description: '',
        technologies: [],
        link: null,
        bullets: [],
      };
      continue;
    }

    if (currentProject) {
      // Check for project URLs
      const urlMatch = trimmed.match(/https?:\/\/[^\s,;<>"]+/i);
      if (urlMatch && !currentProject.link) {
        currentProject.link = urlMatch[0];
      }

      if (isBullet) {
        const bulletText = trimmed.replace(/^[-*•–—+\d.]+\s*/, '').trim();
        currentProject.bullets.push(bulletText);
      } else {
        currentProject.description += (currentProject.description ? ' ' : '') + trimmed;
      }
    }
  }

  if (currentProject) {
    items.push(currentProject);
  }

  return items;
};

/**
 * Extract Skills Matrix
 *
 * @param {string} skillsText - Text from skills section
 * @param {string} fullText - Complete resume text
 * @returns {object} Categorized skills and flat list
 */
export const extractSkills = (skillsText, fullText = '') => {
  const combined = (skillsText || '') + '\n' + (fullText || '');

  const categorized = {
    languages: [],
    frameworks: [],
    databases: [],
    cloudDevOps: [],
    tools: [],
  };

  const detectedTech = new Set();
  const detectedSoft = new Set();

  // Search for technical skills
  for (const [category, skillList] of Object.entries(COMMON_TECH_SKILLS)) {
    for (const skill of skillList) {
      // Match whole word, escaping regex characters (e.g. C++, Node.js)
      const escaped = skill.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
      const pattern = new RegExp(`(?:^|[^a-zA-Z0-9_#+])${escaped}(?:$|[^a-zA-Z0-9_#+])`, 'i');
      if (pattern.test(combined)) {
        if (!categorized[category].includes(skill)) {
          categorized[category].push(skill);
        }
        detectedTech.add(skill);
      }
    }
  }

  // Search for soft skills
  for (const soft of COMMON_SOFT_SKILLS) {
    const escaped = soft.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    const pattern = new RegExp(`\\b${escaped}\\b`, 'i');
    if (pattern.test(combined)) {
      detectedSoft.add(soft);
    }
  }

  return {
    technical: Array.from(detectedTech),
    soft: Array.from(detectedSoft),
    categories: categorized,
    totalCount: detectedTech.size + detectedSoft.size,
  };
};

/**
 * Extract Certifications
 *
 * @param {string} certText - Text from certifications section
 * @returns {Array<object>} Array of certification items
 */
export const extractCertifications = (certText) => {
  if (!certText || certText.trim().length === 0) return [];

  const items = [];
  const lines = certText.split('\n');

  for (const line of lines) {
    const trimmed = line.replace(/^[-*•–—+\d.]+\s*/, '').trim();
    if (trimmed.length < 4 || trimmed.length > 100) continue;

    // Detect year or date
    const dateMatch = trimmed.match(/\b(19\d{2}|20\d{2})\b/);
    const year = dateMatch ? parseInt(dateMatch[1], 10) : null;

    // Detect issuer
    let issuer = null;
    const commonIssuers = [
      'AWS', 'Amazon Web Services', 'Google Cloud', 'Google', 'Microsoft', 'Azure',
      'Cisco', 'CompTIA', 'Linux Foundation', 'PMI', 'Scrum Alliance', 'HashiCorp',
    ];
    for (const iss of commonIssuers) {
      if (new RegExp(`\\b${iss}\\b`, 'i').test(trimmed)) {
        issuer = iss;
        break;
      }
    }

    items.push({
      name: trimmed.replace(/\s*\(\d{4}\)$/, '').trim(),
      issuer,
      year,
      raw: trimmed,
    });
  }

  return items;
};

/**
 * Analyze Timeline & Detect Career Breaks (Advisory / Non-penalizing)
 *
 * @param {Array<object>} experienceItems - Structured experience roles
 * @returns {object} Timeline analysis results
 */
export const analyzeTimeline = (experienceItems) => {
  if (!Array.isArray(experienceItems) || experienceItems.length === 0) {
    return {
      isChronological: true,
      hasConsistentDateFormats: true,
      careerGaps: [],
      totalExperienceMonths: 0,
    };
  }

  // Filter items with valid start dates
  const datedRoles = experienceItems
    .map((r) => ({
      ...r,
      startTime: r.startDate ? r.startDate.timestamp : 0,
      endTime: r.endDate ? r.endDate.timestamp : Date.now(),
    }))
    .filter((r) => r.startTime > 0);

  // Check reverse-chronological order: role[i].startTime >= role[i+1].startTime
  let isChronological = true;
  for (let i = 0; i < datedRoles.length - 1; i++) {
    if (datedRoles[i].startTime < datedRoles[i + 1].startTime) {
      isChronological = false;
      break;
    }
  }

  // Detect Career Breaks (> 6 months / ~180 days gap between successive roles)
  // Sorted descending by startTime
  const sorted = [...datedRoles].sort((a, b) => b.startTime - a.startTime);
  const careerGaps = [];
  const SIX_MONTHS_MS = 180 * 24 * 60 * 60 * 1000;

  for (let i = 0; i < sorted.length - 1; i++) {
    const currentRole = sorted[i];
    const previousRole = sorted[i + 1];

    // Gap between previousRole end and currentRole start
    if (currentRole.startTime > previousRole.endTime) {
      const diffMs = currentRole.startTime - previousRole.endTime;
      if (diffMs > SIX_MONTHS_MS) {
        const gapMonths = Math.round(diffMs / (30.44 * 24 * 60 * 60 * 1000));
        careerGaps.push({
          fromYear: new Date(previousRole.endTime).getFullYear(),
          toYear: new Date(currentRole.startTime).getFullYear(),
          durationMonths: gapMonths,
          // Guardrail reminder: This gap is purely advisory and MUST NOT penalize scoring
          isNonPenalizing: true,
        });
      }
    }
  }

  return {
    isChronological,
    hasConsistentDateFormats: true,
    careerGaps,
    roleCount: experienceItems.length,
  };
};

/**
 * Universal Master Structured Extractor:
 * Coordinates all extraction routines and combines results into a unified payload
 *
 * @param {string} fullText - Complete resume text
 * @param {object} rawSections - Section text map from segmentResumeSections
 * @returns {object} Exhaustive structured resume entities
 */
export const extractStructuredResumeData = (fullText, rawSections = {}) => {
  const contact = extractContactInfo(rawSections.contact || '', fullText);
  const education = extractEducation(rawSections.education || '');
  const experienceText = (rawSections.experience || '') + '\n' + (rawSections.employment || '');
  const experience = extractExperience(experienceText);
  const projects = extractProjects(rawSections.projects || '');
  const skillsText =
    (rawSections.technicalSkills || '') +
    '\n' +
    (rawSections.softSkills || '') +
    '\n' +
    (rawSections.skills || '');
  const skills = extractSkills(skillsText, fullText);
  const certifications = extractCertifications(rawSections.certifications || '');
  const timeline = analyzeTimeline(experience);

  return {
    contact,
    summary: rawSections.summary || rawSections.objective || '',
    education,
    experience,
    projects,
    skills,
    certifications,
    timeline,
  };
};

export default {
  parseDateToken,
  extractDateRange,
  extractContactInfo,
  extractEducation,
  extractExperience,
  extractProjects,
  extractSkills,
  extractCertifications,
  analyzeTimeline,
  extractStructuredResumeData,
};
