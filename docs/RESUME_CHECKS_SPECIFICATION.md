# PrepForge AI — 27-Point Resume Checks Specification (RESUME_CHECKS_SPECIFICATION)
## Advanced Resume Intelligence Engine

**Document Version:** 1.0.0  
**Status:** Approved Reference Specification  
**Product Name:** PrepForge AI — Advanced Resume Intelligence Engine  
**Author:** Principal Software Architect & Head of ATS Research  
**Date:** 2026-10-26  
**Total Checks:** 27 Checks Organized Across 7 Specialized Categories  

---

## 1. Architectural Taxonomy & Overview

The 27 checks in PrepForge AI are designed to evaluate candidate resumes across both automated parser compliance (ATS) and human recruiter scanning behavior.

```
+---------------------------------------------------------------------------------------------------+
|                                 27-CHECK CATEGORICAL BREAKDOWN                                    |
+---------------------------------------------------------------------------------------------------+
| CATEGORY                      | CHECKS INCLUDED         | PRIMARY ENGINE        | SCORING ROLE    |
|-------------------------------|-------------------------|-----------------------|-----------------|
| 1. ATS Essentials             | CHK-01 to CHK-06 (6)    | Deterministic / Rule  | ATS Score       |
| 2. Resume Sections            | CHK-07 to CHK-09 (3)    | Regex / Structural    | ATS & Structure |
| 3. Resume Content             | CHK-10 to CHK-14 (5)    | Rule / Hybrid / LLM   | Content Score   |
| 4. Job Tailoring              | CHK-15 to CHK-18 (4)    | Semantic / Gemini     | Job Match Score |
| 5. Recruiter Red Flags        | CHK-19 to CHK-22 (4)    | Rule / Hybrid         | Structure Score |
| 6. Bias and Discrimination    | CHK-23 to CHK-24 (2)    | Rule / Advisory       | Non-Penalizing  |
| 7. Seniority and Impact       | CHK-25 to CHK-27 (3)    | Semantic / Hybrid     | Content Score   |
+---------------------------------------------------------------------------------------------------+
```

### 1.1 The Five Dimensional Scores
Every check result directly feeds into one or more of the 5 distinct, transparent scores:
1. **Overall Resume Score ($0 - 100$):** Weighted composite computed as $\text{round}(0.35 \times \text{ATS Score} + 0.35 \times \text{Content Score} + 0.30 \times \text{Structure Score})$.
2. **ATS Compatibility Score ($0 - 100$):** Derived from Category 1 (ATS Essentials: `CHK-01` to `CHK-06`, 50%), Category 2 (Section & Contact Presence: `CHK-07`, `CHK-08`, 30%), and Category 3 (`CHK-10` Parse Rate, 20%).
   - **Hard-Cap Policy:** Bounded at $\le 40$ **only** upon genuine critical parsing failure in `CHK-01` (corrupted binary, encryption, or scanned raster image with $< 20$ extractable characters). Missing contact fields apply localized point deductions, not global caps.
3. **Resume Content Score ($0 - 100$):** Derived from Category 3 (Content Quality: `CHK-11` to `CHK-14`, 60%) and Category 7 (Seniority & Demonstrated Skills: `CHK-25` to `CHK-27`, 40%), heavily weighting metric quantification (`CHK-11`) and substantiated skills (`CHK-26`).
4. **Resume Structure Score ($0 - 100$):** Derived from Category 2 (Section Flow & Sequence: `CHK-09`, 25%) and Category 5 (Recruiter Red Flags / Timeline Sanity: `CHK-19` to `CHK-22`, 75%).
   - **Category 6 Excluded:** Category 6 carries strictly zero scoring weight ($w_{\text{Cat 6}} \equiv 0$), guaranteeing that employment gaps and graduation dates never reduce the Structure Score.
5. **Job Match Score ($0 - 100$, Conditional):** Derived from Category 4 (Job Tailoring: $0.40 \times \text{Hard Skills} + 0.25 \times \text{Soft Skills} + 0.20 \times \text{Action Verbs} + 0.15 \times \text{Title Alignment}$). Reports strictly `null` (displayed as `N/A`) when omitted.

---

## 2. Ethical Guidelines & Guardrails for Automated Checks

1. **Non-Penalizing Bias Checks (CHK-23 & CHK-24):** Graduation years $>15$ years ago or employment gaps $>6$ months **must never reduce numerical scores**. They are classified as `severity: "info"` or `"advisory"` with constructive career framing advice. Category 6 carries zero scoring weight ($w_{\text{Cat 6}} \equiv 0$).
2. **Zero Demographic Inferences:** The engine never attempts to infer candidate age, gender, race, ethnicity, religion, or sexual orientation.
3. **No Fabricated Benchmarks (CHK-21):** Peer benchmarking checks measure candidate bullet density, role depth, and skill counts against career tier requirements (e.g., Senior vs Junior) without inventing fictional industry percentages.
4. **Transparent Verification Standards (CHK-22):** The system checks URL syntax and domain validity (`linkedin.com/in/...`) without claiming external API authentication or identity verification.
5. **Missing Fields vs Errors:** A missing optional section (e.g., Certifications) is classified as a suggestion, whereas a missing required section (e.g., Experience) is an error.
6. **Formatting Risk vs Incompatibility:** Distinguishes between layout risks (multi-column tables that might scramble text in older ATS) and fatal incompatibilities (corrupted file).
7. **Configurable Coaching Guidelines:** Quantitative thresholds (85% Parse Rate, 40% Quantification, 15–30 Word Bullets) represent coaching best practices rather than rigid universal ATS mandates, adapting to profession, seniority, and resume type.

