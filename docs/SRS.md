# PrepForge AI — Software Requirements Specification (SRS)
## Advanced Resume Intelligence Engine

**Document Version:** 2.0.0  
**Status:** Approved Requirements Specification  
**Product Name:** PrepForge AI — Advanced Resume Intelligence Engine  
**Author:** Principal Software Architect & QA Systems Lead  
**Date:** 2026-10-26  
**Baseline Codebase:** PrepForge AI Full-Stack Platform (Phase 0 Audit Verified)  

---

## 1. Introduction

### 1.1 Purpose
This Software Requirements Specification (SRS) provides the authoritative, unambiguous technical specification for the **PrepForge AI Advanced Resume Intelligence Engine**. It establishes the functional criteria, input/output contracts, acceptance criteria, and failure states for engineering, automated test development, and quality assurance.

### 1.2 Scope
The Advanced Resume Intelligence Engine extends the existing PrepForge AI full-stack platform. It introduces a comprehensive 27-point auditing engine, multi-factor scoring architecture, interactive resume improvement studio, side-by-side version comparison, executive PDF report generator, and persistent global dark/light theme switching.

### 1.3 Definitions, Acronyms, and Abbreviations
* **ATS:** Applicant Tracking System
* **CHK:** Resume Audit Check identifier (CHK-01 to CHK-27)
* **FR:** Functional Requirement
* **IDOR:** Insecure Direct Object Reference
* **JWT:** JSON Web Token
* **LLM:** Large Language Model (Google Gemini)
* **MIME:** Multipurpose Internet Mail Extensions
* **NFR:** Non-Functional Requirement
* **STAR:** Situation, Task, Action, Result framework

---

## 2. Core Functional Requirements: Platform Services

### FR-PLAT-01: Resume Document Ingestion & Validation
* **Description:** Secure upload of candidate resumes in standard formats.
* **Priority:** Critical
* **Inputs:** `multipart/form-data` containing file buffer (`.pdf`, `.docx`, `.txt`), file size $\le 5\text{MB}$.
* **Expected Output:** File validated, sanitized, stored, and indexed in MongoDB under `resumes` collection.
* **Acceptance Criteria:**
  1. Validates magic bytes (`%PDF-` for PDF, `PK\x03\x04` for DOCX, UTF-8 for TXT).
  2. Blocks executable extensions, macros, and files exceeding 5MB with HTTP 400.
  3. Returns HTTP 201 with `{ resumeId, originalFileName, fileFormat, fileSize, uploadedAt }`.
* **Failure Conditions:** Missing file, unsupported MIME type, corrupt file signature, payload $> 5\text{MB}$.

### FR-PLAT-02: Document Text Extraction & Normalization
* **Description:** Deterministic plain text extraction and whitespace sanitization.
* **Priority:** Critical
* **Inputs:** Validated resume buffer or file path.
* **Expected Output:** Clean, normalized UTF-8 plain text string ($\ge 20$ characters).
* **Acceptance Criteria:**
  1. PDF text extracted via `pdf-parse`; DOCX text extracted via `mammoth`.
  2. Normalizes line breaks (`\r\n` $\to$ `\n`), strips non-printable binary control codes.
  3. Preserves paragraph and bullet point line-breaks.
* **Failure Conditions:** Scanned or image-only PDF with $< 20$ printable characters triggers HTTP 400 ("Unreadable text or scanned document").

### FR-PLAT-03: Multi-Factor Score Calculation Engine
* **Description:** Deterministic server-side computation of 5 independent scores bounded in $[0, 100]$.
* **Priority:** Critical
* **Inputs:** Array of 27 check results, optional target job description.
* **Expected Output:** Object `{ overallScore, atsScore, contentScore, structureScore, jobMatchScore }`.
* **Acceptance Criteria:**
  1. Computes `overallScore = round(0.35 * atsScore + 0.35 * contentScore + 0.30 * structureScore)`.
  2. Hard-Cap Policy: `atsScore <= 40` applies **only** upon genuine critical parsing failure in `CHK-01` (corrupted binary or scanned raster image with $< 20$ extractable characters). Missing contact fields apply localized point deductions, not global caps.
  3. Category 6 (Bias Prevention) carries zero scoring weight ($w_{\text{Cat 6}} \equiv 0$) and is completely excluded from the Structure Score formula.
  4. If no job description is provided, `jobMatchScore` is strictly `null` (displayed as `N/A`).
