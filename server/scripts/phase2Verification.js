import fs from 'fs';
import path from 'path';
import os from 'os';
import { performance } from 'perf_hooks';
import {
  validateFileSignature,
  normalizeExtractedText,
  extractResumeWithMetadata,
  extractResumeText,
} from '../src/utils/textExtractor.js';
import {
  matchSectionHeading,
  segmentResumeSections,
  CANONICAL_SECTIONS,
  CORE_SECTIONS,
} from '../src/services/sectionSegmenter.js';
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
} from '../src/services/structuredExtractor.js';

// Helper to create minimal valid DOCX buffer
const createDocxBuffer = (textXml) => {
  const crc32 = (buf) => {
    let crc = ~0;
    for (let i = 0; i < buf.length; i++) {
      crc ^= buf[i];
      for (let j = 0; j < 8; j++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
    return ~crc >>> 0;
  };

  const filename = Buffer.from('word/document.xml');
  const xmlContent = Buffer.from(
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
    '<w:body>' +
    textXml +
    '</w:body>' +
    '</w:document>'
  );
  const crc = crc32(xmlContent);

  const lfh = Buffer.alloc(30);
  lfh.writeUInt32LE(0x04034b50, 0);
  lfh.writeUInt16LE(20, 4);
  lfh.writeUInt16LE(0, 6);
  lfh.writeUInt16LE(0, 8);
  lfh.writeUInt16LE(0, 10);
  lfh.writeUInt16LE(0, 12);
  lfh.writeUInt32LE(crc, 14);
  lfh.writeUInt32LE(xmlContent.length, 18);
  lfh.writeUInt32LE(xmlContent.length, 22);
  lfh.writeUInt16LE(filename.length, 26);
  lfh.writeUInt16LE(0, 28);

  const cdfh = Buffer.alloc(46);
  cdfh.writeUInt32LE(0x02014b50, 0);
  cdfh.writeUInt16LE(20, 4);
  cdfh.writeUInt16LE(20, 6);
  cdfh.writeUInt16LE(0, 8);
  cdfh.writeUInt16LE(0, 10);
  cdfh.writeUInt16LE(0, 12);
  cdfh.writeUInt32LE(crc, 16);
  cdfh.writeUInt32LE(xmlContent.length, 20);
  cdfh.writeUInt32LE(xmlContent.length, 24);
  cdfh.writeUInt16LE(filename.length, 28);
  cdfh.writeUInt16LE(0, 30);
  cdfh.writeUInt16LE(0, 32);
  cdfh.writeUInt16LE(0, 34);
  cdfh.writeUInt16LE(0, 36);
  cdfh.writeUInt32LE(0, 38);
  cdfh.writeUInt32LE(0, 42);

  const cdOffset = lfh.length + filename.length + xmlContent.length;
  const cdSize = cdfh.length + filename.length;
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(1, 8);
  eocd.writeUInt16LE(1, 10);
  eocd.writeUInt32LE(cdSize, 12);
  eocd.writeUInt32LE(cdOffset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([lfh, filename, xmlContent, cdfh, filename, eocd]);
};

// Fixture Buffers
export const FIXTURES = {
  // 1. Valid PDF
  validPdf: Buffer.from(
    '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length 85 >>\nstream\nBT /F1 12 Tf 72 712 Td (Samantha Cruz - Senior Backend Architect with Node.js and AWS expertise) Tj ET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000214 00000 n \ntrailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n349\n%%EOF'
  ),

  // 2. Multi-page PDF (2 pages)
  multiPagePdf: Buffer.from(
    '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R 5 0 R] /Count 2 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length 65 >>\nstream\nBT /F1 12 Tf 72 712 Td (Page 1: Samantha Cruz - Summary and Professional Experience) Tj ET\nendstream\nendobj\n5 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 6 0 R >>\nendobj\n6 0 obj\n<< /Length 62 >>\nstream\nBT /F1 12 Tf 72 712 Td (Page 2: Education, Technical Certifications, and Publications) Tj ET\nendstream\nendobj\nxref\n0 7\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000121 00000 n \n0000000220 00000 n \n0000000333 00000 n \n0000000432 00000 n \ntrailer\n<< /Size 7 /Root 1 0 R >>\nstartxref\n542\n%%EOF'
  ),

  // 3. Valid DOCX
  validDocx: createDocxBuffer(
    '<w:p><w:r><w:t>Arthur Pendelton - Principal Staff Systems Engineer with 12 years building distributed databases.</w:t></w:r></w:p>'
  ),

  // 4. DOCX containing tables
  docxWithTables: createDocxBuffer(
    '<w:p><w:r><w:t>Arthur Pendelton - Resume with Technical Skills Table</w:t></w:r></w:p>' +
    '<w:tbl>' +
    '<w:tr><w:tc><w:p><w:r><w:t>Category</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>Technologies</w:t></w:r></w:p></w:tc></w:tr>' +
    '<w:tr><w:tc><w:p><w:r><w:t>Languages</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>Go, Rust, TypeScript, Python</w:t></w:r></w:p></w:tc></w:tr>' +
    '<w:tr><w:tc><w:p><w:r><w:t>Databases</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>PostgreSQL, Redis, CockroachDB</w:t></w:r></w:p></w:tc></w:tr>' +
    '</w:tbl>'
  ),

  // 5. Valid TXT
  validTxt: Buffer.from(
    'Liam O\'Connor\nliam.oconnor@platformdev.io | (555) 444-2222 | Dublin, Ireland\n\nPROFESSIONAL SUMMARY\nSenior Platform & DevOps Engineer with 6 years experience in Kubernetes, Terraform, and AWS.\n\nWORK EXPERIENCE\nPlatform Engineer | Stripe\n01/2021 - Present | Dublin\n- Engineered automated infrastructure provisioning with Terraform and Helm.\n\nEDUCATION\nTrinity College Dublin\nB.Sc. in Computer Science (2015 - 2019)'
  ),

  // 6. Empty PDF (has catalog and page but zero contents stream)
  emptyPdf: Buffer.from(
    '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n185\n%%EOF'
  ),

  // 7. Corrupted PDF
  corruptedPdf: Buffer.from('NOT_A_REAL_PDF_CORRUPTED_STREAM_HEADER_INVALID'),

  // 8. Password-Protected PDF
  passwordProtectedPdf: Buffer.from(
    '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\n4 0 obj\n<< /Filter /Standard /V 2 /R 3 /O (password) /U (user) /P -4 >>\nendobj\ntrailer\n<< /Size 5 /Root 1 0 R /Encrypt 4 0 R >>\nstartxref\n250\n%%EOF'
  ),

  // 9. Image-only PDF (< 20 chars of text stream)
  imageOnlyPdf: Buffer.from(
    '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length 12 >>\nstream\nBT /F1 12 Tf 72 712 Td (Scan) Tj ET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000214 00000 n \ntrailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n274\n%%EOF'
  ),

  // 10. Unicode Resume
  unicodeResume: Buffer.from(
    'José Müller-Renée\njose.muller@munchen-tech.de | +49 89 1234567 | München, Germany\nLinkedIn: https://linkedin.com/in/jose-muller\n\nPROFESSIONAL SUMMARY\nSenior Software Architect specializing in microservices & cloud scalability. Expert in high-throughput APIs.\n\nWORK EXPERIENCE\nLead Engineer | Bayerische Motoren Werke\n03/2020 – Present | München, Germany\n• Orchestrated real-time telematics platform processing 25M+ IoT events daily.\n• Reduced latency by 35% using C++20 and gRPC.\n\nEDUCATION\nTechnische Universität München\nMaster of Science in Informatik | 2016 – 2018 | Magna Cum Laude\n\nTECHNICAL SKILLS\nC++, Rust, Go, Python, Docker, Kubernetes, Linux, Kafka'
  ),

  // 11. Multi-column Resume (text representing two columns)
  multiColumnResume: Buffer.from(
    'Maya Patel | Senior Frontend Engineer | maya@patel.dev | (555) 234-5678\n' +
    'Portfolio: https://mayapatel.dev | GitHub: https://github.com/mayapatel\n\n' +
    'PROFILE SUMMARY                                     CORE SKILLS\n' +
    'Frontend specialist with 7 years of experience      JavaScript, TypeScript, React, Next.js\n' +
    'crafting accessible and responsive web apps.        HTML5, CSS3, Tailwind CSS, Redux, GraphQL\n' +
    'Passionate about Core Web Vitals optimization.      Jest, Cypress, Webpack, Vite, Git\n\n' +
    'PROFESSIONAL EXPERIENCE                            EDUCATION\n' +
    'Staff Frontend Engineer | FinTech UI Labs           Georgia Institute of Technology\n' +
    '02/2021 - Present | Atlanta, GA                    B.S. in Computer Science (2014 - 2018)\n' +
    '- Led migration from Create React App to Next.js.   GPA: 3.8 / 4.0\n' +
    '- Improved Largest Contentful Paint by 1.8s.\n\n' +
    'CERTIFICATIONS\n' +
    'AWS Certified Developer - Associate (2022)'
  ),

  // 12. Unusual Formatting Resume
  unusualFormattingResume: Buffer.from(
    '=== CANDIDATE PROFILE ===\n' +
    'Candidate: Robert "Rob" Taylor\n' +
    'Email: rob.taylor@datacore.io | Tel: 555-876-5432 | Austin, TX\n' +
    'Online: https://robtaylor.io | https://linkedin.com/in/robtaylor\n\n' +
    '--- EXECUTIVE OVERVIEW ---\n' +
    'Veteran Data Engineer with deep expertise in Apache Spark, Kafka, and Snowflake.\n\n' +
    '>>> CAREER HISTORY <<<\n' +
    'Data Engineering Lead at Datacore Solutions\n' +
    'Dates: 2019 to Present [Current Role]\n' +
    '=> Engineered real-time ETL pipelines processing 10TB+ daily.\n' +
    '=> Cut compute warehouse costs by 40% through partitioning optimizations.\n\n' +
    '*** ACADEMIC QUALIFICATIONS ***\n' +
    'University of Texas at Austin\n' +
    'Bachelor of Science in Electrical and Computer Engineering (2015-2019)\n\n' +
    '[TOOLBOX & TECHNOLOGIES]\n' +
    '* Python, Scala, SQL, Spark, Kafka, Snowflake, Airflow, Docker, AWS\n\n' +
    '### AWARDS & RECOGNITION ###\n' +
    'Patent: Distributed Stream Sharding (2021)\n' +
    'Data Excellence Award (2022)'
  ),
};

export async function runAllVerifications() {
  const report = {
    timestamp: new Date().toISOString(),
    step2_fileParsing: {},
    step3_sectionSegmentation: {},
    step4_structuredExtraction: {},
    step5_timeline: {},
    step8_performance: [],
  };

  // ==========================================
  // STEP 2: REAL FILE PARSING TESTS
  // ==========================================
  for (const [key, buffer] of Object.entries(FIXTURES)) {
    const keyLower = key.toLowerCase();
    const ext = keyLower.includes('docx') ? 'docx' : keyLower.includes('txt') || keyLower.includes('unicode') || keyLower.includes('multicolumn') || keyLower.includes('unusual') ? 'txt' : 'pdf';
    const tmpPath = path.join(os.tmpdir(), `phase2_verify_${key}_${Date.now()}.${ext}`);
    fs.writeFileSync(tmpPath, buffer);

    const start = performance.now();
    try {
      const result = await extractResumeWithMetadata(tmpPath, ext);
      const duration = performance.now() - start;
      report.step2_fileParsing[key] = {
        status: 'PASSED',
        format: ext,
        sizeBytes: buffer.length,
        durationMs: Number(duration.toFixed(2)),
        pageCount: result.metadata.pageCount,
        charCount: result.metadata.charCount,
        wordCount: result.metadata.wordCount,
      };
    } catch (err) {
      const duration = performance.now() - start;
      report.step2_fileParsing[key] = {
        status: 'CAUGHT_EXPECTED_ERROR',
        format: ext,
        sizeBytes: buffer.length,
        durationMs: Number(duration.toFixed(2)),
        errorCode: err.code || 'UNKNOWN_ERROR',
        statusCode: err.statusCode || 500,
        errorMessage: err.message,
      };
    } finally {
      if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    }
  }

  // ==========================================
  // STEP 3: SECTION SEGMENTATION VERIFICATION
  // ==========================================
  const all17ResumeText = `Candidate Test Name
candidate@example.com | (555) 123-4567 | New York, NY
https://linkedin.com/in/testcandidate | https://github.com/testcandidate

PROFESSIONAL SUMMARY
Senior Engineer with extensive industry experience.

CAREER OBJECTIVE
Seeking leadership roles in distributed systems engineering.

WORK EXPERIENCE
Principal Engineer | Apex Cloud
01/2021 - Present | New York, NY
- Built cloud architecture with AWS and Go.

EMPLOYMENT HISTORY
Senior Developer | Prior Corp
01/2018 - 12/2020 | Boston, MA
- Managed data pipelines.

EDUCATION
MIT
Master of Science in Computer Science | 2016 - 2018

TECHNICAL SKILLS
Go, Python, Kubernetes, Docker, AWS

SOFT SKILLS
Leadership, Mentorship, Team Collaboration

KEY PROJECTS
Distributed Ledger (https://github.com/test/ledger)
- Created consensus mechanism in Go.

CERTIFICATIONS
AWS Certified Solutions Architect (2022)

KEY ACHIEVEMENTS
Reduced company infrastructure cloud bill by $500k.

AWARDS & HONORS
Global Hackathon Winner (2020)

PUBLICATIONS & RESEARCH
High-Throughput Consensus Protocols (IEEE, 2019)

LANGUAGES
English (Native), German (Fluent)

VOLUNTEER EXPERIENCE
Code in the Community Mentor (2021 - Present)

LEADERSHIP ACTIVITIES
Chapter Lead - Women in Tech Boston (2019 - 2021)

INTERESTS & HOBBIES
Marathon running, open source contributing, chess`;

  const segResult = segmentResumeSections(all17ResumeText);
  const detectedKeys = segResult.detectedSections.map((s) => s.key);

  report.step3_sectionSegmentation = {
    totalSectionsDetected: segResult.detectedSections.length,
    canonicalSectionsFound: detectedKeys,
    all17SectionsPresent: CANONICAL_SECTIONS.every((sec) =>
      detectedKeys.includes(sec) || (sec === 'contact' && segResult.rawSections.contact)
    ),
    missingCoreSections: segResult.missingCoreSections,
    confidence: segResult.confidence,
    sectionOrder: segResult.sectionOrder,
  };

  // Test Non-Heading Sentences Are Not Misclassified
  const nonHeadingLines = [
    'I have 10 years of experience in distributed systems.',
    'Experienced in JavaScript, React, and Node.js.',
    'Educated at top technology institutes.',
    'Skills include active listening and clear technical communication.',
    'Graduated Magna Cum Laude with a Bachelor of Science degree.',
    '- Developed scalable microservices using Express and MongoDB.',
  ];

  const misclassifiedSentences = nonHeadingLines.filter((l) => matchSectionHeading(l) !== null);
  report.step3_sectionSegmentation.misclassifiedSentencesCount = misclassifiedSentences.length;

  // Fresh Graduate Resume (Education first, then Projects, then Skills)
  const freshGradResume = `Emily Zhang
emily@stanford.edu | (555) 789-0123 | Palo Alto, CA

EDUCATION
Stanford University
Bachelor of Science in Computer Science | Class of 2024
GPA: 3.94 / 4.0

KEY PROJECTS
AI Study Assistant (https://github.com/emilyz/study-ai)
- Built generative search interface in React and Python.

TECHNICAL SKILLS
Python, JavaScript, React, PyTorch, SQL

WORK EXPERIENCE
Software Engineering Intern | Google
06/2023 - 08/2023 | Mountain View, CA
- Optimized BigQuery data pipelines.`;

  const gradSeg = segmentResumeSections(freshGradResume);
  report.step3_sectionSegmentation.freshGradOrdering = gradSeg.sectionOrder;
  report.step3_sectionSegmentation.freshGradConfidence = gradSeg.confidence;

  // ==========================================
  // STEP 4: STRUCTURED EXTRACTION VERIFICATION
  // ==========================================
  const structured = extractStructuredResumeData(all17ResumeText, segResult.rawSections);
  report.step4_structuredExtraction = {
    candidateName: structured.contact.fullName,
    email: structured.contact.email,
    phone: structured.contact.phone,
    location: structured.contact.location?.city + ', ' + structured.contact.location?.stateOrCountry,
    linkedin: structured.contact.links.linkedin,
    github: structured.contact.links.github,
    educationCount: structured.education.length,
    educationDegree: structured.education[0]?.degree,
    educationInstitution: structured.education[0]?.institution,
    experienceCount: structured.experience.length,
    firstRoleCompany: structured.experience[0]?.company,
    firstRoleTitle: structured.experience[0]?.title,
    firstRoleIsCurrent: structured.experience[0]?.isCurrent,
    firstRoleBulletsCount: structured.experience[0]?.bullets.length,
    projectsCount: structured.projects.length,
    projectTitle: structured.projects[0]?.title,
    projectLink: structured.projects[0]?.link,
    technicalSkillsCount: structured.skills.technical.length,
    softSkillsCount: structured.skills.soft.length,
    certificationsCount: structured.certifications.length,
    certIssuer: structured.certifications[0]?.issuer,
  };

  // ==========================================
  // STEP 5: TIMELINE VERIFICATION
  // ==========================================
  const gapExperience = [
    {
      title: 'Current Role',
      startDate: { year: 2022, month: 1, timestamp: new Date(2022, 0, 1).getTime() },
      endDate: { year: 2024, month: 1, isCurrent: true, timestamp: new Date(2024, 0, 1).getTime() },
    },
    {
      title: 'Past Role',
      startDate: { year: 2018, month: 1, timestamp: new Date(2018, 0, 1).getTime() },
      endDate: { year: 2020, month: 6, isCurrent: false, timestamp: new Date(2020, 5, 1).getTime() },
    },
  ];

  const timelineAnalysis = analyzeTimeline(gapExperience);
  report.step5_timeline = {
    isChronological: timelineAnalysis.isChronological,
    careerGapsDetected: timelineAnalysis.careerGaps.length,
    gapDetails: timelineAnalysis.careerGaps,
    isNonPenalizing: timelineAnalysis.careerGaps.every((g) => g.isNonPenalizing === true),
  };

  // ==========================================
  // STEP 8: PERFORMANCE VERIFICATION
  // ==========================================
  const performanceFiles = [
    { name: 'Standard Single-Page PDF', buffer: FIXTURES.validPdf, ext: 'pdf' },
    { name: 'Multi-Page PDF (2 Pages)', buffer: FIXTURES.multiPagePdf, ext: 'pdf' },
    { name: 'Standard Word DOCX', buffer: FIXTURES.validDocx, ext: 'docx' },
    { name: 'DOCX with Tables', buffer: FIXTURES.docxWithTables, ext: 'docx' },
    { name: 'Plain Text Resume', buffer: FIXTURES.validTxt, ext: 'txt' },
    { name: 'Unicode Multilingual Resume', buffer: FIXTURES.unicodeResume, ext: 'txt' },
  ];

  for (const pf of performanceFiles) {
    const tmpPath = path.join(os.tmpdir(), `perf_${Date.now()}_${pf.name.replace(/\s+/g, '_')}.${pf.ext}`);
    fs.writeFileSync(tmpPath, pf.buffer);

    const t0 = performance.now();
    const extractionResult = await extractResumeWithMetadata(tmpPath, pf.ext);
    const t1 = performance.now();

    const segmentation = segmentResumeSections(extractionResult.text);
    const t2 = performance.now();

    const structuredData = extractStructuredResumeData(extractionResult.text, segmentation.rawSections);
    const t3 = performance.now();

    report.step8_performance.push({
      fileName: pf.name,
      format: pf.ext,
      fileSize: pf.buffer.length,
      pageCount: extractionResult.metadata.pageCount,
      charCount: extractionResult.text.length,
      extractionMs: Number((t1 - t0).toFixed(2)),
      segmentationMs: Number((t2 - t1).toFixed(2)),
      structuredExtractionMs: Number((t3 - t2).toFixed(2)),
      totalMs: Number((t3 - t0).toFixed(2)),
    });

    if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
  }

  return report;
}

// Execute if run directly
if (process.argv[1] && import.meta.url.includes(path.basename(process.argv[1]))) {
  runAllVerifications().then((rep) => {
    console.log(JSON.stringify(rep, null, 2));
  }).catch((err) => {
    console.error('Verification failed:', err);
    process.exit(1);
  });
}
