import React from 'react';
import { 
  CheckCircle2, 
  Server, 
  Layers, 
  Cpu, 
  ArrowRight, 
  RefreshCw, 
  FileText, 
  Sparkles, 
  Briefcase 
} from 'lucide-react';
import { useApiHealth } from '../hooks/useApiHealth';

export const HomePage = () => {
  const { health, loading, error, refetch } = useApiHealth();

  return (
    <div className="space-y-10">
      {/* Hero Section */}
      <section className="text-center py-10 px-4 sm:px-6 max-w-3xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
          <Sparkles className="w-4 h-4 text-indigo-600" />
          <span>Production Architecture Initialized</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900">
          AI Interview Preparation Platform
        </h1>
        <p className="text-lg text-slate-600 leading-relaxed">
          A production-oriented full-stack platform empowering candidates to simulate realistic technical and behavioral interviews, optimize ATS resumes, and accelerate their career growth.
        </p>
      </section>

      {/* Backend Health Check Card */}
      <section className="max-w-2xl mx-auto bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">Backend API Health Status</h2>
              <p className="text-xs text-slate-500">Live check against endpoint <code>GET /api/health</code></p>
            </div>
          </div>
          <button
            onClick={refetch}
            disabled={loading}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-indigo-600 p-2 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        <div>
          {loading && (
            <div className="flex items-center gap-3 text-sm text-slate-500 py-3">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
              <span>Verifying backend connectivity...</span>
            </div>
          )}

          {error && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm space-y-1">
              <div className="font-semibold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                Backend Server Offline or Disconnected
              </div>
              <p className="text-xs text-amber-700">
                To connect, start the backend with <code>npm --workspace=server run dev</code> on port 5000.
              </p>
            </div>
          )}

          {health && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  API Status: OK
                </span>
                <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-mono">
                  HTTP 200
                </span>
              </div>
              <p className="text-sm font-medium">{health.message}</p>
            </div>
          )}
        </div>
      </section>

      {/* Architecture Matrix */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Cpu className="w-5 h-5" />
          </div>
          <h3 className="font-semibold text-slate-900">Modern Frontend</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            React 19, Vite build tool, Tailwind CSS design system, Lucide icons, and React Router v7 navigation.
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <Server className="w-5 h-5" />
          </div>
          <h3 className="font-semibold text-slate-900">Express ES Modules</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Modular architecture with CORS protection, centralized error handlers, and structured controller layers.
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <Layers className="w-5 h-5" />
          </div>
          <h3 className="font-semibold text-slate-900">NPM Workspaces</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Single root management with independent <code>client</code> and <code>server</code> sub-packages.
          </p>
        </div>
      </section>

      {/* Feature Roadmap Preview */}
      <section className="bg-slate-900 text-white rounded-3xl p-8 max-w-5xl mx-auto space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Platform Roadmap (Upcoming Phases)</h2>
          <p className="text-sm text-slate-400 mt-1">
            Phase 1 initialized foundational repository tiers. Future phases will introduce:
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-2">
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold">
              <FileText className="w-4 h-4" />
              <span>Phases 4–5</span>
            </div>
            <h4 className="text-sm font-semibold">Resume Analyzer</h4>
            <p className="text-xs text-slate-400">PDF/DOCX extraction & 5-dimension AI scoring.</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-2">
            <div className="flex items-center gap-2 text-cyan-400 text-xs font-semibold">
              <Sparkles className="w-4 h-4" />
              <span>Phase 6</span>
            </div>
            <h4 className="text-sm font-semibold">Job Match Engine</h4>
            <p className="text-xs text-slate-400">Semantic alignment & missing skills breakdown.</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
              <Cpu className="w-4 h-4" />
              <span>Phase 7</span>
            </div>
            <h4 className="text-sm font-semibold">Interview Simulator</h4>
            <p className="text-xs text-slate-400">Contextual Q&A generation & rubric evaluation.</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-2">
            <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold">
              <Briefcase className="w-4 h-4" />
              <span>Phase 8</span>
            </div>
            <h4 className="text-sm font-semibold">Application Tracker</h4>
            <p className="text-xs text-slate-400">Kanban workflow tracking candidate pipelines.</p>
          </div>
        </div>
      </section>
    </div>
  );
};
