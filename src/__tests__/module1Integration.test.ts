import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/database';
import { calculateNetLiquidity, calculateAccountBalances } from '../services/balanceCalculator';
import { executeRecurringCatchupInDb } from '../services/recurringService';
import { getTodayDateString } from '../utils/dateUtils';
import type { Transaction, RecurringTransaction } from '../types/models';

describe('Module 1: End-to-End Integration Lifecycle', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
    await db.populateDefaultsIfEmpty();
  });

  it('populates default accounts and hierarchical categories', async () => {
    const accounts = await db.accounts.toArray();
    expect(accounts.length).toBeGreaterThanOrEqual(2);
    expect(accounts.map((a) => a.name)).toContain('Efectivo');
    expect(accounts.map((a) => a.name)).toContain('Cuenta Débito Principal');

    const categories = await db.categories.toArray();
    expect(categories.length).toBeGreaterThanOrEqual(10);
    expect(categories.map((c) => c.name)).toContain('Renta');
    expect(categories.map((c) => c.name)).toContain('Comida');
  });

  it('processes full financial lifecycle: income, expense, dynamic category, recurring catch-up, and soft-delete', async () => {
    const debitAccount = await db.accounts.where('name').equals('Cuenta Débito Principal').first();
    const cashAccount = await db.accounts.where('name').equals('Efectivo').first();
    expect(debitAccount).toBeDefined();
    expect(cashAccount).toBeDefined();

    // 1. Registrar Ingreso de Nómina ($20,000)
    const incomeTx: Transaction = {
      id: 'tx-test-inc',
      date: getTodayDateString(),
      amount: 20000,
      type: 'INCOME',
      classification: 'FIXED',
      accountId: debitAccount!.id,
      tags: ['nomina', 'quincena'],
      notes: 'Pago quincenal',
      isCancelled: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await db.transactions.add(incomeTx);

    let allAccounts = await db.accounts.toArray();
    let allTxs = await db.transactions.toArray();
    expect(calculateNetLiquidity(allAccounts, allTxs)).toBe(20000);

    // 2. Crear categoría personalizada con subcategoría dinámica
    const customParentCat = {
      id: 'cat-custom-educacion',
      name: 'Educación',
      parentId: null,
      type: 'EXPENSE' as const,
      icon: 'Briefcase',
      color: '#3b82f6',
      isDefault: false,
      isArchived: false,
    };
    await db.categories.add(customParentCat);

    const customSubCat = {
      id: 'cat-custom-cursos',
      name: 'Cursos Online',
      parentId: 'cat-custom-educacion',
      type: 'EXPENSE' as const,
      icon: 'Tag',
      color: '#3b82f6',
      isDefault: false,
      isArchived: false,
    };
    await db.categories.add(customSubCat);

    // 3. Registrar Gasto con subcategoría y tags ($1,500)
    const expenseTx: Transaction = {
      id: 'tx-test-exp',
      date: getTodayDateString(),
      amount: 1500,
      type: 'EXPENSE',
      classification: 'VARIABLE',
      categoryId: customParentCat.id,
      subcategoryId: customSubCat.id,
      accountId: debitAccount!.id,
      tags: ['cursos', 'programacion'],
      notes: 'Curso de React Avanzado',
      isCancelled: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await db.transactions.add(expenseTx);

    allTxs = await db.transactions.toArray();
    expect(calculateNetLiquidity(allAccounts, allTxs)).toBe(18500); // 20000 - 1500

    // 4. Transferencia de Débito a Efectivo ($3,000)
    const transferTx: Transaction = {
      id: 'tx-test-trf',
      date: getTodayDateString(),
      amount: 3000,
      type: 'TRANSFER',
      classification: 'FIXED',
      accountId: debitAccount!.id,
      destinationAccountId: cashAccount!.id,
      tags: ['cajero'],
      notes: 'Retiro cajero',
      isCancelled: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await db.transactions.add(transferTx);

    allTxs = await db.transactions.toArray();
    const balances = calculateAccountBalances(allAccounts, allTxs);
    expect(balances[debitAccount!.id]).toBe(15500); // 20000 - 1500 - 3000
    expect(balances[cashAccount!.id]).toBe(3000);   // 0 + 3000
    expect(calculateNetLiquidity(allAccounts, allTxs)).toBe(18500); // Liquidez total no cambia

    // 5. Configurar Cargo Recurrente Mensual ($500) con fecha de vencimiento hoy
    const recurringRule: RecurringTransaction = {
      id: 'rule-test-internet',
      name: 'Internet Fibra',
      amount: 500,
      type: 'EXPENSE',
      classification: 'FIXED',
      categoryId: 'cat-servicios',
      accountId: debitAccount!.id,
      frequency: 'MONTHLY',
      startDate: getTodayDateString(),
      nextDueDate: getTodayDateString(),
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    await db.recurringTransactions.add(recurringRule);

    // Ejecutar catch-up
    const generated = await executeRecurringCatchupInDb();
    expect(generated).toBe(1);

    allTxs = await db.transactions.toArray();
    expect(calculateNetLiquidity(allAccounts, allTxs)).toBe(18000); // 18500 - 500

    // 6. Soft Delete / Anulación de transacción
    // Anulamos el gasto del curso de $1,500
    await db.transactions.update('tx-test-exp', {
      isCancelled: true,
      cancelledAt: new Date().toISOString(),
      cancelReason: 'Reembolso por garantía del curso',
    });

    allTxs = await db.transactions.toArray();
    const cancelledTx = allTxs.find((t) => t.id === 'tx-test-exp');
    expect(cancelledTx?.isCancelled).toBe(true);
    expect(cancelledTx?.cancelReason).toBe('Reembolso por garantía del curso');

    // El saldo neto ahora debe reintegrar los $1,500 automáticamente
    expect(calculateNetLiquidity(allAccounts, allTxs)).toBe(19500); // 18000 + 1500
  });
});