---

## 3. Exhaustive Check Specifications (CHK-01 to CHK-27)

---

### CATEGORY 1: ATS ESSENTIALS (6 Checks)

#### CHK-01: File Format & Critical Parsing Compatibility
* **Unique ID:** `CHK-01`
* **Purpose:** Ensure the resume is uploaded in an ATS-supported format (`.pdf`, `.docx`, `.txt`) and extractable as selectable text streams without corruption.
* **Category:** ATS Essentials
* **Input Data:** Raw uploaded buffer, MIME type, filename extension.
* **Evaluation Methodology:** Deterministic binary magic-byte inspection and stream extractability check.
* **Engine:** Deterministic Rule
* **Detection Rules:**
  - PDF: Buffer must start with `%PDF-` (`0x25 0x50 0x44 0x46 0x2D`).
  - DOCX: Buffer must start with `PK\x03\x04` (`0x50 0x4B 0x03 0x04`).
  - TXT: Valid UTF-8 encoding.
  - File size must be $\le 5,242,880$ bytes (5MB).
  - Differentiates Failure Modes:
    1. *Unsupported Format:* Extension or MIME not in allowed whitelist.
    2. *Corrupted File:* Truncated stream or damaged file table.
    3. *Password-Protected File:* Encrypted buffer requiring password.
    4. *Image-Only / Scanned PDF:* Raster scan yielding $< 20$ extractable characters without OCR.
    5. *Critical Parsing Failure:* Inability to extract readable text tokens.
    6. *Successfully Extracted Text:* Text stream extracted and normalized cleanly ($\ge 20$ characters).
* **Scoring Impact:** Critical. **Only genuine critical parsing failure (unextractable text stream) triggers the documented ATS score cap ($\le 40$).** Successfully parsed files receive a score of 100.
* **Severity:** `critical`
* **Result Structure:** `{ checkId: "CHK-01", status: "passed"|"failed", score: 100|0, severity: "critical", summary: string, details: { format: string, sizeBytes: number, failureType: string|null } }`
* **Recommendations:** "Upload a clean, non-password-protected, text-selectable PDF or DOCX file."
* **Edge Cases:** Password-protected PDFs, zero-byte empty files, `.exe` renamed to `.pdf`.
* **Unit Test Scenarios:**
  - Test valid PDF $\to$ Passed (100).
  - Test corrupted bytes $\to$ Failed (0) with ATS cap.
  - Test image-only PDF ($<20$ chars) $\to$ Failed (0) with ATS cap.
  - Test 6MB file $\to$ Rejected at upload middleware.
* **Limitations:** Cannot perform OCR on flattened image-only scans without OCR microservice.

#### CHK-02: ATS-Friendly Design & Layout
* **Purpose:** Detect complex nested tables, multi-column divisions, and floating graphics that cause ATS parsers to interleave unrelated text streams.
* **Category:** ATS Essentials
* **Input Data:** Extracted text bounding boxes / layout stream cues.
* **Evaluation Methodology:** Rule-based layout parser augmented by character stream continuity analysis.
* **Engine:** Hybrid (Rule + Heuristic)
* **Detection Rules:**
  - Flags if horizontal text coordinates jump back and forth across vertical midpoints, indicating interleaved columns.
  - Flags table cell separators (`|`, `+---+`) that fragment sentences.
* **Scoring Impact:** High. Penalizes ATS Score by up to 15 points.
* **Severity:** `high`
* **Result Structure:** `{ checkId: "CHK-02", status: "passed"|"warning"|"failed", score: 0-100, severity: "high", summary: string }`
* **Recommendations:** "Use a single-column linear layout. Avoid multi-column sidebars and complex tables."
* **Edge Cases:** Two-column contact header (allowable) vs two-column body text (problematic).
* **Unit Test Scenarios:**
  - Test standard single-column text $\to$ Passed.
  - Test two-column interleaved text $\to$ Warning.
* **Limitations:** PDF layout extraction is an approximation of OCR rendering.

#### CHK-03: Professional Email Format
* **Purpose:** Ensure candidate email communicates professionalism and avoids spam filtering.
* **Category:** ATS Essentials
* **Input Data:** Extracted email address string.
* **Evaluation Methodology:** Deterministic regex pattern matching.
* **Engine:** Deterministic Rule
* **Detection Rules:**
  - Must match standard email RFC: `^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`.
  - Flags trailing digit clusters $>4$ characters (e.g., `alex19984729@gmail.com`).
  - Flags slang or unprofessional keywords (`killer`, `party`, `sexy`, `dude`).
* **Scoring Impact:** Medium. Deducts 10 points from ATS Score if unprofessional.
* **Severity:** `medium`
* **Result Structure:** `{ checkId: "CHK-03", status: "passed"|"warning"|"failed", score: 0-100, severity: "medium", summary: string }`
* **Recommendations:** "Use a standardized professional email format like `firstname.lastname@domain.com`."
* **Edge Cases:** International domain extensions (`.co.uk`, `.io`, `.dev`).
* **Unit Test Scenarios:**
  - `priya.sharma@gmail.com` $\to$ Passed.
  - `gamerboy99999@yahoo.com` $\to$ Warning.
