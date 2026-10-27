# PREPFORGE AI — PRODUCTION DEPLOYMENT GUIDE

This guide provides end-to-end instructions for deploying the PrepForge AI Advanced Resume Intelligence platform into a hardened production environment.

---

## 1. PREREQUISITES

Before deploying, ensure you have:
1. **Node.js Runtime:** Node.js `>= 20.18.0` or `>= 22.x` (LTS recommended).
2. **MongoDB Atlas Account:** A MongoDB Atlas M10+ dedicated cluster (or serverless cluster) with replica sets enabled.
3. **Google Gemini API Key:** An enterprise or project API key from Google AI Studio / Google Cloud Console with billing enabled and rate limits configured.
4. **Cloud Hosting Providers:**
   - **Backend API Hosting:** Container-based or Node PaaS (e.g., Render, Railway, AWS ECS / App Runner, Fly.io, Heroku).
   - **Frontend Hosting:** Static edge CDN with SPA routing support (e.g., Vercel, Cloudflare Pages, Netlify, AWS CloudFront + S3).
5. **Custom Domain & SSL:** Registered domain (e.g., `prepforge.ai`) with DNS control and TLS/SSL certificates (managed automatically by Vercel/Render/Cloudflare).

---

## 2. PRODUCTION ENVIRONMENT VARIABLES

