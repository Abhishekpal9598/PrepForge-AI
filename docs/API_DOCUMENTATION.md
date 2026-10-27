# PrepForge AI — REST API Documentation (API_DOCUMENTATION)
## Advanced Resume Intelligence Engine

**Document Version:** 2.0.0  
**Status:** Approved API Architecture Specification  
**Product Name:** PrepForge AI — Advanced Resume Intelligence Engine  
**Author:** Principal API Architect & Backend Engineering Lead  
**Date:** 2026-10-26  
**Base URL:** `/api/v1` (with `/api` compatibility aliases)  
**Security Model:** HttpOnly, SameSite=Strict, Secure JWT Cookie (`prepforge_jwt` or `token`)  
**Format:** `application/json` (or `multipart/form-data` for uploads)  

---

## 1. Global Standards & Response Envelopes

All PrepForge AI endpoints adhere strictly to a standardized JSON response envelope.

### 1.1 Success Response Envelope
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "totalCount": 45,
    "totalPages": 3
  }
}
```

### 1.2 Error Response Envelope
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The uploaded resume file exceeds the maximum 5MB size limit.",
    "details": []
  },
  "timestamp": "2026-10-26T22:00:00.000Z"
}
```

### 1.3 Standard HTTP Status Codes
* `200 OK`: Request succeeded.
* `201 Created`: Resource successfully created (file upload, user registration, analysis generated).
* `400 Bad Request`: Input validation failed (Zod validation errors, unparseable file buffer).
* `401 Unauthorized`: Authentication missing or JWT session expired.
* `403 Forbidden`: IDOR protection; user does not own the requested resource.
* `404 Not Found`: Target resource ID does not exist in the database.
* `429 Too Many Requests`: Rate limit threshold exceeded.
* `500 Internal Server Error`: Unhandled server exception.
* `503 Service Unavailable`: Google Gemini upstream API temporarily unavailable.

---

## 2. PART A: VERIFIED EXISTING PRODUCTION ENDPOINTS

These endpoints are currently active and verified in the PrepForge AI codebase:

### 2.1 Authentication Endpoints (`/api/v1/auth`)

#### `POST /api/v1/auth/register`
* **Purpose:** Registers a new candidate account.
* **Authentication:** Public (No auth required).
* **Rate Limit:** 10 requests / 15 minutes (`authLimiter`).
* **Request Body:**
  ```json
  {
    "fullName": "Priya Sharma",
    "email": "priya.sharma@example.com",
    "password": "Password123!",
    "targetRole": "Software Engineer",
    "careerLevel": "mid"
  }
  ```
* **Success Response (`201 Created`):**
  - Sets HttpOnly cookie: `prepforge_jwt=<JWT>; HttpOnly; SameSite=Strict; Path=/; Max-Age=604800`
  ```json
  {
    "success": true,
    "data": {
      "user": {
        "id": "6708304f5e709c0012ab1111",
        "fullName": "Priya Sharma",
        "email": "priya.sharma@example.com",
        "targetRole": "Software Engineer",
        "careerLevel": "mid",
        "appearance": { "theme": "dark" }
      }
    }
  }
  ```

#### `POST /api/v1/auth/login`
* **Purpose:** Authenticates existing candidate and issues session cookie.
* **Authentication:** Public.
* **Request Body:** `{ "email": "priya.sharma@example.com", "password": "Password123!" }`
* **Success Response (`200 OK`):** Returns authenticated user profile and sets session cookie.

#### `POST /api/v1/auth/logout`
* **Purpose:** Clears session cookie and invalidates client session.
* **Authentication:** Authenticated.
* **Success Response (`200 OK`):** `{ "success": true, "message": "Logged out successfully" }`.

#### `GET /api/v1/auth/me`
* **Purpose:** Bootstraps client session on mount from `AuthContext.jsx`.
* **Authentication:** Authenticated.
* **Success Response (`200 OK`):** Returns current user object.

---

### 2.2 Resume Ingestion Endpoints (`/api/v1/resumes`)

#### `POST /api/v1/resumes`
* **Purpose:** Ingests raw resume file, validates signatures, extracts text, and persists document.
* **Authentication:** Authenticated (`authMiddleware`).
* **Content-Type:** `multipart/form-data`.
* **Body:** `resume` (Binary file buffer, max 5MB, `.pdf`, `.docx`, `.txt`).
* **Success Response (`201 Created`):**
  ```json
  {
    "success": true,
    "data": {
      "resumeId": "6708304f5e709c0012ab2222",
      "originalFileName": "Priya_Sharma_Resume.pdf",
      "fileFormat": "pdf",
      "fileSize": 142050,
      "uploadedAt": "2026-10-26T22:05:00.000Z",
      "characterCount": 4520
    }
  }
  ```