* **Limitations:** Cannot check mailbox deliverability (no SMTP ping).

#### CHK-04: Header Professional Links
* **Purpose:** Confirm presence of valid professional links (LinkedIn, GitHub, Portfolio).
* **Category:** ATS Essentials
* **Input Data:** Header block URL strings.
* **Evaluation Methodology:** URL regex taxonomy match.
* **Engine:** Deterministic Rule
* **Detection Rules:**
  - Searches for `linkedin.com/in/[a-zA-Z0-9-_]+`.
  - Searches for `github.com/[a-zA-Z0-9-_]+` (especially for technical roles).
  - Searches for custom portfolio or personal domain URLs.
* **Scoring Impact:** Medium. Deducts 8 points if zero links are present.
* **Severity:** `medium`
* **Result Structure:** `{ checkId: "CHK-04", status: "passed"|"warning", score: 0-100, severity: "medium", summary: string, details: { links: string[] } }`
* **Recommendations:** "Include your personalized LinkedIn profile URL and GitHub/Portfolio in the header."
* **Edge Cases:** Hyperlinked text where the visible label is "LinkedIn" without the raw URL.
* **Unit Test Scenarios:**
  - Resume with `linkedin.com/in/priya` $\to$ Passed.
  - Resume with zero URLs $\to$ Warning.
* **Limitations:** Does not verify if external URLs return HTTP 200.

#### CHK-05: Resume File Naming Convention
* **Purpose:** Ensure the file name is identifiable and recruiter-friendly when downloaded locally.
* **Category:** ATS Essentials
* **Input Data:** Original file name string.
* **Evaluation Methodology:** String token matching.
* **Engine:** Deterministic Rule
* **Detection Rules:**
  - Flags generic names (`resume.pdf`, `CV.docx`, `document.pdf`, `my_resume_final_v2.pdf`).
  - Recommends: Contains candidate name or target role (e.g., `Priya_Sharma_Resume.pdf`).
* **Scoring Impact:** Low. Deducts 3 points from ATS Score.
* **Severity:** `low`
* **Result Structure:** `{ checkId: "CHK-05", status: "passed"|"warning", score: 0-100, severity: "low", summary: string, details: { suggestedFileName: string } }`
* **Recommendations:** "Rename your file to `FirstName_LastName_Resume.pdf` before submitting."
* **Edge Cases:** Files with special characters, spaces, or underscores.
* **Unit Test Scenarios:**
  - `resume.pdf` $\to$ Warning.
  - `John_Doe_Senior_Engineer_Resume.pdf` $\to$ Passed.
* **Limitations:** Evaluates uploaded filename as provided by the browser.

#### CHK-06: Dates and Links Consistency
* **Purpose:** Standardize date formatting across job entries and ensure all hyperlinks specify valid protocol schemes.
* **Category:** ATS Essentials
* **Input Data:** Date tokens and URLs across entire resume text.
* **Evaluation Methodology:** Regex pattern consistency check.
* **Engine:** Deterministic Rule
* **Detection Rules:**
  - Flags inconsistent date representations (e.g., `01/2020` in role 1 and `March 2021` in role 2).
  - Verifies that raw URLs include `https://` prefix to avoid ATS link stripping.
* **Scoring Impact:** Medium. Deducts 5 points.
* **Severity:** `medium`
* **Result Structure:** `{ checkId: "CHK-06", status: "passed"|"warning", score: 0-100, severity: "medium", summary: string }`
* **Recommendations:** "Adopt a uniform date format (`MM/YYYY` or `Month YYYY`) and ensure all URLs use `https://`."
* **Edge Cases:** "Present", "Current", or "Ongoing" for current roles.
* **Unit Test Scenarios:**
  - Uniform dates (`05/2020 - Present`) $\to$ Passed.
  - Mixed date schemes $\to$ Warning.
* **Limitations:** Tolerates standard season dates (e.g., "Summer 2022").

---

### CATEGORY 2: RESUME SECTIONS (3 Checks)

#### CHK-07: Essential Section Presence
* **Purpose:** Verify presence of the 4 foundational pillars: Contact, Experience, Education, and Skills.
* **Category:** Resume Sections
* **Input Data:** Detected section headings.
* **Evaluation Methodology:** Heading regex dictionary matching.
* **Engine:** Deterministic Rule
* **Detection Rules:**
  - Requires matches for Experience, Education, Skills, and Contact headings.
* **Scoring Impact:** Critical. Missing Experience or Skills applies a major localized deduction (-25 points) to the Section sub-dimension. (Only genuine critical parsing failure in CHK-01 triggers global ATS score caps).
* **Severity:** `critical`
* **Result Structure:** `{ checkId: "CHK-07", status: "passed"|"failed", score: 0-100, severity: "critical", summary: string, details: { found: string[], missing: string[] } }`
* **Recommendations:** "Add standard headings: Professional Experience, Education, and Skills."
* **Edge Cases:** Non-standard headings ("Where I've Been", "Toolbox").
* **Unit Test Scenarios:**
  - Standard headers $\to$ Passed.
  - Missing Education heading $\to$ Failed.
* **Limitations:** Strict on standard terminology expected by legacy ATS parsers.