Reference the full specification in [PRODUCTION_ENVIRONMENT_REFERENCE.md](file:///c:/Users/Abhishek%20Pal/OneDrive/Desktop/AI%20Interview%20Preparation%20Platform/docs/PRODUCTION_ENVIRONMENT_REFERENCE.md).

### A. Backend Variables (Server)
```env
NODE_ENV=production
PORT=10000
CLIENT_URL=https://prepforge.ai,https://prepforge-ai.vercel.app
MONGODB_URI=mongodb+srv://<db_user>:<db_password>@cluster0.xyz.mongodb.net/prepforge_prod?retryWrites=true&w=majority
DB_NAME=prepforge_prod
JWT_SECRET=<64-char-hex-random-secret>
GEMINI_API_KEY=<your-production-gemini-key>
GEMINI_MODEL=gemini-3.7-flash
STORAGE_TYPE=local
```
*(Generate `JWT_SECRET` via `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`).*

### B. Frontend Variables (Client)
```env
VITE_API_BASE_URL=https://api.prepforge.ai/api
```
*(If frontend and backend are reverse-proxied under the same origin, omit `VITE_API_BASE_URL` to default to `/api`).*

---

## 3. MONGODB ATLAS PRODUCTION SETUP

1. **Create Dedicated Database:**
   - In Atlas Console, create a database named `prepforge_prod`.
   - Never share test or development database instances with production.

2. **Database User Security:**
   - Create a dedicated database user (e.g., `prepforge_app_user`) with `readWrite` role scoped **strictly** to `prepforge_prod`.
   - Use a high-entropy password (24+ alphanumeric characters).

3. **Network Access / IP Allowlist:**
   - If hosting on AWS or GCP in the same region, configure VPC Peering.
   - For PaaS providers with dynamic IPs (Render, Railway), add outbound IP blocks or allow access (`0.0.0.0/0`) with strict database authentication and TLS 1.3 enforced.

4. **Synchronize Production Indexes:**
   Run the index verification tool prior to routing production traffic:
   ```bash
   node server/scripts/syncIndexes.js
   ```
   *Note: Mongoose `autoIndex` is automatically disabled when `NODE_ENV=production` to prevent startup latency.*

5. **Backup & Point-in-Time Recovery (PITR):**
   - Enable Continuous Cloud Backups in Atlas.
   - Configure a 7-day or 30-day Retention Window with Point-in-Time Recovery enabled.

---

## 4. BACKEND API DEPLOYMENT (RENDER / RAILWAY / AWS)

### Example: Render Web Service
1. **Repository Settings:**
   - Runtime: `Node`
   - Root Directory: `.` (workspace root)
   - Build Command: `npm install`
   - Start Command: `npm --workspace=server run start`
   - Health Check Path: `/api/v1/health`

2. **Environment Variables:**
   - Populate all variables from Section 2A in the Render Environment tab.

3. **Disk Persistence (if `STORAGE_TYPE=local`):**
   - Attach a persistent disk mounted to `/var/data/uploads` or configure `STORAGE_TYPE=s3` for stateless container scale.

### Example: Docker Container (ECS / Fly.io / Kubernetes)
```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY server/package*.json ./server/
RUN npm ci --workspace=server --omit=dev

COPY server ./server
EXPOSE 5001
ENV NODE_ENV=production
CMD ["node", "server/src/server.js"]
```

---

## 5. FRONTEND SPA DEPLOYMENT (VERCEL / CLOUDFLARE)

### Example: Vercel
1. **Import Repository:**
   - Framework Preset: `Vite`
   - Root Directory: `client`
   - Build Command: `npm run build`
   - Output Directory: `dist`

2. **SPA Routing Configuration (`vercel.json`):**
   The project includes `client/vercel.json` and root `vercel.json` ensuring all SPA route history (`/resume-analyzer`, `/dashboard`) maps directly to `index.html`:
   ```json
   {
     "rewrites": [
       { "source": "/(.*)", "destination": "/index.html" }
     ]
   }
   ```

3. **Asset Caching:**
   Configured for `public, max-age=31536000, immutable` on hashed chunks in `assets/`.

---

## 6. DOMAIN, CORS & HTTPS CONFIGURATION

1. **Domain Setup:**
   - Frontend: `https://prepforge.ai` (CNAME $\to$ `cname.vercel-dns.com`)
   - Backend API: `https://api.prepforge.ai` (CNAME $\to$ `prepforge-api.onrender.com`)

2. **CORS Allowlist:**
   Set `CLIENT_URL=https://prepforge.ai,https://www.prepforge.ai` on the backend.
   `corsOptions` will dynamically validate origins and allow credentials.

3. **HTTPS & Cookie Transport:**
   - When `NODE_ENV=production`, authentication cookies set:
     - `httpOnly: true` (prevents XSS token exfiltration)
     - `secure: true` (transmitted strictly over HTTPS)
     - `sameSite: 'none'` (enables cross-subdomain API cookies between `api.prepforge.ai` and `prepforge.ai`)
     - `path: '/'`

---

## 7. POST-DEPLOYMENT SMOKE TESTS

Execute the following verification checklist immediately following deployment:

1. **Health Probes:**
   ```bash
   curl -i https://api.prepforge.ai/api/health
   curl -i https://api.prepforge.ai/api/v1/health
   curl -i https://api.prepforge.ai/api/health/db
   ```
   *Expected: HTTP 200 with `status: "healthy"` and `readyState: 1`.*

2. **Security Headers Verification:**
   ```bash
   curl -I https://api.prepforge.ai/api/health
   ```
   *Verify presence of `X-Content-Type-Options: nosniff`, `X-Frame-Options`, `Strict-Transport-Security`.*

3. **End-to-End User Verification:**
   - Open `https://prepforge.ai` in an incognito window.
   - Register a new user account.
   - Navigate to `/resume-analyzer`.
   - Upload a sample PDF resume.
   - Run the 27-Point Checks (confirm completion in $< 20\text{ms}$).
   - Inspect the Multi-Dimensional Score Overview.
   - Trigger AI Deep Intelligence and confirm bracketed recommendations display.
   - Log out and verify session cookie invalidation.

---

## 8. ROLLBACK STRATEGY & DISASTER RECOVERY

### 1. Identifying a Failed Deployment
Monitor the deployment immediately following release. A deployment is classified as **FAILED** if any of the following occur:
- **Health Check Failure:** `GET /api/health` or `GET /api/v1/health` fails to return HTTP 200 within 60 seconds of container startup.
- **Database Connection Failure:** `GET /api/health/db` reports `readyState !== 1` or logs indicate MongoDB connection timeouts.
- **Elevated Error Rate:** HTTP 5xx error spike exceeding 1% over a 3-minute window on ingress logs.
- **Critical Flow Blockage:** Resume upload, check execution, or authentication returns 500 errors during post-deployment smoke tests.
- **Frontend Routing Breakage:** Assets fail to load or unhandled exceptions trigger the root `ErrorBoundary`.

### 2. Step-by-Step Application Rollback
#### A. Frontend SPA (Vercel / Cloudflare Pages / Netlify)
1. Open the project dashboard (e.g., Vercel Deployments).
2. Locate the deployment hash that was active immediately prior to the failed release.
3. Click the menu `...` $\to$ **"Promote to Production"** / **"Instant Rollback"**.
4. Propagation across global CDN edge nodes takes $< 10$ seconds.

#### B. Backend API Service (Render / Railway / Kubernetes)
- **Render / Railway PaaS:**
  1. Open Service Settings $\to$ Deploys.
  2. Select the previous successful deploy.
  3. Click **"Rollback to this deploy"**.
  4. The platform deploys the previous container image while keeping environment variables intact.
- **Kubernetes / Docker Container:**
  ```bash
  kubectl rollout undo deployment/prepforge-api --namespace=production
  kubectl rollout status deployment/prepforge-api --namespace=production
  ```

### 3. Protecting Database Data During Rollback
- **Zero Destructive Migrations:** All Mongoose schemas (`User`, `Resume`, `ResumeAnalysis`, `JobAnalysis`, `InterviewSession`, `Application`) maintain strict backwards compatibility. Rolling back code will not corrupt or invalidate existing MongoDB documents.
- **Pre-Deployment On-Demand Snapshot:** Prior to major releases, trigger an on-demand snapshot in MongoDB Atlas Console:
  `Atlas Console -> Clusters -> Cluster0 -> Backup -> Take On-Demand Snapshot`.
- **Read-Only Rollback Invariance:** If a rollback occurs, newly created records from the failed version remain safely stored and readable by the previous code version.

### 4. Restoring Service After Failed Deployment
1. If database connection dropped, verify IP allowlist in Atlas Console (Network Access).
2. If CORS errors are thrown, verify `CLIENT_URL` contains the production frontend domain without trailing slashes.
3. If container fails on startup, verify all mandatory environment variables (`NODE_ENV=production`, `MONGODB_URI`, `JWT_SECRET`) are provisioned in the hosting environment.

### 5. Verifying Application Health After Rollback
Run the automated verification suite to confirm full operational recovery:
```bash
# 1. API Health & Database Readiness
curl -s https://api.prepforge.ai/api/health | grep '"status":"healthy"'
curl -s https://api.prepforge.ai/api/health/db | grep '"isConnected":true'

# 2. Frontend Connectivity
curl -sI https://prepforge.ai | grep 'HTTP/2 200\|HTTP/1.1 200'
```
Follow up with an incognito login and resume upload check to verify user journey completion.
