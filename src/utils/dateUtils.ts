import type { RecurrenceFrequency } from '../types/models';

/**
 * Retorna la fecha actual en formato ISO YYYY-MM-DD local
 */
export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Calcula la siguiente fecha según la periodicidad configurada
 */
export function calculateNextDueDate(
  currentDueDate: string,
  frequency: RecurrenceFrequency
): string {
  const [yearStr, monthStr, dayStr] = currentDueDate.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1; // 0-indexed
  const day = parseInt(dayStr, 10);

  const date = new Date(year, month, day);

  switch (frequency) {
    case 'DAILY':
      date.setDate(date.getDate() + 1);
      break;
    case 'WEEKLY':
      date.setDate(date.getDate() + 7);
      break;
    case 'BIWEEKLY':
      date.setDate(date.getDate() + 14);
      break;
    case 'MONTHLY': {
      // Avanzar un mes preservando el día deseado
      const targetMonth = date.getMonth() + 1;
      date.setMonth(targetMonth);
      // Si el mes resultante tiene menos días, Date se ajusta al siguiente mes; corregimos al último día
      if (date.getMonth() !== (targetMonth % 12)) {
        date.setDate(0); // Último día del mes anterior
      }
      break;
    }
  }

  const nextYear = date.getFullYear();
  const nextMonth = String(date.getMonth() + 1).padStart(2, '0');
  const nextDay = String(date.getDate()).padStart(2, '0');
  return `${nextYear}-${nextMonth}-${nextDay}`;
}

/**
 * Formatea una fecha YYYY-MM-DD para vista amigable (ej: "15 mar 2026")
 */
export function formatDate(dateString: string): string {
  if (!dateString) return '';
  const [yearStr, monthStr, dayStr] = dateString.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1;
  const day = parseInt(dayStr, 10);

  const date = new Date(year, month, day);
  return date.toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