#### CHK-08: Contact Information Completeness
* **Purpose:** Ensure recruiters have necessary contact channels, differentiating between critical, secondary, and optional contact information.
* **Category:** Resume Sections
* **Input Data:** Header contact block tokens.
* **Evaluation Methodology:** Deterministic entity extraction and pattern taxonomy.
* **Engine:** Deterministic Rule
* **Detection Rules:**
  - *Email Address (Critical):* Primary recruiter contact channel. Omission flags `status: "failed"` with a localized deduction (-20 pts).
  - *Telephone Number (Secondary):* Direct phone screen channel. Omission flags `status: "warning"` with a minor deduction (-5 pts).
  - *Location (City, State/Country - Optional/Advisory):* Physical street addresses (e.g., "123 Main St") are **strictly NOT mandatory**. City/State/Country is evaluated as optional/advisory for remote or relocation roles.
  - *Professional Links:* Evaluated independently under `CHK-04`.
* **Scoring Impact:** High (Localized). Missing email deducts 20 points from the Contact sub-score; missing phone flags a 5-point warning. **Universal ATS hard caps are NEVER triggered by omitting phone numbers, street addresses, or locations.**
* **Severity:** `high`
* **Result Structure:** `{ checkId: "CHK-08", status: "passed"|"warning"|"failed", score: 0-100, severity: "high", summary: string, details: { missingRequired: string[], missingOptional: string[] } }`
* **Recommendations:** "Ensure your email address and preferred contact phone number are clearly visible in the header. Physical street addresses are not required."
* **Edge Cases:** Remote workers omitting physical address entirely; international candidates providing WhatsApp/Telegram handles.
* **Unit Test Scenarios:**
  - Name, Email, Phone present $\to$ Passed (100).
  - Name and Email present (Phone missing) $\to$ Warning (80), no global ATS cap.
  - Name present (Email missing) $\to$ Failed (60), localized deduction.
* **Limitations:** Does not validate physical residency or mailbox deliverability.

#### CHK-09: Section Structural Ordering
* **Purpose:** Verify resume content follows traditional recruiter scanning hierarchy.
* **Category:** Resume Sections
* **Input Data:** Sequence of detected section tokens.
* **Evaluation Methodology:** Positional order check.
* **Engine:** Deterministic Rule
* **Detection Rules:**
  - Standard: Header $\to$ Summary (optional) $\to$ Experience $\to$ Education $\to$ Skills.
  - Entry-Level / Student Exception: Header $\to$ Education $\to$ Experience $\to$ Skills is accepted.
* **Scoring Impact:** Low. Deducts 4 points if ordering is disjointed.
* **Severity:** `low`
* **Result Structure:** `{ checkId: "CHK-09", status: "passed"|"warning", score: 0-100, severity: "low", summary: string }`
* **Recommendations:** "Place contact info at top, followed by Summary, Work Experience, Education, and Skills."
* **Edge Cases:** Resumes with Skills placed immediately below Summary.
* **Unit Test Scenarios:**
  - Standard order $\to$ Passed.
  - Skills first, contact info at bottom $\to$ Warning.
* **Limitations:** Flexible for verified entry-level profiles.

---

### CATEGORY 3: RESUME CONTENT (5 Checks — Configurable Coaching Guidelines)

> [!NOTE]
> The quantitative thresholds in Category 3 represent **configurable career coaching best practices**, NOT rigid universal ATS mandates. Real-world ATS parsers ingest diverse layouts; recommendations adapt to career level, industry, and role type.

#### CHK-10: ATS Parse Rate
* **Purpose:** Measure percentage of extracted text that maps successfully into recognized structural schemas.
* **Category:** Resume Content
* **Input Data:** Section character counts vs. total raw character count.
* **Evaluation Methodology:** Mathematical ratio calculation.
* **Engine:** Deterministic Rule
* **Detection Rules:**
  - $\text{Parse Rate} = \frac{\text{Mapped Section Characters}}{\text{Total Characters}} \times 100$.
  - Rate $\ge 85\%$ passes (coaching guideline). Rate between $70-84\%$ flags warning. Rate $< 70\%$ fails.
  - Contextual Adaptation: Accommodates academic resumes with extensive publications, grants, and non-standard project sections without penalty.
* **Scoring Impact:** High. Contributes directly to ATS Compatibility Score.
* **Severity:** `high`
* **Result Structure:** `{ checkId: "CHK-10", status: "passed"|"warning"|"failed", score: 0-100, severity: "high", summary: string, details: { parseRate: number } }`
* **Recommendations:** "Ensure all text is organized under recognized section headings. Academic CVs and creative portfolios may show slightly lower mapping ratios without affecting recruiter readability."
* **Edge Cases:** Resumes with lengthy unheaded hobbies or introductory quotes.
* **Unit Test Scenarios:**
  - 95% parsed $\to$ Passed.
  - 60% parsed $\to$ Failed.
* **Limitations:** Dependent on section segmenter coverage.

#### CHK-11: Quantified Achievements
* **Purpose:** Ensure experience bullet points demonstrate measurable business impact rather than passive task descriptions.
* **Category:** Resume Content
* **Input Data:** Work experience bullet points.
* **Evaluation Methodology:** Regex metric marker search (`%`, `$`, numbers, multipliers `2x`, `10k`, time metrics).
* **Engine:** Hybrid (Regex + Semantic)
* **Detection Rules:**
  - Ratio of quantified bullets $\ge 40\%$ passes (coaching guideline).
  - Ratio between $25-39\%$ flags warning. Ratio $< 25\%$ fails.
  - Contextual Adaptation: Adapts severity for qualitative disciplines (compliance, early-stage research, IT operations, UX design) and entry-level tiers where numerical business metrics are not standard.
