import { GoogleGenAI } from '@google/genai';
import config from '../config/env.js';
import { logger } from '../utils/logger.js';
import { validateAtsAnalysis, validateDeepAiAnalysis } from '../validators/resumeAnalysisValidators.js';
import { validateAiJobMatch } from '../validators/jobAnalysisValidators.js';
import {
  validateAiQuestionList,
  validateAiAnswerEvaluation,
  validateAiFinalEvaluation,
  calculateAnswerCompositeScore,
  determineFinalAssessmentLabel,
} from '../validators/interviewValidators.js';

/**
 * Standardized Gemini Service Error
 */
export class GeminiServiceError extends Error {
  constructor(message, code = 'GEMINI_ERROR', statusCode = 500, details = null) {
    super(message);
    this.name = 'GeminiServiceError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Sanitize error messages to prevent leaking API keys or secrets
 */
const sanitizeError = (errMsg) => {
  if (typeof errMsg !== 'string') return 'An error occurred during AI processing.';
  let clean = errMsg.replace(/AIza[0-9A-Za-z-_]{35}/g, '[REDACTED_API_KEY]');
  if (config.geminiApiKey && config.geminiApiKey.length > 5) {
    clean = clean.split(config.geminiApiKey).join('[REDACTED_API_KEY]');
  }
  return clean;
};

/**
 * Clean and extract JSON string from LLM output (removes markdown backticks)
 */
const extractJsonString = (rawText) => {
  if (!rawText || typeof rawText !== 'string') {
    throw new GeminiServiceError('Empty response received from AI model.', 'EMPTY_AI_RESPONSE', 502);
  }

  let text = rawText.trim();

  // Strip markdown code block wrappers if returned
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  }

  // Find boundaries of outer JSON object
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');

  if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
    throw new GeminiServiceError(
      'Malformed AI output: No valid JSON object boundaries detected.',
      'MALFORMED_AI_RESPONSE',
      502
    );
  }

  return text.substring(firstBrace, lastBrace + 1);
};

/**
 * Safely parse JSON from LLM output, resilient against invalid backslash escape sequences and raw control characters
 */
const safeParseJson = (cleanedJsonString) => {
  try {
    return JSON.parse(cleanedJsonString);
  } catch (initialErr) {
    // Attempt automatic repair of common LLM JSON syntax anomalies:
    // 1. Repair invalid backslash escape sequences like \s, \+, \(, \user
    let repaired = cleanedJsonString
      .replace(/\\([^"\\\/bfnrtu])/g, '\\\\$1')
      .replace(/\\u(?![0-9a-fA-F]{4})/g, '\\\\u')
      .replace(/[\x00-\x09\x0B-\x1F]/g, ' ');

    try {
      return JSON.parse(repaired);
    } catch {
      throw initialErr;
    }
  }
};

/**
 * Universal Gemini Execution with Automatic Multi-Tier Resilience & Model Failover
 */
const executeGeminiWithFallback = async ({ prompt, taskName, temperature = 0.2, options = {} }) => {
  const apiKey = config.geminiApiKey;
  if (!apiKey) {
    throw new GeminiServiceError(
      'Gemini API key is not configured on the server. Please set GEMINI_API_KEY.',
      'API_KEY_MISSING',
      503
    );
  }

  const primaryModel = options.model || config.geminiModel || 'gemini-3.7-flash';
  const timeoutMs = options.timeoutMs || 45000;
  const startTime = Date.now();

  const client = new GoogleGenAI({ apiKey });

  const executeCall = async (modelName) => {
    logger.info(`Invoking Gemini model (${modelName}) for ${taskName}...`);
    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await client.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          temperature,
          responseMimeType: 'application/json',
        },
      });
      clearTimeout(timeoutHandle);
      return { response, modelName };
    } catch (err) {
      clearTimeout(timeoutHandle);
      if (err.name === 'AbortError' || err.code === 'ABORT_ERR') {
        throw new GeminiServiceError(
          `Gemini request timed out after ${timeoutMs}ms while executing ${taskName}.`,
          'GEMINI_TIMEOUT',
          504
        );
      }
      const errMsg = (err.message || '').toLowerCase();
      const status = err.status || err.statusCode || err.code;
      const isTransient =
        status === 503 ||
        status === 429 ||
        errMsg.includes('503') ||
        errMsg.includes('high demand') ||
        errMsg.includes('unavailable') ||
        errMsg.includes('resource_exhausted') ||
        errMsg.includes('rate_limit') ||
        errMsg.includes('429');
      const isDeprecation =
        errMsg.includes('404') || errMsg.includes('not found') || errMsg.includes('no longer available');
      if (isTransient || isDeprecation) {
        const faultErr = new Error(`Model ${modelName} unavailable/busy: ${errMsg}`);
        faultErr.isFallbackCandidate = true;
        throw faultErr;
      }
      throw err;
    }
  };

  let rawResult = null;
  let activeModelUsed = primaryModel;
  let lastError = null;

  // Resilient multi-tier candidate models: prioritizes primary, then falls back through verified models
  const candidatePool = [
    primaryModel,
    'gemini-3.7-flash',
    'gemini-3.5-flash-lite',
    'gemini-3.1-flash-lite',
    'gemini-flash-lite-latest',
    'gemini-3.8-flash',
    'gemini-3.5-flash',
  ];
  const candidateModels = [...new Set(candidatePool.filter(Boolean))];

  for (let attempt = 0; attempt < candidateModels.length; attempt++) {
    const currentModel = candidateModels[attempt];
    if (attempt > 0) {
      const isDifferentModel = candidateModels[attempt - 1] !== currentModel;
      const backoffMs = isDifferentModel ? 200 : (attempt === 1 ? 500 : 2000);
      logger.warn(
        `Retrying (${attempt + 1}/${candidateModels.length}) with ${currentModel} for ${taskName} after ${backoffMs}ms...`
      );
      await new Promise((r) => setTimeout(r, backoffMs));
    }

    try {
      const res = await executeCall(currentModel);
      rawResult = res.response;
      activeModelUsed = res.modelName;
      lastError = null;
      break;
    } catch (err) {
      lastError = err;
      if (!err.isFallbackCandidate) {
        break;
      }
      logger.warn(
        `Attempt ${attempt + 1} with ${currentModel} encountered transient issue: ${err.message}`
      );
    }
  }

  if (!rawResult) {
    logger.error(`All model attempts exhausted for ${taskName}:`, sanitizeError(lastError?.message || 'Unknown error'));
    if (lastError instanceof GeminiServiceError) {
      throw lastError;
    }
    throw new GeminiServiceError(
      `Gemini service error: ${sanitizeError(lastError?.message || 'AI service unavailable')}`,
      'GEMINI_API_ERROR',
      lastError?.statusCode || 503
    );
  }

  const rawResponseText = rawResult?.text || '';
  if (!rawResponseText) {
    throw new GeminiServiceError('Gemini returned an empty text payload.', 'EMPTY_AI_PAYLOAD', 502);
  }

  let parsedJson;
  try {
    const cleanedJsonString = extractJsonString(rawResponseText);
    parsedJson = safeParseJson(cleanedJsonString);
  } catch (parseErr) {
    logger.error(`Failed to parse Gemini JSON response for ${taskName}:`, parseErr.message);
    throw new GeminiServiceError(
      'AI generated an invalid or unparseable JSON response. Please retry.',
      'MALFORMED_AI_RESPONSE',
      502,
      { originalError: parseErr.message }
    );
  }

  return {
    parsedJson,
    activeModelUsed,
    durationMs: Date.now() - startTime,
  };
};

