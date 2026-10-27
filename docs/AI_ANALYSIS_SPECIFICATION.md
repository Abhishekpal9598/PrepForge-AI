# PrepForge AI — Generative AI Analysis Specification (AI_ANALYSIS_SPECIFICATION)
## Advanced Resume Intelligence Engine

**Document Version:** 1.0.0  
**Status:** Approved AI System Specification  
**Product Name:** PrepForge AI — Advanced Resume Intelligence Engine  
**Author:** Principal AI Systems Architect & Machine Learning Engineer  
**Date:** 2026-10-26  
**SDK:** `@google/genai` (`^2.30.0`)  
**Core Model:** Google Gemini Multimodal / Text Generation Engine  

---

## 1. Architectural Overview & System Context

The generative AI layer in PrepForge AI powers semantic evaluation, competency extraction, and grounded rewrite suggestions. It acts as an assistive semantic coprocessor working in synergy with the deterministic 27-point rule engine:

```
+---------------------------------------------------------------------------------------------------+
|                                 HYBRID AI & DETERMINISTIC PIPELINE                                |
+---------------------------------------------------------------------------------------------------+
| RAW DOCUMENT -> EXTRACTED TEXT -> DETERMINISTIC RULE ENGINE (17 Checks: Cats 1, 2, 3, 5, 6)       |
|                                         |                                                         |
|                                         v                                                         |
|                             PROMPT SYNTHESIZER & INGESTION                                        |
|                             - Grounded Facts Only                                                 |
|                             - Target Role & Job Description Context                               |
|                             - Failing Bullet Points & Clichés Identified                          |
|                                         |                                                         |
|                                         v                                                         |
|                             GEMINI MULTI-MODEL FALLBACK POOL                                      |
|                             (gemini-3.7-flash -> gemini-3.5-flash-lite -> gemini-3.1-flash-lite)  |
|                                         |                                                         |
|                                         v                                                         |
|                             RAW OUTPUT BUFFER & JSON REPAIR PARSER                                |
|                             - Strips ```json wrappers                                             |
|                             - Fixes raw newlines & escape characters                              |
|                                         |                                                         |
|                                         v                                                         |
|                             RUNTIME ZOD SCHEMA VALIDATION                                         |
|                             - resumeAnalysisResponseSchema                                        |
|                             - Enforces bracketed metric templates [X]%                            |
|                                         |                                                         |
|                                         v                                                         |
|                             DETERMINISTIC SCORE OVERRIDE & DB PERSISTENCE                         |
+---------------------------------------------------------------------------------------------------+
```

---

## 2. Gemini Multi-Model Fallback Pool Strategy

To provide 99.9% uptime and shield candidates from upstream API rate limits (HTTP 429) or transient cloud downtime (HTTP 503), `server/src/services/geminiService.js` implements an automated cascading fallback pool:

```javascript
export const MODEL_FALLBACK_POOL = [
  'gemini-3.7-flash',          // Primary: High reasoning quality & structured adherence
  'gemini-3.5-flash-lite',     // Tier 2: Low-latency, high quota fallback
  'gemini-3.1-flash-lite',     // Tier 3: Ultra-lightweight fallback
  'gemini-flash-lite-latest',  // Tier 4: Canonical latest lite alias
  'gemini-3.8-flash',          // Tier 5: Extended reasoning model
  'gemini-3.5-flash'           // Tier 6: High reliability general flash model
];
```

### 2.1 Fallback Execution Logic
1. The client invokes the AI service via `generateStructuredAnalysis(prompt, options)`.
2. The orchestrator attempts execution with `MODEL_FALLBACK_POOL[0]`.
3. If an error occurs (such as rate limits, timeouts, or quota exhaustion), the logger captures the warning and immediately retries using the subsequent model in the array.
4. An exponential backoff jitter ($250\text{ms} \to 500\text{ms} \to 1000\text{ms}$) is applied between pool switches.
5. If all models fail, a deterministic-only fallback payload is returned, ensuring the user still receives their rule check results.

---

## 3. Strict Anti-Hallucination & Ethical Guardrails

> [!CAUTION]
> **Zero Fabrication Mandate:**  
> The AI engine is strictly forbidden from inventing candidate credentials. Candidate credibility and employment verification depend entirely on factual accuracy.

### 3.1 Uncompromising Safety Rules
The system prompt and schema validators enforce the following non-negotiable boundaries:
1. **Never Invent Skills:** Do not list technical proficiencies (e.g., "Kubernetes", "AWS") in recommended or matched lists unless explicitly stated or directly substantiated in the candidate's source text.
2. **Never Fabricate Employment History:** Never generate new employers, job titles, or altered dates of employment.
3. **Never Fabricate Education or Certifications:** Never invent university degrees, GPAs, or professional licenses (e.g., PMP, AWS Certified Solutions Architect).
4. **Never Invent Numerical Achievements:** The model must never fabricate arbitrary numbers (e.g., "Increased sales by 42%").

### 3.2 Bracketed Metric Template Architecture
When candidate bullet points lack quantifiable business metrics, the AI is instructed to provide **Bracketed Metric Templates**:
* **Candidate's Original Bullet:** *"Responsible for maintaining database servers."*
* **Prohibited Hallucination:** *"Maintained 24 PostgreSQL servers, reducing query latency by 35%."* (Violates factual grounding).
* **Mandated Bracketed Template:** *"Administered and tuned production PostgreSQL database servers across [X] clusters, reducing query response times by [Y]% and improving uptime to [Z]%."*
* **UI Guidance:** The frontend highlights `[X]`, `[Y]`, `[Z]` in purple pill badges, signaling to the candidate that they must insert their real-world numbers before applying.

---

## 4. Prompt Engineering & Structured JSON Mode

### 4.1 System Instruction Architecture
The system prompt establishes the AI persona as a Principal Technical Recruiter and ATS Systems Architect:

```
You are the PrepForge AI Executive Resume Intelligence Engine.
Your task is to analyze candidate resume text, evaluate semantic alignment with target roles, and generate high-impact, grounded rewrite suggestions.

