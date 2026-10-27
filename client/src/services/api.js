/**
 * PrepForge AI - Centralized Frontend API Service
 * Handles base URL routing, JWT token management, HttpOnly cookies,
 * and standard error response normalization.
 */

const RAW_BASE_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) || '/api';
export const API_BASE_URL = RAW_BASE_URL.replace(/\/+$/, '');

const TOKEN_KEY = 'prepforge_auth_token';
const USER_KEY = 'prepforge_auth_user';

export const getStoredToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY) || null;
  } catch (err) {
    return null;
  }
};

export const setStoredToken = (token) => {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch (err) {
    console.warn('[api] Failed to access localStorage', err);
  }
};

export const getStoredUser = () => {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    return null;
  }
};

export const setStoredUser = (user) => {
  try {
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_KEY);
    }
  } catch (err) {
    console.warn('[api] Failed to store user', err);
  }
};

/**
 * Core HTTP Request Dispatcher
 */
export const request = async (endpoint, options = {}) => {
  let cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  
  // Guard against duplicate /v1 prefix if API_BASE_URL already includes /v1
  let base = API_BASE_URL;
  if (base.endsWith('/v1') && cleanEndpoint.startsWith('/v1/')) {
    cleanEndpoint = cleanEndpoint.slice(3); // remove '/v1'
  } else if (cleanEndpoint === '/health' && base.endsWith('/v1')) {
    base = base.slice(0, -3); // map /v1 + /health to root /api/health
  }

  const url = endpoint.startsWith('http') 
    ? endpoint 
    : `${base}${cleanEndpoint}`;

  const token = getStoredToken();
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;

  const headers = {
    'X-Requested-With': 'XMLHttpRequest',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  };

  if (!isFormData && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const config = {
    credentials: 'include', // Automatically transmit cookies
    ...options,
    headers,
  };

  if (config.body && typeof config.body === 'object' && !isFormData) {
    config.body = JSON.stringify(config.body);
  }

  try {
    const response = await fetch(url, config);
    const contentType = response.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');
    const data = isJson 
      ? await response.json() 
      : await response.text();

    // Guard: If an API endpoint returned HTML instead of JSON (e.g. Vercel SPA index.html fallback for unrouted API)
    if (!isJson && typeof data === 'string' && (data.includes('<!DOCTYPE html') || data.includes('<html'))) {
      const htmlErr = new Error('API server returned an HTML document instead of JSON. Ensure VITE_API_BASE_URL is configured to the Render backend.');
      htmlErr.status = response.status === 200 ? 502 : response.status;
      htmlErr.code = 'INVALID_CONTENT_TYPE';
      throw htmlErr;
    }

    if (!response.ok) {
      const errorMsg = (typeof data === 'object' && (data.message || (typeof data.error === 'object' ? data.error?.message : data.error))) 
        || (typeof data === 'string' && data)
        || `Request failed with status ${response.status}`;
      const err = new Error(errorMsg);
      err.status = response.status;
      err.data = data;
      err.code = data?.code || 'HTTP_ERROR';
      throw err;
    }

    return data;
  } catch (err) {
    if (!err.status) {
      const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
      let userFriendlyMessage = 'Unable to connect to PrepForge AI server. Please check your network connection or service status.';

      if (isOffline) {
        userFriendlyMessage = 'You appear to be offline. Please check your internet connection.';
      } else if (err.name === 'AbortError') {
        userFriendlyMessage = 'The request timed out. The server may be warming up from cold start; please try again in a few moments.';
      } else {
        userFriendlyMessage = 'Unable to reach the PrepForge AI backend. The server may be starting up or CORS/network permissions are restricting access.';
      }

      const netErr = new Error(userFriendlyMessage);
      netErr.status = 0;
      netErr.code = isOffline ? 'OFFLINE' : (err.name === 'AbortError' ? 'TIMEOUT' : 'NETWORK_ERROR');
      netErr.originalError = err;
      throw netErr;
    }
    throw err;
  }
};

/**
 * Health Endpoints
 */
export const checkHealth = async () => {
  return request('/health');
};

export const checkV1Health = async () => {
  return request('/v1/health');
};

/**
 * Authentication Endpoints
 */
export const registerUser = async (userData) => {
  const res = await request('/v1/auth/register', {
    method: 'POST',
    body: userData,
  });

  // Registration does NOT establish an authenticated session
  return res;
};

export const loginUser = async (credentials) => {
  const res = await request('/v1/auth/login', {
    method: 'POST',
    body: credentials,
  });

  if (res.token) {
    setStoredToken(res.token);
  }
  if (res.user) {
    setStoredUser(res.user);
  }

  return res;
};

export const fetchCurrentUser = async () => {
  const res = await request('/v1/auth/me');
  if (res.user) {
    setStoredUser(res.user);
  }
  return res;
};

export const logoutUser = async () => {
  try {
    await request('/v1/auth/logout', { method: 'POST' });
  } finally {
    setStoredToken(null);
    setStoredUser(null);
  }
  return { success: true };
};

/**
 * Resume Management Endpoints
 */
export const uploadResume = async (file) => {
  const formData = new FormData();
  formData.append('resume', file);

  return request('/v1/resumes', {
    method: 'POST',
    body: formData,
  });
};

export const fetchResumes = async (params = {}) => {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', params.page);
  if (params.limit) searchParams.set('limit', params.limit);
  if (params.search) searchParams.set('search', params.search);

  const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
  return request(`/v1/resumes${query}`);
};

export const fetchResumeById = async (id) => {
  return request(`/v1/resumes/${id}`);
};

export const deleteResume = async (id) => {
  return request(`/v1/resumes/${id}`, {
    method: 'DELETE',
  });
};

/**
 * AI Resume Analysis Endpoints
 */
export const analyzeResume = async (id, options = {}) => {
  return request(`/v1/resumes/${id}/analyze`, {
    method: 'POST',
    body: options,
  });
};

export const fetchResumeAnalysis = async (id) => {
  return request(`/v1/resumes/${id}/analysis`);
};

export const fetchResumeAnalyses = async (params = {}) => {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', params.page);
  if (params.limit) searchParams.set('limit', params.limit);
  if (params.resumeId) searchParams.set('resumeId', params.resumeId);

  const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
  return request(`/v1/resume-analyses${query}`);
};

export const fetchResumeAnalysisById = async (analysisId) => {
  return request(`/v1/resume-analyses/${analysisId}`);
};

export const deleteResumeAnalysis = async (analysisId) => {
  return request(`/v1/resume-analyses/${analysisId}`, {
    method: 'DELETE',
  });
};

/**
 * Phase 3 & 4: 27-Point Advanced Resume Checks & Scoring Endpoints
 */
export const runResumeChecks = async (id, options = {}) => {
  return request(`/v1/resumes/${id}/checks`, {
    method: 'POST',
    body: options,
  });
};

export const fetchResumeChecks = async (id, params = {}) => {
  const searchParams = new URLSearchParams();
  if (params.category) searchParams.set('category', params.category);
  if (params.status) searchParams.set('status', params.status);

  const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
  return request(`/v1/resumes/${id}/checks${query}`);
};

export const fetchResumeCheckById = async (id, checkId) => {
  return request(`/v1/resumes/${id}/checks/${checkId}`);
};

export const recheckResume = async (id, options = {}) => {
  return request(`/v1/resumes/${id}/recheck`, {
    method: 'POST',
    body: options,
  });
};

export const fetchResumeScores = async (id) => {
  return request(`/v1/resumes/${id}/scores`);
};

/**
 * Job Description & Resume Matching Endpoints
 */
export const analyzeJobDescription = async (jobData) => {
  return request('/v1/jobs/analyze', {
    method: 'POST',
    body: jobData,
  });
};

export const fetchJobAnalyses = async (params = {}) => {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', params.page);
  if (params.limit) searchParams.set('limit', params.limit);
  if (params.resumeId) searchParams.set('resumeId', params.resumeId);

  const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
  return request(`/v1/jobs${query}`);
};

export const fetchJobAnalysisById = async (id) => {
  return request(`/v1/jobs/${id}`);
};

export const deleteJobAnalysis = async (id) => {
  return request(`/v1/jobs/${id}`, {
    method: 'DELETE',
  });
};

/**
 * AI Mock Interview Simulator Endpoints
 */
export const createInterviewSession = async (interviewData) => {
  return request('/v1/interviews', {
    method: 'POST',
    body: interviewData,
  });
};

export const fetchInterviewSessions = async (params = {}) => {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', params.page);
  if (params.limit) searchParams.set('limit', params.limit);
  if (params.status) searchParams.set('status', params.status);

  const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
  return request(`/v1/interviews${query}`);
};

export const fetchInterviewSessionById = async (id) => {
  return request(`/v1/interviews/${id}`);
};

export const startInterviewSession = async (id) => {
  return request(`/v1/interviews/${id}/start`, {
    method: 'POST',
  });
};

export const submitInterviewAnswer = async (id, answerData) => {
  return request(`/v1/interviews/${id}/answer`, {
    method: 'POST',
    body: answerData,
  });
};

export const completeInterviewSession = async (id) => {
  return request(`/v1/interviews/${id}/complete`, {
    method: 'POST',
  });
};

export const deleteInterviewSession = async (id) => {
  return request(`/v1/interviews/${id}`, {
    method: 'DELETE',
  });
};

/**
 * Job Application Tracker APIs (Phase 5)
 */
export const createApplication = async (data) => {
  return request('/v1/applications', {
    method: 'POST',
    body: data,
  });
};

export const fetchApplications = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.page) query.append('page', params.page);
  if (params.limit) query.append('limit', params.limit);
  if (params.status && params.status !== 'All') query.append('status', params.status);
  if (params.search) query.append('search', params.search);
  if (params.sortBy) query.append('sortBy', params.sortBy);
  if (params.sortOrder) query.append('sortOrder', params.sortOrder);

  const qs = query.toString();
  return request(`/v1/applications${qs ? `?${qs}` : ''}`);
};

