import { describe, it, expect, beforeEach } from 'vitest';
import {
  getStoredPreferences,
  saveStoredPreferences,
  PREFERENCES_STORAGE_KEY,
} from '../hooks/usePreferences';
import {
  ONBOARDING_STEPS_DATA,
  type OnboardingStepMeta,
} from '../constants/onboardingContent';

describe('Onboarding & Contextual Help System', () => {
  beforeEach(() => {
    globalThis.localStorage.clear();
  });

  describe('Preferences & Onboarding Status Persistence', () => {
    it('defaults hasCompletedOnboarding to false when fresh', () => {
      const prefs = getStoredPreferences();
      expect(prefs.hasCompletedOnboarding).toBe(false);
      expect(prefs.currency).toBe('MXN');
      expect(prefs.theme).toBe('dark');
    });

    it('marks hasCompletedOnboarding as true when saved', () => {
      const updated = saveStoredPreferences({ hasCompletedOnboarding: true });
      expect(updated.hasCompletedOnboarding).toBe(true);

      // Verify persistence in localStorage
      const reloaded = getStoredPreferences();
      expect(reloaded.hasCompletedOnboarding).toBe(true);

      const rawJson = globalThis.localStorage.getItem(PREFERENCES_STORAGE_KEY);
      expect(rawJson).not.toBeNull();
      const parsed = JSON.parse(rawJson!);
      expect(parsed.hasCompletedOnboarding).toBe(true);
    });

    it('allows resetting onboarding back to false', () => {
      saveStoredPreferences({ hasCompletedOnboarding: true });
      expect(getStoredPreferences().hasCompletedOnboarding).toBe(true);

      saveStoredPreferences({ hasCompletedOnboarding: false });
      expect(getStoredPreferences().hasCompletedOnboarding).toBe(false);
    });

    it('persists theme toggle between dark and light', () => {
      expect(getStoredPreferences().theme).toBe('dark');

      const updated = saveStoredPreferences({ theme: 'light' });
      expect(updated.theme).toBe('light');
      expect(getStoredPreferences().theme).toBe('light');

      const backToDark = saveStoredPreferences({ theme: 'dark' });
      expect(backToDark.theme).toBe('dark');
      expect(getStoredPreferences().theme).toBe('dark');
    });
  });

  describe('Onboarding Steps Content & Beginner-Friendly Language', () => {
    it('contains exactly 5 steps covering all required financial concepts', () => {
      expect(ONBOARDING_STEPS_DATA.length).toBe(5);

      const stepIds = ONBOARDING_STEPS_DATA.map((s: OnboardingStepMeta) => s.id);
      expect(stepIds).toEqual([
        'saldo-neto',
        'compra-vs-impacto',
        'msi',
        'cashback',
        'prestamos',
      ]);
    });

    it('strictly forbids the em dash character (— or \\u2014) across all steps', () => {
      for (const step of ONBOARDING_STEPS_DATA) {
        expect(step.title).not.toContain('\u2014');
        expect(step.title).not.toContain('—');

        expect(step.description).not.toContain('\u2014');
        expect(step.description).not.toContain('—');

        expect(step.highlight).not.toContain('\u2014');
        expect(step.highlight).not.toContain('—');
      }
    });

    it('explains concepts in plain language without advanced financial jargon', () => {
      const bannedJargon = ['línea de crédito', 'linea de credito', 'pasivo', 'amortización', 'amortizacion'];

      for (const step of ONBOARDING_STEPS_DATA) {
        const fullContent = `${step.title} ${step.description} ${step.highlight}`.toLowerCase();
        for (const word of bannedJargon) {
          expect(fullContent).not.toContain(word);
        }
      }
    });

    it('clearly addresses the two destinations of cashback', () => {
      const cashbackStep = ONBOARDING_STEPS_DATA.find((s: OnboardingStepMeta) => s.id === 'cashback');
      expect(cashbackStep).toBeDefined();
      const text = `${cashbackStep!.description} ${cashbackStep!.highlight}`.toLowerCase();
      expect(text).toContain('saldo a favor');
      expect(text).toContain('efectivo pendiente');
    });

    it('clearly addresses direct impact vs normal credit card purchase', () => {
      const cardStep = ONBOARDING_STEPS_DATA.find((s: OnboardingStepMeta) => s.id === 'compra-vs-impacto');
      expect(cardStep).toBeDefined();
      const text = `${cardStep!.description} ${cardStep!.highlight}`.toLowerCase();
      expect(text).toContain('impacto directo');
      expect(text).toContain('normal');
    });

    it('clearly explains loans to third parties without treating it as lost money', () => {
      const debtStep = ONBOARDING_STEPS_DATA.find((s: OnboardingStepMeta) => s.id === 'prestamos');
      expect(debtStep).toBeDefined();
      const text = `${debtStep!.description} ${debtStep!.highlight}`.toLowerCase();
      expect(text).toContain('prestas');
      expect(text).toContain('tuyo');
    });
  });
});