* **Scoring Impact:** High. Major determinant of Resume Content Score.
* **Severity:** `high`
* **Result Structure:** `{ checkId: "CHK-11", status: "passed"|"warning"|"failed", score: 0-100, severity: "high", summary: string, details: { quantifiedRatio: number, weakBullets: string[] } }`
* **Recommendations:** "Add metrics, percentages, revenue impact, or user counts to at least 40% of your bullets. If metrics are confidential or unavailable, describe scale, frequency, or qualitative outcomes."
* **Edge Cases:** Calendar years (e.g., "in 2022") are excluded from quantification counts.
* **Unit Test Scenarios:**
  - 5 of 10 bullets with metrics $\to$ Passed (50%).
  - 1 of 10 bullets with metrics $\to$ Failed (10%).
* **Limitations:** Regex handles standard formats; unusual scientific notation may require semantic evaluation.

#### CHK-12: Repeated Words & Buzzwords
* **Purpose:** Identify corporate jargon, overused clichés, and repetitive leading verbs.
* **Category:** Resume Content
* **Input Data:** Bullet point token streams.
* **Evaluation Methodology:** Dictionary lookup against PrepForge Cliché Taxonomy + verb frequency distribution.
* **Engine:** Deterministic Rule
* **Detection Rules:**
  - Flags words from cliché list ("synergy", "rockstar", "ninja", "hardworker", "go-getter", "team player").
  - Flags any single action verb starting $>3$ bullets in the same role.
* **Scoring Impact:** Medium. Deducts up to 10 points from Content Score.
* **Severity:** `medium`
* **Result Structure:** `{ checkId: "CHK-12", status: "passed"|"warning", score: 0-100, severity: "medium", summary: string, details: { buzzwords: string[], repeatedVerbs: object } }`
* **Recommendations:** "Replace overused buzzwords with concrete technical actions; diversify your starting verbs."
* **Edge Cases:** Legitimate industry terms (e.g., "synergy" in M&A financial analysis).
* **Unit Test Scenarios:**
  - Clean text $\to$ Passed.
  - "Spearheaded" used 5 times consecutively $\to$ Warning.
* **Limitations:** Domain-specific exceptions handled via whitelist.

#### CHK-13: Spelling, Grammar & Casing
* **Purpose:** Detect spelling mistakes, grammatical errors, and improper capitalization of technical terms.
* **Category:** Resume Content
* **Input Data:** Entire resume text.
* **Evaluation Methodology:** Spell-check token analysis + Gemini grammar audit + technical casing taxonomy (`JavaScript`, `PostgreSQL`, `GraphQL`, `Kubernetes`).
* **Engine:** Hybrid (Spell-checker + Gemini LLM)
* **Detection Rules:**
  - 0 spelling errors $\to$ Passed (100).
  - 1–2 minor typos $\to$ Warning (75).
  - $\ge 3$ typos or misspelled company/role titles $\to$ Failed (40).
* **Scoring Impact:** High. Directly affects Content Score.
* **Severity:** `high`
* **Result Structure:** `{ checkId: "CHK-13", status: "passed"|"warning"|"failed", score: 0-100, severity: "high", summary: string, details: { errors: object[] } }`
* **Recommendations:** "Fix identified typos and verify consistent capitalization of technical acronyms."
* **Edge Cases:** Foreign proper nouns, candidate names, proprietary company tools.
* **Unit Test Scenarios:**
  - Clean text $\to$ Passed.
  - "Javascript" and "developement" detected $\to$ Warning with corrections.
* **Limitations:** Context-sensitive grammar requires LLM validation.

#### CHK-14: Bullet Length & Consistency
* **Purpose:** Ensure bullet points are concise, scannable, and uniformly punctuated.
* **Category:** Resume Content
* **Input Data:** Array of bullet points.
* **Evaluation Methodology:** Word count statistics and trailing punctuation inspection.
* **Engine:** Deterministic Rule
* **Detection Rules:**
  - Optimal bullet length: 15–30 words (human recruiter scannability heuristic).
  - Flags bullets $< 8$ words (too thin) or $> 45$ words (run-on paragraph).
  - Checks punctuation uniformity: all bullets either terminate with periods or omit them consistently.
  - Contextual Adaptation: Recognizes complex technical architecture descriptions that legitimately require 35-45 words without penalizing substance.
* **Scoring Impact:** Medium. Deducts up to 8 points from Content Score.
* **Severity:** `medium`
* **Result Structure:** `{ checkId: "CHK-14", status: "passed"|"warning", score: 0-100, severity: "medium", summary: string, details: { averageWordCount: number, punctuationConsistent: boolean } }`
* **Recommendations:** "Aim for 15-30 words per bullet point and maintain consistent terminal punctuation."
* **Edge Cases:** Nested sub-bullets.
* **Unit Test Scenarios:**
  - Uniform 20-word bullets $\to$ Passed.
  - Mixed punctuation and 60-word run-on bullet $\to$ Warning.
