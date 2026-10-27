import React from 'react';
import { Link } from 'react-router-dom';
import { BrandLogo } from './BrandLogo';

/**
 * PrepForge AI - Footer (Matching Reference Sheet Panel 1)
 */
export const Footer = () => {
  return (
    <footer className="border-t border-white/[0.08] bg-[#0A0E1A] pt-16 pb-12 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-10">
          {/* Brand Column (2 cols width) */}
          <div className="md:col-span-2 space-y-3 text-left">
            <BrandLogo size="md" />
            <p className="text-xs text-text-secondary leading-relaxed max-w-sm">
              Practice Smarter. Interview Better. Get Hired.
            </p>
          </div>

          {/* Product Links */}
          <div className="space-y-3 text-left">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-white">
              Product
            </h4>
            <ul className="space-y-2 text-xs text-text-secondary">
              <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
              <li><Link to="/dashboard" className="hover:text-white transition-colors">Pricing</Link></li>
              <li><a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a></li>
              <li><a href="#api-status" className="hover:text-white transition-colors">API Status</a></li>
            </ul>
          </div>

          {/* Resources Links */}
          <div className="space-y-3 text-left">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-white">
              Resources
            </h4>
            <ul className="space-y-2 text-xs text-text-secondary">
              <li><Link to="/question-bank" className="hover:text-white transition-colors">Documentation</Link></li>
              <li><Link to="/dashboard" className="hover:text-white transition-colors">Help Center</Link></li>
              <li><Link to="/dashboard" className="hover:text-white transition-colors">Blog</Link></li>
              <li><Link to="/dashboard" className="hover:text-white transition-colors">Community</Link></li>
            </ul>
          </div>

          {/* Company Links */}
          <div className="space-y-3 text-left">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-white">
              Company
            </h4>
            <ul className="space-y-2 text-xs text-text-secondary">
              <li><Link to="/" className="hover:text-white transition-colors">About Us</Link></li>
              <li><span className="hover:text-white transition-colors cursor-pointer">Privacy Policy</span></li>
              <li><span className="hover:text-white transition-colors cursor-pointer">Terms of Service</span></li>
              <li><span className="hover:text-white transition-colors cursor-pointer">Contact</span></li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar: Social Icons & Copyright */}
        <div className="pt-8 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-text-secondary">
          <p>© 2026 PrepForge AI. All rights reserved.</p>

          <div className="flex items-center gap-4 text-sm">
            <span className="hover:text-white transition-colors cursor-pointer font-bold">in</span>
            <span className="hover:text-white transition-colors cursor-pointer font-bold">X</span>
            <span className="hover:text-white transition-colors cursor-pointer font-bold">GitHub</span>
            <span className="hover:text-white transition-colors cursor-pointer font-bold">YouTube</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
