import React, { useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import {
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
  LogOut,
  X,
  Menu
} from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { useAuth } from '../context/AuthContext';

/**
 * PrepForge AI - Dashboard Sidebar
 * Navigation across all 10 dashboard routes with live user profile and Logout action.
 */
export const Sidebar = ({ mobileOpen, setMobileOpen }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();


  const navItems = [
    { label: 'Overview', to: '/dashboard', icon: LayoutDashboard },
    { label: 'Mock Interviews', to: '/mock-interviews', icon: Bot },
    { label: 'Resume Analyzer', to: '/resume-analyzer', icon: FileText },
    { label: 'Job Match', to: '/job-match', icon: Sparkles },
    { label: 'Question Bank', to: '/question-bank', icon: BookOpen },
    { label: 'Interview History', to: '/interview-history', icon: History },
    { label: 'Performance Analytics', to: '/analytics', icon: BarChart3 },
    { label: 'Applications', to: '/applications', icon: Briefcase },
    { label: 'Profile', to: '/profile', icon: User },
    { label: 'Settings', to: '/settings', icon: Settings },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full bg-dark-sidebar border-r border-border-subtle w-64 select-none">
      {/* Brand Header */}
      <div className="h-20 px-6 flex items-center justify-between border-b border-border-subtle">
        <Link to="/" className="focus:outline-none">
          <BrandLogo size="md" />
        </Link>
        {setMobileOpen && (
          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden text-text-secondary hover:text-text-primary p-1 rounded-lg"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/dashboard'}
            onClick={() => setMobileOpen && setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-brand-primary/15 text-white font-semibold border border-brand-primary/30 shadow-sm'
                  : 'text-text-secondary hover:text-text-primary hover:bg-dark-card/70'
              }`
            }
          >
            <item.icon className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer Navigation: User Profile & Actions */}
      <div className="p-4 border-t border-border-subtle space-y-2.5">
        <div className="px-3 py-2 rounded-xl bg-dark-card border border-border-subtle flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#7657FF]/20 text-[#B49DFF] flex items-center justify-center text-xs font-bold border border-[#7657FF]/30">
            {user?.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="min-w-0 flex-1 text-left">
            <p className="text-xs font-semibold text-text-primary truncate">
              {user?.fullName || 'PrepForge User'}
            </p>
            <p className="text-[10px] text-text-secondary truncate">
              {user?.targetRole || user?.careerLevel || 'Candidate'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (setMobileOpen) setMobileOpen(false);
              navigate('/');
            }}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-dark-elevated transition-colors border border-border-subtle"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Home</span>
          </button>

          <button
            onClick={async () => {
              if (setMobileOpen) setMobileOpen(false);
              await logout();
              navigate('/login');
            }}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-[#F87171] hover:bg-[#EF4444]/15 transition-colors border border-[#EF4444]/20"
            title="Log out of session"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:block flex-shrink-0">
        {sidebarContent}
      </aside>

      {/* Mobile Slide-Over Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 max-w-xs w-full shadow-2xl z-10">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