/**
 * System prompt instructing Gemini to perform Phase 5 Deep Resume Intelligence Analysis
 * Enforces strict 10-rule anti-hallucination mandate and bracketed metric templates.
 */
export const BUILD_DEEP_RESUME_PROMPT = (resumeText, options = {}) => {
  const targetRole = options.targetRole || options.metadata?.targetRole || 'Not specified';
  const jobDescription = options.jobDescription || options.metadata?.jobDescription || 'Not specified';
  const checkSummary = options.checkSummary ? JSON.stringify(options.checkSummary) : 'None';

  return `You are the PrepForge AI Executive Resume Intelligence Engine.
Your objective is to conduct an in-depth, rigorous, professional qualitative analysis of the provided candidate resume.

MANDATORY ANTI-HALLUCINATION & ETHICAL RULES:
1. Grounding Mandate: Base every observation, critique, and recommendation STRICTLY on the actual resume text provided below.
2. Never Fabricate Employment: Do NOT invent companies, job titles, tenures, or employment experiences.
3. Never Fabricate Education: Do NOT invent degrees, universities, GPA, or academic honors.
4. Never Fabricate Certifications: Do NOT invent professional licenses or certificates.
5. Never Fabricate Technologies: Do NOT list skills, tools, or languages that are not explicitly evidenced in the text.
6. Never Fabricate Numerical Metrics: When bullet points lack metrics, DO NOT invent specific numbers (e.g. "increased revenue by 35%"). Instead, ALWAYS use bracketed metric placeholders such as "[X]%", "$[Y]", or "[Z] users" so the candidate can insert their real-world achievements.
7. Never Claim Guarantees: Never claim any suggestion guarantees ATS clearance or hiring success.
8. Distinguish Evidence from Advice: Clearly separate observed resume facts from recommended actions.
9. Insufficient Evidence Rule: If a section (e.g. summary or projects) lacks sufficient substantive content to write a reliable evaluation, explicitly set sufficientEvidence to false and state that evidence was insufficient rather than inventing assumptions.
10. Deterministic Scores Non-Interference: Do NOT calculate or overwrite mathematical ATS scores. Your analysis is qualitative, diagnostic, and prescriptive.

ANALYSIS COMPONENTS REQUIRED (JSON Schema conforming):
1. summaryEvaluation:
   - clarity: Assessment of summary clarity and readability (min 5 chars).
   - professionalRelevance: Alignment with professional trajectory (min 5 chars).
   - technicalRelevance: Alignment with target technical competencies (min 5 chars).
   - experienceRepresentation: How accurately it summarizes career level (min 5 chars).
   - genericLanguageDetected: Array of identified buzzwords or clichés (e.g. "hardworking", "results-driven team player").
   - improvementOpportunities: Array of concrete enhancement opportunities.
   - improvedSummary: Grounded, high-impact rewrite (or null if insufficient original evidence exists).
   - sufficientEvidence: Boolean indicating if enough original text was present.

2. experienceAnalysis:
   - responsibilityDescriptions: Evaluation of how responsibilities are framed (min 5 chars).
   - achievementDescriptions: Evaluation of how outcomes are framed (min 5 chars).
   - actionVerbStrength: "Strong" | "Moderate" | "Weak".
   - quantifiedImpact: Assessment of metric density and measurable outcomes (min 5 chars).
   - technicalContributions: Evaluation of how tools/languages are integrated into bullets (min 5 chars).
   - relevanceAndClarity: Assessment of chronological clarity and scope (min 5 chars).
   - weakStatements: Array of objects with { original, issue, suggestedImprovement (using bracketed metrics [X]%), expectedBenefit }.

3. skillsAnalysis:
   - technicalSkills: Array of technical skills explicitly mentioned in resume.
   - programmingLanguages: Array of programming languages explicitly mentioned.
   - frameworksAndTools: Array of frameworks/libraries/tools explicitly mentioned.
   - domainSkills: Array of domain or industry competencies explicitly mentioned.
   - skillsPresentation: Assessment of how skills are organized (min 5 chars).
   - missingEvidenceSkills: Skills listed in the skills section that have ZERO supporting context in work bullets.
   - unsubstantiatedClaims: Unsubstantiated claims or buzzwords lacking proof.

4. projectAnalysis:
   - projectCount: Integer count of distinct projects identified in text (or 0 if none).
   - projectsEvaluated: Array of objects with { title, technologiesUsed, problemSolved, implementationDetails, outcomesAndImpact, missingTechnicalContext, suggestions }.
   - overallAssessment: Holistic evaluation of technical project presentation (min 5 chars).

5. improvementRecommendations:
   - Array of prioritized recommendation objects (at least 2):
     {
       priority: "Critical" | "High" | "Medium" | "Low",
       section: string (e.g. "Work Experience", "Professional Summary", "Technical Skills"),
       problem: string (clear description of identified issue),
       whyItMatters: string (recruiter/ATS perspective on why this matters),
       evidence: string (exact excerpt or quote from resume demonstrating the problem),
       suggestedImprovement: string (grounded, actionable rewrite or restructure; use [X]% for numbers),
       expectedBenefit: string (concrete improvement outcome)
     }

6. strengths: Array of 2 to 5 genuine, verified competitive strengths observed in candidate's text.
7. weaknesses: Array of 2 to 5 genuine, verified weaknesses or growth areas observed in candidate's text.

8. sectionFeedback:
   - summary: Specific diagnostic feedback for summary section.
   - experience: Specific diagnostic feedback for work experience.
   - skills: Specific diagnostic feedback for skills section.
   - projects: Specific diagnostic feedback for projects section.
   - education: Specific diagnostic feedback for education section.

9. antiHallucinationAudit:
   - groundedFactsObserved: Integer count of verified factual bullet points analyzed.
   - bracketedMetricsTemplatesProvided: Boolean (must be true).
   - unverifiedClaimsFlagged: Array of any unsupported candidate claims.
   - insufficientEvidenceSections: Array of section names where original text was too sparse.
   - disclaimer: "All evaluations and recommendations are grounded strictly in the provided resume text. No candidate history, qualifications, or credentials have been fabricated."

CONTEXT PROVIDED:
- Target Role: ${targetRole}
- Target Job Description: ${jobDescription}
- Prior Deterministic Check Summary: ${checkSummary}

OUTPUT REQUIREMENT:
Output MUST be a single, valid, parseable JSON object matching this schema exactly. Do NOT wrap in introductory or concluding markdown or conversational text.

--- RESUME TEXT BEGINS ---
${resumeText}
--- RESUME TEXT ENDS ---
`;
};

