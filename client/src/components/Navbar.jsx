import React from 'react';
import { Link } from 'react-router-dom';
import { Bot, Sparkles, Terminal } from 'lucide-react';

export const Navbar = () => {
  return (
    <header className="border-b border-slate-200 bg-white/80 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 font-bold text-xl text-slate-900 hover:text-indigo-600 transition-colors">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm shadow-indigo-200">
            <Bot className="w-6 h-6" />
          </div>
          <span className="tracking-tight">AI Interview Prep</span>
        </Link>
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Sparkles className="w-3.5 h-3.5" />
            Phase 1 Initialized
          </span>
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className="text-slate-500 hover:text-slate-900 p-2 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="Source code"
          >
            <Terminal className="w-5 h-5" />
          </a>
        </div>
      </div>
    </header>
  );
};