* **Failure Conditions:** Division by zero or unhandled missing check scores triggers fallback safe default with error logging.

### FR-PLAT-04: AI Grounded Recommendations & Rewrites
* **Description:** Generation of context-grounded bullet point rewrite suggestions.
* **Priority:** High
* **Inputs:** Extracted resume text, list of failing bullet points, target role.
* **Expected Output:** Array of rewrite objects `{ originalBullet, suggestedRewrite, rationale, impactedCategory }`.
* **Acceptance Criteria:**
  1. Suggests improvements using bracketed metric placeholders (e.g., `[X]%`, `[Y] users`) without fabricating numbers.
  2. Never invents employers, academic degrees, or certifications.
  3. Validated via Zod schema before transmission to client.
* **Failure Conditions:** Gemini API timeout or unparseable JSON triggers retry sequence across fallback model pool.

### FR-PLAT-05: Fast-Path Re-Analysis (`POST /api/v1/resumes/:id/recheck`)
* **Description:** High-speed re-evaluation of deterministic checks without full LLM call.
* **Priority:** Medium
* **Inputs:** Authenticated candidate request for an existing analyzed resume.
* **Expected Output:** Re-evaluated deterministic checks (Categories 1, 2, 3 rules) within 500ms.
* **Acceptance Criteria:**
  1. Re-executes regex and rule-based checks instantly.
  2. Recomputes deterministic components of sub-scores.
* **Failure Conditions:** Resume not found or unauthorized candidate returns HTTP 404 or 403.

### FR-PLAT-06: Side-by-Side Resume Version Comparison
* **Description:** Comparison of two resume versions belonging to the candidate.
* **Priority:** Medium
* **Inputs:** `baseResumeId`, `targetResumeId`.
* **Expected Output:** Object `{ scoreDeltas, resolvedChecks, newlyFailingChecks, textDiffSummary }`.
* **Acceptance Criteria:**
  1. Validates that both resumes belong to the authenticated user.
  2. Calculates numerical score delta for all 5 dimensions ($\Delta = S_{\text{target}} - S_{\text{base}}$).
  3. Lists checks that shifted from failed/warning to passed.
* **Failure Conditions:** Candidate attempts to compare a resume belonging to another user (HTTP 403 IDOR rejection).

### FR-PLAT-07: Downloadable & Printable PDF Audit Report
* **Description:** Client/server-rendered PDF report summarizing all 27 audit findings.
* **Priority:** High
* **Inputs:** `resumeAnalysisId`.
* **Expected Output:** Formatted PDF document buffer (`application/pdf`).
* **Acceptance Criteria:**
  1. Executive summary section with score gauges and key strengths.
  2. Tabulated breakdown of all 27 checks organized by the 7 categories.
  3. Print-optimized styling matching the PrepForge AI dark/light branding.
* **Failure Conditions:** Analysis record missing returns HTTP 404.

### FR-PLAT-08: Universal Global Theme Switching
* **Description:** Instant toggling between Dark Mode (`#080B14`) and Light Mode (`#F8FAFC`).
* **Priority:** High
* **Inputs:** User selection (`'dark' | 'light' | 'system'`) via header toggle or settings.
* **Expected Output:** Immediate CSS class application to `html` root with persistent storage.
* **Acceptance Criteria:**
  1. Theme changes synchronously without page reloads.
  2. Persisted in `localStorage` under `prepforge_theme`.
  3. Evaluated in HTML head before initial mount to prevent FOUC.
