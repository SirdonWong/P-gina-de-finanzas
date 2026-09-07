import { describe, it, expect, beforeEach } from 'vitest';
import {
  validatePaymentAmount,
  calculateDebtsSummary,
  createDebtInDb,
  recordDebtPaymentInDb,
  cancelDebtInDb,
} from '../services/debtService';
import { db } from '../db/database';
import type { Debt, Account } from '../types/models';

describe('Debt Service (Cuentas por Cobrar)', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  describe('Validation & Summary Calculations', () => {
    it('validates abonos preventing overpayment and negative numbers', () => {
      // Caso 1: Abono válido menor al saldo
      expect(validatePaymentAmount(500, 1000).isValid).toBe(true);

      // Caso 2: Abono exacto para liquidar
      expect(validatePaymentAmount(1000, 1000).isValid).toBe(true);

      // Caso 3: Abono que excede el saldo (sobrepago) -> RECHAZADO
      const overpay = validatePaymentAmount(1200, 1000);
      expect(overpay.isValid).toBe(false);
      expect(overpay.errorMessage).toContain('excede el saldo pendiente');

      // Caso 4: Monto negativo o cero
      expect(validatePaymentAmount(0, 1000).isValid).toBe(false);
      expect(validatePaymentAmount(-100, 1000).isValid).toBe(false);
    });

    it('calculates global debts summary accurately', () => {
      const mockDebts: Debt[] = [
        {
          id: 'd1',
          debtorName: 'Carlos',
          originalAmount: 5000,
          currentBalance: 2000, // 3000 cobrados
          disbursementTransactionId: 'tx-d1',
          startDate: '2026-01-01',
          status: 'PENDING',
          createdAt: '2026-01-01',
        },
        {
          id: 'd2',
          debtorName: 'Ana',
          originalAmount: 3000,
          currentBalance: 0, // 3000 cobrados (liquidada)
          disbursementTransactionId: 'tx-d2',
          startDate: '2026-01-01',
          status: 'PAID',
          createdAt: '2026-01-01',
        },
        {
          id: 'd3',
          debtorName: 'Pedro (Cancelado)',
          originalAmount: 2000,
          currentBalance: 2000,
          disbursementTransactionId: 'tx-d3',
          startDate: '2026-01-01',
          status: 'CANCELLED',
          createdAt: '2026-01-01',
        },
      ];

      const summary = calculateDebtsSummary(mockDebts);
      expect(summary.totalLoaned).toBe(8000); // 5000 + 3000 (d3 excluida)
      expect(summary.totalPending).toBe(2000); // 2000 + 0
      expect(summary.totalCollected).toBe(6000); // 8000 - 2000
      expect(summary.activeCount).toBe(1);
      expect(summary.paidCount).toBe(1);
    });
  });

  describe('Database Operations Lifecycle', () => {
    let cashAccount: Account;

    beforeEach(async () => {
      cashAccount = {
        id: 'acc-cash-test',
        name: 'Efectivo',
        type: 'CASH',
        initialBalance: 5000,
        isArchived: false,
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      };
      await db.accounts.add(cashAccount);
    });

    it('creates debt and disbursement transaction', async () => {
      const debt = await createDebtInDb({
        debtorName: 'Mario Gómez',
        amount: 2500,
        sourceAccountId: cashAccount.id,
        notes: 'Préstamo para reparación',
      });

      expect(debt.id).toBeDefined();
      expect(debt.currentBalance).toBe(2500);
      expect(debt.status).toBe('PENDING');

      // Verificar que se creó la transacción de desembolso
      const tx = await db.transactions.get(debt.disbursementTransactionId);
      expect(tx).toBeDefined();
      expect(tx?.type).toBe('LOAN_DISBURSEMENT');
      expect(tx?.amount).toBe(2500);
      expect(tx?.accountId).toBe(cashAccount.id);
    });

    it('applies partial repayment and amortizes debt balance', async () => {
      const debt = await createDebtInDb({
        debtorName: 'Sofía',
        amount: 3000,
        sourceAccountId: cashAccount.id,
      });

      // Primer abono parcial de $1,000
      const payment1 = await recordDebtPaymentInDb({
        debtId: debt.id,
        amount: 1000,
        targetAccountId: cashAccount.id,
        notes: 'Abono 1',
      });

      expect(payment1.amount).toBe(1000);

      let updatedDebt = await db.debts.get(debt.id);
      expect(updatedDebt?.currentBalance).toBe(2000);
      expect(updatedDebt?.status).toBe('PENDING');

      // Segundo abono de $2,000 (liquidación total)
      await recordDebtPaymentInDb({
        debtId: debt.id,
        amount: 2000,
        targetAccountId: cashAccount.id,
        notes: 'Liquidación final',
      });

      updatedDebt = await db.debts.get(debt.id);
      expect(updatedDebt?.currentBalance).toBe(0);
      expect(updatedDebt?.status).toBe('PAID');
    });

    it('rejects payment exceeding current balance with error', async () => {
      const debt = await createDebtInDb({
        debtorName: 'Ernesto',
        amount: 1000,
        sourceAccountId: cashAccount.id,
      });

      // Intentar abonar 1500 a una deuda de 1000
      await expect(
        recordDebtPaymentInDb({
          debtId: debt.id,
          amount: 1500,
          targetAccountId: cashAccount.id,
        })
      ).rejects.toThrow('excede el saldo pendiente');

      const unchangedDebt = await db.debts.get(debt.id);
      expect(unchangedDebt?.currentBalance).toBe(1000);
    });

    it('cancels debt and soft-deletes disbursement transaction', async () => {
      const debt = await createDebtInDb({
        debtorName: 'Felipe',
        amount: 800,
        sourceAccountId: cashAccount.id,
      });

      await cancelDebtInDb(debt.id, 'Préstamo no concretado');

      const cancelledDebt = await db.debts.get(debt.id);
      expect(cancelledDebt?.status).toBe('CANCELLED');

      const tx = await db.transactions.get(debt.disbursementTransactionId);
      expect(tx?.isCancelled).toBe(true);
      expect(tx?.cancelReason).toBe('Préstamo no concretado');
    });
  });
});