* **Limitations:** Does not measure readability index directly (Flesch-Kincaid).

---

### CATEGORY 4: JOB TAILORING (4 Checks)

#### CHK-15: Hard Technical Skills Match
* **Purpose:** Evaluate overlap between candidate's technical skills and target job description requirements.
* **Category:** Job Tailoring
* **Input Data:** Candidate skills list, target job description.
* **Evaluation Methodology:** Semantic entity extraction and skill taxonomy mapping.
* **Engine:** Semantic (Gemini LLM)
* **Detection Rules:**
  - Overlap $\ge 75\%$ of required core skills $\to$ Passed.
  - Overlap between $50-74\%$ $\to$ Warning.
  - Overlap $< 50\%$ $\to$ Failed.
* **Scoring Impact:** High. 40% of Job Match Score.
* **Severity:** `high`
* **Result Structure:** `{ checkId: "CHK-15", status: "passed"|"warning"|"failed", score: 0-100, severity: "high", summary: string, details: { matched: string[], missing: string[] } }`
* **Recommendations:** "Add missing technical competencies that you possess to your skills and experience bullets."
* **Edge Cases:** Synonyms (e.g., "React.js" vs "React", "K8s" vs "Kubernetes").
* **Unit Test Scenarios:**
  - 8 of 10 required skills present $\to$ Passed (80%).
  - 2 of 10 required skills present $\to$ Failed (20%).
* **Limitations:** Only evaluated when target job description is provided.

#### CHK-16: Soft Skills Context Match
* **Purpose:** Verify evidence of behavioral and leadership competencies required by the target role.
* **Category:** Job Tailoring
* **Input Data:** Experience bullets, target job requirements.
* **Evaluation Methodology:** Semantic NLP evaluation.
* **Engine:** Semantic (Gemini LLM)
* **Detection Rules:**
  - Checks if required soft skills (e.g., cross-functional leadership, agile execution) are backed by contextual proof.
* **Scoring Impact:** Medium. 25% of Job Match Score.
* **Severity:** `medium`
* **Result Structure:** `{ checkId: "CHK-16", status: "passed"|"warning", score: 0-100, severity: "medium", summary: string }`
* **Recommendations:** "Demonstrate soft skills like cross-functional collaboration with concrete project examples."
* **Edge Cases:** Soft skills mentioned in isolation in the Skills section (unverified).
* **Unit Test Scenarios:**
  - Demonstrated leadership in bullets $\to$ Passed.
  - Generic adjective list without evidence $\to$ Warning.
* **Limitations:** Dependent on contextual sentence structure.

#### CHK-17: High-Impact Action Verbs
* **Purpose:** Ensure bullet points open with assertive, action-oriented verbs.
* **Category:** Job Tailoring
* **Input Data:** Starting word of each bullet point.
* **Evaluation Methodology:** Dictionary taxonomy matching (`STRONG_ACTION_VERBS` vs `PASSIVE_DUTY_WORDS`).
* **Engine:** Deterministic Rule
* **Detection Rules:**
  - $\ge 80\%$ strong action verbs $\to$ Passed.
  - Flags passive phrases: *"Responsible for"*, *"Assisted with"*, *"Worked on"*, *"Helped"*.
* **Scoring Impact:** Medium. 20% of Job Match Score and influences Content Score.
* **Severity:** `medium`
* **Result Structure:** `{ checkId: "CHK-17", status: "passed"|"warning", score: 0-100, severity: "medium", summary: string, details: { passiveCount: number } }`
* **Recommendations:** "Replace passive phrases like 'Responsible for' with power verbs like 'Architected', 'Spearheaded', or 'Implemented'."
* **Edge Cases:** Bullets starting with adverbs (e.g., "Successfully delivered...").
* **Unit Test Scenarios:**
  - All bullets start with past-tense action verbs $\to$ Passed.
  - 4 bullets start with "Responsible for" $\to$ Warning.
* **Limitations:** English language verb conjugations.

#### CHK-18: Target Job Title Alignment
* **Purpose:** Verify candidate headline and recent job titles align with the target job title.
* **Category:** Job Tailoring
* **Input Data:** Resume headline, most recent job title, target job title.
* **Evaluation Methodology:** Semantic title hierarchy comparison.
* **Engine:** Semantic (Gemini LLM)
* **Detection Rules:**
  - Matches semantic role distance (e.g., "Senior Software Engineer" applying for "Lead Frontend Engineer" is aligned).
* **Scoring Impact:** Medium. 15% of Job Match Score.
* **Severity:** `medium`
* **Result Structure:** `{ checkId: "CHK-18", status: "passed"|"warning", score: 0-100, severity: "medium", summary: string }`
* **Recommendations:** "Align your professional headline with the target position title."
* **Edge Cases:** Career switchers transition from adjacent fields.
* **Unit Test Scenarios:**
  - Headline "Full Stack Developer" matching "Software Engineer" $\to$ Passed.
  - Headline "Graphic Designer" matching "Backend Architect" $\to$ Warning.
* **Limitations:** Evaluated only when target role is specified.

---

### CATEGORY 5: RECRUITER RED FLAGS (4 Checks)

