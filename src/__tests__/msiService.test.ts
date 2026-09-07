import { describe, it, expect, beforeEach } from 'vitest';
import {
  splitAmountIntoInstallments,
  calculateMsiCutoffDates,
  generateMsiPlanData,
  cancelMsiPlanInDb,
} from '../services/msiService';
import { db } from '../db/database';

describe('MSI (Meses Sin Intereses) Service', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it('splits amounts with exact penny distribution balancing the last installment', () => {
    // $1,000 entre 3 cuotas
    const split3 = splitAmountIntoInstallments(1000, 3);
    expect(split3).toEqual([333.33, 333.33, 333.34]);
    const sum3 = split3.reduce((a, b) => a + b, 0);
    expect(Math.round(sum3 * 100) / 100).toBe(1000);

    // $5,000 entre 6 cuotas: 5000/6 = 833.3333... -> 5 de 833.33 y última de 833.35
    const split6 = splitAmountIntoInstallments(5000, 6);
    expect(split6.slice(0, 5)).toEqual([833.33, 833.33, 833.33, 833.33, 833.33]);
    expect(split6[5]).toBe(833.35);
    const sum6 = split6.reduce((a, b) => a + b, 0);
    expect(Math.round(sum6 * 100) / 100).toBe(5000);

    // División exacta: $1,200 en 12 cuotas = $100 c/u
    const split12 = splitAmountIntoInstallments(1200, 12);
    expect(split12.every((a) => a === 100)).toBe(true);
    expect(split12.reduce((a, b) => a + b, 0)).toBe(1200);
  });

  it('calculates cutoff dates before and after cutoff day accurately', () => {
    // Caso 1: Compra el 5 de marzo (antes del corte del día 15)
    // Primera cuota vence el 15 de marzo
    const datesBefore = calculateMsiCutoffDates('2026-03-05', 15, 3);
    expect(datesBefore).toEqual(['2026-03-15', '2026-04-15', '2026-05-15']);

    // Caso 2: Compra el 20 de marzo (después del corte del día 15)
    // Primera cuota vence el 15 de abril
    const datesAfter = calculateMsiCutoffDates('2026-03-20', 15, 3);
    expect(datesAfter).toEqual(['2026-04-15', '2026-05-15', '2026-06-15']);

    // Caso 3: Ajuste para meses más cortos (día de corte 31 en febrero y abril)
    const datesEndMonth = calculateMsiCutoffDates('2026-01-10', 31, 3);
    // Enero 31, Febrero 28, Marzo 31
    expect(datesEndMonth).toEqual(['2026-01-31', '2026-02-28', '2026-03-31']);
  });

  it('generates a complete plan with N installments linked to the card', () => {
    const { plan, installments } = generateMsiPlanData({
      creditCardId: 'card-1',
      purchaseTransactionId: 'tx-buy-1',
      concept: 'Pantalla 4K',
      totalAmount: 9000,
      totalInstallments: 3,
      purchaseDate: '2026-03-01',
      cutoffDay: 15,
    });

    expect(plan.totalAmount).toBe(9000);
    expect(plan.totalInstallments).toBe(3);
    expect(installments).toHaveLength(3);
    expect(installments[0].amount).toBe(3000);
    expect(installments[1].amount).toBe(3000);
    expect(installments[2].amount).toBe(3000);
    expect(installments[0].cutoffDate).toBe('2026-03-15');
    expect(installments[1].cutoffDate).toBe('2026-04-15');
    expect(installments[2].cutoffDate).toBe('2026-05-15');
  });

  it('cancels pending installments while preserving applied installments when cancelling plan midway', async () => {
    const planId = 'plan-test-cancel';
    await db.msiPlans.add({
      id: planId,
      creditCardId: 'card-1',
      purchaseTransactionId: 'tx-1',
      concept: 'Laptop',
      totalAmount: 15000,
      totalInstallments: 3,
      remainingInstallments: 2,
      installmentAmount: 5000,
      firstCutoffDate: '2026-01-15',
      status: 'ACTIVE',
      createdAt: '2026-01-01',
    });

    await db.msiInstallments.bulkAdd([
      {
        id: 'inst-1',
        msiPlanId: planId,
        creditCardId: 'card-1',
        installmentNumber: 1,
        amount: 5000,
        cutoffDate: '2026-01-15',
        status: 'APPLIED', // Ya aplicada / pagada
      },
      {
        id: 'inst-2',
        msiPlanId: planId,
        creditCardId: 'card-1',
        installmentNumber: 2,
        amount: 5000,
        cutoffDate: '2026-02-15',
        status: 'PENDING', // Pendiente
      },
      {
        id: 'inst-3',
        msiPlanId: planId,
        creditCardId: 'card-1',
        installmentNumber: 3,
        amount: 5000,
        cutoffDate: '2026-03-15',
        status: 'PENDING', // Pendiente
      },
    ]);

    const cancelledCount = await cancelMsiPlanInDb(planId);
    expect(cancelledCount).toBe(2);

    const updatedPlan = await db.msiPlans.get(planId);
    expect(updatedPlan?.status).toBe('CANCELLED');
    expect(updatedPlan?.remainingInstallments).toBe(0);

    const updatedInstallments = await db.msiInstallments.where('msiPlanId').equals(planId).toArray();
    const inst1 = updatedInstallments.find((i) => i.installmentNumber === 1);
    const inst2 = updatedInstallments.find((i) => i.installmentNumber === 2);
    const inst3 = updatedInstallments.find((i) => i.installmentNumber === 3);

    expect(inst1?.status).toBe('APPLIED'); // Preservada en histórico
    expect(inst2?.status).toBe('CANCELLED'); // Anulada
    expect(inst3?.status).toBe('CANCELLED'); // Anulada
  });
});
