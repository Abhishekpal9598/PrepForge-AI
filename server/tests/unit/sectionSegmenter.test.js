import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  matchSectionHeading,
  segmentResumeSections,
  CANONICAL_SECTIONS,
  CORE_SECTIONS,
} from '../../src/services/sectionSegmenter.js';

describe('Suite: Section Segmentation Engine', () => {
  it('1. matchSectionHeading correctly recognizes canonical section headings and synonyms', () => {
    // 1. Technical Skills
    const tech = matchSectionHeading('TECHNICAL SKILLS');
    assert.equal(tech?.key, 'technicalSkills');
    assert.equal(tech?.canonicalName, 'Technical Skills');

    assert.equal(matchSectionHeading('Core Technologies')?.key, 'technicalSkills');
    assert.equal(matchSectionHeading('Tech Stack:')?.key, 'technicalSkills');
    assert.equal(matchSectionHeading('Programming Languages')?.key, 'technicalSkills');

    // 2. Soft Skills
    assert.equal(matchSectionHeading('Soft Skills')?.key, 'softSkills');
    assert.equal(matchSectionHeading('Interpersonal Skills')?.key, 'softSkills');

    // 3. Work Experience
    assert.equal(matchSectionHeading('WORK EXPERIENCE')?.key, 'experience');
    assert.equal(matchSectionHeading('Professional Experience')?.key, 'experience');
    assert.equal(matchSectionHeading('Career History')?.key, 'experience');

    // 4. Employment History
    assert.equal(matchSectionHeading('Employment History')?.key, 'employment');

    // 5. Education
    assert.equal(matchSectionHeading('EDUCATION')?.key, 'education');
    assert.equal(matchSectionHeading('Academic Background')?.key, 'education');
    assert.equal(matchSectionHeading('Degrees & Credentials')?.key, 'education');

    // 6. Summary
    assert.equal(matchSectionHeading('Professional Summary')?.key, 'summary');
    assert.equal(matchSectionHeading('Executive Profile')?.key, 'summary');
    assert.equal(matchSectionHeading('About Me')?.key, 'summary');

    // 7. Objective
    assert.equal(matchSectionHeading('Career Objective')?.key, 'objective');

    // 8. Projects
    assert.equal(matchSectionHeading('Key Projects')?.key, 'projects');
    assert.equal(matchSectionHeading('Technical Projects')?.key, 'projects');

    // 9. Certifications
    assert.equal(matchSectionHeading('Certifications & Licenses')?.key, 'certifications');

    // 10. Achievements
    assert.equal(matchSectionHeading('Key Achievements')?.key, 'achievements');

    // 11. Awards
    assert.equal(matchSectionHeading('Awards & Honors')?.key, 'awards');

    // 12. Publications
    assert.equal(matchSectionHeading('Publications & Research')?.key, 'publications');

    // 13. Languages
    assert.equal(matchSectionHeading('Language Proficiency')?.key, 'languages');

    // 14. Volunteer
    assert.equal(matchSectionHeading('Volunteer Experience')?.key, 'volunteer');

    // 15. Leadership
    assert.equal(matchSectionHeading('Leadership Activities')?.key, 'leadership');

    // 16. Interests
    assert.equal(matchSectionHeading('Interests & Hobbies')?.key, 'interests');

    // 17. Contact
    assert.equal(matchSectionHeading('Contact Information')?.key, 'contact');
  });

  it('2. matchSectionHeading rejects non-heading prose, bullet points, and sentence lines', () => {
    // Bullets
    assert.equal(matchSectionHeading('- Developed microservices using Node.js and Docker'), null);
    assert.equal(matchSectionHeading('* Led team of 8 software engineers'), null);
    assert.equal(matchSectionHeading('1. Implemented secure OAuth2 authentication'), null);

    // Sentence lines
    assert.equal(matchSectionHeading('I have over 10 years of experience in distributed cloud computing.'), null);
    assert.equal(matchSectionHeading('Graduated with honors in Computer Science.'), null);

    // Overly long lines
    assert.equal(
      matchSectionHeading('This is an extremely long heading line that is obviously a paragraph of body text rather than a resume section title.'),
      null
    );

    // Empty or short
    assert.equal(matchSectionHeading(''), null);
    assert.equal(matchSectionHeading('A'), null);
  });

  it('3. segmentResumeSections segments a standard resume into discrete sections', () => {
    const resumeText = `Elena Rostova
elena.rostova@example.com | (555) 345-6789 | San Francisco, CA
https://linkedin.com/in/elenarostova | https://github.com/erostova

PROFESSIONAL SUMMARY
Senior Cloud & Full Stack Engineer with 7+ years of experience architecting high-scale distributed systems and cloud-native applications.

WORK EXPERIENCE
Staff Software Engineer | CloudScale Inc.
03/2021 - Present | San Francisco, CA
- Spearheaded migration of monolith backend to AWS ECS microservices, reducing p99 latency by 42%.
- Architected real-time notification engine processing 5M+ daily events with Redis and Kafka.

Senior Software Engineer | DataCorp Solutions
06/2018 - 02/2021 | San Jose, CA
- Engineered multi-tenant RESTful APIs serving 200,000+ active enterprise users.
- Automated CI/CD pipelines using GitHub Actions and Terraform, accelerating deployment velocity by 60%.

EDUCATION
University of California, Berkeley
Bachelor of Science in Computer Science | 2014 - 2018
GPA: 3.85 / 4.0 | Dean's List

TECHNICAL SKILLS
Languages: JavaScript, TypeScript, Python, Go, SQL
Frameworks: React, Node.js, Express, Next.js, FastAPI
Cloud & DevOps: AWS, Docker, Kubernetes, Terraform, CI/CD, Kafka, Redis
Databases: PostgreSQL, MongoDB, DynamoDB

KEY PROJECTS
Distributed Task Queue Engine (https://github.com/erostova/task-queue)
- Built high-throughput distributed task queue in Go and Redis handling 10,000 tasks/second.

CERTIFICATIONS
AWS Certified Solutions Architect - Professional (2022)
Certified Kubernetes Administrator - CKA (2023)

AWARDS & HONORS
Engineering Excellence Award - CloudScale Inc. (2023)
First Place - Silicon Valley Hackathon (2019)

LANGUAGES
English (Native), Russian (Bilingual), Spanish (Conversational)`;

    const result = segmentResumeSections(resumeText);

    // Assert section content exists
    assert.ok(result.rawSections.contact.includes('Elena Rostova'), 'Contact section must contain candidate name');
    assert.ok(result.rawSections.summary.includes('Senior Cloud & Full Stack Engineer'), 'Summary must contain text');
    assert.ok(result.rawSections.experience.includes('CloudScale Inc.'), 'Experience must contain roles');
    assert.ok(result.rawSections.education.includes('University of California, Berkeley'), 'Education must contain university');
    assert.ok(result.rawSections.technicalSkills.includes('JavaScript, TypeScript'), 'Skills must contain technical terms');
    assert.ok(result.rawSections.projects.includes('Distributed Task Queue Engine'), 'Projects must contain project info');
    assert.ok(result.rawSections.certifications.includes('AWS Certified Solutions Architect'), 'Certifications must be captured');
    assert.ok(result.rawSections.awards.includes('Engineering Excellence Award'), 'Awards must be captured');
    assert.ok(result.rawSections.languages.includes('English (Native)'), 'Languages must be captured');

    // Assert section order
    assert.ok(result.sectionOrder.includes('contact'));
    assert.ok(result.sectionOrder.includes('summary'));
    assert.ok(result.sectionOrder.includes('experience'));
    assert.ok(result.sectionOrder.includes('education'));
    assert.ok(result.sectionOrder.includes('technicalSkills'));

    // Assert core sections completeness
    assert.equal(result.missingCoreSections.length, 0, 'No core sections should be missing');
    assert.ok(result.confidence >= 0.85, 'Confidence score should be >= 0.85 for complete resume');
  });

  it('4. segmentResumeSections detects missing core sections and lowers confidence', () => {
    // Resume missing Education and Skills
    const incompleteResume = `Marcus Vance
marcus@vance.io | (555) 999-1234 | Seattle, WA

EXPERIENCE
Software Developer | Acme Tech
2020 - Present
- Built React frontend components and integrated GraphQL APIs.`;

    const result = segmentResumeSections(incompleteResume);

    assert.ok(result.missingCoreSections.includes('education'), 'Should identify missing Education');
    assert.ok(result.missingCoreSections.includes('technicalSkills'), 'Should identify missing Skills');
    assert.ok(!result.missingCoreSections.includes('experience'), 'Experience should be found');
    assert.ok(!result.missingCoreSections.includes('contact'), 'Contact should be found');
    assert.ok(result.confidence < 0.75, 'Confidence should reflect missing core sections');
  });

  it('5. segmentResumeSections safely handles resumes with no headings via unstructured fallback', () => {
    const rawParagraphResume = `John Doe, an aspiring developer from Denver, CO. Contact: john@example.com, 555-123-4567.
I have spent the last three years building various web applications using React, JavaScript, and Node.js.
I graduated from Denver Community College in 2021 with an Associate degree.`;

    const result = segmentResumeSections(rawParagraphResume);

    assert.ok(result.rawSections.contact.length > 0, 'Contact block should receive top text');
    assert.ok(result.rawSections.unstructured.length > 0, 'Body text should be preserved in unstructured');
    assert.ok(result.sectionOrder.includes('unstructured'));
    assert.ok(result.confidence <= 0.4, 'Confidence should be low for unstructured resume');
  });

  it('6. segmentResumeSections handles empty or whitespace text gracefully', () => {
    const emptyResult = segmentResumeSections('');
    assert.equal(emptyResult.confidence, 0);
    assert.equal(emptyResult.detectedSections.length, 0);
    assert.equal(emptyResult.missingCoreSections.length, CORE_SECTIONS.length);
  });
});
