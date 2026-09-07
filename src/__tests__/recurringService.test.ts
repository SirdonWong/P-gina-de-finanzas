import { describe, it, expect } from 'vitest';
import { processRecurringRules } from '../services/recurringService';
import type { RecurringTransaction } from '../types/models';

describe('Recurring Service Engine', () => {
  it('generates a transaction when due date matches current date', () => {
    const rules: RecurringTransaction[] = [
      {
        id: 'rule-netflix',
        name: 'Netflix',
        amount: 219,
        type: 'EXPENSE',
        classification: 'FIXED',
        categoryId: 'cat-entretenimiento-streaming',
        accountId: 'acc-debit',
        frequency: 'MONTHLY',
        startDate: '2026-02-15',
        nextDueDate: '2026-03-15',
        isActive: true,
        createdAt: '2026-02-15',
      },
    ];

    const result = processRecurringRules(rules, '2026-03-15');
    expect(result.generatedTransactions).toHaveLength(1);
    expect(result.generatedTransactions[0].amount).toBe(219);
    expect(result.generatedTransactions[0].date).toBe('2026-03-15');
    expect(result.generatedTransactions[0].classification).toBe('FIXED');
    expect(result.updatedRules[0].nextDueDate).toBe('2026-04-15');
    expect(result.updatedRules[0].lastProcessedDate).toBe('2026-03-15');
  });

  it('catches up multiple missed periods if app was not opened for a while', () => {
    const rules: RecurringTransaction[] = [
      {
        id: 'rule-gym',
        name: 'Gimnasio Semanal',
        amount: 200,
        type: 'EXPENSE',
        classification: 'FIXED',
        categoryId: 'cat-salud',
        accountId: 'acc-cash',
        frequency: 'WEEKLY',
        startDate: '2026-03-01',
        nextDueDate: '2026-03-01',
        isActive: true,
        createdAt: '2026-03-01',
      },
    ];

    // Simular que han pasado 3 semanas (marzo 15)
    const result = processRecurringRules(rules, '2026-03-15');
    // Debe generar transacciones para 2026-03-01, 2026-03-08 y 2026-03-15 = 3 cargos
    expect(result.generatedTransactions).toHaveLength(3);
    expect(result.generatedTransactions.map((t) => t.date)).toEqual([
      '2026-03-01',
      '2026-03-08',
      '2026-03-15',
    ]);
    expect(result.updatedRules[0].nextDueDate).toBe('2026-03-22');
  });

  it('ignores inactive rules', () => {
    const rules: RecurringTransaction[] = [
      {
        id: 'rule-cancelled-sub',
        name: 'Suscripción Cancelada',
        amount: 150,
        type: 'EXPENSE',
        classification: 'FIXED',
        categoryId: 'cat-servicios',
        accountId: 'acc-debit',
        frequency: 'MONTHLY',
        startDate: '2026-01-01',
        nextDueDate: '2026-02-01',
        isActive: false, // Inactiva
        createdAt: '2026-01-01',
      },
    ];

    const result = processRecurringRules(rules, '2026-03-01');
    expect(result.generatedTransactions).toHaveLength(0);
    expect(result.updatedRules).toHaveLength(0);
  });
});
