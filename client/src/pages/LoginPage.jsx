import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  Bot, 
  FileText, 
  Compass, 
  BarChart3, 
  Sparkles, 
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Mail
} from 'lucide-react';
import { BrandLogo } from '../components/BrandLogo';
import { Input } from '../components/Input';
import { PasswordInput } from '../components/PasswordInput';
import { Checkbox } from '../components/Checkbox';
import { Button } from '../components/Button';
import { Toast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';

/**
 * PrepForge AI - Redesigned Login Page
 * Cohesive Midnight Navy SaaS aesthetic matching RegisterPage,
 * with bulletproof dark input styling and real backend authentication.
 */
export const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated } = useAuth();

  const from = location.state?.from?.pathname || '/dashboard';

  // If already authenticated, redirect immediately
  React.useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [successToast, setSuccessToast] = useState(null);

  const validate = () => {
    const newErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!emailRegex.test(email.trim())) {
      newErrors.email = 'Please provide a valid email address';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError(null);
    setSuccessToast(null);

    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const response = await login({
        email: email.trim(),
        password,
      });

      setSuccessToast(response.message || 'Login successful!');
      setTimeout(() => {
        navigate(from, { replace: true });
      }, 500);
    } catch (err) {
      setApiError(err.message || 'Invalid email or password. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center p-4 sm:p-6 lg:p-10 bg-[#080B16] relative overflow-hidden">
      {/* Ambient Gradient Auras */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[36rem] h-[36rem] bg-[#7657FF]/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[32rem] h-[32rem] bg-[#3985FF]/15 rounded-full blur-3xl pointer-events-none" />

      {/* Main SaaS Card Container */}
      <div className="w-full max-w-5xl rounded-3xl overflow-hidden border border-white/[0.1] bg-[#0D1220]/95 shadow-2xl backdrop-blur-2xl grid grid-cols-1 lg:grid-cols-12 relative z-10 min-h-[580px]">
        
        {/* Left Column: Brand, Vision, Feature Bullets & Atmospheric Graphic */}
        <div className="lg:col-span-5 bg-gradient-to-br from-[#121A2B] via-[#0D1220] to-[#080B16] p-8 sm:p-12 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-white/[0.08] relative overflow-hidden text-left">
          
          <div className="space-y-8 relative z-10">
            <Link to="/" className="inline-block focus:outline-none">
              <BrandLogo size="md" />
            </Link>

            <div className="space-y-3 pt-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-[#7657FF]/15 text-[#B49DFF] border border-[#7657FF]/30">
                <Sparkles className="w-3.5 h-3.5 text-[#7657FF]" />
                <span>AI Interview Platform</span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#F8FAFC] tracking-tight leading-snug">
                Practice Smarter.
                <br />
                Interview Better.
                <br />
                <span className="brand-gradient-text">Get Hired.</span>
              </h1>
            </div>

            {/* 4 Feature Bullets with Purple Icon Badges */}
            <div className="space-y-3.5 pt-2">
              {[
                { label: 'AI-powered mock interviews with dynamic follow-ups', icon: Bot },
                { label: 'Smart ATS resume analysis & bullet rewrites', icon: FileText },
                { label: 'Targeted algorithmic & behavioral interview guidance', icon: Compass },
                { label: 'Detailed progress tracking & rubric evaluations', icon: BarChart3 },
              ].map((item, idx) => (
                <div key={idx} className="flex items-center gap-3 text-xs text-[#CBD5E1]">
                  <div className="w-7 h-7 rounded-xl bg-[#7657FF]/20 text-[#B49DFF] flex items-center justify-center flex-shrink-0 border border-[#7657FF]/30">
                    <item.icon className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-medium">{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Atmospheric Mountain / Wave Silhouette */}
          <div className="relative z-10 mt-8 pt-4 border-t border-white/[0.08]">
            <div className="h-24 w-full rounded-2xl bg-gradient-to-t from-[#080B16] via-[#121A2B]/60 to-transparent flex items-end justify-center overflow-hidden border border-white/[0.04]">
              <svg viewBox="0 0 300 80" className="w-full h-full opacity-60">
                <polygon points="0,80 50,30 110,65 170,20 230,55 300,10 300,80" fill="#182238" />
                <polygon points="20,80 80,45 140,70 200,35 270,60 300,40 300,80" fill="#0D1220" opacity="0.8" />
              </svg>
            </div>
          </div>
        </div>

        {/* Right Column: Modern Authentication Form */}
        <div className="lg:col-span-7 bg-[#0D1220] p-6 sm:p-10 lg:p-12 flex flex-col justify-center text-left">
          <div className="max-w-md w-full mx-auto space-y-6">
            
            <div className="space-y-1">
              <h2 className="text-2xl font-extrabold text-[#F8FAFC] tracking-tight">
                Welcome Back
              </h2>
              <p className="text-xs text-[#94A3B8]">
                Sign in to your PrepForge AI account to continue preparing.
              </p>
            </div>

            {/* Error or Success Toasts */}
            {apiError && (
              <Toast
                type="error"
                title="Sign In Error"
                message={apiError}
                onClose={() => setApiError(null)}
              />
            )}

            {successToast && (
              <Toast
                type="success"
                title="Authenticated"
                message={successToast}
              />
            )}

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {/* Email Address */}
              <Input
                label="Email Address"
                id="email"
                type="email"
                required
                icon={Mail}
                placeholder="you@domain.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors({ ...errors, email: null });
                }}
                error={errors.email}
              />

              {/* Password */}
              <PasswordInput
                label="Password"
                required
                placeholder="Enter your password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors({ ...errors, password: null });
                }}
                error={errors.password}
              />

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between text-xs pt-1">
                <Checkbox
                  id="rememberMe"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  label="Remember me"
                />

                <Link
                  to="/forgot-password"
                  className="text-xs font-semibold text-[#818CF8] hover:text-[#B49DFF] transition-colors hover:underline"
                >
                  Forgot password?
                </Link>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  isLoading={isSubmitting}
                  rightIcon={ArrowRight}
                  className="w-full py-3 rounded-xl font-bold shadow-xl shadow-[#7657FF]/25"
                >
                  Sign In
                </Button>
              </div>

              {/* Register Link */}
              <div className="text-center pt-2">
                <p className="text-xs text-[#94A3B8]">
                  Don't have an account?{' '}
                  <Link
                    to="/register"
                    className="font-bold text-[#818CF8] hover:text-[#B49DFF] transition-colors hover:underline"
                  >
                    Create Account
                  </Link>
                </p>
              </div>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
};

export default LoginPage;
