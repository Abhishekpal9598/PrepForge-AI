import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { runAllChecks, runSingleCheck } from '../../src/services/resumeChecks/checkRunner.js';
import { TOTAL_CHECKS_COUNT } from '../../src/services/resumeChecks/checkRegistry.js';

describe('Suite: Check Runner & Orchestration Engine', () => {
  const fullResume = {
    originalFileName: 'Jane_Doe_Staff_Engineer_Resume.pdf',
    fileFormat: 'pdf',
    fileSize: 1048576,
    extractedText: `
      Jane Doe
      Staff Cloud Engineer
      jane.doe@company.com | +1 555-0144 | Seattle, WA
      https://linkedin.com/in/janedoe | https://github.com/janedoe
      
      Professional Summary
      Staff Cloud Engineer with 8+ years experience designing resilient distributed systems.
      
      Technical Skills
      TypeScript, Node.js, Python, AWS, Docker, Kubernetes, PostgreSQL, GraphQL
      
      Professional Experience
      Staff Software Engineer — CloudScale Inc (01/2021 - Present)
      • Architected event-driven microservices processing 45,000 transactions per second.
      • Spearheaded Kubernetes containerization reducing infrastructure overhead by $120,000 annually.
      • Mentored 8 junior and mid-level engineers and established weekly architecture reviews.
      
      Senior Software Engineer — DataCore LLC (03/2017 - 12/2020)
      • Engineered RESTful APIs and optimized SQL queries reducing latency by 45ms.
      • Led cross-functional team of 6 engineers to deliver automated deployment pipelines.
      
      Education
      Bachelor of Science in Computer Science — University of Washington (2013 - 2017)
    `,
    parsedSections: {
      rawSections: {
        summary: 'Staff Cloud Engineer with 8+ years experience designing resilient distributed systems.',
        experience: 'Staff Software Engineer at CloudScale Inc\nSenior Software Engineer at DataCore LLC',
        skills: 'TypeScript, Node.js, Python, AWS, Docker, Kubernetes, PostgreSQL, GraphQL',
        education: 'Bachelor of Science in Computer Science',
      },
      detectedSections: [
        { canonicalKey: 'contact', characterCount: 150 },
        { canonicalKey: 'summary', characterCount: 90 },
        { canonicalKey: 'technicalSkills', characterCount: 100 },
        { canonicalKey: 'experience', characterCount: 650 },
        { canonicalKey: 'education', characterCount: 90 },
      ],
      sectionOrder: ['contact', 'summary', 'technicalSkills', 'experience', 'education'],
      missingCoreSections: [],
      structured: {
        contact: {
          email: 'jane.doe@company.com',
          phone: '+1 555-0144',
          location: 'Seattle, WA',
          links: ['https://linkedin.com/in/janedoe', 'https://github.com/janedoe'],
        },
        skills: ['TypeScript', 'Node.js', 'Python', 'AWS', 'Docker', 'Kubernetes', 'PostgreSQL', 'GraphQL'],
        experience: [
          {
            title: 'Staff Software Engineer',
            company: 'CloudScale Inc',
            dateRange: { startYear: 2021, endYear: 2026, isCurrent: true, raw: '01/2021 - Present' },
            bullets: [
              'Architected event-driven microservices processing 45,000 transactions per second.',
              'Spearheaded Kubernetes containerization reducing infrastructure overhead by $120,000 annually.',
              'Mentored 8 junior and mid-level engineers and established weekly architecture reviews.',
            ],
          },
          {
            title: 'Senior Software Engineer',
            company: 'DataCore LLC',
            dateRange: { startYear: 2017, endYear: 2020, raw: '03/2017 - 12/2020' },
            bullets: [
              'Engineered RESTful APIs and optimized SQL queries reducing latency by 45ms.',
              'Led cross-functional team of 6 engineers to deliver automated deployment pipelines.',
            ],
          },
        ],
        education: [
          {
            degree: 'Bachelor of Science in Computer Science',
            institution: 'University of Washington',
            dateRange: { startYear: 2013, endYear: 2017 },
          },
        ],
        timeline: {
          totalExperienceYears: 8.5,
          hasGaps: false,
          gaps: [],
        },
      },
    },
  };

  it('1. runAllChecks evaluates all 27 checks and produces standard summary', async () => {
    const result = await runAllChecks(fullResume);

    assert.equal(result.engineVersion, '1.0.0');
    assert.ok(result.evaluatedAt);
    assert.equal(typeof result.executionTimeMs, 'number');
    assert.equal(result.checks.length, TOTAL_CHECKS_COUNT);

    const summary = result.checkSummary;
    assert.equal(summary.totalChecks, 27);
    assert.equal(
      summary.passedCount + summary.warningCount + summary.failedCount + summary.notEvaluatedCount,
      27
    );

    // Job tailoring checks should be NOT_EVALUATED because no JD was passed
    assert.ok(summary.notEvaluatedCount >= 4, 'Job tailoring checks without JD should be NOT_EVALUATED');
  });

  it('2. Evaluates in under 50ms performance target', async () => {
    const result = await runAllChecks(fullResume);
    // Measure execution performance
    assert.ok(result.executionTimeMs < 50, `Execution time ${result.executionTimeMs}ms exceeded 50ms performance target`);
  });

  it('3. runSingleCheck evaluates a single check by ID', () => {
    const single = runSingleCheck('CHK-01', fullResume);
    assert.ok(single);
    assert.equal(single.checkId, 'CHK-01');
    assert.equal(single.status, 'PASS');

    const invalid = runSingleCheck('CHK-99', fullResume);
    assert.equal(invalid, null);
  });

  it('4. Fault tolerance: Single check error does not halt the 26 other checks', async () => {
    // Pass corrupted resume data where one section is an invalid type
    const partialCorrupt = {
      ...fullResume,
      parsedSections: {
        ...fullResume.parsedSections,
        detectedSections: null, // might cause error if not guarded
      },
    };

    const result = await runAllChecks(partialCorrupt);
    assert.equal(result.checks.length, 27);
    assert.ok(result.checkSummary.totalChecks === 27);
  });
});
