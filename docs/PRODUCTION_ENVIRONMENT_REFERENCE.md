# PREPFORGE AI — PRODUCTION ENVIRONMENT VARIABLE REFERENCE

This document serves as the comprehensive configuration reference for deploying PrepForge AI to production environments (e.g., AWS, Render, Railway, Fly.io, Vercel, Netlify).

> [!IMPORTANT]
> Never commit `.env` or `.env.production` files containing live secrets to version control. All secrets must be securely provisioned via your cloud hosting platform's secret manager or dashboard.

---

## 1. BACKEND ENVIRONMENT VARIABLES (SERVER)

The backend Express.js service validates environment variables at startup using Zod schema enforcement (`server/src/config/env.js`). If any mandatory production variable is missing or malformed, the process safely terminates with a clear, secret-redacted error message.

| Variable Name | Type / Format | Status in Production | Default Value | Description & Operational Guidance | Production Example (Placeholder) |
| :--- | :--- | :---: | :--- | :--- | :--- |
| `NODE_ENV` | `enum('production', 'development', 'test')` | **Mandatory** | `development` | Sets runtime optimizations, disables dev fallbacks, enforces secure cookies, enables error stack redaction, and disables Mongoose `autoIndex`. | `production` |
| `PORT` | `integer` | **Optional** | `5001` (or cloud provider `$PORT`) | Port on which the Express HTTP server listens. Cloud providers (e.g., Render, Heroku) inject this automatically. | `10000` |
| `MONGODB_URI` | `string (URI)` | **Mandatory** | *None* | Connection URI for the production MongoDB Atlas replica set. Must include authentication credentials and TLS parameters. | `mongodb+srv://<db_user>:<db_password_placeholder>@cluster0.xyz.mongodb.net/prepforge_prod?retryWrites=true&w=majority` |
| `DB_NAME` | `string` | **Optional** | Parsed from `MONGODB_URI` | Explicit production database name override. Separates production collections from dev/test databases. | `prepforge_prod` |
| `CLIENT_URL` | `string (URLs)` | **Mandatory** | `http://localhost:5173` | Comma-separated list of fully qualified allowed frontend origins for CORS validation and root redirects. | `https://prepforge.ai,https://prepforge-ai.vercel.app` |
| `JWT_SECRET` | `string (>= 32 chars)` | **Mandatory** | *None* | High-entropy cryptographic secret used by `jsonwebtoken` to sign authentication tokens. Minimum 32 characters required in production. | `b78f921a8d014c2b9a1e3f890c4d2e1b8a9c7d6e5f4a3b2c1d0e9f8a7b6c5d4e` |
| `GEMINI_API_KEY` | `string` | **Mandatory** (for AI features) | *None* | Google Gemini API key used by `geminiService.js` for Deep Resume Intelligence, ATS audits, and experience rewrites. | `AIzaSy_your-gemini-key-placeholder-33-chars` |
| `GEMINI_MODEL` | `string` | **Optional** | `gemini-3.7-flash` | Primary Gemini model identifier. The application automatically manages fallback order if the primary model encounters rate limits or upstream capacity issues. | `gemini-3.7-flash` |
| `STORAGE_TYPE` | `enum('local', 's3')` | **Optional** | `local` | Resume storage provider strategy. Use `local` with persistent volumes or `s3` for stateless cloud containers. | `local` |
| `S3_BUCKET` | `string` | **Conditional** (if `STORAGE_TYPE=s3`) | *None* | AWS S3 or Cloudflare R2 bucket name for uploaded resume files. | `prepforge-resumes-prod` |
| `S3_REGION` | `string` | **Conditional** (if `STORAGE_TYPE=s3`) | `us-east-1` | AWS region where the bucket is provisioned. | `us-east-1` |
| `S3_ENDPOINT` | `string (URL)` | **Optional** | *None* | Custom S3-compatible API endpoint (used when targeting Cloudflare R2, MinIO, or DigitalOcean Spaces). | `https://<account-id>.r2.cloudflarestorage.com` |
| `S3_ACCESS_KEY_ID` | `string` | **Conditional** (if `STORAGE_TYPE=s3`) | *None* | IAM or bucket access key identifier. | `AKIAIOSFODNN7EXAMPLE` |
| `S3_SECRET_ACCESS_KEY` | `string` | **Conditional** (if `STORAGE_TYPE=s3`) | *None* | IAM or bucket secret access key. | `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` |

---

## 2. FRONTEND ENVIRONMENT VARIABLES (CLIENT)

The React 19 + Vite frontend embeds variables prefixed with `VITE_` during build time (`npm run build`). No secrets should ever be placed in client variables.

| Variable Name | Type / Format | Status in Production | Default Value | Description & Operational Guidance | Production Example (Placeholder) |
| :--- | :--- | :---: | :--- | :--- | :--- |
| `VITE_API_BASE_URL` | `string (URL or path)` | **Optional** | `/api` | Base URL for API requests. In same-domain or reverse-proxy setups, leave as `/api`. For separate domain hosting, set to the backend URL. | `https://api.prepforge.ai/api` |

---

## 3. DEVELOPMENT CONFIGURATIONS STRICTLY PROHIBITED IN PRODUCTION

The following configurations, flags, and values must never be used in production:

1. **`NODE_ENV=development` or `NODE_ENV=test`**:
   - *Risk:* Enables verbose stack traces in HTTP responses, disables secure cookie attributes (`secure: false`), and enables Mongoose `autoIndex: true` on live collections.
2. **Hardcoded Fallback JWT Secrets**:
   - *Risk:* Using `'development_jwt_secret_minimum_32_characters_long'` allows attackers to forge authentication tokens. In production, `env.js` strictly rejects this.
3. **Localhost MongoDB URIs (`mongodb://localhost:27017`)**:
   - *Risk:* Results in connection failure on cloud containers or unintended fallback.
4. **Wildcard CORS (`*`) with Credentials**:
   - *Risk:* Violates browser security specifications when cookies are used and allows unauthorized cross-site access.
5. **Direct Exposure of Stack Traces**:
   - *Risk:* Leaks internal file paths, module structures, and query details to end users.
6. **Unbounded File Storage**:
   - *Risk:* Local container filesystems are ephemeral on platforms like Render or Heroku; uploaded files will be lost on container restart unless persistent volumes or S3 object storage are configured.

---

## 4. ENVIRONMENT PROVISIONING CHECKLIST

Before authorizing production traffic:

- [ ] `NODE_ENV` is set to `production`.
- [ ] `MONGODB_URI` points to a dedicated production database (e.g., `prepforge_prod`), not `test` or `dev`.
- [ ] `JWT_SECRET` is generated via a cryptographically secure random generator ($\ge 32$ bytes / 64 hex characters):
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- [ ] `CLIENT_URL` matches the exact production frontend domain(s) with HTTPS.
- [ ] `GEMINI_API_KEY` is loaded from a production Google Cloud / AI Studio project with billing alerts enabled.
- [ ] `VITE_API_BASE_URL` is configured for the frontend production build.
- [ ] Health check endpoint `/api/health` returns status `healthy`.