#### `GET /api/v1/resumes`
* **Purpose:** Returns paginated list of candidate's uploaded resumes.
* **Authentication:** Authenticated.
* **Success Response (`200 OK`):** Returns array of resume metadata objects.

#### `DELETE /api/v1/resumes/:id`
* **Purpose:** Permanently deletes resume and cascading analyses.
* **Authentication:** Authenticated (Owner only).
* **Success Response (`200 OK`):** `{ "success": true, "message": "Resume deleted" }`.

---

### 2.3 Job Analysis & Interview Endpoints

* `POST /api/v1/jobs/analyze` — Evaluates match between candidate resume and target job posting.
* `GET /api/v1/jobs` — Lists historical job matches.
* `POST /api/v1/interviews/generate` — Dynamically generates mock interview questions.
* `POST /api/v1/interviews/:id/evaluate-answer` — Evaluates candidate answer across 5 dimensions.
* `GET /api/v1/applications` & `POST /api/v1/applications` — Kanban job application tracker.

---

## 3. PART B: PROPOSED RESUME INTELLIGENCE ENGINE ENDPOINTS

These endpoints provide the specialized interfaces for the 27-Point Checking Suite, multi-factor scores, bullet rewrites, version comparison, and PDF export:

---

### 3.1 Initiate Complete 27-Point Analysis
* **Method & Path:** `POST /api/v1/resumes/:id/analyze`
* **Purpose:** Triggers full 27-check audit, multi-factor scoring, and grounded AI rewrite synthesis.
* **Authentication:** Authenticated (`authMiddleware`).
* **Path Parameter:** `id` (MongoDB ObjectId of the resume document).
* **Request Body (Optional):**
  ```json
  {
    "jobTitle": "Senior Full-Stack Engineer",
    "jobDescription": "Seeking Senior Engineer proficient in Node.js, React, MongoDB..."
  }
  ```
* **Success Response (`200 OK`):**
  ```json
  {
    "success": true,
    "data": {
      "analysisId": "6708304f5e709c0012ab3333",
      "resumeId": "6708304f5e709c0012ab2222",
      "overallScore": 84,
      "subScores": {
        "atsScore": 92,
        "contentScore": 81,
        "structureScore": 86,
        "jobMatchScore": 78
      },
      "checkSummary": {
        "totalChecks": 27,
        "passedCount": 21,
        "warningCount": 4,
        "failedCount": 2,
        "infoCount": 0
      },
      "detailedChecks": [
        {
          "checkId": "CHK-01",
          "checkName": "File Format Compatibility",
          "category": "ATS Essentials",
          "status": "passed",
          "score": 100,
          "severity": "critical",
          "summary": "Valid PDF format with selectable text stream."
        },
        {
          "checkId": "CHK-11",
          "checkName": "Quantified Achievements",
          "category": "Resume Content",
          "status": "warning",
          "score": 60,
          "severity": "high",
          "summary": "Only 28% of experience bullets contain measurable metrics (threshold >= 40%).",
          "recommendation": "Incorporate scale, throughput, or business percentages into weak bullets."
        }
      ],
      "bulletImprovements": [
        {
          "original": "Worked on database performance improvements.",
          "suggested": "Optimized PostgreSQL indexes and query plans, reducing p99 latency by [X]% across [Y] daily active users.",
          "category": "Resume Content",
          "rationale": "Replaces passive verb with quantified engineering impact."
        }
      ]
    }
  }
  ```

---

### 3.2 Get 27-Point Check Breakdown
* **Method & Path:** `GET /api/v1/resumes/:id/checks`
* **Purpose:** High-speed retrieval of the 27 checks without returning massive raw text or interview history.
* **Authentication:** Authenticated.
* **Path Parameter:** `id` (Resume ID).
* **Query Parameters:**
  - `status` (Optional): Filter by `passed | warning | failed | info`.
  - `category` (Optional): Filter by category string.
