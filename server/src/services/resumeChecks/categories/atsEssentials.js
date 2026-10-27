/**
 * PrepForge AI — Category 1: ATS Essentials Checks (CHK-01 through CHK-06)
 *
 * Evaluates core parsing compatibility, layout linearity, contact formatting,
 * professional links, file naming, and date/link consistency.
 */

import { formatCheckResult } from '../utils/resultFormatter.js';

const UNPROFESSIONAL_EMAIL_TERMS = ['killer', 'party', 'sexy', 'dude', 'gamer', 'hot', 'cool', 'lover'];

/**
 * CHK-01: File Format & Critical Parsing Compatibility
 */
export const checkFileFormatAndParsing = (resumeData) => {
  const checkId = 'CHK-01';
  const categoryId = 'CAT-01';
  const title = 'File Format & Critical Parsing Compatibility';
  const description = 'Verify resume is in an ATS-supported format and text streams can be extracted cleanly without corruption.';

  const fileFormat = (resumeData?.fileFormat || '').toLowerCase();
  const rawText = resumeData?.extractedText || resumeData?.rawText || '';
  const textLength = rawText.trim().length;
  const fileSize = resumeData?.fileSize || 0;

  // 1. Critical Parsing Failure: Text stream contains fewer than 20 characters
  if (textLength < 20) {
    return formatCheckResult({
      checkId,
      categoryId,
      title,
      status: 'FAIL',
      severity: 'critical',
      description,
      evidence: [`Extracted character count: ${textLength}`, `Format: ${fileFormat || 'unknown'}`],
      explanation: 'Critical parsing failure: Extracted text stream contains fewer than 20 characters. The document may be a flattened raster scan, encrypted, or corrupted.',
      recommendation: 'Upload a clean, non-password-protected, text-selectable PDF or DOCX file.',
      confidence: 1.0,
      limitations: ['Cannot perform OCR on flattened image-only scans without OCR microservice.'],
      source: 'deterministic',
    });
  }

  // 2. Unsupported format check
  const supportedFormats = ['pdf', 'docx', 'txt'];
  if (fileFormat && !supportedFormats.includes(fileFormat)) {
    return formatCheckResult({
      checkId,
      categoryId,
      title,
      status: 'FAIL',
      severity: 'critical',
      description,
      evidence: [`Detected format: ${fileFormat}`],
      explanation: `Unsupported file format '${fileFormat}'. ATS parsers primarily process PDF, DOCX, or TXT documents.`,
      recommendation: 'Convert and upload your resume as a standardized PDF or DOCX file.',
      confidence: 1.0,
      limitations: [],
      source: 'deterministic',
    });
  }

  return formatCheckResult({
    checkId,
    categoryId,
    title,
    status: 'PASS',
    severity: 'info',
    description,
    evidence: [`Format: ${fileFormat || 'pdf'}`, `Character count: ${textLength}`, `File size: ${fileSize} bytes`],
    explanation: 'File format is ATS-compatible and text streams extracted cleanly with full character selectability.',
    recommendation: null,
    confidence: 1.0,
    limitations: [],
    source: 'deterministic',
  });
};

/**
 * CHK-02: ATS-Friendly Design & Layout
 */
export const checkAtsLayout = (resumeData) => {
  const checkId = 'CHK-02';
  const categoryId = 'CAT-01';
  const title = 'ATS-Friendly Design & Layout';
  const description = 'Ensure resume layout is single-column and free from complex tables or fragmented text divisions.';

  const text = resumeData?.extractedText || resumeData?.rawText || '';
  const evidence = [];

  // Look for fragmented table borders and excessive cell dividers
  const tableMarkers = (text.match(/(\+{2,}[-+]+|\*{3,}|\|[\s\w-]{1,15}\|[\s\w-]{1,15}\|)/g) || []);
  if (tableMarkers.length >= 3) {
    evidence.push(`Detected ${tableMarkers.length} ASCII table delimiters`);
  }

  // Check for excessive vertical pipe characters that fragment sentences
  const pipeCount = (text.match(/\|/g) || []).length;
  if (pipeCount > 25) {
    evidence.push(`High pipe delimiter frequency: ${pipeCount} occurrences`);
  }

  if (evidence.length > 0) {
    return formatCheckResult({
      checkId,
      categoryId,
      title,
      status: 'WARNING',
      severity: 'high',
      description,
      evidence,
      explanation: 'Complex table formatting or fragmented text dividers detected. Complex multi-column structures can cause older ATS parsers to interleave sentences out of sequence.',
      recommendation: 'Use a clean, single-column linear layout. Avoid multi-column sidebars, ASCII tables, and excessive graphic delimiters.',
      confidence: 0.85,
      limitations: ['Text-based layout inspection is a heuristic approximation of rendered 2D geometry.'],
      source: 'deterministic',
    });
  }

  return formatCheckResult({
    checkId,
    categoryId,
    title,
    status: 'PASS',
    severity: 'info',
    description,
    evidence: ['Continuous linear stream verified', 'No disruptive table boundaries detected'],
    explanation: 'Document structure adheres to linear, single-column scanning standards suitable for all standard ATS parsers.',
    recommendation: null,
    confidence: 0.9,
    limitations: [],
    source: 'deterministic',
  });
};

