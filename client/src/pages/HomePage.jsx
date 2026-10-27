import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Play, 
  Sparkles, 
  Bot, 
  FileText, 
  Briefcase, 
  BarChart3, 
  ArrowRight, 
  TrendingUp, 
  CheckCircle2, 
  Lock, 
  Cpu, 
  User, 
  Award, 
  Activity, 
  ShieldCheck 
} from 'lucide-react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { useApiHealth } from '../hooks/useApiHealth';

/**
 * PrepForge AI - Landing Page (Exact Match to Reference Sheet Panel 1)
 */
export const HomePage = () => {
  const { health } = useApiHealth();

  return (
    <div className="space-y-28 py-6 overflow-hidden">
      {/* 1. HERO SECTION (2-Column Grid Matching Reference Panel 1) */}
      <section className="relative px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto pt-8 pb-12">
        {/* Ambient Radial Background Glow */}
        <div className="absolute top-1/3 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[42rem] h-[26rem] bg-[#7657FF]/15 rounded-full blur-3xl pointer-events-none -z-10" />
        <div className="absolute top-1/2 right-1/4 w-[38rem] h-[26rem] bg-[#3985FF]/15 rounded-full blur-3xl pointer-events-none -z-10" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Hero Copy & Actions */}
          <div className="lg:col-span-6 space-y-6 text-left">
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[#7657FF]/15 text-[#B49DFF] border border-[#7657FF]/30 shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-[#7657FF]" />
              <span>AI-Powered Interview Preparation</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.12]">
              Your Next Interview.
              <br />
              <span className="brand-gradient-text">
                Your Best Performance.
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-sm sm:text-base text-text-secondary leading-relaxed max-w-xl">
              Prepare for real-world interviews with AI-powered mock interviews, personalized feedback, resume intelligence, and career insights.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link to="/register">
                <Button variant="primary" size="md" className="rounded-xl px-6 py-3 font-semibold shadow-lg shadow-[#7657FF]/30">
                  Start Practicing
                </Button>
              </Link>

              <a href="#features">
                <Button variant="outline" size="md" leftIcon={Play} className="rounded-xl px-5 py-3 border-white/15 text-white hover:bg-white/[0.06]">
                  Explore Features
                </Button>
              </a>
            </div>

            {/* 4 Quick Feature Pills */}
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2.5 pt-6 border-t border-white/[0.08]">
              {[
                { label: 'AI Mock Interviews', icon: Bot },
                { label: 'Resume Analysis', icon: FileText },
                { label: 'Job Matching', icon: Briefcase },
                { label: 'Performance Analytics', icon: BarChart3 },
              ].map((pill, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#111728] border border-white/[0.08] text-[11px] font-medium text-text-secondary hover:text-white transition-colors select-none"
                >
                  <pill.icon className="w-3.5 h-3.5 text-brand-primary" />
                  <span>{pill.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Hero Dashboard Preview Composition (Matching Reference Panel 1) */}
          <div className="lg:col-span-6 relative">
            {/* Glow Aura */}
            <div className="absolute inset-0 bg-gradient-to-tr from-[#7657FF]/30 via-[#3985FF]/20 to-transparent rounded-3xl blur-2xl -z-10" />

            <div className="rounded-2xl border border-white/15 bg-[#0D1322]/95 p-4 sm:p-5 shadow-2xl backdrop-blur-xl space-y-4">
              {/* Window Bar */}
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.08] text-xs text-text-secondary">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-brand-primary/20 flex items-center justify-center text-brand-primary text-xs font-bold">
                    PF
                  </div>
                  <span className="font-semibold text-white text-xs">PrepForge AI</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-status-success animate-pulse" />
                  <span className="text-[11px] text-text-secondary">Simulator Ready</span>
                </div>
              </div>

              {/* Greeting & Circular Readiness Gauge */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center bg-[#121A2B] p-4 rounded-xl border border-white/[0.06]">
                <div className="sm:col-span-2 space-y-1">
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                    Good morning, Alex 👋
                  </h3>
                  <p className="text-[11px] text-text-secondary">
                    Ready to build your dream career?
                  </p>
                  <div className="pt-2">
                    <Link to="/dashboard">
                      <button className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-primary hover:bg-[#6844ff] text-white transition-colors">
                        Start Mock Interview
                      </button>
                    </Link>
                  </div>
                </div>

                {/* Circular Gauge: 78% */}
                <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-[#182238]/60 border border-white/[0.06]">
                  <div className="relative w-16 h-16 flex items-center justify-center">
                    <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
                      <path
                        className="text-[#182238]"
                        strokeWidth="3.5"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path
                        className="text-status-success"
                        strokeDasharray="78, 100"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                    <span className="absolute text-sm font-extrabold text-white">78%</span>
                  </div>
                  <span className="text-[10px] text-text-secondary mt-1 font-medium text-center">Interview Readiness</span>
                </div>
              </div>

              {/* Performance Trend Chart (Wavy Blue Curve) */}
              <div className="bg-[#121A2B] p-4 rounded-xl border border-white/[0.06] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-brand-secondary" />
                    Performance Trend
                  </span>
                  <span className="text-[10px] text-brand-secondary">Past 6 Sessions</span>
                </div>

                <div className="h-28 w-full pt-1">
                  <svg viewBox="0 0 400 100" className="w-full h-full overflow-visible">
                    <defs>
                      <linearGradient id="heroWaveGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3985FF" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#3985FF" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M 10 75 Q 70 85 130 55 T 250 40 T 390 20 L 390 95 L 10 95 Z"
                      fill="url(#heroWaveGrad)"
                    />
                    <path
                      d="M 10 75 Q 70 85 130 55 T 250 40 T 390 20"
                      fill="none"
                      stroke="#3985FF"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                    <circle cx="390" cy="20" r="4" fill="#22C98B" stroke="#080B16" strokeWidth="2" />
                  </svg>
                </div>
              </div>

              {/* Top Skills Progress Bars */}
              <div className="bg-[#121A2B] p-4 rounded-xl border border-white/[0.06] space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white">Top Skills</span>
                  <span className="text-[10px] text-text-secondary">Evaluated</span>
                </div>

                <div className="space-y-2 text-xs">
                  {[
                    { name: 'Communication', val: 92, color: 'bg-status-success' },
                    { name: 'Problem Solving', val: 87, color: 'bg-brand-primary' },
                    { name: 'Technical Skills', val: 84, color: 'bg-brand-secondary' },
                    { name: 'Confidence', val: 79, color: 'bg-status-warning' },
                  ].map((skill, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-[11px] text-text-secondary">
                        <span>{skill.name}</span>
                        <span className="font-semibold text-white">{skill.val}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-[#0D1322] rounded-full overflow-hidden">
                        <div className={`h-full ${skill.color} rounded-full`} style={{ width: `${skill.val}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. SECTION: "Powerful Features for Your Career Growth" (Matching Reference Panel 1) */}
      <section id="features" className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-12">
        <div className="text-center space-y-2.5 max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Powerful Features for Your Career Growth
          </h2>
          <p className="text-xs sm:text-sm text-text-secondary">
            Everything you need to ace your interviews and land your dream job.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              title: 'AI Mock Interviews',
              desc: 'Practice with AI-powered interviews that adapt to your role and industry.',
              icon: Bot,
              color: 'text-[#7657FF]',
              bg: 'bg-[#7657FF]/15',
              to: '/mock-interviews',
            },
            {
              title: 'Resume Analysis',
              desc: 'Get detailed feedback and optimization suggestions for your resume.',
              icon: FileText,
              color: 'text-[#3985FF]',
              bg: 'bg-[#3985FF]/15',
              to: '/resume-analyzer',
            },
            {
              title: 'Job Matching',
              desc: 'Find the best opportunities based on your skills and goals.',
              icon: Briefcase,
              color: 'text-[#22C98B]',
              bg: 'bg-[#22C98B]/15',
              to: '/job-match',
            },
            {
              title: 'Performance Analytics',
              desc: 'Track your progress and identify areas for improvement.',
              icon: BarChart3,
              color: 'text-[#E056FD]',
              bg: 'bg-[#E056FD]/15',
              to: '/analytics',
            },
          ].map((feature, idx) => (
            <Card key={idx} hover className="p-6 bg-[#111728] border-white/[0.08] flex flex-col justify-between space-y-4 rounded-2xl">
              <div className="space-y-3">
                <div className={`w-11 h-11 rounded-xl ${feature.bg} flex items-center justify-center ${feature.color}`}>
                  <feature.icon className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-white">
                  {feature.title}
                </h3>
                <p className="text-xs text-text-secondary leading-relaxed">
                  {feature.desc}
                </p>
              </div>

              <Link to={feature.to} className="text-xs font-semibold text-brand-primary hover:text-white transition-colors flex items-center gap-1 pt-2">
                <span>Learn more</span>
                <span>→</span>
              </Link>
            </Card>
          ))}
        </div>
      </section>

      {/* 3. SECTION: "How It Works" (Matching Reference Panel 1) */}
      <section id="how-it-works" className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-12">
        <div className="text-center space-y-2.5 max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            How It Works
          </h2>
          <p className="text-xs sm:text-sm text-text-secondary">
            Start in minutes. See real improvement.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 relative">
          {[
            {
              num: '1',
              title: 'Create Your Profile',
              desc: 'Tell us about your background and career goals.',
            },
            {
              num: '2',
              title: 'Upload Your Resume',
              desc: 'Get AI-powered analysis and insights.',
            },
            {
              num: '3',
              title: 'Practice & Improve',
              desc: 'Take mock interviews and get detailed feedback.',
            },
            {
              num: '4',
              title: 'Land Your Dream Job',
              desc: 'Use insights to apply with confidence.',
            },
          ].map((step, idx) => (
            <div key={idx} className="flex flex-col items-center text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-brand-primary text-white font-extrabold text-base flex items-center justify-center shadow-lg shadow-brand-primary/30">
                {step.num}
              </div>
              <h3 className="text-sm font-bold text-white pt-1">
                {step.title}
              </h3>
              <p className="text-xs text-text-secondary max-w-xs leading-relaxed">
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 4. SECTION: "Ready to Build Your Future?" (CTA Card Matching Reference Panel 1) */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-r from-[#111728] via-[#161F36] to-[#111728] border border-white/[0.1] relative overflow-hidden shadow-2xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Copy */}
            <div className="lg:col-span-7 space-y-4 text-left">
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                Ready to Build Your Future?
              </h2>
              <p className="text-xs sm:text-sm text-text-secondary max-w-lg leading-relaxed">
                Join thousands of job seekers who are already preparing smarter with PrepForge AI.
              </p>
              <div className="pt-2">
                <Link to="/register">
                  <Button variant="primary" size="md" className="rounded-full px-6 py-2.5 font-semibold">
                    Get Started Free
                  </Button>
                </Link>
              </div>
            </div>

            {/* Right Tech Illustration */}
            <div className="lg:col-span-5 flex items-center justify-center relative">
              <div className="p-6 rounded-2xl bg-[#0D1322] border border-white/[0.08] space-y-3 w-full max-w-sm">
                <div className="flex items-center justify-between text-xs pb-2 border-b border-white/[0.08]">
                  <span className="font-semibold text-white flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-brand-primary" />
                    AI Career Hub
                  </span>
                  <span className="text-[10px] text-status-success font-mono">ENCRYPTED</span>
                </div>
                <div className="flex items-center gap-3 py-2">
                  <div className="w-10 h-10 rounded-xl bg-brand-primary/20 flex items-center justify-center text-brand-primary">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">Software Engineer</p>
                    <p className="text-[10px] text-text-secondary">Simulating Staff Level Interview</p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[11px] text-text-secondary pt-1">
                  <span className="flex items-center gap-1"><Lock className="w-3 h-3 text-status-success" /> Private & Secure</span>
                  <span className="text-brand-primary font-semibold">Real-Time Rubrics</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. LIVE API TELEMETRY CHECK (For verification) */}
      <section id="api-status" className="px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto">
        <div className="p-4 rounded-xl bg-[#111728] border border-white/[0.08] flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5">
            <span className={`w-2.5 h-2.5 rounded-full ${health ? 'bg-status-success animate-pulse' : 'bg-status-warning'}`} />
            <span className="text-text-secondary">API Telemetry: <strong className="text-white">{health ? 'Connected & Healthy (200 OK)' : 'Connecting...'}</strong></span>
          </div>
          <span className="font-mono text-[11px] text-brand-primary">GET /api/health</span>
        </div>
      </section>
    </div>
  );
};