export const fetchApplicationById = async (id) => {
  return request(`/v1/applications/${id}`);
};

export const updateApplication = async (id, data) => {
  return request(`/v1/applications/${id}`, {
    method: 'PUT',
    body: data,
  });
};

export const deleteApplication = async (id) => {
  return request(`/v1/applications/${id}`, {
    method: 'DELETE',
  });
};

export const fetchApplicationStats = async () => {
  return request('/v1/applications/stats');
};

/**
 * Real-Time Dashboard Analytics (Phase 6)
 */
export const fetchDashboardAnalytics = async () => {
  return request('/v1/dashboard/analytics');
};

/**
 * Profile & Settings Management (Phase 7)
 */
export const fetchUserProfile = async () => {
  return request('/v1/profile');
};

export const updateUserProfile = async (profileData) => {
  return request('/v1/profile', {
    method: 'PUT',
    body: profileData,
  });
};

export const changeUserPassword = async (passwordData) => {
  return request('/v1/profile/change-password', {
    method: 'POST',
    body: passwordData,
  });
};

export const fetchUserSettings = async () => {
  return request('/v1/settings');
};

export const updateUserSettings = async (settingsData) => {
  return request('/v1/settings', {
    method: 'PUT',
    body: settingsData,
  });
};

export const deleteUserAccount = async (deleteData) => {
  return request('/v1/profile/account', {
    method: 'DELETE',
    body: deleteData,
  });
};

export default {
  request,
  checkHealth,
  checkV1Health,
  registerUser,
  loginUser,
  fetchCurrentUser,
  logoutUser,
  uploadResume,
  fetchResumes,
  fetchResumeById,
  deleteResume,
  analyzeResume,
  fetchResumeAnalysis,
  fetchResumeAnalyses,
  fetchResumeAnalysisById,
  deleteResumeAnalysis,
  analyzeJobDescription,
  fetchJobAnalyses,
  fetchJobAnalysisById,
  deleteJobAnalysis,
  createInterviewSession,
  fetchInterviewSessions,
  fetchInterviewSessionById,
  startInterviewSession,
  submitInterviewAnswer,
  completeInterviewSession,
  deleteInterviewSession,
  createApplication,
  fetchApplications,
  fetchApplicationById,
  updateApplication,
  deleteApplication,
  fetchApplicationStats,
  fetchDashboardAnalytics,
  fetchUserProfile,
  updateUserProfile,
  changeUserPassword,
  fetchUserSettings,
  updateUserSettings,
  deleteUserAccount,
  getStoredToken,
  setStoredToken,
  getStoredUser,
  setStoredUser,
};