* **Failure Conditions:** LocalStorage disabled falls back gracefully to system preference.

---

## 3. The 27-Point Resume Checking Engine Functional Requirements

```
+---------------------------------------------------------------------------------------------------+
|                        SUMMARY OF FUNCTIONAL REQUIREMENTS: 27 RESUME CHECKS                       |
+---------------------------------------------------------------------------------------------------+
| ID        | CHECK NAME                   | CATEGORY                   | ENGINE      | SEVERITY    |
|-----------|------------------------------|----------------------------|-------------|-------------|
| FR-27-01  | File Format Compatibility    | Category 1: ATS Essentials | Rule        | Critical    |
| FR-27-02  | ATS-Friendly Design & Layout | Category 1: ATS Essentials | Hybrid      | High        |
| FR-27-03  | Professional Email Format    | Category 1: ATS Essentials | Rule        | Medium      |
| FR-27-04  | Header Professional Links    | Category 1: ATS Essentials | Rule        | Medium      |
| FR-27-05  | Resume File Name Convention  | Category 1: ATS Essentials | Rule        | Low         |
| FR-27-06  | Dates and Links Consistency  | Category 1: ATS Essentials | Rule        | Medium      |
| FR-27-07  | Essential Section Presence   | Category 2: Sections       | Rule        | Critical    |
| FR-27-08  | Contact Info Completeness    | Category 2: Sections       | Rule        | Critical    |
| FR-27-09  | Section Structural Ordering  | Category 2: Sections       | Rule        | Low         |
| FR-27-10  | ATS Parse Rate               | Category 3: Content        | Rule        | High        |
| FR-27-11  | Quantified Achievements      | Category 3: Content        | Hybrid      | High        |
| FR-27-12  | Repeated Words & Clichés     | Category 3: Content        | Rule        | Medium      |
| FR-27-13  | Spelling, Grammar & Casing   | Category 3: Content        | Hybrid      | High        |
| FR-27-14  | Bullet Length & Punctuation  | Category 3: Content        | Rule        | Medium      |
| FR-27-15  | Hard Technical Skills Match  | Category 4: Job Tailoring  | Semantic    | High        |
| FR-27-16  | Soft Skills Context Match    | Category 4: Job Tailoring  | Semantic    | Medium      |
| FR-27-17  | High-Impact Action Verbs     | Category 4: Job Tailoring  | Rule        | Medium      |
| FR-27-18  | Target Job Title Alignment   | Category 4: Job Tailoring  | Semantic    | Medium      |
| FR-27-19  | Timeline Credibility         | Category 5: Red Flags      | Rule        | High        |
| FR-27-20  | Interview Risk Signals       | Category 5: Red Flags      | Hybrid      | Medium      |
| FR-27-21  | Peer Benchmarking Check      | Category 5: Red Flags      | Rule        | Medium      |
| FR-27-22  | Professional Presence Match  | Category 5: Red Flags      | Rule        | Low         |
| FR-27-23  | Age & Date Bias Mitigation   | Category 6: Bias           | Rule        | Low         |
| FR-27-24  | Employment Gap Analysis      | Category 6: Bias           | Rule        | Medium      |
| FR-27-25  | Career Progression Check     | Category 7: Seniority      | Hybrid      | Medium      |
| FR-27-26  | Skills Demonstration Context | Category 7: Seniority      | Semantic    | High        |
| FR-27-27  | Ownership & Leadership Marks | Category 7: Seniority      | Hybrid      | Medium      |
+---------------------------------------------------------------------------------------------------+
```

---

### Category 1: ATS Essentials

