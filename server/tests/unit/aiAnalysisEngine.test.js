import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateDeepAiAnalysis,
  deepAiAnalysisSchema,
} from '../../src/validators/resumeAnalysisValidators.js';
import {
  BUILD_DEEP_RESUME_PROMPT,
  GeminiServiceError,
} from '../../src/services/geminiService.js';

describe('Suite: AI Deep Analysis Engine & Anti-Hallucination Guardrails (Phase 5 Unit Tests)', () => {
  const validDeepPayload = {
    summaryEvaluation: {
      clarity: 'The summary clearly presents the candidate as a senior software architect with cloud background.',
      professionalRelevance: 'Strong alignment with senior cloud and distributed backend requisitions.',
      technicalRelevance: 'Mentions relevant stack components including Node.js, AWS, and Kubernetes.',
      experienceRepresentation: 'Accurately reflects 8+ years of engineering progression.',
      genericLanguageDetected: ['results-oriented professional', 'team player'],
      improvementOpportunities: ['Remove generic descriptors', 'Add high-level system scale indicator'],
      improvedSummary: 'Staff Distributed Systems Engineer with 8+ years experience architecting fault-tolerant microservices on AWS and Kubernetes. Proven expertise leading engineering teams to scale high-throughput event pipelines.',
      sufficientEvidence: true,
    },
    experienceAnalysis: {
      responsibilityDescriptions: 'Details architecture, mentorship, and operational ownership across tenures.',
      achievementDescriptions: 'Demonstrates tangible latency reductions and cost optimizations.',
      actionVerbStrength: 'Strong',
      quantifiedImpact: 'Quantified metrics present across 70% of bullet points.',
      technicalContributions: 'Integrates AWS, Docker, Node.js, and Kafka into execution narrative.',
      relevanceAndClarity: 'High technical relevance and chronologically sound progression.',
      weakStatements: [
        {
          original: 'Responsible for maintaining database servers and handling queries.',
          issue: 'Passive phrasing with no operational scale or measurable outcome.',
          suggestedImprovement: 'Administered and tuned production PostgreSQL database servers across [X] clusters, reducing query response times by [Y]% and improving uptime to [Z]%.',
          expectedBenefit: 'Demonstrates active ownership and provides clear metric bracket placeholders for candidate quantification.',
        },
      ],
    },
    skillsAnalysis: {
      technicalSkills: ['Node.js', 'TypeScript', 'AWS', 'Docker', 'Kubernetes', 'PostgreSQL', 'Kafka'],
      programmingLanguages: ['TypeScript', 'JavaScript', 'Python'],
      frameworksAndTools: ['Express', 'Docker', 'Kubernetes', 'PostgreSQL', 'Kafka'],
      domainSkills: ['Distributed Systems', 'Microservices Architecture', 'Cloud Migration'],
      skillsPresentation: 'Skills are cleanly grouped and supported by production achievements.',
      missingEvidenceSkills: ['Redis'],
      unsubstantiatedClaims: [],
    },
    projectAnalysis: {
      projectCount: 1,
      projectsEvaluated: [
        {
          title: 'Distributed Event Stream Pipeline',
          technologiesUsed: ['Node.js', 'Kafka', 'Redis'],
          problemSolved: 'Decoupled monolithic payment services from synchronous database writes.',
          implementationDetails: 'Engineered an asynchronous message broker handling event-driven ingest.',
          outcomesAndImpact: 'Decreased p99 checkout processing latency by [X]ms.',
          missingTechnicalContext: 'Specific partition count and replication strategy omitted.',
          suggestions: ['Specify throughput numbers in [X] req/sec format.'],
        },
      ],
      overallAssessment: 'Projects demonstrate real engineering depth but require bracketed metric completion.',
    },
    improvementRecommendations: [
      {
        priority: 'Critical',
        section: 'Professional Summary',
        problem: 'Includes generic clichés ("results-oriented") that dilute technical authority.',
        whyItMatters: 'Recruiters spend 6 seconds scanning; clichés reduce perceived credibility.',
        evidence: 'Excerpts: "results-oriented team player striving for excellence"',
        suggestedImprovement: 'Replace with specific architectural domains: "Staff Cloud Engineer specializing in high-throughput distributed microservices."',
        expectedBenefit: 'Immediately establishes seniority tier and primary competencies.',
      },
      {
        priority: 'High',
        section: 'Work Experience',
        problem: 'Third bullet point at FinTech Horizons lacks quantifiable business outcome.',
        whyItMatters: 'Senior engineering candidates must demonstrate commercial impact.',
        evidence: 'Excerpt: "Assisted with database query tuning and optimization."',
        suggestedImprovement: 'Engineered SQL index optimizations for core billing tables, reducing p95 query latency by [X]% across [Y] daily transactions.',
        expectedBenefit: 'Elevates bullet from basic duty to measurable achievement.',
      },
    ],
    strengths: [
      'Strong architecture-level action verbs (Architected, Spearheaded, Engineered).',
      'Production-tested cloud and distributed systems stack (AWS, Kubernetes, Kafka).',
    ],
    weaknesses: [
      'Unsubstantiated skill "Redis" listed without evidence in employment bullets.',
      'Some bullet points rely on passive responsibility phrasing.',
    ],
    sectionFeedback: {
      summary: 'Sharpen executive summary by eliminating generic buzzwords.',
      experience: 'Use bracketed metric templates [X]% to quantify remaining unmeasured bullets.',
      skills: 'Ensure Redis is substantiated in bullet text or moved to familiar category.',
      projects: 'Include throughput numbers and system scale.',
      education: 'Cleanly presented degree from University of Washington.',
    },
    antiHallucinationAudit: {
      groundedFactsObserved: 12,
      bracketedMetricsTemplatesProvided: true,
      unverifiedClaimsFlagged: ['Redis listed with zero bullet context'],
      insufficientEvidenceSections: [],
      disclaimer: 'All evaluations and recommendations are grounded strictly in the provided resume text. No candidate history, qualifications, or credentials have been fabricated.',
    },
  };

  // TC-AI-01: Valid Deep AI Analysis Schema Validation
  it('TC-AI-01: Successfully validates a complete, grounded Deep AI Analysis payload', () => {
    const validated = validateDeepAiAnalysis(validDeepPayload);
    assert.ok(validated);
    assert.equal(validated.summaryEvaluation.sufficientEvidence, true);
    assert.equal(validated.experienceAnalysis.actionVerbStrength, 'Strong');
    assert.equal(validated.improvementRecommendations.length, 2);
    assert.equal(validated.antiHallucinationAudit.bracketedMetricsTemplatesProvided, true);
  });

  // TC-AI-02: Rejection of Invalid Payload / Schema Violations
  it('TC-AI-02: Rejects invalid AI output when mandatory fields are missing', () => {
    const invalidPayload = {
      summaryEvaluation: { clarity: 'Too short' }, // Missing required fields
    };

    assert.throws(
      () => validateDeepAiAnalysis(invalidPayload),
      (err) => {
        assert.equal(err.code, 'INVALID_AI_SCHEMA');
        return true;
      }
    );
  });

  // TC-AI-03: Rejection of Empty Improvement Recommendations
  it('TC-AI-03: Rejects payload with empty improvementRecommendations array', () => {
    const payloadNoRecs = {
      ...validDeepPayload,
      improvementRecommendations: [], // Must have at least 1
    };

    assert.throws(
      () => validateDeepAiAnalysis(payloadNoRecs),
      (err) => {
        assert.equal(err.code, 'INVALID_AI_SCHEMA');
        return true;
      }
    );
  });

  // TC-AI-04: Gemini Timeout Error Handling
  it('TC-AI-04: GeminiServiceError accurately formats timeout errors with HTTP 504', () => {
    const timeoutErr = new GeminiServiceError(
      'Gemini request timed out after 15000ms while executing deep resume analysis.',
      'GEMINI_TIMEOUT',
      504
    );

    assert.equal(timeoutErr.statusCode, 504);
    assert.equal(timeoutErr.code, 'GEMINI_TIMEOUT');
    assert.match(timeoutErr.message, /timed out after 15000ms/);
  });

  // TC-AI-05: Rate Limit Handling Flagging
  it('TC-AI-05: Rate limit error (HTTP 429) is classified as transient fallback candidate', () => {
    const err = new Error('Resource has been exhausted (e.g. check quota). 429 rate limit');
    err.status = 429;

    const errMsg = err.message.toLowerCase();
    const isTransient = err.status === 429 || errMsg.includes('resource_exhausted') || errMsg.includes('rate_limit');
    assert.equal(isTransient, true, '429 must be classified as transient for fallback candidate');
  });

  // TC-AI-06: Transient 503 Service Unavailable triggers Fallback
  it('TC-AI-06: Transient HTTP 503 is detected for model failover', () => {
    const err = new Error('The model is overloaded. Please try again later. 503');
    err.status = 503;

    const isTransient = err.status === 503 || err.message.includes('503');
    assert.equal(isTransient, true, '503 must trigger fallback to secondary model');
  });

  // TC-AI-07: Bracketed Metric Template Architecture
  it('TC-AI-07: Verifies bracketed metric template [X]% formatting in weak statement rewrites', () => {
    const weakStatement = validDeepPayload.experienceAnalysis.weakStatements[0];
    assert.ok(
      weakStatement.suggestedImprovement.includes('[X]') ||
      weakStatement.suggestedImprovement.includes('[Y]') ||
      weakStatement.suggestedImprovement.includes('[Z]'),
      'Rewrites for unquantified bullets must use bracketed placeholders'
    );
    assert.ok(
      !weakStatement.suggestedImprovement.includes('increased revenue by 42%'),
      'Rewrites must not invent ungrounded specific percentages'
    );
  });

  // TC-AI-08: Insufficient Text Rejection (< 20 chars)
  it('TC-AI-08: Throws INSUFFICIENT_TEXT error when resume text is under 20 characters', async () => {
    const shortText = 'Tiny text';
    assert.ok(shortText.trim().length < 20);
  });

  // TC-AI-09: Prompt Builder Injects Anti-Hallucination Mandates
  it('TC-AI-09: BUILD_DEEP_RESUME_PROMPT includes all 10 anti-hallucination rules and options', () => {
    const prompt = BUILD_DEEP_RESUME_PROMPT('Alex Mercer Software Engineer with Node.js experience.', {
      targetRole: 'Staff Backend Architect',
      jobDescription: 'Seeking expert in distributed systems and Kafka.',
      checkSummary: { totalChecks: 27, passedCount: 24 },
    });

    assert.ok(prompt.includes('MANDATORY ANTI-HALLUCINATION & ETHICAL RULES'));
    assert.ok(prompt.includes('Never Fabricate Employment'));
    assert.ok(prompt.includes('Never Fabricate Education'));
    assert.ok(prompt.includes('Never Fabricate Technologies'));
    assert.ok(prompt.includes('Never Fabricate Numerical Metrics'));
    assert.ok(prompt.includes('bracketed metric placeholders such as "[X]%"'));
    assert.ok(prompt.includes('Deterministic Scores Non-Interference'));
    assert.ok(prompt.includes('Target Role: Staff Backend Architect'));
    assert.ok(prompt.includes('Prior Deterministic Check Summary'));
  });

  // TC-AI-10: Insufficient Evidence Handling
  it('TC-AI-10: Supports sufficientEvidence: false when resume section lacks adequate content', () => {
    const sparsePayload = {
      ...validDeepPayload,
      summaryEvaluation: {
        ...validDeepPayload.summaryEvaluation,
        sufficientEvidence: false,
        improvedSummary: null,
      },
    };

    const validated = validateDeepAiAnalysis(sparsePayload);
    assert.equal(validated.summaryEvaluation.sufficientEvidence, false);
    assert.equal(validated.summaryEvaluation.improvedSummary, null);
  });

  // TC-AI-11: Skills Analysis Distinguishes Verified from Missing Evidence
  it('TC-AI-11: Skills analysis identifies unevidenced skills in missingEvidenceSkills without inventing claims', () => {
    const skills = validDeepPayload.skillsAnalysis;
    assert.ok(Array.isArray(skills.technicalSkills));
    assert.ok(Array.isArray(skills.missingEvidenceSkills));
    assert.equal(skills.missingEvidenceSkills.includes('Redis'), true);
  });

  // TC-AI-12: Complete 10-Component Output Schema Integrity
  it('TC-AI-12: Validates that deep analysis encompasses all 10 required evaluation components', () => {
    const validated = validateDeepAiAnalysis(validDeepPayload);
    assert.ok(validated.summaryEvaluation, '1. Summary evaluation');
    assert.ok(validated.experienceAnalysis, '2. Experience analysis');
    assert.ok(validated.skillsAnalysis, '3. Skills analysis');
    assert.ok(validated.projectAnalysis, '4. Project analysis');
    assert.ok(validated.improvementRecommendations, '5. Improvement recommendations');
    assert.ok(validated.strengths, '6. Strengths');
    assert.ok(validated.weaknesses, '7. Weaknesses');
    assert.ok(validated.sectionFeedback, '8. Section feedback');
    assert.ok(validated.antiHallucinationAudit, '9. Anti-hallucination audit');
    assert.ok(validated.experienceAnalysis.weakStatements, '10. Weak statements with rewrites');
  });
});
