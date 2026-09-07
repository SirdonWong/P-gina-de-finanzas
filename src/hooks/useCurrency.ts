import { useState, useEffect, useCallback } from 'react';
import { formatCurrency } from '../utils/formatters';

const CURRENCY_KEY = 'gestor_finanzas_currency';

export function useCurrency() {
  const [currency, setCurrencyState] = useState<string>(() => {
    return localStorage.getItem(CURRENCY_KEY) || 'MXN';
  });

  const setCurrency = useCallback((newCurrency: string) => {
    localStorage.setItem(CURRENCY_KEY, newCurrency);
    setCurrencyState(newCurrency);
  }, []);

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === CURRENCY_KEY && e.newValue) {
        setCurrencyState(e.newValue);
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const format = useCallback(
    (amount: number) => {
      return formatCurrency(amount, currency);
    },
    [currency]
  );

  return { currency, setCurrency, format };
}
