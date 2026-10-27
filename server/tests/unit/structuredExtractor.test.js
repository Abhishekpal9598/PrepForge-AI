import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
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
} from '../../src/services/structuredExtractor.js';

describe('Suite: Structured Information & Timeline Extraction Engine', () => {
  it('1. parseDateToken parses various date notations into normalized tokens', () => {
    // MM/YYYY
    const d1 = parseDateToken('05/2021');
    assert.equal(d1?.year, 2021);
    assert.equal(d1?.month, 5);
    assert.equal(d1?.isCurrent, false);

    // Month YYYY
    const d2 = parseDateToken('October 2019');
    assert.equal(d2?.year, 2019);
    assert.equal(d2?.month, 10);

    // Mon YYYY
    const d3 = parseDateToken('Feb 2022');
    assert.equal(d3?.year, 2022);
    assert.equal(d3?.month, 2);

    // 4-digit Year
    const d4 = parseDateToken('2018');
    assert.equal(d4?.year, 2018);

    // Present / Current
    const d5 = parseDateToken('Present');
    assert.equal(d5?.isCurrent, true);
    assert.ok(d5?.year >= 2024);

    const d6 = parseDateToken('current');
    assert.equal(d6?.isCurrent, true);

    // Invalid string
    assert.equal(parseDateToken('NotADate'), null);
  });

  it('2. extractDateRange identifies ranges with various hyphen and dash separators', () => {
    const r1 = extractDateRange('Senior Software Engineer (03/2020 - Present)');
    assert.equal(r1.start?.month, 3);
    assert.equal(r1.start?.year, 2020);
    assert.equal(r1.isCurrent, true);

    const r2 = extractDateRange('Data Scientist | Jan 2017 – Dec 2019');
    assert.equal(r2.start?.month, 1);
    assert.equal(r2.start?.year, 2017);
    assert.equal(r2.end?.month, 12);
    assert.equal(r2.end?.year, 2019);
    assert.equal(r2.isCurrent, false);

    const r3 = extractDateRange('2015 to 2019');
    assert.equal(r3.start?.year, 2015);
    assert.equal(r3.end?.year, 2019);
  });

  it('3. extractContactInfo extracts candidate name, email, phone, location, and URLs', () => {
    const contactBlock = `Sophia Williams
sophia.williams@techcorp.dev
+1 (415) 555-0199
San Francisco, CA 94107
https://linkedin.com/in/sophiawilliams | https://github.com/sophiaw | https://sophia.dev`;

    const contact = extractContactInfo(contactBlock);

    assert.equal(contact.fullName, 'Sophia Williams');
    assert.equal(contact.email, 'sophia.williams@techcorp.dev');
    assert.ok(contact.phone.includes('415') && contact.phone.includes('555-0199'));
    assert.equal(contact.location?.city, 'San Francisco');
    assert.equal(contact.location?.stateOrCountry, 'CA');
    assert.equal(contact.location?.postalCode, '94107');
    assert.ok(contact.links.linkedin.includes('linkedin.com/in/sophiawilliams'));
    assert.ok(contact.links.github.includes('github.com/sophiaw'));
    assert.ok(contact.links.portfolio.includes('sophia.dev'));
    assert.equal(contact.links.all.length, 3);
  });

  it('4. extractEducation parses degrees, universities, majors, GPAs, and honors', () => {
    const eduText = `Stanford University
Master of Science in Computer Science
09/2018 - 06/2020 | GPA: 3.92/4.0 | Magna Cum Laude

University of Washington
Bachelor of Science in Software Engineering
2014 - 2018 | Dean's List`;

    const items = extractEducation(eduText);

    assert.equal(items.length, 2);

    // Stanford entry
    assert.ok(items[0].institution.includes('Stanford University'));
    assert.ok(items[0].degree.includes('Master of Science'));
    assert.equal(items[0].degreeLevel, 'Master');
    assert.ok(items[0].major.includes('Computer Science'));
    assert.equal(items[0].gpa, '3.92/4.0');
    assert.ok(items[0].honors.includes('Magna Cum Laude'));
    assert.equal(items[0].graduationYear, 2020);

    // UW entry
    assert.ok(items[1].institution.includes('University of Washington'));
    assert.ok(items[1].degree.includes('Bachelor of Science'));
    assert.equal(items[1].degreeLevel, 'Bachelor');
    assert.ok(items[1].honors.includes("Dean's List"));
    assert.equal(items[1].graduationYear, 2018);
  });

  it('5. extractExperience parses roles, dates, bullets, action verbs, and metrics', () => {
    const expText = `Staff Backend Engineer | Stripe Inc.
01/2022 - Present | San Francisco, CA
- Spearheaded migration of payments ledger, processing $4.5B in monthly transaction volume.
- Orchestrated distributed consensus across 40 nodes with Redis and Raft, achieving 99.999% uptime.
- Mentored 6 mid-level engineers through technical design reviews and promotions.

Senior Software Engineer | Airbnb
06/2019 - 12/2021 | San Francisco, CA
- Automated continuous delivery workflows with Docker and Terraform, reducing deployment time by 45%.
- Implemented real-time GraphQL search filters resulting in 18% improvement in booking conversions.`;

    const items = extractExperience(expText);

    assert.equal(items.length, 2);

    // First role (Stripe)
    const stripe = items[0];
    assert.ok(stripe.title.includes('Staff Backend Engineer'));
    assert.ok(stripe.company.includes('Stripe Inc.'));
    assert.equal(stripe.isCurrent, true);
    assert.equal(stripe.bullets.length, 3);

    // Bullet 1: Action Verb & Metric check
    assert.equal(stripe.bullets[0].firstWord, 'spearheaded');
    assert.equal(stripe.bullets[0].isActionVerb, true);
    assert.equal(stripe.bullets[0].hasMetric, true); // $4.5B
    assert.ok(stripe.bullets[0].wordCount > 5);

    // Bullet 2: Action verb & metric
    assert.equal(stripe.bullets[1].firstWord, 'orchestrated');
    assert.equal(stripe.bullets[1].isActionVerb, true);
    assert.equal(stripe.bullets[1].hasMetric, true); // 40 nodes, 99.999%

    // Second role (Airbnb)
    const airbnb = items[1];
    assert.ok(airbnb.title.includes('Senior Software Engineer'));
    assert.ok(airbnb.company.includes('Airbnb'));
    assert.equal(airbnb.isCurrent, false);
    assert.equal(airbnb.bullets.length, 2);
    assert.equal(airbnb.bullets[0].hasMetric, true); // 45%
    assert.equal(airbnb.bullets[1].hasMetric, true); // 18%
  });

  it('6. extractProjects parses project titles, URLs, and technologies', () => {
    const projText = `Real-Time Collaborative Code Editor
Built a collaborative browser-based IDE using React, Node.js, WebSockets, and Redis.
https://github.com/developer/code-collab
- Handled 500+ concurrent live keystroke synchronizations using Operational Transformation.
- Implemented syntax highlighting and terminal execution sandbox.`;

    const projects = extractProjects(projText);

    assert.equal(projects.length, 1);
    assert.ok(projects[0].title.includes('Real-Time Collaborative Code Editor'));
    assert.equal(projects[0].link, 'https://github.com/developer/code-collab');
    assert.equal(projects[0].bullets.length, 2);
  });

  it('7. extractSkills parses technical skills by category and detects soft skills', () => {
    const skillsText = `Languages: JavaScript, TypeScript, Python, Go, Java, SQL
Frameworks & Libraries: React, Node.js, Express, Next.js, FastAPI
Databases: PostgreSQL, MongoDB, Redis, DynamoDB
Cloud & DevOps: AWS, Docker, Kubernetes, Terraform, CI/CD, Linux
Tools: Git, Postman, Jira, Figma
Professional Competencies: Leadership, Mentorship, Problem Solving, Agile, Collaboration`;

    const skills = extractSkills(skillsText);

    // Technical categories
    assert.ok(skills.categories.languages.includes('TypeScript'));
    assert.ok(skills.categories.languages.includes('Python'));
    assert.ok(skills.categories.frameworks.includes('React'));
    assert.ok(skills.categories.frameworks.includes('Node.js'));
    assert.ok(skills.categories.databases.includes('PostgreSQL'));
    assert.ok(skills.categories.databases.includes('MongoDB'));
    assert.ok(skills.categories.cloudDevOps.includes('AWS'));
    assert.ok(skills.categories.cloudDevOps.includes('Kubernetes'));
    assert.ok(skills.categories.tools.includes('Git'));

    // Soft skills
    assert.ok(skills.soft.includes('Leadership'));
    assert.ok(skills.soft.includes('Mentorship'));
    assert.ok(skills.soft.includes('Problem Solving'));
    assert.ok(skills.soft.includes('Agile'));

    // Aggregate counts
    assert.ok(skills.totalCount > 15);
  });

  it('8. extractCertifications identifies credentials, issuers, and years', () => {
    const certText = `- AWS Certified Solutions Architect - Associate (2022)
- Certified Kubernetes Administrator - CKA (2023)
- Google Cloud Certified Professional Cloud Architect (2021)`;

    const certs = extractCertifications(certText);

    assert.equal(certs.length, 3);
    assert.equal(certs[0].issuer, 'AWS');
    assert.equal(certs[0].year, 2022);
    assert.equal(certs[1].year, 2023);
    assert.equal(certs[2].issuer, 'Google Cloud');
    assert.equal(certs[2].year, 2021);
  });

  it('9. analyzeTimeline verifies chronological order and identifies career gaps non-penalizingly', () => {
    const experienceRoles = [
      {
        title: 'Senior Engineer',
        startDate: { year: 2022, month: 1, timestamp: new Date(2022, 0, 1).getTime() },
        endDate: { year: 2024, month: 1, isCurrent: true, timestamp: new Date(2024, 0, 1).getTime() },
      },
      {
        title: 'Mid Engineer',
        startDate: { year: 2019, month: 1, timestamp: new Date(2019, 0, 1).getTime() },
        // Ended in Dec 2020 -> Gap between 12/2020 and 01/2022 is ~13 months (> 6 months)
        endDate: { year: 2020, month: 12, isCurrent: false, timestamp: new Date(2020, 11, 1).getTime() },
      },
    ];

    const timeline = analyzeTimeline(experienceRoles);

    assert.equal(timeline.isChronological, true, 'Most recent role is listed first');
    assert.equal(timeline.careerGaps.length, 1, 'Should detect one gap > 6 months');
    assert.equal(timeline.careerGaps[0].fromYear, 2020);
    assert.equal(timeline.careerGaps[0].toYear, 2022);
    assert.equal(timeline.careerGaps[0].isNonPenalizing, true, 'Career gaps must be strictly non-penalizing');
  });

  it('10. extractStructuredResumeData coordinates all modules into a unified payload', () => {
    const fullText = `Alex Chen
alex.chen@clouddev.io | (555) 777-8888 | Austin, TX
https://linkedin.com/in/alexchen-cloud | https://github.com/alexchen

SUMMARY
Accomplished DevOps & Cloud Engineer specializing in Kubernetes and infrastructure automation.

EXPERIENCE
Lead Infrastructure Engineer | FinTech Cloud
04/2021 - Present | Austin, TX
- Architected multi-region Kubernetes clusters on AWS serving 1M+ active users.
- Reduced infrastructure spend by 35% through spot instances and automated rightsizing.

EDUCATION
Texas A&M University
Bachelor of Science in Computer Engineering | 2017 - 2021

SKILLS
AWS, Docker, Kubernetes, Terraform, Python, Go, Bash, CI/CD, Linux, Teamwork, Leadership`;

    const rawSections = {
      contact: `Alex Chen\nalex.chen@clouddev.io | (555) 777-8888 | Austin, TX\nhttps://linkedin.com/in/alexchen-cloud | https://github.com/alexchen`,
      summary: 'Accomplished DevOps & Cloud Engineer specializing in Kubernetes and infrastructure automation.',
      experience: `Lead Infrastructure Engineer | FinTech Cloud\n04/2021 - Present | Austin, TX\n- Architected multi-region Kubernetes clusters on AWS serving 1M+ active users.\n- Reduced infrastructure spend by 35% through spot instances and automated rightsizing.`,
      education: `Texas A&M University\nBachelor of Science in Computer Engineering | 2017 - 2021`,
      technicalSkills: `AWS, Docker, Kubernetes, Terraform, Python, Go, Bash, CI/CD, Linux`,
      softSkills: `Teamwork, Leadership`,
    };

    const structured = extractStructuredResumeData(fullText, rawSections);

    assert.equal(structured.contact.fullName, 'Alex Chen');
    assert.equal(structured.contact.email, 'alex.chen@clouddev.io');
    assert.equal(structured.education.length, 1);
    assert.equal(structured.experience.length, 1);
    assert.equal(structured.experience[0].bullets.length, 2);
    assert.ok(structured.skills.technical.includes('Kubernetes'));
    assert.ok(structured.skills.soft.includes('Leadership'));
    assert.equal(structured.timeline.isChronological, true);
  });
});