#### CHK-19: Resume Timeline Credibility
* **Purpose:** Detect date discrepancies, future employment dates, or overlapping full-time positions.
* **Category:** Recruiter Red Flags
* **Input Data:** Extracted start and end dates per role.
* **Evaluation Methodology:** Date arithmetic and interval collision detection.
* **Engine:** Deterministic Rule
* **Detection Rules:**
  - Flags end dates that occur before start dates.
  - Flags start dates in the future.
  - Flags concurrent full-time roles unless designated as freelance/consulting.
* **Scoring Impact:** High. Deducts 15 points from Structure Score.
* **Severity:** `high`
* **Result Structure:** `{ checkId: "CHK-19", status: "passed"|"failed", score: 0-100, severity: "high", summary: string, details: { collisions: object[] } }`
* **Recommendations:** "Correct timeline contradictions and verify that role dates are chronological."
* **Edge Cases:** Overlapping education and internship.
* **Unit Test Scenarios:**
  - Sequential clean dates $\to$ Passed.
  - Start date "2028" $\to$ Failed.
* **Limitations:** Dependent on date parser accuracy.

#### CHK-20: Interview Risk Signals
* **Purpose:** Detect vague scopes, passive language, or lack of personal accountability.
* **Category:** Recruiter Red Flags
* **Input Data:** Full experience text.
* **Evaluation Methodology:** Linguistic pattern matching.
* **Engine:** Hybrid (Rule + Gemini LLM)
* **Detection Rules:**
  - Detects excessive collective attribution ("We did...", "The team built...") where personal contribution is obscured.
* **Scoring Impact:** Medium. Deducts up to 10 points from Structure Score.
* **Severity:** `medium`
* **Result Structure:** `{ checkId: "CHK-20", status: "passed"|"warning", score: 0-100, severity: "medium", summary: string }`
* **Recommendations:** "Clarify your individual scope and contribution using 'I' action verbs rather than generic team attributions."
* **Edge Cases:** Genuine team lead achievements.
* **Unit Test Scenarios:**
  - Concrete ownership $\to$ Passed.
  - Unclear personal scope $\to$ Warning.
* **Limitations:** Qualitative assessment.

#### CHK-21: Peer Experience Benchmarking
* **Purpose:** Verify depth and bullet density match expectations for stated career level tier.
* **Category:** Recruiter Red Flags
* **Input Data:** Total experience years, bullet counts, candidate career tier.
* **Evaluation Methodology:** Tiered threshold evaluation.
* **Engine:** Deterministic Rule
* **Detection Rules:**
  - Senior/Lead profiles require $\ge 3$ substantive bullets per major role.
  - Flags resumes with $< 2$ thin bullets for multi-year senior roles.
* **Scoring Impact:** Medium. Deducts up to 8 points from Structure Score.
* **Severity:** `medium`
* **Result Structure:** `{ checkId: "CHK-21", status: "passed"|"warning", score: 0-100, severity: "medium", summary: string }`
* **Recommendations:** "Expand bullet points for your recent major roles to demonstrate scope."
* **Edge Cases:** Recent short-term contract roles.
* **Unit Test Scenarios:**
  - Senior role with 5 detailed bullets $\to$ Passed.
  - 4-year Senior role with 1 brief bullet $\to$ Warning.
* **Limitations:** Does not invent external proprietary statistics.

#### CHK-22: Professional Presence Match
* **Purpose:** Validate coherence between summary headline, years of experience, and documented job history.
* **Category:** Recruiter Red Flags
* **Input Data:** Resume summary claims vs. accumulated role durations.
* **Evaluation Methodology:** Rule-based duration comparison.
* **Engine:** Deterministic Rule
* **Detection Rules:**
  - Verifies that claimed years (e.g., "10+ years experience") match cumulative timeline duration ($\ge 9$ years).
* **Scoring Impact:** Low. Deducts 4 points.
* **Severity:** `low`
* **Result Structure:** `{ checkId: "CHK-22", status: "passed"|"warning", score: 0-100, severity: "low", summary: string }`
* **Recommendations:** "Ensure claimed years of experience in your summary align with your documented work history."
* **Edge Cases:** Career gaps or part-time work.
* **Unit Test Scenarios:**
  - Claimed 5 years with 5.5 years history $\to$ Passed.
  - Claimed 10 years with 2 years history $\to$ Warning.
* **Limitations:** Cannot verify unlisted employment.

---

### CATEGORY 6: BIAS AND DISCRIMINATION PREVENTION (2 Checks — Strictly Advisory)

> [!IMPORTANT]
> Category 6 checks carry **zero numerical scoring weight** ($w_{\text{Cat 6}} \equiv 0$). They never reduce scores in ATS, Content, Structure, or Overall dimensions. All findings are strictly advisory to protect candidates against unconscious bias.

#### CHK-23: Age & Date Bias Mitigation
* **Purpose:** Protect candidates from ageism and unconscious hiring bias.
* **Category:** Bias and Discrimination
* **Input Data:** Education graduation dates, photo references, personal demographic markers.
* **Evaluation Methodology:** Date inspection ($> 15$ years ago) and keyword search.
* **Engine:** Deterministic Rule (Non-Penalizing)
* **Detection Rules:**
  - Flags graduation dates older than 15 years.
  - Flags inclusion of marital status, religion, nationality, or profile photographs.