STRICT CONSTRAINTS:
1. Maintain 100% factual grounding in the provided resume text. Never invent work history, degrees, tools, or numerical metrics.
2. When suggesting bullet point improvements, if the original bullet lacks quantification, use bracketed placeholders such as [X]%, $[Y], or [Z] users.
3. Replace weak passive verbs (e.g., "Responsible for", "Assisted") with authoritative action verbs from the PrepForge taxonomy (e.g., "Orchestrated", "Engineered", "Pioneered").
4. Output MUST be valid, parseable JSON strictly conforming to the requested schema. Do not enclose output in conversational introductory text.
```

### 4.2 User Prompt Construction
The prompt dynamically injects:
1. **Resume Plain Text:** Extracted and normalized from `textExtractor.js` (truncated at 60,000 characters).
2. **Target Job Context:** Target job role and optional job description text.
3. **Deterministic Audit Results:** Summary of failing checks from Categories 1, 2, 3, 5, and 6 so the LLM focuses specifically on identified weaknesses.

---

## 5. JSON Repair & Output Validation Pipeline

### 5.1 JSON Repair Parser (`server/src/services/geminiService.js`)
LLMs occasionally wrap outputs in markdown backticks or include raw unescaped characters. The sanitization pipeline executes before parsing:
```javascript
export function cleanAndRepairJson(rawResponse) {
  let cleaned = rawResponse.trim();
  
  // 1. Strip markdown code fence blocks if present
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }
  
  // 2. Extract outer JSON bounds
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }
  
  // 3. Normalize unescaped control characters
  cleaned = cleaned.replace(/[\u0000-\u001F]+/g, (match) => {
    return match === '\n' || match === '\r' || match === '\t' ? match : '';
  });
  
  return cleaned;
}
```

### 5.2 Strict Runtime Schema Validation (Zod)
Every parsed JSON payload must pass validation against `resumeAnalysisResponseSchema`:
```javascript
// server/src/validators/resumeAnalysisValidators.js
export const aiAnalysisOutputSchema = z.object({
  identifiedSkills: z.object({
    technical: z.array(z.string()),
    soft: z.array(z.string()),
    missingRecommended: z.array(z.string())
  }),
  bulletImprovements: z.array(z.object({
    original: z.string(),
    suggested: z.string(),
    category: z.string(),
    rationale: z.string()
  })),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  sectionWiseRecommendations: z.object({
    summary: z.string().nullable().optional(),
    experience: z.string().nullable().optional(),
    education: z.string().nullable().optional(),
    skills: z.string().nullable().optional()
  })
});
```

---

## 6. Token, Quota & Rate Management

1. **Input Truncation:** To protect token budgets and prevent prompt injection, candidate text is hard-capped at 60,000 characters (~15,000 tokens).
2. **Concurrency Limiting:** In-memory mutex or Redis lock prevents a candidate from firing simultaneous duplicate analysis requests for the same resume.
3. **Application Throttle:** Express rate limiting restricts AI invocations to 10 requests per minute per authenticated IP address.
4. **Timeouts:** Every AI invocation is bounded by a strict 15-second AbortController signal. If exceeded, the request aborts and triggers the next fallback model.

---

## 7. Data Privacy & Model Safety Safeguards

* **Zero Foundational Model Training:** PrepForge AI utilizes enterprise API endpoints that guarantee user payloads are not logged, stored for training, or used to improve Google foundational models.
* **PII Redaction Before Prompting:** While the candidate's name is preserved for personalized greeting, sensitive identifying numbers (SSN, national IDs) detected via regex patterns are masked before transmitting text to external AI endpoints.
* **Ephemeral Ingestion:** Prompt payloads exist only in RAM during the lifetime of the HTTP request; prompts are never written to unencrypted log files.