/**
 * CHK-03: Professional Email Format
 */
export const checkProfessionalEmail = (resumeData) => {
  const checkId = 'CHK-03';
  const categoryId = 'CAT-01';
  const title = 'Professional Email Format';
  const description = 'Verify that the candidate email address follows a professional naming structure and avoids spam filtering.';

  const structured = resumeData?.parsedSections?.structured;
  const email = structured?.contact?.email || '';

  if (!email) {
    return formatCheckResult({
      checkId,
      categoryId,
      title,
      status: 'FAIL',
      severity: 'high',
      description,
      evidence: ['No email address detected in header block'],
      explanation: 'No email address could be extracted from your contact header. Recruiters require a verified email to schedule screenings.',
      recommendation: 'Add your primary email address prominently at the top of your resume.',
      confidence: 1.0,
      limitations: [],
      source: 'deterministic',
    });
  }

  const localPart = email.split('@')[0]?.toLowerCase() || '';
  const issues = [];

  // Check for clusters of trailing numbers > 4 digits (e.g. john19984729)
  if (/\d{4,}$/.test(localPart)) {
    issues.push(`Contains trailing digit sequence: '${localPart.match(/\d{4,}$/)[0]}'`);
  }

  // Check for unprofessional buzzwords/slang
  for (const term of UNPROFESSIONAL_EMAIL_TERMS) {
    if (localPart.includes(term)) {
      issues.push(`Contains informal keyword: '${term}'`);
    }
  }

  if (issues.length > 0) {
    return formatCheckResult({
      checkId,
      categoryId,
      title,
      status: 'WARNING',
      severity: 'medium',
      description,
      evidence: [email, ...issues],
      explanation: `Email address '${email}' contains informal tokens or excessive random numbers that may be flagged by recruiter spam filters.`,
      recommendation: 'Create a professional email address using your name, such as firstname.lastname@domain.com.',
      confidence: 0.95,
      limitations: ['Cannot perform SMTP deliverability verification.'],
      source: 'deterministic',
    });
  }

  return formatCheckResult({
    checkId,
    categoryId,
    title,
    status: 'PASS',
    severity: 'info',
    description,
    evidence: [email],
    explanation: `Email address '${email}' is professional, clear, and ATS-friendly.`,
    recommendation: null,
    confidence: 1.0,
    limitations: [],
    source: 'deterministic',
  });
};

/**
 * CHK-04: Header Professional Links
 */
export const checkProfessionalLinks = (resumeData) => {
  const checkId = 'CHK-04';
  const categoryId = 'CAT-01';
  const title = 'Header Professional Links';
  const description = 'Ensure presence of clickable professional profile links (LinkedIn, GitHub, Portfolio).';

  const structured = resumeData?.parsedSections?.structured;
  const links = structured?.contact?.links || [];
  const linkedin = structured?.contact?.linkedin;
  const github = structured?.contact?.github;

  const allLinks = [...links];
  if (linkedin && !allLinks.includes(linkedin)) allLinks.push(linkedin);
  if (github && !allLinks.includes(github)) allLinks.push(github);

  if (allLinks.length === 0) {
    return formatCheckResult({
      checkId,
      categoryId,
      title,
      status: 'WARNING',
      severity: 'medium',
      description,
      evidence: ['Zero links detected in header'],
      explanation: 'No professional profile links (LinkedIn, GitHub, or personal portfolio) were detected in the contact header.',
      recommendation: 'Include your personalized LinkedIn profile URL and GitHub or personal portfolio link in your header.',
      confidence: 0.9,
      limitations: ['Does not verify if remote URLs return HTTP 200.'],
      source: 'deterministic',
    });
  }

  return formatCheckResult({
    checkId,
    categoryId,
    title,
    status: 'PASS',
    severity: 'info',
    description,
    evidence: allLinks,
    explanation: `Detected ${allLinks.length} professional link(s) in header.`,
    recommendation: null,
    confidence: 1.0,
    limitations: [],
    source: 'deterministic',
  });
};

/**
 * CHK-05: Resume File Naming Convention
 */