#### FR-27-01: File Format & Critical Parsing Compatibility
* **Check ID:** `CHK-01`
* **Description:** Verify that the uploaded file is a clean, supported format (`.pdf`, `.docx`, `.txt`) and extractable as selectable text streams.
* **Priority:** Critical (P0)
* **Inputs:** Raw file buffer, file extension, MIME header.
* **Expected Output:** `{ checkId: "CHK-01", status: "passed" | "failed", score: 0-100, severity: "critical", parsingFailureType: string | null }`.
* **Acceptance Criteria:**
  1. Validates magic bytes (`%PDF-` for PDF, `PK\x03\x04` for DOCX, UTF-8 for TXT).
  2. Differentiates failure modes: Unsupported format, corrupted binary, password protection, or image-only scanned raster ($< 20$ extractable characters).
  3. **Only genuine critical parsing failure (unextractable text stream) triggers the documented ATS score cap ($\le 40$).**
  4. Successfully extracted text ($\ge 20$ characters) passes this check with score 100.
* **Failure Conditions:** Corrupted binary stream, password encryption, or unrecognized magic byte signature.

#### FR-27-02: ATS-Friendly Design & Layout
* **Check ID:** `CHK-02`
* **Description:** Detect multi-column structures, embedded tables, non-standard text frames, or graphic elements that scramble ATS parsing sequence.
* **Priority:** High (P1)
* **Inputs:** Parsed PDF stream layout, line-by-line bounding coordinates.
* **Expected Output:** `{ checkId: "CHK-02", status: "passed" | "warning" | "failed", layoutRisk: string }`.
* **Acceptance Criteria:** Single-column sequential layouts pass. Multi-column nested tables flag warnings with clear remediation steps.
* **Failure Conditions:** Bounding box coordinates indicate intersecting or overlapping text streams.

#### FR-27-03: Professional Email Format
* **Check ID:** `CHK-03`
* **Description:** Verify candidate email adheres to professional naming conventions without slang, vulgarity, or excessive random digits.
* **Priority:** Medium (P2)
* **Inputs:** Extracted email address string.
* **Expected Output:** `{ checkId: "CHK-03", status: "passed" | "warning" | "failed", emailDetected: string }`.
* **Acceptance Criteria:** Passes for standard `first.last@domain.com` or `flast@domain.com`. Flags warning if handle contains $>4$ trailing digits (e.g., `john987654@gmail.com`) or informal handles.
* **Failure Conditions:** No email found or email contains blacklisted spam patterns.

#### FR-27-04: Header Professional Links
* **Check ID:** `CHK-04`
* **Description:** Verify presence of active, properly structured professional links (LinkedIn, GitHub, Portfolio). Handled independently from primary contact fields.
* **Priority:** Medium (P2)
* **Inputs:** Extracted URLs from header and contact block.
* **Expected Output:** `{ checkId: "CHK-04", status: "passed" | "warning", linksFound: string[] }`.
* **Acceptance Criteria:** Passes if at least one verified professional profile URL (e.g., `linkedin.com/in/...` or `github.com/...`) is detected.
* **Failure Conditions:** Zero professional links detected in the resume header.

#### FR-27-05: Resume File Naming Convention
* **Check ID:** `CHK-05`
* **Description:** Check that the physical filename follows professional standards (`FirstName_LastName_Resume.pdf`).
* **Priority:** Low (P3)
* **Inputs:** Original upload filename string.
* **Expected Output:** `{ checkId: "CHK-05", status: "passed" | "warning", suggestedName: string }`.
* **Acceptance Criteria:** Passes if filename includes candidate name and keyword "Resume" or "CV". Flags generic names (`resume.pdf`, `doc_123.pdf`).
* **Failure Conditions:** Generic, whitespace-riddled, or numerical filenames.

#### FR-27-06: Dates and Links Consistency
* **Check ID:** `CHK-06`
* **Description:** Verify date formats are uniform throughout the document and URLs contain valid protocol prefixes (`https://`).
* **Priority:** Medium (P2)
* **Inputs:** Extracted date strings and hyperlinks across all sections.
* **Expected Output:** `{ checkId: "CHK-06", status: "passed" | "warning", inconsistencies: string[] }`.
* **Acceptance Criteria:** Flags mixed date schemes (e.g., mixing `2021-04`, `May 2022`, and `06/23`). Verifies all links start with `https://`.
* **Failure Conditions:** Broken hyperlink syntax or erratic date formatting schemes.

