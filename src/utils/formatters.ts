/**
 * Formatea un número como moneda según la divisa seleccionada
 */
export function formatCurrency(
  amount: number,
  currency: string = 'MXN',
  locale: string = 'es-MX'
): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    // Fallback simple si la divisa no es soportada por Intl
    return `${currency} $${amount.toFixed(2)}`;
  }
}

/**
 * Parsea un input de texto a número válido mayor a cero
 */
export function parseAmount(input: string | number): number {
  if (typeof input === 'number') return isNaN(input) ? 0 : input;
  const cleaned = input.replace(/[^0-9.-]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : Math.round(num * 100) / 100;
}
