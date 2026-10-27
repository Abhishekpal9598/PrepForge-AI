import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Settings as SettingsIcon,
  Moon,
  Sun,
  Monitor,
  Bell,
  Shield,
  KeyRound,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Save,
  LogOut,
  Info,
  Clock,
  Mail,
  Check,
} from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { PasswordInput } from '../components/PasswordInput';
import { Modal } from '../components/Modal';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { useAuth } from '../context/AuthContext';
import {
  fetchUserSettings,
  updateUserSettings,
  changeUserPassword,
  deleteUserAccount,
} from '../services/api';
import { applyTheme, getStoredTheme } from '../utils/theme';

export const SettingsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // Active tab state (appearance | notifications | security | danger)
  const initialTab = searchParams.get('tab') || 'appearance';
  const [activeTab, setActiveTab] = useState(initialTab);

  // Sync tab with URL
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
    setError(null);
    setSuccessMessage(null);
  };

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Appearance State
  const [currentTheme, setCurrentTheme] = useState(() => getStoredTheme());

  // Notification Preferences State
  const [notifications, setNotifications] = useState({
    interviewReminders: true,
    applicationReminders: true,
    resumeUpdates: true,
    jobMatchUpdates: true,
    productAnnouncements: false,
  });

  // Security & Password State
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordErrors, setPasswordErrors] = useState({});
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [securityData, setSecurityData] = useState(null);

  // Account Deletion Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  // Fetch Settings on mount
  useEffect(() => {
    let isMounted = true;
    const loadSettings = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetchUserSettings();
        if (isMounted && res.data) {
          if (res.data.notifications) {
            setNotifications(res.data.notifications);
          }
          if (res.data.appearance?.theme) {
            setCurrentTheme(res.data.appearance.theme);
            applyTheme(res.data.appearance.theme);
          }
          if (res.data.security) {
            setSecurityData(res.data.security);
          }
        }
      } catch (err) {
        if (isMounted) {
          console.error('[SettingsPage] Failed to fetch settings:', err);
          setError(err.message || 'Failed to load user settings.');
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadSettings();
    return () => {
      isMounted = false;
    };
  }, []);

  // Handle Theme Selection
  const handleSelectTheme = async (themeKey) => {
    setCurrentTheme(themeKey);
    applyTheme(themeKey);
    setSuccessMessage(null);
    try {
      await updateUserSettings({ appearance: { theme: themeKey } });
      setSuccessMessage(`Theme updated to ${themeKey === 'system' ? 'System Match' : themeKey.charAt(0).toUpperCase() + themeKey.slice(1)}.`);
    } catch (err) {
      console.warn('[SettingsPage] Could not persist theme to server:', err);
    }
  };

  // Handle Notification Toggle
  const handleToggleNotification = (key) => {
    setNotifications((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
    setSuccessMessage(null);
  };

  // Save Notification Preferences
  const handleSaveNotifications = async (e) => {
    e?.preventDefault?.();
    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await updateUserSettings({ notifications });
      if (res && res.data) {
        setNotifications(res.data.notifications);
        setSuccessMessage('Notification preferences saved successfully.');
      }
    } catch (err) {
      console.error('[SettingsPage] Failed to update notifications:', err);
      setError(err.message || 'Failed to save notification preferences.');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Change Password Submit
  const handleChangePasswordSubmit = async (e) => {
    e.preventDefault();
    setIsChangingPassword(true);
    setError(null);
    setPasswordErrors({});
    setSuccessMessage(null);

    if (!passwordForm.currentPassword) {
      setPasswordErrors({ currentPassword: 'Current password is required' });
      setIsChangingPassword(false);
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setPasswordErrors({ newPassword: 'New password must be at least 8 characters long' });
      setIsChangingPassword(false);
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordErrors({ confirmPassword: 'New password and confirmation do not match' });
      setIsChangingPassword(false);
      return;
    }

    if (passwordForm.newPassword === passwordForm.currentPassword) {
      setPasswordErrors({ newPassword: 'New password must be different from current password' });
      setIsChangingPassword(false);
      return;
    }

    try {
      const res = await changeUserPassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
        confirmPassword: passwordForm.confirmPassword,
      });

      if (res && res.success) {
        setSuccessMessage('Password changed successfully! Previous sessions have been invalidated.');
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
        // Update security status timestamp
        setSecurityData((prev) => ({
          ...prev,
          passwordLastChanged: new Date().toISOString(),
        }));
      }
    } catch (err) {
      console.error('[SettingsPage] Password change failed:', err);
      setError(err.message || 'Failed to update password.');
      if (err.data?.errors) {
        setPasswordErrors(err.data.errors);
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Handle Permanent Account Deletion
  const handleDeleteAccountSubmit = async (e) => {
    e.preventDefault();
    setIsDeletingAccount(true);
    setDeleteError(null);

    if (!deletePassword) {
      setDeleteError('Please enter your password to confirm deletion.');
      setIsDeletingAccount(false);
      return;
    }

    if (deleteConfirmationText !== 'DELETE') {
      setDeleteError('Please type "DELETE" into the confirmation field.');
      setIsDeletingAccount(false);
      return;
    }

    try {
      await deleteUserAccount({
        password: deletePassword,
        confirmation: deleteConfirmationText,
      });

      // Clear local credentials and redirect
      await logout();
      navigate('/login?deleted=true', { replace: true });
    } catch (err) {
      console.error('[SettingsPage] Account deletion failed:', err);
      setDeleteError(err.message || 'Account deletion failed. Check your password and try again.');
    } finally {
      setIsDeletingAccount(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[450px] space-y-3">
        <LoadingSpinner size="lg" />
        <p className="text-xs text-text-secondary">Loading platform settings...</p>
      </div>
    );
  }

  const tabs = [
    { id: 'appearance', label: 'Appearance & Theme', icon: Moon },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security & Password', icon: Shield },
    { id: 'danger', label: 'Danger Zone', icon: Trash2 },
  ];

  return (
    <div className="space-y-8 max-w-4xl pb-16">
      <PageHeader
        title="Platform Preferences & Settings"
        subtitle="Manage appearance, notification triggers, session credentials, and account lifecycle."
        badgeText="Authenticated Settings"
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

      {/* Settings Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-border-subtle pb-2 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-150 ${
                isActive
                  ? 'bg-brand-primary/15 text-white font-bold border border-brand-primary/30 shadow-sm'
                  : 'text-text-secondary hover:text-text-primary hover:bg-dark-card/60'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ========================================================
          TAB 1: APPEARANCE & THEME
          ======================================================== */}
      {activeTab === 'appearance' && (
        <div className="space-y-6">
          <Card className="space-y-6 bg-dark-card border-border-subtle p-6 rounded-3xl">
            <div className="border-b border-border-subtle pb-4">
              <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                <Moon className="w-4 h-4 text-brand-primary" />
                Theme & Interface Mode
              </h3>
              <p className="text-xs text-text-secondary mt-0.5">
                Choose your preferred visual presentation. PrepForge AI defaults to Midnight Navy (#080B14).
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Dark Theme Option */}
              <div
                onClick={() => handleSelectTheme('dark')}
                className={`cursor-pointer rounded-2xl p-5 border transition-all text-left space-y-3 relative ${
                  currentTheme === 'dark'
                    ? 'border-brand-primary bg-brand-primary/10 shadow-lg ring-2 ring-brand-primary/20'
                    : 'border-border-subtle bg-dark-base/60 hover:border-border-strong'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-[#080B14] border border-white/15 flex items-center justify-center text-brand-primary shadow-inner">
                    <Moon className="w-5 h-5" />
                  </div>
                  {currentTheme === 'dark' && (
                    <span className="w-6 h-6 rounded-full bg-brand-primary text-white flex items-center justify-center text-xs">
                      <Check className="w-3.5 h-3.5" />
                    </span>
                  )}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-text-primary">Midnight Navy (Default)</h4>
                  <p className="text-[11px] text-text-secondary mt-1">
                    Signature high-contrast dark aesthetic optimized for developer focus and low eye strain.
                  </p>
                </div>
              </div>

              {/* Light Theme Option */}
              <div
                onClick={() => handleSelectTheme('light')}
                className={`cursor-pointer rounded-2xl p-5 border transition-all text-left space-y-3 relative ${
                  currentTheme === 'light'
                    ? 'border-brand-primary bg-brand-primary/10 shadow-lg ring-2 ring-brand-primary/20'
                    : 'border-border-subtle bg-dark-base/60 hover:border-border-strong'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-white border border-slate-300 flex items-center justify-center text-brand-secondary shadow-inner">
                    <Sun className="w-5 h-5" />
                  </div>
                  {currentTheme === 'light' && (
                    <span className="w-6 h-6 rounded-full bg-brand-primary text-white flex items-center justify-center text-xs">
                      <Check className="w-3.5 h-3.5" />
                    </span>
                  )}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-text-primary">Clean Light</h4>
                  <p className="text-[11px] text-text-secondary mt-1">
                    Crisp, bright palette with crisp typography for high-illumination environments.
                  </p>
                </div>
              </div>

              {/* System Theme Option */}
              <div
                onClick={() => handleSelectTheme('system')}
                className={`cursor-pointer rounded-2xl p-5 border transition-all text-left space-y-3 relative ${
                  currentTheme === 'system'
                    ? 'border-brand-primary bg-brand-primary/10 shadow-lg ring-2 ring-brand-primary/20'
                    : 'border-border-subtle bg-dark-base/60 hover:border-border-strong'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-[#1E293B] border border-white/15 flex items-center justify-center text-brand-primary shadow-inner">
                    <Monitor className="w-5 h-5" />
                  </div>
                  {currentTheme === 'system' && (
                    <span className="w-6 h-6 rounded-full bg-brand-primary text-white flex items-center justify-center text-xs">
                      <Check className="w-3.5 h-3.5" />
                    </span>
                  )}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-text-primary">System Match</h4>
                  <p className="text-[11px] text-text-secondary mt-1">
                    Automatically synchronize with your operating system light / dark preference.
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================
          TAB 2: NOTIFICATION PREFERENCES
          ======================================================== */}
      {activeTab === 'notifications' && (
        <form onSubmit={handleSaveNotifications} className="space-y-6">
          <Card className="space-y-6 bg-dark-card border-border-subtle p-6 rounded-3xl">
            <div className="border-b border-border-subtle pb-4">
              <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                <Bell className="w-4 h-4 text-brand-primary" />
                Candidate Notification Triggers
              </h3>
              <p className="text-xs text-text-secondary mt-0.5">
                Customize in-app alerts and notifications across candidate milestones.
              </p>
            </div>

            {/* Email Notice Callout */}
            <div className="p-4 rounded-2xl bg-brand-primary/10 border border-brand-primary/25 text-xs text-text-secondary flex items-start gap-2.5">
              <Info className="w-4 h-4 text-brand-primary flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-text-primary">Email Delivery Transparency:</strong> In-app notification triggers are active and recorded in your candidate profile. External outbound email delivery requires an SMTP / SendGrid service integration and is currently disabled in local mode.
              </div>
            </div>

            <div className="space-y-4 divide-y divide-border-subtle/50 text-xs">
              {/* Interview Reminders */}
              <div className="flex items-center justify-between pt-2">
                <div className="pr-4">
                  <p className="font-semibold text-text-primary">Mock Interview Reminders</p>
                  <p className="text-text-secondary mt-0.5">
                    Receive scheduled practice session reminders and interview readiness coaching tips.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={notifications.interviewReminders}
                  onChange={() => handleToggleNotification('interviewReminders')}
                  className="rounded border-border-subtle bg-dark-base text-brand-primary focus:ring-brand-primary h-4 w-4 cursor-pointer"
                />
              </div>

              {/* Application Reminders */}
              <div className="flex items-center justify-between pt-4">
                <div className="pr-4">
                  <p className="font-semibold text-text-primary">Job Application Deadlines</p>
                  <p className="text-text-secondary mt-0.5">
                    Alerts for upcoming submission deadlines, follow-up milestones, and interview callbacks.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={notifications.applicationReminders}
                  onChange={() => handleToggleNotification('applicationReminders')}
                  className="rounded border-border-subtle bg-dark-base text-brand-primary focus:ring-brand-primary h-4 w-4 cursor-pointer"
                />
              </div>

              {/* Resume Analysis Updates */}
              <div className="flex items-center justify-between pt-4">
                <div className="pr-4">
                  <p className="font-semibold text-text-primary">Resume Analysis & ATS Updates</p>
                  <p className="text-text-secondary mt-0.5">
                    Notifications when Gemini AI completes multi-metric resume audits and rewrite synthesis.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={notifications.resumeUpdates}
                  onChange={() => handleToggleNotification('resumeUpdates')}
                  className="rounded border-border-subtle bg-dark-base text-brand-primary focus:ring-brand-primary h-4 w-4 cursor-pointer"
                />
              </div>

              {/* Job Match Updates */}
              <div className="flex items-center justify-between pt-4">
                <div className="pr-4">
                  <p className="font-semibold text-text-primary">Job Description Matching Insights</p>
                  <p className="text-text-secondary mt-0.5">
                    Alerts when candidate resumes achieve high alignment scores against target role postings.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={notifications.jobMatchUpdates}
                  onChange={() => handleToggleNotification('jobMatchUpdates')}
                  className="rounded border-border-subtle bg-dark-base text-brand-primary focus:ring-brand-primary h-4 w-4 cursor-pointer"
                />
              </div>

              {/* Product Announcements */}
              <div className="flex items-center justify-between pt-4">
                <div className="pr-4">
                  <p className="font-semibold text-text-primary">Product Announcements & Features</p>
                  <p className="text-text-secondary mt-0.5">
                    Periodic feature updates, new question packs, and AI interview simulation enhancements.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={notifications.productAnnouncements}
                  onChange={() => handleToggleNotification('productAnnouncements')}
                  className="rounded border-border-subtle bg-dark-base text-brand-primary focus:ring-brand-primary h-4 w-4 cursor-pointer"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-border-subtle flex justify-end">
              <Button type="submit" variant="primary" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving Preferences...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Notification Preferences
                  </>
                )}
              </Button>
            </div>
          </Card>
        </form>
      )}

      {/* ========================================================
          TAB 3: SECURITY & PASSWORD
          ======================================================== */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          {/* Change Password Card */}
          <Card className="space-y-6 bg-dark-card border-border-subtle p-6 rounded-3xl">
            <div className="border-b border-border-subtle pb-4">
              <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-brand-primary" />
                Change Account Password
              </h3>
              <p className="text-xs text-text-secondary mt-0.5">
                Ensure your account is protected with a strong, unique password. Changing your password invalidates older sessions.
              </p>
            </div>

            <form onSubmit={handleChangePasswordSubmit} className="space-y-4 max-w-xl">
              <PasswordInput
                label="Current Password"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
                placeholder="Enter your current password"
                required
                error={passwordErrors.currentPassword}
              />

              <PasswordInput
                label="New Password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                placeholder="Enter new secure password"
                showStrength={true}
                required
                error={passwordErrors.newPassword}
              />

              <PasswordInput
                label="Confirm New Password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                placeholder="Re-type new password"
                required
                error={passwordErrors.confirmPassword}
              />

              <div className="pt-2">
                <Button type="submit" variant="primary" disabled={isChangingPassword}>
                  {isChangingPassword ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Updating Password...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Update Password
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Card>

          {/* Account Security Information Card */}
          <Card className="space-y-6 bg-dark-card border-border-subtle p-6 rounded-3xl">
            <div className="border-b border-border-subtle pb-4">
              <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                <Shield className="w-4 h-4 text-brand-secondary" />
                Active Security Telemetry
              </h3>
              <p className="text-xs text-text-secondary mt-0.5">
                Authentic session metadata reported by the authentication authority.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 rounded-2xl bg-dark-base/50 border border-border-subtle/60 space-y-1">
                <p className="text-text-secondary">Primary Login Identifier</p>
                <p className="font-semibold text-text-primary flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-brand-primary" />
                  {securityData?.email || user?.email || 'N/A'}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-dark-base/50 border border-border-subtle/60 space-y-1">
                <p className="text-text-secondary">Password Last Changed</p>
                <p className="font-semibold text-text-primary flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-brand-primary" />
                  {securityData?.passwordLastChanged
                    ? new Date(securityData.passwordLastChanged).toLocaleDateString()
                    : 'Initial registration'}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-dark-base/50 border border-border-subtle/60 space-y-1">
                <p className="text-text-secondary">Account Created Date</p>
                <p className="font-semibold text-text-primary">
                  {securityData?.accountCreated
                    ? new Date(securityData.accountCreated).toLocaleDateString()
                    : user?.createdAt
                    ? new Date(user.createdAt).toLocaleDateString()
                    : 'Active'}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-dark-base/50 border border-border-subtle/60 space-y-1">
                <p className="text-text-secondary">Session Authentication Standard</p>
                <p className="font-semibold text-text-primary">
                  JWT Bearer + HttpOnly SameSite Cookie
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-between items-center text-xs">
              <span className="text-text-secondary">End current browser session:</span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => logout()}
                className="text-[#EF4444] hover:bg-[#EF4444]/10 border-[#EF4444]/30"
              >
                <LogOut className="w-3.5 h-3.5 mr-1.5" />
                Log Out of PrepForge
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================
          TAB 4: DANGER ZONE (ACCOUNT DELETION)
          ======================================================== */}
      {activeTab === 'danger' && (
        <Card className="space-y-6 bg-dark-card border-[#EF4444]/30 p-6 rounded-3xl">
          <div className="border-b border-[#EF4444]/20 pb-4">
            <h3 className="text-sm font-bold text-[#EF4444] flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-[#EF4444]" />
              Danger Zone: Permanent Account Deletion
            </h3>
            <p className="text-xs text-text-secondary mt-0.5">
              Permanently purge your candidate account and all associated documents, AI evaluations, and practice history.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#EF4444]/10 border border-[#EF4444]/25 space-y-2 text-xs text-[#EF4444]">
            <p className="font-bold">This action cannot be undone. Permanent cascading deletion includes:</p>
            <ul className="list-disc list-inside space-y-1 text-text-secondary">
              <li>Candidate profile credentials and contact settings</li>
              <li>All uploaded resumes and extracted document files from storage</li>
              <li>Complete AI Resume ATS quality analyses and line-by-line rewrite suggestions</li>
              <li>All Job Description match evaluations and tailoring records</li>
              <li>Complete AI Mock Interview transcripts, scoring rubrics, and final evaluation reports</li>
              <li>All tracked job applications and timeline records</li>
            </ul>
          </div>

          <div className="pt-2 flex justify-end">
            <Button
              variant="secondary"
              onClick={() => {
                setIsDeleteModalOpen(true);
                setDeleteError(null);
                setDeletePassword('');
                setDeleteConfirmationText('');
              }}
              className="bg-[#EF4444]/10 text-[#EF4444] hover:bg-[#EF4444] hover:text-white border-[#EF4444]/40"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Account & All Data
            </Button>
          </div>
        </Card>
      )}

      {/* Account Deletion Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Confirm Permanent Account Deletion"
        description="This will permanently delete your account, uploaded resumes, ATS analyses, job matches, mock interviews, and application history."
      >
        <form onSubmit={handleDeleteAccountSubmit} className="space-y-4">
          {deleteError && (
            <div className="p-3.5 rounded-xl bg-[#EF4444]/15 border border-[#EF4444]/40 text-xs text-[#EF4444] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{deleteError}</span>
            </div>
          )}

          <div className="space-y-1 text-xs text-text-secondary">
            <p>
              To confirm, type <span className="font-mono font-bold text-white">DELETE</span> in the field below:
            </p>
            <Input
              value={deleteConfirmationText}
              onChange={(e) => setDeleteConfirmationText(e.target.value)}
              placeholder="Type DELETE to confirm"
              required
            />
          </div>

          <div className="space-y-1 text-xs">
            <PasswordInput
              label="Confirm Your Password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              placeholder="Enter your account password"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsDeleteModalOpen(false)}
              disabled={isDeletingAccount}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              variant="secondary"
              disabled={isDeletingAccount || deleteConfirmationText !== 'DELETE' || !deletePassword}
              className="bg-[#EF4444] text-white hover:bg-[#DC2626] border-transparent"
            >
              {isDeletingAccount ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Purging Account...
                </>
              ) : (
                'Permanently Delete Account'
              )}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default SettingsPage;