---

### Category 2: Resume Sections

#### FR-27-07: Essential Section Presence
* **Check ID:** `CHK-07`
* **Description:** Confirm presence of the non-negotiable structural sections: Experience, Education, and Skills.
* **Priority:** Critical (P0)
* **Inputs:** Parsed section header tokens.
* **Expected Output:** `{ checkId: "CHK-07", status: "passed" | "failed", missingSections: string[] }`.
* **Acceptance Criteria:** Essential structural sections recognized via standard regex heading patterns.
* **Failure Conditions:** Omission of Experience, Education, or Skills sections.

#### FR-27-08: Contact Information Completeness
* **Check ID:** `CHK-08`
* **Description:** Audit presence of candidate contact details, differentiating critical vs secondary vs optional fields.
* **Priority:** High (P1)
* **Inputs:** Header contact text tokens.
* **Expected Output:** `{ checkId: "CHK-08", status: "passed" | "warning" | "failed", missingFields: string[], advisoryNotes: string[] }`.
* **Acceptance Criteria:**
  1. *Email Address:* Critical contact field; missing email returns `status: "failed"` with localized deduction (-20 pts).
  2. *Telephone Number:* Secondary contact field; missing phone returns `status: "warning"` with minor deduction (-5 pts).
  3. *Location (City, State/Country):* Physical street addresses are **strictly NOT mandatory**; city/state is optional/advisory for remote roles.
  4. *Professional Links:* Managed independently under `CHK-04`.
  5. **Hard-Cap Policy:** Universal ATS hard caps are **never** applied for omitting phone numbers, locations, or secondary contact fields.
* **Failure Conditions:** Omission of candidate email address.

#### FR-27-09: Structural Section Ordering
* **Check ID:** `CHK-09`
* **Description:** Validate that sections appear in logical recruiter-scanning order.
* **Priority:** Low (P3)
* **Inputs:** Sequential ordering of detected section headings.
* **Expected Output:** `{ checkId: "CHK-09", status: "passed" | "warning", orderDetected: string[] }`.
* **Acceptance Criteria:** Header $\to$ Summary $\to$ Experience $\to$ Education $\to$ Skills (or Education preceding Experience for recent grads).
* **Failure Conditions:** Illogical sequencing (e.g., Contact info placed at the very end of page 2).

---

### Category 3: Resume Content (Configurable Coaching Guidelines)

> [!NOTE]
> The quantitative thresholds in Category 3 represent **configurable career coaching best practices**, NOT rigid universal ATS mandates. Real-world ATS systems ingest diverse structures; feedback modulates dynamically based on candidate career level and industry.

#### FR-27-10: ATS Parse Rate
* **Check ID:** `CHK-10`
* **Description:** Measure percentage of total extracted character volume cleanly categorized into recognized sections.
* **Priority:** High (P1)
* **Inputs:** Character count of structured sections vs. unmapped raw text.
* **Expected Output:** `{ checkId: "CHK-10", status: "passed" | "warning" | "failed", parseRate: number }`.
* **Acceptance Criteria:** Parse rate $\ge 85\%$ passes (coaching benchmark). Rate between $70-84\%$ flags warning. Accommodates non-standard academic grant/publication blocks and project portfolios.
* **Failure Conditions:** Excessive orphan text blocks or corrupted glyphs unmappable to sections ($< 70\%$).