/**
 * Execute Gemini AI Resume Analysis with timeout, retries, and schema validation
 *
 * @param {string} resumeText - Raw extracted resume text
 * @param {object} [options={}] - Options including custom timeout, metadata, or model override
 * @returns {Promise<{ analysis: object, deepAnalysis: object, modelUsed: string, durationMs: number }>}
 */
export const analyzeResumeWithGemini = async (resumeText, options = {}) => {
  if (!resumeText || typeof resumeText !== 'string' || resumeText.trim().length < 20) {
    throw new GeminiServiceError(
      'Resume content has insufficient text for analysis (minimum 20 characters required).',
      'INSUFFICIENT_TEXT',
      400
    );
  }

  // Truncate overly long text (> 60,000 chars) to prevent token exhaustion and DoS
  const safeResumeText = resumeText.slice(0, 60000);

  const apiKey = config.geminiApiKey;
  if (!apiKey) {
    throw new GeminiServiceError(
      'Gemini API key is not configured on the server. Please set GEMINI_API_KEY.',
      'API_KEY_MISSING',
      503
    );
  }

  const prompt = BUILD_DEEP_RESUME_PROMPT(safeResumeText, options);

  const { parsedJson, activeModelUsed, durationMs } = await executeGeminiWithFallback({
    prompt,
    taskName: `deep resume intelligence analysis [Chars: ${safeResumeText.length}]`,
    temperature: 0.2,
    options,
  });

  // Validate with Zod
  try {
    const deepAnalysis = validateDeepAiAnalysis(parsedJson);

    // Build backward-compatible ATS analysis view for legacy clients
    const legacyAnalysis = {
      overallScore: options.deterministicOverallScore ?? 75,
      resumeSummary:
        deepAnalysis.summaryEvaluation?.improvedSummary ||
        deepAnalysis.summaryEvaluation?.clarity ||
        'Comprehensive resume evaluation completed.',
      categoryScores: {
        impact: deepAnalysis.experienceAnalysis?.actionVerbStrength === 'Strong' ? 85 : 70,
        brevity: 80,
        style: 80,
        skills: (deepAnalysis.skillsAnalysis?.missingEvidenceSkills || []).length === 0 ? 85 : 75,
        atsReadability: 80,
      },
      technicalSkills: deepAnalysis.skillsAnalysis?.technicalSkills || [],
      softSkills: deepAnalysis.skillsAnalysis?.domainSkills || [],
      workExperienceAnalysis: {
        summary: deepAnalysis.experienceAnalysis?.achievementDescriptions || '',
        bulletPointsEvaluated: (deepAnalysis.experienceAnalysis?.weakStatements || []).map((w) => ({
          original: w.original,
          issue: w.issue,
          rewrite: w.suggestedImprovement,
          impact: w.expectedBenefit,
        })),
        actionVerbStrength: deepAnalysis.experienceAnalysis?.actionVerbStrength || 'Moderate',
        quantifiableResultsPresent:
          Boolean(deepAnalysis.experienceAnalysis?.quantifiedImpact &&
          (deepAnalysis.experienceAnalysis.quantifiedImpact.toLowerCase().includes('present') ||
           deepAnalysis.experienceAnalysis.quantifiedImpact.toLowerCase().includes('quantif'))),
      },
      educationAnalysis: {
        summary: deepAnalysis.sectionFeedback?.education || 'Education credentials reviewed.',
        degreesFound: [],
        institutionFound: true,
        recommendations: [],
      },
      strengths: deepAnalysis.strengths,
      weaknesses: deepAnalysis.weaknesses,
      missingSkills: deepAnalysis.skillsAnalysis?.missingEvidenceSkills || [],
      keywordOptimization: {
        summary: deepAnalysis.skillsAnalysis?.skillsPresentation || '',
        highValueKeywordsFound: (deepAnalysis.skillsAnalysis?.technicalSkills || []).slice(0, 5),
        suggestedKeywordsToAdd: deepAnalysis.skillsAnalysis?.missingEvidenceSkills || [],
      },
      formattingFeedback: {
        isAtsFriendly: true,
        fontAndLayoutAdvice: deepAnalysis.sectionFeedback?.experience || '',
        sectionsIdentified: ['Summary', 'Experience', 'Skills', 'Education'],
        potentialParsingRisks: [],
      },
      improvementSuggestions: (deepAnalysis.improvementRecommendations || []).map((r) => ({
        priority: r.priority === 'Critical' ? 'High' : r.priority,
        section: r.section,
        suggestion: `${r.problem} — ${r.suggestedImprovement}`,
        actionableExample: r.expectedBenefit,
      })),
      sectionWiseRecommendations: [
        {
          sectionName: 'Summary',
          status: deepAnalysis.summaryEvaluation?.sufficientEvidence ? 'Good' : 'Needs Improvement',
          feedback: deepAnalysis.sectionFeedback?.summary || '',
        },
        {
          sectionName: 'Experience',
          status: 'Good',
          feedback: deepAnalysis.sectionFeedback?.experience || '',
        },
        {
          sectionName: 'Skills',
          status: 'Good',
          feedback: deepAnalysis.sectionFeedback?.skills || '',
        },
      ],
      disclaimer: deepAnalysis.antiHallucinationAudit?.disclaimer || 'All evaluations are grounded strictly in resume text.',
    };

    logger.info(
      `Deep AI resume analysis completed successfully with ${activeModelUsed} in ${durationMs}ms`
    );

    return {
      analysis: legacyAnalysis,
      deepAnalysis,
      modelUsed: activeModelUsed,
      durationMs,
    };
  } catch (schemaErr) {
    logger.error('Deep AI schema validation error:', schemaErr.message);
    throw new GeminiServiceError(
      `AI analysis output does not conform to required deep intelligence schema: ${schemaErr.message}`,
      'INVALID_AI_SCHEMA',
      502,
      schemaErr.issues
    );
  }
};

