import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/database';
import { performStartupSync, getLastSyncTimestamp } from '../services/syncService';
import { createFullBackup, validateBackupContent, restoreFullBackup } from '../services/backupService';
import { calculateNetLiquidity } from '../services/balanceCalculator';

describe('Module 4 End-to-End Integration: Startup Sync, Backup & Restore Lifecycle', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
    await db.populateDefaultsIfEmpty();
  });

  it('completes the entire cycle: startup sync, data manipulation, JSON export, DB wipe, and atomic restore', async () => {
    // 1. Simular base inicial con cuentas
    const debitAccount = (await db.accounts.toArray())[0];
    expect(debitAccount).toBeDefined();

    // 2. Crear una regla recurrente que debió ejecutarse
    await db.recurringTransactions.add({
      id: 'rec-module4-test',
      name: 'Internet Fibra',
      frequency: 'MONTHLY',
      amount: 600,
      type: 'EXPENSE',
      classification: 'FIXED',
      accountId: debitAccount.id,
      categoryId: 'cat-services',
      startDate: '2026-01-01',
      nextDueDate: '2026-02-01',
      isActive: true,
      createdAt: '2026-01-01',
    });

    // 3. Ejecutar sincronización al inicio
    const syncResult = await performStartupSync('2026-02-15');
    expect(syncResult.recurringGenerated).toBe(1);

    const lastSync = await getLastSyncTimestamp();
    expect(lastSync).toBe(syncResult.timestamp);

    // 4. Agregar tarjeta, deuda y transacción adicional
    await db.creditCards.add({
      id: 'card-mod4',
      name: 'Tarjeta Platino',
      creditLimit: 50000,
      cutoffDay: 15,
      paymentDueDay: 5,
      isArchived: false,
      createdAt: '2026-01-01',
    });

    await db.debts.add({
      id: 'debt-mod4',
      debtorName: 'Carlos Gómez',
      originalAmount: 2000,
      currentBalance: 1500,
      disbursementTransactionId: 'tx-disb-mod4',
      startDate: '2026-02-01',
      notes: 'Préstamo personal',
      status: 'PENDING',
      createdAt: '2026-02-01',
    });

    if (typeof globalThis.localStorage !== 'undefined') {
      globalThis.localStorage.setItem('gestor_finanzas_currency', 'EUR');
    }

    // 5. Crear Backup Completo
    const backup = await createFullBackup();
    expect(validateBackupContent(backup).isValid).toBe(true);
    expect(backup.preferences.currency).toBe('EUR');
    expect(backup.data.creditCards.some((c) => c.id === 'card-mod4')).toBe(true);
    expect(backup.data.debts.some((d) => d.id === 'debt-mod4')).toBe(true);
    expect(backup.data.transactions.length).toBeGreaterThanOrEqual(1);

    // 6. Simular corrupción o borrado completo de la base de datos
    await db.accounts.clear();
    await db.creditCards.clear();
    await db.debts.clear();
    await db.transactions.clear();
    await db.recurringTransactions.clear();

    const emptyLiquidity = calculateNetLiquidity([], []);
    expect(emptyLiquidity).toBe(0);

    // 7. Restaurar desde el backup
    const summary = await restoreFullBackup(backup);
    expect(summary.cardsCount).toBe(1);
    expect(summary.debtsCount).toBe(1);
    expect(summary.transactionsCount).toBeGreaterThanOrEqual(1);

    // 8. Verificar que los datos y relaciones vuelven a estar 100% operativos
    const restoredCards = await db.creditCards.toArray();
    expect(restoredCards.find((c) => c.id === 'card-mod4')?.name).toBe('Tarjeta Platino');

    const restoredDebts = await db.debts.toArray();
    expect(restoredDebts.find((d) => d.id === 'debt-mod4')?.debtorName).toBe('Carlos Gómez');

    if (typeof globalThis.localStorage !== 'undefined') {
      expect(globalThis.localStorage.getItem('gestor_finanzas_currency')).toBe('EUR');
    }
  });

  it('rejects malformed backup files and prevents corrupting database', async () => {
    const malformed = {
      version: '1.0.0',
      data: {
        accounts: 'invalid-should-be-array',
      },
    };

    const validation = validateBackupContent(malformed);
    expect(validation.isValid).toBe(false);
    expect(validation.error).toBeDefined();

    await expect(restoreFullBackup(malformed as any)).rejects.toThrow();
  });
});
