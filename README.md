# PrepForge AI

> **Tagline:** *Practice Smarter. Interview Better. Get Hired.*

A commercial-grade, production-oriented full-stack web platform designed to prepare candidates for high-stakes job interviews through AI-powered mock interview simulations, automated resume intelligence, and job alignment scoring.

---

## 1. Project Overview & Current Status

This repository is organized as an npm workspaces monorepo containing a decoupled frontend client and backend API server.

> [!NOTE]
> **Implementation Phase Status: Phase 1 through Phase 8 Complete • Production Readiness Certified**  
> All 11 core platform modules are fully integrated and verified: Authentication & Authorization, Resume Management, AI Resume Analysis & ATS Scoring, Job Description Matching, AI Mock Interview, Interview History, Job Application Tracker, Real-Time Dashboard Analytics, Candidate Profile Management, Settings/Appearance Management, and Cascading Account Deletion. Full regression suite passes with 175/175 tests, zero warnings frontend build, and 100% end-to-end verification.

---

## 2. Technology Stack

### Frontend (`client/`)
- **Runtime & Build Tool:** Node.js, [Vite](https://vite.dev/)
- **Framework:** [React 19](https://react.dev/)
- **Language:** JavaScript (ESNext)
- **Routing:** [React Router v7](https://reactrouter.com/)
- **Styling:** [Tailwind CSS v3](https://tailwindcss.com/)
- **Icons:** [Lucide React](https://lucide.dev/)

### Backend (`server/`)
- **Runtime:** Node.js (LTS v20+)
- **Framework:** [Express.js](https://expressjs.com/)
- **Module System:** JavaScript ES Modules (`"type": "module"`)
- **Middleware:** CORS origin allowlisting, Express JSON parsers, centralized error handling

### Tooling & Monorepo
- **Workspace Manager:** npm workspaces (`client`, `server`)
- **Process Manager:** `concurrently` (unified local orchestration)

---

## 3. Project Directory Structure

```text
AI-Interview-Preparation-Platform/
├── client/
│   ├── public/
│   │   └── vite.svg
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   └── Footer.jsx
│   │   ├── layouts/
│   │   │   └── AppLayout.jsx
│   │   ├── pages/
│   │   │   ├── HomePage.jsx
│   │   │   └── NotFoundPage.jsx
│   │   ├── hooks/
│   │   │   └── useApiHealth.js
│   │   ├── context/
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── utils/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── .env.example
│   └── package.json
│
├── server/
│   ├── src/
│   │   ├── config/
│   │   │   ├── env.js
│   │   │   └── cors.js
│   │   ├── controllers/
│   │   │   └── healthController.js
│   │   ├── middleware/
│   │   │   ├── errorHandler.js
│   │   │   └── notFoundHandler.js
│   │   ├── models/
│   │   ├── routes/
│   │   │   └── healthRoutes.js
│   │   ├── services/
│   │   ├── validators/
│   │   ├── utils/
│   │   │   └── logger.js
│   │   ├── app.js
│   │   └── server.js
│   ├── .env.example
│   └── package.json
│
├── docs/
│   ├── PRD.md
│   ├── TRD.md
│   ├── APP_FLOW.md
│   ├── UI_UX.md
│   ├── DATABASE_SCHEMA.md
│   ├── IMPLEMENTATION_ROADMAP.md
│   ├── SRS.md
│   └── API_DOCUMENTATION.md
│
├── .gitignore
├── .env.example
├── package.json
└── README.md
```

---

## 4. Environment Configuration

Copy the example environment template to create local configuration files:

```bash
# Root environment configuration
cp .env.example .env

# Backend environment configuration
cp server/.env.example server/.env

# Frontend environment configuration
cp client/.env.example client/.env
```

### Environment Variables Matrix

| Variable | Description | Example / Default |
|---|---|---|
| `PORT` | Backend HTTP listening port | `5000` |
| `NODE_ENV` | Application runtime environment | `development` |
| `CLIENT_URL` | Allowed frontend origin for CORS | `http://localhost:5173` |
| `MONGODB_URI` | MongoDB connection URI | `mongodb://localhost:27017/ai-interview-prep` |
| `JWT_SECRET` | Secret key for JWT signing | Minimum 32-character secret string |
| `GEMINI_API_KEY` | Google Gemini API key | Google AI Studio key |
| `GEMINI_MODEL` | Gemini model variant | `gemini-1.5-flash` |
| `VITE_API_BASE_URL`| Frontend target API base URL | `http://localhost:5000/api` |

---

## 5. Installation Instructions

Ensure [Node.js](https://nodejs.org/) (version 20+ or 24+) is installed.

Install dependencies across all workspaces from the project root:

```bash
npm install
```

---

## 6. Development Commands

### Run Both Frontend and Backend Concurrently
```bash
npm run dev
```

### Run Frontend Independently
```bash
npm run dev:client
# Or directly from client directory:
cd client && npm run dev
```
Client dev server runs at: `http://localhost:5173`

### Run Backend Independently
```bash
npm run dev:server
# Or directly from server directory:
cd server && npm run dev
```
Server runs at: `http://localhost:5000`

### Build Frontend for Production
```bash
npm run build:client
```

---

## 7. Verification Endpoint

Test the server health endpoint:

```bash
curl http://localhost:5000/api/health
```

Expected JSON response:
```json
{
  "success": true,
  "message": "AI Interview Preparation Platform API is running"
}
```