/**
 * System prompt instructing Gemini to analyze Job Description requirements and match against Resume
 */
const BUILD_JOB_MATCH_PROMPT = (jobData, resumeText) => `You are a Principal Technical Recruiter and Hiring Architect specializing in career intelligence and semantic resume matching.

Your objective is twofold:
1. Conduct an in-depth extraction of the requirements in the provided Job Description (technical skills, soft skills, seniority level, experience, education, key responsibilities, and keywords).
2. Perform a rigorous, grounded semantic match between the candidate's Resume and the Job Description.

EVALUATION PRINCIPLES:
1. Strict Grounding: Evaluate only the text provided in the Job Description and the Resume. Do NOT fabricate requirements absent from the JD, and do NOT invent qualifications absent from the Resume.
2. Explainable Weighted Scoring Rubric:
   - Skills Match (40%): Overlap between candidate's proven competencies and the JD's required and preferred skills.
   - Experience Match (30%): Alignment in years of experience, seniority scope, and role relevance.
   - Education Match (15%): Degree level, field of study, or equivalent practical experience.
   - Scope & Keywords (15%): Coverage of domain-specific terminology, architectural responsibilities, and core tooling.
   matchScore = round(0.40 * skillsMatch + 0.30 * experienceMatch + 0.15 * educationMatch + 0.15 * scopeAndKeywords)
3. Transparency: Clearly distinguish between hard missing requirements vs. nice-to-have preferred skills.
4. Disclaimer: Do not present this AI estimation as a guaranteed recruiter outcome.

OUTPUT FORMAT REQUIREMENTS:
You MUST respond with a single, valid, parseable JSON object without any additional preamble, markdown notes, or explanation outside the JSON.

Expected JSON Structure:
{
  "matchScore": <integer 0-100 calculated as 0.40*skillsMatch + 0.30*experienceMatch + 0.15*educationMatch + 0.15*scopeAndKeywords>,
  "matchSummary": "<string: concise 2-4 sentence executive overview of candidate fit against this specific role>",
  "categoryScores": {
    "skillsMatch": <integer 0-100>,
    "experienceMatch": <integer 0-100>,
    "educationMatch": <integer 0-100>,
    "scopeAndKeywords": <integer 0-100>
  },
  "jobRequirements": {
    "seniorityLevel": "<'Entry-Level' | 'Mid-Level' | 'Senior' | 'Staff/Principal' | 'Lead/Manager' | 'Executive'>",
    "requiredTechnicalSkills": ["<string>", ...],
    "preferredTechnicalSkills": ["<string>", ...],
    "softSkills": ["<string>", ...],
    "requiredExperience": "<string: e.g. 5+ years building backend systems>",
    "educationRequirements": "<string: e.g. Bachelor's in CS or equivalent experience>",
    "keyResponsibilities": ["<string>", ...],
    "importantKeywords": ["<string>", ...]
  },
  "matchedSkills": ["<string: skill explicitly present in both resume and JD>", ...],
  "missingRequiredSkills": ["<string: critical skill demanded by JD but absent from resume>", ...],
  "missingPreferredSkills": ["<string: preferred/bonus skill desired by JD but absent from resume>", ...],
  "experienceAnalysis": {
    "status": "<'Exceeds' | 'Meets' | 'Partially Meets' | 'Below'>",
    "candidateExperienceSummary": "<string: candidate's relevant background summary>",
    "requiredExperienceSummary": "<string: role's stated experience requirement>",
    "assessment": "<string: detailed assessment of candidate seniority and tenure fit>"
  },
  "educationAnalysis": {
    "status": "<'Meets' | 'Partially Meets' | 'Below'>",
    "candidateEducation": "<string: candidate's academic background>",
    "requiredEducation": "<string: role's educational requirement>",
    "assessment": "<string: evaluation of degree/background relevance>"
  },
  "keywordOverlap": {
    "highValueKeywordsFound": ["<string>", ...],
    "missingKeywords": ["<string>", ...],
    "overlapPercentage": <integer 0-100>
  },
  "relevantResumeSections": [
    {
      "sectionTitle": "<string: e.g. Acme Corp - Staff Software Engineer>",
      "excerpt": "<string: relevant achievement or bullet from resume>",
      "relevance": "<string: explanation of why this experience directly maps to the target JD>"
    }
  ],
  "strengthsForThisJob": ["<string: specific competitive advantage for this position>", ...],
  "weaknessesAndGaps": ["<string: concrete vulnerability or gap that could lower interview likelihood>", ...],
  "improvementRecommendations": [
    {
      "priority": "<'High' | 'Medium' | 'Low'>",
      "area": "<string: e.g. Experience Bullets, Technical Skills, Summary>",
      "recommendation": "<string: specific guidance on tailoring resume for this job>"
    }
  ],
  "disclaimer": "This match score is an estimation based on semantic skill and experience alignment. It does not guarantee recruiter decisions or universal ATS screening outcomes."
}

--- TARGET JOB DETAILS ---
Job Title: ${jobData.jobTitle || 'N/A'}
Company: ${jobData.companyName || jobData.company || 'N/A'}
Location: ${jobData.location || 'N/A'}

Job Description:
${jobData.jobDescription}

--- CANDIDATE RESUME ---
${resumeText}
`;