#### FR-27-11: Quantified Achievements
* **Check ID:** `CHK-11`
* **Description:** Identify metric markers (`%`, `$`, numbers, multipliers, throughput metrics) within work experience bullet points.
* **Priority:** High (P1)
* **Inputs:** Array of extracted bullet point strings from Experience section.
* **Expected Output:** `{ checkId: "CHK-11", status: "passed" | "warning" | "failed", quantifiedRatio: number, weakBullets: string[] }`.
* **Acceptance Criteria:** $\ge 40\%$ of bullet points containing metrics qualifies as passing (coaching benchmark). Adapts expectations for qualitative disciplines (compliance, early-stage research, IT infrastructure) and entry-level tiers.
* **Failure Conditions:** $< 20\%$ of bullet points contain numbers or metrics.

#### FR-27-12: Repeated Words & Buzzwords
* **Check ID:** `CHK-12`
* **Description:** Detect excessive buzzwords ("synergy", "rockstar", "hardworker") and repetitive leading verbs.
* **Priority:** Medium (P2)
* **Inputs:** Word frequency distribution across bullet points.
* **Expected Output:** `{ checkId: "CHK-12", status: "passed" | "warning", overusedWords: { word: string, count: number }[] }`.
* **Acceptance Criteria:** Flags buzzwords from the PrepForge cliché dictionary; flags any action verb repeated $>3$ times in consecutive bullets.
* **Failure Conditions:** High density of corporate clichés with low concrete accomplishment language.

#### FR-27-13: Spelling, Grammar & Casing
* **Check ID:** `CHK-13`
* **Description:** Detect typos, grammatical flaws, and casing inconsistencies for technical acronyms (e.g., "Javascript" vs "JavaScript", "AWS", "GraphQL").
* **Priority:** High (P1)
* **Inputs:** Extracted text tokens evaluated via hybrid spell-checker and Gemini validation.
* **Expected Output:** `{ checkId: "CHK-13", status: "passed" | "warning" | "failed", issues: { token: string, suggestion: string }[] }`.
* **Acceptance Criteria:** Zero spelling errors in headings; $<2$ minor typos across entire document for pass status.
* **Failure Conditions:** Misspelled common words or corrupted technical terms.

#### FR-27-14: Bullet Length & Punctuation Consistency
* **Check ID:** `CHK-14`
* **Description:** Audit bullet points against human recruiter scannability heuristics (optimal: 15–30 words) and consistent terminal punctuation.
* **Priority:** Medium (P2)
* **Inputs:** Bullet token lengths and terminal characters.
* **Expected Output:** `{ checkId: "CHK-14", status: "passed" | "warning", bulletMetrics: object }`.
* **Acceptance Criteria:** Bullets stay within 10–40 words; all bullets consistently end with a period or consistently omit periods. Recognizes complex technical architecture descriptions that legitimately require 35-45 words.
* **Failure Conditions:** Fragmentary bullets ($<8$ words) or run-on paragraphs ($>50$ words).

---

### Category 4: Job Tailoring

#### FR-27-15: Hard Technical Skills Match
* **Check ID:** `CHK-15`
* **Description:** Match candidate's explicit technical skills against required competencies of target role or job description.
* **Priority:** High (P1)
* **Inputs:** Extracted candidate skills, target job description.
* **Expected Output:** `{ checkId: "CHK-15", status: "passed" | "warning" | "failed", matchPercentage: number, matchedSkills: string[], missingSkills: string[] }`.
* **Acceptance Criteria:** $\ge 70\%$ match of core technical competencies qualifies as passing.
* **Failure Conditions:** Critical required technical skills completely absent from resume.

#### FR-27-16: Soft Skills Context Match
* **Check ID:** `CHK-16`
* **Description:** Check presence of context-backed soft skills (e.g., cross-functional leadership, mentorship, stakeholder negotiation).
* **Priority:** Medium (P2)
* **Inputs:** Experience bullet points evaluated for behavioral indicators.
* **Expected Output:** `{ checkId: "CHK-16", status: "passed" | "warning", competenciesFound: string[] }`.
* **Acceptance Criteria:** Identifies soft competencies demonstrated with contextual evidence rather than raw adjective lists.
* **Failure Conditions:** Zero behavioral evidence of teamwork, communication, or problem solving.

