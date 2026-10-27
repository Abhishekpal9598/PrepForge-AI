import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Menu, 
  X, 
  Sparkles, 
  ArrowRight, 
  LayoutDashboard,
  Activity
} from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { Button } from './Button';
import { useApiHealth } from '../hooks/useApiHealth';
import { useAuth } from '../context/AuthContext';

/**
 * PrepForge AI - Navigation Bar (Exact Match to Reference Sheet Panel 1)
 */
export const Navbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { health } = useApiHealth();
  const { user, isAuthenticated, logout } = useAuth();


  const navLinks = [
    { label: 'Features', href: '/#features' },
    { label: 'How It Works', href: '/#how-it-works' },
    { label: 'Platform', href: '/dashboard' },
    { label: 'Live API Status', href: '#api-status' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-[#080B16]/90 backdrop-blur-xl border-b border-white/[0.08]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Left: Brand Logo */}
        <Link to="/" className="group flex items-center focus:outline-none" aria-label="PrepForge AI Home">
          <BrandLogo size="md" />
        </Link>

        {/* Center: Navigation Links */}
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => {
            const isInternal = link.href.startsWith('/dashboard');
            return isInternal ? (
              <Link
                key={link.label}
                to={link.href}
                className="text-xs font-medium text-text-secondary hover:text-white transition-colors tracking-wide"
              >
                {link.label}
              </Link>
            ) : (
              <a
                key={link.label}
                href={link.href}
                className="text-xs font-medium text-text-secondary hover:text-white transition-colors tracking-wide"
              >
                {link.label}
              </a>
            );
          })}
        </nav>

        {/* Right Actions: Auth State Aware */}
        <div className="hidden md:flex items-center gap-3">
          {isAuthenticated && user ? (
            <div className="flex items-center gap-3">
              <Link
                to="/dashboard"
                className="text-xs font-semibold text-[#CBD5E1] hover:text-white px-3 py-2 rounded-xl hover:bg-[#1E293B] transition-colors flex items-center gap-2"
              >
                <LayoutDashboard className="w-3.5 h-3.5 text-[#818CF8]" />
                <span>Dashboard</span>
              </Link>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#1E293B] border border-[#334155]">
                <div className="w-6 h-6 rounded-lg bg-[#7657FF]/20 text-[#B49DFF] text-xs font-bold flex items-center justify-center">
                  {user.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
                </div>
                <span className="text-xs font-semibold text-[#F8FAFC] max-w-[120px] truncate">
                  {user.fullName || 'User'}
                </span>
              </div>
              <button
                onClick={logout}
                className="text-xs font-medium text-[#94A3B8] hover:text-[#F87171] px-2.5 py-1.5 rounded-lg hover:bg-[#EF4444]/10 transition-colors"
              >
                Log Out
              </button>
            </div>
          ) : (
            <>
              <Link
                to="/login"
                className="text-xs font-semibold text-text-secondary hover:text-white px-3 py-2 transition-colors"
              >
                Sign In
              </Link>

              <Link to="/register">
                <Button variant="primary" size="sm" className="rounded-full px-5 py-2 font-semibold shadow-md shadow-[#7657FF]/30">
                  Get Started
                </Button>
              </Link>
            </>
          )}
        </div>


        {/* Mobile Hamburger Toggle */}
        <div className="md:hidden flex items-center gap-2">
          <button
            onClick={() => setMobileMenuOpen(prev => !prev)}
            className="p-2 rounded-xl text-text-secondary hover:text-text-primary hover:bg-dark-elevated transition-colors"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-border-subtle bg-dark-sidebar px-4 pt-3 pb-6 space-y-4 animate-fadeIn">
          <div className="flex flex-col space-y-2">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-dark-card rounded-lg transition-colors"
              >
                {link.label}
              </a>
            ))}
            <Link
              to="/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 text-sm font-semibold text-brand-primary hover:bg-dark-card rounded-lg transition-colors flex items-center gap-2"
            >
              <LayoutDashboard className="w-4 h-4" />
              Demo Dashboard
            </Link>
          </div>

          <div className="pt-3 border-t border-border-subtle flex flex-col gap-2.5">
            <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
              <Button variant="outline" size="sm" className="w-full">
                Sign In
              </Button>
            </Link>
            <Link to="/register" onClick={() => setMobileMenuOpen(false)}>
              <Button variant="primary" size="sm" className="w-full">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};
