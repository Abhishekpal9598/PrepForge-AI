import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  registerUser, 
  loginUser, 
  fetchCurrentUser, 
  logoutUser, 
  getStoredToken, 
  getStoredUser 
} from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => getStoredUser());
  const [token, setToken] = useState(() => getStoredToken());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Verify authenticated session on app initialization
   */
  const checkAuth = useCallback(async () => {
    const existingToken = getStoredToken();
    if (!existingToken) {
      setUser(null);
      setToken(null);
      setStoredToken(null);
      setStoredUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetchCurrentUser();
      if (res && res.success && res.user) {
        setUser(res.user);
        setStoredUser(res.user);
      } else {
        setUser(null);
        setToken(null);
        setStoredToken(null);
        setStoredUser(null);
      }
    } catch (err) {
      console.warn('[AuthContext] Session verification check failed:', err.message);
      // If 401 Unauthorized or 403 Forbidden, session is invalid/expired -> purge completely
      if (err.status === 401 || err.status === 403) {
        setUser(null);
        setToken(null);
        setStoredToken(null);
        setStoredUser(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  /**
   * Register a new user
   * Does NOT automatically authenticate - user must manually sign in
   */
  const register = async (userData) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await registerUser(userData);
      // Registration creates the user account but does NOT establish an active session
      return res;
    } catch (err) {
      setError(err.message || 'Registration failed.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Login user
   */
  const login = async (credentials) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await loginUser(credentials);
      if (res.user) {
        setUser(res.user);
      }
      if (res.token) {
        setToken(res.token);
      }
      return res;
    } catch (err) {
      setError(err.message || 'Login failed.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Logout user
   */
  const logout = async () => {
    setIsLoading(true);
    try {
      await logoutUser();
    } catch (err) {
      console.warn('[AuthContext] Logout failed:', err);
    } finally {
      setUser(null);
      setToken(null);
      setStoredToken(null);
      setStoredUser(null);
      setError(null);
      setIsLoading(false);
    }
  };

  /**
   * Update active user profile state and local cache
   */
  const updateUser = useCallback((updatedData) => {
    setUser((prev) => {
      const nextUser = typeof updatedData === 'function' ? updatedData(prev) : { ...prev, ...updatedData };
      setStoredUser(nextUser);
      return nextUser;
    });
  }, []);

  const value = {
    user,
    token,
    isAuthenticated: !!user,
    isLoading,
    error,
    register,
    login,
    logout,
    updateUser,
    checkAuth,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
