import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/database';
import { calculateNetLiquidity, calculateAccountBalances } from '../services/balanceCalculator';
import { createDebtInDb, recordDebtPaymentInDb } from '../services/debtService';
import type { Account } from '../types/models';

describe('Module 3: Accounts Receivable (Deudas por Cobrar) Integration Lifecycle', () => {
  let debitAccount: Account;
  let cashAccount: Account;

  beforeEach(async () => {
    await db.delete();
    await db.open();

    debitAccount = {
      id: 'acc-debit-m3',
      name: 'Cuenta Débito Principal',
      type: 'DEBIT',
      initialBalance: 10000,
      isArchived: false,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    };
    cashAccount = {
      id: 'acc-cash-m3',
      name: 'Efectivo',
      type: 'CASH',
      initialBalance: 0,
      isArchived: false,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    };

    await db.accounts.bulkAdd([debitAccount, cashAccount]);
  });

  it('verifies loan discount from net balance, partial amortization, overpay rejection, and final full recovery', async () => {
    let accounts = await db.accounts.toArray();
    let txs = await db.transactions.toArray();

    // 1. Liquidez inicial: $10,000
    expect(calculateNetLiquidity(accounts, txs)).toBe(10000);

    // 2. Prestar $4,000 a Rodrigo desde la cuenta de Débito
    const debt = await createDebtInDb({
      debtorName: 'Rodrigo Méndez',
      amount: 4000,
      sourceAccountId: debitAccount.id,
      notes: 'Préstamo para refacciones',
    });

    accounts = await db.accounts.toArray();
    txs = await db.transactions.toArray();

    // La liquidez disponible DEBE descontarse de inmediato: 10000 - 4000 = 6000
    expect(calculateNetLiquidity(accounts, txs)).toBe(6000);
    const balancesAfterLoan = calculateAccountBalances(accounts, txs);
    expect(balancesAfterLoan[debitAccount.id]).toBe(6000);

    // 3. Primer abono parcial de Rodrigo ($1,500) recibido en Efectivo
    await recordDebtPaymentInDb({
      debtId: debt.id,
      amount: 1500,
      targetAccountId: cashAccount.id,
      notes: 'Primer abono en efectivo',
    });

    accounts = await db.accounts.toArray();
    txs = await db.transactions.toArray();

    // El saldo adeudado amortiza a $2,500 (4000 - 1500)
    let updatedDebt = await db.debts.get(debt.id);
    expect(updatedDebt?.currentBalance).toBe(2500);
    expect(updatedDebt?.status).toBe('PENDING');

    // La liquidez neta ahora sube a $7,500 ($6,000 débito + $1,500 efectivo)
    expect(calculateNetLiquidity(accounts, txs)).toBe(7500);
    const balancesAfterPayment1 = calculateAccountBalances(accounts, txs);
    expect(balancesAfterPayment1[cashAccount.id]).toBe(1500);

    // 4. Caso Borde: Intento de sobrepago ($3,000 cuando solo debe $2,500) -> Debe fallar
    await expect(
      recordDebtPaymentInDb({
        debtId: debt.id,
        amount: 3000,
        targetAccountId: debitAccount.id,
      })
    ).rejects.toThrow('excede el saldo pendiente');

    // El saldo de la deuda permanece intacto en $2,500
    updatedDebt = await db.debts.get(debt.id);
    expect(updatedDebt?.currentBalance).toBe(2500);

    // 5. Abono final exacto de $2,500 para liquidar la deuda al 100% recibido en Débito
    await recordDebtPaymentInDb({
      debtId: debt.id,
      amount: 2500,
      targetAccountId: debitAccount.id,
      notes: 'Liquidación total',
    });

    accounts = await db.accounts.toArray();
    txs = await db.transactions.toArray();

    // Deuda 100% saldada
    updatedDebt = await db.debts.get(debt.id);
    expect(updatedDebt?.currentBalance).toBe(0);
    expect(updatedDebt?.status).toBe('PAID');

    // Recuperación total de la liquidez: $8,500 (débito) + $1,500 (efectivo) = $10,000
    expect(calculateNetLiquidity(accounts, txs)).toBe(10000);
  });
});
