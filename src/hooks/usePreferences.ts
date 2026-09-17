import { useState, useEffect, useCallback } from 'react';
import type { AppPreferences } from '../types/models';

export const PREFERENCES_STORAGE_KEY = 'gestor_finanzas_preferences';
export const CURRENCY_STORAGE_KEY = 'gestor_finanzas_currency';

const DEFAULT_PREFERENCES: AppPreferences = {
  currency: 'MXN',
  theme: 'dark',
  hasCompletedOnboarding: false,
};

export function getStoredPreferences(): AppPreferences {
  if (typeof globalThis === 'undefined' || !globalThis.localStorage) {
    return DEFAULT_PREFERENCES;
  }
  try {
    const raw = globalThis.localStorage.getItem(PREFERENCES_STORAGE_KEY);
    const storedCurrency = globalThis.localStorage.getItem(CURRENCY_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_PREFERENCES,
        ...parsed,
        currency: storedCurrency || parsed.currency || 'MXN',
      };
    }
    return {
      ...DEFAULT_PREFERENCES,
      currency: storedCurrency || 'MXN',
      hasCompletedOnboarding: false,
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function saveStoredPreferences(prefs: Partial<AppPreferences>): AppPreferences {
  const current = getStoredPreferences();
  const updated: AppPreferences = { ...current, ...prefs };
  if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
    globalThis.localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(updated));
    if (updated.currency) {
      globalThis.localStorage.setItem(CURRENCY_STORAGE_KEY, updated.currency);
    }
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new Event('storage'));
    }
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', updated.theme || 'dark');
    }
  }
  return updated;
}

export function usePreferences() {
  const [preferences, setPreferencesState] = useState<AppPreferences>(getStoredPreferences);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleStorage = () => {
      setPreferencesState(getStoredPreferences());
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      const activeTheme = preferences.theme || 'dark';
      document.documentElement.setAttribute('data-theme', activeTheme);
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) {
        meta.setAttribute('content', activeTheme === 'light' ? '#f8fafc' : '#080c15');
      }
    }
  }, [preferences.theme]);

  const updatePreferences = useCallback((newPrefs: Partial<AppPreferences>) => {
    const updated = saveStoredPreferences(newPrefs);
    setPreferencesState(updated);
  }, []);

  const setTheme = useCallback((theme: 'dark' | 'light') => {
    updatePreferences({ theme });
  }, [updatePreferences]);

  const completeOnboarding = useCallback(() => {
    updatePreferences({ hasCompletedOnboarding: true });
  }, [updatePreferences]);

  const resetOnboarding = useCallback(() => {
    updatePreferences({ hasCompletedOnboarding: false });
  }, [updatePreferences]);

  return {
    preferences,
    updatePreferences,
    setTheme,
    completeOnboarding,
    resetOnboarding,
    theme: preferences.theme || 'dark',
    hasCompletedOnboarding: preferences.hasCompletedOnboarding,
  };
}
