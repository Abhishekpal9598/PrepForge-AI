import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { segmentResumeSections } from '../../src/services/sectionSegmenter.js';
import { extractStructuredResumeData } from '../../src/services/structuredExtractor.js';
import { formatResumeResponse } from '../../src/controllers/resumeController.js';

describe('Suite: Parsed Sections Integration & Response Formatting', () => {
  const sampleResumeText = `David Miller
david.miller@devopscloud.net | +1 (555) 888-9999 | Seattle, WA
https://linkedin.com/in/davidmiller-cloud | https://github.com/dmiller

PROFESSIONAL SUMMARY
Principal Infrastructure Engineer with 10+ years specializing in multi-cloud architecture, Kubernetes platforms, and site reliability engineering.

WORK EXPERIENCE
Principal Cloud Architect | CloudNative Labs
01/2021 - Present | Seattle, WA
- Architected enterprise Kubernetes mesh spanning AWS EKS and GCP GKE, supporting 10M+ daily API transactions.
- Automated zero-trust infrastructure with Terraform and Vault, reducing provisioning lead time by 75%.
- Led 12 cloud architects and reliability engineers across 4 time zones.

Senior Infrastructure Engineer | Enterprise Data Inc.
04/2016 - 12/2020 | Redmond, WA
- Built real-time telemetry pipeline with Prometheus, Grafana, and Kafka, slashing MTTR from 45 to 8 minutes.
- Reduced annualized AWS compute expenditure by $1.2M through dynamic autoscaling and Spot instances.

EDUCATION
University of Washington
Master of Science in Computer Science | 2014 - 2016 | GPA: 3.9/4.0

Washington State University
Bachelor of Science in Electrical Engineering | 2010 - 2014

TECHNICAL SKILLS
Languages: Go, Python, Bash, TypeScript, SQL
Cloud & Infrastructure: AWS, GCP, Azure, Docker, Kubernetes, Terraform, Helm, Ansible, Linux
Monitoring & Databases: Prometheus, Grafana, Redis, PostgreSQL, Kafka
Methodologies: SRE, DevOps, GitOps, CI/CD, Agile

CERTIFICATIONS
- AWS Certified Solutions Architect - Professional (2022)
- Certified Kubernetes Administrator - CKA (2023)
- HashiCorp Certified: Terraform Associate (2021)`;

  it('1. End-to-end extraction pipeline generates complete parsedSections payload', () => {
    const segmentation = segmentResumeSections(sampleResumeText);
    const structured = extractStructuredResumeData(sampleResumeText, segmentation.rawSections);

    const parsedSections = {
      rawSections: segmentation.rawSections,
      detectedSections: segmentation.detectedSections,
      sectionOrder: segmentation.sectionOrder,
      missingCoreSections: segmentation.missingCoreSections,
      confidence: segmentation.confidence,
      structured,
      documentMetadata: {
        pageCount: 2,
        format: 'pdf',
        charCount: sampleResumeText.length,
        wordCount: sampleResumeText.split(/\s+/).filter(Boolean).length,
      },
      parsedAt: new Date(),
    };

    // Assert segmentation structure
    assert.ok(parsedSections.confidence >= 0.85);
    assert.equal(parsedSections.missingCoreSections.length, 0);
    assert.ok(parsedSections.sectionOrder.includes('contact'));
    assert.ok(parsedSections.sectionOrder.includes('summary'));
    assert.ok(parsedSections.sectionOrder.includes('experience'));
    assert.ok(parsedSections.sectionOrder.includes('education'));
    assert.ok(parsedSections.sectionOrder.includes('technicalSkills'));
    assert.ok(parsedSections.sectionOrder.includes('certifications'));

    // Assert structured entities
    assert.equal(structured.contact.fullName, 'David Miller');
    assert.equal(structured.contact.email, 'david.miller@devopscloud.net');
    assert.equal(structured.contact.location?.city, 'Seattle');
    assert.ok(structured.contact.links.linkedin.includes('davidmiller-cloud'));

    // Experience entries
    assert.equal(structured.experience.length, 2);
    assert.ok(structured.experience[0].title.includes('Principal Cloud Architect'));
    assert.ok(structured.experience[0].company.includes('CloudNative Labs'));
    assert.equal(structured.experience[0].isCurrent, true);
    assert.equal(structured.experience[0].bullets.length, 3);
    assert.equal(structured.experience[0].bullets[0].hasMetric, true); // 10M+
    assert.equal(structured.experience[0].bullets[1].hasMetric, true); // 75%
    assert.equal(structured.experience[0].bullets[0].isActionVerb, true); // Architected

    // Education entries
    assert.equal(structured.education.length, 2);
    assert.ok(structured.education[0].institution.includes('University of Washington'));
    assert.equal(structured.education[0].degreeLevel, 'Master');
    assert.equal(structured.education[0].graduationYear, 2016);

    // Skills
    assert.ok(structured.skills.technical.includes('Kubernetes'));
    assert.ok(structured.skills.technical.includes('Terraform'));
    assert.ok(structured.skills.technical.includes('Python'));

    // Certifications
    assert.equal(structured.certifications.length, 3);
    assert.equal(structured.certifications[0].issuer, 'AWS');

    // Timeline
    assert.equal(structured.timeline.isChronological, true);
  });

  it('2. formatResumeResponse cleanly exposes parsedSections without internal paths', () => {
    const mockDoc = {
      _id: '671dd4567890abcdef123456',
      userId: '671dd0000000abcdef123456',
      originalFileName: 'david_miller_cv.pdf',
      fileType: 'pdf',
      fileFormat: 'pdf',
      fileSize: 45000,
      extractedText: sampleResumeText,
      rawText: sampleResumeText,
      parsedSections: {
        confidence: 0.95,
        sectionOrder: ['contact', 'summary', 'experience', 'education', 'technicalSkills'],
        structured: {
          contact: { fullName: 'David Miller', email: 'david.miller@devopscloud.net' },
        },
      },
      storedFileName: 'resume-internal-uuid-secret.pdf',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const formatted = formatResumeResponse(mockDoc);

    assert.equal(formatted.id, '671dd4567890abcdef123456');
    assert.equal(formatted.originalFileName, 'david_miller_cv.pdf');
    assert.equal(formatted.fileType, 'pdf');
    assert.ok(formatted.parsedSections.confidence === 0.95);
    assert.equal(formatted.parsedSections.structured.contact.fullName, 'David Miller');

    // Security check: Must never expose storedFileName or disk paths
    assert.equal(formatted.storedFileName, undefined);
    assert.equal(formatted.path, undefined);
    assert.equal(formatted.diskPath, undefined);
  });
});
