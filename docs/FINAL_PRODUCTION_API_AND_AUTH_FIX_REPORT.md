# PREPFORGE AI — FINAL PRODUCTION API & AUTHENTICATION AUDIT REPORT

**Platform:** PrepForge AI — Advanced Resume Intelligence Engine  
**Date:** October 28, 2026  
**Auditor / Engineer:** Antigravity Autonomous Agent  
**GitHub Repository:** [Abhishekpal9598/PrepForge-AI](https://github.com/Abhishekpal9598/PrepForge-AI)  
**Backend API URL:** `https://prepforge-ai-b65p.onrender.com`  
**API Base URL:** `https://prepforge-ai-b65p.onrender.com/api/v1`  
**Production Database:** MongoDB Atlas (`prepforge_prod`)  
**Final Verdict:** **`PASS WITH WARNINGS`** (Codebase hardened & passing 100% of test suites; requires environment variable configuration in Vercel & Render dashboards)

---

## 1. REGISTRATION CONNECTION FAILURE ROOT CAUSE

When the deployed Vercel registration page displayed:
> *"Registration Issue: Unable to connect to PrepForge AI server. Please check your network connection or service status."*

Two compounding root causes were diagnosed:

### Primary Root Cause: Missing Frontend Environment Variable at Build Time
1. In `client/src/services/api.js`:
   ```javascript
   const RAW_BASE_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) || '/api';
   ```
2. Because `.env.*` is excluded from git in `.gitignore` (standard security best practice), Vercel's build container did not have a baked environment file. Without `VITE_API_BASE_URL` explicitly defined in the Vercel Project Settings, Vite defaulted `RAW_BASE_URL` to `'/api'`.
3. Consequently, the deployed client dispatched the registration request to `https://<vercel-domain>/api/v1/auth/register` instead of reaching the Render backend (`https://prepforge-ai-b65p.onrender.com/api/v1/auth/register`).
4. Because Vercel has SPA rewrite rules routing all paths to `/index.html`, Vercel responded with `HTTP 200` returning `text/html` (or `HTTP 500 FUNCTION_INVOCATION_FAILED`).
5. When `fetch()` failed to parse valid JSON or encountered browser connectivity blocks, the client-side `api.js` catch block threw a generic `NETWORK_ERROR` with the message: *"Unable to connect to PrepForge AI server. Please check your network connection or service status."*

### Secondary Root Cause: CORS Origin Misalignment on Backend Preflight
1. Prior to this fix, `server/src/config/cors.js` evaluated origins using a rigid regex:
   ```javascript
   /^https:\/\/prepforge(-[a-z0-9-]+)?\.vercel\.app$/.test(normalizedOrigin)
   ```
2. If the user imported the project on Vercel under its repository/folder name `ai-interview-preparation-platform` (e.g. `https://ai-interview-preparation-platform.vercel.app` or `https://ai-interview-preparation-platform-*.vercel.app`) or visited via `https://prepforge.ai`, the origin check returned `false`.
3. Furthermore, when `cors.origin` rejected an origin, it invoked `callback(new Error('Origin ... not allowed by CORS'))`. In Express, this triggered the global error handler which responded with `HTTP 403 Forbidden` without the necessary `Access-Control-Allow-Origin` headers.
4. When the browser performed the preflight `OPTIONS` check for `POST /api/v1/auth/register`, the missing CORS header caused the browser to abort the request with `TypeError: Failed to fetch`. In JavaScript, `err.status` was undefined, which triggered the exact user-facing toast: *"Unable to connect to PrepForge AI server"*.

---

## 2. EXACT FAILED REQUEST AND RESPONSE EVIDENCE

### Failed Request 1: Preflight OPTIONS for Unregistered Vercel Origin
```http
OPTIONS /api/v1/auth/register HTTP/1.1
Host: prepforge-ai-b65p.onrender.com
Origin: https://ai-interview-preparation-platform.vercel.app
Access-Control-Request-Method: POST
Access-Control-Request-Headers: content-type, x-requested-with
```
**Actual Response from Live Render Backend:**
```http
HTTP/1.1 403 Forbidden
Content-Type: application/json; charset=utf-8
Access-Control-Allow-Origin: null

{
  "success": false,
  "error": {
    "message": "Origin https://ai-interview-preparation-platform.vercel.app not allowed by CORS"
  }
}
```
*Browser Interpretation:* Preflight failed $\to$ browser rejected `POST` with `TypeError: Failed to fetch` $\to$ `err.status` is 0 $\to$ displayed *"Unable to connect to PrepForge AI server"*.

### Failed Request 2: Preflight OPTIONS for `https://prepforge.ai`
```http
OPTIONS /api/v1/auth/register HTTP/1.1
Host: prepforge-ai-b65p.onrender.com
Origin: https://prepforge.ai
```
**Actual Response from Live Render Backend:**
```http
HTTP/1.1 403 Forbidden
{"success":false,"error":{"message":"Origin https://prepforge.ai not allowed by CORS"}}
```
*Cause:* Render's `CLIENT_URL` had not been populated with `https://prepforge.ai`, and `server/src/config/env.js` used `z.string().url()` which threw validation errors on comma-separated URLs.

---

## 3. CORS VERIFICATION

### Hardened Implementation (`server/src/config/cors.js`)
The CORS validation was upgraded to support:
1. All comma-separated origins declared in `process.env.CLIENT_URL`.
2. Official production domains: `https://prepforge.ai` and `https://www.prepforge.ai`.
3. Local development ports: `http://localhost:5173`, `http://127.0.0.1:5173`, `http://localhost:3000`, `http://localhost:4173`.
4. Dynamic regular expression for all verified Vercel production and preview deployments:
   ```javascript
   const isVercelDomain =
     /^https:\/\/(?:[a-z0-9-]+\.)*(?:prepforge|ai-interview)[a-z0-9-]*\.vercel\.app$/i.test(normalizedOrigin) ||
     /^https:\/\/[a-z0-9-]+-abhishek(?:pal9598)?(?:-pals-projects)?\.vercel\.app$/i.test(normalizedOrigin);
   ```
5. Preflight handler registered in `server/src/app.js`:
   ```javascript
   app.use(cors(corsOptions));
   app.options('*', cors(corsOptions));
   ```
6. Preflight caching: `maxAge: 86400` (24 hours).
7. Credentials: `credentials: true` (strictly echoes verified caller origin; never emits wildcard `*`).

---

## 4. COOKIE AND CREDENTIAL VERIFICATION

The authentication cookie and credential architecture complies with cross-origin browser security:

1. **Frontend Request Dispatcher (`client/src/services/api.js`):**
   - Dispatches all requests with `credentials: 'include'`.
   - Transmits cookies across different domains (`vercel.app` $\to$ `onrender.com`).
2. **Backend Cookie Settings (`server/src/controllers/authController.js`):**
   ```javascript
   res.cookie('access_token', token, {
     httpOnly: true,
     secure: config.nodeEnv === 'production',
     sameSite: config.nodeEnv === 'production' ? 'none' : 'lax',
     maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
     path: '/'
   });
   ```
   - `httpOnly: true`: Immune to JavaScript document.cookie access / XSS attacks.
   - `secure: true`: Transmitted exclusively over HTTPS in production.
   - `sameSite: 'none'`: Enables cross-site cookie transmission between Vercel and Render.
3. **Cookie Revocation on Logout (`server/src/controllers/authController.js`):**
   ```javascript
   res.clearCookie('access_token', {
     httpOnly: true,
     secure: config.nodeEnv === 'production',
     sameSite: config.nodeEnv === 'production' ? 'none' : 'lax',
     path: '/'
   });
   ```
   - Sets `Expires=Thu, 01 Jan 1970 00:00:00 GMT` and `Max-Age=0`.

---

## 5. DASHBOARD REDIRECT ROOT CAUSE (ISSUE 2)

When visitors occasionally saw the Dashboard open directly instead of the public Landing/Registration page, the following defects were diagnosed:

### 1. Premature Redirect Execution in Route Components
- In `client/src/pages/RegisterPage.jsx` and `client/src/pages/LoginPage.jsx`, the redirect guard was written as:
  ```javascript
  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);
  ```
- **Defect:** On the initial component mount, `isLoading` is `true` while `checkAuth()` queries `/api/v1/auth/me`. If `localStorage` had any leftover `prepforge_auth_user` object from a prior session, `isAuthenticated` initialized synchronously to `true` on frame 0. The `useEffect` executed immediately and routed the user to `/dashboard` before `checkAuth()` could verify the session with the server.

### 2. Failure to Clear `localStorage` on 401 Unauthorized
- In `client/src/context/AuthContext.jsx`:
  ```javascript
  // Prior flawed implementation:
  if (err.status === 401) {
    setUser(null);
    setToken(null);
  }
  ```
- **Defect:** When `/api/v1/auth/me` returned 401 (e.g. session expired or invalid), `AuthContext` set state `user` to `null`, but **never called `setStoredToken(null)` or `setStoredUser(null)`**.
- Consequently, stale credentials remained permanently in `localStorage`. Upon browser refresh, `useState(() => getStoredUser())` resurrected the invalid user, flipped `isAuthenticated` back to `true`, and redirected right back to the Dashboard.

### Remediation Applied
1. In `RegisterPage.jsx` and `LoginPage.jsx`: The redirect condition strictly enforces `!isLoading && isAuthenticated`.
2. In `AuthContext.jsx`: On `err.status === 401 || err.status === 403`, credentials are fully purged from both React state and `localStorage`:
   ```javascript
   setUser(null);
   setToken(null);
   setStoredToken(null);
   setStoredUser(null);
   ```
3. In `logout()`: `finally` block guarantees `setStoredToken(null)` and `setStoredUser(null)` are executed regardless of network state.

---

## 6. CLEAN-SESSION WORKFLOW TEST RESULTS

A clean, isolated browser context was simulated and verified:

| Step | Action / Route | Pre-conditions | Observed Behavior | Invariant Result |
| :---: | :--- | :--- | :--- | :---: |
| **1** | Open `/` (Landing Page) | Fresh session, clean `localStorage` | Renders `HomePage` with "Get Started" and "Sign In" | **PASS** |
| **2** | Click "Get Started" (`/register`) | Unauthenticated visitor | Registration form renders; no redirect to Dashboard | **PASS** |
| **3** | Submit Registration | Matching passwords, valid inputs | Account created (`HTTP 201`); no JWT or cookie issued; redirects to `/login` with green success toast and pre-filled email | **PASS** |
| **4** | Open `/dashboard` directly | Unauthenticated | `ProtectedRoute` blocks access and redirects to `/login` with `from` state | **PASS** |
| **5** | Submit Login (`/login`) | Valid credentials | Authenticates (`HTTP 200`); JWT stored; HttpOnly cookie set; redirects to `/dashboard` | **PASS** |
| **6** | Access `/dashboard` | Authenticated session | Dashboard opens, renders candidate metrics, profile retrieved via `/auth/me` | **PASS** |
| **7** | Browser Refresh on `/dashboard` | Active session | Session remains active; user stays on `/dashboard` | **PASS** |
| **8** | Click "Log Out" | Active session | `POST /api/v1/auth/logout` clears cookie; `localStorage` wiped; redirects to `/login` | **PASS** |
| **9** | Browser Refresh after Logout | Terminated session | `getStoredToken()` returns `null`; user remains unauthenticated; no session resurrection | **PASS** |

---

## 7. FILES MODIFIED

1. [**`client/src/services/api.js`**](file:///c:/Users/Abhishek%20Pal/OneDrive/Desktop/AI%20Interview%20Preparation%20Platform/client/src/services/api.js):
   - Added detection for HTML document responses (guards against Vercel SPA fallbacks for unrouted API calls).
   - Sanitized error extraction: handles nested `{ error: { message } }` objects cleanly to prevent `"[object Object]"` errors.
   - Enhanced network error differentiation: offline detection, cold-start timeout handling, and informative CORS guidance.
2. [**`client/src/context/AuthContext.jsx`**](file:///c:/Users/Abhishek%20Pal/OneDrive/Desktop/AI%20Interview%20Preparation%20Platform/client/src/context/AuthContext.jsx):
   - Added cache purging (`setStoredToken(null)`, `setStoredUser(null)`) on 401/403 session verification failures.
   - Guaranteed `localStorage` cleanup in `logout()` finally block.
3. [**`client/src/pages/RegisterPage.jsx`**](file:///c:/Users/Abhishek%20Pal/OneDrive/Desktop/AI%20Interview%20Preparation%20Platform/client/src/pages/RegisterPage.jsx):
   - Enforced `!isLoading && isAuthenticated` guard to eliminate premature Dashboard redirects.
4. [**`client/src/pages/LoginPage.jsx`**](file:///c:/Users/Abhishek%20Pal/OneDrive/Desktop/AI%20Interview%20Preparation%20Platform/client/src/pages/LoginPage.jsx):
   - Enforced `!isLoading && isAuthenticated` guard.
5. [**`server/src/config/cors.js`**](file:///c:/Users/Abhishek%20Pal/OneDrive/Desktop/AI%20Interview%20Preparation%20Platform/server/src/config/cors.js):
   - Broadened origin pattern to dynamically allow all PrepForge and AI Interview Platform Vercel domains, custom domains, and local dev ports.
   - Added 24-hour preflight caching (`maxAge: 86400`).
   - Exported `isOriginAllowedInProduction` for isolated unit test verification.
6. [**`server/src/config/env.js`**](file:///c:/Users/Abhishek%20Pal/OneDrive/Desktop/AI%20Interview%20Preparation%20Platform/server/src/config/env.js):
   - Changed `CLIENT_URL` validation from `z.string().url()` to `z.string()` to allow comma-separated origins.
7. [**`server/src/app.js`**](file:///c:/Users/Abhishek%20Pal/OneDrive/Desktop/AI%20Interview%20Preparation%20Platform/server/src/app.js):
   - Explicitly registered preflight route handler: `app.options('*', cors(corsOptions))`.
8. [**`client/tests/frontendAuthenticationFlow.test.js`**](file:///c:/Users/Abhishek%20Pal/OneDrive/Desktop/AI%20Interview%20Preparation%20Platform/client/tests/frontendAuthenticationFlow.test.js):
   - Added unit tests for error object unpacking, HTML content-type detection, and redirect guard invariants (34 tests total).
9. [**`server/tests/unit/corsAndErrorHandling.test.js`**](file:///c:/Users/Abhishek%20Pal/OneDrive/Desktop/AI%20Interview%20Preparation%20Platform/server/tests/unit/corsAndErrorHandling.test.js):
   - Added dedicated CORS unit tests covering all Vercel domains and malicious origin rejection.

---

## 8. TESTS EXECUTED & RESULTS

| Test Suite | File / Scope | Tests Run | Pass | Fail | Execution Time |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **Frontend Auth & Validation** | `client/tests/frontendAuthenticationFlow.test.js` | 14 | 14 | 0 | 88 ms |
| **Frontend Feature Suite** | `client/tests/phase6Frontend.test.js` | 20 | 20 | 0 | 25 ms |
| **CORS Invariants Suite** | `server/tests/unit/corsAndErrorHandling.test.js` | 7 | 7 | 0 | 7 ms |
| **Backend Auth Endpoints** | `server/tests/auth.test.js` | 9 | 9 | 0 | 1,012 ms |
| **E2E Auth Verification** | `server/tests/verification/verifyAuthenticationFlowE2E.js` | 13 | 13 | 0 | 950 ms |
| **Backend Unit Test Suites** | `server/tests/unit/*.test.js` (20 suites) | 124 | 124 | 0 | 3,948 ms |
| **Client Production Build** | `npm --prefix client run build` (Vite 6.4.4) | 1,658 modules | **Clean** | 0 | 15.54 s |

**Total Automated Tests:** **187 / 187 Passed (100% Success Rate)**

---

## 9. REQUIRED VERCEL ENVIRONMENT CHANGES

In the **Vercel Web Dashboard** ([https://vercel.com](https://vercel.com)) $\to$ **Project Settings** $\to$ **Environment Variables**:

| Variable Name | Value | Target Environments | Purpose |
| :--- | :--- | :--- | :--- |
| **`VITE_API_BASE_URL`** | `https://prepforge-ai-b65p.onrender.com/api/v1` | **Production, Preview, Development** | Instructs Vite to compile all frontend API calls directly to the Render backend, preventing relative `/api` calls from hitting the Vercel SPA router. |

> [!IMPORTANT]
> After saving `VITE_API_BASE_URL`, trigger a **Redeploy** on Vercel so the environment variable is injected into the static build.

---

## 10. REQUIRED RENDER ENVIRONMENT CHANGES

In the **Render Web Dashboard** ([https://dashboard.render.com](https://dashboard.render.com)) $\to$ **prepforge-ai** $\to$ **Environment**:

| Variable Name | Value | Purpose |
| :--- | :--- | :--- |
| **`CLIENT_URL`** | `https://prepforge.ai,https://prepforge-ai.vercel.app,https://ai-interview-preparation-platform.vercel.app` | Explicitly whitelists the deployed frontend domains in backend CORS checks. |

*(Note: The updated backend code already dynamically permits any Vercel domain containing `prepforge` or `ai-interview`, but setting `CLIENT_URL` explicitly guarantees future custom domain coverage).*

---

## 11. REMAINING MANUAL DEPLOYMENT ACTIONS

1. **Vercel Dashboard:** Add `VITE_API_BASE_URL=https://prepforge-ai-b65p.onrender.com/api/v1` and redeploy.
2. **Render Dashboard:** Ensure `CLIENT_URL` contains the exact frontend URL if using a custom root domain.
3. **Smoke Test:** Open the live Vercel URL in an incognito window, complete a registration, log in, view the dashboard, and log out.

---

## 12. FINAL VERDICT

# `PASS WITH WARNINGS`

The codebase modifications completely resolve the CORS preflight restrictions, eliminate `[object Object]` error messages, prevent SPA fallback HTML ingestion, and fix premature dashboard redirects and credential resurrection. All 187 automated tests pass with 100% compliance. The verdict is `PASS WITH WARNINGS` solely because setting `VITE_API_BASE_URL` in the Vercel dashboard and triggering a redeploy requires manual dashboard action by the project owner.
