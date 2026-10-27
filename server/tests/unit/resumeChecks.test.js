import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Import Category Check Handlers
import {
  checkFileFormatAndParsing,
  checkAtsLayout,
  checkProfessionalEmail,
  checkProfessionalLinks,
  checkFileNamingConvention,
  checkDatesAndLinksConsistency,
} from '../../src/services/resumeChecks/categories/atsEssentials.js';

import {
  checkEssentialSections,
  checkContactCompleteness,
  checkSectionOrdering,
} from '../../src/services/resumeChecks/categories/resumeSections.js';

import {
  checkAtsParseRate,
  checkQuantifiedAchievements,
  checkRepeatedWordsAndBuzzwords,
  checkSpellingAndCasingCheck,
  checkBulletLengthAndConsistency,
} from '../../src/services/resumeChecks/categories/resumeContent.js';

import {
  checkTimelineCredibility,
  checkInterviewRiskSignals,
  checkProfessionalPresenceMatch,
} from '../../src/services/resumeChecks/categories/recruiterRedFlags.js';

import {
  checkCareerProgression,
  checkSkillsDemonstrationContext,
  checkOwnershipAndLeadership,
} from '../../src/services/resumeChecks/categories/seniorityImpact.js';

describe('Suite: Comprehensive 27-Point Resume Checks', () => {
  // --- Category 1: ATS Essentials ---
  describe('Category 1: ATS Essentials (CHK-01 to CHK-06)', () => {
    it('CHK-01: Passes on valid selectable text and fails on <20 chars (critical cap)', () => {
      const valid = checkFileFormatAndParsing({ fileFormat: 'pdf', extractedText: 'Valid selectable text stream with enough characters.' });
      assert.equal(valid.status, 'PASS');
      assert.equal(valid.checkId, 'CHK-01');

      const corrupt = checkFileFormatAndParsing({ fileFormat: 'pdf', extractedText: 'Short' });
      assert.equal(corrupt.status, 'FAIL');
      assert.equal(corrupt.severity, 'critical');
      assert.ok(corrupt.explanation.includes('Critical parsing failure'));
    });

    it('CHK-02: Passes on linear layout and warns on heavy table dividers', () => {
      const linear = checkAtsLayout({ extractedText: 'Clean linear single-column resume text without tables.' });
      assert.equal(linear.status, 'PASS');

      const tableText = `
        +---------------+---------------+
        | Role          | Company       |
        +---------------+---------------+
        | Developer     | Acme          |
        +---------------+---------------+
        | Lead          | Beta          |
        +---------------+---------------+
      `;
      const table = checkAtsLayout({ extractedText: tableText });
      assert.equal(table.status, 'WARNING');
      assert.equal(table.severity, 'high');
    });

    it('CHK-03: Passes on standard email, warns on trailing digits/slang, fails on missing', () => {
      const clean = checkProfessionalEmail({ parsedSections: { structured: { contact: { email: 'john.doe@gmail.com' } } } });
      assert.equal(clean.status, 'PASS');

      const digits = checkProfessionalEmail({ parsedSections: { structured: { contact: { email: 'gamerboy19984729@yahoo.com' } } } });
      assert.equal(digits.status, 'WARNING');

      const missing = checkProfessionalEmail({ parsedSections: { structured: { contact: {} } } });
      assert.equal(missing.status, 'FAIL');
    });

    it('CHK-04: Passes when professional links present, warns when zero links', () => {
      const withLinks = checkProfessionalLinks({
        parsedSections: {
          structured: {
            contact: {
              links: ['https://linkedin.com/in/johndoe', 'https://github.com/johndoe'],
            },
          },
        },
      });
      assert.equal(withLinks.status, 'PASS');

      const noLinks = checkProfessionalLinks({
        parsedSections: { structured: { contact: { links: [] } } },
      });
      assert.equal(noLinks.status, 'WARNING');
    });

    it('CHK-05: Passes on personalized file name, warns on generic file name', () => {
      const good = checkFileNamingConvention({ originalFileName: 'John_Doe_Resume_2026.pdf' });
      assert.equal(good.status, 'PASS');

      const generic = checkFileNamingConvention({ originalFileName: 'resume.pdf' });
      assert.equal(generic.status, 'WARNING');
      assert.equal(generic.severity, 'low');
    });

    it('CHK-06: Passes on uniform date formats, warns on mixed date formats', () => {
      const uniform = checkDatesAndLinksConsistency({
        parsedSections: {
          structured: {
            experience: [
              { dateRange: { raw: '05/2020 - 08/2022' } },
              { dateRange: { raw: '09/2022 - 12/2024' } },
            ],
          },
        },
      });
      assert.equal(uniform.status, 'PASS');

      const mixed = checkDatesAndLinksConsistency({
        parsedSections: {
          structured: {
            experience: [
              { dateRange: { raw: '05/2020 - 08/2022' } },
              { dateRange: { raw: 'September 2022 - Present' } },
            ],
          },
        },
      });
      assert.equal(mixed.status, 'WARNING');
    });
  });

  // --- Category 2: Resume Sections ---
  describe('Category 2: Resume Sections (CHK-07 to CHK-09)', () => {
    it('CHK-07: Passes when all core sections present, fails when core missing', () => {
      const complete = checkEssentialSections({
        parsedSections: {
          missingCoreSections: [],
          detectedSections: [
            { canonicalKey: 'contact' },
            { canonicalKey: 'experience' },
            { canonicalKey: 'education' },
            { canonicalKey: 'technicalSkills' },
          ],
        },
      });
      assert.equal(complete.status, 'PASS');

      const missing = checkEssentialSections({
        parsedSections: {
          missingCoreSections: ['experience'],
          detectedSections: [
            { canonicalKey: 'contact' },
            { canonicalKey: 'education' },
            { canonicalKey: 'technicalSkills' },
          ],
        },
      });
      assert.equal(missing.status, 'FAIL');
      assert.equal(missing.severity, 'critical');
    });

    it('CHK-08: Complete contact passes; missing phone warns (never ATS hard-cap); missing email fails', () => {
      const full = checkContactCompleteness({
        parsedSections: {
          structured: {
            contact: { email: 'john@example.com', phone: '+1 555-0199', location: 'Seattle, WA' },
          },
        },
      });
      assert.equal(full.status, 'PASS');

      const phoneMissing = checkContactCompleteness({
        parsedSections: {
          structured: {
            contact: { email: 'john@example.com', location: 'Remote' },
          },
        },
      });
      assert.equal(phoneMissing.status, 'WARNING');
      assert.ok(phoneMissing.explanation.includes('No telephone number'));

      const emailMissing = checkContactCompleteness({
        parsedSections: {
          structured: {
            contact: { phone: '+1 555-0199' },
          },
        },
      });
      assert.equal(emailMissing.status, 'FAIL');
    });

    it('CHK-09: Section ordering verifies traditional hierarchy', () => {
      const valid = checkSectionOrdering({
        parsedSections: {
          sectionOrder: ['contact', 'summary', 'experience', 'education', 'technicalSkills'],
        },
      });
      assert.equal(valid.status, 'PASS');

      const inverted = checkSectionOrdering({
        parsedSections: {
          sectionOrder: ['technicalSkills', 'education', 'experience', 'contact'],
        },
      });
      assert.equal(inverted.status, 'WARNING');
    });
  });

  // --- Category 3: Resume Content ---
  describe('Category 3: Resume Content (CHK-10 to CHK-14)', () => {
    it('CHK-10: Evaluates ATS parse rate with coaching guideline thresholds', () => {
      const highRate = checkAtsParseRate({
        extractedText: 'A'.repeat(1000),
        parsedSections: {
          detectedSections: [{ characterCount: 900 }],
        },
      });
      assert.equal(highRate.status, 'PASS');

      const lowRate = checkAtsParseRate({
        extractedText: 'A'.repeat(1000),
        parsedSections: {
          detectedSections: [{ characterCount: 500 }],
        },
      });
      assert.equal(lowRate.status, 'FAIL');
    });

    it('CHK-11: Detects quantified achievements (>=40% pass, <25% fail)', () => {
      const strong = checkQuantifiedAchievements({
        parsedSections: {
          structured: {
            experience: [
              {
                bullets: [
                  'Increased throughput by 45% using Node.js clustering.',
                  'Reduced cloud cost by $12,000 annually.',
                  'Optimized database latency by 35ms.',
                  'Implemented CI/CD pipelines.',
                ],
              },
            ],
          },
        },
      });
      assert.equal(strong.status, 'PASS'); // 3 of 4 = 75%

      const weak = checkQuantifiedAchievements({
        parsedSections: {
          structured: {
            experience: [
              {
                bullets: [
                  'Worked on backend services in 2022.',
                  'Assisted teammates with daily tasks.',
                  'Helped deploy code.',
                  'Attended meetings.',
                ],
              },
            ],
          },
        },
      });
      assert.equal(weak.status, 'FAIL');
    });

    it('CHK-12: Flags clichés, buzzwords, and repeated verbs', () => {
      const buzz = checkRepeatedWordsAndBuzzwords({
        extractedText: 'I am a rockstar ninja and results-driven team player who thinks outside the box.',
      });
      assert.equal(buzz.status, 'WARNING');

      const clean = checkRepeatedWordsAndBuzzwords({
        extractedText: 'Software engineer who architected microservices and automated infrastructure.',
      });
      assert.equal(clean.status, 'PASS');
    });

    it('CHK-13: Detects common typos and technical casing errors', () => {
      const clean = checkSpellingAndCasingCheck({
        extractedText: 'Developed backend microservices using TypeScript, PostgreSQL, and Docker.',
      });
      assert.equal(clean.status, 'PASS');

      const typos = checkSpellingAndCasingCheck({
        extractedText: 'Responsible for developement and maintainance of databases using Javascript and postgresql.',
      });
      assert.equal(typos.status, 'FAIL');
      assert.ok(typos.evidence.length >= 3);
    });

    it('CHK-14: Evaluates bullet length and punctuation consistency', () => {
      const goodBullets = [
        'Architected a distributed payment gateway handling over 10,000 transactions per minute with zero downtime.',
        'Spearheaded automated migration of 15 microservices into Kubernetes clusters using Helm charts and ArgoCD.',
        'Engineered an event-driven telemetry pipeline aggregating server health metrics across 40 nodes.',
      ];
      const res = checkBulletLengthAndConsistency({
        parsedSections: { structured: { experience: [{ bullets: goodBullets }] } },
      });
      assert.equal(res.status, 'PASS');
    });
  });

  // --- Category 5: Recruiter Red Flags ---
  describe('Category 5: Recruiter Red Flags (CHK-19, CHK-20, CHK-22)', () => {
    it('CHK-19: Detects timeline discrepancies (inverted dates or future dates)', () => {
      const valid = checkTimelineCredibility({
        parsedSections: {
          structured: {
            experience: [
              { title: 'Engineer', dateRange: { startYear: 2021, endYear: 2024 } },
            ],
          },
        },
      });
      assert.equal(valid.status, 'PASS');

      const inverted = checkTimelineCredibility({
        parsedSections: {
          structured: {
            experience: [
              { title: 'Engineer', dateRange: { startYear: 2024, endYear: 2021 } },
            ],
          },
        },
      });
      assert.equal(inverted.status, 'FAIL');
      assert.equal(inverted.severity, 'high');
    });

    it('CHK-20: Detects excessive collective attribution ("we / the team")', () => {
      const collective = checkInterviewRiskSignals({
        parsedSections: {
          structured: {
            experience: [
              {
                bullets: [
                  'We built the microservice system.',
                  'Our team migrated the database.',
                  'The team handled production issues.',
                ],
              },
            ],
          },
        },
      });
      assert.equal(collective.status, 'WARNING');

      const accountable = checkInterviewRiskSignals({
        parsedSections: {
          structured: {
            experience: [
              {
                bullets: [
                  'Architected distributed microservices.',
                  'Engineered database migration scripts.',
                  'Debugged critical production outages.',
                ],
              },
            ],
          },
        },
      });
      assert.equal(accountable.status, 'PASS');
    });

    it('CHK-22: Detects coherence between claimed years in summary and timeline', () => {
      const aligned = checkProfessionalPresenceMatch({
        parsedSections: {
          rawSections: { summary: 'Senior Engineer with 5+ years experience.' },
          structured: { timeline: { totalExperienceYears: 6 } },
        },
      });
      assert.equal(aligned.status, 'PASS');

      const discrepancy = checkProfessionalPresenceMatch({
        parsedSections: {
          rawSections: { summary: 'Senior Architect with 15+ years experience.' },
          structured: { timeline: { totalExperienceYears: 2 } },
        },
      });
      assert.equal(discrepancy.status, 'WARNING');
    });
  });

  // --- Category 7: Seniority and Impact ---
  describe('Category 7: Seniority and Impact (CHK-25 to CHK-27)', () => {
    it('CHK-25: Evaluates career progression trajectory', () => {
      const progression = checkCareerProgression({
        parsedSections: {
          structured: {
            experience: [
              { title: 'Lead Software Architect' },
              { title: 'Senior Software Engineer' },
              { title: 'Junior Developer' },
            ],
          },
        },
      });
      assert.equal(progression.status, 'PASS');

      const regression = checkCareerProgression({
        parsedSections: {
          structured: {
            experience: [
              { title: 'Junior Developer' },
              { title: 'VP of Engineering' },
            ],
          },
        },
      });
      assert.equal(regression.status, 'WARNING');
    });

    it('CHK-26: Evaluates skills demonstration in work bullets', () => {
      const demonstrated = checkSkillsDemonstrationContext({
        parsedSections: {
          structured: {
            skills: ['Node.js', 'TypeScript', 'Docker', 'AWS'],
            experience: [
              {
                bullets: [
                  'Built backend APIs in Node.js and TypeScript.',
                  'Containerized services using Docker on AWS.',
                ],
              },
            ],
          },
        },
      });
      assert.equal(demonstrated.status, 'PASS');

      const orphaned = checkSkillsDemonstrationContext({
        parsedSections: {
          structured: {
            skills: ['Node.js', 'TypeScript', 'Docker', 'AWS', 'Kubernetes', 'GraphQL', 'Rust', 'Kafka'],
            experience: [
              {
                bullets: [
                  'Built HTML pages and CSS styles.',
                ],
              },
            ],
          },
        },
      });
      assert.equal(orphaned.status, 'WARNING');
      assert.ok(orphaned.evidence.some((e) => e.includes('Orphaned skills')));
    });

    it('CHK-27: Identifies leadership and system architecture marks', () => {
      const leadership = checkOwnershipAndLeadership({
        parsedSections: {
          structured: {
            experience: [
              {
                bullets: [
                  'Architected new cloud event streaming platform.',
                  'Mentored 5 junior engineers and conducted weekly code reviews.',
                ],
              },
            ],
          },
        },
      });
      assert.equal(leadership.status, 'PASS');
      assert.ok(leadership.evidence.some((e) => e.includes('Leadership signals detected')));
    });
  });
});