/**
 * Execute Gemini AI Job Description Analysis & Resume Matching
 *
 * @param {object} jobData - { jobTitle, companyName, location, jobDescription }
 * @param {string} resumeText - Candidate's extracted resume text
 * @param {object} [options={}] - Options including custom timeout or model override
 * @returns {Promise<{ match: object, modelUsed: string, durationMs: number }>}
 */
export const analyzeJobMatchWithGemini = async (jobData, resumeText, options = {}) => {
  if (!jobData?.jobDescription || typeof jobData.jobDescription !== 'string' || jobData.jobDescription.trim().length < 50) {
    throw new GeminiServiceError(
      'Job description must contain at least 50 characters for analysis.',
      'INSUFFICIENT_JOB_TEXT',
      400
    );
  }

  if (!resumeText || typeof resumeText !== 'string' || resumeText.trim().length < 20) {
    throw new GeminiServiceError(
      'Resume content has insufficient text for matching (minimum 20 characters required).',
      'INSUFFICIENT_RESUME_TEXT',
      400
    );
  }

  const safeResumeText = resumeText.slice(0, 60000);
  const safeJobDescription = jobData.jobDescription.slice(0, 50000);

  const safeJobData = {
    ...jobData,
    jobDescription: safeJobDescription,
  };

  const prompt = BUILD_JOB_MATCH_PROMPT(safeJobData, safeResumeText);

  const { parsedJson, activeModelUsed, durationMs } = await executeGeminiWithFallback({
    prompt,
    taskName: 'job description analysis & resume matching',
    temperature: 0.2,
    options,
  });

  try {
    const validatedMatch = validateAiJobMatch(parsedJson);

    logger.info(
      `Job match analysis completed successfully with ${activeModelUsed} in ${durationMs}ms [Score: ${validatedMatch.matchScore}]`
    );

    return {
      match: validatedMatch,
      modelUsed: activeModelUsed,
      durationMs,
    };
  } catch (schemaErr) {
    logger.error('AI Job Match schema validation error:', schemaErr.message);
    throw new GeminiServiceError(
      `AI job match output does not conform to required schema: ${schemaErr.message}`,
      'INVALID_AI_SCHEMA',
      502,
      schemaErr.issues
    );
  }
};

