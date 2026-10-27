/**
 * PrepForge AI - Appearance & Theme Manager
 * Supports: 'dark' (Midnight Navy, default), 'light', and 'system'
 * Prevents theme flashing and synchronizes with localStorage and document classes.
 */

const THEME_STORAGE_KEY = 'prepforge_theme';

export const getStoredTheme = () => {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) || 'dark';
  } catch {
    return 'dark';
  }
};

export const applyTheme = (theme) => {
  const root = document.documentElement;
  const isSystem = theme === 'system';

  let effectiveTheme = theme;
  if (isSystem) {
    effectiveTheme = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches 
      ? 'light' 
      : 'dark';
  }

  if (effectiveTheme === 'light') {
    root.classList.remove('dark');
    root.classList.add('light');
    root.setAttribute('data-theme', 'light');
    document.body?.classList?.remove('bg-[#080B14]', 'text-[#F5F7FF]');
    document.body?.classList?.add('bg-[#F8FAFC]', 'text-[#0F172A]');
  } else {
    root.classList.remove('light');
    root.classList.add('dark');
    root.setAttribute('data-theme', 'dark');
    document.body?.classList?.remove('bg-[#F8FAFC]', 'text-[#0F172A]');
    document.body?.classList?.add('bg-[#080B14]', 'text-[#F5F7FF]');
  }

  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    }
  } catch (e) {
    console.warn('[ThemeManager] Could not persist theme preference:', e);
  }

  return effectiveTheme;
};

export const initializeTheme = () => {
  const theme = getStoredTheme();
  applyTheme(theme);

  // Listen for OS system theme changes if set to system
  if (window.matchMedia) {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
    const handleChange = () => {
      if (getStoredTheme() === 'system') {
        applyTheme('system');
      }
    };
    try {
      mediaQuery.addEventListener('change', handleChange);
    } catch {
      mediaQuery.addListener(handleChange);
    }
  }
};

export default {
  getStoredTheme,
  applyTheme,
  initializeTheme,
};
