import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Bot, 
  FileText, 
  Sparkles, 
  CheckCircle2, 
  ArrowRight, 
  Cpu, 
  Award,
  BarChart3,
  ShieldCheck,
  TrendingUp,
  User,
  Briefcase
} from 'lucide-react';
import { BrandLogo } from '../components/BrandLogo';
import { Input } from '../components/Input';
import { PasswordInput } from '../components/PasswordInput';
import { Select } from '../components/Select';
import { Checkbox } from '../components/Checkbox';
import { Button } from '../components/Button';
import { Toast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';

/**
 * PrepForge AI - Premium SaaS Registration Page
 * Fully responsive two-column layout with Midnight Navy aesthetic,
 * Electric Violet/Blue gradients, and bulletproof dark input styling.
 */
export const RegisterPage = () => {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    targetRole: 'Full Stack Developer',
    careerLevel: 'Mid',
    agreeTerms: false,
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [successToast, setSuccessToast] = useState(null);

  const roleOptions = [
    { value: 'Software Engineer', label: 'Software Engineer (General)' },
    { value: 'Frontend Developer', label: 'Frontend Developer (React / Vue)' },
    { value: 'Backend Engineer', label: 'Backend Engineer (Node / Go / Java)' },
    { value: 'Full Stack Developer', label: 'Full Stack Developer' },
    { value: 'DevOps / Platform Engineer', label: 'DevOps / Platform / SRE' },
    { value: 'Data Scientist / ML Engineer', label: 'Data Science & Machine Learning' },
    { value: 'Product Manager', label: 'Technical Product Manager' },
    { value: 'Engineering Manager', label: 'Engineering Manager / Lead' },
  ];

  const careerLevelOptions = [
    { value: 'Entry', label: 'Entry Level (0-2 years)' },
    { value: 'Mid', label: 'Mid Level (3-5 years)' },
    { value: 'Senior', label: 'Senior Level (5-8 years)' },
    { value: 'Lead', label: 'Lead / Staff (8+ years)' },
    { value: 'Executive', label: 'Executive / Principal' },
  ];

  const handlePasswordChange = (e) => {
    const newPassword = e.target.value;
    setFormData((prev) => ({ ...prev, password: newPassword }));

    setErrors((prev) => {
      const updated = { ...prev };

      // Update password length validation
      if (!newPassword) {
        if (prev.password) updated.password = 'Password is required';
      } else if (newPassword.length < 6) {
        updated.password = 'Password must be at least 6 characters long';
      } else {
        delete updated.password;
      }

      // Real-time mismatch validation if confirmPassword has input
      if (formData.confirmPassword) {
        if (newPassword !== formData.confirmPassword) {
          updated.confirmPassword = 'Passwords do not match';
        } else {
          delete updated.confirmPassword;
        }
      }

      return updated;
    });
  };

  const handleConfirmPasswordChange = (e) => {
    const newConfirm = e.target.value;
    setFormData((prev) => ({ ...prev, confirmPassword: newConfirm }));

    setErrors((prev) => {
      const updated = { ...prev };

      if (!newConfirm) {
        if (prev.confirmPassword) updated.confirmPassword = 'Confirm password is required';
      } else if (formData.password !== newConfirm) {
        updated.confirmPassword = 'Passwords do not match';
      } else {
        delete updated.confirmPassword;
      }

      return updated;
    });
  };

  const validate = () => {
    const newErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!formData.fullName.trim() || formData.fullName.trim().length < 2) {
      newErrors.fullName = 'Full name is required (minimum 2 characters)';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!emailRegex.test(formData.email.trim())) {
      newErrors.email = 'Please provide a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters long';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Confirm password is required';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!formData.targetRole) {
      newErrors.targetRole = 'Please select your target job role';
    }

    if (!formData.careerLevel) {
      newErrors.careerLevel = 'Please select your career level';
    }

    if (!formData.agreeTerms) {
      newErrors.agreeTerms = 'You must agree to the Terms of Service & Privacy Policy';
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
      const response = await register({
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        password: formData.password,
        targetRole: formData.targetRole,
        careerLevel: formData.careerLevel,
      });

      setSuccessToast(response.message || 'Account created successfully! Redirecting to sign in...');
      setTimeout(() => {
        navigate('/login', {
          state: {
            message: 'Account created successfully! Please sign in with your credentials.',
            email: formData.email.trim(),
          },
        });
      }, 1000);
    } catch (err) {
      setApiError(err.message || 'Registration failed. Please check your details and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center p-4 sm:p-6 lg:p-10 bg-[#080B16] relative overflow-hidden">
      {/* Ambient Gradient Auras */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[38rem] h-[38rem] bg-[#7657FF]/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[34rem] h-[34rem] bg-[#3985FF]/15 rounded-full blur-3xl pointer-events-none" />

      {/* Main SaaS Card Container */}
      <div className="w-full max-w-6xl rounded-3xl overflow-hidden border border-white/[0.1] bg-[#0D1220]/95 shadow-2xl backdrop-blur-2xl grid grid-cols-1 lg:grid-cols-12 relative z-10">
        
        {/* Left Column: Product Branding & AI Interview Benefits */}
        <div className="lg:col-span-5 bg-gradient-to-br from-[#121A2B] via-[#0D1220] to-[#080B16] p-8 sm:p-12 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-white/[0.08] relative overflow-hidden text-left">
          
          <div className="space-y-8 relative z-10">
            <Link to="/" className="inline-block focus:outline-none">
              <BrandLogo size="md" />
            </Link>

            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-[#7657FF]/15 text-[#B49DFF] border border-[#7657FF]/30">
                <Sparkles className="w-3.5 h-3.5 text-[#7657FF]" />
                <span>AI Interview Acceleration</span>
              </div>
              
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#F8FAFC] tracking-tight leading-snug">
                Ace Your Tech Interviews with{' '}
                <span className="brand-gradient-text">Adaptive AI</span>
              </h1>
              
              <p className="text-xs sm:text-sm text-[#94A3B8] leading-relaxed">
                Join thousands of engineers and professionals using PrepForge AI to conduct realistic mock interviews, analyze resumes, and secure top offers.
              </p>
            </div>

            {/* Core Benefits Checklist */}
            <div className="space-y-4 pt-2">
              {[
                {
                  title: 'Realistic AI Interviewers',
                  desc: 'Adaptive follow-up questions tailored to your target company and tier.',
                  icon: Bot,
                },
                {
                  title: 'Deep Resume & ATS Analysis',
                  desc: 'Instant keyword matching, section grading, and impact-driven bullet rewrites.',
                  icon: FileText,
                },
                {
                  title: 'Instant Rubric Scoring',
                  desc: 'Comprehensive algorithmic evaluations with Big-O complexity feedback.',
                  icon: BarChart3,
                },
                {
                  title: '10,000+ Curated Questions',
                  desc: 'Technical, behavioral, and system design questions from tier-1 firms.',
                  icon: Award,
                },
              ].map((benefit, idx) => (
                <div key={idx} className="flex items-start gap-3.5 group">
                  <div className="w-8 h-8 rounded-xl bg-[#7657FF]/20 text-[#B49DFF] border border-[#7657FF]/30 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform">
                    <benefit.icon className="w-4 h-4" />
                  </div>
                  <div className="space-y-0.5">
                    <h2 className="text-xs font-bold text-[#F8FAFC]">
                      {benefit.title}
                    </h2>
                    <p className="text-[11px] text-[#94A3B8] leading-tight">
                      {benefit.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Social Proof & Trust Metric Badge */}
          <div className="pt-8 mt-8 border-t border-white/[0.08] relative z-10 flex items-center justify-between text-[11px] text-[#94A3B8]">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#22C98B]" />
              <span>Production-Ready & 100% Encrypted</span>
            </div>
            <span className="font-semibold text-[#F8FAFC]">v1.0.0</span>
          </div>
        </div>

        {/* Right Column: Modern Registration Form */}
        <div className="lg:col-span-7 bg-[#0D1220] p-6 sm:p-10 lg:p-12 flex flex-col justify-center text-left">
          <div className="max-w-md w-full mx-auto space-y-6">
            
            <div className="space-y-1">
              <h2 className="text-2xl font-extrabold text-[#F8FAFC] tracking-tight">
                Create Your Free Account
              </h2>
              <p className="text-xs text-[#94A3B8]">
                Get full access to mock interviews, resume feedback, and analytics.
              </p>
            </div>

            {/* Error or Success Toasts */}
            {apiError && (
              <Toast
                type="error"
                title="Registration Issue"
                message={apiError}
                onClose={() => setApiError(null)}
              />
            )}

            {successToast && (
              <Toast
                type="success"
                title="Welcome to PrepForge AI!"
                message={successToast}
              />
            )}

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {/* Full Name */}
              <Input
                label="Full Name"
                id="fullName"
                type="text"
                required
                icon={User}
                placeholder="e.g. Jane Doe"
                value={formData.fullName}
                onChange={(e) => {
                  setFormData({ ...formData, fullName: e.target.value });
                  if (errors.fullName) setErrors({ ...errors, fullName: null });
                }}
                error={errors.fullName}
              />

              {/* Email Address */}
              <Input
                label="Email Address"
                id="email"
                type="email"
                required
                placeholder="you@domain.com"
                value={formData.email}
                onChange={(e) => {
                  setFormData({ ...formData, email: e.target.value });
                  if (errors.email) setErrors({ ...errors, email: null });
                }}
                error={errors.email}
              />

              {/* Password with Strength Meter */}
              <PasswordInput
                label="Password"
                id="password"
                required
                showStrength
                placeholder="Create a strong password (min 6 chars)"
                value={formData.password}
                onChange={handlePasswordChange}
                error={errors.password}
              />

              {/* Confirm Password */}
              <PasswordInput
                label="Confirm Password"
                id="confirmPassword"
                required
                placeholder="Re-type your password"
                value={formData.confirmPassword}
                onChange={handleConfirmPasswordChange}
                error={errors.confirmPassword}
              />

              {/* Target Job Role & Career Level Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <Select
                  label="Target Role"
                  id="targetRole"
                  required
                  options={roleOptions}
                  value={formData.targetRole}
                  onChange={(e) => {
                    setFormData({ ...formData, targetRole: e.target.value });
                    if (errors.targetRole) setErrors({ ...errors, targetRole: null });
                  }}
                  error={errors.targetRole}
                />

                <Select
                  label="Career Level"
                  id="careerLevel"
                  required
                  options={careerLevelOptions}
                  value={formData.careerLevel}
                  onChange={(e) => {
                    setFormData({ ...formData, careerLevel: e.target.value });
                    if (errors.careerLevel) setErrors({ ...errors, careerLevel: null });
                  }}
                  error={errors.careerLevel}
                />
              </div>

              {/* Terms and Privacy Policy Checkbox */}
              <div className="pt-1">
                <Checkbox
                  id="agreeTerms"
                  checked={formData.agreeTerms}
                  onChange={(e) => {
                    setFormData({ ...formData, agreeTerms: e.target.checked });
                    if (errors.agreeTerms) setErrors({ ...errors, agreeTerms: null });
                  }}
                  error={errors.agreeTerms}
                  label={
                    <span>
                      I agree to the{' '}
                      <span className="text-[#818CF8] hover:underline">Terms of Service</span> and{' '}
                      <span className="text-[#818CF8] hover:underline">Privacy Policy</span>.
                    </span>
                  }
                />
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
                  Create Account
                </Button>
              </div>

              {/* Sign In Link */}
              <div className="text-center pt-2">
                <p className="text-xs text-[#94A3B8]">
                  Already have an account?{' '}
                  <Link
                    to="/login"
                    className="font-bold text-[#818CF8] hover:text-[#B49DFF] transition-colors hover:underline"
                  >
                    Sign In
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

export default RegisterPage;
