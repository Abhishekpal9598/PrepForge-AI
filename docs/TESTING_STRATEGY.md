# PrepForge AI — Comprehensive Quality Assurance & Testing Strategy (TESTING_STRATEGY)
## Advanced Resume Intelligence Engine

**Document Version:** 1.0.0  
**Status:** Approved QA & Testing Strategy Specification  
**Product Name:** PrepForge AI — Advanced Resume Intelligence Engine  
**Author:** Principal QA Architect & Systems Verification Lead  
**Date:** 2026-10-26  
**Test Runner:** Node.js Native Test Runner / Jest / Supertest  
**Codebase Verification:** Based on verified test infrastructure in `server/tests/`  

---

## 1. Testing Philosophy & Non-Regression Principles

Quality assurance for PrepForge AI is structured around high reproducibility, deterministic verification, and non-regression guarantees:
1. **Deterministic Reproducibility:** Given the identical resume input, rule checks and scoring algorithms must produce identical outputs 100% of the time across test runs.
2. **Zero Fabrication Policy:** Documentation shall never falsely claim test passes during documentation-only phases. Testing scripts and assertions are specified for execution in Phase 10.
3. **Defense-in-Depth:** Testing spans 14 distinct dimensions from low-level binary parser checks to full-stack authenticated user journeys and theme consistency audits.
4. **Isolated Test Database:** Testing commands must target `TEST_MONGODB_URI` or an isolated in-memory/test instance, never touching production data in `prepforge_ai`.

---

## 2. Test Dimension Architecture

```
+---------------------------------------------------------------------------------------------------+
|                                   14-DIMENSIONAL TESTING MATRIX                                   |
+---------------------------------------------------------------------------------------------------+
| #  | TESTING DIMENSION          | TARGET SCOPE & METHODOLOGY                                      |
|----|----------------------------|-----------------------------------------------------------------|
| 1  | Unit Testing               | Rule algorithms, regex parsers, math formulas, Zod schemas.     |
| 2  | Integration Testing        | Express routing, middleware chaining, Mongoose model lifecycle. |
| 3  | API Testing                | HTTP status codes, envelope standards, headers, rate limits.    |
| 4  | Frontend Testing           | Component rendering, user events, drawer states, theme toggles. |
| 5  | Database Testing           | Index uniqueness, cascading erasures, subdocument persistence.  |
| 6  | Resume Parsing Accuracy    | Precision and recall on single/multi-column PDFs and DOCX files. |
| 7  | 27-Check Validation        | Systematic verification of CHK-01 through CHK-27 pass/fail logic|
| 8  | Scoring Reproducibility    | Mathematical invariants, bounding in [0, 100], critical caps.  |
| 9  | AI Response Validation     | Zod schema compliance, bracketed metric templates, JSON repair. |
| 10 | Security Testing           | IDOR protection, XSS injection, CSRF mitigation, file magic.    |
| 11 | File Upload Testing        | 5MB boundary limits, malformed buffers, extension spoofs.       |
| 12 | Theme Parity Testing       | Dark/Light token validation, contrast ratios, anti-FOUC script. |
| 13 | Responsive Testing         | Viewport layouts (Desktop >=1280px, Tablet 768px, Mobile 375px).|
| 14 | Regression Testing         | Complete pre-existing test suite (Auth, Interviews, Tracker).   |
+---------------------------------------------------------------------------------------------------+
```

---

## 3. Specifications for All 14 Test Dimensions

### 3.1 Unit Testing
* **Scope:** Isolated test of deterministic functions without database or network I/O.
* **Test Cases:**
  - `cleanAndRepairJson(raw)`: Strips markdown backticks, repairs unescaped backslashes and control characters.
  - `calculateOverallScore(ats, content, structure)`: Evaluates formula $0.35 \times \text{ATS} + 0.35 \times \text{Content} + 0.30 \times \text{Structure}$ and verifies rounding.
  - `actionVerbTaxonomy`: Verifies that strong verbs ("Orchestrated") return true, passive verbs ("Responsible for") return false.
* **Location:** `server/tests/unit/`

### 3.2 Integration Testing
* **Scope:** Controllers interacting with Mongoose models and mocked external services.
* **Test Cases:**
  - `POST /api/v1/resumes/:id/analyze`: Persists `ResumeAnalysis` with populated `detailedChecks` and `subScores`.
  - Recheck pipeline: Verifies that `POST /api/v1/resumes/:id/recheck` executes and updates subdocument fields.
* **Location:** `server/tests/integration/`

### 3.3 API Testing
* **Scope:** End-to-end HTTP interface validation via Supertest.
* **Test Cases:**
  - Confirms JSON envelope `{ success: true, data: { ... } }`.
  - Verifies HTTP 401 when `prepforge_jwt` cookie is absent.
  - Verifies HTTP 403 when candidate requests a resume belonging to a different `userId` (IDOR check).
  - Verifies HTTP 429 when rate limit is exceeded on `/api/v1/resumes/:id/analyze`.

### 3.4 Frontend Testing
* **Scope:** Component render verification and user interaction workflows.
* **Test Cases:**
  - `ChecklistGrid`: Renders 27 check cards; category filters filter correctly.
  - `CheckDetailDrawer`: Opens on check card click; displays correct failing bullets.
  - `ThemeToggle`: Clicking toggle switches class on root HTML element and updates `localStorage`.