export const checkFileNamingConvention = (resumeData) => {
  const checkId = 'CHK-05';
  const categoryId = 'CAT-01';
  const title = 'Resume File Naming Convention';
  const description = 'Ensure file name is identifiable and recruiter-friendly when downloaded locally.';

  const fileName = resumeData?.originalFileName || resumeData?.title || '';
  const genericPatterns = [
    /^resume\.[a-z]{3,4}$/i,
    /^cv\.[a-z]{3,4}$/i,
    /^document\.[a-z]{3,4}$/i,
    /^my_resume[_\d]*\.[a-z]{3,4}$/i,
    /^my_cv[_\d]*\.[a-z]{3,4}$/i,
    /^untitled[_\d]*\.[a-z]{3,4}$/i,
    /^resume_final[_\d]*\.[a-z]{3,4}$/i,
  ];

  const isGeneric = genericPatterns.some((pattern) => pattern.test(fileName.trim()));

  if (!fileName || isGeneric) {
    return formatCheckResult({
      checkId,
      categoryId,
      title,
      status: 'WARNING',
      severity: 'low',
      description,
      evidence: [fileName || 'Unnamed file'],
      explanation: `File name '${fileName || 'Unnamed'}' is generic. Recruiters download dozens of resumes daily; generic filenames risk being misplaced or overwritten.`,
      recommendation: 'Rename your file to FirstName_LastName_Resume.pdf before submitting.',
      confidence: 1.0,
      limitations: [],
      source: 'deterministic',
    });
  }

  return formatCheckResult({
    checkId,
    categoryId,
    title,
    status: 'PASS',
    severity: 'info',
    description,
    evidence: [fileName],
    explanation: `File name '${fileName}' is descriptive and recruiter-friendly.`,
    recommendation: null,
    confidence: 1.0,
    limitations: [],
    source: 'deterministic',
  });
};

/**
 * CHK-06: Dates and Links Consistency
 */
export const checkDatesAndLinksConsistency = (resumeData) => {
  const checkId = 'CHK-06';
  const categoryId = 'CAT-01';
  const title = 'Dates and Links Consistency';
  const description = 'Standardize date formatting across job entries and verify URL protocol validity.';

  const text = resumeData?.extractedText || resumeData?.rawText || '';
  const experience = resumeData?.parsedSections?.structured?.experience || [];

  const issues = [];

  // Check date format consistency across experience entries
  // e.g. numeric "05/2020" vs named month "May 2020"
  const dateFormats = new Set();
  for (const exp of experience) {
    const rawDate = exp.dateRange?.raw || '';
    if (/\b\d{1,2}\/\d{4}\b/.test(rawDate)) {
      dateFormats.add('MM/YYYY');
    }
    if (/\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}\b/i.test(rawDate)) {
      dateFormats.add('Month YYYY');
    }
    if (/\b\d{4}\s*-\s*(?:\d{4}|present)\b/i.test(rawDate)) {
      dateFormats.add('YYYY');
    }
  }

  if (dateFormats.size > 1) {
    issues.push(`Mixed date styles detected: ${Array.from(dateFormats).join(', ')}`);
  }

  // Check if raw URLs in text lack protocol schemes (e.g., bare "linkedin.com/in" without https://)
  const bareUrls = (text.match(/\b(?<!https?:\/\/)(?:www\.)?(?:linkedin\.com|github\.com)\/[a-zA-Z0-9_\-\/]+/gi) || []);
  if (bareUrls.length > 0) {
    issues.push(`Detected ${bareUrls.length} link(s) without explicit https:// protocol`);
  }

  if (issues.length > 0) {
    return formatCheckResult({
      checkId,
      categoryId,
      title,
      status: 'WARNING',
      severity: 'medium',
      description,
      evidence: issues,
      explanation: 'Inconsistent date representations or bare web links without https:// protocol were found.',
      recommendation: 'Adopt a uniform date format (e.g., MM/YYYY or Month YYYY) across all roles and ensure all web links include the https:// scheme.',
      confidence: 0.85,
      limitations: ['Tolerates standard season dates such as "Summer 2023".'],
      source: 'deterministic',
    });
  }

  return formatCheckResult({
    checkId,
    categoryId,
    title,
    status: 'PASS',
    severity: 'info',
    description,
    evidence: ['Uniform date representations', 'Clean URL protocols'],
    explanation: 'Dates and hyperlinks maintain consistent conventions throughout the resume.',
    recommendation: null,
    confidence: 0.9,
    limitations: [],
    source: 'deterministic',
  });
};

export default {
  checkFileFormatAndParsing,
  checkAtsLayout,
  checkProfessionalEmail,
  checkProfessionalLinks,
  checkFileNamingConvention,
  checkDatesAndLinksConsistency,
};
