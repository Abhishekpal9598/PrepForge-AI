import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  checkHardTechnicalSkillsMatch,
  checkSoftSkillsMatch,
  checkActionVerbs,
  checkTargetTitleAlignment,
} from '../../src/services/resumeChecks/categories/jobTailoring.js';

describe('Suite: Job Tailoring Checks (CHK-15 to CHK-18)', () => {
  const sampleResume = {
    originalFileName: 'Alex_Smith_Resume.pdf',
    extractedText: `
      Alex Smith
      Full Stack Software Engineer
      alex.smith@example.com
      Skills: JavaScript, TypeScript, React, Node.js, PostgreSQL, Docker, AWS
      Experience:
      Senior Software Engineer — TechCorp (2021 - Present)
      • Architected distributed microservices handling 2M requests/day using Node.js and TypeScript.
      • Spearheaded cross-functional migration from monolithic architecture to AWS and Docker.
      • Mentored junior engineers and facilitated agile ceremonies.
    `,
    parsedSections: {
      rawSections: {
        summary: 'Full Stack Software Engineer with deep expertise in cloud services.',
        experience: 'Senior Software Engineer at TechCorp',
      },
      structured: {
        contact: { email: 'alex.smith@example.com' },
        skills: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'PostgreSQL', 'Docker', 'AWS'],
        experience: [
          {
            title: 'Senior Software Engineer',
            company: 'TechCorp',
            bullets: [
              'Architected distributed microservices handling 2M requests/day using Node.js and TypeScript.',
              'Spearheaded cross-functional migration from monolithic architecture to AWS and Docker.',
              'Mentored junior engineers and facilitated agile ceremonies.',
            ],
          },
        ],
      },
    },
  };

  it('1. All four checks return NOT_EVALUATED when jobDescription is omitted', () => {
    const res15 = checkHardTechnicalSkillsMatch(sampleResume, {});
    const res16 = checkSoftSkillsMatch(sampleResume, {});
    const res17 = checkActionVerbs(sampleResume, {});
    const res18 = checkTargetTitleAlignment(sampleResume, {});

    assert.equal(res15.status, 'NOT_EVALUATED');
    assert.equal(res15.checkId, 'CHK-15');
    assert.equal(res15.categoryId, 'CAT-04');
    assert.ok(res15.explanation.includes('No job description was provided'));

    assert.equal(res16.status, 'NOT_EVALUATED');
    assert.equal(res16.checkId, 'CHK-16');
    assert.ok(res16.explanation.includes('No job description was provided'));

    assert.equal(res17.status, 'NOT_EVALUATED');
    assert.equal(res17.checkId, 'CHK-17');
    assert.ok(res17.explanation.includes('No job description was provided'));

    assert.equal(res18.status, 'NOT_EVALUATED');
    assert.equal(res18.checkId, 'CHK-18');
    assert.ok(res18.explanation.includes('No job description was provided'));
  });

  it('2. CHK-15 evaluates hard technical skills match when jobDescription is provided', () => {
    const matchingJd = `
      Looking for a Senior Full Stack Engineer.
      Must have strong hands-on experience with TypeScript, React, Node.js, and PostgreSQL.
      Cloud experience with AWS and Docker required.
    `;

    const res = checkHardTechnicalSkillsMatch(sampleResume, { jobDescription: matchingJd });
    assert.equal(res.status, 'PASS');
    assert.equal(res.checkId, 'CHK-15');
    assert.ok(res.evidence.length > 0);

    const nonMatchingJd = `
      Required qualifications:
      - 5+ years of C++ and embedded systems programming
      - Experience with Rust and Golang kernel drivers
      - Python numerical analysis
    `;

    const nonMatchRes = checkHardTechnicalSkillsMatch(sampleResume, { jobDescription: nonMatchingJd });
    assert.equal(nonMatchRes.status, 'FAIL');
    assert.equal(nonMatchRes.severity, 'high');
  });

  it('3. CHK-16 evaluates soft skills demonstration in context', () => {
    const jdWithSoftSkills = `
      We value engineering leadership, cross-functional collaboration, and mentoring team members.
    `;

    const res = checkSoftSkillsMatch(sampleResume, { jobDescription: jdWithSoftSkills });
    assert.equal(res.status, 'PASS');
    assert.equal(res.checkId, 'CHK-16');

    const emptyResume = { ...sampleResume, parsedSections: { structured: { experience: [] } } };
    const warnRes = checkSoftSkillsMatch(emptyResume, { jobDescription: jdWithSoftSkills });
    assert.equal(warnRes.status, 'WARNING');
  });

  it('4. CHK-17 evaluates high-impact action verbs when jobDescription is provided', () => {
    const jd = 'Full Stack Engineer opening.';
    const res = checkActionVerbs(sampleResume, { jobDescription: jd });
    assert.equal(res.status, 'PASS');
    assert.equal(res.checkId, 'CHK-17');

    const passiveResume = {
      ...sampleResume,
      parsedSections: {
        structured: {
          experience: [
            {
              bullets: [
                'Responsible for maintaining legacy codebase.',
                'Helped with QA testing.',
                'Worked on bug tickets.',
              ],
            },
          ],
        },
      },
    };

    const passiveRes = checkActionVerbs(passiveResume, { jobDescription: jd });
    assert.equal(passiveRes.status, 'WARNING');
    assert.ok(passiveRes.evidence.some((e) => e.includes('Passive phrasing detected')));
  });

  it('5. CHK-18 evaluates target job title alignment', () => {
    const alignedRes = checkTargetTitleAlignment(sampleResume, {
      targetRole: 'Senior Software Engineer',
      jobDescription: 'Senior Software Engineer position',
    });
    assert.equal(alignedRes.status, 'PASS');
    assert.equal(alignedRes.checkId, 'CHK-18');

    const misalignedRes = checkTargetTitleAlignment(sampleResume, {
      targetRole: 'Chief Financial Officer',
      jobDescription: 'CFO role in corporate finance',
    });
    assert.equal(misalignedRes.status, 'WARNING');
  });
});
