import React, { useState, useEffect } from 'react';
import {
  User as UserIcon,
  Mail,
  Phone,
  Briefcase,
  GraduationCap,
  MapPin,
  Sparkles,
  Save,
  RotateCcw,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Award,
} from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { useAuth } from '../context/AuthContext';
import { fetchUserProfile, updateUserProfile } from '../services/api';

const CAREER_LEVEL_OPTIONS = [
  { value: 'Entry', label: 'Entry Level (0-2 years)' },
  { value: 'Mid', label: 'Mid Level (2-5 years)' },
  { value: 'Senior', label: 'Senior Level (5-8 years)' },
  { value: 'Lead', label: 'Lead / Principal (8-12 years)' },
  { value: 'Executive', label: 'Executive / Director (12+ years)' },
];

const AVATAR_GRADIENTS = [
  'from-[#7657FF] to-[#3985FF]',
  'from-[#3985FF] to-[#22C98B]',
  'from-[#7657FF] to-[#F16D78]',
  'from-[#22C98B] to-[#F5B942]',
  'from-[#F5B942] to-[#F16D78]',
];

export const ProfilePage = () => {
  const { user: authUser, updateUser } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
    avatar: '',
    headline: '',
    currentRole: '',
    targetRole: '',
    careerLevel: 'Entry',
    location: '',
    skills: [],
    education: [],
  });

  const [initialData, setInitialData] = useState(null);
  const [newSkill, setNewSkill] = useState('');

  // Load Profile on mount
  useEffect(() => {
    let isMounted = true;
    const loadProfile = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetchUserProfile();
        if (isMounted && res.data) {
          const profile = res.data;
          const loaded = {
            fullName: profile.fullName || '',
            email: profile.email || '',
            phoneNumber: profile.phoneNumber || '',
            avatar: profile.avatar || '',
            headline: profile.headline || '',
            currentRole: profile.currentRole || '',
            targetRole: profile.targetRole || '',
            careerLevel: profile.careerLevel || 'Entry',
            location: profile.location || '',
            skills: Array.isArray(profile.skills) ? profile.skills : [],
            education: Array.isArray(profile.education) ? profile.education : [],
          };
          setFormData(loaded);
          setInitialData(loaded);
        }
      } catch (err) {
        if (isMounted) {
          console.error('[ProfilePage] Failed to fetch user profile:', err);
          setError(err.message || 'Failed to load user profile.');
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadProfile();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
    setSuccessMessage(null);
  };

  const handleAddSkill = (e) => {
    e?.preventDefault?.();
    const trimmed = newSkill.trim();
    if (!trimmed) return;
    if (formData.skills.includes(trimmed)) {
      setNewSkill('');
      return;
    }
    setFormData((prev) => ({
      ...prev,
      skills: [...prev.skills, trimmed],
    }));
    setNewSkill('');
  };

  const handleRemoveSkill = (skillToRemove) => {
    setFormData((prev) => ({
      ...prev,
      skills: prev.skills.filter((s) => s !== skillToRemove),
    }));
  };

  const handleAddEducation = () => {
    setFormData((prev) => ({
      ...prev,
      education: [
        ...prev.education,
        { institution: '', degree: '', fieldOfStudy: '', graduationYear: null },
      ],
    }));
  };

  const handleUpdateEducation = (index, field, value) => {
    setFormData((prev) => {
      const updated = [...prev.education];
      updated[index] = {
        ...updated[index],
        [field]: field === 'graduationYear' ? (value ? parseInt(value, 10) : null) : value,
      };
      return { ...prev, education: updated };
    });
  };

  const handleRemoveEducation = (index) => {
    setFormData((prev) => ({
      ...prev,
      education: prev.education.filter((_, i) => i !== index),
    }));
  };

  const handleReset = () => {
    if (initialData) {
      setFormData(initialData);
      setFieldErrors({});
      setError(null);
      setSuccessMessage(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setFieldErrors({});
    setSuccessMessage(null);

    try {
      const payload = {
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        phoneNumber: formData.phoneNumber.trim(),
        avatar: formData.avatar.trim(),
        headline: formData.headline.trim(),
        currentRole: formData.currentRole.trim(),
        targetRole: formData.targetRole.trim(),
        careerLevel: formData.careerLevel,
        location: formData.location.trim(),
        skills: formData.skills,
        education: formData.education.map((edu) => ({
          institution: (edu.institution || '').trim(),
          degree: (edu.degree || '').trim(),
          fieldOfStudy: (edu.fieldOfStudy || '').trim(),
          graduationYear: edu.graduationYear || null,
        })),
      };

      const res = await updateUserProfile(payload);
      if (res && res.data) {
        setFormData(res.data);
        setInitialData(res.data);
        setSuccessMessage('Profile saved successfully! Your candidate baseline has been updated.');
        updateUser(res.data);
      }
    } catch (err) {
      console.error('[ProfilePage] Save failed:', err);
      setError(err.message || 'Failed to update profile.');
      if (err.data?.errors) {
        setFieldErrors(err.data.errors);
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[450px] space-y-3">
        <LoadingSpinner size="lg" />
        <p className="text-xs text-text-secondary">Loading candidate profile...</p>
      </div>
    );
  }

  const initials = formData.fullName
    ? formData.fullName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'CP';

  return (
    <div className="space-y-8 max-w-4xl pb-16">
      <PageHeader
        title="Candidate Profile Management"
        subtitle="Manage your professional background, target career trajectory, and platform credentials."
        badgeText="Authenticated Profile"
      />

      {/* Notifications */}
      {successMessage && (
        <div className="p-4 rounded-2xl bg-[#22C98B]/10 border border-[#22C98B]/30 text-xs text-[#22C98B] flex items-center gap-2.5 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span className="font-semibold">{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-[#EF4444]/10 border border-[#EF4444]/30 text-xs text-[#EF4444] flex items-center gap-2.5 animate-fadeIn">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Profile Identity Card */}
        <Card className="space-y-6 bg-dark-card border-border-subtle p-6 rounded-3xl">
          <div className="flex flex-col sm:flex-row sm:items-center gap-5 pb-6 border-b border-border-subtle">
            <div className="relative group">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-[#7657FF] to-[#3985FF] flex items-center justify-center text-white text-2xl font-black shadow-lg border border-white/10 select-none">
                {initials}
              </div>
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-bold text-text-primary">
                {formData.fullName || 'Candidate Name'}
              </h3>
              <p className="text-xs text-text-secondary">
                {formData.headline || formData.targetRole || 'Configure your professional headline below'}
              </p>
              <div className="flex items-center gap-2 pt-1 text-[11px] text-brand-primary">
                <Award className="w-3.5 h-3.5" />
                <span>{formData.careerLevel} Level • PrepForge Candidate</span>
              </div>
            </div>
          </div>

          {/* Core Personal Information */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Input
              label="Full Name"
              value={formData.fullName}
              onChange={(e) => handleChange('fullName', e.target.value)}
              placeholder="e.g. Alex Morgan"
              icon={UserIcon}
              required
              error={fieldErrors['fullName']}
            />

            <Input
              label="Email Address"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="e.g. alex@example.com"
              icon={Mail}
              required
              error={fieldErrors['email']}
              helperText="Used for authentication and account communications."
            />

            <Input
              label="Phone Number (Optional)"
              type="tel"
              value={formData.phoneNumber}
              onChange={(e) => handleChange('phoneNumber', e.target.value)}
              placeholder="e.g. +1 (555) 019-2834"
              icon={Phone}
              error={fieldErrors['phoneNumber']}
            />

            <Input
              label="Location (Optional)"
              value={formData.location}
              onChange={(e) => handleChange('location', e.target.value)}
              placeholder="e.g. San Francisco, CA / Remote"
              icon={MapPin}
              error={fieldErrors['location']}
            />
          </div>
        </Card>

        {/* Career & Role Preferences Card */}
        <Card className="space-y-6 bg-dark-card border-border-subtle p-6 rounded-3xl">
          <div className="border-b border-border-subtle pb-4">
            <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-brand-primary" />
              Career & Role Baseline
            </h3>
            <p className="text-xs text-text-secondary mt-0.5">
              These details tune mock interview question generation and job match recommendations.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="sm:col-span-2">
              <Input
                label="Professional Headline"
                value={formData.headline}
                onChange={(e) => handleChange('headline', e.target.value)}
                placeholder="e.g. Senior Backend Engineer specializing in Distributed Systems & Node.js"
                icon={Sparkles}
                error={fieldErrors['headline']}
              />
            </div>

            <Input
              label="Current Job Role"
              value={formData.currentRole}
              onChange={(e) => handleChange('currentRole', e.target.value)}
              placeholder="e.g. Software Engineer II"
              icon={Briefcase}
              error={fieldErrors['currentRole']}
            />

            <Input
              label="Target Job Role"
              value={formData.targetRole}
              onChange={(e) => handleChange('targetRole', e.target.value)}
              placeholder="e.g. Senior Full-Stack Engineer"
              icon={Briefcase}
              error={fieldErrors['targetRole']}
            />

            <div className="sm:col-span-2">
              <Select
                label="Career Seniority Tier"
                value={formData.careerLevel}
                onChange={(e) => handleChange('careerLevel', e.target.value)}
                options={CAREER_LEVEL_OPTIONS}
                error={fieldErrors['careerLevel']}
              />
            </div>
          </div>
        </Card>

        {/* Competencies & Skills Card */}
        <Card className="space-y-6 bg-dark-card border-border-subtle p-6 rounded-3xl">
          <div className="border-b border-border-subtle pb-4">
            <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand-secondary" />
              Core Skills & Tech Stack
            </h3>
            <p className="text-xs text-text-secondary mt-0.5">
              Add your key competencies to power automatic resume match alignments.
            </p>
          </div>

          {/* Add skill input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddSkill();
                }
              }}
              placeholder="Type a skill (e.g. TypeScript, React, Docker, System Design) and press Enter"
              className="flex-1 rounded-xl bg-[#1E293B] border border-[#334155] px-3.5 py-2.5 text-xs sm:text-sm text-[#F8FAFC] placeholder:text-[#94A3B8] focus:border-[#818CF8] focus:ring-2 focus:ring-[#818CF8]/30 outline-none transition-all"
            />
            <Button
              type="button"
              variant="secondary"
              onClick={handleAddSkill}
              disabled={!newSkill.trim()}
              className="flex-shrink-0"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add
            </Button>
          </div>

          {/* Skills pills */}
          <div className="flex flex-wrap gap-2 min-h-[48px] p-3 rounded-2xl bg-dark-base/40 border border-border-subtle/50">
            {formData.skills.length === 0 ? (
              <p className="text-xs text-text-secondary italic self-center">
                No skills added yet. Type a competency above and click Add.
              </p>
            ) : (
              formData.skills.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-brand-primary/15 text-[#B49DFF] border border-brand-primary/30"
                >
                  {skill}
                  <button
                    type="button"
                    onClick={() => handleRemoveSkill(skill)}
                    className="hover:text-white rounded-full p-0.5 transition-colors focus:outline-none"
                    aria-label={`Remove skill ${skill}`}
                  >
                    ×
                  </button>
                </span>
              ))
            )}
          </div>
        </Card>

        {/* Education Card */}
        <Card className="space-y-6 bg-dark-card border-border-subtle p-6 rounded-3xl">
          <div className="flex items-center justify-between border-b border-border-subtle pb-4">
            <div>
              <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-brand-primary" />
                Education & Credentials
              </h3>
              <p className="text-xs text-text-secondary mt-0.5">
                Academic institutions, degrees, and graduation milestones.
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleAddEducation}
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Add Degree
            </Button>
          </div>

          {formData.education.length === 0 ? (
            <p className="text-xs text-text-secondary italic py-2">
              No education entries added yet. Click &quot;Add Degree&quot; to specify your education credentials.
            </p>
          ) : (
            <div className="space-y-4">
              {formData.education.map((edu, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-dark-base/50 border border-border-subtle/70 space-y-3 relative group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-text-primary">
                      Education #{idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveEducation(idx)}
                      className="text-text-secondary hover:text-[#EF4444] p-1 rounded-lg transition-colors"
                      title="Remove education"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      label="Institution / University"
                      value={edu.institution}
                      onChange={(e) => handleUpdateEducation(idx, 'institution', e.target.value)}
                      placeholder="e.g. Stanford University"
                    />

                    <Input
                      label="Degree"
                      value={edu.degree}
                      onChange={(e) => handleUpdateEducation(idx, 'degree', e.target.value)}
                      placeholder="e.g. Bachelor of Science"
                    />

                    <Input
                      label="Field of Study"
                      value={edu.fieldOfStudy}
                      onChange={(e) => handleUpdateEducation(idx, 'fieldOfStudy', e.target.value)}
                      placeholder="e.g. Computer Science"
                    />

                    <Input
                      label="Graduation Year"
                      type="number"
                      value={edu.graduationYear || ''}
                      onChange={(e) => handleUpdateEducation(idx, 'graduationYear', e.target.value)}
                      placeholder="e.g. 2024"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Action Controls */}
        <div className="flex items-center justify-between pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={handleReset}
            disabled={isSaving}
          >
            <RotateCcw className="w-4 h-4 mr-1.5" />
            Discard Changes
          </Button>

          <Button
            type="submit"
            variant="primary"
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving Profile...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Profile
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ProfilePage;