* **Success Response (`200 OK`):**
  ```json
  {
    "success": true,
    "data": {
      "resumeId": "6708304f5e709c0012ab2222",
      "checkSummary": { "totalChecks": 27, "passedCount": 21, "warningCount": 4, "failedCount": 2, "infoCount": 0 },
      "checks": [ ... ]
    }
  }
  ```

---

### 3.3 Get Single Check Diagnostic Details
* **Method & Path:** `GET /api/v1/resumes/:id/checks/:checkId`
* **Purpose:** Returns comprehensive diagnostics, detected failing lines, and copyable templates for a single check (e.g., `CHK-11`).
* **Authentication:** Authenticated.
* **Path Parameters:**
  - `id`: Resume ID.
  - `checkId`: Standard check ID (`CHK-01` to `CHK-27`).
* **Success Response (`200 OK`):**
  ```json
  {
    "success": true,
    "data": {
      "checkId": "CHK-11",
      "checkName": "Quantified Achievements",
      "category": "Resume Content",
      "status": "warning",
      "score": 60,
      "severity": "high",
      "summary": "Only 28% of bullets contain quantified metrics.",
      "failingBullets": [
        "Responsible for writing microservices.",
        "Helped team maintain CI/CD pipelines."
      ],
      "recommendations": [
        "Use STAR method: Action + Metric + Result.",
        "Template: Engineered [Tool] resulting in [X]% improvement in [Metric]."
      ]
    }
  }
  ```

---

### 3.4 Fast-Path Re-Check Deterministic Rules
* **Method & Path:** `POST /api/v1/resumes/:id/recheck`
* **Purpose:** Instantly re-audits deterministic rules (Categories 1, 2, 3 rules) in $< 500\text{ms}$ after candidate updates their document, without triggering costly LLM calls.
* **Authentication:** Authenticated.
* **Success Response (`200 OK`):** Returns refreshed check results and updated sub-scores.

---

### 3.5 Compare Two Resume Versions
* **Method & Path:** `POST /api/v1/resumes/compare`
* **Purpose:** Side-by-side comparison between two candidate resumes (e.g., Draft 1 vs Draft 2).
* **Authentication:** Authenticated.
* **Request Body:**
  ```json
  {
    "baseResumeId": "6708304f5e709c0012ab1111",
    "targetResumeId": "6708304f5e709c0012ab2222"
  }
  ```
* **Success Response (`200 OK`):**
  ```json
  {
    "success": true,
    "data": {
      "baseResume": { "id": "6708304f5e709c0012ab1111", "overallScore": 72 },
      "targetResume": { "id": "6708304f5e709c0012ab2222", "overallScore": 84 },
      "scoreDeltas": {
        "overall": +12,
        "ats": +18,
        "content": +10,
        "structure": +6
      },
      "resolvedChecks": [
        { "checkId": "CHK-03", "checkName": "Professional Email Format" },
        { "checkId": "CHK-11", "checkName": "Quantified Achievements" }
      ],
      "newIssues": []
    }
  }
  ```

---

### 3.6 Download Executive PDF Report
* **Method & Path:** `GET /api/v1/resumes/:id/report/pdf`
* **Purpose:** Streams a print-formatted PDF audit report.
* **Authentication:** Authenticated.
* **Response Headers:**
  - `Content-Type: application/pdf`
  - `Content-Disposition: attachment; filename="PrepForge_Resume_Audit_Priya_Sharma.pdf"`
* **Response Body:** Binary PDF document stream.

---

## 4. Rate Limiting, Security & Error Contracts

```
+---------------------------------------------------------------------------------------------------+
|                                     API RATE LIMITING MATRIX                                      |
+---------------------------------------------------------------------------------------------------+
| ENDPOINT GROUP                  | RATE LIMIT QUOTA          | HEADERS RETURNED                    |
|---------------------------------|---------------------------|-------------------------------------|
| Authentication (/api/v1/auth)   | 10 requests / 15 minutes  | RateLimit-Limit, RateLimit-Remaining|
| Document Uploads (/resumes)     | 20 uploads / 15 minutes   | RateLimit-Limit, RateLimit-Remaining|
| Complete AI Analysis (/analyze) | 10 requests / 1 minute    | RateLimit-Limit, RateLimit-Remaining|
| Fast-Path Re-Check (/recheck)   | 30 requests / 1 minute    | RateLimit-Limit, RateLimit-Remaining|
| General Endpoints (GET queries) | 100 requests / 15 minutes | RateLimit-Limit, RateLimit-Remaining|
+---------------------------------------------------------------------------------------------------+
```