#### FR-27-17: High-Impact Action Verbs
* **Check ID:** `CHK-17`
* **Description:** Verify that every bullet begins with an authoritative, active verb from the PrepForge taxonomy.
* **Priority:** Medium (P2)
* **Inputs:** First word of each bullet point token.
* **Expected Output:** `{ checkId: "CHK-17", status: "passed" | "warning", strongVerbRatio: number, passiveBullets: string[] }`.
* **Acceptance Criteria:** $\ge 80\%$ of bullets begin with strong action verbs (e.g., *Architected*, *Spearheaded*, *Engineered*, *Optimized*).
* **Failure Conditions:** Bullets begin with passive phrases (*"Responsible for"*, *"Assisted with"*, *"Worked on"*).

#### FR-27-18: Target Job Title Alignment
* **Check ID:** `CHK-18`
* **Description:** Check congruence between candidate resume headline, recent experience title, and target job title.
* **Priority:** Medium (P2)
* **Inputs:** Resume headline, latest role title, target job title.
* **Expected Output:** `{ checkId: "CHK-18", status: "passed" | "warning", alignmentScore: number }`.
* **Acceptance Criteria:** Clear semantic affinity between stated career identity and target job position.
* **Failure Conditions:** Severe title disconnect (e.g., applying for "Senior Data Engineer" with a headline of "Junior Graphic Designer").

---

### Category 5: Recruiter Red Flags

#### FR-27-19: Resume Timeline Credibility
* **Check ID:** `CHK-19`
* **Description:** Detect chronological impossibilities, overlapping full-time positions, or dates set in the future.
* **Priority:** High (P1)
* **Inputs:** Parsed dates associated with work experience entries.
* **Expected Output:** `{ checkId: "CHK-19", status: "passed" | "failed", discrepancies: string[] }`.
* **Acceptance Criteria:** All dates are in chronological order; no overlapping full-time roles unless flagged as concurrent/contract.
* **Failure Conditions:** End date precedes start date; start date set in the future.

#### FR-27-20: Interview Risk Signals
* **Check ID:** `CHK-20`
* **Description:** Identify vague scopes, defensive phrasing, or lack of individual contribution markers.
* **Priority:** Medium (P2)
* **Inputs:** Full text of Experience and Summary sections.
* **Expected Output:** `{ checkId: "CHK-20", status: "passed" | "warning", riskFactors: string[] }`.
* **Acceptance Criteria:** Bullets convey clear individual agency and ownership. Flags ambiguous group attribution (*"We helped with..."*).
* **Failure Conditions:** Candidate contributions cannot be isolated from general team activities.

#### FR-27-21: Peer Experience Benchmarking
* **Check ID:** `CHK-21`
* **Description:** Benchmark the breadth, depth, and bullet density of accomplishments against career tier expectations (Junior, Mid, Senior, Lead).
* **Priority:** Medium (P2)
* **Inputs:** Total years of experience, bullet point count, career level tier.
* **Expected Output:** `{ checkId: "CHK-21", status: "passed" | "warning", benchmarkSummary: string }`.
* **Acceptance Criteria:** Evaluates if senior roles have sufficient depth ($\ge 3$ rich bullets per role) without inventing fake comparisons.
* **Failure Conditions:** Senior candidate with only 1 thin bullet point per major multi-year role.

#### FR-27-22: Professional Presence Match
* **Check ID:** `CHK-22`
* **Description:** Validate consistency between headline title, stated experience level, and detailed job entries.
* **Priority:** Low (P3)
* **Inputs:** Extracted headline, summary, and accumulated years of experience.
* **Expected Output:** `{ checkId: "CHK-22", status: "passed" | "warning", coherenceScore: number }`.
* **Acceptance Criteria:** Coherent professional progression between summary claims and documented job history.
* **Failure Conditions:** Internal contradictions (e.g., claiming 10 years of React experience when React was created in 2013).

