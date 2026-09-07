import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/database';
import {
  createFullBackup,
  validateBackupContent,
  restoreFullBackup,
  type BackupData,
} from '../services/backupService';

describe('Backup and Restore Service', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
    await db.populateDefaultsIfEmpty();
  });

  it('validates backup content integrity', () => {
    expect(validateBackupContent(null).isValid).toBe(false);
    expect(validateBackupContent({}).isValid).toBe(false);
    expect(validateBackupContent({ version: '1.0.0' }).isValid).toBe(false);

    const validStructure = {
      version: '1.0.0',
      data: {
        accounts: [],
        categories: [],
        transactions: [],
      },
    };
    expect(validateBackupContent(validStructure).isValid).toBe(true);
  });

  it('exports all database tables and settings into a full JSON backup', async () => {
    // Agregar datos de prueba
    await db.creditCards.add({
      id: 'card-test-backup',
      name: 'Nu Backup',
      creditLimit: 15000,
      cutoffDay: 10,
      paymentDueDay: 28,
      isArchived: false,
      createdAt: '2026-01-01',
    });

    const backup = await createFullBackup();
    expect(backup.version).toBe('1.0.0');
    expect(backup.exportedAt).toBeDefined();
    expect(backup.data.accounts.length).toBeGreaterThanOrEqual(2);
    expect(backup.data.categories.length).toBeGreaterThanOrEqual(5);
    expect(backup.data.creditCards.some((c) => c.id === 'card-test-backup')).toBe(true);
  });

  it('restores 100% of data from backup replacing database contents', async () => {
    const mockBackup: BackupData = {
      version: '1.0.0',
      exportedAt: '2026-03-01T12:00:00Z',
      preferences: {
        currency: 'USD',
      },
      data: {
        accounts: [
          {
            id: 'acc-restored-1',
            name: 'Cuenta Restaurada',
            type: 'DEBIT',
            initialBalance: 7500,
            isArchived: false,
            createdAt: '2026-01-01',
            updatedAt: '2026-01-01',
          },
        ],
        categories: [
          {
            id: 'cat-restored-1',
            name: 'Categoría Restaurada',
            parentId: null,
            type: 'EXPENSE',
            icon: 'Home',
            color: '#ef4444',
            isDefault: false,
            isArchived: false,
          },
        ],
        transactions: [
          {
            id: 'tx-restored-1',
            date: '2026-02-15',
            amount: 250,
            type: 'EXPENSE',
            classification: 'VARIABLE',
            accountId: 'acc-restored-1',
            tags: ['restaurado'],
            notes: 'Gasto restaurado',
            isCancelled: false,
            createdAt: '2026-02-15',
            updatedAt: '2026-02-15',
          },
        ],
        recurringTransactions: [],
        creditCards: [],
        msiPlans: [],
        msiInstallments: [],
        cashbackRecords: [],
        debts: [],
        debtPayments: [],
        syncMetadata: [],
      },
    };

    const summary = await restoreFullBackup(mockBackup);
    expect(summary.accountsCount).toBe(1);
    expect(summary.categoriesCount).toBe(1);
    expect(summary.transactionsCount).toBe(1);

    // Verificar en base de datos que solo existen los datos restaurados
    const accounts = await db.accounts.toArray();
    expect(accounts).toHaveLength(1);
    expect(accounts[0].name).toBe('Cuenta Restaurada');

    const txs = await db.transactions.toArray();
    expect(txs).toHaveLength(1);
    expect(txs[0].notes).toBe('Gasto restaurado');

    expect(localStorage.getItem('gestor_finanzas_currency')).toBe('USD');
  });
});