### 3.5 Database Testing
* **Scope:** MongoDB Atlas schema integrity and index enforcement.
* **Test Cases:**
  - Confirms duplicate email registration fails with code 11000.
  - Verifies compound index `{ userId: 1, createdAt: -1 }` on `resumeanalyses` executes without COLLSCAN.
  - Verifies 1-Click Total Data Erasure purges records from `users`, `resumes`, and `resumeanalyses`.

### 3.6 Resume Parsing Accuracy Benchmarks
* **Scope:** Document text extraction accuracy across synthetic test fixtures.
* **Test Fixtures:**
  - 10 single-column standard PDFs.
  - 5 two-column PDFs with sidebars.
  - 3 Microsoft Word DOCX files.
  - 2 plain text TXT files.
* **Success Criteria:** Character extraction recall $\ge 98\%$; section segmentation accuracy $\ge 90\%$.

### 3.7 27-Check Validation Suite
* **Scope:** Comprehensive test suite with dedicated test cases for CHK-01 through CHK-27.
* **Test Matrix:**
  - Every check must have at least 1 passing scenario, 1 failing scenario, and 1 edge case scenario.
  - CHK-01: Valid PDF $\to$ pass; corrupt header $\to$ fail.
  - CHK-11: 50% quantified bullets $\to$ pass; 10% quantified $\to$ fail.
  - CHK-23: Graduation in 2000 $\to$ advisory info (score unpenalized).
  - CHK-24: 8-month employment gap $\to$ advisory info (score unpenalized).

### 3.8 Scoring Reproducibility & Mathematical Invariants
* **Scope:** Mathematical verification of all 5 scores.
* **Invariants Tested:**
  1. All scores strictly bounded: $0 \le S \le 100$.
  2. Bounded rounding: No floating point artifacts (e.g., `84.00000000001`).
  3. Determinism: 10 consecutive evaluations of identical input yield identical score outputs.
  4. Critical Caps: If CHK-01 or CHK-08 fails, $S_{\text{ATS}} \le 45$.
  5. Conditional Job Match: If no JD is supplied, $S_{\text{JobMatch}} \equiv \text{null}$.

### 3.9 AI Response Validation & Hallucination Prevention
* **Scope:** Runtime inspection of LLM responses.
* **Test Cases:**
  - Injects non-quantified bullets; asserts AI generates bracketed metric templates (`[X]%`, `[Y] users`).
  - Asserts AI output strictly matches `aiAnalysisOutputSchema`.
  - Asserts zero new employers or unmentioned degrees are added.

### 3.10 Security Testing & IDOR Hardening
* **Scope:** Vulnerability mitigation and access control testing.
* **Test Cases:**
  - **IDOR Check:** User A attempts `GET /api/v1/resumes/:idB/analysis` $\to$ Returns HTTP 403 / 404.
  - **NoSQL Injection:** Parameter containing `{ "$ne": null }` is sanitized.
  - **Cookie Security:** `Set-Cookie` contains `HttpOnly`, `SameSite=Strict`, `Path=/`.
  - **XSS Sanitization:** Resume containing `<script>alert(1)</script>` is safely escaped in UI.

### 3.11 File Upload Security & Boundary Testing
* **Scope:** Multer upload validation.
* **Test Cases:**
  - Buffer with size $5,242,881$ bytes (5MB + 1 byte) $\to$ Rejected with HTTP 400.
  - Disguised `.exe` file with `.pdf` extension $\to$ Magic byte validator rejects with HTTP 400.
  - Valid `.docx` file $\to$ Ingested and parsed successfully.

### 3.12 Theme Parity & Contrast Testing
* **Scope:** WCAG 2.1 AA compliance across Dark and Light themes.
* **Test Cases:**
  - Evaluates contrast ratio:
    - Dark Mode text `#F5F7FF` on `#121A2B` surface $\to \text{Ratio } \ge 11:1$ (Passes AAA).
    - Light Mode text `#0F172A` on `#FFFFFF` surface $\to \text{Ratio } \ge 14:1$ (Passes AAA).
  - Verifies anti-FOUC script sets `dark` or `light` class before body render.

### 3.13 Responsive Layout & Cross-Browser Verification
* **Scope:** Viewport testing across mobile ($375\text{px}$), tablet ($768\text{px}$), and desktop ($1280\text{px}$).
* **Test Cases:**
  - Mobile: Drawer opens full-width; hamburger navigation functions; zero horizontal overflow.
  - Desktop: Sidebar persists at $260\text{px}$; multi-column score cards render side-by-side.

### 3.14 Full Regression Testing
* **Scope:** Existing test suite in `server/tests/`.
* **Execution:**
  - All existing test suites covering authentication, job match, mock interviews, and application tracking must maintain a 100% pass rate.

---

## 4. Test Execution Guidelines

* **Local Test Execution:** On Windows environments, tests must be run using `npm.cmd --workspace=server test`.
* **Environment Configuration:** Tests must run against a designated test database string (`TEST_MONGODB_URI`).
* **Documentation-Only Rule:** During Phase 1, no test runs or fabricated test assertions shall be logged. Complete test execution occurs in Phase 10.
