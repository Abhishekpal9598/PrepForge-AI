import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { BrandLogo } from '../components/BrandLogo';

/**
 * PrepForge AI - Forgot Password Page (Exact Match to Reference Sheet Panel 4)
 */
export const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState(null);
  const [statusMessage, setStatusMessage] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError(null);
    setStatusMessage(null);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      setError('Email address is required');
      return;
    }
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setStatusMessage({
      type: 'info',
      text: 'Frontend validation successful. Notice: No password reset email has been dispatched because backend authentication integration is pending for Phase 3.',
    });
  };

  return (
    <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center p-4 sm:p-8 bg-[#080B16]">
      <div className="max-w-md w-full bg-[#FFFFFF] rounded-3xl p-8 sm:p-10 shadow-2xl text-slate-900 text-left space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Reset Your Password
          </h1>
          <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
            No worries! Enter your email address and we'll send you a reset link.
          </p>
        </div>

        {statusMessage && (
          <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-200 text-xs text-indigo-900 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-indigo-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>Password Reset Notice</span>
            </div>
            <p className="leading-relaxed pl-5 text-indigo-800">
              {statusMessage.text}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Email address
            </label>
            <input
              type="email"
              placeholder="you@domain.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError(null);
              }}
              className={`w-full px-3.5 py-2.5 rounded-xl border text-xs text-slate-900 placeholder:text-slate-400 outline-none transition-colors ${
                error ? 'border-red-500' : 'border-slate-200 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600'
              }`}
            />
            {error && <p className="text-[11px] text-red-500 font-medium">{error}</p>}
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-[#6C5CE7] hover:bg-[#5b4bc4] text-white font-bold text-xs shadow-md shadow-indigo-300 transition-colors"
          >
            Send Reset Link
          </button>
        </form>

        <div className="text-center pt-2">
          <Link
            to="/login"
            className="text-xs font-semibold text-indigo-600 hover:underline"
          >
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
};
