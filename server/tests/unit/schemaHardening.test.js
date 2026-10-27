import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  safeStringListSchema,
  projectEvaluationItemSchema,
  deepAiAnalysisSchema,
  validateDeepAiAnalysis,
} from '../../src/validators/resumeAnalysisValidators.js';

describe('Suite: Phase 5.2 Schema Hardening & Safe Array Preprocessing', () => {

  // Test 1: A valid suggestions array
  it('TC-HARDEN-01: Preserves a valid multi-element suggestions array unchanged', () => {
    const input = {
      title: 'Distributed Ingest Service',
      suggestions: [
        'Specify throughput in [X] req/sec format.',
        'Include p99 latency metrics.',
      ],
    };

    const parsed = projectEvaluationItemSchema.parse(input);
    assert.deepEqual(parsed.suggestions, [
      'Specify throughput in [X] req/sec format.',
      'Include p99 latency metrics.',
    ]);
  });

  // Test 2: A single suggestions string
  it('TC-HARDEN-02: Safely converts a single suggestions string into a single-element array', () => {
    const input = {
      title: 'Payment Gateway Integration',
      suggestions: 'Specify throughput in [X] req/sec format.',
    };

    const parsed = projectEvaluationItemSchema.parse(input);
    assert.deepEqual(parsed.suggestions, [
      'Specify throughput in [X] req/sec format.',
    ]);
  });

  // Test 3: Missing suggestions (undefined)
  it('TC-HARDEN-03: Gracefully defaults missing suggestions to an empty array []', () => {
    const input = {
      title: 'Cloud Migration Initiative',
    };

    const parsed = projectEvaluationItemSchema.parse(input);
    assert.deepEqual(parsed.suggestions, []);
  });

  // Test 4: Empty suggestions array
  it('TC-HARDEN-04: Preserves an empty suggestions array [] unchanged', () => {
    const input = {
      title: 'Cloud Migration Initiative',
      suggestions: [],
    };

    const parsed = projectEvaluationItemSchema.parse(input);
    assert.deepEqual(parsed.suggestions, []);
  });

  // Test 5: Null suggestions
  it('TC-HARDEN-05: Safely treats null suggestions as empty array []', () => {
    const input = {
      title: 'Cloud Migration Initiative',
      suggestions: null,
    };

    const parsed = projectEvaluationItemSchema.parse(input);
    assert.deepEqual(parsed.suggestions, []);
  });

  // Test 6: Empty string or whitespace-only suggestions
  it('TC-HARDEN-06: Safely converts blank/whitespace string suggestions to empty array []', () => {
    const inputEmpty = {
      title: 'Cloud Migration Initiative',
      suggestions: '',
    };
    const inputWhitespace = {
      title: 'Cloud Migration Initiative',
      suggestions: '   ',
    };

    assert.deepEqual(projectEvaluationItemSchema.parse(inputEmpty).suggestions, []);
    assert.deepEqual(projectEvaluationItemSchema.parse(inputWhitespace).suggestions, []);
  });

  // Test 7: Invalid object input
  it('TC-HARDEN-07: Strictly rejects object input for suggestions with validation error', () => {
    const input = {
      title: 'Cloud Migration Initiative',
      suggestions: { invalid: 'object' },
    };

    assert.throws(
      () => projectEvaluationItemSchema.parse(input),
      (err) => {
        assert.ok(err.issues.some((issue) => issue.path.includes('suggestions')));
        return true;
      }
    );
  });

  // Test 8: Invalid number input
  it('TC-HARDEN-08: Strictly rejects numeric input for suggestions with validation error', () => {
    const input = {
      title: 'Cloud Migration Initiative',
      suggestions: 12345,
    };

    assert.throws(
      () => projectEvaluationItemSchema.parse(input),
      (err) => {
        assert.ok(err.issues.some((issue) => issue.path.includes('suggestions')));
        return true;
      }
    );
  });

  // Test 9: Mixed-type array input
  it('TC-HARDEN-09: Strictly rejects mixed-type array containing non-strings', () => {
    const inputNumbers = {
      title: 'Cloud Migration Initiative',
      suggestions: ['Valid string', 42],
    };
    const inputObjects = {
      title: 'Cloud Migration Initiative',
      suggestions: ['Valid string', { bad: true }],
    };

    assert.throws(
      () => projectEvaluationItemSchema.parse(inputNumbers),
      (err) => {
        assert.ok(err.issues.some((issue) => issue.path.includes('suggestions')));
        return true;
      }
    );

    assert.throws(
      () => projectEvaluationItemSchema.parse(inputObjects),
      (err) => {
        assert.ok(err.issues.some((issue) => issue.path.includes('suggestions')));
        return true;
      }
    );
  });

  // Test 10: Safe preprocessor applied to other targeted string array fields
  it('TC-HARDEN-10: Safely handles single string coercion for technologiesUsed, missingEvidenceSkills, and unsubstantiatedClaims', () => {
    const project = projectEvaluationItemSchema.parse({
      title: 'Kafka Stream Consumer',
      technologiesUsed: 'Kafka',
      suggestions: 'Add benchmark results',
    });
    assert.deepEqual(project.technologiesUsed, ['Kafka']);
    assert.deepEqual(project.suggestions, ['Add benchmark results']);

    const validDeepPayload = {
      summaryEvaluation: {
        clarity: 'Clear summary presenting senior software engineer qualifications.',
        professionalRelevance: 'Strong alignment with backend roles.',
        technicalRelevance: 'Mentions relevant cloud stack.',
        experienceRepresentation: 'Accurately reflects experience.',
        genericLanguageDetected: 'results-oriented', // Single string coerced
        improvementOpportunities: 'Add scale indicators', // Single string coerced
        improvedSummary: 'Staff Distributed Systems Engineer...',
        sufficientEvidence: true,
      },
      experienceAnalysis: {
        responsibilityDescriptions: 'Describes technical duties well.',
        achievementDescriptions: 'Demonstrates tangible impact.',
        actionVerbStrength: 'Strong',
        quantifiedImpact: 'Metrics present in 70% of bullets.',
        technicalContributions: 'Integrates AWS, Docker, Node.js.',
        relevanceAndClarity: 'High technical relevance.',
        weakStatements: [],
      },
      skillsAnalysis: {
        technicalSkills: ['Node.js', 'AWS'],
        programmingLanguages: ['JavaScript'],
        frameworksAndTools: ['Express'],
        domainSkills: ['Cloud Architecture'],
        skillsPresentation: 'Clean skills organization.',
        missingEvidenceSkills: 'Redis', // Single string coerced
        unsubstantiatedClaims: '10x engineer', // Single string coerced
      },
      projectAnalysis: {
        projectCount: 1,
        projectsEvaluated: [
          {
            title: 'High Throughput API',
            technologiesUsed: 'Node.js', // Single string coerced
            suggestions: 'Specify queries/sec', // Single string coerced
          },
        ],
        overallAssessment: 'Solid architecture work presented.',
      },
      improvementRecommendations: [
        {
          priority: 'High',
          section: 'Summary',
          problem: 'Contains generic phrases',
          whyItMatters: 'Recruiters scan quickly',
          evidence: 'results-oriented',
          suggestedImprovement: 'Replace with specific tech stack',
          expectedBenefit: 'Clear technical positioning',
        },
      ],
      strengths: ['Strong action verbs.'],
      weaknesses: ['Missing evidence for Redis.'],
      sectionFeedback: {
        summary: 'Good summary',
        experience: 'Strong bullets',
        skills: 'Clear skills',
        projects: 'Good depth',
        education: 'Accurate degree',
      },
      antiHallucinationAudit: {
        groundedFactsObserved: 10,
        bracketedMetricsTemplatesProvided: true,
        unverifiedClaimsFlagged: 'Redis unevidenced', // Single string coerced
        insufficientEvidenceSections: [],
        disclaimer: 'All evaluations grounded in resume text.',
      },
    };

    const validated = validateDeepAiAnalysis(validDeepPayload);
    assert.deepEqual(validated.summaryEvaluation.genericLanguageDetected, ['results-oriented']);
    assert.deepEqual(validated.summaryEvaluation.improvementOpportunities, ['Add scale indicators']);
    assert.deepEqual(validated.skillsAnalysis.missingEvidenceSkills, ['Redis']);
    assert.deepEqual(validated.skillsAnalysis.unsubstantiatedClaims, ['10x engineer']);
    assert.deepEqual(validated.projectAnalysis.projectsEvaluated[0].technologiesUsed, ['Node.js']);
    assert.deepEqual(validated.projectAnalysis.projectsEvaluated[0].suggestions, ['Specify queries/sec']);
    assert.deepEqual(validated.antiHallucinationAudit.unverifiedClaimsFlagged, ['Redis unevidenced']);
  });

  // Test 11: Non-coerced structured array fields maintain strict validation
  it('TC-HARDEN-11: Structured object arrays (weakStatements, projectsEvaluated, improvementRecommendations) remain uncoerced and strictly validated', () => {
    // Passing a string to an object array must fail
    const invalidDeepPayload = {
      summaryEvaluation: {
        clarity: 'Clear summary presenting senior software engineer qualifications.',
        professionalRelevance: 'Strong alignment with backend roles.',
        technicalRelevance: 'Mentions relevant cloud stack.',
        experienceRepresentation: 'Accurately reflects experience.',
        genericLanguageDetected: [],
        improvementOpportunities: [],
        improvedSummary: null,
        sufficientEvidence: true,
      },
      experienceAnalysis: {
        responsibilityDescriptions: 'Describes technical duties well.',
        achievementDescriptions: 'Demonstrates tangible impact.',
        actionVerbStrength: 'Strong',
        quantifiedImpact: 'Metrics present in 70% of bullets.',
        technicalContributions: 'Integrates AWS, Docker, Node.js.',
        relevanceAndClarity: 'High technical relevance.',
        weakStatements: 'Invalid string instead of object array', // Must be rejected
      },
      skillsAnalysis: {
        technicalSkills: ['Node.js'],
        programmingLanguages: ['JavaScript'],
        frameworksAndTools: ['Express'],
        domainSkills: ['Cloud Architecture'],
        skillsPresentation: 'Clean skills organization.',
        missingEvidenceSkills: [],
        unsubstantiatedClaims: [],
      },
      projectAnalysis: {
        projectCount: 0,
        projectsEvaluated: [],
        overallAssessment: 'No projects provided.',
      },
      improvementRecommendations: [
        {
          priority: 'High',
          section: 'Summary',
          problem: 'Generic wording',
          whyItMatters: 'Recruiter scan',
          evidence: 'hardworking',
          suggestedImprovement: 'Be specific',
          expectedBenefit: 'Clear positioning',
        },
      ],
      strengths: ['Clear experience.'],
      weaknesses: ['No projects listed.'],
      sectionFeedback: {
        summary: '',
        experience: '',
        skills: '',
        projects: '',
        education: '',
      },
      antiHallucinationAudit: {
        groundedFactsObserved: 5,
        bracketedMetricsTemplatesProvided: true,
        unverifiedClaimsFlagged: [],
        insufficientEvidenceSections: [],
        disclaimer: 'All evaluations grounded in resume text.',
      },
    };

    assert.throws(
      () => validateDeepAiAnalysis(invalidDeepPayload),
      (err) => {
        assert.equal(err.code, 'INVALID_AI_SCHEMA');
        return true;
      }
    );
  });
});
