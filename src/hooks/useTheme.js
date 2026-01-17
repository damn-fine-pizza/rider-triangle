import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'rider-triangle-theme';

/**
 * Hook for managing dark/light theme.
 * Persists preference to localStorage and syncs with system preference.
 */
export function useTheme() {
  const [theme, setThemeState] = useState(() => {
    // Check localStorage first
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'dark' || stored === 'light') {
        return stored;
      }
    } catch {
      // localStorage not available
    }
    // Fall back to system preference
    if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  });

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    // Persist to localStorage
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // localStorage not available
    }
  }, [theme]);

  // Listen for system preference changes
  useEffect(() => {
    const mediaQuery = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mediaQuery) return;

    const handleChange = (e) => {
      // Only auto-switch if user hasn't set a preference
      try {
        if (!localStorage.getItem(STORAGE_KEY)) {
          setThemeState(e.matches ? 'dark' : 'light');
        }
      } catch {
        setThemeState(e.matches ? 'dark' : 'light');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const setTheme = useCallback((newTheme) => {
    setThemeState(newTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((t) => (t === 'dark' ? 'light' : 'dark'));
  }, []);

  const isDark = theme === 'dark';

  return {
    theme,
    isDark,
    setTheme,
    toggleTheme,
  };
}
