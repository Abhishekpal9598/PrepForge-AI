/**
 * PrepForge AI — Technical Casing Taxonomy & Common Spelling Errors
 *
 * Provides deterministic dictionaries to catch technical casing mismatches
 * and high-frequency resume typos.
 */

export const TECHNICAL_CASING_DICTIONARY = {
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  postgresql: 'PostgreSQL',
  postgres: 'Postgres',
  graphql: 'GraphQL',
  kubernetes: 'Kubernetes',
  mongodb: 'MongoDB',
  github: 'GitHub',
  gitlab: 'GitLab',
  docker: 'Docker',
  mysql: 'MySQL',
  nosql: 'NoSQL',
  html5: 'HTML5',
  css3: 'CSS3',
  restful: 'RESTful',
  redux: 'Redux',
  reactjs: 'React.js',
  nodejs: 'Node.js',
  nextjs: 'Next.js',
  vuejs: 'Vue.js',
  webpack: 'Webpack',
  tailwind: 'Tailwind CSS',
  fastapi: 'FastAPI',
  sqlite: 'SQLite',
  dynamodb: 'DynamoDB',
  devops: 'DevOps',
  cicd: 'CI/CD',
};

export const COMMON_RESUME_TYPOS = {
  developement: 'development',
  managment: 'management',
  responsable: 'responsible',
  tehnology: 'technology',
  experiance: 'experience',
  succesful: 'successful',
  enviroment: 'environment',
  maintainance: 'maintenance',
  implemention: 'implementation',
  colaberation: 'collaboration',
  acheive: 'achieve',
  acheived: 'achieved',
  reponsibilities: 'responsibilities',
  proffesional: 'professional',
  independant: 'independent',
  seperate: 'separate',
  occured: 'occurred',
  refering: 'referring',
  commited: 'committed',
  superseeded: 'superseded',
  neccessary: 'necessary',
  peformance: 'performance',
  architecure: 'architecture',
  implimented: 'implemented',
};

/**
 * Evaluates text for common spelling typos and technical casing mismatches
 *
 * @param {string} text
 * @returns {{ typos: Array<{ found: string, suggestion: string }>, casingIssues: Array<{ found: string, expected: string }> }}
 */
export const checkSpellingAndCasing = (text) => {
  if (!text || typeof text !== 'string') {
    return { typos: [], casingIssues: [] };
  }

  const typos = [];
  const casingIssues = [];

  // 1. Check for known typos (case-insensitive)
  for (const [typo, correction] of Object.entries(COMMON_RESUME_TYPOS)) {
    const regex = new RegExp(`\\b${typo}\\b`, 'gi');
    let match;
    while ((match = regex.exec(text)) !== null) {
      if (!typos.some((t) => t.found.toLowerCase() === typo)) {
        typos.push({
          found: match[0],
          suggestion: correction,
        });
      }
    }
  }

  // 2. Check for technical casing mismatches
  // Look for exact word boundaries where lowercased form matches dictionary key
  // but verbatim token in text differs from the standard canonical casing.
  for (const [key, canonical] of Object.entries(TECHNICAL_CASING_DICTIONARY)) {
    // Avoid checking if key contains special chars in simple word regex
    const escaped = key.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
    let match;
    while ((match = regex.exec(text)) !== null) {
      const actualToken = match[0];
      // If it's all lowercased or improperly capitalized (e.g. "Javascript" instead of "JavaScript")
      if (actualToken !== canonical && actualToken !== canonical.toUpperCase()) {
        if (!casingIssues.some((c) => c.found.toLowerCase() === actualToken.toLowerCase())) {
          casingIssues.push({
            found: actualToken,
            expected: canonical,
          });
        }
      }
    }
  }

  return { typos, casingIssues };
};

export default {
  TECHNICAL_CASING_DICTIONARY,
  COMMON_RESUME_TYPOS,
  checkSpellingAndCasing,
};