/**
 * System Prompt: Generate Mock Interview Questions
 */
const BUILD_INTERVIEW_QUESTIONS_PROMPT = ({
  jobRole,
  experienceLevel,
  category,
  difficulty,
  numberOfQuestions,
  resumeText,
  jobDescription,
  additionalInstructions,
}) => `You are a Principal Technical Interviewer and Engineering Hiring Committee Leader.

Generate exactly ${numberOfQuestions} realistic, insightful interview questions for the candidate based on these parameters:
- Target Job Role: ${jobRole}
- Experience Level: ${experienceLevel}
- Interview Category: ${category}
- Difficulty Level: ${difficulty}
${additionalInstructions ? `- Additional Guidance: ${additionalInstructions}` : ''}
${
  resumeText
    ? `\n--- CANDIDATE RESUME CONTEXT (Ask questions that explore their stated background and technical projects, DO NOT fabricate experience): ---\n${resumeText.slice(
        0,
        4000
      )}`
    : ''
}
${
  jobDescription
    ? `\n--- TARGET JOB DESCRIPTION CONTEXT (Align questions with responsibilities and skills required): ---\n${jobDescription.slice(
        0,
        4000
      )}`
    : ''
}

QUESTION GUIDELINES:
1. Questions must be strictly appropriate for a ${experienceLevel} professional applying for ${jobRole} in ${category} category at ${difficulty} level.
2. Select appropriate questionTypes: 'Technical', 'Conceptual', 'Behavioral', 'Situational'.
3. Provide 3-5 concrete 'expectedAnswerPoints' per question detailing what a strong candidate response should cover.
4. If resume context is provided, personalize at least 1-2 questions directly referencing their projects or technologies without hallucinating unlisted details.

OUTPUT FORMAT REQUIREMENTS:
Return ONLY a valid, parseable JSON object with NO markdown formatting or commentary.

Expected JSON Structure:
{
  "questions": [
    {
      "questionId": "q_1",
      "questionText": "<string: clear question prompt>",
      "category": "${category}",
      "difficulty": "${difficulty}",
      "questionType": "<Technical | Conceptual | Behavioral | Situational>",
      "expectedAnswerPoints": [
        "<string: key point 1>",
        "<string: key point 2>",
        "<string: key point 3>"
      ]
    }
  ]
}
`;

/**
 * Generate Interview Questions with Gemini
 */
export const generateInterviewQuestionsWithGemini = async (configData, options = {}) => {
  const {
    jobRole,
    experienceLevel = 'Mid-Level',
    category = 'Technical',
    difficulty = 'Medium',
    numberOfQuestions = 5,
    resumeText = '',
    jobDescription = '',
    additionalInstructions = '',
  } = configData;

  const prompt = BUILD_INTERVIEW_QUESTIONS_PROMPT({
    jobRole,
    experienceLevel,
    category,
    difficulty,
    numberOfQuestions,
    resumeText,
    jobDescription,
    additionalInstructions,
  });

  const { parsedJson, activeModelUsed, durationMs } = await executeGeminiWithFallback({
    prompt,
    taskName: `interview questions generation (${jobRole} - ${category})`,
    temperature: 0.3,
    options,
  });

  try {
    const validated = validateAiQuestionList(parsedJson);
    // Ensure all questions have unique IDs
    validated.questions.forEach((q, idx) => {
      if (!q.questionId) {
        q.questionId = `q_${idx + 1}_${Math.random().toString(36).substring(2, 9)}`;
      }
      const acceptedDifficulties = ['Easy', 'Medium', 'Hard'];
      if (!acceptedDifficulties.includes(q.difficulty)) {
        q.difficulty = difficulty || 'Medium';
      }
      const acceptedCategories = ['Technical', 'HR', 'Behavioral', 'Role-Based', 'General'];
      if (!acceptedCategories.includes(q.category)) {
        q.category = category || 'Technical';
      }
    });

    logger.info(
      `Generated ${validated.questions.length} interview questions with ${activeModelUsed} in ${durationMs}ms`
    );

    return {
      questions: validated.questions,
      modelUsed: activeModelUsed,
      durationMs,
    };
  } catch (schemaErr) {
    logger.error('AI Interview Question schema validation error:', schemaErr.message);
    throw new GeminiServiceError(
      `AI interview questions output does not conform to required schema: ${schemaErr.message}`,
      'INVALID_AI_SCHEMA',
      502,
      schemaErr.issues
    );
  }
};

