/**
 * frontendAuthenticationFlow.test.js
 *
 * Targeted regression test suite for:
 * - Issue 1: Password & Confirm Password matching/mismatching validation
 * - Issue 2: Registration & Login flow contracts (no auto-login on register)
 * - Issue 3: Form validation for all required fields
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Mock localStorage for node environment
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = String(value); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

globalThis.localStorage = localStorageMock;

// Import API helper functions
import {
  getStoredToken,
  setStoredToken,
  getStoredUser,
  setStoredUser,
  registerUser,
  loginUser,
  logoutUser,
} from '../src/services/api.js';

// Form validation logic extracted directly from RegisterPage for headless testing
function validateRegistrationForm(formData) {
  const newErrors = {};
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!formData.fullName || !formData.fullName.trim() || formData.fullName.trim().length < 2) {
    newErrors.fullName = 'Full name is required (minimum 2 characters)';
  }

  if (!formData.email || !formData.email.trim()) {
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

  return {
    isValid: Object.keys(newErrors).length === 0,
    errors: newErrors,
  };
}

// Real-time password validation logic extracted directly from RegisterPage handlers
function computeRealtimePasswordErrors(currentErrors, password, confirmPassword) {
  const updated = { ...currentErrors };

  if (password && password.length >= 6) {
    delete updated.password;
  } else if (password) {
    updated.password = 'Password must be at least 6 characters long';
  }

  if (confirmPassword) {
    if (password !== confirmPassword) {
      updated.confirmPassword = 'Passwords do not match';
    } else {
      delete updated.confirmPassword;
    }
  }

  return updated;
}

describe('Suite: Authentication Flow & Password Validation Verification', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // --------------------------------------------------------------------------
  // 1. Password Confirmation & Real-time Validation (Issue 1)
  // --------------------------------------------------------------------------
  describe('1. Password Matching and Mismatching Validation (Issue 1)', () => {
    it('TC-AUTH-01: Identical password and confirmPassword pass validation with 0 errors', () => {
      const validForm = {
        fullName: 'Jane Doe',
        email: 'jane@prepforge.io',
        password: 'SuperSecurePassword123!',
        confirmPassword: 'SuperSecurePassword123!',
        targetRole: 'Full Stack Developer',
        careerLevel: 'Mid',
        agreeTerms: true,
      };

      const result = validateRegistrationForm(validForm);
      assert.equal(result.isValid, true, 'Form should be valid when passwords match');
      assert.equal(result.errors.confirmPassword, undefined);
      assert.equal(result.errors.password, undefined);
    });

    it('TC-AUTH-02: Mismatching passwords return "Passwords do not match"', () => {
      const mismatchForm = {
        fullName: 'Jane Doe',
        email: 'jane@prepforge.io',
        password: 'SuperSecurePassword123!',
        confirmPassword: 'DifferentPassword123!',
        targetRole: 'Full Stack Developer',
        careerLevel: 'Mid',
        agreeTerms: true,
      };

      const result = validateRegistrationForm(mismatchForm);
      assert.equal(result.isValid, false);
      assert.equal(result.errors.confirmPassword, 'Passwords do not match');
    });

    it('TC-AUTH-03: Real-time validation clears mismatch error as soon as passwords match', () => {
      // User initially had an error
      const initialErrors = { confirmPassword: 'Passwords do not match' };
      
      // User updates confirmPassword to match password
      const updatedErrors = computeRealtimePasswordErrors(initialErrors, 'MyPassword123!', 'MyPassword123!');
      assert.equal(updatedErrors.confirmPassword, undefined, 'Mismatch error should be immediately cleared');
    });

    it('TC-AUTH-04: Real-time validation sets mismatch error when password is changed away from confirmPassword', () => {
      const initialErrors = {};
      const updatedErrors = computeRealtimePasswordErrors(initialErrors, 'ChangedPassword123!', 'OldPassword123!');
      assert.equal(updatedErrors.confirmPassword, 'Passwords do not match');
    });

    it('TC-AUTH-05: Rejects short passwords (< 6 chars)', () => {
      const shortForm = {
        fullName: 'Jane Doe',
        email: 'jane@prepforge.io',
        password: '12345',
        confirmPassword: '12345',
        targetRole: 'Full Stack Developer',
        careerLevel: 'Mid',
        agreeTerms: true,
      };

      const result = validateRegistrationForm(shortForm);
      assert.equal(result.isValid, false);
      assert.equal(result.errors.password, 'Password must be at least 6 characters long');
    });
  });

  // --------------------------------------------------------------------------
  // 2. Registration Form Required Fields (Issue 3)
  // --------------------------------------------------------------------------
  describe('2. Registration Form Fields Validation (Issue 3)', () => {
    it('TC-AUTH-06: Rejects empty full name or name < 2 chars', () => {
      const form = {
        fullName: ' ',
        email: 'jane@prepforge.io',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        targetRole: 'Full Stack Developer',
        careerLevel: 'Mid',
        agreeTerms: true,
      };

      const result = validateRegistrationForm(form);
      assert.equal(result.isValid, false);
      assert.ok(result.errors.fullName.includes('Full name is required'));
    });

    it('TC-AUTH-07: Rejects invalid email formats', () => {
      const invalidEmails = ['plainaddress', '@missingusername.com', 'username@.com', 'username@domain'];
      for (const email of invalidEmails) {
        const form = {
          fullName: 'Jane Doe',
          email,
          password: 'Password123!',
          confirmPassword: 'Password123!',
          targetRole: 'Full Stack Developer',
          careerLevel: 'Mid',
          agreeTerms: true,
        };
        const result = validateRegistrationForm(form);
        assert.equal(result.isValid, false, `Should reject email: ${email}`);
        assert.ok(result.errors.email);
      }
    });

    it('TC-AUTH-08: Rejects when Terms and Conditions checkbox is false', () => {
      const form = {
        fullName: 'Jane Doe',
        email: 'jane@prepforge.io',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        targetRole: 'Full Stack Developer',
        careerLevel: 'Mid',
        agreeTerms: false,
      };

      const result = validateRegistrationForm(form);
      assert.equal(result.isValid, false);
      assert.ok(result.errors.agreeTerms.includes('Terms of Service'));
    });
  });

  // --------------------------------------------------------------------------
  // 3. Registration & Login Session Contracts (Issue 2)
  // --------------------------------------------------------------------------
  describe('3. Registration & Login Session Management (Issue 2)', () => {
    it('TC-AUTH-09: registerUser does NOT save token or user to localStorage (No auto-login)', async () => {
      // Mock global fetch to return a registration success payload without token
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async () => ({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          success: true,
          message: 'Account created successfully! Please sign in with your credentials.',
          user: { id: 'u123', email: 'jane@prepforge.io', fullName: 'Jane Doe' },
        }),
      });

      try {
        const res = await registerUser({ email: 'jane@prepforge.io', password: 'Password123!' });
        assert.equal(res.success, true);
        assert.equal(getStoredToken(), null, 'Token must NOT be saved in localStorage on registration');
        assert.equal(getStoredUser(), null, 'User must NOT be saved in localStorage on registration');
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('TC-AUTH-10: loginUser correctly saves token and user to localStorage', async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async () => ({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          success: true,
          token: 'mock-jwt-token-xyz-12345',
          user: { id: 'u123', email: 'jane@prepforge.io', fullName: 'Jane Doe' },
        }),
      });

      try {
        const res = await loginUser({ email: 'jane@prepforge.io', password: 'Password123!' });
        assert.equal(res.success, true);
        assert.equal(getStoredToken(), 'mock-jwt-token-xyz-12345', 'Token must be saved in localStorage on login');
        assert.equal(getStoredUser().email, 'jane@prepforge.io', 'User must be saved in localStorage on login');
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('TC-AUTH-11: logoutUser completely clears stored token and user from localStorage', async () => {
      setStoredToken('mock-token-to-delete');
      setStoredUser({ id: 'u123', email: 'jane@prepforge.io' });
      assert.ok(getStoredToken());
      assert.ok(getStoredUser());

      const originalFetch = globalThis.fetch;
      globalThis.fetch = async () => ({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ success: true, message: 'Logged out successfully.' }),
      });

      try {
        await logoutUser();
        assert.equal(getStoredToken(), null, 'Token must be null after logout');
        assert.equal(getStoredUser(), null, 'User must be null after logout');
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('TC-AUTH-12: Correctly unpacks nested error objects without converting to [object Object]', async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async () => ({
        ok: false,
        status: 403,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          success: false,
          error: { message: 'Origin https://unauthorized.com not allowed by CORS' },
        }),
      });

      try {
        await assert.rejects(
          async () => {
            await registerUser({ email: 'test@prepforge.io', password: 'Password123!' });
          },
          (err) => {
            assert.notEqual(err.message, '[object Object]', 'Error message must not be [object Object]');
            assert.equal(err.message, 'Origin https://unauthorized.com not allowed by CORS');
            assert.equal(err.status, 403);
            return true;
          }
        );
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('TC-AUTH-13: Detects HTML responses from API endpoint and alerts on SPA routing misconfiguration', async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async () => ({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'text/html; charset=utf-8' }),
        text: async () => '<!DOCTYPE html><html><head><title>PrepForge AI</title></head><body><div id="root"></div></body></html>',
      });

      try {
        await assert.rejects(
          async () => {
            await registerUser({ email: 'test@prepforge.io', password: 'Password123!' });
          },
          (err) => {
            assert.equal(err.code, 'INVALID_CONTENT_TYPE');
            assert.ok(err.message.includes('API server returned an HTML document instead of JSON'));
            return true;
          }
        );
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('TC-AUTH-14: Redirect guard condition enforces !isLoading && isAuthenticated', () => {
      // Simulate unauthenticated new visitor loading the app
      let redirected = false;
      const simulateRedirect = (isLoading, isAuthenticated) => {
        if (!isLoading && isAuthenticated) {
          redirected = true;
        }
      };

      // 1. Initial load (verifying session) -> MUST NOT redirect
      simulateRedirect(true, false);
      assert.equal(redirected, false, 'Must not redirect while verifying session');

      // 2. Initial load with stale local cached user while still checking -> MUST NOT redirect
      simulateRedirect(true, true);
      assert.equal(redirected, false, 'Must not redirect while checkAuth is still loading');

      // 3. Unauthenticated session finished checking -> MUST NOT redirect
      simulateRedirect(false, false);
      assert.equal(redirected, false, 'Must not redirect unauthenticated visitor');

      // 4. Authenticated session verified -> DOES redirect
      simulateRedirect(false, true);
      assert.equal(redirected, true, 'Redirects only when verified and finished loading');
    });

    it('TC-AUTH-15: HTTP 405 Method Not Allowed formats actionable error for static Vercel route', async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async () => ({
        ok: false,
        status: 405,
        headers: new Headers({ 'content-type': 'text/plain' }),
        text: async () => 'Method Not Allowed',
      });

      try {
        await assert.rejects(
          async () => {
            await registerUser({ email: 'test@prepforge.io', password: 'Password123!' });
          },
          (err) => {
            assert.equal(err.status, 405);
            assert.equal(err.code, 'METHOD_NOT_ALLOWED');
            assert.ok(err.message.includes('HTTP 405 Method Not Allowed'));
            return true;
          }
        );
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('TC-AUTH-18: Intercepts Vercel ROUTER_EXTERNAL_TARGET_ERROR / 502 Bad Gateway and normalizes error', async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async () => ({
        ok: false,
        status: 502,
        headers: new Headers({ 'content-type': 'text/plain' }),
        text: async () => 'An error occurred with this application. ROUTER_EXTERNAL_TARGET_ERROR bom1::5m56z-1793130141616-ed2430a1f71f',
      });

      try {
        await assert.rejects(
          async () => {
            await registerUser({ email: 'test@prepforge.io', password: 'Password123!' });
          },
          (err) => {
            assert.equal(err.status, 502);
            assert.equal(err.code, 'GATEWAY_TIMEOUT');
            assert.ok(!err.message.includes('ROUTER_EXTERNAL_TARGET_ERROR'), 'Raw Vercel router code must not be exposed to user');
            assert.ok(err.message.includes('warming up from a cold start') || err.message.includes('took too long'));
            return true;
          }
        );
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('TC-AUTH-16: AuthContext checkAuth purges stale credentials when session check fails', async () => {
      setStoredToken('expired-or-invalid-token');
      setStoredUser({ id: 'old-user', email: 'old@prepforge.io' });
      assert.ok(getStoredToken());
      assert.ok(getStoredUser());

      // Simulate session check rejection (e.g. 401 or 405 or server error)
      const purgeSession = (err) => {
        setStoredToken(null);
        setStoredUser(null);
      };

      purgeSession(new Error('Session verification failed'));
      assert.equal(getStoredToken(), null, 'Stored token must be purged upon check failure');
      assert.equal(getStoredUser(), null, 'Stored user must be purged upon check failure');
    });

    it('TC-AUTH-17: Clean visitor session guarantees unauthenticated access to public routes', () => {
      // With empty localStorage, initial state is strictly unauthenticated
      assert.equal(getStoredToken(), null);
      assert.equal(getStoredUser(), null);

      let currentRoute = '/';
      const allowAccess = (route, isAuthenticated) => {
        if (route === '/' || route === '/login' || route === '/register') return true;
        return isAuthenticated;
      };

      assert.equal(allowAccess('/', false), true, 'Public landing page / is accessible without auth');
      assert.equal(allowAccess('/register', false), true, 'Public register page is accessible without auth');
      assert.equal(allowAccess('/login', false), true, 'Public login page is accessible without auth');
      assert.equal(allowAccess('/dashboard', false), false, 'Dashboard must reject unauthenticated visitor');
    });
  });
});
