import React, { useState } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { 
  Menu, 
  X, 
  LayoutDashboard, 
  Bot, 
  FileText, 
  Sparkles, 
  BookOpen, 
  History, 
  BarChart3, 
  Briefcase, 
  User, 
  Settings, 
  ArrowLeft,
  AlertTriangle
} from 'lucide-react';
import { BrandLogo } from '../components/BrandLogo';

/**
 * PrepForge AI - Dashboard Layout (Exact Match to Reference Sheet Panel 5)
 */
export const DashboardLayout = () => {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const navItems = [
    { label: 'Overview', to: '/dashboard', icon: LayoutDashboard },
    { label: 'Mock Interviews', to: '/mock-interviews', icon: Bot },
    { label: 'Resume Analyzer', to: '/resume-analyzer', icon: FileText },
    { label: 'Job Match', to: '/job-match', icon: Sparkles },
    { label: 'Question Bank', to: '/question-bank', icon: BookOpen },
    { label: 'Interview History', to: '/interview-history', icon: History },
    { label: 'Performance Analytics', to: '/analytics', icon: BarChart3 },
    { label: 'Applications', to: '/applications', icon: Briefcase },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#0D1322] border-r border-white/[0.08] w-60 select-none text-left">
      {/* Brand Header */}
      <div className="h-16 px-5 flex items-center justify-between border-b border-white/[0.08]">
        <Link to="/" className="focus:outline-none">
          <BrandLogo size="md" />
        </Link>
        <button
          onClick={() => setMobileSidebarOpen(false)}
          className="md:hidden text-text-secondary hover:text-white p-1 rounded-lg"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            onClick={() => setMobileSidebarOpen(false)}
            className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
              item.to === '/dashboard'
                ? 'bg-[#7657FF] text-white shadow-md shadow-[#7657FF]/25'
                : 'text-text-secondary hover:text-white hover:bg-white/[0.05]'
            }`}
          >
            <item.icon className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* Footer Navigation: Profile, Settings, Back to Website */}
      <div className="p-3 border-t border-white/[0.08] space-y-1">
        <Link
          to="/profile"
          className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-text-secondary hover:text-white hover:bg-white/[0.05]"
        >
          <User className="w-4 h-4" />
          <span>Profile</span>
        </Link>
        <Link
          to="/settings"
          className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-text-secondary hover:text-white hover:bg-white/[0.05]"
        >
          <Settings className="w-4 h-4" />
          <span>Settings</span>
        </Link>
        <button
          onClick={() => navigate('/')}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-text-secondary hover:text-white hover:bg-white/[0.05] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Website</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#080B16] text-[#F5F7FF]">
      {/* Top Persistent Amber Demo Banner (Exact Match to Reference Panel 5) */}
      <div className="bg-[#1C1608] border-b border-[#F5B942]/30 py-2 px-4 text-center">
        <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 text-xs font-medium text-[#F5B942]">
          <span className="px-1.5 py-0.5 rounded bg-[#F5B942]/20 font-bold text-[10px] uppercase tracking-wider border border-[#F5B942]/40">
            DEMO PREVIEW
          </span>
          <span>This is a demo dashboard. No real user data is being stored.</span>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar */}
        <aside className="hidden md:block flex-shrink-0">
          {sidebarContent}
        </aside>

        {/* Mobile Slide-over Sidebar */}
        {mobileSidebarOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setMobileSidebarOpen(false)}
            />
            <div className="fixed inset-y-0 left-0 max-w-xs w-full shadow-2xl z-10">
              {sidebarContent}
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          {/* Top Bar with User Avatar Circle */}
          <header className="h-16 px-6 border-b border-white/[0.08] bg-[#0D1322]/80 backdrop-blur-md flex items-center justify-between sticky top-0 z-30">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileSidebarOpen(true)}
                className="md:hidden p-2 rounded-xl text-text-secondary hover:text-white hover:bg-white/[0.05]"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="text-left">
                <h1 className="text-base font-extrabold text-white">Welcome back, Alex!</h1>
                <p className="text-[11px] text-text-secondary">Here's your learning progress and career insights.</p>
              </div>
            </div>

            {/* Right: Demo User Avatar Circle */}
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#7657FF] text-white flex items-center justify-center font-bold text-xs shadow-md shadow-[#7657FF]/30">
                A
              </div>
              <span className="text-xs font-semibold text-white hidden sm:inline">DEMO USER</span>
            </div>
          </header>

          {/* Main Dashboard Pages */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};