/**
 * System Prompt: Evaluate Single Interview Answer
 */
const BUILD_ANSWER_EVALUATION_PROMPT = ({
  questionText,
  category,
  difficulty,
  questionType,
  expectedAnswerPoints = [],
  userAnswer,
  jobRole,
  experienceLevel,
}) => `You are an expert AI Interview Evaluator and Senior Engineering Hiring Committee member.

Evaluate the candidate's response to the following interview question:
- Target Role & Seniority: ${experienceLevel} ${jobRole}
- Question Category: ${category} (${difficulty} difficulty, Type: ${questionType})
- Question: "${questionText}"
- Expected Answer Key Points:
${expectedAnswerPoints.map((p, i) => `  ${i + 1}. ${p}`).join('\n')}

- Candidate's Submitted Response:
"${userAnswer}"

EVALUATION PRINCIPLES:
1. Fairness & Grounding: Base evaluation solely on the candidate's response. For technical questions, inspect architectural accuracy, correctness, and trade-offs. For behavioral/situational questions, inspect context (STAR method), agency, and outcomes.
2. If the answer is very short, evasive, or "I don't know", score low appropriately but maintain a constructive tone and provide a complete model answer.
3. Scoring Dimensions (0 to 100 each):
   - technicalAccuracy: Accuracy of concepts, syntax, patterns, and principles.
   - relevance: How directly and specifically the answer addresses the question.
   - completeness: Coverage of edge cases, trade-offs, and key expected points.
   - clarity: Structure, conciseness, and articulation.
   - communicationQuality: Professional tone and confidence.
4. Constructive Feedback:
   - correctPoints: Specific concepts candidate covered well.
   - missingPoints: Essential concepts omitted.
   - incorrectStatements: Any factual errors or misconceptions (empty array if none).
   - strengths: Commendable aspects of the response.
   - weaknesses: Opportunities for improvement.
   - suggestions: Practical tips to elevate the answer.
   - exampleImprovedAnswer: An exemplary, polished response representing a top-tier ${experienceLevel} candidate.

OUTPUT FORMAT REQUIREMENTS:
Return ONLY a valid, parseable JSON object with NO markdown or commentary.

Expected JSON Structure:
{
  "technicalAccuracy": <integer 0-100>,
  "relevance": <integer 0-100>,
  "completeness": <integer 0-100>,
  "clarity": <integer 0-100>,
  "communicationQuality": <integer 0-100>,
  "correctPoints": ["<string>", ...],
  "missingPoints": ["<string>", ...],
  "incorrectStatements": ["<string>", ...],
  "strengths": ["<string>", ...],
  "weaknesses": ["<string>", ...],
  "suggestions": ["<string>", ...],
  "exampleImprovedAnswer": "<string: complete top-tier model response>"
}
`;

/**
 * Evaluate Candidate Answer with Gemini
 */
export const evaluateInterviewAnswerWithGemini = async (data, options = {}) => {
  const {
    questionText,
    category = 'Technical',
    difficulty = 'Medium',
    questionType = 'Technical',
    expectedAnswerPoints = [],
    userAnswer,
    jobRole = 'Software Engineer',
    experienceLevel = 'Mid-Level',
  } = data;

  const prompt = BUILD_ANSWER_EVALUATION_PROMPT({
    questionText,
    category,
    difficulty,
    questionType,
    expectedAnswerPoints,
    userAnswer: (userAnswer || '').slice(0, 5000),
    jobRole,
    experienceLevel,
  });

  const { parsedJson, activeModelUsed, durationMs } = await executeGeminiWithFallback({
    prompt,
    taskName: `answer evaluation (${category} - ${difficulty})`,
    temperature: 0.2,
    options,
  });

  try {
    const validated = validateAiAnswerEvaluation(parsedJson);
    validated.score = validated.overallScore;
    validated.categoryScores = {
      technicalAccuracy: validated.technicalAccuracy,
      relevance: validated.relevance,
      completeness: validated.completeness,
      clarity: validated.clarity,
      communicationQuality: validated.communicationQuality,
    };
    validated.modelAnswer = validated.exampleImprovedAnswer;

    logger.info(
      `Evaluated answer with ${activeModelUsed} in ${durationMs}ms [Score: ${validated.overallScore}]`
    );

    return {
      evaluation: validated,
      modelUsed: activeModelUsed,
      durationMs,
    };
  } catch (schemaErr) {
    logger.error('AI Answer Evaluation schema validation error:', schemaErr.message);
    throw new GeminiServiceError(
      `AI answer evaluation output does not conform to required schema: ${schemaErr.message}`,
      'INVALID_AI_SCHEMA',
      502,
      schemaErr.issues
    );
  }
};

/**
 * System Prompt: Generate Final Comprehensive Interview Report
 */
