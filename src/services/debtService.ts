import type { Debt, DebtPayment, Transaction } from '../types/models';
import { db } from '../db/database';
import { getTodayDateString } from '../utils/dateUtils';

export interface DebtsSummary {
  totalLoaned: number;
  totalPending: number;
  totalCollected: number;
  activeCount: number;
  paidCount: number;
}

/**
 * Calcula el resumen global de deudas por cobrar
 */
export function calculateDebtsSummary(debts: Debt[]): DebtsSummary {
  let totalLoaned = 0;
  let totalPending = 0;
  let activeCount = 0;
  let paidCount = 0;

  for (const debt of debts) {
    if (debt.status === 'CANCELLED') continue;

    totalLoaned += debt.originalAmount;
    totalPending += debt.currentBalance;

    if (debt.status === 'PENDING') {
      activeCount++;
    } else if (debt.status === 'PAID') {
      paidCount++;
    }
  }

  const totalCollected = Math.max(0, totalLoaned - totalPending);

  return {
    totalLoaned: Math.round(totalLoaned * 100) / 100,
    totalPending: Math.round(totalPending * 100) / 100,
    totalCollected: Math.round(totalCollected * 100) / 100,
    activeCount,
    paidCount,
  };
}

/**
 * Valida un monto de abono contra el saldo pendiente de la deuda.
 * REGLA: No permite sobrepagos silenciosos.
 */
export function validatePaymentAmount(amount: number, currentBalance: number): {
  isValid: boolean;
  errorMessage?: string;
} {
  if (isNaN(amount) || amount <= 0) {
    return { isValid: false, errorMessage: 'El monto del abono debe ser mayor a 0.' };
  }
  const roundedAmount = Math.round(amount * 100) / 100;
  const roundedBalance = Math.round(currentBalance * 100) / 100;

  if (roundedAmount > roundedBalance) {
    return {
      isValid: false,
      errorMessage: `El abono ($${roundedAmount.toFixed(2)}) excede el saldo pendiente ($${roundedBalance.toFixed(2)}).`,
    };
  }

  return { isValid: true };
}

/**
 * Registra un nuevo préstamo a un tercero.
 * Genera la transacción LOAN_DISBURSEMENT (que deduce saldo neto inmediatamente) y la deuda.
 */
export async function createDebtInDb(params: {
  debtorName: string;
  amount: number;
  sourceAccountId: string;
  startDate?: string;
  notes?: string;
}): Promise<Debt> {
  const { debtorName, amount, sourceAccountId, notes } = params;
  const startDate = params.startDate || getTodayDateString();

  if (amount <= 0) throw new Error('El monto del préstamo debe ser mayor a 0');
  if (!debtorName.trim()) throw new Error('El nombre del deudor es requerido');

  const debtId = `debt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const txId = `tx-loan-${debtId}`;

  const loanTx: Transaction = {
    id: txId,
    date: startDate,
    amount,
    type: 'LOAN_DISBURSEMENT',
    classification: 'VARIABLE',
    accountId: sourceAccountId,
    debtId,
    tags: ['prestamo', 'cuenta-por-cobrar'],
    notes: `Préstamo a ${debtorName.trim()}${notes ? `: ${notes.trim()}` : ''}`,
    isCancelled: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const newDebt: Debt = {
    id: debtId,
    debtorName: debtorName.trim(),
    originalAmount: amount,
    currentBalance: amount,
    disbursementTransactionId: txId,
    startDate,
    status: 'PENDING',
    notes: notes?.trim() || undefined,
    createdAt: new Date().toISOString(),
  };

  await db.transaction('rw', db.debts, db.transactions, async () => {
    await db.transactions.add(loanTx);
    await db.debts.add(newDebt);
  });

  return newDebt;
}

/**
 * Registra un abono parcial o total a una deuda.
 * Genera la transacción DEBT_REPAYMENT (que suma a la liquidez) y amortiza el saldo.
 */
export async function recordDebtPaymentInDb(params: {
  debtId: string;
  amount: number;
  targetAccountId: string;
  date?: string;
  notes?: string;
}): Promise<DebtPayment> {
  const { debtId, amount, targetAccountId, notes } = params;
  const paymentDate = params.date || getTodayDateString();

  const debt = await db.debts.get(debtId);
  if (!debt) throw new Error('Deuda no encontrada');
  if (debt.status !== 'PENDING') throw new Error('Esta deuda ya no se encuentra activa');

  const validation = validatePaymentAmount(amount, debt.currentBalance);
  if (!validation.isValid) {
    throw new Error(validation.errorMessage);
  }

  const paymentId = `pay-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const txId = `tx-repay-${paymentId}`;

  const repaymentTx: Transaction = {
    id: txId,
    date: paymentDate,
    amount,
    type: 'DEBT_REPAYMENT',
    classification: 'VARIABLE',
    accountId: targetAccountId,
    debtId,
    tags: ['abono', 'cobranza'],
    notes: `Abono de ${debt.debtorName}${notes ? `: ${notes.trim()}` : ''}`,
    isCancelled: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const paymentRecord: DebtPayment = {
    id: paymentId,
    debtId,
    amount,
    date: paymentDate,
    transactionId: txId,
    notes: notes?.trim() || undefined,
    createdAt: new Date().toISOString(),
  };

  const newBalance = Math.round((debt.currentBalance - amount) * 100) / 100;
  const newStatus = newBalance <= 0 ? 'PAID' : 'PENDING';

  await db.transaction('rw', db.debts, db.debtPayments, db.transactions, async () => {
    await db.transactions.add(repaymentTx);
    await db.debtPayments.add(paymentRecord);
    await db.debts.update(debtId, {
      currentBalance: Math.max(0, newBalance),
      status: newStatus,
    });
  });

  return paymentRecord;
}

/**
 * Cancela una deuda y anula su transacción de desembolso para restaurar el saldo si aplica.
 */
export async function cancelDebtInDb(debtId: string, reason: string = 'Cancelación de préstamo'): Promise<void> {
  const debt = await db.debts.get(debtId);
  if (!debt) throw new Error('Deuda no encontrada');

  await db.transaction('rw', db.debts, db.transactions, async () => {
    await db.debts.update(debtId, { status: 'CANCELLED' });
    // Anular la transacción de desembolso para que el dinero se reintegre a la liquidez
    if (debt.disbursementTransactionId) {
      await db.transactions.update(debt.disbursementTransactionId, {
        isCancelled: true,
        cancelledAt: new Date().toISOString(),
        cancelReason: reason,
      });
    }
  });
}