* **Scoring Impact:** **Zero penalty.** Purely advisory (`status: "info"`).
* **Severity:** `low` / `info`
* **Result Structure:** `{ checkId: "CHK-23", status: "passed"|"info", score: 100, severity: "info", summary: string, recommendations: string[] }`
* **Recommendations:** "Consider removing degree graduation years older than 15 years to protect against unconscious age bias."
* **Edge Cases:** Academic CVs where full career chronology is required.
* **Unit Test Scenarios:**
  - Graduation in 2024 $\to$ Passed.
  - Graduation in 2002 $\to$ Advisory Info note (Score stays 100).
* **Limitations:** Non-punitive by ethical design.

#### CHK-24: Employment Gap Analysis
* **Purpose:** Identify unannotated employment gaps and suggest constructive framing.
* **Category:** Bias and Discrimination
* **Input Data:** Work experience timeline intervals.
* **Evaluation Methodology:** Chronological date delta calculation.
* **Engine:** Deterministic Rule (Non-Penalizing)
* **Detection Rules:**
  - Detects gap $> 6$ months between consecutive work entries.
* **Scoring Impact:** **Zero penalty.** Purely advisory (`status: "info"`).
* **Severity:** `medium` / `info`
* **Result Structure:** `{ checkId: "CHK-24", status: "passed"|"info", score: 100, severity: "info", summary: string, details: { gaps: object[] } }`
* **Recommendations:** "Add a brief note explaining gaps $>6$ months (e.g., sabbatical, family care, professional development)."
* **Edge Cases:** Gaps during COVID-19 pandemic (2020-2021).
* **Unit Test Scenarios:**
  - Continuous timeline $\to$ Passed.
  - 12-month gap in 2021 $\to$ Advisory Info note (Score stays 100).
* **Limitations:** Does not penalize overall score.

---

### CATEGORY 7: SENIORITY AND IMPACT (3 Checks)

#### CHK-25: Career Progression Trajectory
* **Purpose:** Evaluate upward trajectory in role responsibility, technical scope, and title hierarchy.
* **Category:** Seniority and Impact
* **Input Data:** Chronological job titles and bullet contents.
* **Evaluation Methodology:** Hierarchical role taxonomy matching + Gemini scope assessment.
* **Engine:** Hybrid (Rule + Gemini LLM)
* **Detection Rules:**
  - Recognizes upward progression (Junior $\to$ Mid $\to$ Senior $\to$ Lead/Staff).
* **Scoring Impact:** Medium. Influences Content Score.
* **Severity:** `medium`
* **Result Structure:** `{ checkId: "CHK-25", status: "passed"|"warning", score: 0-100, severity: "medium", summary: string, details: { trend: string } }`
* **Recommendations:** "Emphasize increasing scope of ownership and technical complexity in your recent roles."
* **Edge Cases:** Lateral transitions between different disciplines.
* **Unit Test Scenarios:**
  - Clear progression titles $\to$ Passed.
  - Unexplained downward shifts $\to$ Warning.
* **Limitations:** Title naming conventions vary across companies.

#### CHK-26: Skills Demonstration Context
* **Purpose:** Verify that hard skills claimed in the Skills section are actually demonstrated in experience bullets.
* **Category:** Seniority and Impact
* **Input Data:** Skills list tokens vs. Experience bullet text tokens.
* **Evaluation Methodology:** Cross-sectional text frequency and co-occurrence analysis.
* **Engine:** Semantic (Rule + Gemini LLM)
* **Detection Rules:**
  - Checks if $\ge 60\%$ of listed technical skills appear in work bullets.
  - Flags orphaned skills that appear only in the skills list with zero application context.
* **Scoring Impact:** High. Major determinant of Content Score.
* **Severity:** `high`
* **Result Structure:** `{ checkId: "CHK-26", status: "passed"|"warning", score: 0-100, severity: "high", summary: string, details: { substantiated: string[], orphaned: string[] } }`
* **Recommendations:** "Integrate your key technical skills directly into accomplishment bullets to prove real-world application."
* **Edge Cases:** Introductory or secondary tools.
* **Unit Test Scenarios:**
  - 8 of 10 skills demonstrated in bullets $\to$ Passed.
  - 10 skills listed, only 2 mentioned in bullets $\to$ Warning.
* **Limitations:** Lexical variations handled by stemming.

#### CHK-27: Ownership & Leadership Marks
* **Purpose:** Identify evidence of mentorship, technical architecture ownership, and strategic decision-making.
* **Category:** Seniority and Impact
* **Input Data:** Work experience bullets.
* **Evaluation Methodology:** Leadership taxonomy search + Gemini semantic confirmation.
* **Engine:** Hybrid (Rule + Gemini LLM)
* **Detection Rules:**
  - Searches for indicators of mentoring (*"mentored 4 engineers"*), architecture ownership (*"architected microservices"*), cross-team alignment, and hiring.
* **Scoring Impact:** Medium. Influences Content Score for Mid and Senior candidates.
* **Severity:** `medium`
* **Result Structure:** `{ checkId: "CHK-27", status: "passed"|"info", score: 0-100, severity: "medium", summary: string, details: { markersFound: string[] } }`
* **Recommendations:** "Highlight instances where you mentored junior peers, led system design, or drove cross-functional decisions."
* **Edge Cases:** Entry-level profiles (evaluated with lower threshold).
* **Unit Test Scenarios:**
  - Bullets demonstrate mentoring and design ownership $\to$ Passed.
  - Zero leadership signals on Senior profile $\to$ Warning.
* **Limitations:** Adjusted based on candidate career tier.