const BUILD_FINAL_EVALUATION_PROMPT = ({ session, questionsSummary, averageScore }) => `You are the Lead Hiring Committee Evaluator.

Synthesize performance for this completed mock interview session into a comprehensive diagnostic report:
- Job Role: ${session.jobRole} (${session.experienceLevel})
- Category: ${session.category} | Difficulty: ${session.difficulty}
- Total Questions: ${session.totalQuestions}
- Quantitative Calculated Score: ${averageScore}/100

Detailed Question Evaluations:
${questionsSummary}

EVALUATION REQUIREMENTS:
1. Category-wise Performance: Break down scores across relevant competencies (e.g. Domain Knowledge, Problem Solving, Communication).
2. Narrative Assessments:
   - technicalAssessment: Detailed critique of engineering / domain proficiency demonstrated.
   - communicationAssessment: Detailed critique of clarity, conciseness, and articulation.
3. Strongest & Weakest Answers: Highlight top-performing answers and areas with the most significant gaps.
4. Recommendations & Study Topics: Provide 3-5 concrete study topics and strategic advice for upcoming real interviews.
5. Final Assessment Label: Choose strictly among 'Excellent' (score >= 85), 'Strong' (score >= 70), 'Good' (score >= 50), or 'Needs Improvement' (score < 50).
6. Mandatory AI Disclaimer: Clearly state this is an AI estimate for interview practice and not a guaranteed hiring decision.

OUTPUT FORMAT REQUIREMENTS:
Return ONLY a valid, parseable JSON object with NO markdown or commentary.

Expected JSON Structure:
{
  "overallScore": ${averageScore},
  "categoryScores": {
    "${session.category}": <integer 0-100>,
    "Technical Depth": <integer 0-100>,
    "Communication": <integer 0-100>
  },
  "technicalAssessment": "<string: comprehensive narrative analysis>",
  "communicationAssessment": "<string: comprehensive narrative analysis>",
  "strongestAnswers": [
    { "questionText": "<string>", "score": <number>, "highlight": "<string: why this answer was strong>" }
  ],
  "weakestAnswers": [
    { "questionText": "<string>", "score": <number>, "gap": "<string: primary missing concept or weakness>" }
  ],
  "improvementRecommendations": [
    "<string: actionable recommendation 1>",
    "<string: actionable recommendation 2>",
    "<string: actionable recommendation 3>"
  ],
  "suggestedTopics": [
    "<string: specific topic to review>",
    "<string: specific topic to review>"
  ],
  "finalAssessmentLabel": "<Excellent | Strong | Good | Needs Improvement>",
  "aiDisclaimer": "AI-generated evaluation for interview preparation purposes. This does not represent an actual hiring decision or employment guarantee."
}
`;

/**
 * Generate Final Interview Report with Gemini
 */
export const generateFinalInterviewReportWithGemini = async (sessionData, options = {}) => {
  const { session, answeredQuestions = [] } = sessionData;

  // Compute quantitative average score from individual question evaluations
  const scores = answeredQuestions
    .map((q) => q.evaluation?.score ?? q.evaluation?.overallScore)
    .filter((s) => typeof s === 'number');

  const averageScore = scores.length
    ? Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length)
    : 50;

  const questionsSummary = answeredQuestions
    .map((q, idx) => {
      const qScore = q.evaluation?.score ?? q.evaluation?.overallScore ?? 'N/A';
      return `[Q${idx + 1}] (${q.category} - ${q.difficulty}): "${q.questionText}"
Candidate Answer: "${(q.userAnswer || 'No answer submitted').slice(0, 300)}"
Score: ${qScore}/100
Strengths: ${(q.evaluation?.strengths || []).join(', ') || 'None noted'}
Gaps: ${(q.evaluation?.missingPoints || []).join(', ') || 'None noted'}`;
    })
    .join('\n\n');

  const prompt = BUILD_FINAL_EVALUATION_PROMPT({
    session,
    questionsSummary,
    averageScore,
  });

  const { parsedJson, activeModelUsed, durationMs } = await executeGeminiWithFallback({
    prompt,
    taskName: `final interview report (${session.jobRole})`,
    temperature: 0.2,
    options,
  });

  try {
    const validated = validateAiFinalEvaluation(parsedJson);
    validated.overallScore = averageScore;
    validated.finalAssessmentLabel = determineFinalAssessmentLabel(averageScore);

    logger.info(
      `Final interview report synthesized with ${activeModelUsed} in ${durationMs}ms [Overall: ${validated.overallScore}]`
    );

    return {
      finalEvaluation: validated,
      overallScore: averageScore,
      modelUsed: activeModelUsed,
      durationMs,
    };
  } catch (schemaErr) {
    logger.error('AI Final Evaluation schema validation error:', schemaErr.message);
    throw new GeminiServiceError(
      `AI final evaluation output does not conform to required schema: ${schemaErr.message}`,
      'INVALID_AI_SCHEMA',
      502,
      schemaErr.issues
    );
  }
};

export default {
  BUILD_DEEP_RESUME_PROMPT,
  analyzeResumeWithGemini,
  analyzeJobMatchWithGemini,
  generateInterviewQuestionsWithGemini,
  evaluateInterviewAnswerWithGemini,
  generateFinalInterviewReportWithGemini,
  GeminiServiceError,
};