---

### Category 6: Bias and Discrimination Prevention (Strictly Advisory)

> [!IMPORTANT]
> Category 6 checks carry **zero numerical scoring weight** ($w_{\text{Cat 6}} \equiv 0$). They never reduce scores in ATS, Content, Structure, or Overall dimensions. All findings are strictly advisory.

#### FR-27-23: Age & Date Bias Mitigation
* **Check ID:** `CHK-23`
* **Description:** Flag graduation dates older than 15 years, personal demographic identifiers, or photos that trigger unconscious hiring bias.
* **Priority:** Low (P3) / Advisory
* **Inputs:** Education graduation dates, detected personal fields (marital status, photo markers).
* **Expected Output:** `{ checkId: "CHK-23", status: "passed" | "info", score: 100, severity: "info", advisoryNotes: string[] }`.
* **Acceptance Criteria:** Surfaces an advisory recommendation to remove high-school graduation years or $>15$-year degree dates to protect against ageism. **Strictly zero deduction applied to any score.**
* **Failure Conditions:** None (Advisory only; never penalizes resume scores).

#### FR-27-24: Employment Gap Analysis
* **Check ID:** `CHK-24`
* **Description:** Identify unannotated employment gaps $>6$ months and suggest proactive framing without reducing scores.
* **Priority:** Medium (P2) / Advisory
* **Inputs:** Chronological work experience timeline.
* **Expected Output:** `{ checkId: "CHK-24", status: "passed" | "info", score: 100, severity: "info", gapsDetected: { start: string, end: string, months: number }[] }`.
* **Acceptance Criteria:** Identifies gaps $>6$ months; suggests framing techniques (e.g., independent consulting, caregiving, professional development). **Strictly zero deduction applied to any score.**
* **Failure Conditions:** None (Advisory only; does not penalize overall or structure scores).

---

### Category 7: Seniority and Impact

#### FR-27-25: Career Progression Trajectory
* **Check ID:** `CHK-25`
* **Description:** Evaluate upward progression in responsibility, job title hierarchy, and project scope over time.
* **Priority:** Medium (P2)
* **Inputs:** Chronological sequence of job titles and bullet scopes.
* **Expected Output:** `{ checkId: "CHK-25", status: "passed" | "warning", progressionTrend: "ascending" | "lateral" | "unclear" }`.
* **Acceptance Criteria:** Recognizes promotions, title advancements, and expanding scope of influence.
* **Failure Conditions:** Titles and responsibilities show decreasing seniority without clear context.

#### FR-27-26: Skills Demonstration Context
* **Check ID:** `CHK-26`
* **Description:** Verify that hard skills listed in the Skills section are substantiated within Experience bullet points.
* **Priority:** High (P1)
* **Inputs:** Skills section tokens vs. Experience section tokens.
* **Expected Output:** `{ checkId: "CHK-26", status: "passed" | "warning", substantiatedSkills: string[], unverifiedSkills: string[] }`.
* **Acceptance Criteria:** $\ge 60\%$ of listed technical skills are actively mentioned in accomplishment bullets.
* **Failure Conditions:** High volume of disconnected buzzwords listed in Skills section with zero mention in job bullets.

#### FR-27-27: Ownership & Leadership Marks
* **Check ID:** `CHK-27`
* **Description:** Identify evidence of leadership, mentoring, technical architecture ownership, and cross-functional stewardship.
* **Priority:** Medium (P2)
* **Inputs:** Experience bullet points evaluated for leadership indicators.
* **Expected Output:** `{ checkId: "CHK-27", status: "passed" | "info", leadershipMarkers: string[] }`.
* **Acceptance Criteria:** Detects verbs and markers indicative of mentoring (*"mentored 4 engineers"*), architecture ownership (*"led architectural migration"*), and strategic impact.
* **Failure Conditions:** Zero leadership marks for Senior or Lead candidate profiles.
